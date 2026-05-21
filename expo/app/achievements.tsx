import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, X, Trophy } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter, Stack } from 'expo-router';
import Colors from '@/constants/colors';
import { useUser } from '@/context/UserContext';
import { useLanguage } from '@/context/LanguageContext';
import { Badge, BadgeTier, BadgeCategory } from '@/types';

const TIER_META: Record<BadgeTier, { label: string; ring: string; chip: string; chipText: string; glow: string }> = {
  bronze:   { label: 'Bronze',   ring: '#C58A55', chip: '#F6E6D6', chipText: '#8C5A2B', glow: 'rgba(197,138,85,0.25)' },
  silver:   { label: 'Silver',   ring: '#9AA4B2', chip: '#E7EBF1', chipText: '#5B6573', glow: 'rgba(154,164,178,0.25)' },
  gold:     { label: 'Gold',     ring: '#E0A800', chip: '#FFF3CC', chipText: '#8A6A00', glow: 'rgba(224,168,0,0.30)' },
  platinum: { label: 'Platinum', ring: '#5BA3D0', chip: '#DDEEF8', chipText: '#21597D', glow: 'rgba(91,163,208,0.30)' },
};

const CATEGORY_ORDER: BadgeCategory[] = [
  'milestone', 'nutrition', 'activity', 'steps', 'sleep', 'journal', 'points', 'streak', 'health', 'wellness', 'social',
];
const CATEGORY_LABEL: Record<BadgeCategory, string> = {
  milestone: 'Milestones',
  nutrition: 'Nutrition',
  activity: 'Activity',
  steps: 'Steps',
  sleep: 'Sleep',
  journal: 'Journal',
  points: 'Points',
  streak: 'Streaks',
  health: 'Health',
  wellness: 'Wellness',
  social: 'Social',
};

