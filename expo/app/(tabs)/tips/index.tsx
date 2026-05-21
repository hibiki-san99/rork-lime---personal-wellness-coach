import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Circle, ChevronRight, Trophy, Flame } from 'lucide-react-native';
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

  const completedToday = useMemo(
    () => todayTips.filter(tp => isTipCompletedToday(tp.id)).length,
    [todayTips, isTipCompletedToday]
  );
  const totalToday = todayTips.length;
  const pct = totalToday === 0 ? 0 : Math.round((completedToday / totalToday) * 100);

  const todayTipPoints = useMemo(() => {
    return tipCompletions
      .filter(tc => tc.date === todayStr)
      .reduce((sum, tc) => sum + tc.points, 0);
  }, [tipCompletions, todayStr]);

  // Streak: count distinct dates with at least one tip completion, ending at today
  const tipStreakDays = useMemo(() => {
    const dates = new Set(tipCompletions.map(tc => tc.date));
    let count = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = cursor.toISOString().split('T')[0] ?? '';
      if (dates.has(ds)) {
        count += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [tipCompletions]);

  const motivation = useMemo(() => {
    if (pct === 0) return "Fresh insights, fresh wins 🌱";
    if (pct < 50) return "Nice — knowledge is fuel 🔥";
    if (pct < 100) return "You're doing great! Keep going 💪";
    return "All caught up. Legend! 🏆";
  }, [pct]);

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
            <Text style={styles.pageTitle}>{t('tips.headerTitle')}</Text>
            <Text style={styles.pageSub}>{t('tips.headerSub')}</Text>

            {/* Hero progress card */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Today's Insights</Text>
              <View style={styles.heroRow}>
                <Text style={styles.heroBig}>{completedToday}/{totalToday}</Text>
                <Text style={styles.heroPct}>{pct}%</Text>
              </View>
              <View style={styles.heroBarBg}>
                <View style={[styles.heroBarFill, { width: `${pct}%` as any }]} />
              </View>
              <Text style={styles.heroMsg}>
                {todayTipPoints > 0 ? `${motivation}  ·  +${todayTipPoints} pts today` : motivation}
              </Text>
            </View>

            {todayTips.map((tip) => {
              const done = isTipCompletedToday(tip.id);
              return (
                <TouchableOpacity
                  key={tip.id}
                  style={styles.insightCard}
                  onPress={() => handleToggleTip(tip.id)}
                  disabled={done}
                  activeOpacity={done ? 1 : 0.7}
                >
                  <View style={styles.checkCol}>
                    {done ? (
                      <View style={[styles.checkDone, { borderColor: tip.color }]}>
                        <CheckCircle2 size={22} color={tip.color} fill={tip.color + '20'} />
                      </View>
                    ) : (
                      <Circle size={26} color={Colors.textTertiary} strokeWidth={1.5} />
                    )}
                  </View>
                  <View style={styles.insightBody}>
                    <Text style={[styles.tipText, done && styles.tipTextDone]}>
                      {tipContent(tip.id, tip.tip)}
                    </Text>
                    <View style={styles.miniBarBg}>
                      <View style={[styles.miniBarFill, { backgroundColor: tip.color, width: done ? '100%' : '0%' }]} />
                    </View>
                    <View style={styles.cardFooter}>
                      <Flame size={14} color={done ? '#F97316' : Colors.textTertiary} fill={done ? '#F97316' : 'transparent'} />
                      <Text style={[styles.cardFooterText, done && { color: '#F97316' }]}>
                        {done ? `${tipStreakDays || 1} day streak` : `+${POINTS_PER_TIP} pts · tap to read`}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            <Text style={styles.sectionTitle}>{t('tips.missionsHeader')}</Text>
            <Text style={styles.pageSub}>{t('tips.missionsSub')}</Text>

            {MISSION_MODULES.map((mod) => {
              const progress = getMissionProgress(mod.id);
              const enrolled = !!progress;
              const completedCount = progress?.completedGoalIds.length ?? 0;
              const totalGoals = mod.goals.length;
              const allDone = enrolled && completedCount >= totalGoals;
              const modPct = enrolled ? Math.round((completedCount / totalGoals) * 100) : 0;

              return (
                <TouchableOpacity
                  key={mod.id}
                  style={styles.insightCard}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/missions' as any);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.checkCol}>
                    {allDone ? (
                      <View style={[styles.checkDone, { borderColor: mod.color }]}>
                        <CheckCircle2 size={22} color={mod.color} fill={mod.color + '20'} />
                      </View>
                    ) : (
                      <View style={[styles.moduleIconTile, { backgroundColor: mod.color }]}>
                        <Text style={styles.moduleIconEmoji}>{mod.icon}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.insightBody}>
                    <Text style={[styles.modName, allDone && styles.tipTextDone]}>{moduleName(mod.id)}</Text>
                    <Text style={styles.modSub}>
                      {enrolled ? `${completedCount}/${totalGoals} goals` : t('tips.microGoals', { n: totalGoals })}
                    </Text>
                    <View style={styles.miniBarBg}>
                      <View style={[styles.miniBarFill, { backgroundColor: mod.color, width: `${modPct}%` as any }]} />
                    </View>
                    <View style={styles.cardFooter}>
                      {enrolled ? (
                        <>
                          <Flame size={14} color="#F97316" fill="#F97316" />
                          <Text style={[styles.cardFooterText, { color: '#F97316' }]}>
                            {allDone ? 'Mission complete' : `${completedCount} done`}
                          </Text>
                        </>
                      ) : (
                        <Text style={[styles.cardFooterText, { color: Colors.textTertiary }]}>Tap to start</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.rightCol}>
                    {allDone ? (
                      <View style={[styles.trophyPill, { backgroundColor: mod.color + '15' }]}>
                        <Trophy size={14} color={mod.color} />
                      </View>
                    ) : (
                      <ChevronRight size={20} color={Colors.textTertiary} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },

  pageTitle: { fontSize: 32, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.8 },
  pageSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 18 },

  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: 22, padding: 20, marginBottom: 22,
    shadowColor: Colors.primary, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: 'hidden',
  },
  heroLabel: { color: Colors.white, fontSize: 13, fontWeight: '600' as const, opacity: 0.9 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 },
  heroBig: { color: Colors.white, fontSize: 38, fontWeight: '800' as const, letterSpacing: -1 },
  heroPct: { color: Colors.white, fontSize: 40, fontWeight: '800' as const, opacity: 0.28, letterSpacing: -1 },
  heroBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 4, overflow: 'hidden', marginTop: 10 },
  heroBarFill: { height: 8, backgroundColor: Colors.white, borderRadius: 4 },
  heroMsg: { color: Colors.white, fontSize: 13, fontWeight: '600' as const, marginTop: 12, opacity: 0.95 },

  sectionTitle: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, marginTop: 12, letterSpacing: -0.4 },

  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.card,
    borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.cardBorder,
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  checkCol: { marginRight: 14, paddingTop: 2 },
  checkDone: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  moduleIconTile: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  moduleIconEmoji: { fontSize: 22 },
  insightBody: { flex: 1 },
  rightCol: { marginLeft: 8, paddingTop: 10 },
  trophyPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },

  pillarBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 5, marginBottom: 6,
  },
  pillarDot: { width: 6, height: 6, borderRadius: 3 },
  pillarText: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.2 },

  tipText: { fontSize: 14, color: Colors.text, lineHeight: 20, fontWeight: '600' as const },
  tipTextDone: { textDecorationLine: 'line-through', color: Colors.textTertiary, fontWeight: '500' as const },

  modName: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  modSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  miniBarBg: { height: 6, backgroundColor: Colors.inputBg, borderRadius: 3, overflow: 'hidden', marginTop: 10 },
  miniBarFill: { height: 6, borderRadius: 3 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  cardFooterText: { fontSize: 12, fontWeight: '700' as const, color: Colors.textTertiary },
});
