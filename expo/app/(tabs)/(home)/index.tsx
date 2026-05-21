import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Platform, LayoutAnimation,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera, BookOpen, Dumbbell, Moon, Flame, Star, RefreshCw,
  Target, BarChart3, Beaker, AlertTriangle, ChevronDown, Check, ChevronRight, TrendingUp, Footprints, Salad,
} from 'lucide-react-native';
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
  { id: 'meal', labelKey: 'dashboard.logMeal', icon: Camera, color: Colors.nutrition, route: '/meal-logger' },
  { id: 'journal', labelKey: 'dashboard.journal', icon: BookOpen, color: Colors.stressManagement, route: '/journal-logger' },
  { id: 'activity', labelKey: 'dashboard.activity', icon: Dumbbell, color: Colors.physicalActivity, route: '/activity-logger' },
  { id: 'sleep', labelKey: 'dashboard.sleep', icon: Moon, color: Colors.sleep, route: '/sleep-history' },
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

const CalorieSummaryCard = React.memo(function CalorieSummaryCard({
  consumed,
  goal,
  t,
}: { consumed: number; goal: number; t: (k: string) => string }) {
  const safeGoal = goal > 0 ? goal : 2000;
  const ratio = Math.min(consumed / safeGoal, 1);
  const pct = Math.round(ratio * 100);
  const remaining = safeGoal - consumed;
  const exceeded = remaining < 0;

  const motivation = (() => {
    if (consumed === 0) return t('dashboard.calorieMsg.start');
    if (exceeded) return t('dashboard.calorieMsg.over');
    if (ratio < 0.4) return t('dashboard.calorieMsg.early');
    if (ratio < 0.8) return t('dashboard.calorieMsg.mid');
    if (ratio < 1) return t('dashboard.calorieMsg.almost');
    return t('dashboard.calorieMsg.hit');
  })();

  return (
    <View style={calorieStyles.card} testID="calorie-summary-card">
      <Text style={calorieStyles.label}>{t('dashboard.calorieSummary')}</Text>
      <View style={calorieStyles.row}>
        <View style={{ flex: 1 }}>
          <Text style={calorieStyles.bigValue}>
            {consumed.toLocaleString()}
            <Text style={calorieStyles.bigValueGoal}> / {safeGoal.toLocaleString()}</Text>
          </Text>
          <Text style={calorieStyles.unitLabel}>
            {t('dashboard.kcal')} {exceeded ? `· ${Math.abs(remaining).toLocaleString()} ${t('dashboard.kcal')} over` : `· ${remaining.toLocaleString()} ${t('dashboard.kcal')} left`}
          </Text>
        </View>
        <Text style={calorieStyles.pct}>{pct}%</Text>
      </View>
      <View style={calorieStyles.barBg}>
        <View style={[calorieStyles.barFill, { width: `${Math.min(pct, 100)}%` as any }]} />
      </View>
      <Text style={calorieStyles.msg}>{motivation}</Text>
    </View>
  );
});

const calorieStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary,
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    shadowColor: Colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: 'hidden' as const,
  },
  label: { color: Colors.white, fontSize: 13, fontWeight: '600' as const, opacity: 0.9 },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    justifyContent: 'space-between' as const,
    marginTop: 4,
  },
  bigValue: { color: Colors.white, fontSize: 36, fontWeight: '800' as const, letterSpacing: -1 },
  bigValueGoal: { fontSize: 18, fontWeight: '700' as const, color: 'rgba(255,255,255,0.7)', letterSpacing: -0.4 },
  unitLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500' as const, marginTop: 2 },
  pct: { color: Colors.white, fontSize: 40, fontWeight: '800' as const, opacity: 0.28, letterSpacing: -1 },
  barBg: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 4,
    overflow: 'hidden' as const, marginTop: 10,
  },
  barFill: { height: 8, backgroundColor: Colors.white, borderRadius: 4 },
  msg: { color: Colors.white, fontSize: 13, fontWeight: '600' as const, marginTop: 12, opacity: 0.95 },
});

