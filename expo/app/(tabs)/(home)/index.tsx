import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Platform, LayoutAnimation,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera, BookOpen, Dumbbell, Moon, Flame, Star, RefreshCw,
  Target, BarChart3, Beaker, AlertTriangle, ChevronDown, Check, ChevronRight,
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useUser } from '@/context/UserContext';
import { useLanguage } from '@/context/LanguageContext';
import { NutrientTargets } from '@/types';
import { calculateStepCalories } from '@/utils/calories';

const { width } = Dimensions.get('window');

const NUTRIENT_TILE_GAP = 6;

type NutrientTileType = 'goal' | 'limit';

interface NutrientTileData {
  key: string;
  label: string;
  emoji: string;
  current: number;
  target: number;
  unit: string;
  type: NutrientTileType;
  isTransFat?: boolean;
}

const QUICK_ACTIONS = [
  { id: 'meal', labelKey: 'dashboard.logMeal', icon: Camera, color: Colors.nutrition, bg: Colors.nutritionLight, route: '/meal-logger' },
  { id: 'journal', labelKey: 'dashboard.journal', icon: BookOpen, color: Colors.stressManagement, bg: Colors.stressManagementLight, route: '/journal-logger' },
  { id: 'activity', labelKey: 'dashboard.activity', icon: Dumbbell, color: Colors.physicalActivity, bg: Colors.physicalActivityLight, route: '/activity-logger' },
  { id: 'sleep', labelKey: 'dashboard.sleep', icon: Moon, color: Colors.sleep, bg: Colors.sleepLight, route: '/sleep-history' },
] as const;

const DEFAULT_TARGETS: NutrientTargets = {
  calories: 2000,
  carbsG: 250,
  proteinG: 90,
  fiberG: 28,
  addedSugarG: 25,
  saturatedFatG: 22,
  transFatG: 0,
};

function getNutrientTileColors(data: NutrientTileData): { fill: string; bg: string; text: string } {
  if (data.isTransFat) {
    if (data.current > 0) return { fill: '#FFCDD2', bg: '#FFF5F5', text: '#C62828' };
    return { fill: '#C8E6C9', bg: '#F1F8F1', text: '#2E7D32' };
  }
  if (data.type === 'limit') {
    const ratio = data.target > 0 ? data.current / data.target : 0;
    if (ratio > 1) return { fill: '#FFCDD2', bg: '#FFF5F5', text: '#C62828' };
    if (ratio > 0.75) return { fill: '#FFE0B2', bg: '#FFF8F0', text: '#E65100' };
    return { fill: '#C8E6C9', bg: '#F1F8F1', text: '#2E7D32' };
  }
  const ratio = data.target > 0 ? data.current / data.target : 0;
  if (ratio >= 1) return { fill: '#C8E6C9', bg: '#F1F8F1', text: '#2E7D32' };
  if (ratio >= 0.5) return { fill: '#DCEDC8', bg: '#F6FBF0', text: '#558B2F' };
  return { fill: '#FFF9C4', bg: '#FFFEF5', text: '#F9A825' };
}

const NutrientTile = React.memo(function NutrientTile({ data }: { data: NutrientTileData }) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const colors = getNutrientTileColors(data);

  const ratio = useMemo(() => {
    if (data.isTransFat) return 0;
    const maxTarget = data.target > 0 ? data.target : 1;
    return Math.min(data.current / maxTarget, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.current, data.target, data.isTransFat]);

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: ratio,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [ratio, fillAnim]);

  const fillHeight = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const currentRounded = Math.round(data.current * 10) / 10;

  return (
    <View style={[tileStyles.tile, { backgroundColor: colors.bg, flex: 1, minWidth: 0 }]}>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1 }} />
        <Animated.View
          style={[
            tileStyles.liquidFill,
            { height: fillHeight, backgroundColor: colors.fill },
          ]}
        />
      </View>
      <View style={tileStyles.tileInner}>
        <Text style={tileStyles.tileEmoji}>{data.emoji}</Text>
        <Text style={[tileStyles.tileLabel, { color: colors.text }]}>{data.label}</Text>
        <Text style={[tileStyles.tileValue, { color: colors.text }]}>
          {currentRounded}{data.unit}
        </Text>
        <Text style={tileStyles.tileTarget}>of {data.target}{data.unit}</Text>
      </View>
    </View>
  );
});

