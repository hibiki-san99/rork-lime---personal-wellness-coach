import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Trophy, Unlock, Flame } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useUser } from '@/context/UserContext';
import { MISSION_MODULES, POINTS_MODULE_COMPLETE } from '@/constants/missions';
import { useTranslation } from 'react-i18next';

export default function MissionsScreen() {
  const router = useRouter();
  const { enrollInMission, completeMissionGoal, getMissionProgress } = useUser();
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const { t } = useTranslation();

  const tModuleName = (id: string): string => {
    const key = `missions.modules.${id}.name`;
    const v = t(key);
    return v === key ? (MISSION_MODULES.find(m => m.id === id)?.name ?? id) : v;
  };
  const tModuleDesc = (id: string, fallback: string): string => {
    const key = `missions.modules.${id}.description`;
    const v = t(key);
    return v === key ? fallback : v;
  };
  const tGoalTitle = (gid: string, fallback: string): string => {
    const key = `missions.goals.${gid}.title`;
    const v = t(key);
    return v === key ? fallback : v;
  };
  const tGoalDesc = (gid: string, fallback: string): string => {
    const key = `missions.goals.${gid}.description`;
    const v = t(key);
    return v === key ? fallback : v;
  };

  const selectedModule = useMemo(
    () => MISSION_MODULES.find(m => m.id === selectedModuleId) ?? null,
    [selectedModuleId]
  );

  const handleEnroll = useCallback((moduleId: string) => {
    enrollInMission(moduleId);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [enrollInMission]);

  const handleCompleteGoal = useCallback((moduleId: string, goalId: string) => {
    const pts = completeMissionGoal(moduleId, goalId);
    if (pts > 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [completeMissionGoal]);

  // ─── Overall progress across enrolled modules ───
  const overall = useMemo(() => {
    let totalGoals = 0;
    let doneGoals = 0;
    let enrolledCount = 0;
    let completedModules = 0;
    MISSION_MODULES.forEach(m => {
      const p = getMissionProgress(m.id);
      if (p) {
        enrolledCount += 1;
        totalGoals += m.goals.length;
        doneGoals += p.completedGoalIds.length;
        if (p.completedGoalIds.length >= m.goals.length) completedModules += 1;
      }
    });
    const pct = totalGoals === 0 ? 0 : Math.round((doneGoals / totalGoals) * 100);
    return { totalGoals, doneGoals, enrolledCount, completedModules, pct };
  }, [getMissionProgress]);

  const motivation = useMemo(() => {
    if (overall.enrolledCount === 0) return 'Pick a mission to get started 🌱';
    if (overall.pct === 0) return "Let's build that first habit 💪";
    if (overall.pct < 40) return "Great start. Keep stacking wins 🔥";
    if (overall.pct < 80) return "You're doing great! Keep going 💪";
    if (overall.pct < 100) return "Almost there. One push to glory ⚡";
    return 'Mission master. Pick another one 🏆';
  }, [overall]);

  if (selectedModule) {
    const progress = getMissionProgress(selectedModule.id);
    const enrolled = !!progress;
    const completedIds = progress?.completedGoalIds ?? [];
    const allDone = completedIds.length >= selectedModule.goals.length;
    const pct = Math.round((completedIds.length / selectedModule.goals.length) * 100);

    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView edges={['top']} style={styles.safe}>
          <View style={styles.detailHeaderRow}>
            <TouchableOpacity onPress={() => setSelectedModuleId(null)} style={styles.backBtnLight}>
              <ChevronLeft size={22} color={Colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <View style={{ width: 30 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.pageTitle}>{tModuleName(selectedModule.id)}</Text>
            <Text style={styles.pageSub}>{tModuleDesc(selectedModule.id, selectedModule.description)}</Text>

            {/* Hero progress card */}
            <View style={[styles.heroCard, { backgroundColor: selectedModule.color }]}>
              <Text style={styles.heroLabel}>{enrolled ? "Mission Progress" : "Ready to start"}</Text>
              <View style={styles.heroRow}>
                <Text style={styles.heroBig}>
                  {enrolled ? `${completedIds.length}/${selectedModule.goals.length}` : `0/${selectedModule.goals.length}`}
                </Text>
                <Text style={styles.heroPct}>{pct}%</Text>
              </View>
              <View style={styles.heroBarBg}>
                <View style={[styles.heroBarFill, { width: `${pct}%` as any }]} />
              </View>
              <Text style={styles.heroMsg}>
                {!enrolled ? "Tap below to join 🚀" : allDone ? "Mission complete! 🏆" : pct < 50 ? "You've got this 💪" : "Almost there! ⚡"}
              </Text>
            </View>

            {!enrolled ? (
              <TouchableOpacity
                style={[styles.enrollBtn, { backgroundColor: selectedModule.color }]}
                onPress={() => handleEnroll(selectedModule.id)}
                activeOpacity={0.85}
              >
                <Unlock size={18} color={Colors.white} />
                <Text style={styles.enrollBtnText}>{t('missions.joinMission')}</Text>
              </TouchableOpacity>
            ) : (
              <>
                {allDone && (
                  <View style={[styles.completeBanner, { backgroundColor: selectedModule.color + '15', borderColor: selectedModule.color + '40' }]}>
                    <Trophy size={22} color={selectedModule.color} />
                    <View style={styles.completeBannerText}>
                      <Text style={[styles.completeBannerTitle, { color: selectedModule.color }]}>
                        {t('missions.missionComplete')}
                      </Text>
                      <Text style={styles.completeBannerSub}>
                        {t('missions.missionCompleteSub', { name: tModuleName(selectedModule.id), points: POINTS_MODULE_COMPLETE })}
                      </Text>
                    </View>
                  </View>
                )}

                {selectedModule.goals.map((goal) => {
                  const done = completedIds.includes(goal.id);
                  return (
                    <TouchableOpacity
                      key={goal.id}
                      style={styles.goalCard}
                      onPress={() => !done && handleCompleteGoal(selectedModule.id, goal.id)}
                      activeOpacity={done ? 1 : 0.7}
                      disabled={done}
                    >
                      <View style={styles.goalCheckCol}>
                        {done ? (
                          <View style={[styles.checkDone, { borderColor: selectedModule.color }]}>
                            <CheckCircle2 size={22} color={selectedModule.color} fill={selectedModule.color + '20'} />
                          </View>
                        ) : (
                          <Circle size={26} color={Colors.textTertiary} strokeWidth={1.5} />
                        )}
                      </View>
                      <View style={styles.goalBody}>
                        <Text style={[styles.goalTitle, done && styles.goalTitleDone]}>{tGoalTitle(goal.id, goal.title)}</Text>
                        <Text style={styles.goalDesc} numberOfLines={2}>{tGoalDesc(goal.id, goal.description)}</Text>
                        <View style={styles.goalBarBg}>
                          <View style={[styles.goalBarFill, { backgroundColor: selectedModule.color, width: done ? '100%' : '0%' }]} />
                        </View>
                        <View style={styles.goalFooter}>
                          <Flame size={14} color={done ? '#F97316' : Colors.textTertiary} fill={done ? '#F97316' : 'transparent'} />
                          <Text style={[styles.goalFooterText, done && { color: '#F97316' }]}>
                            {done ? `+${goal.points} pts earned` : `+${goal.points} pts`}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.detailHeaderRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnLight}>
            <ChevronLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={{ width: 30 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.pageTitle}>{t('missions.title')}</Text>
          <Text style={styles.pageSub}>{t('missions.sub')}</Text>

          {/* Hero progress card */}
          <View style={[styles.heroCard, { backgroundColor: Colors.primary }]}>
            <Text style={styles.heroLabel}>This Week's Progress</Text>
            <View style={styles.heroRow}>
              <Text style={styles.heroBig}>
                {overall.enrolledCount === 0 ? '0/0' : `${overall.doneGoals}/${overall.totalGoals}`}
              </Text>
              <Text style={styles.heroPct}>{overall.pct}%</Text>
            </View>
            <View style={styles.heroBarBg}>
              <View style={[styles.heroBarFill, { width: `${overall.pct}%` as any }]} />
            </View>
            <Text style={styles.heroMsg}>{motivation}</Text>
          </View>

          {MISSION_MODULES.map((mod) => {
            const progress = getMissionProgress(mod.id);
            const enrolled = !!progress;
            const completedCount = progress?.completedGoalIds.length ?? 0;
            const totalGoals = mod.goals.length;
            const allDone = enrolled && completedCount >= totalGoals;
            const pct = enrolled ? Math.round((completedCount / totalGoals) * 100) : 0;

            return (
              <TouchableOpacity
                key={mod.id}
                style={styles.moduleCard}
                onPress={() => setSelectedModuleId(mod.id)}
                activeOpacity={0.7}
              >
                <View style={styles.moduleCheckCol}>
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
                <View style={styles.moduleBody}>
                  <Text style={[styles.moduleName, allDone && styles.goalTitleDone]}>{tModuleName(mod.id)}</Text>
                  <Text style={styles.moduleSub}>
                    {enrolled ? `${completedCount}/${totalGoals} goals` : `${totalGoals} micro-goals`}
                  </Text>
                  <View style={styles.goalBarBg}>
                    <View style={[styles.goalBarFill, { backgroundColor: mod.color, width: `${pct}%` as any }]} />
                  </View>
                  <View style={styles.goalFooter}>
                    {enrolled ? (
                      <>
                        <Flame size={14} color="#F97316" fill="#F97316" />
                        <Text style={[styles.goalFooterText, { color: '#F97316' }]}>
                          {allDone ? `${totalGoals} day streak` : `${completedCount} day streak`}
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.goalFooterText, { color: Colors.textTertiary }]}>Tap to start</Text>
                    )}
                  </View>
                </View>
                <View style={styles.moduleRightCol}>
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 4 },

  detailHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4,
  },
  backBtnLight: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.cardBorder,
  },

  pageTitle: { fontSize: 32, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.8 },
  pageSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 20 },

  // Hero
  heroCard: {
    borderRadius: 22, padding: 20, marginBottom: 22,
    shadowColor: Colors.primary, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: 'hidden',
  },
  heroLabel: { color: Colors.white, fontSize: 13, fontWeight: '600' as const, opacity: 0.9 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 },
  heroBig: { color: Colors.white, fontSize: 38, fontWeight: '800' as const, letterSpacing: -1 },
  heroPct: { color: Colors.white, fontSize: 40, fontWeight: '800' as const, opacity: 0.28, letterSpacing: -1 },
  heroBarBg: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 4, overflow: 'hidden',
    marginTop: 10,
  },
  heroBarFill: { height: 8, backgroundColor: Colors.white, borderRadius: 4 },
  heroMsg: { color: Colors.white, fontSize: 13, fontWeight: '600' as const, marginTop: 12, opacity: 0.95 },

  enrollBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 16, marginBottom: 20,
  },
  enrollBtnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },

  // Module list cards
  moduleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.cardBorder,
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  moduleCheckCol: { marginRight: 14 },
  moduleIconTile: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  moduleIconEmoji: { fontSize: 22 },
  checkDone: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  moduleBody: { flex: 1 },
  moduleName: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  moduleSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, marginBottom: 8 },
  moduleRightCol: { marginLeft: 8 },
  trophyPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },

  // Goal cards (detail view)
  goalCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.card,
    borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.cardBorder,
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  goalCheckCol: { marginRight: 14, paddingTop: 2 },
  goalBody: { flex: 1 },
  goalTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, lineHeight: 21 },
  goalTitleDone: { textDecorationLine: 'line-through', color: Colors.textTertiary },
  goalDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 17 },
  goalBarBg: { height: 6, backgroundColor: Colors.inputBg, borderRadius: 3, overflow: 'hidden', marginTop: 10 },
  goalBarFill: { height: 6, borderRadius: 3 },
  goalFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  goalFooterText: { fontSize: 12, fontWeight: '700' as const, color: Colors.textTertiary },

  completeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
    borderRadius: 14, marginBottom: 12, borderWidth: 1,
  },
  completeBannerText: { flex: 1 },
  completeBannerTitle: { fontSize: 16, fontWeight: '700' as const },
  completeBannerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