interface TaskItem { id: string; label: string; done: boolean }

const TodaysTasksCard = React.memo(function TodaysTasksCard({
  tasks, onToggle,
}: { tasks: TaskItem[]; onToggle: (id: string) => void }) {
  const { t } = useLanguage();
  const completed = tasks.filter(x => x.done).length;
  return (
    <View style={taskStyles.card} testID="todays-tasks">
      <View style={taskStyles.headerRow}>
        <Text style={taskStyles.title}>{t('dashboard.todaysTasks')}</Text>
        <Text style={taskStyles.count}>{completed}/{tasks.length}</Text>
      </View>
      <View style={{ height: 12 }} />
      {tasks.map(task => (
        <TouchableOpacity
          key={task.id}
          activeOpacity={0.7}
          onPress={() => onToggle(task.id)}
          style={taskStyles.row}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <View style={[taskStyles.checkbox, task.done && taskStyles.checkboxDone]}>
            {task.done && <Check size={14} color={Colors.white} strokeWidth={3} />}
          </View>
          <Text
            style={[
              taskStyles.label,
              task.done && taskStyles.labelDone,
            ]}
          >
            {task.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const taskStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F3F6',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 18, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3 },
  count: { fontSize: 13, color: Colors.textTertiary, fontWeight: '600' as const },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D9DDE3',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  checkboxDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  label: { fontSize: 15, color: Colors.text, fontWeight: '500' as const, flex: 1 },
  labelDone: {
    color: Colors.textTertiary,
    textDecorationLine: 'line-through' as const,
  },
});

const CoachTipCard = React.memo(function CoachTipCard({ tip }: { tip: string }) {
  const { t } = useLanguage();
  return (
    <View style={coachStyles.card} testID="coach-tip">
      <View style={coachStyles.iconWrap}>
        <TrendingUp size={20} color={Colors.white} strokeWidth={2.5} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={coachStyles.title}>{t('dashboard.coachTip')}</Text>
        <Text style={coachStyles.body}>{tip}</Text>
      </View>
    </View>
  );
});

const coachStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: Colors.primary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 5,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.white,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '500' as const,
    lineHeight: 20,
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
  void earnedBadges;

  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);

  const baseTasks = useMemo(() => {
    const hasBreakfast = todayMeals.some(m => (m.mealType ?? '').toLowerCase().includes('breakfast'));
    const hasLunch = todayMeals.some(m => (m.mealType ?? '').toLowerCase().includes('lunch'));
    const walkDone = dailySteps >= 1000;
    return [
      { id: 'log-breakfast', label: t('dashboard.tasks.logBreakfast'), auto: hasBreakfast || todayMeals.length >= 1 },
      { id: 'walk-10', label: t('dashboard.tasks.tenMinWalk'), auto: walkDone },
      { id: 'water-8', label: t('dashboard.tasks.drinkWater'), auto: false },
      { id: 'log-lunch', label: t('dashboard.tasks.logLunch'), auto: hasLunch || todayMeals.length >= 2 },
      { id: 'meditate', label: t('dashboard.tasks.eveningMeditation'), auto: false },
    ];
  }, [todayMeals, dailySteps, t]);

  const todaysTasks = useMemo(() => baseTasks.map(b => ({
    ...b,
    done: b.auto || completedTaskIds.includes(b.id),
  })), [baseTasks, completedTaskIds]);

  const toggleTask = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletedTaskIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const coachTip = useMemo(() => {
    const stepsRatio = dailySteps / Math.max(stepGoal, 1);
    const nutritionRatio = nutritionTotals.calories / Math.max(targets.calories, 1);
    if (stepsRatio < 0.4) {
      return t('dashboard.coachTips.lowSteps');
    }
    if (stepsRatio >= 0.9) {
      return t('dashboard.coachTips.greatSteps');
    }
    if (nutritionRatio < 0.3 && new Date().getHours() >= 14) {
      return t('dashboard.coachTips.lowNutrition');
    }
    if (todayPoints >= 30) {
      return t('dashboard.coachTips.greatProgress');
    }
    return t('dashboard.coachTips.default');
  }, [dailySteps, stepGoal, nutritionTotals.calories, targets.calories, todayPoints, t]);

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

            <TouchableOpacity
              style={styles.nutritionCard}
              activeOpacity={0.85}
              onPress={toggleNutrition}
              testID="nutrition-section"
            >
              <View style={styles.nutritionCardHeader}>
                <View style={[styles.iconTile, { backgroundColor: Colors.nutrition }]}>
                  <Salad size={22} color={Colors.white} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nutritionCardTitle}>{t('dashboard.todaysNutrition')}</Text>
                  <Text style={styles.nutritionCardSub}>
                    {hasMealsToday ? `${todayMeals.length} ${todayMeals.length === 1 ? 'meal' : 'meals'} logged` : 'No meals yet'}
                  </Text>
                </View>
                <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
                  <ChevronDown size={20} color={Colors.textTertiary} />
                </Animated.View>
              </View>

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
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              activeOpacity={0.7}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/steps-history' as any);
              }}
              testID="steps-card"
            >
              <View style={[styles.iconTile, { backgroundColor: Colors.physicalActivity }]}>
                <Footprints size={22} color={Colors.white} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.statHeaderRow}>
                  <Text style={styles.statTitle}>{t('dashboard.stepsCount')}</Text>
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
                <Text style={styles.statSub}>
                  {dailySteps.toLocaleString()} / {stepGoal.toLocaleString()}
                </Text>
                {stepsPermissionStatus === 'loading' ? (
                  <Text style={styles.statFootText}>{t('dashboard.checking')}</Text>
                ) : (
                  <>
                    <View style={styles.slimBarBg}>
                      <Animated.View style={[styles.slimBarFill, { width: stepProgress, backgroundColor: Colors.physicalActivity }]} />
                      {yesterdaySteps > 0 && (
                        <View
                          style={[
                            styles.slimYdayMarker,
                            { left: `${Math.min((yesterdaySteps / stepGoal) * 100, 100)}%` },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.statFooterRow}>
                      <Flame size={13} color={Colors.physicalActivity} fill={dailySteps > 0 ? Colors.physicalActivity : 'transparent'} />
                      <Text style={[styles.statFootText, { color: Colors.physicalActivity }]}>
                        {(() => {
                          if (dailySteps === 0 && yesterdaySteps === 0) return `${Math.round((dailySteps / stepGoal) * 100)}%`;
                          if (yesterdaySteps === 0) return t('dashboard.startWalking');
                          if (dailySteps >= yesterdaySteps) return t('dashboard.beatYesterday');
                          return t('dashboard.keepGoing', { steps: yesterdaySteps.toLocaleString() });
                        })()}
                      </Text>
                    </View>
                  </>
                )}
              </View>
              <ChevronRight size={20} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              activeOpacity={0.7}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/activity-history' as any);
              }}
              testID="calories-card"
            >
              <View style={[styles.iconTile, { backgroundColor: '#FF7A3D' }]}>
                <Flame size={22} color={Colors.white} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statTitle}>{t('dashboard.caloriesBurnt2')}</Text>
                <Text style={styles.statSub}>{totalCaloriesBurnt.toLocaleString()} {t('dashboard.kcal')}</Text>
                <View style={styles.slimBarBg}>
                  <View style={[styles.slimBarFill, {
                    width: totalCaloriesBurnt > 0 ? `${Math.min(100, (stepsCalories / Math.max(totalCaloriesBurnt, 1)) * 100)}%` as any : '0%',
                    backgroundColor: Colors.physicalActivity,
                  }]} />
                  <View style={[styles.slimBarFillOverlay, {
                    left: totalCaloriesBurnt > 0 ? `${Math.min(100, (stepsCalories / Math.max(totalCaloriesBurnt, 1)) * 100)}%` as any : '0%',
                    width: totalCaloriesBurnt > 0 ? `${Math.min(100, (activityCalories / Math.max(totalCaloriesBurnt, 1)) * 100)}%` as any : '0%',
                    backgroundColor: '#7E57C2',
                  }]} />
                </View>
                <View style={styles.statFooterRow}>
                  <View style={[styles.dotMini, { backgroundColor: Colors.physicalActivity }]} />
                  <Text style={styles.statFootText}>{t('dashboard.stepsBreakdown')} {stepsCalories}</Text>
                  <View style={[styles.dotMini, { backgroundColor: '#7E57C2', marginLeft: 8 }]} />
                  <Text style={styles.statFootText}>{t('dashboard.activityBreakdown')} {activityCalories}</Text>
                </View>
              </View>
              <ChevronRight size={20} color={Colors.textTertiary} />
            </TouchableOpacity>

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
                    <View style={[styles.actionIconWrap, { backgroundColor: action.color, shadowColor: action.color }]}>
                      <IconComp size={24} color={Colors.white} strokeWidth={2.2} />
                    </View>
                    <Text style={styles.actionLabel}>{t(action.labelKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>{t('dashboard.explore')}</Text>
            <View style={styles.exploreRow}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/missions' as any);
                }}
                activeOpacity={0.7}
                testID="missions-btn"
              >
                <View style={[styles.actionIconWrap, { backgroundColor: Colors.sleep, shadowColor: Colors.sleep }]}>
                  <Target size={24} color={Colors.white} strokeWidth={2.2} />
                </View>
                <Text style={styles.actionLabel}>{t('dashboard.missions')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/weekly-report' as any);
                }}
                activeOpacity={0.7}
                testID="report-btn"
              >
                <View style={[styles.actionIconWrap, { backgroundColor: Colors.mood, shadowColor: Colors.mood }]}>
                  <BarChart3 size={24} color={Colors.white} strokeWidth={2.2} />
                </View>
                <Text style={styles.actionLabel}>{t('dashboard.weeklyReport')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.exploreRow}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/health-markers' as any);
                }}
                activeOpacity={0.7}
                testID="health-markers-btn"
              >
                <View style={[styles.actionIconWrap, { backgroundColor: Colors.socialConnection, shadowColor: Colors.socialConnection }]}>
                  <Beaker size={24} color={Colors.white} strokeWidth={2.2} />
                </View>
                <Text style={styles.actionLabel}>{t('dashboard.healthMarkers')}</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
            </View>

            <TodaysTasksCard
              tasks={todaysTasks}
              onToggle={toggleTask}
            />

            <CoachTipCard tip={coachTip} />
          </ScrollView>
        </Animated.View>
      </SafeAreaView>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeTop: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 90, paddingTop: 8 },
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
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F3F6',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  nutritionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconTile: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 2, borderColor: Colors.white,
  },
  nutritionCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  nutritionCardSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F3F6',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  statHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  statTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.2 },
  statSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, marginBottom: 8 },
  slimBarBg: {
    height: 6, backgroundColor: Colors.inputBg, borderRadius: 3,
    overflow: 'hidden' as const, position: 'relative' as const,
  },
  slimBarFill: { height: 6, borderRadius: 3, maxWidth: '100%' },
  slimBarFillOverlay: {
    position: 'absolute' as const, top: 0, height: 6, borderRadius: 3,
  },
  slimYdayMarker: {
    position: 'absolute' as const, top: -2, width: 2, height: 10,
    backgroundColor: Colors.textTertiary, borderRadius: 1, transform: [{ translateX: -1 }],
  },
  statFooterRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    gap: 6, marginTop: 8,
  },
  statFootText: { fontSize: 12, fontWeight: '600' as const, color: Colors.textTertiary, flexShrink: 1 },
  dotMini: { width: 6, height: 6, borderRadius: 3 },
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
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
