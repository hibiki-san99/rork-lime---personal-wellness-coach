import { HealthMarkerPreset } from '@/types';

export interface NormalRange {
  low: number;
  high: number;
}

export interface SexAwareRange {
  male: NormalRange;
  female: NormalRange;
}

type RangeEntry = NormalRange | SexAwareRange;

function isSexAware(entry: RangeEntry): entry is SexAwareRange {
  return 'male' in entry;
}

export const NORMAL_RANGES: Record<string, RangeEntry> = {
  'Blood Glucose (Fasting)': { low: 70, high: 99 },
  'Blood Glucose (Random)': { low: 70, high: 140 },
  'HbA1c': { low: 4.0, high: 5.7 },
  'Total Cholesterol': { low: 0, high: 200 },
  'LDL Cholesterol': { low: 0, high: 130 },
  'HDL Cholesterol': { male: { low: 40, high: 999 }, female: { low: 50, high: 999 } },
  'Triglycerides': { low: 0, high: 150 },
  'Systolic BP': { low: 90, high: 130 },
  'Diastolic BP': { low: 60, high: 80 },
  'Heart Rate (Resting)': { low: 60, high: 100 },
  'Creatinine': { low: 0.6, high: 1.2 },
  'eGFR': { low: 90, high: 999 },
  'Uric Acid': { low: 2.5, high: 7.0 },
  'ALT (SGPT)': { low: 0, high: 40 },
  'AST (SGOT)': { low: 0, high: 40 },
  'Hemoglobin': { low: 12.0, high: 17.5 },
  'TSH': { low: 0.4, high: 4.0 },
  'Vitamin D': { low: 30, high: 100 },
  'Vitamin B12': { low: 200, high: 900 },
  'Ferritin': { male: { low: 12, high: 300 }, female: { low: 12, high: 150 } },
  'Iron (Serum)': { low: 60, high: 170 },
  'BMI': { low: 18.5, high: 24.9 },
  'Body Fat': { low: 10, high: 25 },
  'CRP': { low: 0, high: 10 },
};

export function isAbnormal(markerName: string, value: number, sex?: 'male' | 'female'): boolean {
  const normalized = normalizeMarkerName(markerName);
  const entry = NORMAL_RANGES[normalized];
  if (!entry) return false;
  if (isSexAware(entry)) {
    const range = entry[sex ?? 'male'];
    return value < range.low || value > range.high;
  }
  return value < entry.low || value > entry.high;
}

const MARKER_NAME_ALIASES: Record<string, string> = {
  'ldl': 'LDL Cholesterol',
  'ldl cholesterol': 'LDL Cholesterol',
  'ldl-c': 'LDL Cholesterol',
  'ldl-cholesterol': 'LDL Cholesterol',
  'low density lipoprotein': 'LDL Cholesterol',
  'hdl': 'HDL Cholesterol',
  'hdl cholesterol': 'HDL Cholesterol',
  'hdl-c': 'HDL Cholesterol',
  'hdl-cholesterol': 'HDL Cholesterol',
  'high density lipoprotein': 'HDL Cholesterol',
  'total cholesterol': 'Total Cholesterol',
  'cholesterol total': 'Total Cholesterol',
  'cholesterol': 'Total Cholesterol',
  'triglycerides': 'Triglycerides',
  'triglyceride': 'Triglycerides',
  'tg': 'Triglycerides',
  'blood glucose (fasting)': 'Blood Glucose (Fasting)',
  'fasting blood glucose': 'Blood Glucose (Fasting)',
  'fasting glucose': 'Blood Glucose (Fasting)',
  'fbs': 'Blood Glucose (Fasting)',
  'gula darah puasa': 'Blood Glucose (Fasting)',
  'gdp': 'Blood Glucose (Fasting)',
  'blood glucose (random)': 'Blood Glucose (Random)',
  'random blood glucose': 'Blood Glucose (Random)',
  'gds': 'Blood Glucose (Random)',
  'gula darah sewaktu': 'Blood Glucose (Random)',
  'hba1c': 'HbA1c',
  'hemoglobin a1c': 'HbA1c',
  'a1c': 'HbA1c',
  'glycated hemoglobin': 'HbA1c',
  'systolic bp': 'Systolic BP',
  'systolic blood pressure': 'Systolic BP',
  'systolic': 'Systolic BP',
  'diastolic bp': 'Diastolic BP',
  'diastolic blood pressure': 'Diastolic BP',
  'diastolic': 'Diastolic BP',
  'heart rate (resting)': 'Heart Rate (Resting)',
  'resting heart rate': 'Heart Rate (Resting)',
  'heart rate': 'Heart Rate (Resting)',
  'creatinine': 'Creatinine',
  'serum creatinine': 'Creatinine',
  'egfr': 'eGFR',
  'gfr': 'eGFR',
  'estimated gfr': 'eGFR',
  'uric acid': 'Uric Acid',
  'asam urat': 'Uric Acid',
  'alt (sgpt)': 'ALT (SGPT)',
  'alt': 'ALT (SGPT)',
  'sgpt': 'ALT (SGPT)',
  'ast (sgot)': 'AST (SGOT)',
  'ast': 'AST (SGOT)',
  'sgot': 'AST (SGOT)',
  'hemoglobin': 'Hemoglobin',
  'hb': 'Hemoglobin',
  'haemoglobin': 'Hemoglobin',
  'tsh': 'TSH',
  'thyroid stimulating hormone': 'TSH',
  'vitamin d': 'Vitamin D',
  'vitamin d (25 oh)': 'Vitamin D',
  'vitamin d (25-oh)': 'Vitamin D',
  '25-oh vitamin d': 'Vitamin D',
  '25 oh vitamin d': 'Vitamin D',
  '25-hydroxyvitamin d': 'Vitamin D',
  'vitamin d3': 'Vitamin D',
  'vitamin b12': 'Vitamin B12',
  'b12': 'Vitamin B12',
  'cobalamin': 'Vitamin B12',
  'ferritin': 'Ferritin',
  'serum ferritin': 'Ferritin',
  'iron (serum)': 'Iron (Serum)',
  'serum iron': 'Iron (Serum)',
  'iron': 'Iron (Serum)',
  'fe': 'Iron (Serum)',
  'bmi': 'BMI',
  'body mass index': 'BMI',
  'body fat': 'Body Fat',
  'body fat percentage': 'Body Fat',
  'weight': 'Weight',
  'waist circumference': 'Waist Circumference',
  'neck circumference': 'Neck Circumference',
  'hip circumference': 'Hip Circumference',
  'wbc count': 'WBC Count',
  'wbc': 'WBC Count',
  'white blood cell': 'WBC Count',
  'white blood cell count': 'WBC Count',
  'platelet count': 'Platelet Count',
  'platelet': 'Platelet Count',
  'platelets': 'Platelet Count',
  'crp': 'CRP',
  'c-reactive protein': 'CRP',
  'c reactive protein': 'CRP',
  'hs-crp': 'CRP',
  'hscrp': 'CRP',
  'high sensitivity crp': 'CRP',
};

