import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Mail, Lock, ArrowRight, KeyRound, Fingerprint } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

import * as LocalAuthentication from 'expo-local-authentication';

type ScreenMode = 'login' | 'forgot' | 'reset';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoggingIn } = useAuth();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  const [mode, setMode] = useState<ScreenMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || '';

  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    const checkBiometric = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (compatible && enrolled) {
          setBiometricAvailable(true);
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('Face ID');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('Fingerprint');
          }
          console.log('[Auth] Biometric available:', types);
        }
      } catch (err) {
        console.log('[Auth] Biometric check error:', err);
      }
    };
    void checkBiometric();
  }, []);

  const handleBiometricLogin = useCallback(async () => {
    if (Platform.OS === 'web') return;
    setError(null);
    try {
      const SecureStore = await import('expo-secure-store');
      const storedEmail = await SecureStore.getItemAsync('lime_biometric_email');
      const storedPwd = await SecureStore.getItemAsync('lime_biometric_pwd');
      const storedName = await SecureStore.getItemAsync('lime_auth_name');
      console.log('[Auth] Biometric credentials check - email:', !!storedEmail, 'pwd:', !!storedPwd);
      if (!storedEmail || !storedPwd) {
        Alert.alert('Setup Required', 'Please sign in with email and password first. Biometric login will be available for future sessions.');
        return;
      }
      console.log('[Auth] Starting biometric authentication...');
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Sign in with ${biometricType}`,
        cancelLabel: 'Cancel',
        disableDeviceFallback: true,
        fallbackLabel: 'Use Passcode',
      });
      console.log('[Auth] Biometric result:', JSON.stringify(result));
      if (result.success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
          await login({ email: storedEmail, password: storedPwd, name: storedName ?? undefined });
          console.log('[Auth] Biometric login success');
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Biometric login failed';
          setError(message);
          console.log('[Auth] Biometric login API failed:', message);
          if (message.includes('Invalid') || message.includes('password') || message.includes('not found')) {
            await SecureStore.deleteItemAsync('lime_biometric_email');
            await SecureStore.deleteItemAsync('lime_biometric_pwd');
            setError('Stored credentials are outdated. Please sign in with email and password to re-enable biometric login.');
          }
        }
      } else {
        console.log('[Auth] Biometric auth cancelled or failed:', result.error);
        if (result.error !== 'user_cancel' && result.error !== 'system_cancel') {
          setError('Biometric authentication was not successful. Please try again or use email/password.');
        }
      }
    } catch (err) {
      console.log('[Auth] Biometric error:', err);
      setError('Biometric authentication failed. Please try email/password.');
    }
  }, [biometricType, login]);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }
    setError(null);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (Platform.OS !== 'web') {
        try {
          const SecureStore = await import('expo-secure-store');
          await SecureStore.setItemAsync('lime_biometric_email', email.trim().toLowerCase());
          await SecureStore.setItemAsync('lime_biometric_pwd', password);
          console.log('[Auth] Biometric credentials stored after login');
        } catch (storeErr) {
          console.log('[Auth] Failed to store biometric credentials:', storeErr);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [email, password, login]);

  const handleForgotPassword = useCallback(async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json() as { message?: string; resetCode?: string; error?: string };
      if (data.resetCode) {
        setResetCode(data.resetCode);
        setMode('reset');
        setSuccessMsg(`Your reset code is: ${data.resetCode}\nEnter it below with your new password.`);
        Alert.alert('Reset Code', `Your password reset code is:\n\n${data.resetCode}\n\nThis code is valid for 30 minutes.`);
      } else {
        setError(data.message ?? 'If an account exists, reset instructions have been sent. If you don\'t see a code, the email may not be registered.');
      }
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, baseUrl]);

  const handleResetPassword = useCallback(async () => {
    if (!resetCode.trim() || !newPassword) {
      setError('Please enter the reset code and new password');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          resetCode: resetCode.trim(),
          newPassword,
        }),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Reset failed');
      } else {
        if (Platform.OS !== 'web') {
          try {
            const SecureStore = await import('expo-secure-store');
            await SecureStore.deleteItemAsync('lime_biometric_email');
            await SecureStore.deleteItemAsync('lime_biometric_pwd');
            console.log('[Auth] Cleared biometric credentials after password reset');
          } catch { /* ignore */ }
        }
        Alert.alert('Success', 'Your password has been reset. You can now sign in.', [
          { text: 'OK', onPress: () => { setMode('login'); setPassword(''); setResetCode(''); setNewPassword(''); setSuccessMsg(null); } },
        ]);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, resetCode, newPassword, baseUrl]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.logoSection}>
              <View style={styles.logoCircle}>
                <Heart size={36} color="#D84315" fill="#D84315" />
              </View>
              <Text style={styles.appName}>Lime</Text>
              <Text style={styles.tagline}>Small steps, bigger health</Text>
            </View>

            {mode === 'login' && (
              <View style={styles.form}>
                <Text style={styles.formTitle}>Welcome back</Text>

                <View style={styles.inputGroup}>
                  <View style={styles.inputIcon}>
                    <Mail size={18} color={Colors.textTertiary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email address"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    testID="login-email"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.inputIcon}>
                    <Lock size={18} color={Colors.textTertiary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry
                    autoComplete="password"
                    testID="login-password"
                  />
                </View>

                {error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.loginBtn, isLoggingIn && styles.loginBtnDisabled]}
                  onPress={handleLogin}
                  disabled={isLoggingIn}
                  testID="login-submit"
                >
                  {isLoggingIn ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <Text style={styles.loginBtnText}>Sign In</Text>
                      <ArrowRight size={18} color={Colors.white} />
                    </>
                  )}
                </TouchableOpacity>

                {biometricAvailable && Platform.OS !== 'web' && (
                  <TouchableOpacity
                    style={styles.biometricBtn}
                    onPress={() => void handleBiometricLogin()}
                    activeOpacity={0.7}
                    testID="biometric-login"
                  >
                    <Fingerprint size={20} color="#D84315" />
                    <Text style={styles.biometricBtnText}>Sign in with {biometricType}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={() => { setError(null); setSuccessMsg(null); setMode('forgot'); }}
                >
                  <Text style={styles.forgotLinkText}>Forgot password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.registerLink}
                  onPress={() => router.push('/onboarding')}
                >
                  <Text style={styles.registerLinkText}>
                    {"New user? "}
                    <Text style={styles.registerLinkBold}>Start health assessment</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'forgot' && (
              <View style={styles.form}>
                <Text style={styles.formTitle}>Reset Password</Text>
                <Text style={styles.formSub}>Enter your email and we'll send you a reset code</Text>

                <View style={styles.inputGroup}>
                  <View style={styles.inputIcon}>
                    <Mail size={18} color={Colors.textTertiary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email address"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    testID="forgot-email"
                  />
                </View>

                {error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                  onPress={handleForgotPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <Text style={styles.loginBtnText}>Send Reset Code</Text>
                      <KeyRound size={18} color={Colors.white} />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={() => { setError(null); setSuccessMsg(null); setMode('login'); }}
                >
                  <Text style={styles.forgotLinkText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'reset' && (
              <View style={styles.form}>
                <Text style={styles.formTitle}>Enter Reset Code</Text>
                {successMsg && (
                  <View style={styles.successBanner}>
                    <Text style={styles.successText}>{successMsg}</Text>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <View style={styles.inputIcon}>
                    <KeyRound size={18} color={Colors.textTertiary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={resetCode}
                    onChangeText={setResetCode}
                    placeholder="Reset code"
                    placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="characters"
                    testID="reset-code"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.inputIcon}>
                    <Lock size={18} color={Colors.textTertiary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="New password (min 6 chars)"
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry
                    testID="reset-new-password"
                  />
                </View>

                {error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <Text style={styles.loginBtnText}>Reset Password</Text>
                      <ArrowRight size={18} color={Colors.white} />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={() => { setError(null); setSuccessMsg(null); setMode('login'); }}
                >
                  <Text style={styles.forgotLinkText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: '#FBE9E7',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  appName: {
    fontSize: 28, fontWeight: '800' as const, color: Colors.text,
    letterSpacing: -0.5,
  },
  tagline: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  form: {},
  formTitle: {
    fontSize: 22, fontWeight: '700' as const, color: Colors.text,
    marginBottom: 8,
  },
  formSub: {
    fontSize: 14, color: Colors.textSecondary, marginBottom: 20, lineHeight: 20,
  },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.cardBorder,
    marginBottom: 14, overflow: 'hidden',
  },
  inputIcon: {
    width: 48, alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1, fontSize: 15, color: Colors.text, paddingVertical: 16,
    paddingRight: 16,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE', borderRadius: 10, padding: 12, marginBottom: 14,
  },
  errorText: { fontSize: 13, color: Colors.error, textAlign: 'center' },
  successBanner: {
    backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginBottom: 14,
  },
  successText: { fontSize: 13, color: Colors.nutrition, textAlign: 'center' },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#D84315', paddingVertical: 16, borderRadius: 14,
    gap: 8, marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
  forgotLink: { alignItems: 'center', marginTop: 16 },
  forgotLinkText: { fontSize: 14, color: '#D84315', fontWeight: '600' as const },
  registerLink: { alignItems: 'center', marginTop: 16 },
  registerLinkText: { fontSize: 14, color: Colors.textSecondary },
  registerLinkBold: { fontWeight: '700' as const, color: '#D84315' },
  biometricBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 16, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#FBE9E7', borderWidth: 1, borderColor: '#FFCCBC',
  },
  biometricBtnText: { fontSize: 15, fontWeight: '600' as const, color: '#D84315' },

});
