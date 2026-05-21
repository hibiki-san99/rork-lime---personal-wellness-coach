import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import {
  UserProfile, MedicalHistory, ClinicalMeasurements, HeartAgeResult,
  MealLog, JournalLog, ActivityLog, SleepLog, UserState,
  TipCompletion, MissionProgress, HealthMarkerEntry, WaterReminderSettings,
  NutrientTargets,
} from '@/types';
import { DEFAULT_BADGES, calculateMealPoints, calculateActivityPoints, calculateSleepPoints, calculateJournalPoints, evaluateBadges, reconcileBadges } from '@/constants/data';
import { POINTS_PER_TIP, POINTS_MODULE_COMPLETE, MISSION_MODULES, getMissionAutoCompletions } from '@/constants/missions';
import { calculateNutrientTargets } from '@/utils/nutrientTargets';
import { calculateHeartAge, getBMI } from '@/utils/heartAge';
import { useStepCounter } from '@/hooks/useStepCounter';
import { useAuth } from '@/context/AuthContext';
import { resilientFetch } from '@/utils/resilientFetch';

const STORAGE_KEY_PREFIX = 'lime_user_state_';
const getStorageKey = (userId: string | null) => userId ? `${STORAGE_KEY_PREFIX}${userId}` : null;

const defaultState: UserState = {
  profile: null,
  medicalHistory: null,
  clinicalMeasurements: null,
  heartAgeResult: null,
  onboardingComplete: false,
  totalPoints: 0,
  dailySteps: 0,
  stepGoal: 10000,
  mealLogs: [],
  journalLogs: [],
  activityLogs: [],
  sleepLogs: [],
  badges: DEFAULT_BADGES,
  weeklyStreak: 0,
  tipCompletions: [],
  missionProgress: [],
  healthMarkers: [],
  waterReminder: { enabled: false, intervalMinutes: 60, startHour: 8, endHour: 22 },
};

