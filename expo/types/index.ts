export type ActivityLevel = 'sedentary' | 'moderate' | 'active';

export type HealthGoal = 'lose_weight' | 'lower_cholesterol' | 'manage_diabetes' | 'heart_health' | 'sleep_better' | 'energy_focus';

export interface UserProfile {
  name: string;
  email: string;
  dob: string;
  sex: 'male' | 'female';
  smokingStatus: 'never' | 'former' | 'current';
  heightCm: number;
  weightKg: number;
  teamName: string;
  avatarUrl: string;
  healthConditions?: string[];
  activityLevel?: ActivityLevel;
  healthGoal?: HealthGoal;
}

export interface NutrientTargets {
  calories: number;
  carbsG: number;
  proteinG: number;
  fiberG: number;
  addedSugarG: number;
  saturatedFatG: number;
  transFatG: number;
}

export interface MedicalHistory {
  diabetes: boolean;
  rheumatoidArthritis: boolean;
  ckd: boolean;
  atrialFibrillation: boolean;
  familyHistoryCVD: boolean;
  onBloodPressureMeds: boolean;
  onCholesterolMeds: boolean;
}

export interface ClinicalMeasurements {
  fastingGlucose: string;
  systolicBP: string;
  diastolicBP: string;
  totalCholesterol: string;
  ldl: string;
  hdl: string;
  triglycerides: string;
}

export interface HeartAgeResult {
  heartAge: number;
  chronologicalAge: number;
  riskScore: number;
}

export interface NutritionProfile {
  calories: number;
  totalFatG: number;
  saturatedFatG: number;
  transFatG: number;
  totalCarbsG: number;
  dietaryFiberG: number;
  totalSugarsG: number;
  addedSugarG: number;
  proteinG: number;
  sodiumMg: number;
  calciumMg: number;
  ironMg: number;
  potassiumMg: number;
  vitaminDMcg: number;
  vitaminCMg: number;
}

export interface FoodItem {
  name: string;
  estimatedGrams: number;
  carbsG?: number;
  fatG?: number;
  proteinG?: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealLog {
  id: string;
  date: string;
  photoUri?: string;
  categories: string[];
  foodItems: FoodItem[];
  nutrition?: NutritionProfile;
  foodName?: string;
  saltRating: number;
  addedSugar: 'yes' | 'no' | 'not_sure';
  mealType?: MealType;
  entryMethod?: 'photo' | 'manual';
  points: number;
  timestamp: number;
}

export type MoodScore = 1 | 2 | 3 | 4 | 5;

export interface JournalLog {
  id: string;
  date: string;
  prompt: string;
  entry: string;
  mood: MoodScore;
  points: number;
  timestamp: number;
}

export interface ActivityLog {
  id: string;
  date: string;
  type: string;
  durationMinutes: number;
  intensity: 'light' | 'moderate' | 'vigorous';
  talkTest: 'sing' | 'talk' | 'difficult';
  caloriesBurned: number;
  points: number;
  timestamp: number;
}

export type WakeFeeling = 'sleepy' | 'somewhat' | 'refreshed';

export interface SleepLog {
  id: string;
  date: string;
  bedtime: string;
  wakeTime: string;
  quality: number;
  wakeFeeling?: WakeFeeling;
  points: number;
  timestamp: number;
}

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type BadgeCategory = 'nutrition' | 'activity' | 'sleep' | 'journal' | 'steps' | 'points' | 'streak' | 'social' | 'health' | 'wellness' | 'milestone';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
  color: string;
  tier?: BadgeTier;
  category?: BadgeCategory;
}

export interface TeamMember {
  id: string;
  name: string;
  points: number;
  avatarUrl: string;
}

export interface Team {
  id: string;
  name: string;
  totalPoints: number;
  members: TeamMember[];
}

export interface DailyTip {
  id: string;
  pillar: string;
  tip: string;
  microGoal: string;
  color: string;
}

export interface TipCompletion {
  tipId: string;
  date: string;
  points: number;
}

export interface MicroGoal {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  points: number;
}

export interface MissionModule {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  goals: MicroGoal[];
}

export interface MissionProgress {
  moduleId: string;
  enrolledAt: string;
  completedGoalIds: string[];
  completedAt?: string;
  autoCompletedGoalIds?: string[];
}

export interface HealthMarkerEntry {
  id: string;
  date: string;
  markerName: string;
  value: number;
  unit: string;
  notes?: string;
  source: 'manual' | 'lab_upload' | 'auto';
  points: number;
  timestamp: number;
}

export interface HealthMarkerPreset {
  name: string;
  unit: string;
  category: 'blood' | 'body' | 'lipid' | 'other';
  icon: string;
}

export interface WaterReminderSettings {
  enabled: boolean;
  intervalMinutes: number;
  startHour: number;
  endHour: number;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  stepsAverage: number;
  mealsLogged: number;
  activitiesLogged: number;
  sleepLogged: number;
  journalsLogged: number;
  missionsCompleted: number;
  tipsCompleted: number;
  pointsEarned: number;
  suggestions: string[];
}

export interface UserState {
  profile: UserProfile | null;
  medicalHistory: MedicalHistory | null;
  clinicalMeasurements: ClinicalMeasurements | null;
  heartAgeResult: HeartAgeResult | null;
  onboardingComplete: boolean;
  totalPoints: number;
  dailySteps: number;
  stepGoal: number;
  mealLogs: MealLog[];
  journalLogs: JournalLog[];
  activityLogs: ActivityLog[];
  sleepLogs: SleepLog[];
  badges: Badge[];
  weeklyStreak: number;
  tipCompletions: TipCompletion[];
  missionProgress: MissionProgress[];
  healthMarkers: HealthMarkerEntry[];
  waterReminder: WaterReminderSettings;
  nutrientTargets?: NutrientTargets;
}
