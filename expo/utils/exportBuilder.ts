import { Platform, Share } from 'react-native';

export type ExportDataType =
  | 'profiles'
  | 'meals'
  | 'steps'
  | 'activities'
  | 'sleep'
  | 'journal'
  | 'markers'
  | 'points'
  | 'missions';

export type ExportFormat = 'csv' | 'json';

export type TimeRangePreset = '7d' | '30d' | '3m' | 'all' | 'custom';

export interface TimeRange {
  preset: TimeRangePreset;
  fromDate?: string;
  toDate?: string;
}

export interface ParticipantFilter {
  mode: 'all' | 'team' | 'individual';
  teamName?: string;
  userId?: string;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
  hasSynced: boolean;
  syncData: Record<string, unknown> | null;
}

export interface BuildExportOptions {
  dataType: ExportDataType;
  timeRange: TimeRange;
  participants: ParticipantFilter;
  format: ExportFormat;
  users: AdminUserRecord[];
}

export interface BuildMultiExportOptions {
  dataTypes: ExportDataType[];
  timeRange: TimeRange;
  participants: ParticipantFilter;
  format: ExportFormat;
  users: AdminUserRecord[];
}

export interface BuildMultiExportResult {
  perCategory: Record<ExportDataType, Record<string, unknown>[]>;
  totalRows: number;
  filename: string;
  content: string;
  mime: string;
}

export interface BuildExportResult {
  rows: Record<string, unknown>[];
  filename: string;
  content: string;
  mime: string;
}

export const DATA_TYPE_LABELS: Record<ExportDataType, string> = {
  profiles: 'ParticipantProfiles',
  meals: 'MealLogs',
  steps: 'DailySteps',
  activities: 'ActivityLogs',
  sleep: 'SleepLogs',
  journal: 'JournalEntries',
  markers: 'HealthMarkers',
  points: 'PointsEngagement',
  missions: 'MissionsBadges',
};

export const DATA_TYPE_ICONS: Record<ExportDataType, string> = {
  profiles: '👤',
  meals: '🍽️',
  steps: '👟',
  activities: '🏃',
  sleep: '😴',
  journal: '📔',
  markers: '🩺',
  points: '🏆',
  missions: '🎯',
};

export const DATA_TYPE_TITLES: Record<ExportDataType, string> = {
  profiles: 'Participant Profiles & Clinical Baseline',
  meals: 'Meal Logs (nutrition per meal)',
  steps: 'Daily Steps & Calories',
  activities: 'Activity Logs',
  sleep: 'Sleep Logs',
  journal: 'Journal Entries',
  markers: 'Health Markers',
  points: 'Points & Engagement',
  missions: 'Missions & Badges',
};

function dmyShort(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const year = date.getFullYear();
  return `${day}${month}${year}`;
}

function rangeLabel(range: TimeRange): string {
  if (range.preset === '7d') return 'Last7Days';
  if (range.preset === '30d') return 'Last30Days';
  if (range.preset === '3m') return 'Last3Months';
  if (range.preset === 'all') return 'AllTime';
  if (range.preset === 'custom' && range.fromDate && range.toDate) {
    const f = new Date(range.fromDate);
    const t = new Date(range.toDate);
    return `${dmyShort(f)}-${dmyShort(t)}`;
  }
  return 'Custom';
}

export function resolveDateBounds(range: TimeRange): { from: Date | null; to: Date | null } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  if (range.preset === 'all') return { from: null, to: null };

  if (range.preset === 'custom') {
    const f = range.fromDate ? new Date(range.fromDate) : null;
    const t = range.toDate ? new Date(range.toDate) : null;
    if (f) f.setHours(0, 0, 0, 0);
    if (t) t.setHours(23, 59, 59, 999);
    return { from: f, to: t };
  }

  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  if (range.preset === '7d') from.setDate(from.getDate() - 6);
  else if (range.preset === '30d') from.setDate(from.getDate() - 29);
  else if (range.preset === '3m') from.setMonth(from.getMonth() - 3);
  return { from, to };
}

