import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, Moon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { calculateSleepPoints, calculateSleepHours } from '@/constants/data';
import { useUser } from '@/context/UserContext';
import { useLanguage } from '@/context/LanguageContext';
import { SleepLog, WakeFeeling } from '@/types';

export default function SleepLoggerScreen() {
  const router = useRouter();
  const { addSleepLog } = useUser();
  const { t } = useLanguage();
  const WAKE_FEELINGS: { key: WakeFeeling; emoji: string; label: string; sublabel: string }[] = [
    { key: 'sleepy', emoji: '😴', label: t('sleep.sleepy'), sublabel: t('sleep.sleepyDesc') },
    { key: 'somewhat', emoji: '😐', label: t('sleep.somewhat'), sublabel: t('sleep.somewhatDesc') },
    { key: 'refreshed', emoji: '😊', label: t('sleep.refreshed'), sublabel: t('sleep.refreshedDesc') },
  ];
  const [bedtime, setBedtime] = useState('22:30');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [wakeFeeling, setWakeFeeling] = useState<WakeFeeling>('somewhat');

  const qualityNumber = useMemo(() => {
    if (wakeFeeling === 'refreshed') return 5;
    if (wakeFeeling === 'somewhat') return 3;
    return 1;
  }, [wakeFeeling]);

  const sleepResult = useMemo(() => {
    if (!bedtime || !wakeTime) return { total: 10, breakdown: ['Base: +10'], hours: 0 };
    const result = calculateSleepPoints(bedtime, wakeTime, qualityNumber, wakeFeeling);
    const hours = calculateSleepHours(bedtime, wakeTime);
    return { ...result, hours };
  }, [bedtime, wakeTime, qualityNumber, wakeFeeling]);

  const save = useCallback(() => {
    if (!bedtime || !wakeTime) {
      Alert.alert(t('sleep.timesRequired'), t('sleep.timesRequiredMsg'));
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const log: SleepLog = {
      id: Date.now().toString(),
      date: today,
      bedtime,
      wakeTime,
      quality: qualityNumber,
      wakeFeeling,
      points: sleepResult.total,
      timestamp: Date.now(),
    };
    const points = addSleepLog(log);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(t('sleep.sleepLogged'), t('sleep.earnedPoints', { points }), [
      { text: t('common.ok'), onPress: () => router.back() },
    ]);
  }, [bedtime, wakeTime, qualityNumber, wakeFeeling, sleepResult.total, addSleepLog, router, t]);

  const handleFeelingSelect = useCallback((feeling: WakeFeeling) => {
    setWakeFeeling(feeling);
    void Haptics.selectionAsync();
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('sleep.logSleep')}</Text>
          <TouchableOpacity onPress={save} style={styles.saveBtn}>
            <Check size={18} color={Colors.white} />
            <Text style={styles.saveBtnText}>{t('common.save')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.moonWrap}>
            <View style={styles.moonTile}>
              <Moon size={40} color={Colors.white} fill={Colors.white} />
            </View>
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeCard}>
              <Text style={styles.timeLabel}>{t('sleep.bedtime')}</Text>
              <TextInput
                style={styles.timeInput}
                value={bedtime}
                onChangeText={setBedtime}
                placeholder="22:30"
                placeholderTextColor={Colors.textTertiary}
                testID="bedtime-input"
              />
              <Text style={styles.timeHint}>HH:MM</Text>
            </View>
            <View style={styles.timeDivider}>
              <Text style={styles.timeDividerText}>to</Text>
            </View>
            <View style={styles.timeCard}>
              <Text style={styles.timeLabel}>{t('sleep.wakeTime')}</Text>
              <TextInput
                style={styles.timeInput}
                value={wakeTime}
                onChangeText={setWakeTime}
                placeholder="06:30"
                placeholderTextColor={Colors.textTertiary}
                testID="waketime-input"
              />
              <Text style={styles.timeHint}>HH:MM</Text>
            </View>
          </View>

          {sleepResult.hours > 0 && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {t('sleep.hoursOfSleep', { hours: sleepResult.hours.toFixed(1) })}
              </Text>
            </View>
          )}

          <Text style={styles.feelingTitle}>{t('sleep.howDidYouFeel')}</Text>

          <View style={styles.feelingsRow}>
            {WAKE_FEELINGS.map((f) => {
              const selected = wakeFeeling === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.feelingCard,
                    selected && styles.feelingCardSelected,
                  ]}
                  onPress={() => handleFeelingSelect(f.key)}
                  activeOpacity={0.7}
                  testID={`feeling-${f.key}`}
                >
                  <Text style={styles.feelingEmoji}>{f.emoji}</Text>
                  <Text style={[
                    styles.feelingLabel,
                    selected && styles.feelingLabelSelected,
                  ]}>
                    {f.label}
                  </Text>
                  <Text style={[
                    styles.feelingSublabel,
                    selected && styles.feelingSublabelSelected,
                  ]}>
                    {f.sublabel}
                  </Text>
                  {selected && (
                    <View style={styles.feelingCheck}>
                      <Check size={14} color={Colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.pointsCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pointsLabel}>{t('sleep.pointsForSleep')}</Text>
              {sleepResult.breakdown.map((line, i) => (
                <Text key={i} style={styles.pointsBreakdown}>{line}</Text>
              ))}
            </View>
            <Text style={styles.pointsValue}>+{sleepResult.total}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '800' as const, color: Colors.text, textAlign: 'center', letterSpacing: -0.3 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, gap: 4,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 3,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700' as const, color: Colors.white, letterSpacing: -0.2 },
  scroll: { padding: 20, paddingBottom: 40 },
  moonWrap: { alignItems: 'center', marginTop: 8, marginBottom: 24 },
  moonTile: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: Colors.sleep,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.white,
    shadowColor: Colors.sleep, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 4,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  timeCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 18, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  timeLabel: { fontSize: 12, color: Colors.sleep, fontWeight: '700' as const, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  timeInput: {
    fontSize: 30, fontWeight: '800' as const, color: Colors.text, textAlign: 'center',
    paddingVertical: 4, minWidth: 100, letterSpacing: -0.5,
  },
  timeHint: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  timeDivider: { paddingHorizontal: 10 },
  timeDividerText: { fontSize: 13, color: Colors.textTertiary, fontWeight: '600' as const },
  durationBadge: {
    alignSelf: 'center', backgroundColor: Colors.sleepLight,
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, marginBottom: 24,
  },
  durationText: { fontSize: 13, color: Colors.sleep, fontWeight: '700' as const },
  feelingTitle: {
    fontSize: 16, fontWeight: '700' as const, color: Colors.text, marginBottom: 14, letterSpacing: -0.2,
  },
  feelingsRow: { gap: 10, marginBottom: 22 },
  feelingCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 16, padding: 14,
    borderWidth: 1.5, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  feelingCardSelected: {
    backgroundColor: Colors.sleepLight,
    borderColor: Colors.sleep,
    shadowColor: Colors.sleep, shadowOpacity: 0.2, shadowRadius: 10,
  },
  feelingEmoji: { fontSize: 28, marginRight: 14 },
  feelingLabel: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, flex: 1, letterSpacing: -0.2 },
  feelingLabelSelected: { color: Colors.sleep },
  feelingSublabel: { fontSize: 12, color: Colors.textTertiary, position: 'absolute', right: 14, bottom: 8 },
  feelingSublabelSelected: { color: Colors.sleep, opacity: 0.7 },
  feelingCheck: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.sleep,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
    borderWidth: 2, borderColor: Colors.white,
  },
  pointsCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  pointsLabel: { fontSize: 14, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.2 },
  pointsBreakdown: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  pointsValue: { fontSize: 24, fontWeight: '800' as const, color: Colors.sleep, letterSpacing: -0.5 },
});
