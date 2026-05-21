import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, ChevronRight, Lock, Trophy, Target,
  TrendingUp, Flame, Apple, Activity, Moon, Brain, Users, Ban, Scale,
  Leaf,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useUser } from '@/context/UserContext';
import { calculateSleepHours } from '@/constants/data';
import { calculateStepCalories } from '@/utils/calories';
import { calculateNutrientTargets, calculateAge } from '@/utils/nutrientTargets';
import { useTranslation } from 'react-i18next';
import type { HealthGoal, WakeFeeling } from '@/types';

function getWeekBounds(weeksAgo: number) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const mon = new Date(now);
  mon.setDate(now.getDate() + mondayOffset - weeksAgo * 7);
  mon.setHours(0, 0, 0, 0);

  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);

  return {
    start: mon.toISOString().split('T')[0] ?? '',
    end: sun.toISOString().split('T')[0] ?? '',
    startDate: mon,
    endDate: sun,
  };
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function feelingToScore(f?: WakeFeeling): number {
  if (f === 'refreshed') return 3;
  if (f === 'somewhat') return 2;
  if (f === 'sleepy') return 1;
  return 0;
}

function feelingLabel(score: number, t: (k: string) => string): string {
  if (score >= 2.5) return t('sleep.refreshed');
  if (score >= 1.5) return t('sleep.somewhat');
  if (score > 0) return t('sleep.sleepy');
  return '—';
}

function moodToEmoji(score: number): string {
  const rounded = Math.max(1, Math.min(5, Math.round(score)));
  return ['😔', '😕', '😐', '🙂', '😄'][rounded - 1] ?? '😐';
}

interface JourneyData {
  title: string;
  original: string;
  current: string;
  goal: string;
  trend: 'up' | 'down' | 'flat';
  preferLower: boolean;
  originalNum: number;
  currentNum: number;
}

