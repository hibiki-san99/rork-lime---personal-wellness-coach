import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, BookOpen, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import SwipeToDelete from '@/components/SwipeToDelete';
import { JOURNAL_PROMPTS, calculateJournalPoints } from '@/constants/data';
import { useUser } from '@/context/UserContext';
import { useLanguage } from '@/context/LanguageContext';
import { JournalLog, MoodScore } from '@/types';

const MOOD_EMOJIS: { score: MoodScore; emoji: string; key: 'mood1' | 'mood2' | 'mood3' | 'mood4' | 'mood5' }[] = [
  { score: 1, emoji: '😔', key: 'mood1' },
  { score: 2, emoji: '😕', key: 'mood2' },
  { score: 3, emoji: '😐', key: 'mood3' },
  { score: 4, emoji: '🙂', key: 'mood4' },
  { score: 5, emoji: '😄', key: 'mood5' },
];

function moodToEmoji(score: number | undefined): string {
  if (!score) return '';
  const found = MOOD_EMOJIS.find(m => m.score === score);
  return found?.emoji ?? '';
}

export default function JournalLoggerScreen() {
  const router = useRouter();
  const { addJournalLog, journalLogs, deleteJournalLog } = useUser();
  const { t } = useLanguage();
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [entry, setEntry] = useState<string>('');
  const [mood, setMood] = useState<MoodScore | null>(null);

  const recentJournals = useMemo(() => {
    return [...journalLogs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
  }, [journalLogs]);

  const confirmDelete = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('journal.deleteJournalTitle'),
      t('journal.deleteJournalMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            deleteJournalLog(id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  }, [deleteJournalLog, t]);

  const todayPrompt = useMemo(() => {
    const dayOfWeek = new Date().getDay();
    return JOURNAL_PROMPTS[dayOfWeek] ?? JOURNAL_PROMPTS[0];
  }, []);

  const journalResult = useMemo(() => {
    return calculateJournalPoints(entry);
  }, [entry]);

  const pickMood = useCallback((score: MoodScore) => {
    setMood(score);
    void Haptics.selectionAsync();
  }, []);

  const saveJournal = useCallback(() => {
    if (mood === null) {
      Alert.alert(t('journal.moodRequired'), t('journal.moodRequiredMsg'));
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const { total } = calculateJournalPoints(entry);
    const log: JournalLog = {
      id: Date.now().toString(),
      date: today ?? '',
      prompt: todayPrompt?.prompt ?? '',
      entry: entry.trim(),
      mood,
      points: total,
      timestamp: Date.now(),
    };
    addJournalLog(log);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(t('journal.journalSaved'), t('journal.earnedPoints', { points: total }), [
      { text: t('common.ok'), onPress: () => router.back() },
    ]);
  }, [entry, mood, todayPrompt, addJournalLog, router, t]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} testID="journal-close">
            <X size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('journal.dailyJournal')}</Text>
          <TouchableOpacity onPress={saveJournal} style={styles.saveBtn} testID="journal-save">
            <Check size={18} color={Colors.white} />
            <Text style={styles.saveBtnText}>{t('common.save')}</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.moodBlock}>
              <Text style={styles.moodQuestion}>{t('journal.moodQuestion')}</Text>
              <View style={styles.moodRow}>
                {MOOD_EMOJIS.map(m => {
                  const selected = mood === m.score;
                  return (
                    <TouchableOpacity
                      key={m.score}
                      style={[styles.moodChip, selected && styles.moodChipSelected]}
                      onPress={() => pickMood(m.score)}
                      activeOpacity={0.7}
                      testID={`mood-${m.score}`}
                    >
                      <Text style={styles.moodEmoji}>{m.emoji}</Text>
                      <Text style={[styles.moodLabel, selected && styles.moodLabelSelected]}>
                        {t(`journal.${m.key}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.themeCard}>
              <View style={styles.themeIconWrap}>
                <BookOpen size={20} color={Colors.stressManagement} />
              </View>
              <Text style={styles.themeLabel}>{todayPrompt?.theme ?? ''}</Text>
            </View>

            <Text style={styles.prompt}>{todayPrompt?.prompt ?? ''}</Text>
            <Text style={styles.optionalLabel}>{t('journal.textOptional')}</Text>

            <TextInput
              style={styles.textArea}
              value={entry}
              onChangeText={setEntry}
              placeholder={t('journal.beginWriting')}
              placeholderTextColor={Colors.textTertiary}
              multiline
              textAlignVertical="top"
              testID="journal-input"
            />

            <View style={styles.footer}>
              <Text style={styles.charCount}>{t('journal.charCount', { chars: entry.length, words: entry.trim().split(/\s+/).filter(Boolean).length })}</Text>
              <Text style={styles.pointsHint}>+{journalResult.total} pts</Text>
            </View>

            {journalLogs.length > 0 && (
              <>
                <TouchableOpacity
                  style={styles.historyToggle}
                  onPress={() => { setShowHistory(!showHistory); void Haptics.selectionAsync(); }}
                >
                  <Clock size={14} color={Colors.stressManagement} />
                  <Text style={styles.historyToggleText}>
                    {showHistory ? t('journal.hidePast') : t('journal.showPast')} ({journalLogs.length})
                  </Text>
                </TouchableOpacity>
                {showHistory && (
                  <View style={styles.historyList}>
                    {recentJournals.map(j => (
                      <SwipeToDelete
                        key={j.id}
                        onDelete={() => confirmDelete(j.id)}
                      >
                        <View style={styles.historyCard}>
                          <View style={styles.historyCardHeader}>
                            <View style={styles.historyLeft}>
                              <Text style={styles.historyMood}>{moodToEmoji(j.mood)}</Text>
                              <Text style={styles.historyDate}>
                                {new Date(j.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </Text>
                            </View>
                            <Text style={styles.historyPoints}>+{j.points} pts</Text>
                          </View>
                          {j.entry.trim().length > 0 && (
                            <Text style={styles.historyEntry} numberOfLines={3}>{j.entry}</Text>
                          )}
                        </View>
                      </SwipeToDelete>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  flex: { flex: 1 },
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
  scroll: { padding: 20, paddingBottom: 60 },
  moodBlock: { marginBottom: 22 },
  moodQuestion: {
    fontSize: 16, fontWeight: '700' as const, color: Colors.text,
    marginBottom: 14, letterSpacing: -0.2,
  },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  moodChip: {
    flex: 1, backgroundColor: Colors.white,
    paddingVertical: 12, paddingHorizontal: 4, borderRadius: 16,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  moodChipSelected: {
    backgroundColor: Colors.stressManagementLight,
    borderColor: Colors.stressManagement,
    shadowColor: Colors.stressManagement, shadowOpacity: 0.2, shadowRadius: 10,
  },
  moodEmoji: { fontSize: 26, marginBottom: 4 },
  moodLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600' as const, textAlign: 'center' },
  moodLabelSelected: { color: Colors.stressManagement, fontWeight: '700' as const },
  themeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, alignSelf: 'flex-start',
    marginBottom: 14, borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  themeIconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.stressManagement,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
    shadowColor: Colors.stressManagement, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 2,
  },
  themeLabel: { fontSize: 13, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.1 },
  prompt: {
    fontSize: 22, fontWeight: '800' as const, color: Colors.text, lineHeight: 30,
    marginBottom: 8, letterSpacing: -0.4,
  },
  optionalLabel: {
    fontSize: 12, color: Colors.textTertiary, marginBottom: 10,
    fontStyle: 'italic' as const,
  },
  textArea: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 18,
    fontSize: 16, color: Colors.text, minHeight: 160, lineHeight: 24,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingHorizontal: 4,
  },
  charCount: { fontSize: 13, color: Colors.textTertiary },
  pointsHint: { fontSize: 14, fontWeight: '700' as const, color: Colors.stressManagement },
  historyToggle: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 6, marginTop: 24, paddingVertical: 12,
  },
  historyToggleText: { fontSize: 13, fontWeight: '700' as const, color: Colors.stressManagement },
  historyList: { marginTop: 8, gap: 10 },
  historyCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  historyCardHeader: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    alignItems: 'center' as const, marginBottom: 6,
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyMood: { fontSize: 20 },
  historyDate: { fontSize: 12, fontWeight: '700' as const, color: Colors.text },
  historyPoints: { fontSize: 11, fontWeight: '800' as const, color: Colors.stressManagement },
  historyEntry: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
});
