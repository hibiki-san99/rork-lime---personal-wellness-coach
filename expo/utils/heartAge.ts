import { UserProfile, MedicalHistory, ClinicalMeasurements, HeartAgeResult } from '@/types';

function getAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function calculateHeartAge(
  profile: UserProfile,
  medical: MedicalHistory,
  clinical: ClinicalMeasurements
): HeartAgeResult {
  const age = getAge(profile.dob);
  const systolic = parseFloat(clinical.systolicBP) || 120;
  const totalChol = parseFloat(clinical.totalCholesterol) || 200;
  const hdl = parseFloat(clinical.hdl) || 50;
  const isMale = profile.sex === 'male';
  const isSmoker = profile.smokingStatus === 'current';
  const hasDiabetes = medical.diabetes;
  const onBPMeds = medical.onBloodPressureMeds;

  let riskPoints = 0;

  if (isMale) {
    if (age >= 30 && age < 35) riskPoints += 0;
    else if (age < 40) riskPoints += 2;
    else if (age < 45) riskPoints += 5;
    else if (age < 50) riskPoints += 7;
    else if (age < 55) riskPoints += 8;
    else if (age < 60) riskPoints += 10;
    else if (age < 65) riskPoints += 11;
    else if (age < 70) riskPoints += 12;
    else riskPoints += 14;
  } else {
    if (age >= 30 && age < 35) riskPoints += 0;
    else if (age < 40) riskPoints += 2;
    else if (age < 45) riskPoints += 4;
    else if (age < 50) riskPoints += 5;
    else if (age < 55) riskPoints += 7;
    else if (age < 60) riskPoints += 8;
    else if (age < 65) riskPoints += 9;
    else if (age < 70) riskPoints += 10;
    else riskPoints += 11;
  }

  if (totalChol >= 280) riskPoints += 3;
  else if (totalChol >= 240) riskPoints += 2;
  else if (totalChol >= 200) riskPoints += 1;

  if (hdl < 35) riskPoints += 2;
  else if (hdl < 45) riskPoints += 1;
  else if (hdl >= 60) riskPoints -= 1;

  if (onBPMeds) {
    if (systolic >= 160) riskPoints += 4;
    else if (systolic >= 140) riskPoints += 3;
    else if (systolic >= 130) riskPoints += 2;
    else if (systolic >= 120) riskPoints += 1;
  } else {
    if (systolic >= 160) riskPoints += 3;
    else if (systolic >= 140) riskPoints += 2;
    else if (systolic >= 130) riskPoints += 1;
  }

  if (isSmoker) riskPoints += 4;
  if (hasDiabetes) riskPoints += (isMale ? 3 : 4);
  if (medical.familyHistoryCVD) riskPoints += 2;
  if (medical.atrialFibrillation) riskPoints += 3;
  if (medical.ckd) riskPoints += 2;
  if (medical.rheumatoidArthritis) riskPoints += 1;

  const baselineAges = [32, 37, 42, 47, 52, 57, 62, 67, 72];
  const maleBaseline = [0, 2, 5, 7, 8, 10, 11, 12, 14];
  const femaleBaseline = [0, 2, 4, 5, 7, 8, 9, 10, 11];
  const baselinePoints = isMale ? maleBaseline : femaleBaseline;

  let ageBaseline = 0;
  for (let i = baselinePoints.length - 1; i >= 0; i--) {
    if (age >= baselineAges[i] - 2) {
      ageBaseline = baselinePoints[i];
      break;
    }
  }

  const diff = riskPoints - ageBaseline;
  let heartAge = age + Math.round(diff * 1.5);
  heartAge = Math.max(20, Math.min(90, heartAge));

  const riskScore = Math.min(30, Math.max(1, riskPoints));

  return {
    heartAge,
    chronologicalAge: age,
    riskScore,
  };
}

export function getBMI(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}
