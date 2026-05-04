type TalkTest = 'sing' | 'talk' | 'difficult';

const MET_VALUES: Record<string, number> = {
  'Walking': 3.5,
  'Running': 8.0,
  'Cycling': 6.0,
  'Swimming': 6.0,
  'Yoga': 2.5,
  'Strength Training': 5.0,
  'HIIT': 10.0,
  'Pilates': 3.0,
  'Dancing': 4.5,
  'Tennis': 7.0,
  'Basketball': 6.5,
  'Hiking': 5.5,
  'Rowing': 7.0,
  'Stretching': 2.0,
  'Padel': 7.0,
  'Calisthenics': 4.0,
  'CrossFit': 10.0,
  'Other': 4.0,
};

const INTENSITY_MULTIPLIERS: Record<TalkTest, number> = {
  sing: 0.7,
  talk: 1.0,
  difficult: 1.5,
};

export function getActivityMET(activity: string): number {
  return MET_VALUES[activity] ?? MET_VALUES['Other'];
}

export function getIntensityMultiplier(talkTest: TalkTest): number {
  return INTENSITY_MULTIPLIERS[talkTest];
}

export function calculateActivityCalories(
  activity: string,
  talkTest: TalkTest,
  weightKg: number,
  durationMinutes: number
): number {
  const met = getActivityMET(activity);
  const multiplier = getIntensityMultiplier(talkTest);
  const durationHours = durationMinutes / 60;
  return Math.round(met * multiplier * weightKg * durationHours);
}

export function calculateStepCalories(steps: number, weightKg: number): number {
  const met = 3.5;
  const multiplier = 1.0;
  const durationMinutes = steps / 100;
  const durationHours = durationMinutes / 60;
  return Math.round(met * multiplier * weightKg * durationHours);
}