export const [UserProvider, useUser] = createContextHook(() => {
  const [state, setState] = useState<UserState>(defaultState);
  const queryClient = useQueryClient();
  const { steps: pedometerSteps, yesterdaySteps: pedometerYesterdaySteps, isAutomatic: stepsAutomatic, permissionStatus: stepsPermissionStatus, refreshSteps, debugInfo: stepsDebugInfo } = useStepCounter();
  const { token, isAuthenticated, user: authUser } = useAuth();
  const hasFetchedRemoteRef = useRef(false);
  const prevTokenRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  const syncToBackend = useCallback(async (data: UserState) => {
    if (!token) return;
    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      if (!baseUrl) return;
      await resilientFetch(`${baseUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      console.log('[Sync] Data synced to backend');
    } catch (err) {
      console.log('[Sync] Error:', err);
    }
  }, [token]);

  const fetchFromBackend = useCallback(async (): Promise<UserState | null> => {
    if (!token) return null;
    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      if (!baseUrl) return null;
      const res = await resilientFetch(`${baseUrl}/api/sync/get`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json() as { data: Record<string, unknown> | null };
      if (json.data) {
        const remote = json.data as unknown as UserState;
        console.log('[Sync] Fetched remote data, onboardingComplete:', remote.onboardingComplete);
        return {
          ...defaultState,
          ...remote,
          badges: reconcileBadges(remote.badges),
          tipCompletions: remote.tipCompletions ?? [],
          missionProgress: remote.missionProgress ?? [],
          healthMarkers: remote.healthMarkers ?? [],
          waterReminder: remote.waterReminder ?? defaultState.waterReminder,
          stepGoal: 10000,
        };
      }
      return null;
    } catch (err) {
      console.log('[Sync] Fetch from backend error:', err);
      return null;
    }
  }, [token]);

  const stateQuery = useQuery({
    queryKey: ['userState', authUser?.id ?? 'anon'],
    enabled: !!authUser?.id,
    queryFn: async () => {
      const key = getStorageKey(authUser?.id ?? null);
      if (!key) return defaultState;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as UserState;
        return {
          ...defaultState,
          ...parsed,
          badges: reconcileBadges(parsed.badges),
          tipCompletions: parsed.tipCompletions ?? [],
          missionProgress: parsed.missionProgress ?? [],
          healthMarkers: parsed.healthMarkers ?? [],
          waterReminder: parsed.waterReminder ?? defaultState.waterReminder,
          stepGoal: 10000,
        };
      }
      return defaultState;
    },
  });

  useEffect(() => {
    if (stateQuery.data) {
      let data = stateQuery.data;
      if (data.profile && data.onboardingComplete && !data.nutrientTargets) {
        console.log('[UserContext] Auto-calculating nutrient targets for existing user');
        data = { ...data, nutrientTargets: calculateNutrientTargets(data.profile, data.medicalHistory) };
      }
      if (data.profile && data.onboardingComplete && !data.heartAgeResult) {
        console.log('[UserContext] Auto-recalculating heart age for existing user');
        const defaultClinical = data.clinicalMeasurements ?? { fastingGlucose: '', systolicBP: '', diastolicBP: '', totalCholesterol: '', ldl: '', hdl: '', triglycerides: '' };
        const defaultMedical = data.medicalHistory ?? { diabetes: false, rheumatoidArthritis: false, ckd: false, atrialFibrillation: false, familyHistoryCVD: false, onBloodPressureMeds: false, onCholesterolMeds: false };
        data = { ...data, heartAgeResult: calculateHeartAge(data.profile, defaultMedical, defaultClinical) };
      }
      if (data.profile && data.profile.heightCm > 0 && data.healthMarkers.length > 0) {
        const weightEntries = data.healthMarkers.filter(m => m.markerName === 'Weight');
        const existingAutoBMIDates = new Set(
          data.healthMarkers.filter(m => m.markerName === 'BMI' && m.source === 'auto').map(m => m.date)
        );
        const heightCm = data.profile.heightCm;
        const newBMIEntries: HealthMarkerEntry[] = [];
        for (const w of weightEntries) {
          if (!existingAutoBMIDates.has(w.date) && w.value > 0) {
            newBMIEntries.push({
              id: `hm_bmi_bf_${w.timestamp}_${Math.random().toString(36).slice(2, 6)}`,
              date: w.date,
              markerName: 'BMI',
              value: getBMI(heightCm, w.value),
              unit: 'kg/m²',
              source: 'auto',
              points: 0,
              timestamp: w.timestamp + 1,
            });
          }
        }
        if (newBMIEntries.length > 0) {
          console.log('[UserContext] Backfilled BMI entries from weight history:', newBMIEntries.length);
          data = { ...data, healthMarkers: [...data.healthMarkers, ...newBMIEntries] };
        }
      }
      setState(data);
    }
  }, [stateQuery.data]);

  useEffect(() => {
    if (!isAuthenticated || !token || !authUser?.id) {
      hasFetchedRemoteRef.current = false;
      prevTokenRef.current = null;
      if (currentUserIdRef.current) {
        console.log('[Sync] Auth cleared, resetting user state in memory');
        currentUserIdRef.current = null;
        setState(defaultState);
      }
      return;
    }

    if (currentUserIdRef.current && currentUserIdRef.current !== authUser.id) {
      console.log('[Sync] User changed, resetting state in memory before load');
      setState(defaultState);
    }
    currentUserIdRef.current = authUser.id;

    if (token === prevTokenRef.current) return;
    prevTokenRef.current = token;

    const restoreFromBackend = async () => {
      console.log('[Sync] Attempting to restore data from backend...');
      const remote = await fetchFromBackend();
      if (remote && remote.onboardingComplete) {
        console.log('[Sync] Restoring remote state - profile:', remote.profile?.name);
        if (remote.profile && !remote.heartAgeResult) {
          console.log('[Sync] Heart age missing in remote data, recalculating...');
          const defaultClinical = remote.clinicalMeasurements ?? { fastingGlucose: '', systolicBP: '', diastolicBP: '', totalCholesterol: '', ldl: '', hdl: '', triglycerides: '' };
          const defaultMedical = remote.medicalHistory ?? { diabetes: false, rheumatoidArthritis: false, ckd: false, atrialFibrillation: false, familyHistoryCVD: false, onBloodPressureMeds: false, onCholesterolMeds: false };
          remote.heartAgeResult = calculateHeartAge(remote.profile, defaultMedical, defaultClinical);
        }
        setState(remote);
        const key = getStorageKey(authUser.id);
        if (key) await AsyncStorage.setItem(key, JSON.stringify(remote));
        hasFetchedRemoteRef.current = true;
      } else {
        console.log('[Sync] No remote data to restore');
        hasFetchedRemoteRef.current = true;
      }
    };

    void restoreFromBackend();
  }, [isAuthenticated, token, authUser?.id, fetchFromBackend]);

  const { mutate: persistState } = useMutation({
    mutationFn: async (newState: UserState) => {
      const key = getStorageKey(currentUserIdRef.current);
      if (key) await AsyncStorage.setItem(key, JSON.stringify(newState));
      return newState;
    },
  });

  const updateState = useCallback((updates: Partial<UserState>) => {
    setState(prev => {
      const next = { ...prev, ...updates };
      persistState(next);
      void syncToBackend(next);
      return next;
    });
  }, [persistState, syncToBackend]);

  const dailyStepsForBadges = stepsAutomatic ? pedometerSteps : state.dailySteps;

  // Evaluate badge unlocks whenever the underlying log/marker/progress data changes.
  useEffect(() => {
    if (!state.profile) return;
    const { badges: nextBadges, newlyEarnedIds } = evaluateBadges(state, dailyStepsForBadges);
    if (newlyEarnedIds.length > 0) {
      console.log('[Badges] Newly earned:', newlyEarnedIds.join(', '));
      updateState({ badges: nextBadges });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.mealLogs.length,
    state.activityLogs.length,
    state.sleepLogs.length,
    state.journalLogs.length,
    state.tipCompletions.length,
    state.missionProgress,
    state.healthMarkers.length,
    state.totalPoints,
    state.onboardingComplete,
    dailyStepsForBadges,
  ]);

  const completeOnboarding = useCallback((
    profile: UserProfile,
    medical: MedicalHistory,
    clinical: ClinicalMeasurements,
    heartAge: HeartAgeResult,
    nutrientTargets?: NutrientTargets
  ) => {
    updateState({
      profile,
      medicalHistory: medical,
      clinicalMeasurements: clinical,
      heartAgeResult: heartAge,
      onboardingComplete: true,
      nutrientTargets,
    });
  }, [updateState]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    if (!state.profile) return;
    const newProfile = { ...state.profile, ...updates };
    const needsRecalc = 'weightKg' in updates || 'activityLevel' in updates || 'healthGoal' in updates;
    const newTargets = needsRecalc
      ? calculateNutrientTargets(newProfile, state.medicalHistory)
      : state.nutrientTargets;

    const weightChanged = 'weightKg' in updates || 'heightCm' in updates;
    let newHealthMarkers = state.healthMarkers;
    if (weightChanged && newProfile.heightCm > 0 && newProfile.weightKg > 0) {
      const bmi = getBMI(newProfile.heightCm, newProfile.weightKg);
      const today = new Date().toISOString().split('T')[0] ?? '';
      const now = Date.now();
      console.log('[UserContext] Auto-logging BMI:', bmi, 'from weight:', newProfile.weightKg, 'height:', newProfile.heightCm);
      const filteredMarkers = state.healthMarkers.filter(m => !(m.markerName === 'BMI' && m.date === today && m.source === 'auto'));
      const bmiEntry: HealthMarkerEntry = {
        id: `hm_bmi_${now}`,
        date: today,
        markerName: 'BMI',
        value: bmi,
        unit: 'kg/m²',
        source: 'auto',
        points: 0,
        timestamp: now,
      };
      newHealthMarkers = [...filteredMarkers, bmiEntry];
    }

    updateState({
      profile: newProfile,
      ...(needsRecalc ? { nutrientTargets: newTargets } : {}),
      ...(weightChanged && newHealthMarkers !== state.healthMarkers ? { healthMarkers: newHealthMarkers } : {}),
    });
  }, [state.profile, state.medicalHistory, state.nutrientTargets, state.healthMarkers, updateState]);

  const checkAndAutoCompleteMissions = useCallback((newState: UserState) => {
    if (newState.missionProgress.length === 0) return newState;

    const autoCompletions = getMissionAutoCompletions({
      mealLogs: newState.mealLogs,
      activityLogs: newState.activityLogs,
      sleepLogs: newState.sleepLogs,
      journalLogs: newState.journalLogs,
    });

    let updated = false;
    let bonusPoints = 0;
    const newProgress = newState.missionProgress.map(mp => {
      const moduleCompletions = autoCompletions.filter(ac => ac.moduleId === mp.moduleId);
      if (moduleCompletions.length === 0) return mp;

      const newCompletedIds = [...mp.completedGoalIds];
      const newAutoIds = [...(mp.autoCompletedGoalIds ?? [])];

      for (const ac of moduleCompletions) {
        if (!newCompletedIds.includes(ac.goalId)) {
          newCompletedIds.push(ac.goalId);
          newAutoIds.push(ac.goalId);
          const mod = MISSION_MODULES.find(m => m.id === mp.moduleId);
          const goal = mod?.goals.find(g => g.id === ac.goalId);
          if (goal) {
            bonusPoints += goal.points;
            updated = true;
          }
        }
      }

      const mod = MISSION_MODULES.find(m => m.id === mp.moduleId);
      const allDone = mod ? newCompletedIds.length >= mod.goals.length : false;
      if (allDone && !mp.completedAt) {
        bonusPoints += POINTS_MODULE_COMPLETE;
      }

      return {
        ...mp,
        completedGoalIds: newCompletedIds,
        autoCompletedGoalIds: newAutoIds,
        completedAt: allDone ? (mp.completedAt ?? new Date().toISOString()) : mp.completedAt,
      };
    });

    if (!updated) return newState;

    return {
      ...newState,
      missionProgress: newProgress,
      totalPoints: newState.totalPoints + bonusPoints,
    };
  }, []);

  const addMealLog = useCallback((log: MealLog) => {
    const { total: points } = calculateMealPoints(log.categories);
    const plantCategories = log.categories.filter(c =>
      !['processed_foods', 'animal_products'].includes(c)
    );

    const newLog = { ...log, points };
    const newMeals = [...state.mealLogs, newLog];
    void plantCategories;

    let newState: UserState = {
      ...state,
      mealLogs: newMeals,
      totalPoints: state.totalPoints + points,
    };
    newState = checkAndAutoCompleteMissions(newState);
    updateState(newState);
    return points;
  }, [state, updateState, checkAndAutoCompleteMissions]);

  const addJournalLog = useCallback((log: JournalLog) => {
    const { total: journalPts } = calculateJournalPoints(log.entry);
    const newLog = { ...log, points: journalPts };

    let newState: UserState = {
      ...state,
      journalLogs: [...state.journalLogs, newLog],
      totalPoints: state.totalPoints + journalPts,
    };
    newState = checkAndAutoCompleteMissions(newState);
    updateState(newState);
    return journalPts;
  }, [state, updateState, checkAndAutoCompleteMissions]);

  const addActivityLog = useCallback((log: ActivityLog) => {
    const { total: actPoints } = calculateActivityPoints(log.durationMinutes, log.intensity);
    const points = actPoints;
    const newLog = { ...log, points };

    let newState: UserState = {
      ...state,
      activityLogs: [...state.activityLogs, newLog],
      totalPoints: state.totalPoints + points,
    };
    newState = checkAndAutoCompleteMissions(newState);
    updateState(newState);
    return points;
  }, [state, updateState, checkAndAutoCompleteMissions]);

  const addSleepLog = useCallback((log: SleepLog) => {
    const { total: sleepPts } = calculateSleepPoints(log.bedtime, log.wakeTime, log.quality, log.wakeFeeling);
    const newLog = { ...log, points: sleepPts };
    const newSleepLogs = [...state.sleepLogs, newLog];

    let newState: UserState = {
      ...state,
      sleepLogs: newSleepLogs,
      totalPoints: state.totalPoints + sleepPts,
    };
    newState = checkAndAutoCompleteMissions(newState);
    updateState(newState);
    return sleepPts;
  }, [state, updateState, checkAndAutoCompleteMissions]);

  const deleteMealLog = useCallback((id: string) => {
    const log = state.mealLogs.find(l => l.id === id);
    if (!log) return;
    const newMeals = state.mealLogs.filter(l => l.id !== id);
    updateState({
      mealLogs: newMeals,
      totalPoints: Math.max(0, state.totalPoints - (log.points ?? 0)),
    });
    console.log('[UserContext] Deleted meal log', id, 'points refunded:', log.points);
  }, [state.mealLogs, state.totalPoints, updateState]);

  const deleteActivityLog = useCallback((id: string) => {
    const log = state.activityLogs.find(l => l.id === id);
    if (!log) return;
    const newLogs = state.activityLogs.filter(l => l.id !== id);
    updateState({
      activityLogs: newLogs,
      totalPoints: Math.max(0, state.totalPoints - (log.points ?? 0)),
    });
    console.log('[UserContext] Deleted activity log', id);
  }, [state.activityLogs, state.totalPoints, updateState]);

  const deleteSleepLog = useCallback((id: string) => {
    const log = state.sleepLogs.find(l => l.id === id);
    if (!log) return;
    const newLogs = state.sleepLogs.filter(l => l.id !== id);
    updateState({
      sleepLogs: newLogs,
      totalPoints: Math.max(0, state.totalPoints - (log.points ?? 0)),
    });
    console.log('[UserContext] Deleted sleep log', id);
  }, [state.sleepLogs, state.totalPoints, updateState]);

  const deleteJournalLog = useCallback((id: string) => {
    const log = state.journalLogs.find(l => l.id === id);
    if (!log) return;
    const newLogs = state.journalLogs.filter(l => l.id !== id);
    updateState({
      journalLogs: newLogs,
      totalPoints: Math.max(0, state.totalPoints - (log.points ?? 0)),
    });
    console.log('[UserContext] Deleted journal log', id);
  }, [state.journalLogs, state.totalPoints, updateState]);

  const completeTip = useCallback((tipId: string) => {
    const todayStr = new Date().toISOString().split('T')[0] ?? '';
    const already = state.tipCompletions.some(tc => tc.tipId === tipId && tc.date === todayStr);
    if (already) return 0;

    const completion: TipCompletion = {
      tipId,
      date: todayStr,
      points: POINTS_PER_TIP,
    };

    updateState({
      tipCompletions: [...state.tipCompletions, completion],
      totalPoints: state.totalPoints + POINTS_PER_TIP,
    });
    return POINTS_PER_TIP;
  }, [state, updateState]);

  const isTipCompletedToday = useCallback((tipId: string): boolean => {
    const todayStr = new Date().toISOString().split('T')[0] ?? '';
    return state.tipCompletions.some(tc => tc.tipId === tipId && tc.date === todayStr);
  }, [state.tipCompletions]);

  const enrollInMission = useCallback((moduleId: string) => {
    const already = state.missionProgress.some(mp => mp.moduleId === moduleId);
    if (already) return;

    const progress: MissionProgress = {
      moduleId,
      enrolledAt: new Date().toISOString(),
      completedGoalIds: [],
    };

    updateState({
      missionProgress: [...state.missionProgress, progress],
    });
  }, [state, updateState]);

  const completeMissionGoal = useCallback((moduleId: string, goalId: string) => {
    const progressIdx = state.missionProgress.findIndex(mp => mp.moduleId === moduleId);
    if (progressIdx === -1) return 0;

    const progress = state.missionProgress[progressIdx];
    if (!progress || progress.completedGoalIds.includes(goalId)) return 0;

    const mod = MISSION_MODULES.find(m => m.id === moduleId);
    const goal = mod?.goals.find(g => g.id === goalId);
    if (!goal) return 0;

    const newCompletedGoalIds = [...progress.completedGoalIds, goalId];
    const allDone = mod ? newCompletedGoalIds.length >= mod.goals.length : false;

    const newProgress = [...state.missionProgress];
    newProgress[progressIdx] = {
      ...progress,
      completedGoalIds: newCompletedGoalIds,
      completedAt: allDone ? new Date().toISOString() : undefined,
    };

    let bonusPoints = goal.points;
    if (allDone) {
      bonusPoints += POINTS_MODULE_COMPLETE;
    }

    const newBadges = [...state.badges];
    const moduleBadgeId = `mission_${moduleId}`;
    let existingBadge = newBadges.find(b => b.id === moduleBadgeId);
    if (allDone && !existingBadge) {
      newBadges.push({
        id: moduleBadgeId,
        name: `${mod?.name ?? 'Module'} Master`,
        description: `Completed all ${mod?.name ?? ''} missions`,
        icon: mod?.icon ?? '🏅',
        earned: true,
        earnedDate: new Date().toISOString(),
        color: mod?.color ?? '#000',
      });
    } else if (allDone && existingBadge && !existingBadge.earned) {
      existingBadge.earned = true;
      existingBadge.earnedDate = new Date().toISOString();
    }

    updateState({
      missionProgress: newProgress,
      totalPoints: state.totalPoints + bonusPoints,
      badges: newBadges,
    });
    return bonusPoints;
  }, [state, updateState]);

  const getMissionProgress = useCallback((moduleId: string): MissionProgress | null => {
    return state.missionProgress.find(mp => mp.moduleId === moduleId) ?? null;
  }, [state.missionProgress]);

  const POINTS_PER_HEALTH_MARKER = 15;

  const addHealthMarker = useCallback((entry: HealthMarkerEntry) => {
    const newEntry = { ...entry, points: POINTS_PER_HEALTH_MARKER };
    let newMarkers = [...state.healthMarkers, newEntry];

    if (entry.markerName === 'Weight' && state.profile && state.profile.heightCm > 0 && entry.value > 0) {
      const bmi = getBMI(state.profile.heightCm, entry.value);
      const filtered = newMarkers.filter(m => !(m.markerName === 'BMI' && m.date === entry.date && m.source === 'auto'));
      const bmiEntry: HealthMarkerEntry = {
        id: `hm_bmi_${entry.timestamp}_${Math.random().toString(36).slice(2, 6)}`,
        date: entry.date,
        markerName: 'BMI',
        value: bmi,
        unit: 'kg/m²',
        source: 'auto',
        points: 0,
        timestamp: entry.timestamp + 1,
      };
      newMarkers = [...filtered, bmiEntry];
      console.log('[UserContext] Auto-logged BMI:', bmi, 'from weight marker:', entry.value);
    }

    updateState({
      healthMarkers: newMarkers,
      totalPoints: state.totalPoints + POINTS_PER_HEALTH_MARKER,
    });
    return POINTS_PER_HEALTH_MARKER;
  }, [state, updateState]);

  const addHealthMarkersBatch = useCallback((entries: HealthMarkerEntry[]) => {
    const pointsPerEntry = POINTS_PER_HEALTH_MARKER;
    const totalNewPoints = entries.length * pointsPerEntry;
    const newEntries = entries.map(e => ({ ...e, points: pointsPerEntry }));
    const newMarkers = [...state.healthMarkers, ...newEntries];

    updateState({
      healthMarkers: newMarkers,
      totalPoints: state.totalPoints + totalNewPoints,
    });
    return totalNewPoints;
  }, [state, updateState]);

  const updateWaterReminder = useCallback((settings: Partial<WaterReminderSettings>) => {
    updateState({
      waterReminder: { ...state.waterReminder, ...settings },
    });
  }, [state.waterReminder, updateState]);

  const resetUser = useCallback(async () => {
    const allKeys = await AsyncStorage.getAllKeys();
    const userKeys = allKeys.filter(k => k.startsWith(STORAGE_KEY_PREFIX));
    if (userKeys.length > 0) {
      await AsyncStorage.multiRemove(userKeys);
      console.log('[UserContext] Cleared', userKeys.length, 'user state keys');
    }
    currentUserIdRef.current = null;
    setState(defaultState);
    void queryClient.invalidateQueries({ queryKey: ['userState'] });
  }, [queryClient]);

  const dailySteps = stepsAutomatic ? pedometerSteps : state.dailySteps;
  const yesterdaySteps = pedometerYesterdaySteps;

  const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todayPoints = useMemo(() => {
    const allLogs = [
      ...state.mealLogs, ...state.journalLogs,
      ...state.activityLogs, ...state.sleepLogs,
    ];
    const logPoints = allLogs
      .filter(l => l.date === todayString)
      .reduce((sum, l) => sum + l.points, 0);
    const tipPoints = state.tipCompletions
      .filter(tc => tc.date === todayString)
      .reduce((sum, tc) => sum + tc.points, 0);
    return logPoints + tipPoints;
  }, [state.mealLogs, state.journalLogs, state.activityLogs, state.sleepLogs, state.tipCompletions, todayString]);

  return useMemo(() => ({
    ...state,
    dailySteps,
    yesterdaySteps,
    isLoading: stateQuery.isLoading,
    todayPoints,
    stepsAutomatic,
    stepsPermissionStatus,
    stepsDebugInfo,
    refreshSteps,
    updateProfile,
    completeOnboarding,
    addMealLog,
    addJournalLog,
    addActivityLog,
    addSleepLog,
    deleteMealLog,
    deleteActivityLog,
    deleteSleepLog,
    deleteJournalLog,
    completeTip,
    isTipCompletedToday,
    enrollInMission,
    completeMissionGoal,
    getMissionProgress,
    addHealthMarker,
    addHealthMarkersBatch,
    updateWaterReminder,
    updateState,
    resetUser,
  }), [state, dailySteps, yesterdaySteps, stateQuery.isLoading, todayPoints, stepsAutomatic, stepsPermissionStatus, stepsDebugInfo, refreshSteps, updateProfile, completeOnboarding, addMealLog, addJournalLog, addActivityLog, addSleepLog, deleteMealLog, deleteActivityLog, deleteSleepLog, deleteJournalLog, completeTip, isTipCompletedToday, enrollInMission, completeMissionGoal, getMissionProgress, addHealthMarker, addHealthMarkersBatch, updateWaterReminder, updateState, resetUser]);
});