function inRange(isoDate: string | undefined, from: Date | null, to: Date | null): boolean {
  if (!from && !to) return true;
  if (!isoDate) return false;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function filterUsers(users: AdminUserRecord[], filter: ParticipantFilter): AdminUserRecord[] {
  if (filter.mode === 'individual' && filter.userId) {
    return users.filter(u => u.id === filter.userId);
  }
  if (filter.mode === 'team' && filter.teamName) {
    return users.filter(u => {
      const team = (u.syncData as Record<string, unknown> | null)?.profile as Record<string, unknown> | undefined;
      return (team?.teamName as string) === filter.teamName;
    });
  }
  return users;
}

function getTeam(u: AdminUserRecord): string {
  const sd = u.syncData as Record<string, unknown> | null;
  const profile = sd?.profile as Record<string, unknown> | undefined;
  return (profile?.teamName as string) ?? '';
}

function calcAge(dob: string | undefined): number | '' {
  if (!dob) return '';
  const d = new Date(dob);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function calcBMI(h: unknown, w: unknown): number | '' {
  const hn = typeof h === 'number' ? h : parseFloat(String(h));
  const wn = typeof w === 'number' ? w : parseFloat(String(w));
  if (!hn || !wn || hn <= 0) return '';
  const m = hn / 100;
  return Math.round((wn / (m * m)) * 10) / 10;
}

function buildProfileRows(users: AdminUserRecord[]): Record<string, unknown>[] {
  return users.map(u => {
    const sd = u.syncData as Record<string, unknown> | null;
    const profile = (sd?.profile ?? {}) as Record<string, unknown>;
    const medical = (sd?.medicalHistory ?? {}) as Record<string, unknown>;
    const clinical = (sd?.clinicalMeasurements ?? {}) as Record<string, unknown>;
    const heart = (sd?.heartAgeResult ?? {}) as Record<string, unknown>;
    return {
      'Participant ID': u.id,
      Name: u.name,
      Email: u.email,
      DOB: profile.dob ?? '',
      Age: calcAge(profile.dob as string | undefined),
      Sex: profile.sex ?? '',
      'Height (cm)': profile.heightCm ?? '',
      'Weight (kg)': profile.weightKg ?? '',
      BMI: calcBMI(profile.heightCm, profile.weightKg),
      Diabetes: medical.diabetes ? 'yes' : 'no',
      CKD: medical.ckd ? 'yes' : 'no',
      RA: medical.rheumatoidArthritis ? 'yes' : 'no',
      AFib: medical.atrialFibrillation ? 'yes' : 'no',
      'Family CVD': medical.familyHistoryCVD ? 'yes' : 'no',
      'On Cholesterol Meds': medical.onCholesterolMeds ? 'yes' : 'no',
      'On BP Meds': medical.onBloodPressureMeds ? 'yes' : 'no',
      'Smoking Status': profile.smokingStatus ?? '',
      'Health Goal': profile.healthGoal ?? '',
      'Activity Level': profile.activityLevel ?? '',
      Team: profile.teamName ?? '',
      'Fasting Glucose': clinical.fastingGlucose ?? '',
      'Total Cholesterol': clinical.totalCholesterol ?? '',
      LDL: clinical.ldl ?? '',
      HDL: clinical.hdl ?? '',
      Triglycerides: clinical.triglycerides ?? '',
      'Systolic BP': clinical.systolicBP ?? '',
      'Diastolic BP': clinical.diastolicBP ?? '',
      'Heart Age': heart.heartAge ?? '',
      '10yr CV Risk %': heart.riskScore ?? '',
      'Healthy Life Expectancy': heart.healthyLifeExpectancy ?? '',
      'Registration Date': u.createdAt,
    };
  });
}

function buildMealRows(users: AdminUserRecord[], from: Date | null, to: Date | null): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const u of users) {
    const sd = u.syncData as Record<string, unknown> | null;
    const logs = (sd?.mealLogs as Array<Record<string, unknown>>) ?? [];
    for (const m of logs) {
      const tsMs = (m.timestamp as number) ?? 0;
      const iso = tsMs ? new Date(tsMs).toISOString() : (m.date as string);
      if (!inRange(iso, from, to)) continue;
      const nutrition = (m.nutrition ?? {}) as Record<string, unknown>;
      const foodItems = (m.foodItems as Array<{ name?: string }>) ?? [];
      const foodName = (m.foodName as string) || foodItems.map(f => f.name).filter(Boolean).join('; ');
      const categories = (m.categories as string[]) ?? [];
      const plantCats = categories.filter(c => !['processed_foods', 'animal_products'].includes(c));
      rows.push({
        'Participant ID': u.id,
        Name: u.name,
        Team: getTeam(u),
        Date: m.date ?? '',
        Time: tsMs ? new Date(tsMs).toISOString().slice(11, 19) : '',
        'Meal Type': m.mealType ?? '',
        'Food Name': foodName,
        'Calories (kcal)': nutrition.calories ?? '',
        'Carbs (g)': nutrition.totalCarbsG ?? '',
        'Protein (g)': nutrition.proteinG ?? '',
        'Fiber (g)': nutrition.dietaryFiberG ?? '',
        'Added Sugar (g)': nutrition.addedSugarG ?? '',
        'Saturated Fat (g)': nutrition.saturatedFatG ?? '',
        'Trans Fat (g)': nutrition.transFatG ?? '',
        'Plant Categories': plantCats.length,
        'Shared Dish': m.sharedDish ? 'yes' : 'no',
        'Shared With': (m.sharedWith as number) ?? '',
        'Coaching Nudge': m.coachingNudge ?? '',
        'Points Earned': m.points ?? 0,
      });
    }
  }
  return rows;
}