const NutrientBarRow = React.memo(function NutrientBarRow({ data }: { data: NutrientTileData }) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const colors = getNutrientTileColors(data);

  const ratio = useMemo(() => {
    const maxTarget = data.target > 0 ? data.target : 1;
    return Math.min(data.current / maxTarget, 1);
  }, [data.current, data.target]);

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: ratio,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [ratio, fillAnim]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const currentRounded = Math.round(data.current * 10) / 10;

  return (
    <View style={barStyles.container}>
      <View style={barStyles.labelRow}>
        <Text style={barStyles.emoji}>{data.emoji}</Text>
        <Text style={[barStyles.label, { color: colors.text }]}>{data.label}</Text>
        <Text style={[barStyles.value, { color: colors.text }]}>
          {currentRounded}{data.unit} / {data.target}{data.unit}
        </Text>
      </View>
      <View style={barStyles.trackBg}>
        <Animated.View
          style={[
            barStyles.trackFill,
            { width: fillWidth, backgroundColor: colors.fill },
          ]}
        />
      </View>
    </View>
  );
});

const TransFatCard = React.memo(function TransFatCard({ data }: { data: NutrientTileData }) {
  const detected = data.current > 0;
  const currentRounded = Math.round(data.current * 10) / 10;

  return (
    <View style={[barStyles.transFatContainer, { backgroundColor: detected ? '#FFF5F5' : '#F1F8F1' }]}>
      <View style={barStyles.transFatInner}>
        <Text style={barStyles.emoji}>{data.emoji}</Text>
        <Text style={[barStyles.label, { color: detected ? '#C62828' : '#2E7D32' }]}>
          {data.label}
        </Text>
        <View style={barStyles.transFatStatus}>
          {detected ? (
            <>
              <AlertTriangle size={15} color="#C62828" />
              <Text style={[barStyles.transFatText, { color: '#C62828' }]}>
                {currentRounded}g detected
              </Text>
            </>
          ) : (
            <>
              <Check size={15} color="#2E7D32" />
              <Text style={[barStyles.transFatText, { color: '#2E7D32' }]}>
                None detected today
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
});

const tileStyles = StyleSheet.create({
  tile: {
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 90,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  liquidFill: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  tileInner: {
    ...StyleSheet.absoluteFillObject,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  tileEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    marginBottom: 1,
  },
  tileValue: {
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  tileTarget: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
    marginTop: 1,
  },
});

const barStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 16,
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700' as const,
    flex: 1,
  },
  value: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  trackBg: {
    height: 8,
    backgroundColor: Colors.inputBg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  trackFill: {
    height: 8,
    borderRadius: 4,
  },
  transFatContainer: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  transFatInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transFatStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
  },
  transFatText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
});

const RING_SIZE = 128;
const RING_STROKE = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const CalorieSummaryCard = React.memo(function CalorieSummaryCard({
  consumed,
  goal,
  t,
}: { consumed: number; goal: number; t: (k: string) => string }) {
  const safeGoal = goal > 0 ? goal : 2000;
  const ratio = Math.min(consumed / safeGoal, 1);
  const remaining = safeGoal - consumed;
  const exceeded = remaining < 0;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [dashOffset, setDashOffset] = useState<number>(RING_CIRCUMFERENCE);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: ratio,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [ratio, progressAnim]);

  useEffect(() => {
    const id = progressAnim.addListener(({ value }) => {
      setDashOffset(RING_CIRCUMFERENCE * (1 - value));
    });
    return () => progressAnim.removeListener(id);
  }, [progressAnim]);

  return (
    <View style={calorieStyles.card} testID="calorie-summary-card">
      <Text style={calorieStyles.title}>{t('dashboard.calorieSummary')}</Text>
      <View style={calorieStyles.row}>
        <View style={calorieStyles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="#EFEFEF"
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="#FF7A3D"
              strokeWidth={RING_STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          <View style={calorieStyles.ringCenter} pointerEvents="none">
            <Text style={calorieStyles.ringNumber}>{consumed.toLocaleString()}</Text>
            <Text style={calorieStyles.ringLabel}>{t('dashboard.consumedKcal')}</Text>
            <Text style={calorieStyles.ringLabel}>{t('dashboard.kcal')}</Text>
          </View>
        </View>
        <View style={calorieStyles.readouts}>
          <View style={calorieStyles.readoutBlock}>
            <View style={calorieStyles.readoutHeader}>
              <Text style={calorieStyles.readoutEmoji}>{"\uD83D\uDD25"}</Text>
              <Text style={calorieStyles.readoutLabel}>{t('dashboard.remaining')}:</Text>
            </View>
            <Text style={[calorieStyles.readoutValue, exceeded && { color: '#D32F2F' }]}>
              {exceeded ? `-${Math.abs(remaining).toLocaleString()}` : remaining.toLocaleString()} {t('dashboard.kcal')}
            </Text>
          </View>
          <View style={calorieStyles.readoutBlock}>
            <View style={calorieStyles.readoutHeader}>
              <Text style={calorieStyles.readoutEmoji}>{"\uD83D\uDEA9"}</Text>
              <Text style={calorieStyles.readoutLabel}>{t('dashboard.totalGoal')}:</Text>
            </View>
            <Text style={calorieStyles.readoutValue}>{safeGoal.toLocaleString()} {t('dashboard.kcal')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const calorieStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  title: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  ringNumber: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#FF7A3D',
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  ringLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    lineHeight: 14,
  },
  readouts: {
    flex: 1,
    gap: 14,
  },
  readoutBlock: {
    gap: 2,
  },
  readoutHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  readoutEmoji: {
    fontSize: 14,
  },
  readoutLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  readoutValue: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
});

export default function DashboardScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const {
    profile, totalPoints, dailySteps, yesterdaySteps, stepGoal, todayPoints, badges,
    onboardingComplete, mealLogs, activityLogs, nutrientTargets,
    stepsPermissionStatus, stepsDebugInfo: _stepsDebugInfo, refreshSteps,
  } = useUser();
  const stepAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const [nutritionExpanded, setNutritionExpanded] = useState(false);

  const targets = nutrientTargets ?? DEFAULT_TARGETS;

  useEffect(() => {
    if (!onboardingComplete) return;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(stepAnim, { toValue: Math.min(dailySteps / stepGoal, 1), duration: 1200, useNativeDriver: false }),
    ]).start();
  }, [onboardingComplete, dailySteps, stepGoal, fadeAnim, stepAnim]);

  const stepProgress = stepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todayMeals = useMemo(
    () => mealLogs.filter(m => m.date === todayString),
    [mealLogs, todayString]
  );

  const nutritionTotals = useMemo(() => {
    const totals = {
      calories: 0,
      carbs: 0, fiber: 0, protein: 0,
      addedSugar: 0, saturatedFat: 0, transFat: 0,
    };
    for (const meal of todayMeals) {
      if (meal.nutrition) {
        totals.calories += meal.nutrition.calories ?? 0;
        totals.carbs += meal.nutrition.totalCarbsG ?? 0;
        totals.fiber += meal.nutrition.dietaryFiberG ?? 0;
        totals.protein += meal.nutrition.proteinG ?? 0;
        totals.addedSugar += meal.nutrition.addedSugarG ?? 0;
        totals.saturatedFat += meal.nutrition.saturatedFatG ?? 0;
        totals.transFat += meal.nutrition.transFatG ?? 0;
      }
    }
    return totals;
  }, [todayMeals]);

  const nutrientTiles: NutrientTileData[] = useMemo(() => [
    { key: 'carbs', label: t('dashboard.carbs'), emoji: '\uD83C\uDF3E', current: nutritionTotals.carbs, target: targets.carbsG, unit: 'g', type: 'goal' as const },
    { key: 'protein', label: t('dashboard.protein'), emoji: '\uD83D\uDCAA', current: nutritionTotals.protein, target: targets.proteinG, unit: 'g', type: 'goal' as const },
    { key: 'fiber', label: t('dashboard.fiber'), emoji: '\uD83E\uDD66', current: nutritionTotals.fiber, target: targets.fiberG, unit: 'g', type: 'goal' as const },
    { key: 'sugar', label: t('dashboard.addedSugar'), emoji: '\uD83C\uDF6C', current: nutritionTotals.addedSugar, target: targets.addedSugarG, unit: 'g', type: 'limit' as const },
    { key: 'satfat', label: t('dashboard.saturatedFat'), emoji: '\uD83E\uDD69', current: nutritionTotals.saturatedFat, target: targets.saturatedFatG, unit: 'g', type: 'limit' as const },
    { key: 'transfat', label: t('dashboard.transFat'), emoji: '\u26A0\uFE0F', current: nutritionTotals.transFat, target: 0, unit: 'g', type: 'limit' as const, isTransFat: true },
  ], [nutritionTotals, targets, t]);

  const hasMealsToday = todayMeals.length > 0;

  const todayActivities = useMemo(
    () => activityLogs.filter(a => a.date === todayString),
    [activityLogs, todayString]
  );

  const stepsCalories = useMemo(() => {
    const weight = profile?.weightKg ?? 60;
    return calculateStepCalories(dailySteps, weight);
  }, [dailySteps, profile?.weightKg]);

  const activityCalories = useMemo(
    () => todayActivities.reduce((sum, a) => sum + a.caloriesBurned, 0),
    [todayActivities]
  );

  const totalCaloriesBurnt = stepsCalories + activityCalories;

  const earnedBadges = useMemo(() => badges.filter(b => b.earned), [badges]);
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.goodMorning');
    if (hour < 17) return t('dashboard.goodAfternoon');
    return t('dashboard.goodEvening');
  }, [t]);

  const initials = useMemo(() => {
    if (!profile?.name) return '?';
    return profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }, [profile?.name]);

  const toggleNutrition = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = !nutritionExpanded;
    setNutritionExpanded(next);
    Animated.timing(chevronAnim, {
      toValue: next ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [nutritionExpanded, chevronAnim]);

  const chevronRotation = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  if (!onboardingComplete) return null;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.headerRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.greeting}>{greeting + ','}</Text>
                <Text style={styles.userName}>{profile?.name ?? t('common.user')}</Text>
                <Text style={styles.teamBadge}>{profile?.teamName}</Text>
              </View>
              <View style={styles.pointsBadge}>
                <Flame size={16} color={Colors.physicalActivity} />
                <Text style={styles.pointsText}>{totalPoints}</Text>
              </View>
            </View>

            <CalorieSummaryCard
              consumed={Math.round(nutritionTotals.calories)}
              goal={targets.calories}
              t={t}
            />

            <View style={styles.nutritionCard} testID="nutrition-section">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={toggleNutrition}
                style={styles.nutritionCardHeader}
              >
                <Text style={styles.nutritionCardEmoji}>{"\uD83E\uDD57"}</Text>
                <Text style={styles.nutritionCardTitle}>{t('dashboard.todaysNutrition')}</Text>
                <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
                  <ChevronDown size={20} color={Colors.textTertiary} />
                </Animated.View>
              </TouchableOpacity>

              {nutritionExpanded && (
                <View style={styles.nutritionExpanded} testID="nutrition-summary">
                  <View style={styles.nutritionDivider} />
                  {hasMealsToday ? (
                    <View style={styles.nutrientLayout}>
                      <View style={styles.nutrientTilesGrid}>
                        {nutrientTiles.filter(t => t.key === 'carbs' || t.key === 'protein' || t.key === 'fiber').map(tile => (
                          <NutrientTile key={tile.key} data={tile} />
                        ))}
                      </View>
                      {nutrientTiles.filter(t => t.key === 'sugar' || t.key === 'satfat').map(tile => (
                        <NutrientBarRow key={tile.key} data={tile} />
                      ))}
                      {nutrientTiles.filter(t => t.isTransFat).map(tile => (
                        <TransFatCard key={tile.key} data={tile} />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.nutrientEmpty}>
                      <Text style={styles.nutrientEmptyIcon}>{'\ud83c\udf7d\ufe0f'}</Text>
                      <Text style={styles.nutrientEmptyText}>{t('dashboard.logMealToSeeProgress')}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.dualCardRow}>
              <TouchableOpacity
                style={styles.stepCardCompact}
                activeOpacity={0.7}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/steps-history' as any);
                }}
                testID="steps-card"
              >
                <View style={styles.compactCardHeader}>
                  <Text style={styles.compactCardEmoji}>{"\uD83D\uDC5F"}</Text>
                  {stepsPermissionStatus !== 'loading' && Platform.OS !== 'web' && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        void refreshSteps();
                      }}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      activeOpacity={0.5}
                      testID="refresh-steps-btn"
                    >
                      <RefreshCw size={14} color={Colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.compactCardValue}>{dailySteps.toLocaleString()}</Text>
                <Text style={styles.compactCardLabel}>/ {stepGoal.toLocaleString()} {t('dashboard.stepsCount')}</Text>

                {stepsPermissionStatus === 'loading' ? (
                  <Text style={styles.compactCardHint}>{t('dashboard.checking')}</Text>
                ) : (
                  <>
                    <View style={styles.compactBarBg}>
                      <Animated.View style={[styles.compactBarFill, { width: stepProgress }]} />
                      {yesterdaySteps > 0 && (
                        <View
                          style={[
                            styles.compactYesterdayMarker,
                            { left: `${Math.min((yesterdaySteps / stepGoal) * 100, 100)}%` },
                          ]}
                        >
                          <View style={styles.compactYesterdayLine} />
                        </View>
                      )}
                    </View>
                    <View style={styles.compactStepFooter}>
                      <Text style={styles.compactPercent}>{Math.round((dailySteps / stepGoal) * 100)}%</Text>
                      {yesterdaySteps > 0 && (
                        <Text style={styles.compactYesterdayLabel}>{t('dashboard.yday')}</Text>
                      )}
                    </View>
                    {(() => {
                      if (dailySteps === 0 && yesterdaySteps === 0) return null;
                      if (yesterdaySteps === 0) {
                        return (
                          <Text style={styles.compactContextMsg} numberOfLines={2}>
                            {t('dashboard.startWalking')}
                          </Text>
                        );
                      }
                      if (dailySteps >= yesterdaySteps) {
                        return (
                          <Text style={styles.compactContextMsg} numberOfLines={2}>
                            {t('dashboard.beatYesterday')}
                          </Text>
                        );
                      }
                      return (
                        <Text style={styles.compactContextMsg} numberOfLines={2}>
                          {t('dashboard.keepGoing', { steps: yesterdaySteps.toLocaleString() })}
                        </Text>
                      );
                    })()}
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.caloriesCardCompact}
                activeOpacity={0.7}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/activity-history' as any);
                }}
                testID="calories-card"
              >
                <View style={styles.compactCardHeader}>
                  <Text style={styles.compactCardEmoji}>{"\uD83D\uDD25"}</Text>
                  <ChevronRight size={14} color={Colors.textTertiary} />
                </View>
                <Text style={styles.caloriesCardValue}>{totalCaloriesBurnt.toLocaleString()}</Text>
                <Text style={styles.compactCardLabel}>{t('dashboard.caloriesBurnt2')}</Text>
                <View style={styles.caloriesBreakdown}>
                  <View style={styles.caloriesBreakdownRow}>
                    <View style={[styles.caloriesDot, { backgroundColor: Colors.physicalActivity }]} />
                    <Text style={styles.caloriesBreakdownText}>{t('dashboard.stepsBreakdown')}: {stepsCalories}</Text>
                  </View>
                  <View style={styles.caloriesBreakdownRow}>
                    <View style={[styles.caloriesDot, { backgroundColor: '#7E57C2' }]} />
                    <Text style={styles.caloriesBreakdownText}>{t('dashboard.activityBreakdown')}: {activityCalories}</Text>
                  </View>
                </View>
                <View style={styles.caloriesBadge}>
                  <Text style={styles.caloriesBadgeText}>{t('dashboard.stepsPlusActivity')}</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.todayPointsCard}>
              <View style={styles.todayPointsRow}>
                <Star size={18} color={Colors.warning} />
                <Text style={styles.todayPointsLabel}>{t('dashboard.pointsEarnedToday')}</Text>
              </View>
              <Text style={styles.todayPointsValue}>{todayPoints}</Text>
            </View>

            <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
            <View style={styles.actionsGrid}>
              {QUICK_ACTIONS.map(action => {
                const IconComp = action.icon;
                return (
                  <TouchableOpacity
                    key={action.id}
                    style={styles.actionCard}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push(action.route as any);
                    }}
                    activeOpacity={0.7}
                    testID={`action-${action.id}`}
                  >
                    <View style={[styles.actionIconWrap, { backgroundColor: action.bg }]}>
                      <IconComp size={24} color={action.color} />
                    </View>
                    <Text style={styles.actionLabel}>{t(action.labelKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>{t('dashboard.explore')}</Text>
            <View style={styles.exploreRow}>
              <TouchableOpacity
                style={styles.exploreCard}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/missions' as any);
                }}
                activeOpacity={0.7}
                testID="missions-btn"
              >
                <View style={[styles.exploreIconWrap, { backgroundColor: Colors.sleepLight }]}>
                  <Target size={22} color={Colors.sleep} />
                </View>
                <Text style={styles.exploreLabel}>{t('dashboard.missions')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exploreCard}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/weekly-report' as any);
                }}
                activeOpacity={0.7}
                testID="report-btn"
              >
                <View style={[styles.exploreIconWrap, { backgroundColor: Colors.moodLight }]}>
                  <BarChart3 size={22} color={Colors.mood} />
                </View>
                <Text style={styles.exploreLabel}>{t('dashboard.weeklyReport')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.exploreRow}>
              <TouchableOpacity
                style={[styles.exploreCard, { backgroundColor: '#E0F2F1' }]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/health-markers' as any);
                }}
                activeOpacity={0.7}
                testID="health-markers-btn"
              >
                <Beaker size={22} color="#00897B" />
                <Text style={[styles.exploreLabel, { color: '#00897B' }]}>{t('dashboard.healthMarkers')}</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
            </View>

            {earnedBadges.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t('dashboard.badgesEarned')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
                  {earnedBadges.map(badge => (
                    <View key={badge.id} style={[styles.badgeCard, { borderColor: badge.color }]}>
                      <Text style={styles.badgeEmoji}>{badge.icon}</Text>
                      <Text style={styles.badgeName}>{badge.name}</Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.pillarStrip}>
              {[
                { label: t('dashboard.pillars.nutrition'), color: Colors.nutrition },
                { label: t('dashboard.pillars.activity'), color: Colors.physicalActivity },
                { label: t('dashboard.pillars.sleep'), color: Colors.sleep },
                { label: t('dashboard.pillars.stress'), color: Colors.stressManagement },
                { label: t('dashboard.pillars.social'), color: Colors.socialConnection },
                { label: t('dashboard.pillars.avoid'), color: Colors.riskySubstances },
              ].map(p => (
                <View key={p.label} style={styles.pillarStripItem}>
                  <View style={[styles.pillarStripDot, { backgroundColor: p.color }]} />
                  <Text style={styles.pillarStripLabel}>{p.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeTop: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.socialConnection,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' as const, color: Colors.white },
  headerInfo: { flex: 1, marginLeft: 14 },
  greeting: { fontSize: 13, color: Colors.textSecondary },
  userName: { fontSize: 20, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.3 },
  teamBadge: { fontSize: 12, color: Colors.socialConnection, fontWeight: '600' as const, marginTop: 2 },
  pointsBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.physicalActivityLight,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 4,
  },
  pointsText: { fontSize: 16, fontWeight: '700' as const, color: Colors.physicalActivity },

  nutritionCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  nutritionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nutritionCardEmoji: {
    fontSize: 22,
  },
  nutritionCardTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
    flex: 1,
  },
  nutritionExpanded: {
    marginTop: 12,
  },
  nutritionDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginBottom: 14,
  },
  nutrientLayout: {
    gap: 10,
  },
  nutrientTilesGrid: {
    flexDirection: 'row' as const,
    gap: NUTRIENT_TILE_GAP,
  },
  nutrientEmpty: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  nutrientEmptyIcon: {
    fontSize: 20,
  },
  nutrientEmptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },

  dualCardRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 14,
  },
  stepCardCompact: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  caloriesCardCompact: {
    flex: 1,
    backgroundColor: '#FFF5F0',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE0CC',
  },
  compactCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 6,
  },
  compactCardEmoji: {
    fontSize: 20,
  },
  compactCardValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.physicalActivity,
    letterSpacing: -0.5,
  },
  caloriesCardValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#E65100',
    letterSpacing: -0.5,
  },
  compactCardLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  compactCardHint: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  compactBarBg: {
    height: 6,
    backgroundColor: Colors.inputBg,
    borderRadius: 3,
    position: 'relative' as const,
  },
  compactBarFill: {
    height: 6,
    backgroundColor: Colors.physicalActivity,
    borderRadius: 3,
    maxWidth: '100%',
  },
  compactYesterdayMarker: {
    position: 'absolute' as const,
    top: -3,
    alignItems: 'center' as const,
    transform: [{ translateX: -1 }],
  },
  compactYesterdayLine: {
    width: 2,
    height: 12,
    backgroundColor: Colors.textTertiary,
    borderRadius: 1,
  },
  compactStepFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: 4,
  },
  compactPercent: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.physicalActivity,
  },
  compactYesterdayLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  compactContextMsg: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginTop: 4,
    lineHeight: 13,
  },
  caloriesBreakdown: {
    gap: 4,
    marginBottom: 8,
  },
  caloriesBreakdownRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
  },
  caloriesDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  caloriesBreakdownText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  caloriesBadge: {
    backgroundColor: '#FFE0CC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start' as const,
  },
  caloriesBadgeText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#BF360C',
  },
  todayPointsCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF8E1', borderRadius: 14, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: '#FFE082',
  },
  todayPointsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayPointsLabel: { fontSize: 14, fontWeight: '600' as const, color: '#E65100' },
  todayPointsValue: { fontSize: 24, fontWeight: '800' as const, color: '#E65100' },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginBottom: 14, letterSpacing: -0.3 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  actionCard: {
    width: (width - 52) / 2, borderRadius: 18, padding: 18, alignItems: 'flex-start',
    backgroundColor: Colors.white,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F3F6',
  },
  actionIconWrap: {
    width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  actionLabel: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  badgeScroll: { marginBottom: 24 },
  badgeCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginRight: 12,
    alignItems: 'center', borderWidth: 2, minWidth: 90,
  },
  badgeEmoji: { fontSize: 28, marginBottom: 6 },
  badgeName: { fontSize: 12, fontWeight: '600' as const, color: Colors.text },
  pillarStrip: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  pillarStripItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillarStripDot: { width: 8, height: 8, borderRadius: 4 },
  pillarStripLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' as const },
  exploreRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  exploreCard: {
    flex: 1, borderRadius: 18, padding: 18, alignItems: 'center', gap: 10,
    backgroundColor: Colors.white,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F3F6',
  },
  exploreIconWrap: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  exploreLabel: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  stepPermissionBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  stepPermissionHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  refreshBtn: {
    marginLeft: 8,
    padding: 4,
  },
  stepDebugBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  stepDebugText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#E65100',
    marginBottom: 4,
  },
  stepDebugLog: {
    fontSize: 10,
    color: '#BF360C',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  yesterdayMarker: {
    position: 'absolute' as const,
    top: -4,
    alignItems: 'center' as const,
    transform: [{ translateX: -1 }],
  },
  yesterdayMarkerLine: {
    width: 2,
    height: 16,
    backgroundColor: Colors.textTertiary,
    borderRadius: 1,
  },
  yesterdayMarkerLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  stepContextMsg: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginTop: 8,
    lineHeight: 16,
  },


});
