import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react-native';
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

function trendColor(change: number, preferLower: boolean): string {
  const improving = preferLower ? change < 0 : change > 0;
  const worsening = preferLower ? change > 0 : change < 0;
  if (Math.abs(change) < 0.01) return Colors.physicalActivity;
  if (improving) return Colors.nutrition;
  if (worsening) return Colors.riskySubstances;
  return Colors.physicalActivity;
}

function moodToEmoji(score: number): string {
  const rounded = Math.max(1, Math.min(5, Math.round(score)));
  return ['😔', '😕', '😐', '🙂', '😄'][rounded - 1] ?? '😐';
}

interface JourneyData {
  title: string;
  icon: string;
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

  // Energy balance
  const energyBalance = useMemo(() => {
    const totalIn = weekMeals.reduce((s, m) => s + (m.nutrition?.calories ?? 0), 0);
    const weight = profile?.weightKg ?? 60;
    const stepCalsToday = calculateStepCalories(0, weight);
    const activityCals = weekActivities.reduce((s, a) => s + a.caloriesBurned, 0);
    void stepCalsToday;

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

  // Nutrition averages
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

  // Pillar data
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

  // Journey card
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
        icon: '⚖️',
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
        icon: '📉',
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
        icon: '🩸',
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
        icon: '❤️',
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
        icon: '😴',
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
        icon: '🧠',
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

  // Wins & focus
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

  const initials = useMemo(() => {
    if (!profile?.name) return '👤';
    return profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }, [profile?.name]);

  const levelDot = (level: string): string => level === 'good' ? '🟢' : level === 'mid' ? '🟡' : '🔴';

  const netBalanceState = useMemo(() => {
    if (!energyBalance.avgIn) return 'none';
    if (energyBalance.net < -100) return 'deficit';
    if (energyBalance.net > 100) return 'surplus';
    return 'balanced';
  }, [energyBalance]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="wr-back">
            <ChevronLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <Text style={styles.userName} numberOfLines={1}>{profile?.name ?? t('common.user')}</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => setWeekOffset(o => o + 1)} style={styles.navBtn} testID="wr-prev">
            <ChevronLeft size={18} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.weekTitleWrap}>
            <Text style={styles.weekTitle}>{t('weeklyReport.weeklyTitle')}</Text>
            <Text style={styles.weekRange}>
              {formatDateShort(week.start)} — {formatDateShort(week.end)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setWeekOffset(o => Math.max(0, o - 1))}
            style={[styles.navBtn, weekOffset === 0 && styles.navBtnDisabled]}
            disabled={weekOffset === 0}
            testID="wr-next"
          >
            <ChevronRight size={18} color={weekOffset === 0 ? Colors.textTertiary : Colors.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Section 1 — Journey */}
        {journeyData && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{journeyData.icon}</Text>
              <Text style={styles.cardTitle}>{journeyData.title}</Text>
            </View>
            <View style={styles.journeyRow}>
              <View style={styles.journeyCol}>
                <Text style={styles.journeyLabel}>{t('weeklyReport.journey.original')}</Text>
                <Text style={styles.journeyValue}>{journeyData.original}</Text>
              </View>
              <View style={styles.journeyArrow}>
                <View style={[styles.progressBar, { backgroundColor: trendColor(journeyData.currentNum - journeyData.originalNum, journeyData.preferLower) }]} />
              </View>
              <View style={styles.journeyCol}>
                <Text style={styles.journeyLabel}>{t('weeklyReport.journey.current')}</Text>
                <Text style={[styles.journeyValue, { color: trendColor(journeyData.currentNum - journeyData.originalNum, journeyData.preferLower) }]}>
                  {journeyData.current}
                </Text>
              </View>
              <View style={styles.journeyCol}>
                <Text style={styles.journeyLabel}>{t('weeklyReport.journey.goal')}</Text>
                <Text style={styles.journeyValue}>{journeyData.goal}</Text>
              </View>
            </View>
            <Text style={[styles.trendLine, { color: trendColor(journeyData.currentNum - journeyData.originalNum, journeyData.preferLower) }]}>
              {journeyData.trend === 'up' ? (journeyData.preferLower ? t('weeklyReport.journey.trendDown') : t('weeklyReport.journey.trendUp')) :
               journeyData.trend === 'down' ? (journeyData.preferLower ? t('weeklyReport.journey.trendUp') : t('weeklyReport.journey.trendDown')) :
               t('weeklyReport.journey.trendFlat')}
            </Text>
          </View>
        )}

