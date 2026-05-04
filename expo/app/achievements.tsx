import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter, Stack } from 'expo-router';
import Colors from '@/constants/colors';
import { useUser } from '@/context/UserContext';
import { useLanguage } from '@/context/LanguageContext';
import { Badge } from '@/types';

export default function AchievementsScreen() {
  const router = useRouter();
  const { badges } = useUser();
  const { t } = useLanguage();
  const [selectedLocked, setSelectedLocked] = useState<Badge | null>(null);

  const earnedBadges = useMemo(
    () => badges.filter(b => b.earned).sort((a, b) => {
      const dateA = a.earnedDate ? new Date(a.earnedDate).getTime() : 0;
      const dateB = b.earnedDate ? new Date(b.earnedDate).getTime() : 0;
      return dateB - dateA;
    }),
    [badges],
  );

  const lockedBadges = useMemo(() => badges.filter(b => !b.earned), [badges]);

  const handleLockedTap = useCallback((badge: Badge) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLocked(badge);
  }, []);

  const formatDate = useCallback((dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            testID="achievements-back-btn"
          >
            <ArrowLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('achievements.title')}</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{earnedBadges.length}</Text>
            <Text style={styles.summaryLabel}>{t('achievements.ofBadgesEarned', { total: badges.length })}</Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${badges.length > 0 ? (earnedBadges.length / badges.length) * 100 : 0}%` as any },
                ]}
              />
            </View>
          </View>

          {earnedBadges.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t('achievements.earned')}</Text>
              <View style={styles.grid}>
                {earnedBadges.map(b => (
                  <View key={b.id} style={styles.badgeCard}>
                    <View style={[styles.badgeIconWrap, { backgroundColor: b.color + '18' }]}>
                      <Text style={styles.badgeIcon}>{b.icon}</Text>
                    </View>
                    <Text style={styles.badgeName} numberOfLines={2}>{b.name}</Text>
                    <Text style={styles.badgeDate}>{formatDate(b.earnedDate)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {lockedBadges.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t('achievements.locked')}</Text>
              <View style={styles.grid}>
                {lockedBadges.map(b => (
                  <TouchableOpacity
                    key={b.id}
                    style={styles.lockedCard}
                    activeOpacity={0.7}
                    onPress={() => handleLockedTap(b)}
                  >
                    <View style={styles.lockedIconWrap}>
                      <Text style={styles.lockedIcon}>{b.icon}</Text>
                      <View style={styles.lockOverlay}>
                        <Lock size={14} color={Colors.textTertiary} />
                      </View>
                    </View>
                    <Text style={styles.lockedName} numberOfLines={2}>{b.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={!!selectedLocked}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedLocked(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedLocked(null)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelectedLocked(null)}
            >
              <X size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.modalIcon}>{selectedLocked?.icon}</Text>
            <Text style={styles.modalName}>{selectedLocked?.name}</Text>
            <View style={styles.modalDivider} />
            <Text style={styles.modalHowTo}>{t('achievements.howToEarn')}</Text>
            <Text style={styles.modalDesc}>{selectedLocked?.description}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  headerRight: { width: 40 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  summaryCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 24, alignItems: 'center',
    marginBottom: 24, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  summaryNumber: { fontSize: 40, fontWeight: '800' as const, color: Colors.physicalActivity },
  summaryLabel: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, fontWeight: '500' as const },
  progressBarBg: {
    width: '100%', height: 6, borderRadius: 3, backgroundColor: Colors.inputBg, marginTop: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', borderRadius: 3, backgroundColor: Colors.physicalActivity,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: '700' as const, color: Colors.text,
    marginBottom: 14, textTransform: 'uppercase' as const, letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28,
  },
  badgeCard: {
    width: '31%' as any, backgroundColor: Colors.card, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  badgeIconWrap: {
    width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  badgeIcon: { fontSize: 28 },
  badgeName: {
    fontSize: 11, fontWeight: '600' as const, color: Colors.text,
    textAlign: 'center', lineHeight: 15,
  },
  badgeDate: {
    fontSize: 10, color: Colors.textTertiary, marginTop: 4, fontWeight: '500' as const,
  },
  lockedCard: {
    width: '31%' as any, backgroundColor: Colors.inputBg, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.inputBorder,
  },
  lockedIconWrap: {
    width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.cardBorder, marginBottom: 10, position: 'relative',
  },
  lockedIcon: { fontSize: 28, opacity: 0.3 },
  lockOverlay: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  lockedName: {
    fontSize: 11, fontWeight: '600' as const, color: Colors.textTertiary,
    textAlign: 'center', lineHeight: 15,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 40,
  },
  modalCard: {
    backgroundColor: Colors.card, borderRadius: 20, padding: 28, alignItems: 'center',
    width: '100%', maxWidth: 300,
  },
  modalClose: {
    position: 'absolute', top: 12, right: 12,
    width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.inputBg,
    alignItems: 'center', justifyContent: 'center',
  },
  modalIcon: { fontSize: 48, marginBottom: 12 },
  modalName: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, textAlign: 'center' },
  modalDivider: {
    width: 40, height: 3, borderRadius: 2, backgroundColor: Colors.physicalActivity,
    marginVertical: 16,
  },
  modalHowTo: {
    fontSize: 12, fontWeight: '600' as const, color: Colors.textTertiary,
    textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6,
  },
  modalDesc: {
    fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20,
  },
});