function buildStepRows(users: AdminUserRecord[], from: Date | null, to: Date | null): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const u of users) {
    const sd = u.syncData as Record<string, unknown> | null;
    if (!sd) continue;
    const stepGoal = (sd.stepGoal as number) ?? 10000;

    const stepHistory = (sd.stepHistory as Array<Record<string, unknown>>) ?? [];
    const activityLogs = (sd.activityLogs as Array<Record<string, unknown>>) ?? [];

    const byDate = new Map<string, { steps: number; activityCals: number }>();

    if (stepHistory.length) {
      for (const h of stepHistory) {
        const date = (h.date as string) ?? '';
        if (!date) continue;
        const steps = (h.steps as number) ?? 0;
        byDate.set(date, { steps, activityCals: byDate.get(date)?.activityCals ?? 0 });
      }
    } else {
      const todayDate = new Date().toISOString().slice(0, 10);
      const todaySteps = (sd.dailySteps as number) ?? 0;
      if (todaySteps > 0) byDate.set(todayDate, { steps: todaySteps, activityCals: 0 });
    }

    for (const a of activityLogs) {
      const date = (a.date as string) ?? '';
      if (!date) continue;
      const cals = (a.caloriesBurned as number) ?? 0;
      const prev = byDate.get(date) ?? { steps: 0, activityCals: 0 };
      byDate.set(date, { ...prev, activityCals: prev.activityCals + cals });
    }

    for (const [date, v] of byDate) {
      if (!inRange(date, from, to)) continue;
      const stepCals = Math.round(v.steps * 0.04);
      rows.push({
        'Participant ID': u.id,
        Name: u.name,
        Team: getTeam(u),
        Date: date,
        'Total Steps': v.steps,
        'Step Goal Met': v.steps >= stepGoal ? 'yes' : 'no',
        'Step Calories (kcal)': stepCals,
        'Activity Calories (kcal)': v.activityCals,
        'Total Calories Burnt (kcal)': stepCals + v.activityCals,
      });
    }
  }
  return rows;
}

function buildActivityRows(users: AdminUserRecord[], from: Date | null, to: Date | null): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const u of users) {
    const sd = u.syncData as Record<string, unknown> | null;
    const logs = (sd?.activityLogs as Array<Record<string, unknown>>) ?? [];
    for (const a of logs) {
      const tsMs = (a.timestamp as number) ?? 0;
      const iso = tsMs ? new Date(tsMs).toISOString() : (a.date as string);
      if (!inRange(iso, from, to)) continue;
      rows.push({
        'Participant ID': u.id,
        Name: u.name,
        Team: getTeam(u),
        Date: a.date ?? '',
        Time: tsMs ? new Date(tsMs).toISOString().slice(11, 19) : '',
        'Activity Type': a.type ?? '',
        'Duration (min)': a.durationMinutes ?? '',
        Intensity: a.intensity ?? '',
        'Calories Burnt (kcal)': a.caloriesBurned ?? '',
        'Points Earned': a.points ?? 0,
      });
    }
  }
  return rows;
}

function buildSleepRows(users: AdminUserRecord[], from: Date | null, to: Date | null): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const u of users) {
    const sd = u.syncData as Record<string, unknown> | null;
    const logs = (sd?.sleepLogs as Array<Record<string, unknown>>) ?? [];
    for (const s of logs) {
      if (!inRange(s.date as string, from, to)) continue;
      const bedtime = (s.bedtime as string) ?? '';
      const wake = (s.wakeTime as string) ?? '';
      let hours: number | '' = '';
      if (bedtime && wake) {
        const [bh, bm] = bedtime.split(':').map(Number);
        const [wh, wm] = wake.split(':').map(Number);
        if (Number.isFinite(bh) && Number.isFinite(wh)) {
          let mins = (wh! * 60 + (wm ?? 0)) - (bh! * 60 + (bm ?? 0));
          if (mins < 0) mins += 24 * 60;
          hours = Math.round((mins / 60) * 10) / 10;
        }
      }
      rows.push({
        'Participant ID': u.id,
        Name: u.name,
        Team: getTeam(u),
        Date: s.date ?? '',
        Bedtime: bedtime,
        'Wake Time': wake,
        'Hours Slept': hours,
        'Wake Feeling': s.wakeFeeling ?? '',
        'Points Earned': s.points ?? 0,
      });
    }
  }
  return rows;
}

