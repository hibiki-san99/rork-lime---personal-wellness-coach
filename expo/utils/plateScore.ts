import { MealLog, NutrientTargets } from '@/types';

const PLANT_CATEGORIES = ['whole_grains', 'legumes', 'leafy_greens', 'other_vegetables', 'fruits', 'nuts_seeds'];

export interface PlateScoreBreakdown {
  plantDiversity: number;
  fiberAchievement: number;
  sugarFatControl: number;
  mealCompleteness: number;
  total: number;
  label: string;
  color: string;
}

function calcPlantDiversity(todayMeals: MealLog[]): number {
  const plantCats = new Set<string>();
  for (const meal of todayMeals) {
    for (const cat of meal.categories) {
      if (PLANT_CATEGORIES.includes(cat)) {
        plantCats.add(cat);
      }
    }
  }
  const count = plantCats.size;
  if (count >= 5) return 25;
  if (count >= 3) return 18;
  if (count >= 1) return 10;
  return 0;
}

function calcFiberAchievement(totalFiber: number, fiberGoal: number): number {
  if (fiberGoal <= 0) return 0;
  const pct = totalFiber / fiberGoal;
  if (pct >= 1) return 25;
  if (pct >= 0.75) return 20;
  if (pct >= 0.50) return 15;
  if (pct >= 0.25) return 8;
  return 0;
}

function calcSugarFatControl(
  addedSugar: number,
  saturatedFat: number,
  transFat: number,
  targets: NutrientTargets
): number {
  let score = 25;
  if (addedSugar > targets.addedSugarG) score -= 8;
  if (saturatedFat > targets.saturatedFatG) score -= 8;
  if (transFat > 0) score -= 9;
  return Math.max(0, score);
}

function calcMealCompleteness(mealCount: number): number {
  if (mealCount >= 3) return 25;
  if (mealCount >= 2) return 15;
  if (mealCount >= 1) return 8;
  return 0;
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 81) return { label: 'Thriving', color: '#2E7D32' };
  if (score >= 61) return { label: 'Doing Well', color: '#43A047' };
  if (score >= 41) return { label: 'Getting There', color: '#F9A825' };
  return { label: 'Needs Attention', color: '#E53935' };
}

export function calculatePlateScore(
  todayMeals: MealLog[],
  targets: NutrientTargets
): PlateScoreBreakdown {
  let totalFiber = 0;
  let totalAddedSugar = 0;
  let totalSatFat = 0;
  let totalTransFat = 0;

  for (const meal of todayMeals) {
    if (meal.nutrition) {
      totalFiber += meal.nutrition.dietaryFiberG ?? 0;
      totalAddedSugar += meal.nutrition.addedSugarG ?? 0;
      totalSatFat += meal.nutrition.saturatedFatG ?? 0;
      totalTransFat += meal.nutrition.transFatG ?? 0;
    }
  }

  const plantDiversity = calcPlantDiversity(todayMeals);
  const fiberAchievement = calcFiberAchievement(totalFiber, targets.fiberG);
  const sugarFatControl = calcSugarFatControl(totalAddedSugar, totalSatFat, totalTransFat, targets);
  const mealCompleteness = calcMealCompleteness(todayMeals.length);

  const total = plantDiversity + fiberAchievement + sugarFatControl + mealCompleteness;
  const { label, color } = getScoreLabel(total);

  return {
    plantDiversity,
    fiberAchievement,
    sugarFatControl,
    mealCompleteness,
    total,
    label,
    color,
  };
}
