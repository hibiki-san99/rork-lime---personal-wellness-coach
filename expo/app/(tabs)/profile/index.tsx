import React, { useMemo, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Heart, Award, Flame, LogOut, Shield, BarChart3, Camera as CameraIcon, ImageIcon,
  User, Beaker, ChevronRight, Target, Activity, Scale, TrendingUp, Bell, BellOff,
  Settings as SettingsIcon, Droplets, RotateCcw, Languages,
} from 'lucide-react-native';
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

type MenuRow = {
  id: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  badge?: string | number;
  onPress: () => void;
};

export default function ProfileScreen() {
  const router = useRouter();
  const {
    profile, heartAgeResult, totalPoints, badges, weeklyStreak, resetUser, updateProfile,
    waterReminder, updateWaterReminder, addHealthMarker,
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

  const [showAvatarModal, setShowAvatarModal] = useState<boolean>(false);
  const [showGoalPicker, setShowGoalPicker] = useState<boolean>(false);
  const [showActivityPicker, setShowActivityPicker] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showPersonalInfo, setShowPersonalInfo] = useState<boolean>(false);
  const [editingWeight, setEditingWeight] = useState<boolean>(false);
  const [weightInput, setWeightInput] = useState<string>('');

  useWaterReminder(waterReminder);

  const earnedBadges = useMemo(() => badges.filter(b => b.earned), [badges]);

  const bmi = useMemo(() => {
    if (!profile) return 0;
    return getBMI(profile.heightCm, profile.weightKg);
  }, [profile]);

  const bmiCategory = useMemo(() => {
    if (bmi <= 0) return '—';
    if (bmi < 18.5) return t('profile.underweight');
    if (bmi < 25) return t('profile.normalBmi');
    if (bmi < 30) return t('profile.overweight');
    return t('profile.obese');
  }, [bmi, t]);

  const initials = useMemo(() => {
    if (!profile?.name) return '?';
    return profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }, [profile?.name]);

  const handlePickPhoto = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [1, 1],
      });
      if (!result.canceled && result.assets[0]) {
        updateProfile({ avatarUrl: result.assets[0].uri });
        setShowAvatarModal(false);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) { console.log('Photo picker error:', error); }
  }, [updateProfile]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('profile.permissionNeeded'), t('profile.cameraAccessRequired'));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [1, 1],
      });
      if (!result.canceled && result.assets[0]) {
        updateProfile({ avatarUrl: result.assets[0].uri });
        setShowAvatarModal(false);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) { console.log('Camera error:', error); }
  }, [updateProfile, t]);

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

  const handleLogout = useCallback(() => {
    Alert.alert(t('common.signOut'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.signOut'),
        onPress: () => {
          void logout();
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }, [logout, t]);

  const handleReset = useCallback(() => {
    Alert.alert(t('profile.resetData'), t('profile.resetConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.reset'), style: 'destructive',
        onPress: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          void resetUser();
          router.replace('/onboarding');
        },
      },
    ]);
  }, [resetUser, router, t]);

  const openModal = useCallback((setter: (v: boolean) => void) => {
    void Haptics.selectionAsync();
    setter(true);
  }, []);

  const menuRows: MenuRow[] = useMemo(() => {
    const rows: MenuRow[] = [
      { id: 'personal', icon: User, label: t('profile.personalInformation'), onPress: () => openModal(setShowPersonalInfo) },
      {
        id: 'notifications', icon: Bell, label: t('profile.notifications'),
        badge: waterReminder.enabled ? '\u2713' : undefined,
        onPress: () => openModal(setShowNotifications),
      },
      { id: 'settings', icon: SettingsIcon, label: t('profile.appSettings'), onPress: () => openModal(setShowSettings) },
      { id: 'goals', icon: Heart, label: t('profile.healthGoals'), onPress: () => openModal(setShowGoalPicker) },
      {
        id: 'achievements', icon: Award, label: t('profile.achievements'),
        badge: earnedBadges.length > 0 ? earnedBadges.length : undefined,
        onPress: () => { void Haptics.selectionAsync(); router.push('/achievements' as any); },
      },
      {
        id: 'markers', icon: Beaker, label: t('profile.healthMarkersBtn'),
        onPress: () => { void Haptics.selectionAsync(); router.push('/health-markers' as any); },
      },
      {
        id: 'report', icon: BarChart3, label: t('profile.weeklyReport'),
        onPress: () => { void Haptics.selectionAsync(); router.push('/weekly-report' as any); },
      },
    ];
    if (authUser?.isAdmin) {
      rows.push({
        id: 'admin', icon: Shield, label: t('profile.researchDashboard'),
        onPress: () => { void Haptics.selectionAsync(); router.push('/admin' as any); },
      });
    }
    return rows;
  }, [t, waterReminder.enabled, earnedBadges.length, authUser?.isAdmin, router, openModal]);

  const hasAvatar = !!profile?.avatarUrl;
  const weightDelta: number | null = null;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.pageTitle}>{t('profile.title')}</Text>
          <Text style={styles.pageSubtitle}>{t('profile.manageAccount')}</Text>

          {/* Hero green card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <TouchableOpacity
                onPress={() => { setShowAvatarModal(true); void Haptics.selectionAsync(); }}
                activeOpacity={0.8}
                style={styles.heroAvatarTouchable}
              >
                {hasAvatar ? (
                  <Image source={{ uri: profile.avatarUrl }} style={styles.heroAvatarImage} contentFit="cover" />
                ) : (
                  <View style={styles.heroAvatarFallback}>
                    <Text style={styles.heroAvatarInitials}>{initials}</Text>
                  </View>
                )}
                <View style={styles.heroAvatarEdit}>
                  <CameraIcon size={11} color={Colors.primary} />
                </View>
              </TouchableOpacity>
              <View style={styles.heroNameWrap}>
                <Text style={styles.heroName} numberOfLines={1}>{profile?.name ?? t('common.user')}</Text>
                <Text style={styles.heroEmail} numberOfLines={1}>{profile?.email ?? ''}</Text>
                {!!profile?.teamName && (
                  <Text style={styles.heroTeam} numberOfLines={1}>{profile.teamName}</Text>
                )}
              </View>
            </View>

            <View style={styles.heroStats}>
              <TouchableOpacity
                style={styles.heroStat}
                activeOpacity={0.85}
                onPress={() => {
                  setWeightInput(String(profile?.weightKg ?? ''));
                  setEditingWeight(true);
                  void Haptics.selectionAsync();
                }}
              >
                <TrendingUp size={18} color={Colors.white} />
                <Text style={styles.heroStatValue}>
                  {profile?.weightKg ?? '—'}<Text style={styles.heroStatUnit}> kg</Text>
                </Text>
                <Text style={styles.heroStatLabel}>{t('onboarding.weight')}</Text>
                {weightDelta !== null && (
                  <Text style={styles.heroStatSub}>
                    {weightDelta > 0 ? '+' : ''}{weightDelta} kg
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.heroStat}>
                <Heart size={18} color={Colors.white} />
                <Text style={styles.heroStatValue}>{bmi > 0 ? bmi : '—'}</Text>
                <Text style={styles.heroStatLabel}>BMI</Text>
                <Text style={styles.heroStatSub} numberOfLines={1}>{bmiCategory}</Text>
              </View>

              <View style={styles.heroStat}>
                <Award size={18} color={Colors.white} />
                <Text style={styles.heroStatValue}>
                  {weeklyStreak}<Text style={styles.heroStatUnit}> d</Text>
                </Text>
                <Text style={styles.heroStatLabel}>{t('profile.streak')}</Text>
                <Text style={styles.heroStatSub}>
                  {heartAgeResult ? `${t('profile.heartAge')} ${heartAgeResult.heartAge}` : `${totalPoints} pts`}
                </Text>
              </View>
            </View>
          </View>

          {/* Menu list */}
          <View style={styles.menuCard}>
            {menuRows.map((row, idx) => {
              const Icon = row.icon;
              return (
                <React.Fragment key={row.id}>
                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={row.onPress}
                    activeOpacity={0.6}
                    testID={`menu-${row.id}`}
                  >
                    <View style={styles.menuIconWrap}>
                      <Icon size={20} color={Colors.white} />
                    </View>
                    <Text style={styles.menuLabel}>{row.label}</Text>
                    {row.badge !== undefined && (
                      <View style={styles.menuBadge}>
                        <Text style={styles.menuBadgeText}>{row.badge}</Text>
                      </View>
                    )}
                    <ChevronRight size={20} color={Colors.textTertiary} />
                  </TouchableOpacity>
                  {idx < menuRows.length - 1 && <View style={styles.menuDivider} />}
                </React.Fragment>
              );
            })}
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} testID="logout-btn" activeOpacity={0.85}>
            <View style={styles.logoutIconWrap}>
              <LogOut size={18} color={Colors.white} />
            </View>
            <Text style={styles.logoutBtnText}>{t('profile.logout')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetBtn} onPress={handleReset} testID="reset-btn">
            <RotateCcw size={16} color={Colors.textTertiary} />
            <Text style={styles.resetBtnText}>{t('profile.resetData')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* Avatar modal */}
      <Modal visible={showAvatarModal} animationType="slide" transparent onRequestClose={() => setShowAvatarModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAvatarModal(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('profile.changePicture')}</Text>
            <View style={styles.photoOptions}>
              <TouchableOpacity style={styles.photoOptionBtn} onPress={handleTakePhoto}>
                <View style={[styles.photoOptionIcon, { backgroundColor: Colors.primary }]}>
                  <CameraIcon size={22} color={Colors.white} />
                </View>
                <Text style={styles.photoOptionText}>{t('profile.camera')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoOptionBtn} onPress={handlePickPhoto}>
                <View style={[styles.photoOptionIcon, { backgroundColor: Colors.stressManagement }]}>
                  <ImageIcon size={22} color={Colors.white} />
                </View>
                <Text style={styles.photoOptionText}>{t('profile.gallery')}</Text>
              </TouchableOpacity>
              {hasAvatar && (
                <TouchableOpacity style={styles.photoOptionBtn} onPress={handleRemovePhoto}>
                  <View style={[styles.photoOptionIcon, { backgroundColor: Colors.riskySubstances }]}>
                    <User size={22} color={Colors.white} />
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
                  style={[styles.avatarOption, profile?.avatarUrl === url && styles.avatarOptionSelected]}
                  onPress={() => handleSelectAvatar(url)}
                >
                  <Image source={{ uri: url }} style={styles.avatarOptionImage} contentFit="cover" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Personal info modal */}
      <Modal visible={showPersonalInfo} animationType="slide" transparent onRequestClose={() => setShowPersonalInfo(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPersonalInfo(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('profile.personalInformation')}</Text>

            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => { setShowPersonalInfo(false); setShowAvatarModal(true); void Haptics.selectionAsync(); }}
            >
              <View style={[styles.infoIcon, { backgroundColor: Colors.primary }]}>
                <CameraIcon size={18} color={Colors.white} />
              </View>
              <View style={styles.infoRowInfo}>
                <Text style={styles.infoRowLabel}>{t('profile.changePicture')}</Text>
                <Text style={styles.infoRowValue} numberOfLines={1}>{profile?.name ?? '—'}</Text>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => {
                setWeightInput(String(profile?.weightKg ?? ''));
                setShowPersonalInfo(false);
                setEditingWeight(true);
                void Haptics.selectionAsync();
              }}
            >
              <View style={[styles.infoIcon, { backgroundColor: '#5C6BC0' }]}>
                <Scale size={18} color={Colors.white} />
              </View>
              <View style={styles.infoRowInfo}>
                <Text style={styles.infoRowLabel}>{t('profile.currentWeight')}</Text>
                <Text style={styles.infoRowValue}>{profile?.weightKg ?? '—'} kg</Text>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => { setShowPersonalInfo(false); setShowActivityPicker(true); void Haptics.selectionAsync(); }}
            >
              <View style={[styles.infoIcon, { backgroundColor: Colors.physicalActivity }]}>
                <Activity size={18} color={Colors.white} />
              </View>
              <View style={styles.infoRowInfo}>
                <Text style={styles.infoRowLabel}>{t('profile.activityLevel')}</Text>
                <Text style={styles.infoRowValue} numberOfLines={1}>
                  {profile?.activityLevel
                    ? ACTIVITY_LEVELS.find(a => a.value === profile.activityLevel)?.title
                    : t('common.notSet')}
                </Text>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => { setShowPersonalInfo(false); setShowGoalPicker(true); void Haptics.selectionAsync(); }}
            >
              <View style={[styles.infoIcon, { backgroundColor: Colors.socialConnection }]}>
                <Target size={18} color={Colors.white} />
              </View>
              <View style={styles.infoRowInfo}>
                <Text style={styles.infoRowLabel}>{t('profile.healthGoal')}</Text>
                <Text style={styles.infoRowValue} numberOfLines={1}>
                  {profile?.healthGoal
                    ? HEALTH_GOALS.find(g => g.value === profile.healthGoal)?.title
                    : t('common.notSet')}
                </Text>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notifications modal */}
      <Modal visible={showNotifications} animationType="slide" transparent onRequestClose={() => setShowNotifications(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowNotifications(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('profile.notifications')}</Text>

            <View style={styles.waterRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#0288D1' }]}>
                <Droplets size={18} color={Colors.white} />
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
                    style={[styles.waterIntChip, waterReminder.intervalMinutes === min && styles.waterIntChipActive]}
                    onPress={() => handleWaterInterval(min)}
                  >
                    <Text style={[styles.waterIntText, waterReminder.intervalMinutes === min && styles.waterIntTextActive]}>
                      {min < 60 ? `${min}m` : `${min / 60}h`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Settings modal */}
      <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSettings(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('profile.appSettings')}</Text>

            <View style={styles.settingsBlock}>
              <View style={styles.settingsBlockHeader}>
                <Languages size={16} color={Colors.textSecondary} />
                <Text style={styles.settingsBlockLabel}>{t('profile.language')}</Text>
              </View>
              <View style={styles.languageRow}>
                <TouchableOpacity
                  style={[styles.langOption, language === 'en' && styles.langOptionActive]}
                  onPress={() => { void setLanguage('en'); void Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.langOptionText, language === 'en' && styles.langOptionTextActive]}>
                    {t('profile.english')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.langOption, language === 'id' && styles.langOptionActive]}
                  onPress={() => { void setLanguage('id'); void Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.langOptionText, language === 'id' && styles.langOptionTextActive]}>
                    {t('profile.indonesian')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Goal picker */}
      <Modal visible={showGoalPicker} animationType="slide" transparent onRequestClose={() => setShowGoalPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowGoalPicker(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('profile.selectHealthGoal')}</Text>
            {HEALTH_GOALS.map(g => (
              <TouchableOpacity
                key={g.value}
                style={[styles.pickerOption, profile?.healthGoal === g.value && styles.pickerOptionActive]}
                onPress={() => {
                  updateProfile({ healthGoal: g.value });
                  setShowGoalPicker(false);
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              >
                <Text style={styles.pickerOptionEmoji}>{g.emoji}</Text>
                <Text style={[styles.pickerOptionText, profile?.healthGoal === g.value && styles.pickerOptionTextActive]}>
                  {g.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Activity picker */}
      <Modal visible={showActivityPicker} animationType="slide" transparent onRequestClose={() => setShowActivityPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowActivityPicker(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('profile.selectActivityLevel')}</Text>
            {ACTIVITY_LEVELS.map(a => (
              <TouchableOpacity
                key={a.value}
                style={[styles.pickerOption, profile?.activityLevel === a.value && styles.pickerOptionActive]}
                onPress={() => {
                  updateProfile({ activityLevel: a.value });
                  setShowActivityPicker(false);
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              >
                <Text style={styles.pickerOptionEmoji}>{a.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerOptionText, profile?.activityLevel === a.value && styles.pickerOptionTextActive]}>
                    {a.title}
                  </Text>
                  <Text style={styles.pickerOptionSub}>{a.multiplier}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Weight editor */}
      <Modal visible={editingWeight} animationType="fade" transparent onRequestClose={() => setEditingWeight(false)}>
        <TouchableOpacity style={styles.weightModalOverlay} activeOpacity={1} onPress={() => setEditingWeight(false)}>
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
  scroll: { padding: 20, paddingBottom: 120 },

  pageTitle: { fontSize: 34, fontWeight: '800' as const, color: Colors.text, letterSpacing: -1 },
  pageSubtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, marginBottom: 20 },

  // Hero card
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 8,
  },
  heroTop: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14 },
  heroAvatarTouchable: { position: 'relative' as const },
  heroAvatarImage: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  heroAvatarFallback: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  heroAvatarInitials: { fontSize: 22, fontWeight: '800' as const, color: Colors.white },
  heroAvatarEdit: {
    position: 'absolute' as const, bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.white,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  heroNameWrap: { flex: 1 },
  heroName: { fontSize: 22, fontWeight: '800' as const, color: Colors.white, letterSpacing: -0.4 },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  heroTeam: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: '600' as const },

  heroStats: { flexDirection: 'row' as const, gap: 10, marginTop: 18 },
  heroStat: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center' as const,
  },
  heroStatValue: { fontSize: 20, fontWeight: '800' as const, color: Colors.white, marginTop: 8, letterSpacing: -0.5 },
  heroStatUnit: { fontSize: 13, fontWeight: '700' as const },
  heroStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2, fontWeight: '500' as const },
  heroStatSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 4, textAlign: 'center' as const, fontWeight: '600' as const },

  // Menu list
  menuCard: {
    backgroundColor: Colors.card, borderRadius: 20,
    paddingHorizontal: 4, paddingVertical: 4,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  menuRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingHorizontal: 14, paddingVertical: 14, gap: 14,
  },
  menuIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  menuBadge: {
    minWidth: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 8,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  menuBadgeText: { fontSize: 12, fontWeight: '800' as const, color: Colors.white },
  menuDivider: { height: 1, backgroundColor: Colors.divider, marginLeft: 68, marginRight: 14 },

  // Bottom buttons
  logoutBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: Colors.primary, borderRadius: 16, padding: 14,
    marginTop: 18, gap: 10,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28, shadowRadius: 14, elevation: 4,
  },
  logoutIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2, borderColor: Colors.white,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  logoutBtnText: { fontSize: 15, fontWeight: '800' as const, color: Colors.white, letterSpacing: -0.2 },
  resetBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    paddingVertical: 12, marginTop: 6, gap: 6,
  },
  resetBtnText: { fontSize: 13, fontWeight: '500' as const, color: Colors.textTertiary },

  // Modals shared
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' as const },
  modalContent: {
    backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12, maxHeight: '80%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.divider,
    alignSelf: 'center' as const, marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text, textAlign: 'center' as const, marginBottom: 20 },

  // Photo options
  photoOptions: { flexDirection: 'row' as const, justifyContent: 'center' as const, gap: 24, marginBottom: 24 },
  photoOptionBtn: { alignItems: 'center' as const, gap: 8 },
  photoOptionIcon: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  photoOptionText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
  avatarSectionLabel: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 14 },
  avatarGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12, justifyContent: 'center' as const },
  avatarOption: {
    width: 64, height: 64, borderRadius: 32, overflow: 'hidden' as const,
    borderWidth: 2, borderColor: Colors.cardBorder,
  },
  avatarOptionSelected: { borderColor: Colors.primary, borderWidth: 3 },
  avatarOptionImage: { width: '100%' as const, height: '100%' as const },

  // Personal info rows
  infoRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14,
    paddingVertical: 12,
  },
  infoIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  infoRowInfo: { flex: 1 },
  infoRowLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' as const },
  infoRowValue: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginTop: 2 },

  // Water
  waterRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  waterInfo: { flex: 1 },
  waterTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  waterSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  waterToggle: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.inputBg,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  waterToggleOn: { backgroundColor: '#0288D1' },
  waterIntervals: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginTop: 14, flexWrap: 'wrap' as const },
  waterIntLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' as const, marginRight: 4 },
  waterIntChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder,
  },
  waterIntChipActive: { backgroundColor: '#0288D1', borderColor: '#0288D1' },
  waterIntText: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary },
  waterIntTextActive: { color: Colors.white },

  // Settings
  settingsBlock: { marginBottom: 12 },
  settingsBlockHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 10 },
  settingsBlockLabel: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  languageRow: { flexDirection: 'row' as const, gap: 8 },
  langOption: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const,
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder,
  },
  langOptionActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  langOptionText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  langOptionTextActive: { color: Colors.primaryDark },

  // Picker
  pickerOption: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12,
    backgroundColor: Colors.inputBg, marginBottom: 8,
  },
  pickerOptionActive: { backgroundColor: Colors.primaryLight, borderWidth: 1.5, borderColor: Colors.primary },
  pickerOptionEmoji: { fontSize: 22 },
  pickerOptionText: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  pickerOptionTextActive: { color: Colors.primaryDark },
  pickerOptionSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },

  // Weight modal
  weightModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const, alignItems: 'center' as const, padding: 24,
  },
  weightModalContent: {
    backgroundColor: Colors.card, borderRadius: 20, padding: 24, width: '100%' as const, maxWidth: 340,
  },
  weightModalTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, textAlign: 'center' as const, marginBottom: 20 },
  weightModalInput: {
    backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 20, fontWeight: '700' as const, color: Colors.text, textAlign: 'center' as const,
    borderWidth: 1, borderColor: Colors.inputBorder, marginBottom: 16,
  },
  weightModalSaveBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center' as const,
  },
  weightModalSaveBtnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
});
