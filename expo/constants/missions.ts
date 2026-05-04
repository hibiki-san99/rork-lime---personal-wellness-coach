import Colors from './colors';
import { MissionModule, MealLog, ActivityLog, SleepLog, JournalLog } from '@/types';
import { calculateSleepHours } from '@/constants/data';

export const MISSION_MODULES: MissionModule[] = [
  {
    id: 'nutrition',
    name: 'Nutrition',
    icon: '🥗',
    color: Colors.nutrition,
    description: 'Build healthier eating habits one meal at a time',
    goals: [
      { id: 'n1', moduleId: 'nutrition', title: 'Add a side salad to lunch 3 days this week', description: 'Boost your vegetable intake with a simple salad at lunch', points: 15 },
      { id: 'n2', moduleId: 'nutrition', title: 'Eat 5 different coloured vegetables today', description: 'Colour variety means nutrient variety', points: 20 },
      { id: 'n3', moduleId: 'nutrition', title: 'Replace one sugary drink with water daily for 3 days', description: 'Reduce added sugar by swapping beverages', points: 15 },
      { id: 'n4', moduleId: 'nutrition', title: 'Try a new whole grain this week', description: 'Quinoa, bulgur, farro — expand your grain horizons', points: 20 },
      { id: 'n5', moduleId: 'nutrition', title: 'Prep a healthy snack for 3 workdays', description: 'Nuts, fruit, or veggie sticks — plan ahead', points: 15 },
      { id: 'n6', moduleId: 'nutrition', title: 'Cook one plant-based dinner this week', description: 'Try a meal without any animal products', points: 25 },
      { id: 'n7', moduleId: 'nutrition', title: 'Log every meal for 5 consecutive days', description: 'Awareness is the first step to better nutrition', points: 30 },
    ],
  },
  {
    id: 'activity',
    name: 'Physical Activity',
    icon: '🏃',
    color: Colors.physicalActivity,
    description: 'Move more, sit less — every step counts',
    goals: [
      { id: 'a1', moduleId: 'activity', title: 'Take a 10-min walk after lunch 3 days this week', description: 'A short post-meal walk improves blood sugar regulation', points: 15 },
      { id: 'a2', moduleId: 'activity', title: 'Do 10 bodyweight squats every morning for 5 days', description: 'Build a simple daily strength habit', points: 20 },
      { id: 'a3', moduleId: 'activity', title: 'Stand up every hour during work for a full day', description: 'Break up sitting time to reduce health risks', points: 15 },
      { id: 'a4', moduleId: 'activity', title: 'Complete 30 minutes of moderate exercise 3 times', description: 'Brisk walking, cycling, or swimming', points: 25 },
      { id: 'a5', moduleId: 'activity', title: 'Take the stairs instead of lift for 3 days', description: 'Small choices add up to big fitness gains', points: 15 },
      { id: 'a6', moduleId: 'activity', title: 'Try a new type of exercise this week', description: 'Yoga, dancing, swimming — mix it up', points: 20 },
      { id: 'a7', moduleId: 'activity', title: 'Hit 8,000 steps on 5 days this week', description: 'Consistent daily movement is key', points: 30 },
    ],
  },
  {
    id: 'sleep',
    name: 'Sleep',
    icon: '😴',
    color: Colors.sleep,
    description: 'Better sleep, better health — build a rest routine',
    goals: [
      { id: 's1', moduleId: 'sleep', title: 'Go to bed at the same time for 5 nights', description: 'Consistency is more important than duration', points: 20 },
      { id: 's2', moduleId: 'sleep', title: 'No screens 30 min before bed for 3 nights', description: 'Blue light delays melatonin release', points: 15 },
      { id: 's3', moduleId: 'sleep', title: 'Create a bedtime wind-down routine', description: 'Reading, stretching, or breathing exercises', points: 15 },
      { id: 's4', moduleId: 'sleep', title: 'Log your sleep for 5 consecutive nights', description: 'Track to understand your sleep patterns', points: 20 },
      { id: 's5', moduleId: 'sleep', title: 'Avoid caffeine after 2pm for 3 days', description: 'Caffeine has a half-life of 5-6 hours', points: 15 },
      { id: 's6', moduleId: 'sleep', title: 'Keep your bedroom cool and dark for a week', description: 'Optimal sleep environment makes a difference', points: 20 },
    ],
  },
  {
    id: 'stress',
    name: 'Stress Management',
    icon: '🧘',
    color: Colors.stressManagement,
    description: 'Build resilience through mindful practices',
    goals: [
      { id: 'st1', moduleId: 'stress', title: 'Practice 5 deep breaths before 3 meetings', description: 'Activate your parasympathetic nervous system', points: 15 },
      { id: 'st2', moduleId: 'stress', title: 'Write in your journal for 3 days this week', description: 'Expressive writing reduces stress hormones', points: 20 },
      { id: 'st3', moduleId: 'stress', title: 'Take a 5-min mindfulness break daily for 3 days', description: 'Pause, breathe, and notice your surroundings', points: 15 },
      { id: 'st4', moduleId: 'stress', title: 'Identify and write down 3 gratitude items today', description: 'Gratitude shifts focus from stress to abundance', points: 15 },
      { id: 'st5', moduleId: 'stress', title: 'Try a guided meditation or breathing exercise', description: 'Even 5 minutes can reduce cortisol levels', points: 20 },
      { id: 'st6', moduleId: 'stress', title: 'Spend 15 minutes on a hobby you enjoy', description: 'Creative activities are powerful stress relievers', points: 15 },
      { id: 'st7', moduleId: 'stress', title: 'Practice progressive muscle relaxation before bed', description: 'Tense and release each muscle group', points: 20 },
    ],
  },
  {
    id: 'social',
    name: 'Social Connection',
    icon: '👥',
    color: Colors.socialConnection,
    description: 'Strengthen relationships for better wellbeing',
    goals: [
      { id: 'so1', moduleId: 'social', title: 'Send a check-in message to a friend or colleague', description: 'A simple message can strengthen bonds', points: 15 },
      { id: 'so2', moduleId: 'social', title: 'Eat lunch with someone 3 times this week', description: 'Shared meals improve food choices and mood', points: 20 },
      { id: 'so3', moduleId: 'social', title: 'Call or video-chat with someone you care about', description: 'Voice connection is more impactful than text', points: 15 },
      { id: 'so4', moduleId: 'social', title: 'Offer to help a colleague with a task', description: 'Helping others boosts your own wellbeing', points: 15 },
      { id: 'so5', moduleId: 'social', title: 'Plan a social activity for this weekend', description: 'Having something to look forward to reduces stress', points: 20 },
      { id: 'so6', moduleId: 'social', title: 'Give a genuine compliment to 3 people today', description: 'Positivity is contagious', points: 15 },
    ],
  },
  {
    id: 'substances',
    name: 'Risky Substances',
    icon: '🚭',
    color: Colors.riskySubstances,
    description: 'Reduce harmful habits and make healthier choices',
    goals: [
      { id: 'r1', moduleId: 'substances', title: 'Choose a non-alcoholic drink at your next outing', description: 'Even moderate alcohol increases health risks', points: 15 },
      { id: 'r2', moduleId: 'substances', title: 'Go 3 days without added sugar in drinks', description: 'Excess sugar contributes to inflammation', points: 20 },
      { id: 'r3', moduleId: 'substances', title: 'Replace one processed snack with a whole food', description: 'Ultra-processed foods are linked to poor health', points: 15 },
      { id: 'r4', moduleId: 'substances', title: 'Track your caffeine intake for 3 days', description: 'Awareness helps you moderate consumption', points: 15 },
      { id: 'r5', moduleId: 'substances', title: 'Have an alcohol-free weekend', description: 'Give your liver a break', points: 25 },
      { id: 'r6', moduleId: 'substances', title: 'Read one article about substance health effects', description: 'Knowledge empowers better choices', points: 10 },
    ],
  },
];

