import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Footprints, Award, TrendingUp } from 'lucide-react-native';
import { Pedometer } from 'expo-sensors';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HORIZONTAL_PADDING = 50;
const CHART_HEIGHT = 220;
const Y_AXIS_WIDTH = 40;

type Period = 'week' | 'month' | '3months' | 'all';

interface DayData {
  date: string;
  label: string;
  steps: number;
  isToday: boolean;
  isYesterday: boolean;
}

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: 'week', label: 'Week', days: 7 },
  { key: 'month', label: 'Month', days: 30 },
  { key: '3months', label: '3 Months', days: 90 },
  { key: 'all', label: 'All Time', days: 365 },
];

const STEP_GOAL = 10000;

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0] ?? '';
}

function getShortLabel(dateStr: string, period: Period): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (period === 'week') {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] ?? '';
  }
  if (period === 'month') {
    return `${d.getDate()}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getDaysArray(numDays: number): { date: string; isToday: boolean; isYesterday: boolean }[] {
  const result: { date: string; isToday: boolean; isYesterday: boolean }[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayStr = formatDate(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = formatDate(d);
    result.push({
      date: ds,
      isToday: ds === todayStr,
      isYesterday: ds === yesterdayStr,
    });
  }
  return result;
}

async function fetchStepsForDay(date: string): Promise<number> {
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

export default function StepsHistoryScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('week');
  const [stepsMap, setStepsMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const periodConfig = PERIODS.find(p => p.key === period)!;
  const daysArray = useMemo(() => getDaysArray(periodConfig.days), [periodConfig.days]);

  const fetchAllSteps = useCallback(async (days: { date: string }[]) => {
    if (Platform.OS === 'web') {
      const mockMap: Record<string, number> = {};
      for (const day of days) {
        mockMap[day.date] = Math.floor(Math.random() * 14000);
      }
      return mockMap;
    }

    const map: Record<string, number> = {};
    const batchSize = 7;
    for (let i = 0; i < days.length; i += batchSize) {
      const batch = days.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (d) => {
          const steps = await fetchStepsForDay(d.date);
          return { date: d.date, steps };
        })
      );
      for (const r of results) {
        map[r.date] = r.steps;
      }
    }
    return map;
  }, []);

  useEffect(() => {
    setLoading(true);
    fadeAnim.setValue(0);

    const load = async () => {
      const map = await fetchAllSteps(daysArray);
      setStepsMap(map);
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    };

    void load();
  }, [daysArray, fetchAllSteps, fadeAnim]);

  const dayDataList: DayData[] = useMemo(() => {
    return daysArray.map(d => ({
      date: d.date,
      label: getShortLabel(d.date, period),
      steps: stepsMap[d.date] ?? 0,
      isToday: d.isToday,
      isYesterday: d.isYesterday,
    }));
  }, [daysArray, stepsMap, period]);

  const daysWithSteps = useMemo(() => dayDataList.filter(d => d.steps > 0), [dayDataList]);

  const stats = useMemo(() => {
    if (daysWithSteps.length === 0) {
      return { average: 0, bestDay: null as DayData | null, total: 0 };
    }
    const total = daysWithSteps.reduce((s, d) => s + d.steps, 0);
    const average = Math.round(total / daysWithSteps.length);
    const bestDay = daysWithSteps.reduce((best, d) => (d.steps > best.steps ? d : best), daysWithSteps[0]!);
    return { average, bestDay, total };
  }, [daysWithSteps]);

  const maxSteps = useMemo(() => {
    const dataMax = Math.max(...dayDataList.map(d => d.steps), 0);
    return Math.max(dataMax, STEP_GOAL) * 1.1;
  }, [dayDataList]);

  const formatBestDate = useCallback((dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }, []);

  const chartContentWidth = useMemo(() => {
    const barCount = dayDataList.length;
    if (period === 'week') {
      return SCREEN_WIDTH - CHART_HORIZONTAL_PADDING - Y_AXIS_WIDTH;
    }
    const minBarWidth = period === 'month' ? 20 : 10;
    const gap = period === 'month' ? 4 : 2;
    return Math.max(
      barCount * (minBarWidth + gap),
      SCREEN_WIDTH - CHART_HORIZONTAL_PADDING - Y_AXIS_WIDTH
    );
  }, [dayDataList.length, period]);

  const goalLineY = useMemo(() => {
    return CHART_HEIGHT - (STEP_GOAL / maxSteps) * CHART_HEIGHT;
  }, [maxSteps]);

  const yAxisLabels = useMemo(() => {
    const labels: number[] = [];
    const step = maxSteps > 20000 ? 5000 : maxSteps > 10000 ? 2500 : 2000;
    for (let v = 0; v <= maxSteps; v += step) {
      labels.push(v);
    }
    return labels;
  }, [maxSteps]);

  const showXLabel = useCallback((index: number, total: number) => {
    if (period === 'week') return true;
    if (period === 'month') return index % 5 === 0 || index === total - 1;
    return index % 15 === 0 || index === total - 1;
  }, [period]);

  const todayStr = useMemo(() => formatDate(new Date()), []);
  const todaySteps = useMemo(() => stepsMap[todayStr] ?? 0, [stepsMap, todayStr]);
  const todayPct = useMemo(() => Math.min(100, (todaySteps / STEP_GOAL) * 100), [todaySteps]);
  const motivation = useMemo(() => {
    if (todaySteps === 0) return 'Get moving — every step counts 🌱';
    if (todaySteps < 3000) return 'Warming up. Keep going 💪';
    if (todaySteps < 7000) return "Halfway there. You're doing great 🔥";
    if (todaySteps < STEP_GOAL) return 'Almost at 10k. Push through 🚀';
    return 'Daily goal smashed. Strong work 🏆';
  }, [todaySteps]);
  const daysHitGoal = useMemo(() => daysWithSteps.filter(d => d.steps >= STEP_GOAL).length, [daysWithSteps]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            testID="steps-history-back"
          >
            <ArrowLeft size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.pageTitle}>Steps History</Text>
          <Text style={styles.pageSub}>Track your daily movement and trends</Text>

          {/* Hero card */}
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Today's Steps</Text>
            <View style={styles.heroRow}>
              <Text style={styles.heroBig}>{todaySteps.toLocaleString()}</Text>
              <Text style={styles.heroPct}>{Math.round(todayPct)}%</Text>
            </View>
            <View style={styles.heroBarBg}>
              <View style={[styles.heroBarFill, { width: `${todayPct}%` as any }]} />
            </View>
            <Text style={styles.heroMsg}>{motivation}</Text>
          </View>

          <View style={styles.tabRow}>
            {PERIODS.map(p => (
              <TouchableOpacity
                key={p.key}
                style={[styles.tab, period === p.key && styles.tabActive]}
                onPress={() => setPeriod(p.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, period === p.key && styles.tabTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statTile, { backgroundColor: Colors.physicalActivity, shadowColor: Colors.physicalActivity }]}>
                <TrendingUp size={14} color={Colors.white} />
              </View>
              <Text style={styles.statLabel}>Daily Avg</Text>
              <Text style={styles.statValue}>{stats.average.toLocaleString()}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statTile, { backgroundColor: Colors.mood, shadowColor: Colors.mood }]}>
                <Award size={14} color={Colors.white} />
              </View>
              <Text style={styles.statLabel}>Best Day</Text>
              <Text style={styles.statValue}>
                {stats.bestDay ? stats.bestDay.steps.toLocaleString() : '-'}
              </Text>
              {stats.bestDay && (
                <Text style={styles.statSub}>{formatBestDate(stats.bestDay.date)}</Text>
              )}
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statTile, { backgroundColor: Colors.primary, shadowColor: Colors.primary }]}>
                <Footprints size={14} color={Colors.white} />
              </View>
              <Text style={styles.statLabel}>Goals Hit</Text>
              <Text style={styles.statValue}>{daysHitGoal}</Text>
              <Text style={styles.statSub}>of {daysWithSteps.length} days</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading step data...</Text>
            </View>
          ) : (
            <Animated.View style={[styles.chartCard, { opacity: fadeAnim }]}>
              <View style={styles.chartContainer}>
                <View style={styles.yAxis}>
                  {yAxisLabels.map(val => (
                    <View
                      key={val}
                      style={[
                        styles.yLabel,
                        { bottom: (val / maxSteps) * CHART_HEIGHT - 7 },
                      ]}
                    >
                      <Text style={styles.yLabelText}>
                        {val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : val}
                      </Text>
                    </View>
                  ))}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ width: chartContentWidth }}
                >
                  <View style={[styles.chartArea, { width: chartContentWidth }]}>
                    <View style={[
                      styles.goalLine,
                      { top: goalLineY },
                    ]}>
                      <View style={styles.goalLineDash} />
                      <Text style={styles.goalLineLabel}>10k</Text>
                    </View>

                    <View style={styles.barsContainer}>
                      {dayDataList.map((day, index) => {
                        const barHeight = maxSteps > 0
                          ? Math.max((day.steps / maxSteps) * CHART_HEIGHT, day.steps > 0 ? 3 : 0)
                          : 0;
                        const meetsGoal = day.steps >= STEP_GOAL;
                        const barColor = meetsGoal
                          ? Colors.primary
                          : day.isToday
                          ? Colors.physicalActivity
                          : day.isYesterday
                          ? '#FBBF77'
                          : '#FCD9B6';

                        const barWidth = period === 'week'
                          ? Math.floor((chartContentWidth - (dayDataList.length - 1) * 8) / dayDataList.length)
                          : period === 'month'
                          ? 16
                          : 8;

                        const gap = period === 'week' ? 8 : period === 'month' ? 4 : 2;

                        return (
                          <View
                            key={day.date}
                            style={[
                              styles.barWrapper,
                              {
                                width: barWidth,
                                marginHorizontal: gap / 2,
                              },
                            ]}
                          >
                            <View style={styles.barTrack}>
                              <Animated.View
                                style={[
                                  styles.bar,
                                  {
                                    height: barHeight,
                                    backgroundColor: barColor,
                                    borderRadius: barWidth > 10 ? 6 : 3,
                                    opacity: day.isToday ? 1 : day.isYesterday ? 0.85 : 0.7,
                                  },
                                ]}
                              />
                            </View>
                            {showXLabel(index, dayDataList.length) && (
                              <Text
                                style={[
                                  styles.xLabel,
                                  day.isToday && styles.xLabelToday,
                                ]}
                                numberOfLines={1}
                              >
                                {day.isToday ? 'Today' : day.label}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </ScrollView>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
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
  pageTitle: { fontSize: 32, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.8 },
  pageSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 20 },

  heroCard: {
    borderRadius: 22, padding: 20, marginBottom: 18,
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

  tabRow: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1, borderColor: Colors.cardBorder,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center' as const,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start' as const,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  statTile: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 2, borderColor: Colors.white, marginBottom: 8,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  statSub: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  chartContainer: {
    flexDirection: 'row',
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    height: CHART_HEIGHT,
    position: 'relative' as const,
  },
  yLabel: {
    position: 'absolute' as const,
    right: 4,
  },
  yLabelText: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  chartArea: {
    height: CHART_HEIGHT + 28,
    position: 'relative' as const,
  },
  goalLine: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  goalLineDash: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed' as const,
    borderWidth: 1,
    borderColor: Colors.primary,
    opacity: 0.4,
  },
  goalLineLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginLeft: 4,
    opacity: 0.7,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    paddingBottom: 0,
  },
  barWrapper: {
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
  },
  xLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  xLabelToday: {
    color: Colors.physicalActivity,
    fontWeight: '700' as const,
  },
  loadingContainer: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center' as const,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
});
