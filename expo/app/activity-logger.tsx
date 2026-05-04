import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  Animated,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Clock, ChevronRight, Flame, Award } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { ACTIVITY_TYPES, calculateActivityPoints } from '@/constants/data';
import { useUser } from '@/context/UserContext';
import { useLanguage } from '@/context/LanguageContext';
import { ActivityLog } from '@/types';
import { calculateActivityCalories } from '@/utils/calories';

type TalkTest = 'sing' | 'talk' | 'difficult';



const INTENSITY_MAP: Record<TalkTest, 'light' | 'moderate' | 'vigorous'> = {
  sing: 'light',
  talk: 'moderate',
  difficult: 'vigorous',
};


export default function ActivityLoggerScreen() {
  const router = useRouter();
  const { addActivityLog, profile } = useUser();
  const { t } = useLanguage();
  const TALK_TEST_OPTIONS: { key: TalkTest; label: string; description: string; icon: string }[] = [
    { key: 'sing', label: t('activity.talkSing'), description: t('activity.talkSingDesc'), icon: '🎵' },
    { key: 'talk', label: t('activity.talkTalk'), description: t('activity.talkTalkDesc'), icon: '💬' },
    { key: 'difficult', label: t('activity.talkDifficult'), description: t('activity.talkDifficultDesc'), icon: '🔥' },
  ];
  const [selectedType, setSelectedType] = useState('');
  const [duration, setDuration] = useState('');
  const [talkTest, setTalkTest] = useState<TalkTest | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);

  const weightKg = profile?.weightKg ?? 60;
  const hasWeight = !!profile?.weightKg;

  const celebrateScale = useRef(new Animated.Value(0)).current;
  const celebrateOpacity = useRef(new Animated.Value(0)).current;
  const calorieCountAnim = useRef(new Animated.Value(0)).current;

  const canSubmit = useMemo(() => {
    return selectedType !== '' && duration !== '' && parseInt(duration) > 0 && talkTest !== null;
  }, [selectedType, duration, talkTest]);

  const estimatedCalories = useMemo(() => {
    if (!selectedType || !duration || !talkTest) return 0;
    const dur = parseInt(duration);
    if (isNaN(dur) || dur <= 0) return 0;
    return calculateActivityCalories(selectedType, talkTest, weightKg, dur);
  }, [selectedType, duration, talkTest, weightKg]);

  const runCelebration = useCallback(() => {
    celebrateScale.setValue(0);
    celebrateOpacity.setValue(0);
    calorieCountAnim.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(celebrateScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
        Animated.timing(celebrateOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(calorieCountAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
    ]).start();
  }, [celebrateScale, celebrateOpacity, calorieCountAnim]);

  const submit = useCallback(() => {
    if (!selectedType) {
      Alert.alert(t('activity.selectActivity'), t('activity.selectActivityMsg'));
      return;
    }
    if (!duration || parseInt(duration) <= 0) {
      Alert.alert(t('activity.durationReq'), t('activity.durationReqMsg'));
      return;
    }
    if (!talkTest) {
      Alert.alert(t('activity.talkTestReq'), t('activity.talkTestReqMsg'));
      return;
    }

    const dur = parseInt(duration);
    const calories = calculateActivityCalories(selectedType, talkTest, weightKg, dur);
    const intensity = INTENSITY_MAP[talkTest];
    const { total: points } = calculateActivityPoints(dur, intensity);

    setCaloriesBurned(calories);
    setEarnedPoints(points);
    setShowResults(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    runCelebration();
  }, [selectedType, duration, talkTest, weightKg, runCelebration, t]);

  const saveAndClose = useCallback(() => {
    if (!talkTest) return;
    const today = new Date().toISOString().split('T')[0];
    const log: ActivityLog = {
      id: Date.now().toString(),
      date: today,
      type: selectedType,
      durationMinutes: parseInt(duration),
      intensity: INTENSITY_MAP[talkTest],
      talkTest,
      caloriesBurned,
      points: earnedPoints,
      timestamp: Date.now(),
    };
    addActivityLog(log);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [selectedType, duration, talkTest, caloriesBurned, earnedPoints, addActivityLog, router]);

  if (showResults) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.resultsContainer}>
            <Animated.View style={[
              styles.celebrationCard,
              {
                opacity: celebrateOpacity,
                transform: [{ scale: celebrateScale }],
              },
            ]}>
              <Text style={styles.celebrationEmoji}>🎉</Text>
              <Text style={styles.celebrationTitle}>{t('activity.congratulations')}</Text>

              <View style={styles.calorieCircle}>
                <Flame size={28} color={Colors.physicalActivity} />
                <Text style={styles.calorieValue}>{caloriesBurned}</Text>
                <Text style={styles.calorieLabel}>{t('activity.caloriesBurned')}</Text>
              </View>

              <View style={styles.resultDetailsRow}>
                <View style={styles.resultDetail}>
                  <Text style={styles.resultDetailValue}>{selectedType}</Text>
                  <Text style={styles.resultDetailLabel}>{t('activity.activityLabel')}</Text>
                </View>
                <View style={styles.resultDivider} />
                <View style={styles.resultDetail}>
                  <Text style={styles.resultDetailValue}>{duration} min</Text>
                  <Text style={styles.resultDetailLabel}>{t('activity.duration')}</Text>
                </View>
                <View style={styles.resultDivider} />
                <View style={styles.resultDetail}>
                  <Text style={styles.resultDetailValue}>{t(`activity.${INTENSITY_MAP[talkTest!]}`)}</Text>
                  <Text style={styles.resultDetailLabel}>{t('activity.intensity')}</Text>
                </View>
              </View>

              {!hasWeight && (
                <Text style={styles.weightNote}>
                  {t('activity.weightNoteFull')}
                </Text>
              )}

              <View style={styles.pointsBanner}>
                <Award size={20} color={Colors.physicalActivity} />
                <Text style={styles.pointsBannerText}>{t('activity.pointsEarnedLabel', { points: earnedPoints })}</Text>
              </View>
            </Animated.View>

            <TouchableOpacity style={styles.saveFinalBtn} onPress={saveAndClose} activeOpacity={0.8}>
              <Text style={styles.saveFinalBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('activity.logActivity')}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>{t('activity.activityType')}</Text>
          <View style={styles.typeGrid}>
            {ACTIVITY_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, selectedType === type && styles.typeChipActive]}
                onPress={() => { setSelectedType(type); void Haptics.selectionAsync(); }}
              >
                <Text style={[styles.typeChipText, selectedType === type && styles.typeChipTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{t('activity.duration')}</Text>
          <View style={styles.durationRow}>
            <View style={styles.durationIconWrap}>
              <Clock size={18} color={Colors.physicalActivity} />
            </View>
            <TextInput
              style={styles.durationInput}
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
              testID="duration-input"
            />
            <Text style={styles.durationUnit}>{t('activity.minutes')}</Text>
          </View>

          <Text style={styles.sectionTitle}>{t('activity.talkTestTitle')}</Text>
          <View style={styles.talkTestContainer}>
            {TALK_TEST_OPTIONS.map(option => {
              const isActive = talkTest === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.talkTestCard, isActive && styles.talkTestCardActive]}
                  onPress={() => { setTalkTest(option.key); void Haptics.selectionAsync(); }}
                  activeOpacity={0.7}
                >
                  <View style={styles.talkTestLeft}>
                    <Text style={styles.talkTestIcon}>{option.icon}</Text>
                    <View style={styles.talkTestTextWrap}>
                      <Text style={[styles.talkTestLabel, isActive && styles.talkTestLabelActive]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.talkTestDesc, isActive && styles.talkTestDescActive]}>
                        {option.description}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.talkTestRadio, isActive && styles.talkTestRadioActive]}>
                    {isActive && <View style={styles.talkTestRadioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {estimatedCalories > 0 && (
            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <Flame size={20} color={Colors.physicalActivity} />
                <Text style={styles.previewLabel}>{t('activity.estimatedCalories')}</Text>
              </View>
              <Text style={styles.previewValue}>~{estimatedCalories} kcal</Text>
              {!hasWeight && (
                <Text style={styles.weightNoteSmall}>
                  {t('activity.weightNote')}
                </Text>
              )}
            </View>
          )}

          <View style={styles.pointsCard}>
            <Text style={styles.pointsLabel}>{t('activity.pointsForActivity')}</Text>
            <Text style={styles.pointsValue}>
              +{talkTest ? calculateActivityPoints(parseInt(duration) || 0, INTENSITY_MAP[talkTest]).total : 10}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={!canSubmit}
            activeOpacity={0.8}
          >
            <Text style={[styles.submitBtnText, !canSubmit && styles.submitBtnTextDisabled]}>
              {t('activity.logActivity')}
            </Text>
            <ChevronRight size={18} color={canSubmit ? Colors.white : Colors.textTertiary} />
          </TouchableOpacity>
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
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  closeBtn: { padding: 4 },
  title: { flex: 1, fontSize: 18, fontWeight: '700' as const, color: Colors.text, textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 50 },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, marginBottom: 12, marginTop: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  typeChipActive: { backgroundColor: Colors.physicalActivity, borderColor: Colors.physicalActivity },
  typeChipText: { fontSize: 14, fontWeight: '500' as const, color: Colors.textSecondary },
  typeChipTextActive: { color: Colors.white, fontWeight: '600' as const },
  durationRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  durationIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.physicalActivityLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  durationInput: { flex: 1, fontSize: 28, fontWeight: '700' as const, color: Colors.text },
  durationUnit: { fontSize: 15, color: Colors.textSecondary },
  talkTestContainer: { gap: 10, marginBottom: 16 },
  talkTestCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: Colors.cardBorder,
  },
  talkTestCardActive: {
    borderColor: Colors.physicalActivity, backgroundColor: Colors.physicalActivityLight,
  },
  talkTestLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  talkTestIcon: { fontSize: 24, marginRight: 14 },
  talkTestTextWrap: { flex: 1 },
  talkTestLabel: { fontSize: 15, fontWeight: '600' as const, color: Colors.text, marginBottom: 2 },
  talkTestLabelActive: { color: Colors.physicalActivity },
  talkTestDesc: { fontSize: 12, color: Colors.textTertiary },
  talkTestDescActive: { color: Colors.physicalActivity },
  talkTestRadio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: Colors.cardBorder, alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
  talkTestRadioActive: { borderColor: Colors.physicalActivity },
  talkTestRadioDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.physicalActivity,
  },
  previewCard: {
    backgroundColor: Colors.physicalActivityLight, borderRadius: 14, padding: 18, marginBottom: 12,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  previewLabel: { fontSize: 14, fontWeight: '600' as const, color: Colors.physicalActivity },
  previewValue: { fontSize: 32, fontWeight: '800' as const, color: Colors.physicalActivity },
  weightNoteSmall: { fontSize: 11, color: Colors.textTertiary, marginTop: 6 },
  pointsCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: 20,
  },
  pointsLabel: { fontSize: 15, fontWeight: '600' as const, color: Colors.textSecondary },
  pointsValue: { fontSize: 22, fontWeight: '800' as const, color: Colors.physicalActivity },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.physicalActivity, borderRadius: 14, paddingVertical: 16, gap: 6,
  },
  submitBtnDisabled: { backgroundColor: Colors.cardBorder },
  submitBtnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
  submitBtnTextDisabled: { color: Colors.textTertiary },
  resultsContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  celebrationCard: {
    backgroundColor: Colors.card, borderRadius: 24, padding: 32,
    alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 8,
  },
  celebrationEmoji: { fontSize: 56, marginBottom: 12 },
  celebrationTitle: { fontSize: 26, fontWeight: '800' as const, color: Colors.text, marginBottom: 24 },
  calorieCircle: {
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: Colors.physicalActivityLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: 24, borderWidth: 3, borderColor: Colors.physicalActivity,
  },
  calorieValue: { fontSize: 36, fontWeight: '900' as const, color: Colors.physicalActivity, marginTop: 4 },
  calorieLabel: { fontSize: 13, fontWeight: '500' as const, color: Colors.physicalActivity },
  resultDetailsRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 20, width: '100%',
  },
  resultDetail: { flex: 1, alignItems: 'center' },
  resultDetailValue: { fontSize: 14, fontWeight: '700' as const, color: Colors.text, textAlign: 'center' as const },
  resultDetailLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  resultDivider: { width: 1, height: 30, backgroundColor: Colors.divider },
  weightNote: {
    fontSize: 12, color: Colors.textTertiary, textAlign: 'center' as const,
    marginBottom: 16, paddingHorizontal: 12,
  },
  pointsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.physicalActivityLight, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
  },
  pointsBannerText: { fontSize: 16, fontWeight: '700' as const, color: Colors.physicalActivity },
  saveFinalBtn: {
    backgroundColor: Colors.physicalActivity, borderRadius: 14, paddingVertical: 16,
    width: '100%', alignItems: 'center', marginTop: 24,
  },
  saveFinalBtnText: { fontSize: 17, fontWeight: '700' as const, color: Colors.white },
});
