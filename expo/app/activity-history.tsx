import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, Footprints, Dumbbell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
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
  stepsCalories: number;
  totalCalories: number;
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

  const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);

  const stepsCaloriesToday = useMemo(() => {
    const weight = profile?.weightKg ?? 60;
    return calculateStepCalories(dailySteps, weight);
  }, [dailySteps, profile?.weightKg]);

  const todayActivities = useMemo(
    () => activityLogs.filter(a => a.date === todayString),
    [activityLogs, todayString]
  );

  const todayActivityCalories = useMemo(
    () => todayActivities.reduce((sum, a) => sum + a.caloriesBurned, 0),
    [todayActivities]
  );

  const todayTotal = stepsCaloriesToday + todayActivityCalories;

  const pastGroups = useMemo(() => {
    const grouped: Record<string, ActivityLog[]> = {};
    for (const log of activityLogs) {
      if (log.date === todayString) continue;
      if (!grouped[log.date]) grouped[log.date] = [];
      grouped[log.date].push(log);
    }

    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return sortedDates.map((date): DayGroup => {
      const activities = grouped[date];
      const actCal = activities.reduce((s, a) => s + a.caloriesBurned, 0);
      const dayLabel = formatDateLabel(date);
      return {
        date,
        label: dayLabel,
        activities,
        activityCalories: actCal,
        stepsCalories: 0,
        totalCalories: actCal,
      };
    });
  }, [activityLogs, todayString]);

  const toggleDate = useCallback((date: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Activity History</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.todaySummaryCard}>
            <Text style={styles.todaySummaryTitle}>Today</Text>
            <Text style={styles.todayTotal}>{todayTotal.toLocaleString()}</Text>
            <Text style={styles.todayTotalLabel}>total calories burnt</Text>

            <View style={styles.todayBreakdownRow}>
              <View style={styles.todayBreakdownItem}>
                <View style={[styles.breakdownIcon, { backgroundColor: Colors.physicalActivityLight }]}>
                  <Footprints size={16} color={Colors.physicalActivity} />
                </View>
                <View>
                  <Text style={styles.breakdownValue}>{stepsCaloriesToday}</Text>
                  <Text style={styles.breakdownLabel}>from steps</Text>
                </View>
              </View>
              <View style={styles.todayBreakdownDivider} />
              <View style={styles.todayBreakdownItem}>
                <View style={[styles.breakdownIcon, { backgroundColor: '#EDE7F6' }]}>
                  <Dumbbell size={16} color="#7E57C2" />
                </View>
                <View>
                  <Text style={styles.breakdownValue}>{todayActivityCalories}</Text>
                  <Text style={styles.breakdownLabel}>from activity</Text>
                </View>
              </View>
            </View>
          </View>

          {todayActivities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{"Today's Activities"}</Text>
              {todayActivities.map(activity => (
                <SwipeToDelete
                  key={activity.id}
                  onDelete={() => confirmDelete(activity.id)}
                  containerStyle={styles.swipeRow}
                  testID={`activity-row-${activity.id}`}
                >
                  <View style={styles.activityRow}>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityType}>{activity.type}</Text>
                      <Text style={styles.activityMeta}>
                        {activity.durationMinutes} min · {activity.intensity}
                      </Text>
                    </View>
                    <Text style={styles.activityCal}>{activity.caloriesBurned} cal</Text>
                  </View>
                </SwipeToDelete>
              ))}
            </View>
          )}

          {todayActivities.length === 0 && (
            <View style={styles.emptyToday}>
              <Text style={styles.emptyTodayEmoji}>{"\uD83C\uDFCB\uFE0F"}</Text>
              <Text style={styles.emptyTodayText}>No activities logged today</Text>
              <TouchableOpacity
                style={styles.logActivityBtn}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/activity-logger' as any);
                }}
              >
                <Text style={styles.logActivityBtnText}>Log Activity</Text>
              </TouchableOpacity>
            </View>
          )}

          {pastGroups.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Past Activity</Text>
              {pastGroups.map(group => {
                const isExpanded = expandedDates[group.date] ?? false;
                return (
                  <View key={group.date} style={styles.dateGroupCard}>
                    <TouchableOpacity
                      style={styles.dateGroupHeader}
                      onPress={() => toggleDate(group.date)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dateGroupInfo}>
                        <Text style={styles.dateGroupLabel}>{group.label}</Text>
                        <Text style={styles.dateGroupCount}>
                          {group.activities.length} {group.activities.length === 1 ? 'activity' : 'activities'}
                        </Text>
                      </View>
                      <Text style={styles.dateGroupCal}>{group.totalCalories} cal</Text>
                      <View style={[styles.chevronWrap, isExpanded && styles.chevronExpanded]}>
                        <ChevronDown size={16} color={Colors.textTertiary} />
                      </View>
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={styles.dateGroupBody}>
                        {group.activities.map(activity => (
                          <SwipeToDelete
                            key={activity.id}
                            onDelete={() => confirmDelete(activity.id)}
                            containerStyle={styles.swipeRow}
                          >
                            <View style={styles.activityRow}>
                              <View style={styles.activityInfo}>
                                <Text style={styles.activityType}>{activity.type}</Text>
                                <Text style={styles.activityMeta}>
                                  {activity.durationMinutes} min · {activity.intensity}
                                </Text>
                              </View>
                              <Text style={styles.activityCal}>{activity.caloriesBurned} cal</Text>
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
              <Text style={styles.emptyPastText}>No past activity logs yet</Text>
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  todaySummaryCard: {
    backgroundColor: '#FFF5F0',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE0CC',
  },
  todaySummaryTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 4,
  },
  todayTotal: {
    fontSize: 48,
    fontWeight: '800' as const,
    color: '#E65100',
    letterSpacing: -2,
  },
  todayTotalLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginBottom: 20,
  },
  todayBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  todayBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  breakdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  breakdownLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  todayBreakdownDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#FFD6BF',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  activityInfo: {
    flex: 1,
  },
  activityType: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  activityMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  activityCal: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#E65100',
  },
  swipeRow: {
    marginBottom: 8,
  },
  emptyToday: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  emptyTodayEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTodayText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginBottom: 14,
  },
  logActivityBtn: {
    backgroundColor: Colors.physicalActivity,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  logActivityBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  dateGroupCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  dateGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  dateGroupInfo: {
    flex: 1,
  },
  dateGroupLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  dateGroupCount: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  dateGroupCal: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#E65100',
    marginRight: 8,
  },
  chevronWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  dateGroupBody: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 8,
  },
  emptyPast: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyPastText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
});
