import { HealthGoal, NutritionProfile } from '@/types';

export interface CoachingResult {
  message: string;
  nudge: string;
}

export function getMealCoachingNudge(
  healthGoal: HealthGoal | undefined,
  nutrition: NutritionProfile | undefined,
  categories: string[],
  mealHour?: number,
  dishNames: string[] = []
): CoachingResult {
  const message = 'Well done for logging! \uD83C\uDF89';

  if (!nutrition) {
    return { message, nudge: 'Great job keeping track of your meals! \uD83D\uDC4D' };
  }

  const calories = nutrition.calories ?? 0;
  const protein = nutrition.proteinG ?? 0;
  const carbs = nutrition.totalCarbsG ?? 0;
  const addedSugar = nutrition.addedSugarG ?? 0;
  const satFat = nutrition.saturatedFatG ?? 0;
  const transFat = nutrition.transFatG ?? 0;
  const fiber = nutrition.dietaryFiberG ?? 0;

  const plantCategories = categories.filter(c =>
    ['whole_grains', 'legumes', 'leafy_greens', 'other_vegetables', 'fruits', 'nuts_seeds'].includes(c)
  );
  const hasPlants = plantCategories.length > 0;
  const isFried = detectFried(dishNames);

  const ctx: NutrientContext = {
    calories, protein, carbs, addedSugar, satFat, transFat, fiber, hasPlants, mealHour, isFried,
  };

  const nudge = getNudgeForGoal(healthGoal, ctx);
  return { message, nudge };
}

interface NutrientContext {
  calories: number;
  protein: number;
  carbs: number;
  addedSugar: number;
  satFat: number;
  transFat: number;
  fiber: number;
  hasPlants: boolean;
  mealHour?: number;
  isFried: boolean;
}

function detectFried(names: string[]): boolean {
  const friedKeywords = [
    'fried', 'deep-fried', 'deep fried', 'crispy', 'tempura', 'katsu', 'karaage',
    'goreng', 'kwetiau goreng', 'char kway teow', 'char kuey teow', 'kway teow',
    'mee goreng', 'nasi goreng', 'pad see ew', 'pad thai', 'chow mein', 'lo mein',
    'yakisoba', 'fritter', 'pakora', 'samosa', 'schnitzel', 'tonkatsu',
    'nuggets', 'french fries', 'fries', 'chips', 'tempeh goreng', 'tahu goreng',
    'ayam goreng', 'ikan goreng', 'spring roll', 'egg roll', 'churros', 'doughnut', 'donut',
  ];
  const haystack = names.join(' ').toLowerCase();
  if (!haystack.trim()) return false;
  return friedKeywords.some(k => haystack.includes(k));
}

function getNudgeForGoal(goal: HealthGoal | undefined, ctx: NutrientContext): string {
  switch (goal) {
    case 'lose_weight':
      return getLoseWeightNudge(ctx);
    case 'lower_cholesterol':
      return getLowerCholesterolNudge(ctx);
    case 'manage_diabetes':
      return getManageDiabetesNudge(ctx);
    case 'heart_health':
      return getHeartHealthNudge(ctx);
    case 'sleep_better':
      return getSleepBetterNudge(ctx);
    case 'energy_focus':
      return getEnergyFocusNudge(ctx);
    default:
      return 'Great job keeping track of your meals! \uD83D\uDC4D';
  }
}

function getLoseWeightNudge(ctx: NutrientContext): string {
  if (ctx.transFat > 0) return 'Trans fat was detected \u2014 avoid fried and processed foods where possible \u26A0\uFE0F';
  if (ctx.isFried) return 'Fried dishes are often cooked in lots of oil \u2014 try steamed, grilled or stir-fried with less oil next time \uD83C\uDF73';
  if (ctx.addedSugar > 10) return 'High sugar can spike hunger later \u2014 try swapping for whole fruit \uD83C\uDF4E';
  if (ctx.calories > 600) return 'This was a high calorie meal \u2014 try smaller portions or more vegetables next time \uD83E\uDD57';
  if (ctx.protein < 10) return 'Adding more protein helps keep you full longer \u2014 try eggs, legumes or tofu \uD83E\uDD5A';
  return 'Great portion control! Keep it up \uD83D\uDCAA';
}

function getLowerCholesterolNudge(ctx: NutrientContext): string {
  if (ctx.transFat > 0) return 'Trans fat was detected \u2014 avoid fried and processed foods where possible \u26A0\uFE0F';
  if (ctx.isFried) return 'Stir-fried noodles like char kway teow are often cooked with high oil, which can work against your cholesterol goals \uD83C\uDF73';
  if (ctx.satFat > 8) return 'This meal was high in saturated fat \u2014 try plant-based proteins like tempeh or legumes next time \uD83C\uDF31';
  if (ctx.fiber < 2) return 'This meal was low in fiber \u2014 soluble fiber actively helps reduce cholesterol';
  if (!ctx.hasPlants) return 'No plant foods detected \u2014 try adding vegetables or legumes to help lower cholesterol \uD83E\uDD66';
  return 'Great choices for your cholesterol goals! \uD83C\uDF3F';
}

function getManageDiabetesNudge(ctx: NutrientContext): string {
  if (ctx.transFat > 0) return 'Trans fat was detected \u2014 avoid fried and processed foods where possible \u26A0\uFE0F';
  if (ctx.addedSugar > 5) return 'Even small amounts of added sugar affect blood glucose \uD83E\uDE78';
  if (ctx.carbs > 60) return 'This meal was high in carbohydrates \u2014 try reducing portions of rice or noodles \uD83C\uDF5A';
  if (ctx.fiber < 2) return 'Fiber slows glucose absorption \u2014 add vegetables or wholegrains';
  return 'Excellent choices for managing your blood sugar! \uD83C\uDF31';
}

function getHeartHealthNudge(ctx: NutrientContext): string {
  if (ctx.transFat > 0) return 'Trans fat is particularly harmful for heart health \u26A0\uFE0F';
  if (ctx.isFried) return 'Fried foods are typically high in oil and can strain your heart \u2014 try grilled, baked or steamed options \u2764\uFE0F';
  if (ctx.satFat > 8) return 'Saturated fat strains your heart \u2014 try leaner or plant-based options';
  if (!ctx.hasPlants) return 'Plant foods protect your heart \u2014 add vegetables or legumes \uD83C\uDF3F';
  return 'Heart-healthy choices! Your heart thanks you \u2764\uFE0F';
}

function getSleepBetterNudge(ctx: NutrientContext): string {
  if (ctx.addedSugar > 10) return 'High sugar meals can disrupt sleep quality \uD83C\uDF19';
  if (ctx.mealHour !== undefined && ctx.mealHour >= 20 && ctx.carbs > 60) {
    return 'Heavy carb meals late at night can affect sleep \u2014 try lighter options in the evening';
  }
  return 'Good food choices support better sleep! \uD83D\uDE34';
}

function getEnergyFocusNudge(ctx: NutrientContext): string {
  if (ctx.addedSugar > 10) return 'Sugar causes an energy crash \u2014 try wholegrains instead \u26A1';
  if (ctx.carbs < 20) return 'Carbs are your brain\'s main fuel \u2014 don\'t skip them entirely \uD83E\uDDE0';
  if (ctx.protein < 10) return 'Protein helps sustain energy \u2014 try eggs, legumes or tofu';
  return 'Great fuel for your brain and energy! \uD83E\uDDE0\u26A1';
}
