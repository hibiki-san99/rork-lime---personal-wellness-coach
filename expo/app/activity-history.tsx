import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Alert, Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, Footprints, Dumbbell, Flame } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Pedometer } from 'expo-sensors';
import Colors from '@/constants/colors';
import SwipeToDelete from '@/components/SwipeToDelete';
import { useUser } from '@/context/UserContext';
import { ActivityLog } from '@/types';
import { calculateStepCalories } from '@/utils/calories';

interface DayGroup {
  date: string;
  label: string;
  activities: ActivityLog[];
  activityCalories: number;
  steps: number;
  stepsCalories: number;
  totalCalories: number;
}

const DAILY_GOAL = 400; // ~target burn per day for progress bar

async function fetchStepsForDay(date: string): Promise<number> {
  if (Platform.OS === 'web') return 0;
  try {
    const start = new Date(date + 'T00:00:00');
    const end = new Date(date + 'T23:59:59');
    const now = new Date();
    const useEnd = end > now ? now : end;
    const result = await Pedometer.getStepCountAsync(start, useEnd);
    return result.steps;
  } catch {
    return 0;
  }
}

export default function ActivityHistoryScreen() {
  const router = useRouter();
  const { activityLogs, dailySteps, profile, deleteActivityLog } = useUser();

  const confirmDelete = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete this activity?',
      'This will permanently remove this activity log and its calorie data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteActivityLog(id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  }, [deleteActivityLog]);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [pastStepsMap, setPastStepsMap] = useState<Record<string, number>>({});

  const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);
  const weight = profile?.weightKg ?? 60;

  const stepsCaloriesToday = useMemo(
    () => calculateStepCalories(dailySteps, weight),
    [dailySteps, weight]
  );

  const todayActivities = useMemo(
    () => activityLogs.filter(a => a.date === todayString),
    [activityLogs, todayString]
  );

  const todayActivityCalories = useMemo(
    () => todayActivities.reduce((sum, a) => sum + a.caloriesBurned, 0),
    [todayActivities]
  );

  const todayTotal = stepsCaloriesToday + todayActivityCalories;
  const todayPct = Math.min(100, (todayTotal / DAILY_GOAL) * 100);

  const motivation = useMemo(() => {
    if (todayTotal === 0) return 'Move a little — every step counts 🌱';
    if (todayTotal < 150) return 'Warming up. Keep going 💪';
    if (todayTotal < 300) return "Nice rhythm. You're on track 🔥";
    if (todayTotal < DAILY_GOAL) return 'Almost at your daily burn 🚀';
    return 'Daily burn smashed. Strong work 🏆';
  }, [todayTotal]);

  const pastDates = useMemo(() => {
    const set = new Set<string>();
    for (const log of activityLogs) {
      if (log.date !== todayString) set.add(log.date);
    }
    // Also include the last 7 days even without activity, to show step-only burn
    const today = new Date(todayString + 'T12:00:00');
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      set.add(d.toISOString().split('T')[0] ?? '');
    }
    set.delete('');
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [activityLogs, todayString]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const map: Record<string, number> = {};
      for (let i = 0; i < pastDates.length; i += 7) {
        const batch = pastDates.slice(i, i + 7);
        const res = await Promise.all(batch.map(async d => ({ d, s: await fetchStepsForDay(d) })));
        for (const r of res) map[r.d] = r.s;
      }
      if (!cancelled) setPastStepsMap(map);
    };
    void load();
    return () => { cancelled = true; };
  }, [pastDates]);

  const pastGroups = useMemo(() => {
    const grouped: Record<string, ActivityLog[]> = {};
    for (const log of activityLogs) {
      if (log.date === todayString) continue;
      if (!grouped[log.date]) grouped[log.date] = [];
      grouped[log.date].push(log);
    }

    return pastDates.map((date): DayGroup => {
      const activities = grouped[date] ?? [];
      const actCal = activities.reduce((s, a) => s + a.caloriesBurned, 0);
      const steps = pastStepsMap[date] ?? 0;
      const stepsCal = calculateStepCalories(steps, weight);
      return {
        date,
        label: formatDateLabel(date),
        activities,
        activityCalories: actCal,
        steps,
        stepsCalories: stepsCal,
        totalCalories: actCal + stepsCal,
      };
    }).filter(g => g.activities.length > 0 || g.stepsCalories > 0);
  }, [activityLogs, todayString, pastDates, pastStepsMap, weight]);

  const toggleDate = useCallback((date: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.pageTitle}>Activity History</Text>
          <Text style={styles.pageSub}>Calories burnt from steps and activities</Text>

          {/* Hero card */}
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Today's Burn</Text>
            <View style={styles.heroRow}>
              <Text style={styles.heroBig}>{todayTotal.toLocaleString()}</Text>
              <Text style={styles.heroPct}>{Math.round(todayPct)}%</Text>
            </View>
            <View style={styles.heroBarBg}>
              <View style={[styles.heroBarFill, { width: `${todayPct}%` as any }]} />
            </View>
            <Text style={styles.heroMsg}>{motivation}</Text>
          </View>

          {/* Breakdown row */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownCard}>
              <View style={[styles.bdTile, { backgroundColor: Colors.physicalActivity, shadowColor: Colors.physicalActivity }]}>
                <Footprints size={18} color={Colors.white} />
              </View>
              <Text style={styles.bdLabel}>From steps</Text>
              <Text style={styles.bdValue}>{stepsCaloriesToday}</Text>
              <Text style={styles.bdUnit}>kcal · {dailySteps.toLocaleString()} steps</Text>
            </View>
            <View style={styles.breakdownCard}>
              <View style={[styles.bdTile, { backgroundColor: Colors.mood, shadowColor: Colors.mood }]}>
                <Dumbbell size={18} color={Colors.white} />
              </View>
              <Text style={styles.bdLabel}>From activity</Text>
              <Text style={styles.bdValue}>{todayActivityCalories}</Text>
              <Text style={styles.bdUnit}>kcal · {todayActivities.length} logged</Text>
            </View>
          </View>

          {todayActivities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Activities</Text>
              {todayActivities.map(activity => (
                <SwipeToDelete
                  key={activity.id}
                  onDelete={() => confirmDelete(activity.id)}
                  containerStyle={styles.swipeRow}
                  testID={`activity-row-${activity.id}`}
                >
                  <View style={styles.activityCard}>
                    <View style={[styles.activityTile, { backgroundColor: Colors.mood, shadowColor: Colors.mood }]}>
                      <Dumbbell size={16} color={Colors.white} />
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityType}>{activity.type}</Text>
                      <Text style={styles.activityMeta}>
                        {activity.durationMinutes} min · {activity.intensity}
                      </Text>
                    </View>
                    <View style={styles.activityCalWrap}>
                      <Flame size={12} color={Colors.mood} fill={Colors.mood} />
                      <Text style={styles.activityCal}>{activity.caloriesBurned}</Text>
                    </View>
                  </View>
                </SwipeToDelete>
              ))}
            </View>
          )}

          {todayActivities.length === 0 && (
            <View style={styles.emptyToday}>
              <Text style={styles.emptyTodayText}>No activities logged today</Text>
              <TouchableOpacity
                style={styles.logActivityBtn}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/activity-logger' as any);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.logActivityBtnText}>Log Activity</Text>
              </TouchableOpacity>
            </View>
          )}

          {pastGroups.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Past Days</Text>
              {pastGroups.map(group => {
                const isExpanded = expandedDates[group.date] ?? false;
                return (
                  <View key={group.date} style={styles.dateGroupCard}>
                    <TouchableOpacity
                      style={styles.dateGroupHeader}
                      onPress={() => toggleDate(group.date)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.dateTile, { backgroundColor: Colors.primary, shadowColor: Colors.primary }]}>
                        <Flame size={16} color={Colors.white} />
                      </View>
                      <View style={styles.dateGroupInfo}>
                        <Text style={styles.dateGroupLabel}>{group.label}</Text>
                        <Text style={styles.dateGroupCount}>
                          {group.steps.toLocaleString()} steps · {group.activities.length} {group.activities.length === 1 ? 'activity' : 'activities'}
                        </Text>
                      </View>
                      <View style={styles.dateGroupCalWrap}>
                        <Text style={styles.dateGroupCal}>{group.totalCalories}</Text>
                        <Text style={styles.dateGroupCalUnit}>kcal</Text>
                      </View>
                      <View style={[styles.chevronWrap, isExpanded && styles.chevronExpanded]}>
                        <ChevronDown size={16} color={Colors.textTertiary} />
                      </View>
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={styles.dateGroupBody}>
                        {group.stepsCalories > 0 && (
                          <View style={styles.subRow}>
                            <View style={[styles.subTile, { backgroundColor: Colors.physicalActivityLight }]}>
                              <Footprints size={14} color={Colors.physicalActivity} />
                            </View>
                            <View style={styles.subInfo}>
                              <Text style={styles.subTitle}>Steps</Text>
                              <Text style={styles.subMeta}>{group.steps.toLocaleString()} steps</Text>
                            </View>
                            <Text style={styles.subCal}>{group.stepsCalories} kcal</Text>
                          </View>
                        )}
                        {group.activities.map(activity => (
                          <SwipeToDelete
                            key={activity.id}
                            onDelete={() => confirmDelete(activity.id)}
                            containerStyle={styles.swipeRowInner}
                          >
                            <View style={styles.subRow}>
                              <View style={[styles.subTile, { backgroundColor: Colors.moodLight }]}>
                                <Dumbbell size={14} color={Colors.mood} />
                              </View>
                              <View style={styles.subInfo}>
                                <Text style={styles.subTitle}>{activity.type}</Text>
                                <Text style={styles.subMeta}>
                                  {activity.durationMinutes} min · {activity.intensity}
                                </Text>
                              </View>
                              <Text style={styles.subCal}>{activity.caloriesBurned} kcal</Text>
                            </View>
                          </SwipeToDelete>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {pastGroups.length === 0 && (
            <View style={styles.emptyPast}>
              <Text style={styles.emptyPastText}>No past activity yet — log a workout to get started.</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function formatDateLabel(dateStr: string): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  const date = new Date(dateStr + 'T12:00:00');
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row' as const,
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 1, borderColor: Colors.cardBorder,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },

  pageTitle: { fontSize: 32, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.8 },
  pageSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 20 },

  heroCard: {
    borderRadius: 22, padding: 20, marginBottom: 14,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary, shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroLabel: { color: Colors.white, fontSize: 13, fontWeight: '600' as const, opacity: 0.9 },
  heroRow: { flexDirection: 'row' as const, alignItems: 'flex-end' as const, justifyContent: 'space-between' as const, marginTop: 4 },
  heroBig: { color: Colors.white, fontSize: 38, fontWeight: '800' as const, letterSpacing: -1 },
  heroPct: { color: Colors.white, fontSize: 26, fontWeight: '800' as const, opacity: 0.55, letterSpacing: -0.6 },
  heroBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 4, overflow: 'hidden' as const, marginTop: 12 },
  heroBarFill: { height: 8, backgroundColor: Colors.white, borderRadius: 4 },
  heroMsg: { color: Colors.white, fontSize: 13, fontWeight: '600' as const, marginTop: 12, opacity: 0.95 },

  breakdownRow: { flexDirection: 'row' as const, gap: 12, marginBottom: 22 },
  breakdownCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  bdTile: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 2, borderColor: Colors.white, marginBottom: 8,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  bdLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' as const },
  bdValue: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, marginTop: 2, letterSpacing: -0.6 },
  bdUnit: { fontSize: 11, color: Colors.textTertiary, fontWeight: '500' as const, marginTop: 1 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginBottom: 12, letterSpacing: -0.3 },

  swipeRow: { marginBottom: 10 },
  swipeRowInner: { marginBottom: 8 },

  activityCard: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12,
    backgroundColor: Colors.card, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  activityTile: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 2, borderColor: Colors.white,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  activityInfo: { flex: 1 },
  activityType: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.2 },
  activityMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' as const },
  activityCalWrap: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  activityCal: { fontSize: 15, fontWeight: '800' as const, color: Colors.text },

  emptyToday: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 22, alignItems: 'center' as const, marginBottom: 22,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 1,
  },
  emptyTodayText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' as const, marginBottom: 12 },
  logActivityBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 22,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 3,
  },
  logActivityBtnText: { fontSize: 14, fontWeight: '800' as const, color: Colors.white, letterSpacing: -0.2 },

  dateGroupCard: {
    backgroundColor: Colors.card, borderRadius: 18, marginBottom: 10,
    borderWidth: 1, borderColor: '#F1F3F6', overflow: 'hidden' as const,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  dateGroupHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, gap: 12 },
  dateTile: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 2, borderColor: Colors.white,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  dateGroupInfo: { flex: 1 },
  dateGroupLabel: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.2 },
  dateGroupCount: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' as const },
  dateGroupCalWrap: { alignItems: 'flex-end' as const, marginRight: 4 },
  dateGroupCal: { fontSize: 17, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.4 },
  dateGroupCalUnit: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  chevronWrap: { width: 22, height: 22, alignItems: 'center' as const, justifyContent: 'center' as const },
  chevronExpanded: { transform: [{ rotate: '180deg' }] },
  dateGroupBody: {
    paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4,
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  subRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10,
    paddingVertical: 10, paddingHorizontal: 4,
  },
  subTile: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  subInfo: { flex: 1 },
  subTitle: { fontSize: 13, fontWeight: '600' as const, color: Colors.text },
  subMeta: { fontSize: 11, color: Colors.textTertiary, marginTop: 1, fontWeight: '500' as const },
  subCal: { fontSize: 13, fontWeight: '700' as const, color: Colors.text },

  emptyPast: { alignItems: 'center' as const, paddingVertical: 20 },
  emptyPastText: { fontSize: 13, color: Colors.textTertiary, fontWeight: '500' as const, fontStyle: 'italic' as const },
});
