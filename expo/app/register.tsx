import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Leaf, Mail, Lock, User, ArrowRight, ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import Colors from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isRegistering } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRegister = useCallback(async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError(null);
    try {
      await register({ name: name.trim(), email: email.trim().toLowerCase(), password });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (Platform.OS !== 'web') {
        try {
          await SecureStore.setItemAsync('lime_biometric_email', email.trim().toLowerCase());
          await SecureStore.setItemAsync('lime_biometric_pwd', password);
          await SecureStore.setItemAsync('lime_auth_name', name.trim());
          console.log('[Auth] Biometric credentials stored after registration');
        } catch (storeErr) {
          console.log('[Auth] Failed to store biometric credentials:', storeErr);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [name, email, password, confirmPassword, register]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <ChevronLeft size={22} color={Colors.text} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.logoSection}>
              <View style={styles.logoCircle}>
                <Leaf size={30} color={Colors.white} fill={Colors.white} />
              </View>
              <Text style={styles.formTitle}>Create Account</Text>
              <Text style={styles.formSubtitle}>Join the Lime wellness programme</Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <User size={18} color={Colors.textTertiary} />
              </View>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="words"
                autoComplete="name"
                testID="register-name"
              />
            </View>

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
                testID="register-email"
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
                placeholder="Password (min 6 characters)"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry
                testID="register-password"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Lock size={18} color={Colors.textTertiary} />
              </View>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry
                testID="register-confirm"
              />
            </View>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.registerBtn, isRegistering && styles.registerBtnDisabled]}
              onPress={handleRegister}
              disabled={isRegistering}
              testID="register-submit"
            >
              {isRegistering ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.registerBtnText}>Create Account</Text>
                  <ArrowRight size={18} color={Colors.white} />
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.note}>
              The first account registered becomes the admin and can view all participant data.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: 28, paddingTop: 8 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 15, color: Colors.text, fontWeight: '500' as const },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32, shadowRadius: 16, elevation: 6,
  },
  formTitle: {
    fontSize: 24, fontWeight: '800' as const, color: Colors.text,
    letterSpacing: -0.3,
  },
  formSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.cardBorder,
    marginBottom: 14, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  inputIcon: {
    width: 48, alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1, fontSize: 15, color: Colors.text, paddingVertical: 16,
    paddingRight: 16,
  },
  errorBanner: {
    backgroundColor: '#FDECEA', borderRadius: 12, padding: 12, marginBottom: 14,
  },
  errorText: { fontSize: 13, color: Colors.error, textAlign: 'center' },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, paddingVertical: 17, borderRadius: 100,
    gap: 8, marginTop: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
  },
  registerBtnDisabled: { opacity: 0.6 },
  registerBtnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
  note: {
    fontSize: 12, color: Colors.textTertiary, textAlign: 'center',
    marginTop: 20, lineHeight: 18,
  },
});