        {/* Section 2 — Energy Balance */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('weeklyReport.energy.title')}</Text>
          {weekMeals.length === 0 ? (
            <Text style={styles.emptyText}>{t('weeklyReport.energy.noData')}</Text>
          ) : (
            <>
              <View style={styles.energyRow}>
                <View style={styles.energyItem}>
                  <Text style={styles.energyEmoji}>🍽️</Text>
                  <Text style={styles.energyValue}>{energyBalance.avgIn.toLocaleString()}</Text>
                  <Text style={styles.energyLabel}>{t('weeklyReport.energy.in')}</Text>
                </View>
                <View style={styles.energyItem}>
                  <Text style={styles.energyEmoji}>🔥</Text>
                  <Text style={styles.energyValue}>{energyBalance.avgOut.toLocaleString()}</Text>
                  <Text style={styles.energyLabel}>{t('weeklyReport.energy.out')}</Text>
                </View>
                <View style={styles.energyItem}>
                  <Text style={styles.energyEmoji}>⚖️</Text>
                  <Text style={[styles.energyValue, { color: energyBalance.net >= 0 ? Colors.physicalActivity : Colors.nutrition }]}>
                    {energyBalance.net >= 0 ? '+' : ''}{energyBalance.net.toLocaleString()}
                  </Text>
                  <Text style={styles.energyLabel}>{t('weeklyReport.energy.net')}</Text>
                </View>
              </View>
              <View style={[
                styles.energyBanner,
                netBalanceState === 'deficit' && styles.bannerGreen,
                netBalanceState === 'surplus' && styles.bannerOrange,
                netBalanceState === 'balanced' && styles.bannerTeal,
              ]}>
                <Text style={styles.energyBannerText}>
                  {netBalanceState === 'deficit' ? `✅ ${t('weeklyReport.energy.deficit')}` :
                   netBalanceState === 'surplus' ? `⚠️ ${t('weeklyReport.energy.surplus')}` :
                   `✅ ${t('weeklyReport.energy.balanced')}`}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Section 3 — Nutrition Snapshot */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('weeklyReport.nutrition.title')}</Text>
          {!nutritionAvg.hasData ? (
            <Text style={styles.emptyText}>{t('weeklyReport.nutrition.noMeals')}</Text>
          ) : (
            <>
              <Text style={styles.nutritionSubhead}>{t('weeklyReport.nutrition.goalsToReach')}</Text>
              <View style={styles.nutritionGrid}>
                <NutritionCard emoji="🌾" label={t('weeklyReport.nutrition.carbs')} value={nutritionAvg.carbs} target={targets.carbsG} unit="g" met={nutritionAvg.carbs >= targets.carbsG * 0.8} />
                <NutritionCard emoji="💪" label={t('weeklyReport.nutrition.protein')} value={nutritionAvg.protein} target={targets.proteinG} unit="g" met={nutritionAvg.protein >= targets.proteinG * 0.8} />
                <NutritionCard emoji="🥦" label={t('weeklyReport.nutrition.fiber')} value={nutritionAvg.fiber} target={targets.fiberG} unit="g" met={nutritionAvg.fiber >= targets.fiberG * 0.8} />
              </View>

              <Text style={[styles.nutritionSubhead, { marginTop: 18 }]}>{t('weeklyReport.nutrition.limitsToStay')}</Text>
              <View style={styles.nutritionGrid}>
                <NutritionCard emoji="🍬" label={t('weeklyReport.nutrition.addedSugar')} value={nutritionAvg.addedSugar} target={targets.addedSugarG} unit="g" met={nutritionAvg.addedSugar <= targets.addedSugarG} isLimit />
                <NutritionCard emoji="🥩" label={t('weeklyReport.nutrition.satFat')} value={nutritionAvg.satFat} target={targets.saturatedFatG} unit="g" met={nutritionAvg.satFat <= targets.saturatedFatG} isLimit />
              </View>

              <View style={styles.plantDiversityRow}>
                <Text style={styles.plantDiversityLabel}>🌱 {t('weeklyReport.nutrition.plantDiversity')}</Text>
                <Text style={styles.plantDiversityValue}>
                  {t('weeklyReport.nutrition.plantsPerDay', { avg: nutritionAvg.plantsPerDay })}
                </Text>
                <Text style={styles.plantDiversityCheck}>{nutritionAvg.plantsPerDay >= 5 ? '✅' : '⚠️'}</Text>
              </View>
            </>
          )}
        </View>

        {/* Section 4 — Six Pillars */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('weeklyReport.pillars.title')}</Text>
          <PillarRow
            emoji="🥗"
            name={t('weeklyReport.pillars.nutrition')}
            line={t('weeklyReport.pillars.nutritionLine', { meals: pillarData.nutrition.meals, plants: pillarData.nutrition.plantsAvg })}
            dot={levelDot(pillarData.nutrition.level)}
            active={pillarData.nutrition.meals > 0}
          />
          <PillarRow
            emoji="🏃"
            name={t('weeklyReport.pillars.activity')}
            line={t('weeklyReport.pillars.activityLine', { sessions: pillarData.activity.sessions, kcal: Math.round(pillarData.activity.kcal) })}
            dot={levelDot(pillarData.activity.level)}
            active={pillarData.activity.sessions > 0}
          />
          <PillarRow
            emoji="😴"
            name={t('weeklyReport.pillars.sleep')}
            line={t('weeklyReport.pillars.sleepLine', {
              nights: pillarData.sleep.nights,
              hours: pillarData.sleep.avgHours.toFixed(1),
              feel: feelingLabel(pillarData.sleep.avgFeelingScore, t),
            })}
            dot={levelDot(pillarData.sleep.level)}
            active={pillarData.sleep.nights > 0}
          />
          <PillarRow
            emoji="🧠"
            name={t('weeklyReport.pillars.stress')}
            line={t('weeklyReport.pillars.stressLine', {
              entries: pillarData.stress.journals,
              emoji: pillarData.stress.avgMood > 0 ? moodToEmoji(pillarData.stress.avgMood) : '—',
            })}
            dot={levelDot(pillarData.stress.level)}
            active={pillarData.stress.journals > 0}
          />
          <PillarRow
            emoji="👥"
            name={t('weeklyReport.pillars.social')}
            line={t('weeklyReport.pillars.comingSoon')}
            dot=""
            active={false}
            locked
          />
          <PillarRow
            emoji="🚫"
            name={t('weeklyReport.pillars.substances')}
            line={t('weeklyReport.pillars.comingSoon')}
            dot=""
            active={false}
            locked
          />
        </View>

        {/* Section 5 — Wins & Focus */}
        <View style={styles.winsRow}>
          <View style={[styles.winCard, { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }]}>
            <Text style={styles.winHeader}>🏆 {t('weeklyReport.wins.thisWeeksWin')}</Text>
            <Text style={styles.winText}>{winAndFocus.win}</Text>
          </View>
          <View style={[styles.winCard, { backgroundColor: '#FFF3E0', borderColor: '#FFE0B2' }]}>
            <Text style={styles.winHeader}>🎯 {t('weeklyReport.wins.nextWeeksFocus')}</Text>
            <Text style={styles.winText}>{winAndFocus.focus}</Text>
          </View>
        </View>

        <Text style={styles.swipeHint}>{t('weeklyReport.swipeForMore')}</Text>
      </ScrollView>
    </View>
  );
}

