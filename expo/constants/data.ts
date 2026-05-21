import Colors from './colors';
import { Badge, DailyTip, Team, UserState } from '@/types';

export const FOOD_CATEGORIES = [
  { id: 'whole_grains', label: 'Whole Grains', icon: '🌾' },
  { id: 'legumes', label: 'Legumes', icon: '🫘' },
  { id: 'leafy_greens', label: 'Leafy Greens', icon: '🥬' },
  { id: 'other_vegetables', label: 'Other Vegetables', icon: '🥕' },
  { id: 'fruits', label: 'Fruits', icon: '🍎' },
  { id: 'nuts_seeds', label: 'Nuts & Seeds', icon: '🥜' },
  { id: 'processed_foods', label: 'Processed Foods', icon: '🍔' },
  { id: 'animal_products', label: 'Animal Products', icon: '🥩' },
];

export const JOURNAL_PROMPTS = [
  { day: 0, theme: 'Reflection', prompt: 'What is one thing you learned about yourself this week that surprised you?' },
  { day: 1, theme: 'Gratitude', prompt: 'Name three small moments from today that brought you genuine joy or comfort.' },
  { day: 2, theme: 'Looking Forward', prompt: 'What is one positive change you want to make this week, and what is the smallest first step?' },
  { day: 3, theme: 'Self-Compassion', prompt: 'Write a kind message to yourself about something you have been struggling with.' },
  { day: 4, theme: 'Wins', prompt: 'What are three things — big or small — that you accomplished recently that you are proud of?' },
  { day: 5, theme: 'Presence', prompt: 'Describe what you can see, hear, and feel right now. How does being present make you feel?' },
  { day: 6, theme: 'Reset', prompt: 'If you could let go of one worry or habit this week, what would it be and why?' },
];

export const ACTIVITY_TYPES = [
  'Walking', 'Running', 'Cycling', 'Swimming', 'Yoga',
  'Strength Training', 'HIIT', 'Pilates', 'Dancing',
  'Tennis', 'Basketball', 'Hiking', 'Rowing', 'Stretching',
  'Padel', 'Calisthenics', 'CrossFit', 'Other',
];

export const DAILY_TIPS: DailyTip[] = [
  { id: '1', pillar: 'Nutrition', tip: 'Try adding one extra serving of vegetables to your lunch today. Colour variety is key.', microGoal: 'Add a side salad or extra veggies to one meal', color: Colors.nutrition },
  { id: '2', pillar: 'Physical Activity', tip: 'Sitting for long periods increases health risks. Break it up with short walks.', microGoal: 'Stand up from your chair every hour for 2 minutes', color: Colors.physicalActivity },
  { id: '3', pillar: 'Sleep', tip: 'Blue light from screens can delay melatonin release by up to 3 hours.', microGoal: 'Put your phone away 30 minutes before bed tonight', color: Colors.sleep },
  { id: '4', pillar: 'Stress Management', tip: 'Deep breathing activates the parasympathetic nervous system, reducing cortisol.', microGoal: 'Take 5 slow, deep breaths before your next meeting', color: Colors.stressManagement },
  { id: '5', pillar: 'Social Connection', tip: 'Meaningful social connections can reduce risk of premature death by 50%.', microGoal: 'Send a genuine check-in message to a colleague or friend', color: Colors.socialConnection },
  { id: '6', pillar: 'Risky Substances', tip: 'Even moderate alcohol consumption is linked to increased cancer risk.', microGoal: 'Choose a non-alcoholic drink at your next social event', color: Colors.riskySubstances },
  { id: '7', pillar: 'Nutrition', tip: 'Eating 30 different plant foods per week dramatically improves gut microbiome diversity.', microGoal: 'Try one new fruit or vegetable you have not eaten this week', color: Colors.nutrition },
  { id: '8', pillar: 'Physical Activity', tip: 'Just 11 minutes of moderate activity per day can reduce mortality risk by 25%.', microGoal: 'Take a brisk 10-minute walk after lunch', color: Colors.physicalActivity },
  { id: '9', pillar: 'Sleep', tip: 'Consistent sleep and wake times are more important than total hours.', microGoal: 'Set an alarm to start winding down at the same time tonight', color: Colors.sleep },
  { id: '10', pillar: 'Stress Management', tip: 'Writing down worries before bed can reduce sleep onset time by 50%.', microGoal: 'Write down three things on your mind before you sleep', color: Colors.stressManagement },
  { id: '11', pillar: 'Social Connection', tip: 'Eating meals with others is associated with better food choices and mental wellbeing.', microGoal: 'Invite a colleague to eat lunch together today', color: Colors.socialConnection },
  { id: '12', pillar: 'Risky Substances', tip: 'Excess sugar consumption contributes to inflammation and metabolic disease.', microGoal: 'Replace one sugary drink with water or herbal tea today', color: Colors.riskySubstances },
  { id: '13', pillar: 'Nutrition', tip: 'Fibre feeds beneficial gut bacteria. Most adults only get half the recommended daily intake.', microGoal: 'Choose a whole grain option at your next meal', color: Colors.nutrition },
  { id: '14', pillar: 'Physical Activity', tip: 'Strength training twice per week preserves muscle mass and bone density as you age.', microGoal: 'Do 10 bodyweight squats right now', color: Colors.physicalActivity },
];

