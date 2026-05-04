import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { Pedometer } from 'expo-sensors';

export type StepPermissionStatus = 'loading' | 'unavailable' | 'granted';

interface StepCounterResult {
  steps: number;
  yesterdaySteps: number;
  isAutomatic: boolean;
  permissionStatus: StepPermissionStatus;
  refreshSteps: () => Promise<void>;
  debugInfo: string;
}

function getMidnightToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function useStepCounter(): StepCounterResult {
  const [steps, setSteps] = useState<number>(0);
  const [yesterdaySteps, setYesterdaySteps] = useState<number>(0);
  const [permissionStatus, setPermissionStatus] = useState<StepPermissionStatus>('loading');
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');
  const isMountedRef = useRef(true);
  const watchSubRef = useRef<{ remove: () => void } | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addDebug = useCallback((msg: string) => {
    console.log(`[Pedometer] ${msg}`);
    setDebugInfo(prev => `${msg}\n${prev}`.slice(0, 500));
  }, []);

  const fetchIOSSteps = useCallback(async (): Promise<number> => {
    try {
      const start = getMidnightToday();
      const end = new Date();
      console.log('[Pedometer] fetchIOSSteps range:', start.toISOString(), '->', end.toISOString());
      const result = await Pedometer.getStepCountAsync(start, end);
      console.log('[Pedometer] iOS getStepCountAsync result:', JSON.stringify(result));
      return result.steps;
    } catch (err) {
      console.log('[Pedometer] fetchIOSSteps error:', err);
      return -1;
    }
  }, []);

  const fetchStepsLast24h = useCallback(async (): Promise<number> => {
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 1);
      const result = await Pedometer.getStepCountAsync(start, end);
      console.log('[Pedometer] Last 24h steps:', result.steps);
      return result.steps;
    } catch (err) {
      console.log('[Pedometer] fetchStepsLast24h error:', err);
      return -1;
    }
  }, []);

  const fetchYesterdaySteps = useCallback(async (): Promise<number> => {
    try {
      const todayMidnight = getMidnightToday();
      const yesterdayMidnight = new Date(todayMidnight);
      yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);
      const result = await Pedometer.getStepCountAsync(yesterdayMidnight, todayMidnight);
      console.log('[Pedometer] Yesterday steps:', result.steps);
      return result.steps;
    } catch (err) {
      console.log('[Pedometer] fetchYesterdaySteps error:', err);
      return -1;
    }
  }, []);

  const refreshSteps = useCallback(async () => {
    if (Platform.OS === 'web') return;
    addDebug('Manual refresh triggered');

    if (Platform.OS === 'ios') {
      const count = await fetchIOSSteps();
      if (count >= 0 && isMountedRef.current) {
        setSteps(count);
        addDebug(`Refreshed: ${count} steps today`);
      } else {
        const last24 = await fetchStepsLast24h();
        addDebug(`Today: ${count}, Last 24h: ${last24}`);
      }
    }
  }, [fetchIOSSteps, fetchStepsLast24h, addDebug]);

  useEffect(() => {
    isMountedRef.current = true;

    const init = async () => {
      if (Platform.OS === 'web') {
        addDebug('Web platform - step tracking unavailable');
        setPermissionStatus('unavailable');
        return;
      }

      const loadYesterday = async () => {
        const yd = await fetchYesterdaySteps();
        if (yd >= 0 && isMountedRef.current) {
          setYesterdaySteps(yd);
          addDebug(`Yesterday steps: ${yd}`);
        }
      };
      void loadYesterday();

      try {
        addDebug('Step 1: Checking availability...');
        const availableBefore = await Pedometer.isAvailableAsync();
        addDebug(`isAvailableAsync (before perms): ${availableBefore}`);

        addDebug('Step 2: Requesting permissions...');
        const permResult = await Pedometer.requestPermissionsAsync();
        addDebug(`Permission result: status=${permResult.status}, granted=${permResult.granted}, canAskAgain=${permResult.canAskAgain}`);

        if (permResult.status !== 'granted') {
          addDebug('Permission NOT granted. Cannot track steps.');
          if (isMountedRef.current) setPermissionStatus('unavailable');
          return;
        }

        addDebug('Step 3: Permission granted! Checking availability again...');
        const availableAfter = await Pedometer.isAvailableAsync();
        addDebug(`isAvailableAsync (after perms): ${availableAfter}`);

        if (Platform.OS === 'ios') {
          addDebug('Step 4: iOS - Fetching today steps via getStepCountAsync...');
          const todaySteps = await fetchIOSSteps();
          addDebug(`Today steps result: ${todaySteps}`);

          if (todaySteps >= 0) {
            if (isMountedRef.current) {
              setSteps(todaySteps);
              setPermissionStatus('granted');
              addDebug(`Set steps to ${todaySteps}. Starting 15s polling.`);
            }

            pollTimerRef.current = setInterval(async () => {
              if (!isMountedRef.current) return;
              const updated = await fetchIOSSteps();
              if (updated >= 0 && isMountedRef.current) {
                setSteps(updated);
                console.log('[Pedometer] Poll update:', updated);
              }
            }, 15000);

            try {
              const sub = Pedometer.watchStepCount((result) => {
                addDebug(`watchStepCount delta: ${result.steps}`);
              });
              watchSubRef.current = sub;
            } catch (watchErr) {
              addDebug(`watchStepCount error (non-critical): ${String(watchErr)}`);
            }
            return;
          }

          const last24 = await fetchStepsLast24h();
          addDebug(`Fallback: last 24h steps = ${last24}`);

          if (last24 >= 0 && isMountedRef.current) {
            setPermissionStatus('granted');
            addDebug('Pedometer API works (24h query). Today may be 0.');
            setSteps(0);

            pollTimerRef.current = setInterval(async () => {
              if (!isMountedRef.current) return;
              const updated = await fetchIOSSteps();
              if (updated >= 0 && isMountedRef.current) {
                setSteps(updated);
              }
            }, 15000);
            return;
          }

          if (!availableAfter) {
            addDebug('iOS: Pedometer not available on this device.');
            if (isMountedRef.current) setPermissionStatus('unavailable');
            return;
          }

          if (isMountedRef.current) {
            setPermissionStatus('granted');
            setSteps(0);
            addDebug('iOS: Set granted with 0 steps, polling active.');

            pollTimerRef.current = setInterval(async () => {
              if (!isMountedRef.current) return;
              const updated = await fetchIOSSteps();
              if (updated >= 0 && isMountedRef.current) {
                setSteps(updated);
              }
            }, 15000);
          }
        } else {
          if (!availableAfter) {
            addDebug('Android: Pedometer sensor not available.');
            if (isMountedRef.current) setPermissionStatus('unavailable');
            return;
          }

          if (isMountedRef.current) {
            setPermissionStatus('granted');
            addDebug('Android: Starting watchStepCount...');
          }

          try {
            const sub = Pedometer.watchStepCount((result) => {
              console.log('[Pedometer] Android watch:', result.steps);
              addDebug(`Android steps: ${result.steps}`);
              if (isMountedRef.current) {
                setSteps(result.steps);
              }
            });
            watchSubRef.current = sub;
            addDebug('Android: watchStepCount subscription active.');
          } catch (watchErr) {
            addDebug(`Android watchStepCount failed: ${String(watchErr)}`);
          }
        }
      } catch (err) {
        addDebug(`Init error: ${String(err)}`);
        console.log('[Pedometer] Init error:', err);
        if (isMountedRef.current) setPermissionStatus('unavailable');
      }
    };

    void init();

    return () => {
      isMountedRef.current = false;
      if (watchSubRef.current) {
        watchSubRef.current.remove();
        watchSubRef.current = null;
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [fetchIOSSteps, fetchStepsLast24h, fetchYesterdaySteps, addDebug]);

  useEffect(() => {
    if (permissionStatus !== 'granted' || Platform.OS === 'web') return;

    const handleAppState = async (nextState: AppStateStatus) => {
      if (nextState === 'active' && isMountedRef.current) {
        console.log('[Pedometer] App foregrounded - refreshing steps');
        if (Platform.OS === 'ios') {
          const count = await fetchIOSSteps();
          if (count >= 0 && isMountedRef.current) {
            setSteps(count);
            addDebug(`Foreground refresh: ${count} steps`);
          }
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => {
      sub.remove();
    };
  }, [permissionStatus, fetchIOSSteps, addDebug]);

  return { steps, yesterdaySteps, isAutomatic: true, permissionStatus, refreshSteps, debugInfo };
}
