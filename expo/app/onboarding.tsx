import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, ChevronLeft, Heart, Check, Mail, Lock, User, Leaf } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { TEAM_NAMES } from '@/constants/data';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { UserProfile, MedicalHistory, ClinicalMeasurements, ActivityLevel, HealthGoal } from '@/types';
import { calculateNutrientTargets } from '@/utils/nutrientTargets';
import { calculateHeartAge } from '@/utils/heartAge';

const TOTAL_STEPS = 7;

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useUser();
  const { register, isRegistering, login, isLoggingIn } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: '', email: '', dob: '', sex: 'male', smokingStatus: 'never',
    heightCm: 170, weightKg: 70, teamName: TEAM_NAMES[0], avatarUrl: '',
    activityLevel: 'sedentary',
    healthGoal: undefined,
  });
  const [medical, setMedical] = useState<MedicalHistory>({
    diabetes: false, rheumatoidArthritis: false, ckd: false,
    atrialFibrillation: false, familyHistoryCVD: false,
    onBloodPressureMeds: false, onCholesterolMeds: false,
  });
  const [clinical, setClinical] = useState<ClinicalMeasurements>({
    fastingGlucose: '', systolicBP: '', diastolicBP: '',
    totalCholesterol: '', ldl: '', hdl: '', triglycerides: '',
  });
  const [heartResult, setHeartResult] = useState<{ heartAge: number; chronologicalAge: number; riskScore: number } | null>(null);

  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const animateProgress = useCallback((toStep: number) => {
    Animated.spring(progressAnim, {
      toValue: toStep / (TOTAL_STEPS - 1),
      useNativeDriver: false,
      tension: 50,
      friction: 10,
    }).start();
  }, [progressAnim]);

  const nextStep = useCallback(() => {
    if (step === 0) {
      if (!profile.name || !profile.email || !profile.dob) {
        Alert.alert(t('common.required'), t('onboarding.requiredNameEmailDob'));
        return;
      }
    }
    if (step === 2) {
      if (!profile.healthGoal) {
        Alert.alert(t('common.required'), t('onboarding.requiredHealthGoal'));
        return;
      }
    }
    if (step === 4) {
      const fullProfile: UserProfile = {
        name: profile.name || '',
        email: profile.email || '',
        dob: profile.dob || '1985-01-01',
        sex: profile.sex || 'male',
        smokingStatus: profile.smokingStatus || 'never',
        heightCm: profile.heightCm || 170,
        weightKg: profile.weightKg || 70,
        teamName: profile.teamName || TEAM_NAMES[0],
        avatarUrl: '',
        activityLevel: profile.activityLevel || 'sedentary',
        healthGoal: profile.healthGoal,
      };
      const result = calculateHeartAge(fullProfile, medical, clinical);
      setHeartResult(result);
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = Math.min(step + 1, TOTAL_STEPS - 1);
    setStep(next);
    animateProgress(next);
  }, [step, profile, medical, clinical, animateProgress, t]);

  const prevStep = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prev = Math.max(step - 1, 0);
    setStep(prev);
    animateProgress(prev);
  }, [step, animateProgress]);

  const handleCreateAccount = useCallback(async () => {
    if (!profile.email?.trim()) {
      setAccountError(t('onboarding.emailRequired'));
      return;
    }
    if (!accountPassword || accountPassword.length < 6) {
      setAccountError(t('onboarding.passwordMin'));
      return;
    }
    if (accountPassword !== accountConfirmPassword) {
      setAccountError(t('onboarding.passwordsDoNotMatch'));
      return;
    }
    setAccountError(null);
    try {
      await register({
        name: profile.name?.trim() || 'User',
        email: profile.email.trim().toLowerCase(),
        password: accountPassword,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const fullProfile: UserProfile = {
        name: profile.name || '',
        email: profile.email || '',
        dob: profile.dob || '1985-01-01',
        sex: profile.sex || 'male',
        smokingStatus: profile.smokingStatus || 'never',
        heightCm: profile.heightCm || 170,
        weightKg: profile.weightKg || 70,
        teamName: profile.teamName || TEAM_NAMES[0],
        avatarUrl: '',
        activityLevel: profile.activityLevel || 'sedentary',
        healthGoal: profile.healthGoal,
      };
      const result = heartResult || calculateHeartAge(fullProfile, medical, clinical);
      const targets = calculateNutrientTargets(fullProfile, medical);
      completeOnboarding(fullProfile, medical, clinical, result, targets);
      router.replace('/(tabs)/(home)');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('onboarding.registrationFailed');
      setAccountError(message);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [profile, accountPassword, accountConfirmPassword, register, heartResult, medical, clinical, completeOnboarding, router, t]);

  const handleLogin = useCallback(async () => {
    if (!loginEmail.trim() || !loginPassword) {
      setAccountError(t('onboarding.enterEmailPassword'));
      return;
    }
    setAccountError(null);
    try {
      await login({ email: loginEmail.trim().toLowerCase(), password: loginPassword });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('onboarding.loginFailed');
      setAccountError(message);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [loginEmail, loginPassword, login, t]);

  const updateProfile = useCallback((key: string, value: string | number) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleMedical = useCallback((key: keyof MedicalHistory) => {
    void Haptics.selectionAsync();
    setMedical(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const updateClinical = useCallback((key: keyof ClinicalMeasurements, value: string) => {
    setClinical(prev => ({ ...prev, [key]: value }));
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const renderDemographics = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t('onboarding.aboutYou')}</Text>
      <Text style={styles.stepSubtitle}>{t('onboarding.basicInfo')}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('onboarding.fullName')}</Text>
        <TextInput
          style={styles.input}
          value={profile.name}
          onChangeText={(v) => updateProfile('name', v)}
          placeholder={t('onboarding.enterName')}
          placeholderTextColor={Colors.textTertiary}
          testID="input-name"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('onboarding.email')}</Text>
        <TextInput
          style={styles.input}
          value={profile.email}
          onChangeText={(v) => updateProfile('email', v)}
          placeholder={t('onboarding.emailPlaceholder')}
          placeholderTextColor={Colors.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          testID="input-email"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('onboarding.dateOfBirth')}</Text>
        <TextInput
          style={styles.input}
          value={profile.dob}
          onChangeText={(v) => updateProfile('dob', v)}
          placeholder="1985-06-15"
          placeholderTextColor={Colors.textTertiary}
          testID="input-dob"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('onboarding.sex')}</Text>
        <View style={styles.segmentRow}>
          {(['male', 'female'] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.segment, profile.sex === s && styles.segmentActive]}
              onPress={() => { updateProfile('sex', s); void Haptics.selectionAsync(); }}
            >
              <Text style={[styles.segmentText, profile.sex === s && styles.segmentTextActive]}>
                {s === 'male' ? t('onboarding.male') : t('onboarding.female')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('onboarding.smokingStatus')}</Text>
        <View style={styles.segmentRow}>
          {(['never', 'former', 'current'] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.segment, profile.smokingStatus === s && { ...styles.segmentActive, backgroundColor: s === 'current' ? Colors.riskySubstances : Colors.socialConnection }]}
              onPress={() => { updateProfile('smokingStatus', s); void Haptics.selectionAsync(); }}
            >
              <Text style={[styles.segmentText, profile.smokingStatus === s && styles.segmentTextActive]}>
                {t(`onboarding.${s}` as const)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>{t('onboarding.heightCm')}</Text>
          <TextInput
            style={styles.input}
            value={String(profile.heightCm || '')}
            onChangeText={(v) => updateProfile('heightCm', parseInt(v) || 0)}
            keyboardType="numeric"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>{t('onboarding.weightKg')}</Text>
          <TextInput
            style={styles.input}
            value={String(profile.weightKg || '')}
            onChangeText={(v) => updateProfile('weightKg', parseInt(v) || 0)}
            keyboardType="numeric"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('onboarding.teamName')}</Text>
        <View style={styles.teamGrid}>
          {TEAM_NAMES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.teamChip, profile.teamName === t && styles.teamChipActive]}
              onPress={() => { updateProfile('teamName', t); void Haptics.selectionAsync(); }}
            >
              <Text style={[styles.teamChipText, profile.teamName === t && styles.teamChipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderMedicalHistory = () => {
    const conditions: { key: keyof MedicalHistory; label: string }[] = [
      { key: 'diabetes', label: t('onboarding.diabetes') },
      { key: 'rheumatoidArthritis', label: t('onboarding.rheumatoidArthritis') },
      { key: 'ckd', label: t('onboarding.ckd') },
      { key: 'atrialFibrillation', label: t('onboarding.atrialFibrillation') },
      { key: 'familyHistoryCVD', label: t('onboarding.familyHistoryCVD') },
      { key: 'onBloodPressureMeds', label: t('onboarding.onBpMeds') },
      { key: 'onCholesterolMeds', label: t('onboarding.onCholesterolMeds') },
    ];

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{t('onboarding.medicalHistory')}</Text>
        <Text style={styles.stepSubtitle}>{t('onboarding.medicalHistorySub')}</Text>
        {conditions.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.conditionRow, medical[key] && styles.conditionRowActive]}
            onPress={() => toggleMedical(key)}
            testID={`condition-${key}`}
          >
            <Text style={[styles.conditionLabel, medical[key] && styles.conditionLabelActive]}>{label}</Text>
            <View style={[styles.checkbox, medical[key] && styles.checkboxActive]}>
              {medical[key] && <Check size={14} color={Colors.white} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderClinical = () => {
    const fields: { key: keyof ClinicalMeasurements; label: string; unit: string }[] = [
      { key: 'fastingGlucose', label: t('onboarding.fastingGlucose'), unit: 'mg/dL' },
      { key: 'systolicBP', label: t('onboarding.systolicBP'), unit: 'mmHg' },
      { key: 'diastolicBP', label: t('onboarding.diastolicBP'), unit: 'mmHg' },
      { key: 'totalCholesterol', label: t('onboarding.totalCholesterol'), unit: 'mg/dL' },
      { key: 'ldl', label: t('onboarding.ldl'), unit: 'mg/dL' },
      { key: 'hdl', label: t('onboarding.hdl'), unit: 'mg/dL' },
      { key: 'triglycerides', label: t('onboarding.triglycerides'), unit: 'mg/dL' },
    ];

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{t('onboarding.clinicalMeasurements')}</Text>
        <Text style={styles.stepSubtitle}>{t('onboarding.clinicalSub')}</Text>
        {fields.map(({ key, label, unit }) => (
          <View key={key} style={styles.clinicalRow}>
            <View style={styles.clinicalLabel}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.unitText}>{unit}</Text>
            </View>
            <TextInput
              style={styles.clinicalInput}
              value={clinical[key]}
              onChangeText={(v) => updateClinical(key, v)}
              keyboardType="numeric"
              placeholder="—"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
        ))}
      </View>
    );
  };

  const renderHeartAge = () => {
    const result = heartResult;
    if (!result) return null;

    const diff = result.heartAge - result.chronologicalAge;
    const isGood = diff <= 0;

    return (
      <View style={styles.stepContent}>
        <View style={styles.heartAgeContainer}>
          <View style={[styles.heartCircle, { backgroundColor: isGood ? Colors.nutrition : Colors.riskySubstances }]}>
            <Heart size={32} color={Colors.white} />
            <Text style={styles.heartAgeNumber}>{result.heartAge}</Text>
            <Text style={styles.heartAgeLabel}>{t('profile.heartAge')}</Text>
          </View>

          <Text style={styles.heartAgeTitle}>{t('onboarding.yourHeartAge')}</Text>
          <Text style={styles.heartAgeSub}>
            {t('onboarding.chronologicalAgeMsg', { actual: result.chronologicalAge })}
            <Text style={{ fontWeight: '700' as const, color: isGood ? Colors.nutrition : Colors.riskySubstances }}>
              {result.heartAge}
            </Text>.
          </Text>

          {diff > 0 && (
            <View style={styles.heartAgeMessage}>
              <Text style={styles.heartAgeMessageText}>
                {t('onboarding.heartAgingFaster', { diff })}
              </Text>
            </View>
          )}
          {diff <= 0 && (
            <View style={[styles.heartAgeMessage, { backgroundColor: Colors.nutritionLight }]}>
              <Text style={[styles.heartAgeMessageText, { color: Colors.nutrition }]}>
                {t('onboarding.greatNewsHeart')}
              </Text>
            </View>
          )}

          <View style={styles.pillarPreview}>
            <Text style={styles.pillarPreviewTitle}>{t('onboarding.sixPillarsJourney')}</Text>
            {[
              { name: t('onboarding.pillarNutrition'), color: Colors.nutrition, emoji: '🥗' },
              { name: t('onboarding.pillarActivity'), color: Colors.physicalActivity, emoji: '🏃' },
              { name: t('onboarding.pillarSleep'), color: Colors.sleep, emoji: '😴' },
              { name: t('onboarding.pillarStress'), color: Colors.stressManagement, emoji: '🧘' },
              { name: t('onboarding.pillarSocial'), color: Colors.socialConnection, emoji: '🤝' },
              { name: t('onboarding.pillarAvoid'), color: Colors.riskySubstances, emoji: '🚫' },
            ].map(p => (
              <View key={p.name} style={styles.pillarRow}>
                <View style={[styles.pillarDot, { backgroundColor: p.color }]} />
                <Text style={styles.pillarName}>{p.emoji} {p.name}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderAccountCreation = () => (
    <View style={styles.stepContent}>
      <View style={styles.accountHeader}>
        <View style={styles.accountLogoCircle}>
          <Leaf size={30} color={Colors.white} fill={Colors.white} />
        </View>
        <Text style={styles.stepTitle}>
          {isLoginMode ? t('onboarding.welcomeBack') : t('onboarding.createAccount')}
        </Text>
        <Text style={styles.stepSubtitle}>
          {isLoginMode ? t('onboarding.welcomeBackSub') : t('onboarding.createAccountSub')}
        </Text>
      </View>

      {isLoginMode ? (
        <>
          <View style={styles.authInputGroup}>
            <View style={styles.authInputIcon}>
              <Mail size={18} color={Colors.textTertiary} />
            </View>
            <TextInput
              style={styles.authInput}
              value={loginEmail}
              onChangeText={setLoginEmail}
              placeholder={t('onboarding.emailAddress')}
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>
          <View style={styles.authInputGroup}>
            <View style={styles.authInputIcon}>
              <Lock size={18} color={Colors.textTertiary} />
            </View>
            <TextInput
              style={styles.authInput}
              value={loginPassword}
              onChangeText={setLoginPassword}
              placeholder={t('onboarding.password')}
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
              autoComplete="password"
            />
          </View>
        </>
      ) : (
        <>
          <View style={styles.authInputGroup}>
            <View style={styles.authInputIcon}>
              <User size={18} color={Colors.textTertiary} />
            </View>
            <TextInput
              style={styles.authInput}
              value={profile.name}
              editable={false}
              placeholder={t('onboarding.fullName')}
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
          <View style={styles.authInputGroup}>
            <View style={styles.authInputIcon}>
              <Mail size={18} color={Colors.textTertiary} />
            </View>
            <TextInput
              style={styles.authInput}
              value={profile.email}
              editable={false}
              placeholder={t('onboarding.emailAddress')}
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
          <View style={styles.authInputGroup}>
            <View style={styles.authInputIcon}>
              <Lock size={18} color={Colors.textTertiary} />
            </View>
            <TextInput
              style={styles.authInput}
              value={accountPassword}
              onChangeText={setAccountPassword}
              placeholder={t('onboarding.passwordMinChars')}
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
            />
          </View>
          <View style={styles.authInputGroup}>
            <View style={styles.authInputIcon}>
              <Lock size={18} color={Colors.textTertiary} />
            </View>
            <TextInput
              style={styles.authInput}
              value={accountConfirmPassword}
              onChangeText={setAccountConfirmPassword}
              placeholder={t('onboarding.confirmPassword')}
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
            />
          </View>
        </>
      )}

      {accountError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{accountError}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.accountBtn, (isRegistering || isLoggingIn) && styles.accountBtnDisabled]}
        onPress={isLoginMode ? handleLogin : handleCreateAccount}
        disabled={isRegistering || isLoggingIn}
        testID="account-submit"
      >
        {(isRegistering || isLoggingIn) ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.accountBtnText}>
            {isLoginMode ? t('onboarding.signIn') : t('onboarding.createAccountBtn')}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.switchAuthMode}
        onPress={() => { setIsLoginMode(!isLoginMode); setAccountError(null); }}
      >
        <Text style={styles.switchAuthText}>
          {isLoginMode ? t('onboarding.dontHaveAccount') : t('onboarding.haveAccount')}
        </Text>
      </TouchableOpacity>

      {!isLoginMode && (
        <Text style={styles.adminNote}>
          {t('onboarding.adminNote')}
        </Text>
      )}
    </View>
  );

  const renderActivityLevel = () => {
    const levels: { value: ActivityLevel; emoji: string; title: string; description: string }[] = [
      { value: 'sedentary', emoji: '🪑', title: t('onboarding.mostlySitting'), description: t('onboarding.mostlySittingDesc') },
      { value: 'moderate', emoji: '🚶', title: t('onboarding.mixSittingMoving'), description: t('onboarding.mixSittingMovingDesc') },
      { value: 'active', emoji: '🏃', title: t('onboarding.mostlyOnFeet'), description: t('onboarding.mostlyOnFeetDesc') },
    ];

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{t('onboarding.activityLevel')}</Text>
        <Text style={styles.stepSubtitle}>
          {t('onboarding.howDescribeActivity')}
        </Text>
        {levels.map(level => (
          <TouchableOpacity
            key={level.value}
            style={[
              styles.activityLevelCard,
              profile.activityLevel === level.value && styles.activityLevelCardActive,
            ]}
            onPress={() => {
              updateProfile('activityLevel', level.value);
              void Haptics.selectionAsync();
            }}
            testID={`activity-level-${level.value}`}
          >
            <Text style={styles.activityLevelEmoji}>{level.emoji}</Text>
            <View style={styles.activityLevelInfo}>
              <Text style={[
                styles.activityLevelTitle,
                profile.activityLevel === level.value && styles.activityLevelTitleActive,
              ]}>{level.title}</Text>
              <Text style={styles.activityLevelDesc}>{level.description}</Text>
            </View>
            <View style={[
              styles.checkbox,
              profile.activityLevel === level.value && styles.activityCheckboxActive,
            ]}>
              {profile.activityLevel === level.value && <Check size={14} color={Colors.white} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderHealthGoal = () => {
    const goals: { value: HealthGoal; emoji: string; title: string }[] = [
      { value: 'lose_weight', emoji: '\u2696\uFE0F', title: t('onboarding.loseWeight') },
      { value: 'lower_cholesterol', emoji: '\uD83D\uDCC9', title: t('onboarding.lowerCholesterol') },
      { value: 'manage_diabetes', emoji: '\uD83E\uDE78', title: t('onboarding.manageDiabetes') },
      { value: 'heart_health', emoji: '\u2764\uFE0F', title: t('onboarding.improveHeartHealth') },
      { value: 'sleep_better', emoji: '\uD83D\uDE34', title: t('onboarding.sleepBetter') },
      { value: 'energy_focus', emoji: '\uD83E\uDDE0', title: t('onboarding.boostEnergy') },
    ];

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{t('onboarding.healthGoal')}</Text>
        <Text style={styles.stepSubtitle}>{t('onboarding.whatMainGoal')}</Text>
        {goals.map(g => (
          <TouchableOpacity
            key={g.value}
            style={[
              styles.activityLevelCard,
              profile.healthGoal === g.value && styles.activityLevelCardActive,
            ]}
            onPress={() => {
              updateProfile('healthGoal', g.value);
              void Haptics.selectionAsync();
            }}
            testID={`health-goal-${g.value}`}
          >
            <Text style={styles.activityLevelEmoji}>{g.emoji}</Text>
            <View style={styles.activityLevelInfo}>
              <Text style={[
                styles.activityLevelTitle,
                profile.healthGoal === g.value && styles.activityLevelTitleActive,
              ]}>{g.title}</Text>
            </View>
            <View style={[
              styles.checkbox,
              profile.healthGoal === g.value && styles.activityCheckboxActive,
            ]}>
              {profile.healthGoal === g.value && <Check size={14} color={Colors.white} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const steps = [renderDemographics, renderActivityLevel, renderHealthGoal, renderMedicalHistory, renderClinical, renderHeartAge, renderAccountCreation];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <View style={styles.headerLogoRow}>
                <View style={styles.headerLogoCircle}>
                  <Leaf size={18} color={Colors.white} fill={Colors.white} />
                </View>
                <Text style={styles.logo}>Lime</Text>
              </View>
              <TouchableOpacity
                style={styles.signInLink}
                onPress={() => {
                  console.log('[Onboarding] Sign in link tapped, navigating to /login');
                  void Haptics.selectionAsync();
                  router.replace('/login');
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                testID="onboarding-signin-link"
              >
                <Text style={styles.signInLinkText}>{t('onboarding.haveAccount')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.progressBarBg}>
              <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
            </View>
            <Text style={styles.stepIndicator}>{t('onboarding.stepOf', { step: step + 1, total: TOTAL_STEPS })}</Text>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {steps[step]()}
          </ScrollView>

          {step < TOTAL_STEPS - 1 && (
            <View style={styles.footer}>
              {step > 0 && (
                <TouchableOpacity style={styles.backButton} onPress={prevStep}>
                  <ChevronLeft size={20} color={Colors.text} />
                  <Text style={styles.backButtonText}>{t('common.back')}</Text>
                </TouchableOpacity>
              )}
              <View style={styles.footerSpacer} />
              <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
                <Text style={styles.nextButtonText}>{t('common.continue')}</Text>
                <ChevronRight size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {step === TOTAL_STEPS - 1 && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.backButton} onPress={prevStep}>
                <ChevronLeft size={20} color={Colors.text} />
                <Text style={styles.backButtonText}>{t('common.back')}</Text>
              </TouchableOpacity>
              <View style={styles.footerSpacer} />
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  headerLogoRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  headerLogoCircle: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  logo: { fontSize: 22, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.5 },
  headerTopRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 20 },
  signInLink: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: Colors.primaryLight },
  signInLinkText: { fontSize: 13, fontWeight: '700' as const, color: Colors.primaryDark },
  progressBarBg: { height: 6, backgroundColor: Colors.inputBg, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  stepIndicator: { fontSize: 13, color: Colors.textSecondary, marginTop: 10 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 32 },
  stepContent: {},
  stepTitle: { fontSize: 28, fontWeight: '700' as const, color: Colors.text, marginBottom: 6, letterSpacing: -0.5 },
  stepSubtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 24, lineHeight: 21 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, marginBottom: 8 },
  input: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: '#E8ECF0',
    borderRadius: 18, paddingHorizontal: 18, paddingVertical: 18, fontSize: 16, color: Colors.text,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  segmentRow: { flexDirection: 'row', gap: 10 },
  segment: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.card, alignItems: 'center',
    borderWidth: 1, borderColor: '#E8ECF0',
  },
  segmentActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  segmentTextActive: { color: Colors.white },
  rowInputs: { flexDirection: 'row' },
  teamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  teamChip: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: '#E8ECF0',
  },
  teamChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  teamChipText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
  teamChipTextActive: { color: Colors.white },
  conditionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 18,
    marginBottom: 10, borderWidth: 1, borderColor: '#E8ECF0',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  conditionRowActive: { borderColor: Colors.riskySubstances, backgroundColor: Colors.riskySubstancesLight },
  conditionLabel: { fontSize: 15, color: Colors.text, flex: 1 },
  conditionLabelActive: { fontWeight: '600' as const, color: Colors.riskySubstances },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    borderColor: Colors.inputBorder, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.riskySubstances, borderColor: Colors.riskySubstances },
  clinicalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.card, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#E8ECF0',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  clinicalLabel: { flex: 1 },
  unitText: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  clinicalInput: {
    width: 80, textAlign: 'right' as const, fontSize: 18, fontWeight: '600' as const,
    color: Colors.text, paddingVertical: 4,
  },
  heartAgeContainer: { alignItems: 'center', paddingTop: 20 },
  heartCircle: {
    width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  heartAgeNumber: { fontSize: 48, fontWeight: '800' as const, color: Colors.white, marginTop: 4 },
  heartAgeLabel: { fontSize: 14, fontWeight: '600' as const, color: 'rgba(255,255,255,0.85)' },
  heartAgeTitle: { fontSize: 24, fontWeight: '700' as const, color: Colors.text, marginBottom: 8 },
  heartAgeSub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
  heartAgeMessage: {
    backgroundColor: Colors.riskySubstancesLight, borderRadius: 12,
    padding: 16, marginTop: 20, marginHorizontal: 16,
  },
  heartAgeMessageText: { fontSize: 14, color: Colors.riskySubstances, lineHeight: 20, textAlign: 'center' },
  pillarPreview: { marginTop: 28, width: '100%', paddingHorizontal: 16 },
  pillarPreviewTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.text, marginBottom: 14 },
  pillarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pillarDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  pillarName: { fontSize: 15, color: Colors.text },
  footer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24,
    paddingVertical: 16, borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  footerSpacer: { flex: 1 },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8 },
  backButtonText: { fontSize: 16, color: Colors.text, marginLeft: 4 },
  nextButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    paddingHorizontal: 28, paddingVertical: 18, borderRadius: 100, gap: 10,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32, shadowRadius: 16, elevation: 6,
  },
  nextButtonText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
  accountHeader: { alignItems: 'center', marginBottom: 8 },
  accountLogoCircle: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.30, shadowRadius: 20, elevation: 8,
  },
  authInputGroup: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 18, borderWidth: 1, borderColor: '#E8ECF0',
    marginBottom: 14, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  authInputIcon: {
    width: 52, alignItems: 'center', justifyContent: 'center',
  },
  authInput: {
    flex: 1, fontSize: 16, color: Colors.text, paddingVertical: 18,
    paddingRight: 18,
  },
  errorBanner: {
    backgroundColor: '#FDECEA', borderRadius: 12, padding: 12, marginBottom: 14,
  },
  errorText: { fontSize: 13, color: Colors.error, textAlign: 'center' },
  accountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 100,
    gap: 8, marginTop: 10,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32, shadowRadius: 16, elevation: 6,
  },
  accountBtnDisabled: { opacity: 0.6 },
  accountBtnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
  switchAuthMode: { alignItems: 'center', marginTop: 20 },
  switchAuthText: { fontSize: 14, color: Colors.primaryDark, fontWeight: '700' as const },
  adminNote: {
    fontSize: 12, color: Colors.textTertiary, textAlign: 'center',
    marginTop: 16, lineHeight: 18,
  },
  activityLevelCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E8ECF0',
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  activityLevelCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  activityLevelEmoji: {
    fontSize: 28,
  },
  activityLevelInfo: {
    flex: 1,
  },
  activityLevelTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  activityLevelTitleActive: {
    color: Colors.primaryDark,
  },
  activityLevelDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  activityCheckboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});