function buildJournalRows(users: AdminUserRecord[], from: Date | null, to: Date | null): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const u of users) {
    const sd = u.syncData as Record<string, unknown> | null;
    const logs = (sd?.journalLogs as Array<Record<string, unknown>>) ?? [];
    for (const j of logs) {
      if (!inRange(j.date as string, from, to)) continue;
      const entry = (j.entry as string) ?? '';
      const wordCount = entry.trim() ? entry.trim().split(/\s+/).length : 0;
      rows.push({
        'Participant ID': u.id,
        Name: u.name,
        Team: getTeam(u),
        Date: j.date ?? '',
        'Day Prompt': j.prompt ?? '',
        'Response Text': entry,
        Mood: (j.mood as number) ?? '',
        'Word Count': wordCount,
        'Points Earned': j.points ?? 0,
      });
    }
  }
  return rows;
}

function buildMarkerRows(users: AdminUserRecord[], from: Date | null, to: Date | null): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const u of users) {
    const sd = u.syncData as Record<string, unknown> | null;
    const markers = (sd?.healthMarkers as Array<Record<string, unknown>>) ?? [];
    for (const m of markers) {
      if (!inRange(m.date as string, from, to)) continue;
      rows.push({
        'Participant ID': u.id,
        Name: u.name,
        Team: getTeam(u),
        'Marker Name': m.markerName ?? '',
        Value: m.value ?? '',
        Unit: m.unit ?? '',
        'Date of Measurement': m.date ?? '',
        'Entry Method': m.source ?? '',
      });
    }
  }
  return rows;
}

function buildPointsRows(users: AdminUserRecord[]): Record<string, unknown>[] {
  return users.map(u => {
    const sd = u.syncData as Record<string, unknown> | null;
    const meals = (sd?.mealLogs as unknown[]) ?? [];
    const acts = (sd?.activityLogs as unknown[]) ?? [];
    const sleeps = (sd?.sleepLogs as unknown[]) ?? [];
    const journals = (sd?.journalLogs as unknown[]) ?? [];
    const allLogs = [...(meals as Record<string, unknown>[]), ...(acts as Record<string, unknown>[]), ...(sleeps as Record<string, unknown>[]), ...(journals as Record<string, unknown>[])];
    const dates = new Set(allLogs.map(l => l.date as string).filter(Boolean));
    const sortedDates = Array.from(dates).sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let prev: Date | null = null;
    for (const d of sortedDates) {
      const dt = new Date(d);
      if (prev && (dt.getTime() - prev.getTime()) === 86400000) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      if (currentStreak > longestStreak) longestStreak = currentStreak;
      prev = dt;
    }
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const activeStreakToday = sortedDates[sortedDates.length - 1] === today || sortedDates[sortedDates.length - 1] === yesterday;
    const lastActive = sd?._lastSync ?? (sortedDates[sortedDates.length - 1] ?? '');
    return {
      'Participant ID': u.id,
      Name: u.name,
      Team: getTeam(u),
      'Total Points': (sd?.totalPoints as number) ?? 0,
      'Current Streak': activeStreakToday ? currentStreak : 0,
      'Longest Streak': longestStreak,
      'Total Days Active': dates.size,
      'Total Meals Logged': meals.length,
      'Total Activities Logged': acts.length,
      'Total Sleep Entries': sleeps.length,
      'Total Journal Entries': journals.length,
      'Last Active Date': lastActive,
    };
  });
}

function buildMissionRows(users: AdminUserRecord[]): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const u of users) {
    const sd = u.syncData as Record<string, unknown> | null;
    const missions = (sd?.missionProgress as Array<Record<string, unknown>>) ?? [];
    const badges = (sd?.badges as Array<Record<string, unknown>>) ?? [];
    for (const mp of missions) {
      rows.push({
        'Participant ID': u.id,
        Name: u.name,
        Team: getTeam(u),
        Type: 'Mission',
        'Module Name': mp.moduleId ?? '',
        'Mission/Badge Name': mp.moduleId ?? '',
        Completed: mp.completedAt ? 'yes' : 'no',
        'Completion Date': mp.completedAt ?? '',
        'Points Earned': ((mp.completedGoalIds as string[]) ?? []).length * 10,
      });
    }
    for (const b of badges) {
      if (!b.earned) continue;
      rows.push({
        'Participant ID': u.id,
        Name: u.name,
        Team: getTeam(u),
        Type: 'Badge',
        'Module Name': '',
        'Mission/Badge Name': b.name ?? b.id ?? '',
        Completed: 'yes',
        'Completion Date': b.earnedDate ?? '',
        'Points Earned': '',
      });
    }
  }
  return rows;
}

