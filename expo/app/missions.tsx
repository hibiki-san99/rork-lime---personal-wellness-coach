import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Trophy, Unlock } from 'lucide-react-native';
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

  if (selectedModule) {
    const progress = getMissionProgress(selectedModule.id);
    const enrolled = !!progress;
    const completedIds = progress?.completedGoalIds ?? [];
    const allDone = completedIds.length >= selectedModule.goals.length;

    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.moduleHeaderBg, { backgroundColor: selectedModule.color }]}>
          <SafeAreaView edges={['top']}>
            <View style={styles.moduleHeader}>
              <TouchableOpacity onPress={() => setSelectedModuleId(null)} style={styles.backBtn}>
                <ChevronLeft size={22} color={Colors.white} />
              </TouchableOpacity>
              <Text style={styles.moduleHeaderTitle}>{selectedModule.icon} {tModuleName(selectedModule.id)}</Text>
              <View style={{ width: 30 }} />
            </View>
          </SafeAreaView>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.moduleDesc}>{tModuleDesc(selectedModule.id, selectedModule.description)}</Text>

          {!enrolled ? (
            <View style={styles.enrollSection}>
              <Text style={styles.enrollText}>
                {t('missions.enrollText', { count: selectedModule.goals.length })}
              </Text>
              <TouchableOpacity
                style={[styles.enrollBtn, { backgroundColor: selectedModule.color }]}
                onPress={() => handleEnroll(selectedModule.id)}
              >
                <Unlock size={18} color={Colors.white} />
                <Text style={styles.enrollBtnText}>{t('missions.joinMission')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.progressBar}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: selectedModule.color,
                        width: `${(completedIds.length / selectedModule.goals.length) * 100}%` as any,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {t('missions.progressLabel', { done: completedIds.length, total: selectedModule.goals.length })}
                </Text>
              </View>

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
                    style={[styles.goalItem, done && styles.goalItemDone]}
                    onPress={() => !done && handleCompleteGoal(selectedModule.id, goal.id)}
                    activeOpacity={done ? 1 : 0.7}
                    disabled={done}
                  >
                    <View style={styles.goalCheck}>
                      {done ? (
                        <CheckCircle2 size={24} color={Colors.nutrition} />
                      ) : (
                        <Circle size={24} color={Colors.textTertiary} />
                      )}
                    </View>
                    <View style={styles.goalInfo}>
                      <Text style={[styles.goalTitle, done && styles.goalTitleDone]}>{tGoalTitle(goal.id, goal.title)}</Text>
                      <Text style={styles.goalDesc}>{tGoalDesc(goal.id, goal.description)}</Text>
                    </View>
                    {!done && (
                      <View style={[styles.goalPts, { backgroundColor: selectedModule.color + '15' }]}>
                        <Text style={[styles.goalPtsText, { color: selectedModule.color }]}>+{goal.points}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.headerSection}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtnLight}>
              <ChevronLeft size={22} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.pageTitle}>{t('missions.title')}</Text>
              <Text style={styles.pageSub}>{t('missions.sub')}</Text>
            </View>
            <View style={{ width: 30 }} />
          </View>

          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerEmoji}>🎯</Text>
            <Text style={styles.infoBannerText}>
              {t('missions.info')}
            </Text>
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
                onPress={() => setSelectedModuleId(mod.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.moduleIconWrap, { backgroundColor: mod.color + '15' }]}>
                  <Text style={styles.moduleIcon}>{mod.icon}</Text>
                </View>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleName}>{tModuleName(mod.id)}</Text>
                  <Text style={styles.moduleGoalCount}>{t('missions.microGoals', { n: totalGoals })}</Text>
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
                      <Text style={[styles.moduleBadgeText, { color: mod.color }]}>{t('missions.active')}</Text>
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
  scroll: { padding: 20, paddingBottom: 40 },
  headerSection: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingTop: 4,
  },
  backBtnLight: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  pageTitle: { fontSize: 24, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.5 },
  pageSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  infoBanner: {
    backgroundColor: '#E3EAF2', borderRadius: 14, padding: 16, marginBottom: 20,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    borderWidth: 1, borderColor: '#C5D5E4',
  },
  infoBannerEmoji: { fontSize: 22 },
  infoBannerText: { flex: 1, fontSize: 13, color: Colors.sleep, lineHeight: 20, fontWeight: '500' as const },
  moduleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  moduleIconWrap: {
    width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  moduleIcon: { fontSize: 26 },
  moduleInfo: { flex: 1 },
  moduleName: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  moduleGoalCount: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  moduleProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  moduleProgressBg: { flex: 1, height: 5, backgroundColor: Colors.inputBg, borderRadius: 3, overflow: 'hidden' },
  moduleProgressFill: { height: 5, borderRadius: 3 },
  moduleProgressText: { fontSize: 11, fontWeight: '700' as const },
  moduleRight: { marginLeft: 8 },
  moduleBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  moduleBadgeText: { fontSize: 11, fontWeight: '600' as const },

  moduleHeaderBg: { paddingBottom: 0 },
  moduleHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  moduleHeaderTitle: {
    flex: 1, fontSize: 18, fontWeight: '700' as const, color: Colors.white, textAlign: 'center',
  },
  moduleDesc: {
    fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginBottom: 20,
  },
  enrollSection: { alignItems: 'center', paddingVertical: 20 },
  enrollText: {
    fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 20,
  },
  enrollBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28,
    paddingVertical: 14, borderRadius: 14,
  },
  enrollBtnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
  progressBar: { marginBottom: 20 },
  progressBarBg: { height: 8, backgroundColor: Colors.inputBg, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, borderRadius: 4 },
  progressText: { fontSize: 12, color: Colors.textSecondary, marginTop: 6, textAlign: 'right' },
  completeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
    borderRadius: 14, marginBottom: 20, borderWidth: 1,
  },
  completeBannerText: { flex: 1 },
  completeBannerTitle: { fontSize: 16, fontWeight: '700' as const },
  completeBannerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  goalItem: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.card,
    borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  goalItemDone: {
    backgroundColor: '#FAFFF9', borderColor: Colors.nutrition + '40',
  },
  goalCheck: { marginRight: 12, marginTop: 2 },
  goalInfo: { flex: 1 },
  goalTitle: { fontSize: 15, fontWeight: '600' as const, color: Colors.text, lineHeight: 21 },
  goalTitleDone: { textDecorationLine: 'line-through', color: Colors.textTertiary },
  goalDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  goalPts: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  goalPtsText: { fontSize: 12, fontWeight: '700' as const },
});
