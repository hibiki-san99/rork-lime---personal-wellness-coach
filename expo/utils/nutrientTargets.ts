import { UserProfile, MedicalHistory, NutrientTargets, ActivityLevel, HealthGoal } from '@/types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  moderate: 1.375,
  active: 1.55,
};

export function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(1, age);
}

export function calculateBMR(profile: UserProfile): number {
  const age = calculateAge(profile.dob);
  if (profile.sex === 'male') {
    return (10 * profile.weightKg) + (6.25 * profile.heightCm) - (5 * age) + 5;
  }
  return (10 * profile.weightKg) + (6.25 * profile.heightCm) - (5 * age) - 161;
}

export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile);
  const level = profile.activityLevel ?? 'sedentary';
  return bmr * ACTIVITY_MULTIPLIERS[level];
}

export function calculateNutrientTargets(
  profile: UserProfile,
  _medical: MedicalHistory | null
): NutrientTargets {
  const baseTdee = calculateTDEE(profile);
  const goal: HealthGoal | undefined = profile.healthGoal;

  let calorieDeficit = 0;
  let carbPercent = 0.50;
  let proteinPercent = 0.18;
  let fiberG = 28;
  let addedSugarG = 25;
  let satFatPercent = 0.10;

  switch (goal) {
    case 'lose_weight':
      calorieDeficit = 400;
      carbPercent = 0.40;
      proteinPercent = 0.25;
      fiberG = 30;
      addedSugarG = 20;
      satFatPercent = 0.10;
      break;
    case 'lower_cholesterol':
      carbPercent = 0.50;
      proteinPercent = 0.18;
      fiberG = 35;
      addedSugarG = 25;
      satFatPercent = 0.07;
      break;
    case 'manage_diabetes':
      carbPercent = 0.40;
      proteinPercent = 0.22;
      fiberG = 35;
      addedSugarG = 15;
      satFatPercent = 0.10;
      break;
    case 'heart_health':
      carbPercent = 0.50;
      proteinPercent = 0.18;
      fiberG = 30;
      addedSugarG = 25;
      satFatPercent = 0.07;
      break;
    case 'sleep_better':
      carbPercent = 0.50;
      proteinPercent = 0.18;
      fiberG = 28;
      addedSugarG = 25;
      satFatPercent = 0.10;
      break;
    case 'energy_focus':
      carbPercent = 0.55;
      proteinPercent = 0.18;
      fiberG = 28;
      addedSugarG = 25;
      satFatPercent = 0.10;
      break;
    default:
      break;
  }

  const tdee = baseTdee - calorieDeficit;

  const carbsG = Math.round((tdee * carbPercent) / 4);
  const proteinG = Math.round((tdee * proteinPercent) / 4);
  const saturatedFatG = Math.round(((tdee * satFatPercent) / 9) * 10) / 10;

  return {
    calories: Math.round(tdee),
    carbsG,
    proteinG,
    fiberG,
    addedSugarG,
    saturatedFatG,
    transFatG: 0,
  };
}
