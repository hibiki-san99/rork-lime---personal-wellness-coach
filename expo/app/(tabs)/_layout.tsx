import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import {
  Home, Trophy, Lightbulb, User, Plus,
  Camera, BookOpen, Dumbbell, Moon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useLanguage } from '@/context/LanguageContext';

interface ShortcutItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  color: string;
  route: string;
}

export default function TabLayout() {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(false);
  const scale = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const animateOpen = useCallback((next: boolean) => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: next ? 1 : 0,
        duration: 260,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: next ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: next ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, fade, rotate]);

  const handleToggle = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = !open;
    if (next) {
      setOpen(true);
      requestAnimationFrame(() => animateOpen(true));
    } else {
      animateOpen(false);
      setTimeout(() => setOpen(false), 220);
    }
  }, [open, animateOpen]);

  const handleSelect = useCallback((route: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateOpen(false);
    setTimeout(() => {
      setOpen(false);
      router.push(route as never);
    }, 180);
  }, [animateOpen, router]);

  const shortcuts: ShortcutItem[] = [
    { id: 'meal', label: t('dashboard.logMeal'), icon: Camera, color: Colors.nutrition, route: '/meal-logger' },
    { id: 'activity', label: t('dashboard.logActivity'), icon: Dumbbell, color: Colors.physicalActivity, route: '/activity-logger' },
    { id: 'sleep', label: t('dashboard.logSleep'), icon: Moon, color: Colors.sleep, route: '/sleep-logger' },
    { id: 'journal', label: t('dashboard.logJournal'), icon: BookOpen, color: Colors.stressManagement, route: '/journal-logger' },
  ];

  const rotation = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.tabBarInactive,
          tabBarStyle: {
            backgroundColor: Colors.tabBar,
            borderTopColor: Colors.tabBarBorder,
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 84 : 64,
            paddingTop: 6,
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

      {/* Floating Plus FAB */}
      <View pointerEvents="box-none" style={styles.fabWrap}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleToggle}
          style={styles.fab}
          testID="shortcut-fab"
          accessibilityLabel="Open shortcuts"
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Plus size={28} color={Colors.white} strokeWidth={2.8} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Shortcut Pop-up */}
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={handleToggle}
      >
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleToggle} />
          <View style={styles.shortcutStack} pointerEvents="box-none">
            {shortcuts.map((s, i) => {
              const Icon = s.icon;
              const offset = (shortcuts.length - i) * 14;
              return (
                <Animated.View
                  key={s.id}
                  style={{
                    opacity: fade,
                    transform: [
                      { translateY: scale.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={styles.pill}
                    activeOpacity={0.85}
                    onPress={() => handleSelect(s.route)}
                    testID={`shortcut-${s.id}`}
                  >
                    <Text style={styles.pillLabel}>{s.label}</Text>
                    <View style={[styles.pillIcon, { backgroundColor: s.color }]}>
                      <Icon size={20} color={Colors.white} strokeWidth={2.4} />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const FAB_SIZE = 60;

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 50 : 36,
    alignItems: 'center',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 4,
    borderColor: Colors.white,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  shortcutStack: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 130 : 116,
    alignItems: 'flex-end',
    gap: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 999,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  pillLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  pillIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
