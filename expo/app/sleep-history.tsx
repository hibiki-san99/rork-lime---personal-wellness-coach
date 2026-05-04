import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import SwipeToDelete from '@/components/SwipeToDelete';
import { useUser } from '@/context/UserContext';
import { calculateSleepHours } from '@/constants/data';
import { SleepLog, WakeFeeling } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HORIZONTAL_PADDING = 50;
const CHART_HEIGHT = 200;
const Y_AXIS_WIDTH = 40;
const SLEEP_TARGET = 7;

type Period = 'week' | 'month' | '3months';

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: 'week', label: 'Week', days: 7 },
  { key: 'month', label: 'Month', days: 30 },
  { key: '3months', label: '3 Months', days: 90 },
];

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

function getFormattedDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

interface NightData {
  date: string;
  label: string;
  hours: number;
  wakeFeeling?: WakeFeeling;
  isToday: boolean;
}

function getDaysArray(numDays: number): { date: string; isToday: boolean }[] {
  const result: { date: string; isToday: boolean }[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayStr = formatDate(today);

  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = formatDate(d);
    result.push({ date: ds, isToday: ds === todayStr });
  }
  return result;
}

function getBarColor(hours: number): string {
  if (hours >= SLEEP_TARGET) return '#4CAF50';
  if (hours >= 5) return '#FF9800';
  return '#F44336';
}

function getFeelingEmoji(feeling?: WakeFeeling): string {
  if (feeling === 'sleepy') return '😴';
  if (feeling === 'somewhat') return '😐';
  if (feeling === 'refreshed') return '😊';
  return '';
}

