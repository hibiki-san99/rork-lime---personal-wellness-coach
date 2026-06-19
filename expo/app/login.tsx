import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert, Image,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Leaf, Mail, Lock, ArrowRight, KeyRound, Fingerprint } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

import * as LocalAuthentication from 'expo-local-authentication';

type ScreenMode = 'login' | 'forgot' | 'reset';

const OLIVE_DARK = '#4A7A1E';

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
    <LinearGradient
      colors={['#C5E87A', '#8DC63F', '#4A8A10']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Logo + App Name */}
            <View style={styles.logoSection}>
              <Image
                source={require('@/assets/images/lime-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.appName}>Lime</Text>
            </View>

            {mode === 'login' && (
              <View style={styles.form}>
                <Text style={styles.formTitle}>Welcome back!</Text>

                <View style={styles.inputGroup}>
                  <View style={styles.inputIcon}>
                    <Mail size={18} color="#FFFFFF" />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email address"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    testID="login-email"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.inputIcon}>
                    <Lock size={18} color="#FFFFFF" />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor="rgba(255,255,255,0.6)"
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
                      <Text style={styles.loginBtnText}>Sign in</Text>
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
                    <Fingerprint size={20} color={Colors.white} />
                    <Text style={styles.biometricBtnText}>Sign in with {biometricType}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {mode === 'forgot' && (
              <View style={styles.form}>
                <Text style={styles.formTitle}>Reset Password</Text>
                <Text style={styles.formSub}>Enter your email and we'll send you a reset code</Text>

                <View style={styles.inputGroup}>
                  <View style={styles.inputIcon}>
                    <Mail size={18} color="#FFFFFF" />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email address"
                    placeholderTextColor="rgba(255,255,255,0.6)"
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
                  style={styles.backLink}
                  onPress={() => { setError(null); setSuccessMsg(null); setMode('login'); }}
                >
                  <Text style={styles.backLinkText}>Back to Sign In</Text>
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
                    <KeyRound size={18} color="#FFFFFF" />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={resetCode}
                    onChangeText={setResetCode}
                    placeholder="Reset code"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    autoCapitalize="characters"
                    testID="reset-code"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.inputIcon}>
                    <Lock size={18} color="#FFFFFF" />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="New password (min 6 chars)"
                    placeholderTextColor="rgba(255,255,255,0.6)"
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
                  style={styles.backLink}
                  onPress={() => { setError(null); setSuccessMsg(null); setMode('login'); }}
                >
                  <Text style={styles.backLinkText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom tagline */}
            <Text style={styles.bottomTagline}>Small steps, bigger health</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 36,
    marginTop: 20,
  },
  logoImage: {
    width: 110,
    height: 110,
    marginBottom: 4,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 20,
  },
  form: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  formSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 14,
    overflow: 'hidden',
  },
  inputIcon: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 16,
    paddingRight: 18,
  },
  errorBanner: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  successText: {
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OLIVE_DARK,
    paddingVertical: 16,
    borderRadius: 100,
    gap: 10,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  loginBtnDisabled: { opacity: 0.55 },
  loginBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  backLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  backLinkText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600' as const,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  biometricBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  bottomTagline: {
    fontSize: 15,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 16,
  },
});