export const DEFAULT_BADGES: Badge[] = [
  // === Nutrition ===
  { id: 'first_meal', name: 'First Bite', description: 'Log your first meal', icon: '🍽️', earned: false, color: Colors.nutrition, tier: 'bronze', category: 'nutrition' },
  { id: 'five_meals', name: 'Meal Prep Pro', description: 'Log 5 meals', icon: '👨‍🍳', earned: false, color: Colors.nutrition, tier: 'bronze', category: 'nutrition' },
  { id: 'meals_25', name: 'Sous Chef', description: 'Log 25 meals', icon: '🥘', earned: false, color: Colors.nutrition, tier: 'silver', category: 'nutrition' },
  { id: 'meals_50', name: 'Head Chef', description: 'Log 50 meals', icon: '🍱', earned: false, color: Colors.nutrition, tier: 'gold', category: 'nutrition' },
  { id: 'meals_100', name: 'Master Chef', description: 'Log 100 meals', icon: '🏆', earned: false, color: Colors.nutrition, tier: 'platinum', category: 'nutrition' },
  { id: 'plant_power', name: 'Plant Power', description: 'Log 3+ plant categories in one meal', icon: '🌱', earned: false, color: Colors.nutrition, tier: 'bronze', category: 'nutrition' },
  { id: 'garden_master', name: 'Garden Master', description: 'Log 5+ plant categories in one meal', icon: '🌿', earned: false, color: Colors.nutrition, tier: 'silver', category: 'nutrition' },
  { id: 'rainbow_plate', name: 'Rainbow Plate', description: 'Log all 6 plant categories in one meal', icon: '🌈', earned: false, color: Colors.nutrition, tier: 'gold', category: 'nutrition' },
  { id: 'plant_streak_7', name: 'Plant Devotee', description: 'Log a plant-rich meal 7 days in a row', icon: '🥗', earned: false, color: Colors.nutrition, tier: 'silver', category: 'nutrition' },
  { id: 'clean_eater', name: 'Clean Eater', description: 'Log 10 meals with no processed foods', icon: '🥦', earned: false, color: Colors.nutrition, tier: 'silver', category: 'nutrition' },

  // === Activity ===
  { id: 'first_activity', name: 'Get Moving', description: 'Log your first activity', icon: '🏃', earned: false, color: Colors.physicalActivity, tier: 'bronze', category: 'activity' },
  { id: 'activity_10', name: 'Regular Mover', description: 'Log 10 activities', icon: '🤸', earned: false, color: Colors.physicalActivity, tier: 'bronze', category: 'activity' },
  { id: 'activity_25', name: 'Workout Warrior', description: 'Log 25 activities', icon: '💪', earned: false, color: Colors.physicalActivity, tier: 'silver', category: 'activity' },
  { id: 'activity_50', name: 'Fitness Fiend', description: 'Log 50 activities', icon: '🏋️', earned: false, color: Colors.physicalActivity, tier: 'gold', category: 'activity' },
  { id: 'activity_100', name: 'Iron Athlete', description: 'Log 100 activities', icon: '🥇', earned: false, color: Colors.physicalActivity, tier: 'platinum', category: 'activity' },
  { id: 'vigorous_5', name: 'Heart Pumper', description: 'Complete 5 vigorous workouts', icon: '🔥', earned: false, color: Colors.physicalActivity, tier: 'silver', category: 'activity' },
  { id: 'vigorous_20', name: 'Beast Mode', description: 'Complete 20 vigorous workouts', icon: '⚡', earned: false, color: Colors.physicalActivity, tier: 'gold', category: 'activity' },
  { id: 'variety_athlete', name: 'Variety Athlete', description: 'Try 5 different activity types', icon: '🎯', earned: false, color: Colors.physicalActivity, tier: 'silver', category: 'activity' },
  { id: 'long_haul', name: 'Long Haul', description: 'Complete a 90+ minute session', icon: '⏱️', earned: false, color: Colors.physicalActivity, tier: 'silver', category: 'activity' },

  // === Steps ===
  { id: 'step_goal', name: 'Step Star', description: 'Hit your 10,000 step goal', icon: '⭐', earned: false, color: Colors.physicalActivity, tier: 'bronze', category: 'steps' },
  { id: 'fifteen_k', name: '15K Trekker', description: 'Walk 15,000 steps in a day', icon: '🥾', earned: false, color: Colors.physicalActivity, tier: 'silver', category: 'steps' },
  { id: 'twenty_k', name: '20K Marathoner', description: 'Walk 20,000 steps in a day', icon: '🏅', earned: false, color: Colors.physicalActivity, tier: 'gold', category: 'steps' },
  { id: 'step_streak_3', name: 'Walking Habit', description: 'Hit step goal 3 days in a row', icon: '👟', earned: false, color: Colors.physicalActivity, tier: 'bronze', category: 'steps' },
  { id: 'step_streak_7', name: 'Step Streaker', description: 'Hit step goal 7 days in a row', icon: '🦶', earned: false, color: Colors.physicalActivity, tier: 'silver', category: 'steps' },

  // === Sleep ===
  { id: 'first_sleep', name: 'Good Night', description: 'Log your first night of sleep', icon: '🌙', earned: false, color: Colors.sleep, tier: 'bronze', category: 'sleep' },
  { id: 'sleep_master', name: 'Sleep Master', description: 'Log 7 nights of sleep', icon: '😴', earned: false, color: Colors.sleep, tier: 'silver', category: 'sleep' },
  { id: 'sleep_30', name: 'Dream Keeper', description: 'Log 30 nights of sleep', icon: '🛌', earned: false, color: Colors.sleep, tier: 'gold', category: 'sleep' },
  { id: 'full_eight', name: 'Full Eight', description: 'Sleep 8+ hours in a single night', icon: '🌜', earned: false, color: Colors.sleep, tier: 'bronze', category: 'sleep' },
  { id: 'refreshed_5', name: 'Well Rested', description: 'Wake up refreshed 5 times', icon: '🌅', earned: false, color: Colors.sleep, tier: 'silver', category: 'sleep' },
  { id: 'sleep_consistent', name: 'Sleep Rhythm', description: 'Maintain a consistent bedtime for 7 nights', icon: '⏰', earned: false, color: Colors.sleep, tier: 'gold', category: 'sleep' },

  // === Journal ===
  { id: 'first_journal', name: 'Open Book', description: 'Write your first journal entry', icon: '📖', earned: false, color: Colors.stressManagement, tier: 'bronze', category: 'journal' },
  { id: 'journal_7', name: 'Reflective', description: 'Write 7 journal entries', icon: '📓', earned: false, color: Colors.stressManagement, tier: 'silver', category: 'journal' },
  { id: 'journal_30', name: 'Inner Sage', description: 'Write 30 journal entries', icon: '✍️', earned: false, color: Colors.stressManagement, tier: 'gold', category: 'journal' },
  { id: 'deep_thinker', name: 'Deep Thinker', description: 'Write 5 entries of 100+ words', icon: '🧠', earned: false, color: Colors.stressManagement, tier: 'silver', category: 'journal' },
  { id: 'gratitude_master', name: 'Gratitude Master', description: 'Write 10 positive journal entries', icon: '🙏', earned: false, color: Colors.stressManagement, tier: 'gold', category: 'journal' },

  // === Points ===
  { id: 'century', name: 'Century Club', description: 'Earn 100 points in a single day', icon: '💯', earned: false, color: Colors.mood, tier: 'bronze', category: 'points' },
  { id: 'super_day', name: 'Super Day', description: 'Earn 200 points in a single day', icon: '🚀', earned: false, color: Colors.mood, tier: 'silver', category: 'points' },
  { id: 'points_500', name: 'High Roller', description: 'Earn 500 total points', icon: '🎖️', earned: false, color: Colors.mood, tier: 'bronze', category: 'points' },
  { id: 'points_1000', name: 'Four Figures', description: 'Earn 1,000 total points', icon: '🏵️', earned: false, color: Colors.mood, tier: 'silver', category: 'points' },
  { id: 'points_5000', name: 'Elite Five', description: 'Earn 5,000 total points', icon: '👑', earned: false, color: Colors.mood, tier: 'gold', category: 'points' },
  { id: 'points_10000', name: 'Legendary', description: 'Earn 10,000 total points', icon: '💎', earned: false, color: Colors.mood, tier: 'platinum', category: 'points' },

  // === Streak ===
  { id: 'week_streak', name: 'Week Warrior', description: 'Log something 7 days in a row', icon: '🔥', earned: false, color: Colors.mood, tier: 'silver', category: 'streak' },
  { id: 'two_week_streak', name: 'Fortnight Fighter', description: 'Log something 14 days in a row', icon: '🌟', earned: false, color: Colors.mood, tier: 'gold', category: 'streak' },
  { id: 'month_streak', name: 'Unstoppable', description: 'Log something 30 days in a row', icon: '🏆', earned: false, color: Colors.mood, tier: 'platinum', category: 'streak' },

  // === Health ===
  { id: 'health_tracker', name: 'Health Tracker', description: 'Log 5 health markers', icon: '🔬', earned: false, color: Colors.socialConnection, tier: 'bronze', category: 'health' },
  { id: 'health_pro', name: 'Health Pro', description: 'Log 25 health markers', icon: '🩺', earned: false, color: Colors.socialConnection, tier: 'silver', category: 'health' },
  { id: 'weight_logger', name: 'Scale Watcher', description: 'Log weight 10 times', icon: '⚖️', earned: false, color: Colors.socialConnection, tier: 'silver', category: 'health' },
  { id: 'bp_tracker', name: 'Pressure Watch', description: 'Log blood pressure 10 times', icon: '❤️', earned: false, color: Colors.socialConnection, tier: 'silver', category: 'health' },

  // === Wellness ===
  { id: 'balanced_day', name: 'Balanced Day', description: 'Log meal, activity, sleep & journal in one day', icon: '☯️', earned: false, color: Colors.primary, tier: 'silver', category: 'wellness' },
  { id: 'four_pillars', name: 'Four Pillars', description: 'Reach a balanced day 7 times', icon: '🏛️', earned: false, color: Colors.primary, tier: 'gold', category: 'wellness' },
  { id: 'first_tip', name: 'Curious Mind', description: 'Complete your first daily tip', icon: '💡', earned: false, color: Colors.mood, tier: 'bronze', category: 'wellness' },
  { id: 'tip_master', name: 'Tip Master', description: 'Complete 10 daily tips', icon: '🎓', earned: false, color: Colors.mood, tier: 'silver', category: 'wellness' },

  // === Milestone / Social ===
  { id: 'onboarder', name: 'Welcome Aboard', description: 'Complete your onboarding', icon: '🎉', earned: false, color: Colors.primary, tier: 'bronze', category: 'milestone' },
  { id: 'mission_starter', name: 'Mission Started', description: 'Enroll in your first mission', icon: '🚩', earned: false, color: Colors.primary, tier: 'bronze', category: 'milestone' },
  { id: 'mission_finisher', name: 'Mission Complete', description: 'Finish your first mission', icon: '🎯', earned: false, color: Colors.primary, tier: 'silver', category: 'milestone' },
  { id: 'mission_triple', name: 'Triple Threat', description: 'Finish 3 missions', icon: '🏵️', earned: false, color: Colors.primary, tier: 'gold', category: 'milestone' },
  { id: 'social_butterfly', name: 'Team Player', description: 'Reach top 3 on your team leaderboard', icon: '🦋', earned: false, color: Colors.socialConnection, tier: 'silver', category: 'social' },
  { id: 'top_dog', name: 'Top of the Pack', description: 'Reach #1 on your team leaderboard', icon: '👑', earned: false, color: Colors.socialConnection, tier: 'gold', category: 'social' },
];

