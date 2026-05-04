import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
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

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            testID="steps-history-back"
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Steps History</Text>
          <View style={{ width: 40 }} />
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

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Daily Avg</Text>
              <Text style={styles.statValue}>{stats.average.toLocaleString()}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Best Day</Text>
              <Text style={styles.statValue}>
                {stats.bestDay ? stats.bestDay.steps.toLocaleString() : '-'}
              </Text>
              {stats.bestDay && (
                <Text style={styles.statSub}>{formatBestDate(stats.bestDay.date)}</Text>
              )}
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{stats.total.toLocaleString()}</Text>
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
                          ? '#43A047'
                          : day.isToday
                          ? Colors.physicalActivity
                          : day.isYesterday
                          ? '#FFB74D'
                          : '#FFCC80';

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  tabTextActive: {
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
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
    color: Colors.physicalActivity,
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
    borderColor: '#43A047',
    opacity: 0.4,
  },
  goalLineLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#43A047',
    marginLeft: 4,
    opacity: 0.6,
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
    borderRadius: 18,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
});