export default function WeeklyReportScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    profile, mealLogs, activityLogs, sleepLogs, journalLogs,
    healthMarkers, nutrientTargets, clinicalMeasurements, heartAgeResult,
    medicalHistory,
  } = useUser();

  const [weekOffset, setWeekOffset] = useState<number>(0);
  const week = useMemo(() => getWeekBounds(weekOffset), [weekOffset]);

  const inRange = useCallback((date: string) => date >= week.start && date <= week.end, [week.start, week.end]);

  const weekMeals = useMemo(() => mealLogs.filter(m => inRange(m.date)), [mealLogs, inRange]);
  const weekActivities = useMemo(() => activityLogs.filter(a => inRange(a.date)), [activityLogs, inRange]);
  const weekSleeps = useMemo(() => sleepLogs.filter(s => inRange(s.date)), [sleepLogs, inRange]);
  const weekJournals = useMemo(() => journalLogs.filter(j => inRange(j.date)), [journalLogs, inRange]);

  const targets = useMemo(() => {
    if (nutrientTargets) return nutrientTargets;
    if (profile) return calculateNutrientTargets(profile, medicalHistory);
    return { calories: 2000, carbsG: 250, proteinG: 80, fiberG: 28, addedSugarG: 25, saturatedFatG: 22, transFatG: 0 };
  }, [nutrientTargets, profile, medicalHistory]);

  const energyBalance = useMemo(() => {
    const totalIn = weekMeals.reduce((s, m) => s + (m.nutrition?.calories ?? 0), 0);
    const weight = profile?.weightKg ?? 60;
    const activityCals = weekActivities.reduce((s, a) => s + a.caloriesBurned, 0);

    const daysSpanned = 7;
    const estimatedDailySteps = 5000;
    const weeklyStepCals = calculateStepCalories(estimatedDailySteps, weight) * daysSpanned;
    const totalOut = weeklyStepCals + activityCals;

    const daysWithMeals = new Set(weekMeals.map(m => m.date)).size || 1;
    const avgIn = Math.round(totalIn / daysWithMeals);
    const avgOut = Math.round(totalOut / daysSpanned);
    const net = avgIn - avgOut;
    return { avgIn, avgOut, net };
  }, [weekMeals, weekActivities, profile?.weightKg]);

  const nutritionAvg = useMemo(() => {
    const daysLogged = new Set(weekMeals.map(m => m.date)).size || 1;
    const sum = weekMeals.reduce((acc, m) => {
      acc.carbs += m.nutrition?.totalCarbsG ?? 0;
      acc.protein += m.nutrition?.proteinG ?? 0;
      acc.fiber += m.nutrition?.dietaryFiberG ?? 0;
      acc.addedSugar += m.nutrition?.addedSugarG ?? 0;
      acc.satFat += m.nutrition?.saturatedFatG ?? 0;
      return acc;
    }, { carbs: 0, protein: 0, fiber: 0, addedSugar: 0, satFat: 0 });

    const plantCategoriesPerDay = new Map<string, Set<string>>();
    for (const m of weekMeals) {
      const set = plantCategoriesPerDay.get(m.date) ?? new Set<string>();
      m.categories.forEach(c => {
        if (!['processed_foods', 'animal_products'].includes(c)) set.add(c);
      });
      plantCategoriesPerDay.set(m.date, set);
    }
    const plantDayValues = Array.from(plantCategoriesPerDay.values()).map(s => s.size);
    const plantsPerDay = plantDayValues.length > 0
      ? plantDayValues.reduce((a, b) => a + b, 0) / plantDayValues.length
      : 0;

    return {
      carbs: Math.round(sum.carbs / daysLogged),
      protein: Math.round(sum.protein / daysLogged),
      fiber: Math.round(sum.fiber / daysLogged),
      addedSugar: Math.round(sum.addedSugar / daysLogged),
      satFat: Math.round((sum.satFat / daysLogged) * 10) / 10,
      plantsPerDay: Math.round(plantsPerDay * 10) / 10,
      hasData: weekMeals.length > 0,
    };
  }, [weekMeals]);

  const pillarData = useMemo(() => {
    const mealsCount = weekMeals.length;
    const plantsAvg = (() => {
      if (mealsCount === 0) return 0;
      const perMeal = weekMeals.map(m => m.categories.filter(c => !['processed_foods', 'animal_products'].includes(c)).length);
      return Math.round((perMeal.reduce((a, b) => a + b, 0) / mealsCount) * 10) / 10;
    })();

    const actSessions = weekActivities.length;
    const actKcal = weekActivities.reduce((s, a) => s + a.caloriesBurned, 0);

    const nights = weekSleeps.length;
    const avgHours = nights > 0
      ? Math.round((weekSleeps.reduce((s, x) => s + calculateSleepHours(x.bedtime, x.wakeTime), 0) / nights) * 10) / 10
      : 0;
    const feelingScores = weekSleeps.map(s => feelingToScore(s.wakeFeeling)).filter(x => x > 0);
    const avgFeelingScore = feelingScores.length > 0
      ? feelingScores.reduce((a, b) => a + b, 0) / feelingScores.length
      : 0;

    const journalsCount = weekJournals.length;
    const moodScores = weekJournals.map(j => j.mood).filter((m): m is 1 | 2 | 3 | 4 | 5 => !!m);
    const avgMood = moodScores.length > 0
      ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length
      : 0;

    return {
      nutrition: { meals: mealsCount, plantsAvg, level: mealsCount >= 10 ? 'good' : mealsCount >= 4 ? 'mid' : 'low' },
      activity: { sessions: actSessions, kcal: actKcal, level: actSessions >= 3 ? 'good' : actSessions >= 1 ? 'mid' : 'low' },
      sleep: { nights, avgHours, avgFeelingScore, level: nights >= 5 ? 'good' : nights >= 2 ? 'mid' : 'low' },
      stress: { journals: journalsCount, avgMood, level: journalsCount >= 3 ? 'good' : journalsCount >= 1 ? 'mid' : 'low' },
    };
  }, [weekMeals, weekActivities, weekSleeps, weekJournals]);

  const overall = useMemo(() => {
    const pillarLevels = [
      pillarData.nutrition.level,
      pillarData.activity.level,
      pillarData.sleep.level,
      pillarData.stress.level,
    ];
    const score = pillarLevels.reduce((s, l) => s + (l === 'good' ? 100 : l === 'mid' ? 60 : 20), 0) / pillarLevels.length;
    const active = pillarLevels.filter(l => l !== 'low').length;
    return { pct: Math.round(score), active };
  }, [pillarData]);

  const motivation = useMemo(() => {
    if (overall.pct >= 85) return 'You crushed it this week 🏆';
    if (overall.pct >= 65) return "You're doing great. Keep stacking wins 🔥";
    if (overall.pct >= 40) return 'Solid start — small daily actions add up 💪';
    return 'Log a meal or a walk — your first win is close 🌱';
  }, [overall.pct]);

  const journeyData = useMemo((): JourneyData | null => {
    if (!profile) return null;
    const goal: HealthGoal | undefined = profile.healthGoal;

    const markersFor = (name: string) => healthMarkers
      .filter(m => m.markerName.toLowerCase().includes(name.toLowerCase()))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (goal === 'lose_weight') {
      const weights = markersFor('weight');
      const original = weights[0]?.value ?? profile.weightKg;
      const current = weights[weights.length - 1]?.value ?? profile.weightKg;
      const goalW = Math.max(45, Math.round(original * 0.92));
      const change = current - original;
      return {
        title: t('weeklyReport.journey.loseWeight'),
        original: `${original.toFixed(1)} kg`,
        current: `${current.toFixed(1)} kg`,
        goal: `${goalW} kg`,
        trend: change < -0.1 ? 'down' : change > 0.1 ? 'up' : 'flat',
        preferLower: true,
        originalNum: original,
        currentNum: current,
      };
    }
    if (goal === 'lower_cholesterol') {
      const ldls = markersFor('ldl');
      const baseLdl = parseFloat(clinicalMeasurements?.ldl ?? '') || 0;
      const original = ldls[0]?.value ?? baseLdl;
      const current = ldls[ldls.length - 1]?.value ?? baseLdl;
      return {
        title: t('weeklyReport.journey.lowerCholesterol'),
        original: original > 0 ? `${Math.round(original)} mg/dL` : '—',
        current: current > 0 ? `${Math.round(current)} mg/dL` : '—',
        goal: '<100 mg/dL',
        trend: current < original ? 'down' : current > original ? 'up' : 'flat',
        preferLower: true,
        originalNum: original,
        currentNum: current,
      };
    }
    if (goal === 'manage_diabetes') {
      const gs = markersFor('glucose');
      const base = parseFloat(clinicalMeasurements?.fastingGlucose ?? '') || 0;
      const original = gs[0]?.value ?? base;
      const current = gs[gs.length - 1]?.value ?? base;
      return {
        title: t('weeklyReport.journey.manageDiabetes'),
        original: original > 0 ? `${Math.round(original)} mg/dL` : '—',
        current: current > 0 ? `${Math.round(current)} mg/dL` : '—',
        goal: '<100 mg/dL',
        trend: current < original ? 'down' : current > original ? 'up' : 'flat',
        preferLower: true,
        originalNum: original,
        currentNum: current,
      };
    }
    if (goal === 'heart_health') {
      const ha = heartAgeResult?.heartAge ?? 0;
      const chrono = profile.dob ? calculateAge(profile.dob) : 0;
      return {
        title: t('weeklyReport.journey.heartHealth'),
        original: ha > 0 ? `${ha} yrs` : '—',
        current: ha > 0 ? `${ha} yrs` : '—',
        goal: `${chrono} yrs`,
        trend: 'flat',
        preferLower: true,
        originalNum: ha,
        currentNum: ha,
      };
    }
    if (goal === 'sleep_better') {
      const allSleep = sleepLogs.slice().sort((a, b) => a.timestamp - b.timestamp);
      const first7 = allSleep.slice(0, 7);
      const baselineAvg = first7.length > 0
        ? first7.reduce((s, x) => s + calculateSleepHours(x.bedtime, x.wakeTime), 0) / first7.length
        : 0;
      const thisAvg = pillarData.sleep.avgHours;
      return {
        title: t('weeklyReport.journey.sleepBetter'),
        original: baselineAvg > 0 ? `${baselineAvg.toFixed(1)} hrs` : '—',
        current: thisAvg > 0 ? `${thisAvg.toFixed(1)} hrs` : '—',
        goal: '7 hrs',
        trend: thisAvg > baselineAvg ? 'up' : thisAvg < baselineAvg ? 'down' : 'flat',
        preferLower: false,
        originalNum: baselineAvg,
        currentNum: thisAvg,
      };
    }
    if (goal === 'energy_focus') {
      const allSleep = sleepLogs.slice().sort((a, b) => a.timestamp - b.timestamp);
      const first7 = allSleep.slice(0, 7);
      const baseScore = first7.length > 0
        ? first7.map(s => feelingToScore(s.wakeFeeling)).filter(x => x > 0).reduce((a, b) => a + b, 0) / Math.max(1, first7.filter(s => feelingToScore(s.wakeFeeling) > 0).length)
        : 0;
      const curScore = pillarData.sleep.avgFeelingScore;
      return {
        title: t('weeklyReport.journey.energyFocus'),
        original: feelingLabel(baseScore, t),
        current: feelingLabel(curScore, t),
        goal: t('sleep.refreshed'),
        trend: curScore > baseScore ? 'up' : curScore < baseScore ? 'down' : 'flat',
        preferLower: false,
        originalNum: baseScore,
        currentNum: curScore,
      };
    }
    return null;
  }, [profile, healthMarkers, clinicalMeasurements, heartAgeResult, sleepLogs, pillarData.sleep.avgHours, pillarData.sleep.avgFeelingScore, t]);

  const winAndFocus = useMemo(() => {
    let win = '';
    if (pillarData.sleep.nights >= 7) {
      win = t('weeklyReport.wins.winSleepAll');
    } else {
      const stepDay = healthMarkers
        .filter(m => m.markerName.toLowerCase().includes('step'))
        .sort((a, b) => b.value - a.value)[0];
      if (stepDay && stepDay.value > 5000) {
        win = t('weeklyReport.wins.winSteps', { steps: Math.round(stepDay.value).toLocaleString(), day: formatDateShort(stepDay.date) });
      } else {
        const plantMeals = weekMeals.filter(m => m.categories.filter(c => !['processed_foods', 'animal_products'].includes(c)).length >= 3).length;
        if (plantMeals >= 3) {
          win = t('weeklyReport.wins.winPlants', { count: plantMeals });
        } else if (weekMeals.length >= 7) {
          win = t('weeklyReport.wins.winMealsLogged', { count: weekMeals.length });
        } else if (weekActivities.length >= 3) {
          win = t('weeklyReport.wins.winActivities', { count: weekActivities.length });
        } else if (weekJournals.length >= 3) {
          win = t('weeklyReport.wins.winJournalStreak', { count: weekJournals.length });
        } else {
          win = t('weeklyReport.wins.noWinYet');
        }
      }
    }

    let focus = t('weeklyReport.wins.focusSteady');
    const weakest = [
      { key: 'meals', count: weekMeals.length, need: 4 },
      { key: 'sleep', count: weekSleeps.length, need: 4 },
      { key: 'activity', count: weekActivities.length, need: 1 },
      { key: 'journal', count: weekJournals.length, need: 2 },
    ].sort((a, b) => (a.count / a.need) - (b.count / b.need))[0];

    if (weakest) {
      if (weakest.key === 'meals' && weakest.count < weakest.need) focus = t('weeklyReport.wins.focusLogMore');
      else if (weakest.key === 'sleep' && weakest.count < weakest.need) focus = t('weeklyReport.wins.focusSleep');
      else if (weakest.key === 'activity' && weakest.count < weakest.need) focus = t('weeklyReport.wins.focusActivity');
      else if (weakest.key === 'journal' && weakest.count < weakest.need) focus = t('weeklyReport.wins.focusJournal');
      else if (nutritionAvg.hasData && nutritionAvg.fiber < targets.fiberG * 0.7) focus = t('weeklyReport.wins.focusFiber', { target: targets.fiberG });
      else if (nutritionAvg.hasData && nutritionAvg.addedSugar > targets.addedSugarG) focus = t('weeklyReport.wins.focusSugar', { target: targets.addedSugarG });
      else if (nutritionAvg.hasData && nutritionAvg.satFat > targets.saturatedFatG) focus = t('weeklyReport.wins.focusSatFat', { target: targets.saturatedFatG });
      else if (nutritionAvg.hasData && nutritionAvg.plantsPerDay < 5) focus = t('weeklyReport.wins.focusPlants');
    }

    return { win, focus };
  }, [pillarData, healthMarkers, weekMeals, weekActivities, weekJournals, weekSleeps, nutritionAvg, targets, t]);

  const netBalanceState = useMemo(() => {
    if (!energyBalance.avgIn) return 'none';
    if (energyBalance.net < -100) return 'deficit';
    if (energyBalance.net > 100) return 'surplus';
    return 'balanced';
  }, [energyBalance]);

  const trendDir = (jd: JourneyData): 'good' | 'bad' | 'flat' => {
    if (jd.trend === 'flat') return 'flat';
    const improving = jd.preferLower ? jd.currentNum < jd.originalNum : jd.currentNum > jd.originalNum;
    return improving ? 'good' : 'bad';
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="wr-back">
            <ChevronLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.pageTitle}>{t('weeklyReport.weeklyTitle')}</Text>
          <Text style={styles.pageSub}>
            {formatDateShort(week.start)} — {formatDateShort(week.end)}
          </Text>

          {/* Week nav pill */}
          <View style={styles.weekNav}>
            <TouchableOpacity onPress={() => setWeekOffset(o => o + 1)} style={styles.navBtn} testID="wr-prev">
              <ChevronLeft size={18} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.weekNavLabel}>
              {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Last Week' : `${weekOffset} weeks ago`}
            </Text>
            <TouchableOpacity
              onPress={() => setWeekOffset(o => Math.max(0, o - 1))}
              style={[styles.navBtn, weekOffset === 0 && styles.navBtnDisabled]}
              disabled={weekOffset === 0}
              testID="wr-next"
            >
              <ChevronRight size={18} color={weekOffset === 0 ? Colors.textTertiary : Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Hero progress card */}
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>This Week's Score</Text>
            <View style={styles.heroRow}>
              <Text style={styles.heroBig}>{overall.active}/4</Text>
              <Text style={styles.heroPct}>{overall.pct}%</Text>
            </View>
            <View style={styles.heroBarBg}>
              <View style={[styles.heroBarFill, { width: `${overall.pct}%` as any }]} />
            </View>
            <Text style={styles.heroMsg}>{motivation}</Text>
          </View>

          {/* Journey card */}
          {journeyData && (() => {
            const dir = trendDir(journeyData);
            const dirColor = dir === 'good' ? Colors.nutrition : dir === 'bad' ? Colors.physicalActivity : Colors.textSecondary;
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconTile, { backgroundColor: Colors.sleep }]}>
                    <Target size={20} color={Colors.white} strokeWidth={2.5} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{journeyData.title}</Text>
                    <Text style={styles.cardSub}>Your Journey</Text>
                  </View>
                </View>
                <View style={styles.journeyRow}>
                  <View style={styles.journeyCol}>
                    <Text style={styles.journeyLabel}>{t('weeklyReport.journey.original')}</Text>
                    <Text style={styles.journeyValue}>{journeyData.original}</Text>
                  </View>
                  <View style={styles.journeyArrowWrap}>
                    <View style={[styles.journeyBar, { backgroundColor: dirColor }]} />
                  </View>
                  <View style={styles.journeyCol}>
                    <Text style={styles.journeyLabel}>{t('weeklyReport.journey.current')}</Text>
                    <Text style={[styles.journeyValue, { color: dirColor }]}>
                      {journeyData.current}
                    </Text>
                  </View>
                  <View style={styles.journeyCol}>
                    <Text style={styles.journeyLabel}>{t('weeklyReport.journey.goal')}</Text>
                    <Text style={styles.journeyValue}>{journeyData.goal}</Text>
                  </View>
                </View>
                <View style={[styles.trendFooter, { backgroundColor: dirColor + '12' }]}>
                  <TrendingUp size={14} color={dirColor} />
                  <Text style={[styles.trendFooterText, { color: dirColor }]}>
                    {dir === 'good' ? (journeyData.preferLower ? t('weeklyReport.journey.trendDown') : t('weeklyReport.journey.trendUp')) :
                     dir === 'bad' ? (journeyData.preferLower ? t('weeklyReport.journey.trendUp') : t('weeklyReport.journey.trendDown')) :
                     t('weeklyReport.journey.trendFlat')}
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* Energy Balance */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconTile, { backgroundColor: Colors.mood }]}>
                <Scale size={20} color={Colors.white} strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('weeklyReport.energy.title')}</Text>
                <Text style={styles.cardSub}>Calories in vs out</Text>
              </View>
            </View>
            {weekMeals.length === 0 ? (
              <Text style={styles.emptyText}>{t('weeklyReport.energy.noData')}</Text>
            ) : (
              <>
                <View style={styles.energyRow}>
                  <View style={styles.energyItem}>
                    <Text style={styles.energyLabel}>{t('weeklyReport.energy.in')}</Text>
                    <Text style={styles.energyValue}>{energyBalance.avgIn.toLocaleString()}</Text>
                    <Text style={styles.energyUnit}>kcal</Text>
                  </View>
                  <View style={styles.energyDivider} />
                  <View style={styles.energyItem}>
                    <Text style={styles.energyLabel}>{t('weeklyReport.energy.out')}</Text>
                    <Text style={styles.energyValue}>{energyBalance.avgOut.toLocaleString()}</Text>
                    <Text style={styles.energyUnit}>kcal</Text>
                  </View>
                  <View style={styles.energyDivider} />
                  <View style={styles.energyItem}>
                    <Text style={styles.energyLabel}>{t('weeklyReport.energy.net')}</Text>
                    <Text style={[styles.energyValue, { color: energyBalance.net >= 0 ? Colors.mood : Colors.nutrition }]}>
                      {energyBalance.net >= 0 ? '+' : ''}{energyBalance.net.toLocaleString()}
                    </Text>
                    <Text style={styles.energyUnit}>kcal</Text>
                  </View>
                </View>
                <View style={[
                  styles.bannerFooter,
                  {
                    backgroundColor:
                      netBalanceState === 'deficit' ? Colors.nutrition + '15' :
                      netBalanceState === 'surplus' ? Colors.mood + '15' : Colors.sleep + '15',
                  },
                ]}>
                  <Text style={[
                    styles.bannerFooterText,
                    {
                      color:
                        netBalanceState === 'deficit' ? Colors.nutrition :
                        netBalanceState === 'surplus' ? Colors.mood : Colors.sleep,
                    },
                  ]}>
                    {netBalanceState === 'deficit' ? t('weeklyReport.energy.deficit') :
                     netBalanceState === 'surplus' ? t('weeklyReport.energy.surplus') :
                     t('weeklyReport.energy.balanced')}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Nutrition Snapshot */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconTile, { backgroundColor: Colors.nutrition }]}>
                <Leaf size={20} color={Colors.white} strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('weeklyReport.nutrition.title')}</Text>
                <Text style={styles.cardSub}>{nutritionAvg.hasData ? `${weekMeals.length} meals logged` : '—'}</Text>
              </View>
            </View>
            {!nutritionAvg.hasData ? (
              <Text style={styles.emptyText}>{t('weeklyReport.nutrition.noMeals')}</Text>
            ) : (
              <>
                <Text style={styles.subhead}>{t('weeklyReport.nutrition.goalsToReach')}</Text>
                <NutrientBar label={t('weeklyReport.nutrition.carbs')} value={nutritionAvg.carbs} target={targets.carbsG} unit="g" color={Colors.mood} />
                <NutrientBar label={t('weeklyReport.nutrition.protein')} value={nutritionAvg.protein} target={targets.proteinG} unit="g" color={Colors.physicalActivity} />
                <NutrientBar label={t('weeklyReport.nutrition.fiber')} value={nutritionAvg.fiber} target={targets.fiberG} unit="g" color={Colors.nutrition} />

                <Text style={[styles.subhead, { marginTop: 14 }]}>{t('weeklyReport.nutrition.limitsToStay')}</Text>
                <NutrientBar label={t('weeklyReport.nutrition.addedSugar')} value={nutritionAvg.addedSugar} target={targets.addedSugarG} unit="g" color={Colors.stressManagement} isLimit />
                <NutrientBar label={t('weeklyReport.nutrition.satFat')} value={nutritionAvg.satFat} target={targets.saturatedFatG} unit="g" color={Colors.physicalActivity} isLimit />

                <View style={styles.plantRow}>
                  <View style={[styles.plantIconTile, { backgroundColor: Colors.nutrition }]}>
                    <Leaf size={14} color={Colors.white} />
                  </View>
                  <Text style={styles.plantLabel}>{t('weeklyReport.nutrition.plantDiversity')}</Text>
                  <Text style={[styles.plantValue, { color: nutritionAvg.plantsPerDay >= 5 ? Colors.nutrition : Colors.mood }]}>
                    {t('weeklyReport.nutrition.plantsPerDay', { avg: nutritionAvg.plantsPerDay })}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Six Pillars */}
          <Text style={styles.sectionLabel}>{t('weeklyReport.pillars.title')}</Text>

          <PillarCard
            icon={<Apple size={20} color={Colors.white} strokeWidth={2.5} />}
            color={Colors.nutrition}
            name={t('weeklyReport.pillars.nutrition')}
            line={t('weeklyReport.pillars.nutritionLine', { meals: pillarData.nutrition.meals, plants: pillarData.nutrition.plantsAvg })}
            level={pillarData.nutrition.level}
            active={pillarData.nutrition.meals > 0}
          />
          <PillarCard
            icon={<Activity size={20} color={Colors.white} strokeWidth={2.5} />}
            color={Colors.physicalActivity}
            name={t('weeklyReport.pillars.activity')}
            line={t('weeklyReport.pillars.activityLine', { sessions: pillarData.activity.sessions, kcal: Math.round(pillarData.activity.kcal) })}
            level={pillarData.activity.level}
            active={pillarData.activity.sessions > 0}
          />
          <PillarCard
            icon={<Moon size={20} color={Colors.white} strokeWidth={2.5} />}
            color={Colors.sleep}
            name={t('weeklyReport.pillars.sleep')}
            line={t('weeklyReport.pillars.sleepLine', {
              nights: pillarData.sleep.nights,
              hours: pillarData.sleep.avgHours.toFixed(1),
              feel: feelingLabel(pillarData.sleep.avgFeelingScore, t),
            })}
            level={pillarData.sleep.level}
            active={pillarData.sleep.nights > 0}
          />
          <PillarCard
            icon={<Brain size={20} color={Colors.white} strokeWidth={2.5} />}
            color={Colors.stressManagement}
            name={t('weeklyReport.pillars.stress')}
            line={t('weeklyReport.pillars.stressLine', {
              entries: pillarData.stress.journals,
              emoji: pillarData.stress.avgMood > 0 ? moodToEmoji(pillarData.stress.avgMood) : '—',
            })}
            level={pillarData.stress.level}
            active={pillarData.stress.journals > 0}
          />
          <PillarCard
            icon={<Users size={20} color={Colors.white} strokeWidth={2.5} />}
            color={Colors.socialConnection}
            name={t('weeklyReport.pillars.social')}
            line={t('weeklyReport.pillars.comingSoon')}
            level="low"
            active={false}
            locked
          />
          <PillarCard
            icon={<Ban size={20} color={Colors.white} strokeWidth={2.5} />}
            color={Colors.riskySubstances}
            name={t('weeklyReport.pillars.substances')}
            line={t('weeklyReport.pillars.comingSoon')}
            level="low"
            active={false}
            locked
          />

          {/* Wins & Focus */}
          <Text style={styles.sectionLabel}>Highlights</Text>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconTile, { backgroundColor: Colors.mood }]}>
                <Trophy size={20} color={Colors.white} strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('weeklyReport.wins.thisWeeksWin')}</Text>
                <Text style={styles.cardSub}>{winAndFocus.win}</Text>
              </View>
            </View>
          </View>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconTile, { backgroundColor: Colors.sleep }]}>
                <Target size={20} color={Colors.white} strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('weeklyReport.wins.nextWeeksFocus')}</Text>
                <Text style={styles.cardSub}>{winAndFocus.focus}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