function buildRows(opts: BuildExportOptions): Record<string, unknown>[] {
  const { from, to } = resolveDateBounds(opts.timeRange);
  const filtered = filterUsers(opts.users, opts.participants);
  switch (opts.dataType) {
    case 'profiles': return buildProfileRows(filtered);
    case 'meals': return buildMealRows(filtered, from, to);
    case 'steps': return buildStepRows(filtered, from, to);
    case 'activities': return buildActivityRows(filtered, from, to);
    case 'sleep': return buildSleepRows(filtered, from, to);
    case 'journal': return buildJournalRows(filtered, from, to);
    case 'markers': return buildMarkerRows(filtered, from, to);
    case 'points': return buildPointsRows(filtered);
    case 'missions': return buildMissionRows(filtered);
  }
}

function csvEscape(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'object') {
    const s = JSON.stringify(val);
    return `"${s.replace(/"/g, '""')}"`;
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0] ?? {});
  const lines: string[] = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => csvEscape(row[h])).join(','));
  }
  return lines.join('\n');
}

export function buildExport(opts: BuildExportOptions): BuildExportResult {
  const rows = buildRows(opts);
  const today = dmyShort(new Date());
  const filename = `Lime_${DATA_TYPE_LABELS[opts.dataType]}_${rangeLabel(opts.timeRange)}_${today}.${opts.format}`;

  if (opts.format === 'csv') {
    return {
      rows,
      filename,
      content: toCSV(rows),
      mime: 'text/csv',
    };
  }
  return {
    rows,
    filename,
    content: JSON.stringify(rows, null, 2),
    mime: 'application/json',
  };
}

export function buildMultiExport(opts: BuildMultiExportOptions): BuildMultiExportResult {
  const perCategory = {} as Record<ExportDataType, Record<string, unknown>[]>;
  let totalRows = 0;
  for (const dt of opts.dataTypes) {
    const rows = buildRows({
      dataType: dt,
      timeRange: opts.timeRange,
      participants: opts.participants,
      format: opts.format,
      users: opts.users,
    });
    perCategory[dt] = rows;
    totalRows += rows.length;
  }

  const today = dmyShort(new Date());
  const isSingle = opts.dataTypes.length === 1;
  const firstType = opts.dataTypes[0];
  const baseName = isSingle && firstType
    ? `Lime_${DATA_TYPE_LABELS[firstType]}_${rangeLabel(opts.timeRange)}_${today}`
    : `Lime_MultiExport_${rangeLabel(opts.timeRange)}_${today}`;

  if (opts.format === 'json') {
    const obj: Record<string, Record<string, unknown>[]> = {};
    for (const dt of opts.dataTypes) {
      obj[DATA_TYPE_LABELS[dt]] = perCategory[dt];
    }
    return {
      perCategory,
      totalRows,
      filename: `${baseName}.json`,
      content: JSON.stringify(isSingle && firstType ? perCategory[firstType] : obj, null, 2),
      mime: 'application/json',
    };
  }

  // CSV: concatenate each category as a "sheet" separated by a header block
  if (isSingle && firstType) {
    return {
      perCategory,
      totalRows,
      filename: `${baseName}.csv`,
      content: toCSV(perCategory[firstType]),
      mime: 'text/csv',
    };
  }

  const parts: string[] = [];
  for (const dt of opts.dataTypes) {
    const rows = perCategory[dt];
    parts.push(`### ${DATA_TYPE_LABELS[dt]} (${rows.length} rows) ###`);
    if (rows.length > 0) {
      parts.push(toCSV(rows));
    } else {
      parts.push('(no data)');
    }
    parts.push('');
  }
  return {
    perCategory,
    totalRows,
    filename: `${baseName}.csv`,
    content: parts.join('\n'),
    mime: 'text/csv',
  };
}

export async function downloadExport(result: BuildExportResult | BuildMultiExportResult): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      const blob = new Blob([result.content], { type: result.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.log('[Export] Web download error:', err);
      throw err;
    }
    return;
  }

  await Share.share({
    message: result.content,
    title: result.filename,
  });
}
