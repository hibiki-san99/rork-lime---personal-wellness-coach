import { useEffect, useCallback, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { WaterReminderSettings } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const WATER_MESSAGES = [
  "💧 Time to drink some water! Stay hydrated for better health.",
  "💧 Hydration check! Have you had a glass of water recently?",
  "💧 Your body needs water to function well. Take a sip!",
  "💧 Water break! Drinking enough water helps your heart, brain, and kidneys.",
  "💧 Remember to hydrate! Even mild dehydration affects concentration.",
  "💧 A glass of water now keeps you energised throughout the day.",
  "💧 Hydration reminder! Water helps flush toxins and supports digestion.",
  "💧 Don't forget to drink water! It's the simplest health habit.",
];

export function useWaterReminder(settings: WaterReminderSettings) {
  const scheduledRef = useRef(false);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus === 'granted') return true;

      const { status } = await Notifications.requestPermissionsAsync();
      console.log('[WaterReminder] Permission status:', status);
      return status === 'granted';
    } catch (err) {
      console.log('[WaterReminder] Permission error:', err);
      return false;
    }
  }, []);

  const cancelAllReminders = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[WaterReminder] Cancelled all notifications');
    } catch (err) {
      console.log('[WaterReminder] Cancel error:', err);
    }
  }, []);

  const scheduleReminders = useCallback(async () => {
    if (Platform.OS === 'web') return;
    if (!settings.enabled) {
      await cancelAllReminders();
      return;
    }

    const hasPermission = await requestPermission();
    if (!hasPermission) {
      console.log('[WaterReminder] No permission, skipping schedule');
      return;
    }

    await cancelAllReminders();

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let nextHour = currentHour;
    let nextMinute = currentMinute + settings.intervalMinutes;

    if (nextMinute >= 60) {
      nextHour += Math.floor(nextMinute / 60);
      nextMinute = nextMinute % 60;
    }

    let count = 0;
    const maxNotifications = 20;

    for (let h = nextHour; h <= settings.endHour && count < maxNotifications; h++) {
      if (h < settings.startHour) continue;

      const startMin = h === nextHour ? nextMinute : 0;
      for (let m = startMin; m < 60 && count < maxNotifications; m += settings.intervalMinutes) {
        if (h === settings.endHour && m > 0) break;

        const triggerDate = new Date(now);
        triggerDate.setHours(h, m, 0, 0);

        if (triggerDate <= now) continue;

        const message = WATER_MESSAGES[count % WATER_MESSAGES.length] ?? WATER_MESSAGES[0]!;

        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Water Reminder',
              body: message,
              sound: false,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
            },
          });
          count++;
        } catch (err) {
          console.log('[WaterReminder] Schedule error:', err);
        }
      }
    }

    console.log(`[WaterReminder] Scheduled ${count} notifications for today`);
    scheduledRef.current = true;
  }, [settings, requestPermission, cancelAllReminders]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    void scheduleReminders();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void scheduleReminders();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [scheduleReminders]);

  return {
    requestPermission,
    scheduleReminders,
    cancelAllReminders,
  };
}