export default function AchievementsScreen() {
  const router = useRouter();
  const { badges } = useUser();
  const { t } = useLanguage();
  const [selected, setSelected] = useState<Badge | null>(null);
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');

  const earnedCount = useMemo(() => badges.filter(b => b.earned).length, [badges]);
  const progressPct = badges.length > 0 ? (earnedCount / badges.length) * 100 : 0;

  const filtered = useMemo(() => {
    if (filter === 'earned') return badges.filter(b => b.earned);
    if (filter === 'locked') return badges.filter(b => !b.earned);
    return badges;
  }, [badges, filter]);

  const grouped = useMemo(() => {
    const map = new Map<BadgeCategory, Badge[]>();
    for (const b of filtered) {
      const cat = (b.category ?? 'milestone') as BadgeCategory;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(b);
    }
    // Sort each category: earned first (newest), then locked
    for (const [, arr] of map) {
      arr.sort((a, b) => {
        if (a.earned && !b.earned) return -1;
        if (!a.earned && b.earned) return 1;
        if (a.earned && b.earned) {
          const dA = a.earnedDate ? new Date(a.earnedDate).getTime() : 0;
          const dB = b.earnedDate ? new Date(b.earnedDate).getTime() : 0;
          return dB - dA;
        }
        // both locked: by tier
        const tierOrder: BadgeTier[] = ['bronze', 'silver', 'gold', 'platinum'];
        return tierOrder.indexOf(a.tier ?? 'bronze') - tierOrder.indexOf(b.tier ?? 'bronze');
      });
    }
    return CATEGORY_ORDER
      .filter(cat => map.has(cat))
      .map(cat => ({ category: cat, items: map.get(cat) ?? [] }));
  }, [filtered]);

  const handleTap = useCallback((badge: Badge) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(badge);
  }, []);

  const handleFilter = useCallback((f: 'all' | 'earned' | 'locked') => {
    void Haptics.selectionAsync();
    setFilter(f);
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
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            testID="achievements-back-btn"
          >
            <ArrowLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{t('achievements.title')}</Text>
          <Text style={styles.subtitle}>
            {t('achievements.ofBadgesEarned', { total: badges.length })}
          </Text>

          {/* Hero card */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.trophyTile}>
                <Trophy size={22} color={Colors.white} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>Collection progress</Text>
                <Text style={styles.heroValue}>
                  {earnedCount}
                  <Text style={styles.heroValueDim}>/{badges.length}</Text>
                </Text>
              </View>
              <Text style={styles.heroPct}>{Math.round(progressPct)}%</Text>
            </View>
            <View style={styles.heroBarBg}>
              <View style={[styles.heroBarFill, { width: `${progressPct}%` as any }]} />
            </View>
            <Text style={styles.heroMotivation}>
              {progressPct === 0
                ? 'Start logging to unlock your first badge!'
                : progressPct < 25
                  ? 'You\'re just getting started. Keep going!'
                  : progressPct < 50
                    ? 'Nice momentum — quarter of the way there!'
                    : progressPct < 75
                      ? 'Halfway hero. The rare ones are within reach!'
                      : progressPct < 100
                        ? 'Almost a full set — chase those last few!'
                        : 'Legendary. You have collected them all.'}
            </Text>
          </View>

          {/* Filter segment */}
          <View style={styles.segment}>
            {(['all', 'earned', 'locked'] as const).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.segmentItem, filter === f && styles.segmentItemActive]}
                onPress={() => handleFilter(f)}
              >
                <Text style={[styles.segmentText, filter === f && styles.segmentTextActive]}>
                  {f === 'all' ? `All · ${badges.length}` : f === 'earned' ? `Earned · ${earnedCount}` : `Locked · ${badges.length - earnedCount}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category sections */}
          {grouped.map(group => (
            <View key={group.category} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{CATEGORY_LABEL[group.category]}</Text>
                <Text style={styles.sectionCount}>
                  {group.items.filter(b => b.earned).length}/{group.items.length}
                </Text>
              </View>
              <View style={styles.grid}>
                {group.items.map(b => (
                  <BadgeCard key={b.id} badge={b} onPress={handleTap} formatDate={formatDate} />
                ))}
              </View>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={!!selected}
        animationType="fade"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelected(null)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelected(null)}
            >
              <X size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            {selected && (() => {
              const tier = (selected.tier ?? 'bronze') as BadgeTier;
              const meta = TIER_META[tier];
              const isEarned = selected.earned;
              return (
                <>
                  <View style={[
                    styles.modalIconRing,
                    {
                      borderColor: isEarned ? meta.ring : Colors.cardBorder,
                      backgroundColor: isEarned ? selected.color + '15' : Colors.inputBg,
                      shadowColor: isEarned ? meta.glow : 'transparent',
                    },
                  ]}>
                    <Text style={[styles.modalIcon, !isEarned && { opacity: 0.35 }]}>{selected.icon}</Text>
                    {!isEarned && (
                      <View style={styles.modalLockOverlay}>
                        <Lock size={16} color={Colors.textSecondary} />
                      </View>
                    )}
                  </View>
                  <View style={[styles.tierChip, { backgroundColor: meta.chip }]}>
                    <Text style={[styles.tierChipText, { color: meta.chipText }]}>{meta.label}</Text>
                  </View>
                  <Text style={styles.modalName}>{selected.name}</Text>
                  <View style={[styles.modalDivider, { backgroundColor: meta.ring }]} />
                  <Text style={styles.modalHowTo}>
                    {isEarned ? 'EARNED' : t('achievements.howToEarn')}
                  </Text>
                  <Text style={styles.modalDesc}>{selected.description}</Text>
                  {isEarned && selected.earnedDate && (
                    <Text style={styles.modalEarnedDate}>{formatDate(selected.earnedDate)}</Text>
                  )}
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

interface BadgeCardProps {
  badge: Badge;
  onPress: (b: Badge) => void;
  formatDate: (d?: string) => string;
}

const BadgeCard = React.memo(({ badge, onPress, formatDate }: BadgeCardProps) => {
  const tier = (badge.tier ?? 'bronze') as BadgeTier;
  const meta = TIER_META[tier];
  const isEarned = badge.earned;

  return (
    <TouchableOpacity
      style={[styles.card, isEarned && { shadowColor: meta.glow, shadowOpacity: 1, shadowRadius: 10 }]}
      onPress={() => onPress(badge)}
      activeOpacity={0.85}
    >
      <View style={[
        styles.iconRing,
        {
          borderColor: isEarned ? meta.ring : Colors.cardBorder,
          backgroundColor: isEarned ? badge.color + '15' : Colors.inputBg,
        },
      ]}>
        <Text style={[styles.icon, !isEarned && styles.iconLocked]}>{badge.icon}</Text>
        {!isEarned && (
          <View style={styles.lockChip}>
            <Lock size={11} color={Colors.textSecondary} />
          </View>
        )}
      </View>

      <View style={[styles.tierStripe, { backgroundColor: isEarned ? meta.ring : Colors.cardBorder }]} />

      <Text
        style={[styles.name, !isEarned && { color: Colors.textTertiary }]}
        numberOfLines={2}
      >
        {badge.name}
      </Text>
      {isEarned && badge.earnedDate ? (
        <Text style={styles.date}>{formatDate(badge.earnedDate)}</Text>
      ) : (
        <Text style={[styles.tierLabel, { color: meta.chipText }]}>{meta.label}</Text>
      )}
    </TouchableOpacity>
  );
});
BadgeCard.displayName = 'BadgeCard';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  title: { fontSize: 30, fontWeight: '800' as const, color: Colors.text, marginTop: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 18 },

  heroCard: {
    backgroundColor: Colors.primary, borderRadius: 22, padding: 18,
    shadowColor: Colors.primary, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
    elevation: 6, marginBottom: 16,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  trophyTile: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.8 },
  heroValue: { color: Colors.white, fontSize: 30, fontWeight: '800' as const, marginTop: 2 },
  heroValueDim: { color: 'rgba(255,255,255,0.55)', fontSize: 22, fontWeight: '700' as const },
  heroPct: { color: 'rgba(255,255,255,0.55)', fontSize: 44, fontWeight: '800' as const, letterSpacing: -1 },
  heroBarBg: {
    height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden', marginTop: 14,
  },
  heroBarFill: { height: '100%', backgroundColor: Colors.white, borderRadius: 4 },
  heroMotivation: {
    color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '500' as const,
    marginTop: 12, lineHeight: 18,
  },

  segment: {
    flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 14, padding: 4,
    marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentItem: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
  },
  segmentItemActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary },
  segmentTextActive: { color: Colors.white },

  section: { marginBottom: 22 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: '800' as const, color: Colors.text,
    textTransform: 'uppercase' as const, letterSpacing: 0.7,
  },
  sectionCount: {
    fontSize: 12, fontWeight: '700' as const, color: Colors.textSecondary,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },

  card: {
    width: '31.5%' as any, backgroundColor: Colors.card, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    overflow: 'hidden',
  },
  iconRing: {
    width: 58, height: 58, borderRadius: 29,
    borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  icon: { fontSize: 28 },
  iconLocked: { opacity: 0.35 },
  lockChip: {
    position: 'absolute', bottom: -4, right: -4,
    width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.cardBorder,
  },
  tierStripe: {
    width: 24, height: 3, borderRadius: 2, marginBottom: 6,
  },
  name: {
    fontSize: 11, fontWeight: '700' as const, color: Colors.text,
    textAlign: 'center', lineHeight: 14, minHeight: 28,
  },
  date: {
    fontSize: 9.5, color: Colors.textTertiary, marginTop: 2, fontWeight: '500' as const,
  },
  tierLabel: {
    fontSize: 9.5, marginTop: 2, fontWeight: '700' as const,
    textTransform: 'uppercase' as const, letterSpacing: 0.5,
  },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  modalCard: {
    backgroundColor: Colors.card, borderRadius: 24, padding: 28, alignItems: 'center',
    width: '100%', maxWidth: 320,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalClose: {
    position: 'absolute', top: 12, right: 12,
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.inputBg,
    alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  modalIconRing: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
    position: 'relative',
  },
  modalIcon: { fontSize: 48 },
  modalLockOverlay: {
    position: 'absolute', bottom: -2, right: -2,
    width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.cardBorder,
  },
  tierChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 8,
  },
  tierChipText: {
    fontSize: 11, fontWeight: '800' as const,
    textTransform: 'uppercase' as const, letterSpacing: 0.8,
  },
  modalName: { fontSize: 20, fontWeight: '800' as const, color: Colors.text, textAlign: 'center' },
  modalDivider: {
    width: 44, height: 3, borderRadius: 2, marginVertical: 14,
  },
  modalHowTo: {
    fontSize: 11, fontWeight: '800' as const, color: Colors.textTertiary,
    textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 6,
  },
  modalDesc: {
    fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20,
  },
  modalEarnedDate: {
    fontSize: 12, color: Colors.textTertiary, marginTop: 10, fontWeight: '600' as const,
  },
});