const PLANT_CATS = ['whole_grains', 'legumes', 'leafy_greens', 'other_vegetables', 'fruits', 'nuts_seeds'];
const POSITIVE_KEYWORDS = ['grateful', 'thankful', 'happy', 'joy', 'proud', 'accomplished', 'hopeful', 'love', 'peace', 'calm', 'motivated', 'inspired'];

function computeLongestStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1] as string).getTime();
    const curr = new Date(sortedDates[i] as string).getTime();
    const diffDays = Math.round((curr - prev) / 86_400_000);
    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else if (diffDays > 1) {
      current = 1;
    }
  }
  return longest;
}

function timeToMinutes(hhmm: string): number {
  const parts = hhmm.split(':').map(Number);
  return ((parts[0] ?? 0) * 60) + (parts[1] ?? 0);
}

/**
 * Evaluate which badges should be earned for the given user state and return the updated Badge list.
 * Pure: never un-earns a badge.
 */
export function evaluateBadges(state: UserState, dailySteps: number): { badges: Badge[]; newlyEarnedIds: string[] } {
  const badges = state.badges.map(b => ({ ...b }));
  const now = new Date().toISOString();
  const newlyEarnedIds: string[] = [];

  const earn = (id: string) => {
    const b = badges.find(x => x.id === id);
    if (b && !b.earned) {
      b.earned = true;
      b.earnedDate = now;
      newlyEarnedIds.push(id);
    }
  };

  // Nutrition
  const mealCount = state.mealLogs.length;
  if (mealCount >= 1) earn('first_meal');
  if (mealCount >= 5) earn('five_meals');
  if (mealCount >= 25) earn('meals_25');
  if (mealCount >= 50) earn('meals_50');
  if (mealCount >= 100) earn('meals_100');

  const maxPlants = state.mealLogs.reduce((max, m) => {
    const p = m.categories.filter(c => PLANT_CATS.includes(c)).length;
    return p > max ? p : max;
  }, 0);
  if (maxPlants >= 3) earn('plant_power');
  if (maxPlants >= 5) earn('garden_master');
  if (maxPlants >= 6) earn('rainbow_plate');

  const cleanMeals = state.mealLogs.filter(m => !m.categories.includes('processed_foods')).length;
  if (cleanMeals >= 10) earn('clean_eater');

  // Plant streak: 7 consecutive days with at least one plant-rich (>=3 plant cats) meal
  const plantDates = Array.from(new Set(
    state.mealLogs
      .filter(m => m.categories.filter(c => PLANT_CATS.includes(c)).length >= 3)
      .map(m => m.date)
  )).sort();
  if (computeLongestStreak(plantDates) >= 7) earn('plant_streak_7');

  // Activity
  const actCount = state.activityLogs.length;
  if (actCount >= 1) earn('first_activity');
  if (actCount >= 10) earn('activity_10');
  if (actCount >= 25) earn('activity_25');
  if (actCount >= 50) earn('activity_50');
  if (actCount >= 100) earn('activity_100');

  const vigorousCount = state.activityLogs.filter(a => a.intensity === 'vigorous').length;
  if (vigorousCount >= 5) earn('vigorous_5');
  if (vigorousCount >= 20) earn('vigorous_20');

  const uniqueTypes = new Set(state.activityLogs.map(a => a.type)).size;
  if (uniqueTypes >= 5) earn('variety_athlete');

  if (state.activityLogs.some(a => a.durationMinutes >= 90)) earn('long_haul');

  // Sleep
  const sleepCount = state.sleepLogs.length;
  if (sleepCount >= 1) earn('first_sleep');
  if (sleepCount >= 7) earn('sleep_master');
  if (sleepCount >= 30) earn('sleep_30');

  const hasFullEight = state.sleepLogs.some(s => calculateSleepHours(s.bedtime, s.wakeTime) >= 8);
  if (hasFullEight) earn('full_eight');

  const refreshedCount = state.sleepLogs.filter(s => s.wakeFeeling === 'refreshed').length;
  if (refreshedCount >= 5) earn('refreshed_5');

  // Consistent bedtime: 7 most recent sleeps, bedtimes within 60 min range
  if (state.sleepLogs.length >= 7) {
    const recent = [...state.sleepLogs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 7);
    const minutes = recent.map(s => timeToMinutes(s.bedtime));
    const min = Math.min(...minutes);
    const max = Math.max(...minutes);
    if (max - min <= 60) earn('sleep_consistent');
  }

  // Journal
  const journalCount = state.journalLogs.length;
  if (journalCount >= 1) earn('first_journal');
  if (journalCount >= 7) earn('journal_7');
  if (journalCount >= 30) earn('journal_30');

  const deepEntries = state.journalLogs.filter(j => j.entry.trim().split(/\s+/).length >= 100).length;
  if (deepEntries >= 5) earn('deep_thinker');

  const positiveEntries = state.journalLogs.filter(j => {
    const lower = j.entry.toLowerCase();
    return POSITIVE_KEYWORDS.some(w => lower.includes(w));
  }).length;
  if (positiveEntries >= 10) earn('gratitude_master');

  // Points
  if (state.totalPoints >= 500) earn('points_500');
  if (state.totalPoints >= 1000) earn('points_1000');
  if (state.totalPoints >= 5000) earn('points_5000');
  if (state.totalPoints >= 10000) earn('points_10000');

  // Today points: century / super day
  const todayStr = new Date().toISOString().split('T')[0] ?? '';
  const todayPts =
    [...state.mealLogs, ...state.activityLogs, ...state.sleepLogs, ...state.journalLogs]
      .filter(l => l.date === todayStr).reduce((s, l) => s + (l.points ?? 0), 0)
    + state.tipCompletions.filter(t => t.date === todayStr).reduce((s, t) => s + (t.points ?? 0), 0);
  if (todayPts >= 100) earn('century');
  if (todayPts >= 200) earn('super_day');

  // Balanced day & four pillars
  const balancedDays = new Set<string>();
  const dayHas = (d: string, logs: { date: string }[]) => logs.some(l => l.date === d);
  const allDays = new Set<string>([
    ...state.mealLogs.map(l => l.date),
    ...state.activityLogs.map(l => l.date),
    ...state.sleepLogs.map(l => l.date),
    ...state.journalLogs.map(l => l.date),
  ]);
  for (const d of allDays) {
    if (dayHas(d, state.mealLogs) && dayHas(d, state.activityLogs) && dayHas(d, state.sleepLogs) && dayHas(d, state.journalLogs)) {
      balancedDays.add(d);
    }
  }
  if (balancedDays.size >= 1) earn('balanced_day');
  if (balancedDays.size >= 7) earn('four_pillars');

  // Steps
  if (dailySteps >= 10000) earn('step_goal');
  if (dailySteps >= 15000) earn('fifteen_k');
  if (dailySteps >= 20000) earn('twenty_k');

  // Streak (any log per day)
  const sortedDates = Array.from(allDays).sort();
  const longestStreak = computeLongestStreak(sortedDates);
  if (longestStreak >= 7) earn('week_streak');
  if (longestStreak >= 14) earn('two_week_streak');
  if (longestStreak >= 30) earn('month_streak');

  // Health
  const markerCount = state.healthMarkers.length;
  if (markerCount >= 5) earn('health_tracker');
  if (markerCount >= 25) earn('health_pro');
  const weights = state.healthMarkers.filter(m => m.markerName === 'Weight').length;
  if (weights >= 10) earn('weight_logger');
  const bpReadings = state.healthMarkers.filter(m => m.markerName.toLowerCase().includes('blood pressure') || m.markerName === 'Systolic BP' || m.markerName === 'Diastolic BP').length;
  if (bpReadings >= 10) earn('bp_tracker');

  // Wellness
  if (state.tipCompletions.length >= 1) earn('first_tip');
  if (state.tipCompletions.length >= 10) earn('tip_master');

  // Milestone
  if (state.onboardingComplete) earn('onboarder');
  if (state.missionProgress.length >= 1) earn('mission_starter');
  const completedMissions = state.missionProgress.filter(m => !!m.completedAt).length;
  if (completedMissions >= 1) earn('mission_finisher');
  if (completedMissions >= 3) earn('mission_triple');

  return { badges, newlyEarnedIds };
}