interface NutrientBarProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
  isLimit?: boolean;
}

function NutrientBar({ label, value, target, unit, color, isLimit }: NutrientBarProps) {
  const pct = Math.min(100, Math.round((value / Math.max(1, target)) * 100));
  const met = isLimit ? value <= target : value >= target * 0.8;
  return (
    <View style={styles.nutrientRow}>
      <View style={styles.nutrientHeader}>
        <Text style={styles.nutrientLabel}>{label}</Text>
        <Text style={styles.nutrientValue}>
          <Text style={{ color: met ? color : Colors.textSecondary, fontWeight: '800' as const }}>{value}</Text>
          <Text style={styles.nutrientTarget}> / {target}{unit}</Text>
        </Text>
      </View>
      <View style={styles.nutrientBarBg}>
        <View style={[styles.nutrientBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

interface PillarCardProps {
  icon: React.ReactNode;
  color: string;
  name: string;
  line: string;
  level: string;
  active: boolean;
  locked?: boolean;
}

function PillarCard({ icon, color, name, line, level, active, locked }: PillarCardProps) {
  const levelColor = level === 'good' ? Colors.nutrition : level === 'mid' ? Colors.mood : Colors.physicalActivity;
  const levelLabel = level === 'good' ? 'Strong' : level === 'mid' ? 'OK' : 'Low';
  const pct = level === 'good' ? 100 : level === 'mid' ? 60 : 20;

  return (
    <View style={[styles.card, locked && { opacity: 0.55 }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconTile, { backgroundColor: color }]}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.pillarTitleRow}>
            <Text style={styles.cardTitle}>{name}</Text>
            {locked && <Lock size={13} color={Colors.textTertiary} />}
          </View>
          <Text style={styles.cardSub} numberOfLines={2}>{line}</Text>
        </View>
        {active && !locked && (
          <View style={[styles.levelPill, { backgroundColor: levelColor + '18' }]}>
            <Text style={[styles.levelPillText, { color: levelColor }]}>{levelLabel}</Text>
          </View>
        )}
      </View>
      {active && !locked && (
        <View style={styles.pillarBarBg}>
          <View style={[styles.pillarBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },

  topRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.cardBorder,
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 4 },

  pageTitle: { fontSize: 32, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.8 },
  pageSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 16 },

  weekNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.card, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: 18,
  },
  navBtn: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.inputBg,
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.35 },
  weekNavLabel: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },

  heroCard: {
    backgroundColor: Colors.primary, borderRadius: 22, padding: 20, marginBottom: 18,
    shadowColor: Colors.primary, shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 4, overflow: 'hidden',
  },
  heroLabel: { color: Colors.white, fontSize: 13, fontWeight: '600' as const, opacity: 0.9 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 },
  heroBig: { color: Colors.white, fontSize: 38, fontWeight: '800' as const, letterSpacing: -1 },
  heroPct: { color: Colors.white, fontSize: 40, fontWeight: '800' as const, opacity: 0.28, letterSpacing: -1 },
  heroBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 4, overflow: 'hidden', marginTop: 10 },
  heroBarFill: { height: 8, backgroundColor: Colors.white, borderRadius: 4 },
  heroMsg: { color: Colors.white, fontSize: 13, fontWeight: '600' as const, marginTop: 12, opacity: 0.95 },

  sectionLabel: {
    fontSize: 13, fontWeight: '700' as const, color: Colors.textSecondary,
    textTransform: 'uppercase' as const, letterSpacing: 0.6,
    marginTop: 8, marginBottom: 10, marginLeft: 4,
  },

  card: {
    backgroundColor: Colors.card, borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.cardBorder,
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconTile: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  cardTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.2 },
  cardSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  // Journey
  journeyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  journeyCol: { flex: 1, alignItems: 'center' },
  journeyArrowWrap: { width: 24, height: 3, justifyContent: 'center' },
  journeyBar: { height: 3, borderRadius: 2, width: '100%' },
  journeyLabel: {
    fontSize: 10, color: Colors.textTertiary, marginBottom: 4,
    fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.4,
  },
  journeyValue: { fontSize: 16, fontWeight: '800' as const, color: Colors.text },
  trendFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 14, alignSelf: 'flex-start',
  },
  trendFooterText: { fontSize: 12, fontWeight: '700' as const },

  // Energy
  energyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 0, marginTop: 16,
  },
  energyItem: { flex: 1, alignItems: 'center' },
  energyDivider: { width: 1, height: 38, backgroundColor: Colors.divider },
  energyLabel: {
    fontSize: 10, color: Colors.textTertiary, fontWeight: '700' as const,
    textTransform: 'uppercase' as const, letterSpacing: 0.4, marginBottom: 6,
    textAlign: 'center' as const, paddingHorizontal: 4,
  },
  energyValue: { fontSize: 20, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.4 },
  energyUnit: { fontSize: 10, color: Colors.textTertiary, marginTop: 2, fontWeight: '600' as const },
  bannerFooter: {
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginTop: 14,
  },
  bannerFooterText: { fontSize: 12, fontWeight: '700' as const },

  emptyText: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' as const, paddingVertical: 8, marginTop: 8 },

  // Nutrition
  subhead: {
    fontSize: 11, color: Colors.textSecondary, fontWeight: '700' as const,
    textTransform: 'uppercase' as const, letterSpacing: 0.5,
    marginTop: 14, marginBottom: 10,
  },
  nutrientRow: { marginBottom: 10 },
  nutrientHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
  },
  nutrientLabel: { fontSize: 13, fontWeight: '600' as const, color: Colors.text },
  nutrientValue: { fontSize: 13 },
  nutrientTarget: { color: Colors.textTertiary, fontWeight: '500' as const },
  nutrientBarBg: {
    height: 6, backgroundColor: Colors.inputBg, borderRadius: 3, overflow: 'hidden',
  },
  nutrientBarFill: { height: 6, borderRadius: 3 },

  plantRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.nutritionLight, padding: 12, borderRadius: 12, marginTop: 12,
  },
  plantIconTile: {
    width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.white,
  },
  plantLabel: { flex: 1, fontSize: 13, fontWeight: '600' as const, color: Colors.text },
  plantValue: { fontSize: 13, fontWeight: '800' as const },

  // Pillar
  pillarTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  levelPillText: { fontSize: 11, fontWeight: '800' as const, letterSpacing: -0.1 },
  pillarBarBg: {
    height: 5, backgroundColor: Colors.inputBg, borderRadius: 3, overflow: 'hidden', marginTop: 14,
  },
  pillarBarFill: { height: 5, borderRadius: 3 },
});

// keep some imports referenced for tree-shake clarity
void Flame;