export default function SleepHistoryScreen() {
  const router = useRouter();
  const { sleepLogs, deleteSleepLog } = useUser();

  const confirmDelete = useCallback((id: string | undefined, dateLabel: string) => {
    if (!id) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete this sleep log?',
      `This will permanently remove your sleep log for ${dateLabel}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteSleepLog(id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  }, [deleteSleepLog]);
  const [period, setPeriod] = useState<Period>('week');
  const barAnims = useRef<Animated.Value[]>([]);

  const sleepByDate = useMemo(() => {
    const map: Record<string, SleepLog> = {};
    for (const log of sleepLogs) {
      map[log.date] = log;
    }
    return map;
  }, [sleepLogs]);

  const periodConfig = useMemo(() => PERIODS.find(p => p.key === period)!, [period]);

  const chartData: (NightData & { logId?: string })[] = useMemo(() => {
    const days = getDaysArray(periodConfig.days);
    return days.map(d => {
      const log = sleepByDate[d.date];
      const hours = log ? calculateSleepHours(log.bedtime, log.wakeTime) : 0;
      return {
        date: d.date,
        label: getShortLabel(d.date, period),
        hours,
        wakeFeeling: log?.wakeFeeling,
        isToday: d.isToday,
        logId: log?.id,
      };
    });
  }, [sleepByDate, periodConfig.days, period]);

  useEffect(() => {
    barAnims.current = chartData.map(() => new Animated.Value(0));
    const animations = barAnims.current.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: i * 30,
        useNativeDriver: false,
      })
    );
    Animated.stagger(20, animations).start();
  }, [chartData]);

  const stats = useMemo(() => {
    const nights = chartData.filter(d => d.hours > 0);
    if (nights.length === 0) {
      return { avgSleep: 0, bestNight: 0, bestDate: '', streak: 0 };
    }
    const totalHours = nights.reduce((s, n) => s + n.hours, 0);
    const avgSleep = totalHours / nights.length;
    const best = nights.reduce((a, b) => a.hours >= b.hours ? a : b, nights[0]!);

    let streak = 0;
    const reversedData = [...chartData].reverse();
    for (const n of reversedData) {
      if (n.hours >= SLEEP_TARGET) {
        streak++;
      } else if (n.hours > 0) {
        break;
      } else {
        break;
      }
    }

    return {
      avgSleep,
      bestNight: best.hours,
      bestDate: getFormattedDate(best.date),
      streak,
    };
  }, [chartData]);

  const maxHours = useMemo(() => {
    const dataMax = Math.max(...chartData.map(d => d.hours), 0);
    return Math.max(dataMax, 10);
  }, [chartData]);

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = maxHours <= 10 ? 2 : Math.ceil(maxHours / 5);
    for (let i = 0; i <= maxHours; i += step) {
      ticks.push(i);
    }
    if (ticks[ticks.length - 1] !== maxHours) {
      ticks.push(Math.ceil(maxHours));
    }
    return ticks;
  }, [maxHours]);

  const chartAreaWidth = SCREEN_WIDTH - CHART_HORIZONTAL_PADDING * 2;
  const barAreaWidth = chartAreaWidth - Y_AXIS_WIDTH;
  const maxBarsVisible = period === 'week' ? 7 : period === 'month' ? 30 : 90;
  const barWidth = Math.max(barAreaWidth / maxBarsVisible - 2, 4);
  const totalBarAreaWidth = maxBarsVisible * (barWidth + 2);
  const _showScrollableChart = totalBarAreaWidth > barAreaWidth;

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
  }, []);

  const renderChart = () => {
    const referenceY = (SLEEP_TARGET / maxHours) * CHART_HEIGHT;

    return (
      <View style={chartStyles.chartContainer}>
        <View style={chartStyles.yAxis}>
          {yTicks.map(tick => (
            <View
              key={tick}
              style={[
                chartStyles.yTickLabel,
                { bottom: (tick / maxHours) * CHART_HEIGHT - 7 },
              ]}
            >
              <Text style={chartStyles.yTickText}>{tick}h</Text>
            </View>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: 'flex-end',
            height: CHART_HEIGHT + 40,
            paddingRight: 8,
          }}
          style={chartStyles.chartScroll}
        >
          <View style={{ height: CHART_HEIGHT + 40 }}>
            <View style={[chartStyles.referenceLine, { bottom: referenceY + 40 }]}>
              <View style={chartStyles.referenceLineDash} />
              <Text style={chartStyles.referenceLabel}>{SLEEP_TARGET}h</Text>
            </View>

            <View style={chartStyles.barsContainer}>
              {chartData.map((d, i) => {
                const barH = maxHours > 0 ? (d.hours / maxHours) * CHART_HEIGHT : 0;
                const anim = barAnims.current[i];
                const animatedHeight = anim
                  ? anim.interpolate({ inputRange: [0, 1], outputRange: [0, barH] })
                  : barH;
                const color = getBarColor(d.hours);
                const feeling = getFeelingEmoji(d.wakeFeeling);
                const showLabel = period === 'week' || (period === 'month' && i % 5 === 0) || (period === '3months' && i % 15 === 0);

                return (
                  <View
                    key={d.date}
                    style={[chartStyles.barColumn, { width: barWidth + 2 }]}
                    testID={`sleep-bar-${d.date}`}
                  >
                    <View style={{ height: CHART_HEIGHT, justifyContent: 'flex-end' }}>
                      {d.hours > 0 ? (
                        <Animated.View
                          style={[
                            chartStyles.bar,
                            {
                              height: animatedHeight,
                              width: barWidth,
                              backgroundColor: color,
                              opacity: d.isToday ? 1 : 0.8,
                            },
                            d.isToday && chartStyles.barToday,
                          ]}
                        />
                      ) : (
                        <View style={[chartStyles.bar, { height: 2, width: barWidth, backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                      )}
                    </View>
                    {feeling !== '' && (
                      <Text style={chartStyles.feelingIndicator}>{feeling}</Text>
                    )}
                    {showLabel && (
                      <Text style={[chartStyles.barLabel, d.isToday && chartStyles.barLabelToday]}>
                        {d.isToday ? 'Today' : d.label}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sleep History</Text>
          <TouchableOpacity
            onPress={() => router.push('/sleep-logger')}
            style={styles.logBtn}
          >
            <Plus size={16} color="#0D1B2A" />
            <Text style={styles.logBtnText}>Log Sleep</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.periodRow}>
            {PERIODS.map(p => (
              <TouchableOpacity
                key={p.key}
                style={[styles.periodTab, period === p.key && styles.periodTabActive]}
                onPress={() => handlePeriodChange(p.key)}
              >
                <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>😴</Text>
              <Text style={styles.statValue}>{stats.avgSleep.toFixed(1)} hrs</Text>
              <Text style={styles.statLabel}>Avg Sleep</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>🏆</Text>
              <Text style={styles.statValue}>{stats.bestNight.toFixed(1)} hrs</Text>
              <Text style={styles.statLabel}>{stats.bestDate || 'Best Night'}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statValue}>{stats.streak}</Text>
              <Text style={styles.statLabel}>Streak ≥7h</Text>
            </View>
          </View>

          <View style={styles.chartCard}>
            {renderChart()}
          </View>

          {sleepLogs.length > 0 && (
            <View style={styles.logsSection}>
              <Text style={styles.logsSectionTitle}>Recent Nights</Text>
              {[...sleepLogs]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 20)
                .map(log => {
                  const hrs = calculateSleepHours(log.bedtime, log.wakeTime);
                  const color = getBarColor(hrs);
                  const feeling = getFeelingEmoji(log.wakeFeeling);
                  return (
                    <SwipeToDelete
                      key={log.id}
                      onDelete={() => confirmDelete(log.id, getFormattedDate(log.date))}
                      containerStyle={styles.logRowWrap}
                    >
                      <View style={styles.logRow}>
                        <View style={[styles.logDot, { backgroundColor: color }]} />
                        <View style={styles.logInfo}>
                          <Text style={styles.logDate}>{getFormattedDate(log.date)}</Text>
                          <Text style={styles.logTime}>{log.bedtime} → {log.wakeTime}</Text>
                        </View>
                        {feeling !== '' && <Text style={styles.logFeeling}>{feeling}</Text>}
                        <Text style={[styles.logHours, { color }]}>{hrs.toFixed(1)}h</Text>
                      </View>
                    </SwipeToDelete>
                  );
                })}
            </View>
          )}

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>≥7h</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>5-7h</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
              <Text style={styles.legendText}>&lt;5h</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  chartContainer: {
    flexDirection: 'row',
    height: CHART_HEIGHT + 50,
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    height: CHART_HEIGHT,
    position: 'relative',
    marginTop: 0,
  },
  yTickLabel: {
    position: 'absolute',
    left: 0,
    width: Y_AXIS_WIDTH - 4,
    alignItems: 'flex-end',
  },
  yTickText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500' as const,
  },
  chartScroll: {
    flex: 1,
  },
  referenceLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  referenceLineDash: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  referenceLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    marginLeft: 4,
    fontWeight: '600' as const,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT + 40,
    paddingTop: 0,
  },
  barColumn: {
    alignItems: 'center',
  },
  bar: {
    borderRadius: 3,
  },
  barToday: {
    shadowColor: '#81B4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  feelingIndicator: {
    fontSize: 10,
    marginTop: 2,
    height: 14,
  },
  barLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
    fontWeight: '500' as const,
  },
  barLabelToday: {
    color: '#81B4FF',
    fontWeight: '700' as const,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1, fontSize: 18, fontWeight: '700' as const, color: Colors.white,
    textAlign: 'center', marginHorizontal: 8,
  },
  logBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#81B4FF',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, gap: 4,
  },
  logBtnText: { fontSize: 13, fontWeight: '700' as const, color: '#0D1B2A' },
  scroll: { padding: 20, paddingBottom: 40 },
  periodRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 3, marginBottom: 20,
  },
  periodTab: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: 'rgba(129,180,255,0.15)',
  },
  periodText: {
    fontSize: 13, fontWeight: '600' as const, color: 'rgba(255,255,255,0.4)',
  },
  periodTextActive: {
    color: '#81B4FF',
  },
  statsRow: {
    flexDirection: 'row', gap: 10, marginBottom: 20,
  },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statEmoji: { fontSize: 20, marginBottom: 6 },
  statValue: { fontSize: 17, fontWeight: '800' as const, color: Colors.white, marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#6B88B0', fontWeight: '500' as const },
  chartCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  legendRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 20,
  },
  legendItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  legendDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  legendText: {
    fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500' as const,
  },
  logsSection: { marginTop: 20 },
  logsSectionTitle: {
    fontSize: 14, fontWeight: '700' as const, color: Colors.white,
    marginBottom: 12, letterSpacing: -0.2,
  },
  logRowWrap: { marginBottom: 8 },
  logRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  logDot: { width: 10, height: 10, borderRadius: 5 },
  logInfo: { flex: 1 },
  logDate: { fontSize: 14, fontWeight: '600' as const, color: Colors.white },
  logTime: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  logFeeling: { fontSize: 16 },
  logHours: { fontSize: 15, fontWeight: '700' as const },
});