/**
 * Merge any new badges from DEFAULT_BADGES into an existing user's badges list, preserving earned state.
 */
export function reconcileBadges(existing: Badge[] | undefined): Badge[] {
  const map = new Map<string, Badge>();
  for (const b of DEFAULT_BADGES) map.set(b.id, { ...b });
  for (const b of (existing ?? [])) {
    const cur = map.get(b.id);
    if (cur) {
      map.set(b.id, { ...cur, earned: b.earned || cur.earned, earnedDate: b.earnedDate ?? cur.earnedDate });
    } else {
      map.set(b.id, b);
    }
  }
  return Array.from(map.values());
}

export const MOCK_TEAMS: Team[] = [
  {
    id: '1', name: 'Wellness Warriors', totalPoints: 2450,
    members: [
      { id: 'm1', name: 'Sarah Chen', points: 680, avatarUrl: '' },
      { id: 'm2', name: 'James Okafor', points: 590, avatarUrl: '' },
      { id: 'm3', name: 'Priya Sharma', points: 520, avatarUrl: '' },
      { id: 'm4', name: 'Tom Mitchell', points: 410, avatarUrl: '' },
      { id: 'm5', name: 'Lisa Park', points: 250, avatarUrl: '' },
    ],
  },
  {
    id: '2', name: 'Health Heroes', totalPoints: 2180,
    members: [
      { id: 'm6', name: 'David Brown', points: 620, avatarUrl: '' },
      { id: 'm7', name: 'Emma Wilson', points: 550, avatarUrl: '' },
      { id: 'm8', name: 'Raj Patel', points: 480, avatarUrl: '' },
      { id: 'm9', name: 'Kate Murphy', points: 330, avatarUrl: '' },
      { id: 'm10', name: 'Chris Lee', points: 200, avatarUrl: '' },
    ],
  },
  {
    id: '3', name: 'Vitality Crew', totalPoints: 1920,
    members: [
      { id: 'm11', name: 'Anna Schmidt', points: 510, avatarUrl: '' },
      { id: 'm12', name: 'Mike Johnson', points: 470, avatarUrl: '' },
      { id: 'm13', name: 'Fatima Ali', points: 400, avatarUrl: '' },
      { id: 'm14', name: 'Ben Taylor', points: 310, avatarUrl: '' },
      { id: 'm15', name: 'Sophie Clark', points: 230, avatarUrl: '' },
    ],
  },
  {
    id: '4', name: 'Balance Squad', totalPoints: 1650,
    members: [
      { id: 'm16', name: 'Grace Kim', points: 440, avatarUrl: '' },
      { id: 'm17', name: 'Alex Rivera', points: 400, avatarUrl: '' },
      { id: 'm18', name: 'Hannah Webb', points: 350, avatarUrl: '' },
      { id: 'm19', name: 'Oscar Nguyen', points: 260, avatarUrl: '' },
      { id: 'm20', name: 'Zara Khan', points: 200, avatarUrl: '' },
    ],
  },
];

