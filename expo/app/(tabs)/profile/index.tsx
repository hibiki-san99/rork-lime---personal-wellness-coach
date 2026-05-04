import React, { useMemo, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Award, Flame, Footprints, RotateCcw, LogOut, Shield, BarChart3, Camera as CameraIcon, ImageIcon, User, Beaker, ChevronRight, Trophy, Target, Activity, Scale } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getBMI } from '@/utils/heartAge';
import { useWaterReminder } from '@/hooks/useWaterReminder';
import { Droplets, Bell, BellOff } from 'lucide-react-native';
import { HealthGoal, ActivityLevel } from '@/types';

const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/thumbs/png?seed=Felix&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/thumbs/png?seed=Aneka&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/thumbs/png?seed=Milo&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/thumbs/png?seed=Bella&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/thumbs/png?seed=Oscar&backgroundColor=c0e8d5',
  'https://api.dicebear.com/7.x/thumbs/png?seed=Luna&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/thumbs/png?seed=Max&backgroundColor=d4edda',
  'https://api.dicebear.com/7.x/thumbs/png?seed=Chloe&backgroundColor=f9d1d1',
];



export default function ProfileScreen() {
  const router = useRouter();
  const {
    profile, heartAgeResult, totalPoints, badges, mealLogs,
    journalLogs, activityLogs, sleepLogs, weeklyStreak, resetUser, updateProfile,
    waterReminder, updateWaterReminder, nutrientTargets, addHealthMarker,
  } = useUser();
  const { user: authUser, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const HEALTH_GOALS: { value: HealthGoal; emoji: string; title: string }[] = [
    { value: 'lose_weight', emoji: '\u2696\uFE0F', title: t('onboarding.loseWeight') },
    { value: 'lower_cholesterol', emoji: '\uD83D\uDCC9', title: t('onboarding.lowerCholesterol') },
    { value: 'manage_diabetes', emoji: '\uD83E\uDE78', title: t('onboarding.manageDiabetes') },
    { value: 'heart_health', emoji: '\u2764\uFE0F', title: t('onboarding.improveHeartHealth') },
    { value: 'sleep_better', emoji: '\uD83D\uDE34', title: t('onboarding.sleepBetter') },
    { value: 'energy_focus', emoji: '\uD83E\uDDE0', title: t('onboarding.boostEnergy') },
  ];

  const ACTIVITY_LEVELS: { value: ActivityLevel; emoji: string; title: string; multiplier: string }[] = [
    { value: 'sedentary', emoji: '\uD83E\uDE91', title: t('onboarding.mostlySitting'), multiplier: '\u00D7 1.2' },
    { value: 'moderate', emoji: '\uD83D\uDEB6', title: t('onboarding.mixSittingMoving'), multiplier: '\u00D7 1.375' },
    { value: 'active', emoji: '\uD83C\uDFC3', title: t('onboarding.mostlyOnFeet'), multiplier: '\u00D7 1.55' },
  ];
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [editingWeight, setEditingWeight] = useState(false);
  const [weightInput, setWeightInput] = useState('');


  useWaterReminder(waterReminder);

  const handleToggleWater = useCallback(() => {
    const newEnabled = !waterReminder.enabled;
    updateWaterReminder({ enabled: newEnabled });
    void Haptics.notificationAsync(
      newEnabled ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
  }, [waterReminder.enabled, updateWaterReminder]);

  const handleWaterInterval = useCallback((minutes: number) => {
    updateWaterReminder({ intervalMinutes: minutes });
    void Haptics.selectionAsync();
  }, [updateWaterReminder]);

  const earnedBadges = useMemo(() => badges.filter(b => b.earned), [badges]);
  const recentBadges = useMemo(() => {
    return [...earnedBadges]
      .sort((a, b) => {
        const dateA = a.earnedDate ? new Date(a.earnedDate).getTime() : 0;
        const dateB = b.earnedDate ? new Date(b.earnedDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 3);
  }, [earnedBadges]);
  const bmi = useMemo(() => {
    if (!profile) return 0;
    return getBMI(profile.heightCm, profile.weightKg);
  }, [profile]);

  const initials = useMemo(() => {
    if (!profile?.name) return '?';
    return profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }, [profile?.name]);

  const stats = useMemo(() => [
    { label: t('profile.meals'), value: mealLogs.length, color: Colors.nutrition },
    { label: t('profile.journals'), value: journalLogs.length, color: Colors.stressManagement },
    { label: t('profile.activities'), value: activityLogs.length, color: Colors.physicalActivity },
    { label: t('profile.sleepLogs'), value: sleepLogs.length, color: Colors.sleep },
  ], [mealLogs, journalLogs, activityLogs, sleepLogs, t]);

  const handlePickPhoto = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets[0]) {
        updateProfile({ avatarUrl: result.assets[0].uri });
        setShowAvatarModal(false);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.log('Photo picker error:', error);
    }
  }, [updateProfile]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('profile.permissionNeeded'), t('profile.cameraAccessRequired'));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.6,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets[0]) {
        updateProfile({ avatarUrl: result.assets[0].uri });
        setShowAvatarModal(false);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.log('Camera error:', error);
    }
  }, [updateProfile]);

  const handleSelectAvatar = useCallback((url: string) => {
    updateProfile({ avatarUrl: url });
    setShowAvatarModal(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [updateProfile]);

  const handleRemovePhoto = useCallback(() => {
    updateProfile({ avatarUrl: '' });
    setShowAvatarModal(false);
    void Haptics.selectionAsync();
  }, [updateProfile]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      t('common.signOut'),
      t('profile.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.signOut'),
          onPress: () => {
            void logout();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [logout, t]);

  const handleReset = useCallback(() => {
    Alert.alert(
      t('profile.resetData'),
      t('profile.resetConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.reset'),
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            void resetUser();
            router.replace('/onboarding');
          },
        },
      ]
    );
  }, [resetUser, router, t]);

  const hasAvatar = !!profile?.avatarUrl;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.profileHeader}>
            <TouchableOpacity
              onPress={() => { setShowAvatarModal(true); void Haptics.selectionAsync(); }}
              activeOpacity={0.7}
              style={styles.avatarTouchable}
            >
              {hasAvatar ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>{initials}</Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <CameraIcon size={12} color={Colors.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.profileName}>{profile?.name ?? t('common.user')}</Text>
            <Text style={styles.profileTeam}>{profile?.teamName}</Text>
            <Text style={styles.profileEmail}>{profile?.email}</Text>
          </View>

          {heartAgeResult && (
            <View style={styles.heartAgeCard}>
              <View style={styles.heartAgeLeft}>
                <Heart size={22} color={heartAgeResult.heartAge <= heartAgeResult.chronologicalAge ? Colors.nutrition : Colors.riskySubstances} />
                <View style={styles.heartAgeInfo}>
                  <Text style={styles.heartAgeLabel}>{t('profile.heartAge')}</Text>
                  <Text style={[
                    styles.heartAgeNum,
                    { color: heartAgeResult.heartAge <= heartAgeResult.chronologicalAge ? Colors.nutrition : Colors.riskySubstances }
                  ]}>
                    {heartAgeResult.heartAge}
                  </Text>
                </View>
              </View>
              <View style={styles.heartAgeDivider} />
              <View style={styles.heartAgeRight}>
                <Text style={styles.heartAgeRightLabel}>{t('profile.actualAge')}</Text>
                <Text style={styles.heartAgeRightNum}>{heartAgeResult.chronologicalAge}</Text>
              </View>
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Flame size={18} color={Colors.physicalActivity} />
              <Text style={styles.statValue}>{totalPoints}</Text>
              <Text style={styles.statLabel}>{t('profile.totalPoints')}</Text>
            </View>
            <View style={styles.statCard}>
              <Footprints size={18} color={Colors.socialConnection} />
              <Text style={styles.statValue}>{weeklyStreak}</Text>
              <Text style={styles.statLabel}>{t('profile.weekStreak')}</Text>
            </View>
            <View style={styles.statCard}>
              <Award size={18} color={Colors.stressManagement} />
              <Text style={styles.statValue}>{earnedBadges.length}</Text>
              <Text style={styles.statLabel}>{t('profile.badges')}</Text>
            </View>
          </View>

          {bmi > 0 && (
            <View style={styles.bmiCard}>
              <Text style={styles.bmiLabel}>{t('healthMarkers.bmi')}</Text>
              <Text style={styles.bmiValue}>{bmi}</Text>
              <Text style={styles.bmiCategory}>
                {bmi < 18.5 ? t('profile.underweight') : bmi < 25 ? t('profile.normalBmi') : bmi < 30 ? t('profile.overweight') : t('profile.obese')}
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>{t('profile.myGoalsMetrics')}</Text>
          <View style={styles.goalsCard}>
            <TouchableOpacity
              style={styles.goalsRow}
              onPress={() => { setShowGoalPicker(true); void Haptics.selectionAsync(); }}
              activeOpacity={0.7}
              testID="edit-health-goal"
            >
              <Target size={18} color={Colors.socialConnection} />
              <View style={styles.goalsRowInfo}>
                <Text style={styles.goalsRowLabel}>{t('profile.healthGoal')}</Text>
                <Text style={styles.goalsRowValue}>
                  {profile?.healthGoal
                    ? HEALTH_GOALS.find(g => g.value === profile.healthGoal)?.emoji + ' ' + HEALTH_GOALS.find(g => g.value === profile.healthGoal)?.title
                    : t('common.notSet')}
                </Text>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </TouchableOpacity>

            <View style={styles.goalsRowDivider} />

            <TouchableOpacity
              style={styles.goalsRow}
              onPress={() => { setShowActivityPicker(true); void Haptics.selectionAsync(); }}
              activeOpacity={0.7}
              testID="edit-activity-level"
            >
              <Activity size={18} color={Colors.physicalActivity} />
              <View style={styles.goalsRowInfo}>
                <Text style={styles.goalsRowLabel}>{t('profile.activityLevel')}</Text>
                <Text style={styles.goalsRowValue}>
                  {profile?.activityLevel
                    ? ACTIVITY_LEVELS.find(a => a.value === profile.activityLevel)?.emoji + ' ' + ACTIVITY_LEVELS.find(a => a.value === profile.activityLevel)?.title
                    : t('common.notSet')}
                </Text>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </TouchableOpacity>

            <View style={styles.goalsRowDivider} />

            <TouchableOpacity
              style={styles.goalsRow}
              onPress={() => {
                setEditingWeight(true);
                setWeightInput(String(profile?.weightKg ?? ''));
                void Haptics.selectionAsync();
              }}
              activeOpacity={0.7}
              testID="edit-weight"
            >
              <Scale size={18} color="#5C6BC0" />
              <View style={styles.goalsRowInfo}>
                <Text style={styles.goalsRowLabel}>{t('profile.currentWeight')}</Text>
                <Text style={styles.goalsRowValue}>{profile?.weightKg ?? '—'} kg</Text>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {nutrientTargets && (
            <View style={styles.targetsCard}>
              <Text style={styles.targetsTitle}>{t('profile.yourCalculatedTargets')}</Text>
              <View style={styles.targetsGrid}>
                <View style={styles.targetItem}>
                  <Text style={styles.targetItemValue}>{nutrientTargets.calories}</Text>
                  <Text style={styles.targetItemLabel}>{t('profile.kcalPerDay')}</Text>
                </View>
                <View style={styles.targetItem}>
                  <Text style={styles.targetItemValue}>{nutrientTargets.carbsG}g</Text>
                  <Text style={styles.targetItemLabel}>{t('dashboard.carbs')}</Text>
                </View>
                <View style={styles.targetItem}>
                  <Text style={styles.targetItemValue}>{nutrientTargets.proteinG}g</Text>
                  <Text style={styles.targetItemLabel}>{t('dashboard.protein')}</Text>
                </View>
                <View style={styles.targetItem}>
                  <Text style={styles.targetItemValue}>{nutrientTargets.fiberG}g</Text>
                  <Text style={styles.targetItemLabel}>{t('dashboard.fiber')}</Text>
                </View>
                <View style={styles.targetItem}>
                  <Text style={styles.targetItemValue}>{'<'}{nutrientTargets.addedSugarG}g</Text>
                  <Text style={styles.targetItemLabel}>{t('dashboard.addedSugar')}</Text>
                </View>
                <View style={styles.targetItem}>
                  <Text style={styles.targetItemValue}>{'<'}{nutrientTargets.saturatedFatG}g</Text>
                  <Text style={styles.targetItemLabel}>{t('profile.satFat')}</Text>
                </View>
              </View>
              <Text style={styles.targetsNote}>
                {t('profile.targetsNote')}
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>{t('profile.activitySummary')}</Text>
          <View style={styles.summaryGrid}>
            {stats.map(s => (
              <View key={s.label} style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.summaryLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.badgeSectionHeader}>
            <View style={styles.badgeSectionLeft}>
              <Trophy size={18} color={Colors.physicalActivity} />
              <Text style={styles.sectionTitle}>{t('profile.badges')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => { void Haptics.selectionAsync(); router.push('/achievements' as any); }}
              style={styles.viewAllBtn}
              testID="view-all-badges-btn"
            >
              <Text style={styles.viewAllText}>{t('profile.viewAll')}</Text>
              <ChevronRight size={14} color={Colors.physicalActivity} />
            </TouchableOpacity>
          </View>
          {recentBadges.length > 0 ? (
            <View style={styles.recentBadgeRow}>
              {recentBadges.map(b => (
                <View key={b.id} style={styles.recentBadgeCard}>
                  <Text style={styles.recentBadgeIcon}>{b.icon}</Text>
                  <Text style={styles.recentBadgeName} numberOfLines={1}>{b.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.noBadgesCard}
              onPress={() => { void Haptics.selectionAsync(); router.push('/achievements' as any); }}
              activeOpacity={0.7}
            >
              <Text style={styles.noBadgesText}>{t('profile.noBadgesYet')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.healthMarkersBtn}
            onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/health-markers' as any); }}
            testID="health-markers-btn"
          >
            <Beaker size={18} color="#00897B" />
            <Text style={styles.healthMarkersBtnText}>{t('profile.healthMarkersBtn')}</Text>
            <ChevronRight size={16} color="#00897B" />
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>{t('profile.waterReminders')}</Text>
          <View style={styles.waterCard}>
            <View style={styles.waterRow}>
              <View style={styles.waterIconWrap}>
                <Droplets size={20} color="#0288D1" />
              </View>
              <View style={styles.waterInfo}>
                <Text style={styles.waterTitle}>{t('profile.hydrationReminders')}</Text>
                <Text style={styles.waterSub}>
                  {waterReminder.enabled
                    ? t('profile.hydrationEnabled', { min: waterReminder.intervalMinutes, start: waterReminder.startHour, end: waterReminder.endHour })
                    : t('profile.hydrationDisabled')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleToggleWater}
                style={[styles.waterToggle, waterReminder.enabled && styles.waterToggleOn]}
              >
                {waterReminder.enabled ? (
                  <Bell size={16} color={Colors.white} />
                ) : (
                  <BellOff size={16} color={Colors.textTertiary} />
                )}
              </TouchableOpacity>
            </View>
            {waterReminder.enabled && (
              <View style={styles.waterIntervals}>
                <Text style={styles.waterIntLabel}>{t('profile.remindEvery')}</Text>
                {[30, 45, 60, 90, 120].map(min => (
                  <TouchableOpacity
                    key={min}
                    style={[
                      styles.waterIntChip,
                      waterReminder.intervalMinutes === min && styles.waterIntChipActive,
                    ]}
                    onPress={() => handleWaterInterval(min)}
                  >
                    <Text style={[
                      styles.waterIntText,
                      waterReminder.intervalMinutes === min && styles.waterIntTextActive,
                    ]}>
                      {min < 60 ? `${min}m` : `${min / 60}h`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/weekly-report' as any); }}
            testID="report-btn"
          >
            <BarChart3 size={18} color="#E65100" />
            <Text style={styles.reportBtnText}>{t('profile.weeklyReport')}</Text>
          </TouchableOpacity>

          {authUser?.isAdmin && (
            <TouchableOpacity
              style={styles.adminBtn}
              onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/admin' as any); }}
              testID="admin-btn"
            >
              <Shield size={18} color={Colors.socialConnection} />
              <Text style={styles.adminBtnText}>{t('profile.researchDashboard')}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.languageCard} testID="language-card">
            <Text style={styles.languageLabel}>{t('profile.language')}</Text>
            <View style={styles.languageRow}>
              <TouchableOpacity
                style={[styles.langOption, language === 'en' && styles.langOptionActive]}
                onPress={() => { void setLanguage('en'); void Haptics.selectionAsync(); }}
                testID="lang-en"
              >
                <Text style={[styles.langOptionText, language === 'en' && styles.langOptionTextActive]}>
                  {t('profile.english')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langOption, language === 'id' && styles.langOptionActive]}
                onPress={() => { void setLanguage('id'); void Haptics.selectionAsync(); }}
                testID="lang-id"
              >
                <Text style={[styles.langOptionText, language === 'id' && styles.langOptionTextActive]}>
                  {t('profile.indonesian')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} testID="logout-btn">
            <LogOut size={18} color={Colors.physicalActivity} />
            <Text style={styles.logoutBtnText}>{t('profile.logout')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetBtn} onPress={handleReset} testID="reset-btn">
            <RotateCcw size={18} color={Colors.riskySubstances} />
            <Text style={styles.resetBtnText}>{t('profile.resetData')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={showAvatarModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAvatarModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('profile.changePicture')}</Text>

            <View style={styles.photoOptions}>
              <TouchableOpacity style={styles.photoOptionBtn} onPress={handleTakePhoto}>
                <View style={[styles.photoOptionIcon, { backgroundColor: Colors.physicalActivityLight }]}>
                  <CameraIcon size={22} color={Colors.physicalActivity} />
                </View>
                <Text style={styles.photoOptionText}>{t('profile.camera')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoOptionBtn} onPress={handlePickPhoto}>
                <View style={[styles.photoOptionIcon, { backgroundColor: Colors.stressManagementLight }]}>
                  <ImageIcon size={22} color={Colors.stressManagement} />
                </View>
                <Text style={styles.photoOptionText}>{t('profile.gallery')}</Text>
              </TouchableOpacity>
              {hasAvatar && (
                <TouchableOpacity style={styles.photoOptionBtn} onPress={handleRemovePhoto}>
                  <View style={[styles.photoOptionIcon, { backgroundColor: Colors.riskySubstancesLight }]}>
                    <User size={22} color={Colors.riskySubstances} />
                  </View>
                  <Text style={styles.photoOptionText}>{t('profile.removePhoto')}</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.avatarSectionLabel}>{t('profile.orChooseAvatar')}</Text>
            <View style={styles.avatarGrid}>
              {DEFAULT_AVATARS.map((url, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.avatarOption,
                    profile?.avatarUrl === url && styles.avatarOptionSelected,
                  ]}
                  onPress={() => handleSelectAvatar(url)}
                >
                  <Image source={{ uri: url }} style={styles.avatarOptionImage} contentFit="cover" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showGoalPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGoalPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGoalPicker(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('profile.selectHealthGoal')}</Text>
            {HEALTH_GOALS.map(g => (
              <TouchableOpacity
                key={g.value}
                style={[
                  styles.pickerOption,
                  profile?.healthGoal === g.value && styles.pickerOptionActive,
                ]}
                onPress={() => {
                  updateProfile({ healthGoal: g.value });
                  setShowGoalPicker(false);
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              >
                <Text style={styles.pickerOptionEmoji}>{g.emoji}</Text>
                <Text style={[
                  styles.pickerOptionText,
                  profile?.healthGoal === g.value && styles.pickerOptionTextActive,
                ]}>{g.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showActivityPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowActivityPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActivityPicker(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('profile.selectActivityLevel')}</Text>
            {ACTIVITY_LEVELS.map(a => (
              <TouchableOpacity
                key={a.value}
                style={[
                  styles.pickerOption,
                  profile?.activityLevel === a.value && styles.pickerOptionActive,
                ]}
                onPress={() => {
                  updateProfile({ activityLevel: a.value });
                  setShowActivityPicker(false);
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              >
                <Text style={styles.pickerOptionEmoji}>{a.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.pickerOptionText,
                    profile?.activityLevel === a.value && styles.pickerOptionTextActive,
                  ]}>{a.title}</Text>
                  <Text style={styles.pickerOptionSub}>{a.multiplier}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={editingWeight}
        animationType="fade"
        transparent
        onRequestClose={() => setEditingWeight(false)}
      >
        <TouchableOpacity
          style={styles.weightModalOverlay}
          activeOpacity={1}
          onPress={() => setEditingWeight(false)}
        >
          <View style={styles.weightModalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.weightModalTitle}>{t('profile.updateWeight')}</Text>
            <TextInput
              style={styles.weightModalInput}
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="numeric"
              placeholder={t('profile.weightInKg')}
              placeholderTextColor={Colors.textTertiary}
              autoFocus
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.weightModalSaveBtn}
              onPress={() => {
                const parsed = parseFloat(weightInput);
                if (!isNaN(parsed) && parsed > 0) {
                  updateProfile({ weightKg: parsed });
                  const today = new Date().toISOString().split('T')[0];
                  addHealthMarker({
                    id: Date.now().toString(),
                    date: today,
                    markerName: 'Weight',
                    value: parsed,
                    unit: 'kg',
                    source: 'manual',
                    points: 0,
                    timestamp: Date.now(),
                  });
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                setEditingWeight(false);
              }}
            >
              <Text style={styles.weightModalSaveBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  avatarTouchable: { position: 'relative', marginBottom: 12 },
  avatarImage: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.inputBg,
  },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.socialConnection,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLargeText: { fontSize: 28, fontWeight: '700' as const, color: Colors.white },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: -2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.physicalActivity,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  profileName: { fontSize: 24, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.5 },
  profileTeam: { fontSize: 14, fontWeight: '600' as const, color: Colors.socialConnection, marginTop: 4 },
  profileEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  heartAgeCard: {
    flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 16, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.cardBorder, alignItems: 'center',
  },
  heartAgeLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  heartAgeInfo: {},
  heartAgeLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' as const },
  heartAgeNum: { fontSize: 32, fontWeight: '800' as const },
  heartAgeDivider: { width: 1, height: 40, backgroundColor: Colors.divider, marginHorizontal: 16 },
  heartAgeRight: { alignItems: 'center' },
  heartAgeRightLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' as const },
  heartAgeRightNum: { fontSize: 24, fontWeight: '700' as const, color: Colors.text },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  statValue: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, marginTop: 6 },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  bmiCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 20,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.cardBorder,
  },
  bmiLabel: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary, marginRight: 12 },
  bmiValue: { fontSize: 24, fontWeight: '800' as const, color: Colors.text, marginRight: 10 },
  bmiCategory: { fontSize: 13, color: Colors.textSecondary },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginBottom: 12, marginTop: 8 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  summaryItem: {
    width: '47%' as any, backgroundColor: Colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  summaryValue: { fontSize: 28, fontWeight: '800' as const },
  summaryLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  badgeSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, marginTop: 8,
  },
  badgeSectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: 8,
  },
  viewAllText: { fontSize: 14, fontWeight: '600' as const, color: Colors.physicalActivity },
  recentBadgeRow: {
    flexDirection: 'row', gap: 10, marginBottom: 20,
  },
  recentBadgeCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.cardBorder,
  },
  recentBadgeIcon: { fontSize: 32, marginBottom: 8 },
  recentBadgeName: { fontSize: 12, fontWeight: '600' as const, color: Colors.text, textAlign: 'center' },
  noBadgesCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 20, marginBottom: 20,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.cardBorder, borderStyle: 'dashed',
  },
  noBadgesText: { fontSize: 13, color: Colors.textTertiary, fontWeight: '500' as const },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.riskySubstancesLight, borderRadius: 14, padding: 16,
    marginTop: 24, gap: 8, borderWidth: 1, borderColor: Colors.riskySubstances + '30',
  },
  resetBtnText: { fontSize: 15, fontWeight: '600' as const, color: Colors.riskySubstances },
  adminBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: Colors.socialConnectionLight, borderRadius: 14, padding: 16,
    marginTop: 24, gap: 8, borderWidth: 1, borderColor: Colors.socialConnection + '30',
  },
  adminBtnText: { fontSize: 15, fontWeight: '600' as const, color: Colors.socialConnection },
  languageCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  languageLabel: {
    fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary,
    marginBottom: 10, textTransform: 'uppercase' as const, letterSpacing: 0.5,
  },
  languageRow: { flexDirection: 'row', gap: 8 },
  langOption: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder,
  },
  langOptionActive: {
    backgroundColor: Colors.socialConnectionLight,
    borderColor: Colors.socialConnection,
  },
  langOptionText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  langOptionTextActive: { color: Colors.socialConnection },
  logoutBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: Colors.physicalActivityLight, borderRadius: 14, padding: 16,
    marginTop: 12, gap: 8, borderWidth: 1, borderColor: Colors.physicalActivity + '30',
  },
  logoutBtnText: { fontSize: 15, fontWeight: '600' as const, color: Colors.physicalActivity },
  reportBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: '#FFF8E1', borderRadius: 14, padding: 16,
    marginTop: 24, gap: 8, borderWidth: 1, borderColor: '#FFE082',
  },
  reportBtnText: { fontSize: 15, fontWeight: '600' as const, color: '#E65100' },
  healthMarkersBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: '#E0F2F1', borderRadius: 14, padding: 16,
    marginTop: 12, gap: 8, borderWidth: 1, borderColor: '#B2DFDB',
  },
  healthMarkersBtnText: { fontSize: 15, fontWeight: '600' as const, color: '#00897B', flex: 1 },

  waterCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  waterRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  waterIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#E1F5FE',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  waterInfo: { flex: 1 },
  waterTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  waterSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  waterToggle: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.inputBg,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  waterToggleOn: { backgroundColor: '#0288D1' },
  waterIntervals: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6,
    marginTop: 14, flexWrap: 'wrap' as const,
  },
  waterIntLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' as const, marginRight: 4 },
  waterIntChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder,
  },
  waterIntChipActive: { backgroundColor: '#0288D1', borderColor: '#0288D1' },
  waterIntText: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary },
  waterIntTextActive: { color: Colors.white },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12, maxHeight: '70%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.divider,
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20, fontWeight: '700' as const, color: Colors.text, textAlign: 'center', marginBottom: 20,
  },
  photoOptions: {
    flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 24,
  },
  photoOptionBtn: { alignItems: 'center', gap: 8 },
  photoOptionIcon: {
    width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  photoOptionText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
  avatarSectionLabel: {
    fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 14,
  },
  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center',
  },
  avatarOption: {
    width: 64, height: 64, borderRadius: 32, overflow: 'hidden',
    borderWidth: 2, borderColor: Colors.cardBorder,
  },
  avatarOptionSelected: {
    borderColor: Colors.physicalActivity, borderWidth: 3,
  },
  avatarOptionImage: { width: '100%', height: '100%' },

  goalsCard: {
    backgroundColor: Colors.card, borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.cardBorder, overflow: 'hidden' as const,
  },
  goalsRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  goalsRowInfo: { flex: 1 },
  goalsRowLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' as const },
  goalsRowValue: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, marginTop: 2 },
  goalsRowDivider: { height: 1, backgroundColor: Colors.divider, marginHorizontal: 16 },

  targetsCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  targetsTitle: {
    fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 14,
  },
  targetsGrid: {
    flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 10,
  },
  targetItem: {
    width: '30%' as any, backgroundColor: Colors.inputBg, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' as const,
  },
  targetItemValue: {
    fontSize: 16, fontWeight: '800' as const, color: Colors.text,
  },
  targetItemLabel: {
    fontSize: 11, color: Colors.textSecondary, fontWeight: '500' as const, marginTop: 2,
  },
  targetsNote: {
    fontSize: 11, color: Colors.textTertiary, lineHeight: 16, marginTop: 12,
  },

  pickerOption: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12,
    backgroundColor: Colors.inputBg, marginBottom: 8,
  },
  pickerOptionActive: {
    backgroundColor: Colors.socialConnectionLight, borderWidth: 1.5,
    borderColor: Colors.socialConnection,
  },
  pickerOptionEmoji: { fontSize: 22 },
  pickerOptionText: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  pickerOptionTextActive: { color: Colors.socialConnection },
  pickerOptionSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },

  weightModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' as const,
    alignItems: 'center' as const, padding: 24,
  },
  weightModalContent: {
    backgroundColor: Colors.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340,
  },
  weightModalTitle: {
    fontSize: 18, fontWeight: '700' as const, color: Colors.text, textAlign: 'center' as const,
    marginBottom: 20,
  },
  weightModalInput: {
    backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 20, fontWeight: '700' as const, color: Colors.text,
    textAlign: 'center' as const, borderWidth: 1, borderColor: Colors.inputBorder,
    marginBottom: 16,
  },
  weightModalSaveBtn: {
    backgroundColor: Colors.socialConnection, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center' as const,
  },
  weightModalSaveBtnText: {
    fontSize: 16, fontWeight: '700' as const, color: Colors.white,
  },
});