interface NutritionCardProps {
  emoji: string;
  label: string;
  value: number;
  target: number;
  unit: string;
  met: boolean;
  isLimit?: boolean;
}

function NutritionCard({ emoji, label, value, target, unit, met, isLimit }: NutritionCardProps) {
  const { t } = useTranslation();
  return (
    <View style={[styles.nutritionCard, met ? styles.nutritionCardGood : styles.nutritionCardWarn]}>
      <Text style={styles.nutritionEmoji}>{emoji}</Text>
      <Text style={styles.nutritionLabel}>{label}</Text>
      <Text style={styles.nutritionValue}>{t('weeklyReport.nutrition.avgLabel', { value })}{unit === 'g' ? '' : unit}</Text>
      <Text style={styles.nutritionTarget}>
        {isLimit
          ? t('weeklyReport.nutrition.limitLabel', { value: target })
          : t('weeklyReport.nutrition.targetLabel', { value: target })}
      </Text>
      <Text style={styles.nutritionCheck}>{met ? '✅' : '⚠️'}</Text>
    </View>
  );
}

interface PillarRowProps {
  emoji: string;
  name: string;
  line: string;
  dot: string;
  active: boolean;
  locked?: boolean;
}

function PillarRow({ emoji, name, line, dot, active, locked }: PillarRowProps) {
  return (
    <View style={[styles.pillarRow, locked && styles.pillarRowLocked]}>
      <Text style={[styles.pillarEmoji, locked && styles.pillarEmojiLocked]}>{emoji}</Text>
      <View style={styles.pillarBody}>
        <View style={styles.pillarTitleRow}>
          <Text style={[styles.pillarName, locked && styles.pillarNameLocked]}>{name}</Text>
          {locked && <Lock size={12} color={Colors.textTertiary} />}
        </View>
        <Text style={[styles.pillarLine, locked && styles.pillarLineLocked]}>{line}</Text>
      </View>
      {active && <Text style={styles.pillarDot}>{dot}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFAF3' },
  safe: { backgroundColor: '#FDFAF3' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.stressManagement,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { color: Colors.white, fontSize: 14, fontWeight: '700' as const },
  userName: { fontSize: 15, fontWeight: '600' as const, color: Colors.text, maxWidth: 160 },

  weekNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  navBtnDisabled: { opacity: 0.4 },
  weekTitleWrap: { alignItems: 'center', flex: 1 },
  weekTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.4 },
  weekRange: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' as const },

  scroll: { padding: 20, paddingTop: 8, paddingBottom: 60 },

  card: {
    backgroundColor: Colors.card, borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: Colors.cardBorder,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cardIcon: { fontSize: 22 },
  cardTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.2 },

  journeyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  journeyCol: { flex: 1, alignItems: 'center' },
  journeyArrow: { width: 28, height: 3, justifyContent: 'center' },
  progressBar: { height: 3, borderRadius: 2, width: '100%' },
  journeyLabel: { fontSize: 10, color: Colors.textTertiary, marginBottom: 4, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.4 },
  journeyValue: { fontSize: 17, fontWeight: '800' as const, color: Colors.text },
  trendLine: { fontSize: 12, marginTop: 12, textAlign: 'center', fontWeight: '600' as const },

  energyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 16 },
  energyItem: { flex: 1, alignItems: 'center', backgroundColor: '#FAF8F2', borderRadius: 14, paddingVertical: 14 },
  energyEmoji: { fontSize: 22, marginBottom: 6 },
  energyValue: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.4 },
  energyLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 4, textAlign: 'center', fontWeight: '600' as const, paddingHorizontal: 4 },
  energyBanner: { borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  bannerGreen: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  bannerOrange: { backgroundColor: '#FFF3E0', borderColor: '#FFCC80' },
  bannerTeal: { backgroundColor: '#E0F2F1', borderColor: '#80CBC4' },
  energyBannerText: { fontSize: 13, fontWeight: '700' as const, color: Colors.text },

  emptyText: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' as const, paddingVertical: 8 },

  nutritionSubhead: { fontSize: 12, color: Colors.textSecondary, fontWeight: '700' as const, marginBottom: 10, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nutritionCard: {
    width: '31%' as any, flexGrow: 1, minWidth: 100, backgroundColor: '#FAF8F2',
    borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1,
  },
  nutritionCardGood: { borderColor: '#C8E6C9' },
  nutritionCardWarn: { borderColor: '#FFE0B2' },
  nutritionEmoji: { fontSize: 20, marginBottom: 4 },
  nutritionLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' as const },
  nutritionValue: { fontSize: 16, fontWeight: '800' as const, color: Colors.text, marginTop: 3 },
  nutritionTarget: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  nutritionCheck: { fontSize: 14, marginTop: 4 },

  plantDiversityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F1F8E9', padding: 14, borderRadius: 12, marginTop: 16,
    borderWidth: 1, borderColor: '#DCEDC8',
  },
  plantDiversityLabel: { flex: 1, fontSize: 13, fontWeight: '600' as const, color: Colors.text },
  plantDiversityValue: { fontSize: 13, fontWeight: '800' as const, color: Colors.nutrition },
  plantDiversityCheck: { fontSize: 16 },

  pillarRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  pillarRowLocked: { opacity: 0.5 },
  pillarEmoji: { fontSize: 24 },
  pillarEmojiLocked: { opacity: 0.6 },
  pillarBody: { flex: 1 },
  pillarTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillarName: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  pillarNameLocked: { color: Colors.textSecondary },
  pillarLine: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  pillarLineLocked: { fontStyle: 'italic' as const },
  pillarDot: { fontSize: 14 },

  winsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  winCard: { flex: 1, borderRadius: 18, padding: 16, borderWidth: 1, minHeight: 120 },
  winHeader: { fontSize: 12, fontWeight: '700' as const, color: Colors.text, marginBottom: 8, letterSpacing: -0.1 },
  winText: { fontSize: 13, color: Colors.text, lineHeight: 18, fontWeight: '500' as const },

  swipeHint: { textAlign: 'center', fontSize: 11, color: Colors.textTertiary, marginTop: 8, fontStyle: 'italic' as const },
});