export const POINTS = {
  meal: 25,
  mealPlantBonus: 50,
  activity: 30,
  sleep: 20,
  journal: 25,
  stepGoal: 75,
  weeklyBonus: 100,

  mealBase: 10,
  mealPlantCategoryBonus: 5,
  mealPlantCategoryMax: 25,
  mealNoProcessedBonus: 10,
  mealNoAnimalBonus: 10,

  activityBase: 10,
  activityDurationBonus: 10,
  activityModerateBonus: 15,
  activityVigorousBonus: 25,

  sleepBase: 10,
  sleepDurationBonus: 15,
  sleepQualityBonus: 15,

  journalBase: 10,
  journalPositiveBonus: 10,
  journalLengthBonus: 10,
};

const PLANT_CATEGORIES = ['whole_grains', 'legumes', 'leafy_greens', 'other_vegetables', 'fruits', 'nuts_seeds'];

export function calculateMealPoints(categories: string[]): { total: number; breakdown: string[] } {
  const breakdown: string[] = [];
  let total = POINTS.mealBase;
  breakdown.push(`Base: +${POINTS.mealBase}`);

  const plantCount = categories.filter(c => PLANT_CATEGORIES.includes(c)).length;
  const plantBonus = Math.min(plantCount * POINTS.mealPlantCategoryBonus, POINTS.mealPlantCategoryMax);
  if (plantBonus > 0) {
    total += plantBonus;
    breakdown.push(`${plantCount} plant categor${plantCount === 1 ? 'y' : 'ies'}: +${plantBonus}`);
  }

  if (!categories.includes('processed_foods')) {
    total += POINTS.mealNoProcessedBonus;
    breakdown.push(`No processed foods: +${POINTS.mealNoProcessedBonus}`);
  }

  if (!categories.includes('animal_products')) {
    total += POINTS.mealNoAnimalBonus;
    breakdown.push(`No animal products: +${POINTS.mealNoAnimalBonus}`);
  }

  return { total, breakdown };
}

