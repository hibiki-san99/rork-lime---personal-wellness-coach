import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Trophy, Lightbulb, User } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useLanguage } from '@/context/LanguageContext';

export default function TabLayout() {
  const { t } = useLanguage();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.socialConnection,
        tabBarInactiveTintColor: Colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopColor: Colors.tabBarBorder,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: t('tabs.team'),
          tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tips"
        options={{
          title: t('tabs.tips'),
          tabBarIcon: ({ color, size }) => <Lightbulb size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