export function normalizeMarkerName(name: string): string {
  const lower = name.toLowerCase().trim();
  if (MARKER_NAME_ALIASES[lower]) return MARKER_NAME_ALIASES[lower];

  const presetMatch = HEALTH_MARKER_PRESETS.find(
    p => p.name.toLowerCase() === lower
  );
  if (presetMatch) return presetMatch.name;

  for (const [alias, canonical] of Object.entries(MARKER_NAME_ALIASES)) {
    if (lower.includes(alias) || alias.includes(lower)) {
      return canonical;
    }
  }

  for (const preset of HEALTH_MARKER_PRESETS) {
    const presetLower = preset.name.toLowerCase();
    if (lower.includes(presetLower) || presetLower.includes(lower)) {
      return preset.name;
    }
  }

  return name.trim();
}

export const HEALTH_MARKER_PRESETS: HealthMarkerPreset[] = [
  { name: 'Blood Glucose (Fasting)', unit: 'mg/dL', category: 'blood', icon: '🩸' },
  { name: 'Blood Glucose (Random)', unit: 'mg/dL', category: 'blood', icon: '🩸' },
  { name: 'HbA1c', unit: '%', category: 'blood', icon: '🔬' },
  { name: 'Total Cholesterol', unit: 'mg/dL', category: 'lipid', icon: '🫀' },
  { name: 'LDL Cholesterol', unit: 'mg/dL', category: 'lipid', icon: '📉' },
  { name: 'HDL Cholesterol', unit: 'mg/dL', category: 'lipid', icon: '📈' },
  { name: 'Triglycerides', unit: 'mg/dL', category: 'lipid', icon: '📊' },
  { name: 'Systolic BP', unit: 'mmHg', category: 'blood', icon: '💓' },
  { name: 'Diastolic BP', unit: 'mmHg', category: 'blood', icon: '💓' },
  { name: 'Heart Rate (Resting)', unit: 'bpm', category: 'blood', icon: '❤️' },
  { name: 'Waist Circumference', unit: 'cm', category: 'body', icon: '📏' },
  { name: 'Neck Circumference', unit: 'cm', category: 'body', icon: '📏' },
  { name: 'Hip Circumference', unit: 'cm', category: 'body', icon: '📏' },
  { name: 'Weight', unit: 'kg', category: 'body', icon: '⚖️' },
  { name: 'BMI', unit: 'kg/m²', category: 'body', icon: '📐' },
  { name: 'Body Fat', unit: '%', category: 'body', icon: '🏋️' },
  { name: 'Creatinine', unit: 'mg/dL', category: 'blood', icon: '🧪' },
  { name: 'eGFR', unit: 'mL/min', category: 'blood', icon: '🧪' },
  { name: 'Uric Acid', unit: 'mg/dL', category: 'blood', icon: '🧪' },
  { name: 'ALT (SGPT)', unit: 'U/L', category: 'blood', icon: '🧬' },
  { name: 'AST (SGOT)', unit: 'U/L', category: 'blood', icon: '🧬' },
  { name: 'Hemoglobin', unit: 'g/dL', category: 'blood', icon: '🩸' },
  { name: 'WBC Count', unit: '×10³/µL', category: 'blood', icon: '🩸' },
  { name: 'Platelet Count', unit: '×10³/µL', category: 'blood', icon: '🩸' },
  { name: 'TSH', unit: 'mIU/L', category: 'blood', icon: '🦋' },
  { name: 'Vitamin D', unit: 'ng/mL', category: 'blood', icon: '☀️' },
  { name: 'Vitamin B12', unit: 'pg/mL', category: 'blood', icon: '💊' },
  { name: 'Iron (Serum)', unit: 'µg/dL', category: 'blood', icon: '🧲' },
  { name: 'Ferritin', unit: 'ng/mL', category: 'blood', icon: '🧲' },
  { name: 'CRP', unit: 'mg/L', category: 'blood', icon: '🔥' },
];

export const POINTS_PER_HEALTH_MARKER = 15;