export function calculateActivityPoints(durationMinutes: number, intensity: 'light' | 'moderate' | 'vigorous'): { total: number; breakdown: string[] } {
  const breakdown: string[] = [];
  let total = POINTS.activityBase;
  breakdown.push(`Base: +${POINTS.activityBase}`);

  if (durationMinutes > 30) {
    total += POINTS.activityDurationBonus;
    breakdown.push(`>30 min: +${POINTS.activityDurationBonus}`);
  }

  if (intensity === 'moderate') {
    total += POINTS.activityModerateBonus;
    breakdown.push(`Moderate intensity: +${POINTS.activityModerateBonus}`);
  } else if (intensity === 'vigorous') {
    total += POINTS.activityVigorousBonus;
    breakdown.push(`Vigorous intensity: +${POINTS.activityVigorousBonus}`);
  }

  return { total, breakdown };
}

export function calculateSleepHours(bedtime: string, wakeTime: string): number {
  const bParts = bedtime.split(':').map(Number);
  const wParts = wakeTime.split(':').map(Number);
  const bH = bParts[0] ?? 0;
  const bM = bParts[1] ?? 0;
  const wH = wParts[0] ?? 0;
  const wM = wParts[1] ?? 0;
  let bedMinutes = bH * 60 + bM;
  let wakeMinutes = wH * 60 + wM;
  if (wakeMinutes <= bedMinutes) wakeMinutes += 24 * 60;
  return (wakeMinutes - bedMinutes) / 60;
}

