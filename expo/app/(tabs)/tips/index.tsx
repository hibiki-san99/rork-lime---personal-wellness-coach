import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lightbulb, Sparkles, CheckCircle, Circle, ChevronRight, Trophy } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/colors';
import { DAILY_TIPS } from '@/constants/data';
import { useUser } from '@/context/UserContext';
import { POINTS_PER_TIP, MISSION_MODULES } from '@/constants/missions';

export default function TipsScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { completeTip, isTipCompletedToday, tipCompletions, getMissionProgress } = useUser();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const todayTips = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const startIdx = (dayOfYear * 3) % DAILY_TIPS.length;
    const tips = [];
    for (let i = 0; i < 3; i++) {
      tips.push(DAILY_TIPS[(startIdx + i) % DAILY_TIPS.length]);
    }
    return tips;
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayTipPoints = useMemo(() => {
    return tipCompletions
      .filter(tc => tc.date === todayStr)
      .reduce((sum, tc) => sum + tc.points, 0);
  }, [tipCompletions, todayStr]);

  const handleToggleTip = useCallback((tipId: string) => {
    if (isTipCompletedToday(tipId)) return;
    const pts = completeTip(tipId);
    if (pts > 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [completeTip, isTipCompletedToday]);

  const moduleName = (id: string): string => {
    const key = `missions.modules.${id}.name`;
    const translated = t(key);
    return translated === key ? (MISSION_MODULES.find(m => m.id === id)?.name ?? id) : translated;
  };

  const pillarLabel = (pillar: string): string => {
    const key = `tips.pillarsByName.${pillar}`;
    const translated = t(key);
    return translated === key ? pillar : translated;
  };

  const tipContent = (id: string, fallback: string): string => {
    const key = `tips.tipById.${id}`;
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.headerSection}>
              <Lightbulb size={28} color={Colors.physicalActivity} />
              <Text style={styles.headerTitle}>{t('tips.headerTitle')}</Text>
              <Text style={styles.headerSub}>{t('tips.headerSub')}</Text>
            </View>

            {todayTipPoints > 0 && (
              <View style={styles.pointsBanner}>
                <Text style={styles.pointsBannerText}>
                  {t('tips.pointsBanner', { points: todayTipPoints })}
                </Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>
              <Sparkles size={16} color={Colors.physicalActivity} />{' '}{t('tips.todaysTips')}
            </Text>
            <Text style={styles.sectionHint}>
              {t('tips.sectionHint', { points: POINTS_PER_TIP })}
            </Text>

            {todayTips.map((tip, idx) => {
              const done = isTipCompletedToday(tip.id);
              return (
                <View key={tip.id + '-' + idx} style={[styles.tipCard, done && styles.tipCardDone]}>
                  <View style={[styles.tipPillarBadge, { backgroundColor: tip.color + '18' }]}>
                    <View style={[styles.tipPillarDot, { backgroundColor: tip.color }]} />
                    <Text style={[styles.tipPillarText, { color: tip.color }]}>{pillarLabel(tip.pillar)}</Text>
                  </View>
                  <Text style={styles.tipText}>{tipContent(tip.id, tip.tip)}</Text>
                  <TouchableOpacity
                    style={[styles.readBtn, done && styles.readBtnDone]}
                    onPress={() => handleToggleTip(tip.id)}
                    disabled={done}
                    activeOpacity={0.7}
                  >
                    {done ? (
                      <CheckCircle size={18} color={Colors.nutrition} />
                    ) : (
                      <Circle size={18} color={Colors.textTertiary} />
                    )}
                    <Text style={[styles.readBtnText, done && styles.readBtnTextDone]}>
                      {done ? t('tips.completed') : t('tips.iveReadThis')}
                    </Text>
                    {!done && (
                      <View style={styles.ptsBadge}>
                        <Text style={styles.ptsBadgeText}>+{POINTS_PER_TIP}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}

            <View style={styles.divider} />

            <View style={styles.missionsSectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>{t('tips.missionsHeader')}</Text>
                <Text style={styles.sectionSub}>{t('tips.missionsSub')}</Text>
              </View>
            </View>

            {MISSION_MODULES.map((mod) => {
              const progress = getMissionProgress(mod.id);
              const enrolled = !!progress;
              const completedCount = progress?.completedGoalIds.length ?? 0;
              const totalGoals = mod.goals.length;
              const allDone = enrolled && completedCount >= totalGoals;

              return (
                <TouchableOpacity
                  key={mod.id}
                  style={styles.moduleCard}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/missions' as any);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.moduleIconWrap, { backgroundColor: mod.color + '15' }]}>
                    <Text style={styles.moduleIcon}>{mod.icon}</Text>
                  </View>
                  <View style={styles.moduleInfo}>
                    <Text style={styles.moduleName}>{moduleName(mod.id)}</Text>
                    <Text style={styles.moduleGoalCount}>{t('tips.microGoals', { n: totalGoals })}</Text>
                    {enrolled && (
                      <View style={styles.moduleProgressRow}>
                        <View style={styles.moduleProgressBg}>
                          <View
                            style={[
                              styles.moduleProgressFill,
                              {
                                backgroundColor: mod.color,
                                width: `${(completedCount / totalGoals) * 100}%` as any,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.moduleProgressText, { color: mod.color }]}>
                          {completedCount}/{totalGoals}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.moduleRight}>
                    {allDone ? (
                      <View style={[styles.moduleBadge, { backgroundColor: mod.color + '15' }]}>
                        <Trophy size={16} color={mod.color} />
                      </View>
                    ) : enrolled ? (
                      <View style={[styles.moduleBadge, { backgroundColor: mod.color + '15' }]}>
                        <Text style={[styles.moduleBadgeText, { color: mod.color }]}>{t('tips.active')}</Text>
                      </View>
                    ) : (
                      <ChevronRight size={20} color={Colors.textTertiary} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={styles.motivationCard}>
              <Text style={styles.motivationEmoji}>💡</Text>
              <Text style={styles.motivationText}>
                {t('tips.motivation')}
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 30 },
  headerSection: { alignItems: 'center', marginBottom: 20, paddingTop: 8 },
  headerTitle: {
    fontSize: 26, fontWeight: '800' as const, color: Colors.text, marginTop: 10, letterSpacing: -0.5,
  },
  headerSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  pointsBanner: {
    backgroundColor: '#FFF8E1', borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#FFE082', alignItems: 'center',
  },
  pointsBannerText: { fontSize: 14, fontWeight: '600' as const, color: '#E65100' },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginBottom: 4 },
  sectionHint: { fontSize: 12, color: Colors.textTertiary, marginBottom: 10 },
  sectionSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  tipCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 18, marginTop: 12,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  tipCardDone: {
    borderColor: Colors.nutrition + '40', backgroundColor: '#FAFFF9',
  },
  tipPillarBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 6, marginBottom: 10,
  },
  tipPillarDot: { width: 8, height: 8, borderRadius: 4 },
  tipPillarText: { fontSize: 12, fontWeight: '600' as const },
  tipText: { fontSize: 15, color: Colors.text, lineHeight: 22, marginBottom: 14 },
  readBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: Colors.inputBg,
  },
  readBtnDone: {
    backgroundColor: '#E8F5E9',
  },
  readBtnText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary, flex: 1 },
  readBtnTextDone: { color: Colors.nutrition },
  ptsBadge: {
    backgroundColor: Colors.physicalActivityLight, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  ptsBadgeText: { fontSize: 11, fontWeight: '700' as const, color: Colors.physicalActivity },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: 24 },
  missionsSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 14,
  },
  moduleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  moduleIconWrap: {
    width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  moduleIcon: { fontSize: 24 },
  moduleInfo: { flex: 1 },
  moduleName: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  moduleGoalCount: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  moduleProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  moduleProgressBg: { flex: 1, height: 4, backgroundColor: Colors.inputBg, borderRadius: 2, overflow: 'hidden' },
  moduleProgressFill: { height: 4, borderRadius: 2 },
  moduleProgressText: { fontSize: 11, fontWeight: '700' as const },
  moduleRight: { marginLeft: 8 },
  moduleBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  moduleBadgeText: { fontSize: 11, fontWeight: '600' as const },
  motivationCard: {
    backgroundColor: '#FFF8E1', borderRadius: 16, padding: 20, marginTop: 20,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderWidth: 1, borderColor: '#FFE082',
  },
  motivationEmoji: { fontSize: 24, marginTop: 2 },
  motivationText: { flex: 1, fontSize: 14, color: '#BF360C', lineHeight: 21, fontWeight: '500' as const },
});
