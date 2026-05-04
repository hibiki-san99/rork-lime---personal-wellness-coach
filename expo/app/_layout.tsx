import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { UserProvider } from "@/context/UserContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import "@/constants/i18n";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const hasInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    if (authLoading) return;

    const currentRoute = segments[0];
    const inLogin = currentRoute === 'login';
    const inOnboarding = currentRoute === 'onboarding';

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      if (isAuthenticated) {
        console.log('[Nav] Launch: authenticated -> /(tabs)/(home)');
        router.replace('/(tabs)/(home)');
      } else {
        console.log('[Nav] Launch: unauthenticated -> /login (was on:', currentRoute, ')');
        router.replace('/login');
      }
      return;
    }

    if (!isAuthenticated) {
      if (!inLogin && !inOnboarding) {
        console.log('[Nav] Unauthenticated on', currentRoute, '-> /login');
        router.replace('/login');
      }
      return;
    }

    if (isAuthenticated && inLogin) {
      console.log('[Nav] Authenticated on /login -> /(tabs)/(home)');
      router.replace('/(tabs)/(home)');
    }
  }, [isAuthenticated, authLoading, segments, router]);

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="meal-logger" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="journal-logger" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="activity-logger" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="sleep-logger" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="missions" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="weekly-report" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="health-markers" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="marker-detail" options={{ headerShown: false }} />
      <Stack.Screen name="achievements" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="steps-history" options={{ headerShown: false }} />
      <Stack.Screen name="activity-history" options={{ headerShown: false }} />
      <Stack.Screen name="sleep-history" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView>
        <AuthProvider>
          <LanguageProvider>
            <UserProvider>
              <RootLayoutNav />
            </UserProvider>
          </LanguageProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