export function calculateSleepPoints(bedtime: string, wakeTime: string, quality: number, wakeFeeling?: 'sleepy' | 'somewhat' | 'refreshed'): { total: number; breakdown: string[] } {
  const breakdown: string[] = [];
  let total = POINTS.sleepBase;
  breakdown.push(`Base: +${POINTS.sleepBase}`);

  const hours = calculateSleepHours(bedtime, wakeTime);
  if (hours >= 7) {
    total += POINTS.sleepDurationBonus;
    breakdown.push(`≥7 hours (${hours.toFixed(1)}h): +${POINTS.sleepDurationBonus}`);
  }

  if (wakeFeeling) {
    const feelingBonus = wakeFeeling === 'refreshed' ? 15 : wakeFeeling === 'somewhat' ? 8 : 0;
    if (feelingBonus > 0) {
      total += feelingBonus;
      const label = wakeFeeling === 'refreshed' ? 'Fully refreshed' : 'Somewhat refreshed';
      breakdown.push(`${label}: +${feelingBonus}`);
    } else {
      breakdown.push('Still sleepy: +0');
    }
  } else if (quality >= 4) {
    total += POINTS.sleepQualityBonus;
    breakdown.push(`Quality ≥4: +${POINTS.sleepQualityBonus}`);
  }

  return { total, breakdown };
}