export const POINTS_PER_TIP = 5;
export const POINTS_MODULE_COMPLETE = 100;

interface AutoCompletionResult {
  moduleId: string;
  goalId: string;
}

interface LogData {
  mealLogs: MealLog[];
  activityLogs: ActivityLog[];
  sleepLogs: SleepLog[];
  journalLogs: JournalLog[];
}

function getThisWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return {
    start: monday.toISOString().split('T')[0] ?? '',
    end: sunday.toISOString().split('T')[0] ?? '',
  };
}

export function getMissionAutoCompletions(data: LogData): AutoCompletionResult[] {
  const results: AutoCompletionResult[] = [];
  const week = getThisWeekRange();
  const inWeek = (date: string) => date >= week.start && date <= week.end;

  const weekMeals = data.mealLogs.filter(m => inWeek(m.date));
  const weekActivities = data.activityLogs.filter(a => inWeek(a.date));
  const weekSleepLogs = data.sleepLogs.filter(s => inWeek(s.date));
  const weekJournals = data.journalLogs.filter(j => inWeek(j.date));

  // --- NUTRITION ---
  const mealsWithVeggies = weekMeals.filter(m =>
    m.categories.some(c => ['leafy_greens', 'other_vegetables'].includes(c))
  );
  if (mealsWithVeggies.length >= 3) {
    results.push({ moduleId: 'nutrition', goalId: 'n1' });
  }

  const vegCategories = new Set<string>();
  weekMeals.forEach(m => {
    m.categories.forEach(c => {
      if (['leafy_greens', 'other_vegetables', 'fruits'].includes(c)) vegCategories.add(c);
    });
    m.foodItems.forEach(fi => {
      vegCategories.add(fi.name.toLowerCase());
    });
  });
  if (vegCategories.size >= 5) {
    results.push({ moduleId: 'nutrition', goalId: 'n2' });
  }

  const mealsWithWholeGrain = weekMeals.filter(m =>
    m.categories.includes('whole_grains')
  );
  if (mealsWithWholeGrain.length >= 1) {
    results.push({ moduleId: 'nutrition', goalId: 'n4' });
  }

  const mealsWithNutsOrFruit = weekMeals.filter(m =>
    m.categories.some(c => ['nuts_seeds', 'fruits'].includes(c))
  );
  if (mealsWithNutsOrFruit.length >= 3) {
    results.push({ moduleId: 'nutrition', goalId: 'n5' });
  }

  const plantBasedMeals = weekMeals.filter(m =>
    !m.categories.includes('animal_products') && m.categories.length > 0
  );
  if (plantBasedMeals.length >= 1) {
    results.push({ moduleId: 'nutrition', goalId: 'n6' });
  }

  const mealDays = new Set(weekMeals.map(m => m.date));
  const sortedDays = Array.from(mealDays).sort();
  let consecutiveMealDays = 1;
  let maxConsecutive = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1] + 'T00:00:00');
    const curr = new Date(sortedDays[i] + 'T00:00:00');
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      consecutiveMealDays++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveMealDays);
    } else {
      consecutiveMealDays = 1;
    }
  }
  if (maxConsecutive >= 5) {
    results.push({ moduleId: 'nutrition', goalId: 'n7' });
  }

  // --- ACTIVITY ---
  const walkingActivities = weekActivities.filter(a =>
    a.type.toLowerCase().includes('walk') && a.durationMinutes >= 10
  );
  if (walkingActivities.length >= 3) {
    results.push({ moduleId: 'activity', goalId: 'a1' });
  }

  const moderateOrAbove = weekActivities.filter(a =>
    a.durationMinutes >= 30 && (a.intensity === 'moderate' || a.intensity === 'vigorous')
  );
  if (moderateOrAbove.length >= 3) {
    results.push({ moduleId: 'activity', goalId: 'a4' });
  }

  const uniqueActivityTypes = new Set(weekActivities.map(a => a.type));
  if (uniqueActivityTypes.size >= 2) {
    results.push({ moduleId: 'activity', goalId: 'a6' });
  }

  // --- SLEEP ---
  const sleepDays = weekSleepLogs.map(s => s.date).sort();
  let consecutiveSleep = 1;
  let maxConsecSleep = 1;
  for (let i = 1; i < sleepDays.length; i++) {
    const prev = new Date(sleepDays[i - 1] + 'T00:00:00');
    const curr = new Date(sleepDays[i] + 'T00:00:00');
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      consecutiveSleep++;
      maxConsecSleep = Math.max(maxConsecSleep, consecutiveSleep);
    } else {
      consecutiveSleep = 1;
    }
  }
  if (maxConsecSleep >= 5) {
    results.push({ moduleId: 'sleep', goalId: 's4' });
  }

  const consistentBedtimes = weekSleepLogs.filter(s => {
    const hour = parseInt(s.bedtime.split(':')[0] ?? '0', 10);
    return hour >= 21 && hour <= 23;
  });
  if (consistentBedtimes.length >= 5) {
    results.push({ moduleId: 'sleep', goalId: 's1' });
  }

  const goodSleepLogs = weekSleepLogs.filter(s => {
    const hours = calculateSleepHours(s.bedtime, s.wakeTime);
    return hours >= 7 && s.quality >= 4;
  });
  if (goodSleepLogs.length >= 3) {
    results.push({ moduleId: 'sleep', goalId: 's6' });
  }

  // --- STRESS ---
  const journalDays = new Set(weekJournals.map(j => j.date));
  if (journalDays.size >= 3) {
    results.push({ moduleId: 'stress', goalId: 'st2' });
  }

  const gratitudeJournals = weekJournals.filter(j =>
    j.entry.toLowerCase().includes('grateful') ||
    j.entry.toLowerCase().includes('thankful') ||
    j.entry.toLowerCase().includes('gratitude') ||
    j.entry.toLowerCase().includes('appreciate')
  );
  if (gratitudeJournals.length >= 1) {
    results.push({ moduleId: 'stress', goalId: 'st4' });
  }

  // --- SUBSTANCES ---
  const noSugarMeals = weekMeals.filter(m => m.addedSugar === 'no');
  const noSugarDays = new Set(noSugarMeals.map(m => m.date));
  if (noSugarDays.size >= 3) {
    results.push({ moduleId: 'substances', goalId: 'r2' });
  }

  const wholeFood = weekMeals.filter(m =>
    !m.categories.includes('processed_foods') &&
    m.categories.some(c => ['fruits', 'nuts_seeds', 'other_vegetables'].includes(c))
  );
  if (wholeFood.length >= 1) {
    results.push({ moduleId: 'substances', goalId: 'r3' });
  }

  return results;
}
