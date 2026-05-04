import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resilientFetch } from '@/utils/resilientFetch';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

interface LoginParams {
  email: string;
  password: string;
  name?: string;
}

interface RegisterParams {
  email: string;
  password: string;
  name: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'lime_auth_token';
const USER_KEY = 'lime_auth_user';
const NAME_KEY = 'lime_auth_name';
const EMAIL_KEY = 'lime_auth_email';
const PWD_KEY = 'lime_auth_pwd';

const getBaseUrl = () => process.env.EXPO_PUBLIC_RORK_API_BASE_URL || '';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUser = await SecureStore.getItemAsync(USER_KEY);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          console.log('[Auth] Session restored');
        }
      } catch (err) {
        console.log('[Auth] Load error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    void loadAuth();
  }, []);

  const saveAuth = useCallback(async (data: AuthResponse, email?: string, password?: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
    if (data.user.name) {
      await SecureStore.setItemAsync(NAME_KEY, data.user.name);
    }
    if (email) {
      await SecureStore.setItemAsync(EMAIL_KEY, email);
    }
    if (password) {
      await SecureStore.setItemAsync(PWD_KEY, password);
    }
    setToken(data.token);
    setUser(data.user);
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (params: LoginParams): Promise<AuthResponse> => {
      let nameForRecovery = params.name;
      if (!nameForRecovery) {
        try {
          nameForRecovery = await SecureStore.getItemAsync(NAME_KEY) ?? undefined;
        } catch { /* ignore */ }
      }
      const res = await resilientFetch(`${getBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, name: nameForRecovery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      console.log('[Auth] Login success, recovered:', !!(data as any).recovered);
      return data as AuthResponse;
    },
    onSuccess: (data, variables) => { void saveAuth(data, variables.email, variables.password); },
  });

  const registerMutation = useMutation({
    mutationFn: async (params: RegisterParams): Promise<AuthResponse> => {
      const res = await resilientFetch(`${getBaseUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      return data as AuthResponse;
    },
    onSuccess: (data, variables) => { void saveAuth(data, variables.email, variables.password); },
  });

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const storedEmail = await SecureStore.getItemAsync(EMAIL_KEY);
      const storedPwd = await SecureStore.getItemAsync(PWD_KEY);
      const storedName = await SecureStore.getItemAsync(NAME_KEY);

      if (storedEmail && storedPwd) {
        console.log('[Auth] Refreshing token via re-login...');
        const res = await resilientFetch(`${getBaseUrl()}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: storedEmail, password: storedPwd, name: storedName }),
        });
        const data = await res.json();
        if (res.ok) {
          const authData = data as AuthResponse;
          await SecureStore.setItemAsync(TOKEN_KEY, authData.token);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(authData.user));
          setToken(authData.token);
          setUser(authData.user);
          console.log('[Auth] Token refreshed via re-login');
          return authData.token;
        }
        console.log('[Auth] Re-login refresh failed:', data.error);
      } else {
        console.log('[Auth] No stored credentials, trying renew fallback...');
      }

      const storedUser = await SecureStore.getItemAsync(USER_KEY);
      const parsedUser = storedUser ? JSON.parse(storedUser) as AuthUser : null;
      const userId = parsedUser?.id;
      if (!userId) {
        console.log('[Auth] Cannot refresh token — no user ID available');
        return null;
      }

      console.log('[Auth] Attempting token renew with userId...');
      const renewRes = await resilientFetch(`${getBaseUrl()}/api/auth/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const renewData = await renewRes.json();
      if (!renewRes.ok) {
        console.log('[Auth] Token renew failed:', renewData.error);
        return null;
      }
      const renewAuth = renewData as AuthResponse;
      await SecureStore.setItemAsync(TOKEN_KEY, renewAuth.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(renewAuth.user));
      setToken(renewAuth.token);
      setUser(renewAuth.user);
      console.log('[Auth] Token renewed successfully via userId');
      return renewAuth.token;
    } catch (err) {
      console.log('[Auth] Token refresh error:', err);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    await SecureStore.deleteItemAsync(EMAIL_KEY);
    await SecureStore.deleteItemAsync(PWD_KEY);
    await SecureStore.deleteItemAsync(NAME_KEY);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const preserve = new Set<string>(['lime_app_language']);
      const toRemove = keys.filter(k => !preserve.has(k));
      if (toRemove.length > 0) {
        await AsyncStorage.multiRemove(toRemove);
        console.log('[Auth] Cleared', toRemove.length, 'AsyncStorage keys on logout');
      }
    } catch (err) {
      console.log('[Auth] AsyncStorage clear error:', err);
    }
    setToken(null);
    setUser(null);
    console.log('[Auth] Logged out');
  }, []);

  return useMemo(() => ({
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    loginError: loginMutation.error?.message ?? null,
    registerError: registerMutation.error?.message ?? null,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    refreshToken,
    logout,
  }), [user, token, isLoading, loginMutation, registerMutation, refreshToken, logout]);
});