const POSITIVE_WORDS = [
  'grateful', 'thankful', 'happy', 'joy', 'proud', 'accomplished', 'better',
  'hopeful', 'love', 'peace', 'calm', 'motivated', 'inspired', 'clarity',
  'positive', 'growth', 'learn', 'improve', 'wonderful', 'great', 'amazing',
  'beautiful', 'kind', 'appreciate', 'blessing', 'progress', 'optimistic',
  'confident', 'strong', 'resilient', 'excited', 'content', 'serene',
];

export function calculateJournalPoints(entry: string): { total: number; breakdown: string[] } {
  const breakdown: string[] = [];
  let total = POINTS.journalBase;
  breakdown.push(`Base: +${POINTS.journalBase}`);

  const words = entry.trim().split(/\s+/);
  const wordCount = words.length;
  const lowerEntry = entry.toLowerCase();
  const hasPositive = POSITIVE_WORDS.some(w => lowerEntry.includes(w));

  if (hasPositive) {
    total += POINTS.journalPositiveBonus;
    breakdown.push(`Positive/clarity: +${POINTS.journalPositiveBonus}`);
  }

  if (wordCount > 50) {
    total += POINTS.journalLengthBonus;
    breakdown.push(`>50 words (${wordCount}): +${POINTS.journalLengthBonus}`);
  }

  return { total, breakdown };
}

export const TEAM_NAMES = [
  'Wellness Warriors',
  'Health Heroes',
  'Vitality Crew',
  'Balance Squad',
];
