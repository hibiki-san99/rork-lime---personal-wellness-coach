import Colors from './colors';
import { Badge, DailyTip, Team } from '@/types';

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
  { id: 'first_meal', name: 'First Bite', description: 'Log your first meal', icon: '🍽️', earned: false, color: Colors.nutrition },
  { id: 'plant_power', name: 'Plant Power', description: 'Log 3+ plant categories in one meal', icon: '🌱', earned: false, color: Colors.nutrition },
  { id: 'week_streak', name: 'Week Warrior', description: 'Log something every day for 7 days', icon: '🔥', earned: false, color: Colors.physicalActivity },
  { id: 'first_journal', name: 'Open Book', description: 'Write your first journal entry', icon: '📖', earned: false, color: Colors.stressManagement },
  { id: 'sleep_master', name: 'Sleep Master', description: 'Log 7 nights of sleep', icon: '😴', earned: false, color: Colors.sleep },
  { id: 'step_goal', name: 'Step Star', description: 'Meet your daily step goal', icon: '⭐', earned: false, color: Colors.physicalActivity },
  { id: 'social_butterfly', name: 'Team Player', description: 'Reach top 3 on your team leaderboard', icon: '🦋', earned: false, color: Colors.socialConnection },
  { id: 'century', name: 'Century Club', description: 'Earn 100 points in a single day', icon: '💯', earned: false, color: Colors.physicalActivity },
  { id: 'five_meals', name: 'Meal Prep Pro', description: 'Log 5 meals', icon: '👨‍🍳', earned: false, color: Colors.nutrition },
  { id: 'first_activity', name: 'Get Moving', description: 'Log your first activity', icon: '🏃', earned: false, color: Colors.physicalActivity },
];

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
