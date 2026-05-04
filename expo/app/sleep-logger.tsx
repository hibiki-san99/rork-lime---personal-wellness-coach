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
            <X size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('sleep.logSleep')}</Text>
          <TouchableOpacity onPress={save} style={styles.saveBtn}>
            <Check size={18} color={Colors.sleep} />
            <Text style={styles.saveBtnText}>{t('common.save')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.moonWrap}>
            <Moon size={48} color="#6B88B0" />
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeCard}>
              <Text style={styles.timeLabel}>{t('sleep.bedtime')}</Text>
              <TextInput
                style={styles.timeInput}
                value={bedtime}
                onChangeText={setBedtime}
                placeholder="22:30"
                placeholderTextColor="rgba(255,255,255,0.3)"
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
                placeholderTextColor="rgba(255,255,255,0.3)"
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
                      <Check size={14} color="#0D1B2A" />
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
  container: { flex: 1, backgroundColor: '#0D1B2A' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  closeBtn: { padding: 4 },
  title: { flex: 1, fontSize: 18, fontWeight: '700' as const, color: Colors.white, textAlign: 'center' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 4,
  },
  saveBtnText: { fontSize: 14, fontWeight: '600' as const, color: Colors.sleep },
  scroll: { padding: 20, paddingBottom: 40 },
  moonWrap: { alignItems: 'center', marginVertical: 20 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  timeCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 18,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  timeLabel: { fontSize: 13, color: '#6B88B0', fontWeight: '600' as const, marginBottom: 8 },
  timeInput: {
    fontSize: 32, fontWeight: '700' as const, color: Colors.white, textAlign: 'center',
    paddingVertical: 4, minWidth: 100,
  },
  timeHint: { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 },
  timeDivider: { paddingHorizontal: 12 },
  timeDividerText: { fontSize: 14, color: '#6B88B0' },
  durationBadge: {
    alignSelf: 'center', backgroundColor: 'rgba(107,136,176,0.15)',
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 28,
  },
  durationText: { fontSize: 14, color: '#81B4FF', fontWeight: '600' as const },
  feelingTitle: {
    fontSize: 17, fontWeight: '700' as const, color: Colors.white, textAlign: 'center', marginBottom: 16,
  },
  feelingsRow: { gap: 10, marginBottom: 28 },
  feelingCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  feelingCardSelected: {
    backgroundColor: 'rgba(129,180,255,0.12)',
    borderColor: '#81B4FF',
  },
  feelingEmoji: { fontSize: 28, marginRight: 14 },
  feelingLabel: { fontSize: 15, fontWeight: '700' as const, color: 'rgba(255,255,255,0.6)', flex: 1 },
  feelingLabelSelected: { color: Colors.white },
  feelingSublabel: { fontSize: 12, color: 'rgba(255,255,255,0.3)', position: 'absolute', right: 16, bottom: 8 },
  feelingSublabelSelected: { color: 'rgba(129,180,255,0.7)' },
  feelingCheck: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#81B4FF',
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  pointsCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(27,59,92,0.4)', borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  pointsLabel: { fontSize: 15, fontWeight: '600' as const, color: '#6B88B0' },
  pointsBreakdown: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 },
  pointsValue: { fontSize: 22, fontWeight: '800' as const, color: '#81B4FF' },
});
