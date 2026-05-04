import React, { useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder, TouchableOpacity, Platform,
  LayoutAnimation,
} from 'react-native';
import { Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const DELETE_WIDTH = 84;
const SWIPE_THRESHOLD = 40;
const ACTIVATE_THRESHOLD = 10;

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: React.ReactNode;
  containerStyle?: object;
  deleteLabel?: string;
  testID?: string;
  disabled?: boolean;
}

export default function SwipeToDelete({
  onDelete,
  children,
  containerStyle,
  deleteLabel = 'Delete',
  testID,
  disabled,
}: SwipeToDeleteProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef<number>(0);
  const openRef = useRef<boolean>(false);

  useEffect(() => {
    const id = translateX.addListener(({ value }) => {
      offsetRef.current = value;
    });
    return () => translateX.removeListener(id);
  }, [translateX]);

  const close = useCallback(() => {
    openRef.current = false;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }, [translateX]);

  const open = useCallback(() => {
    openRef.current = true;
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    Animated.spring(translateX, {
      toValue: -DELETE_WIDTH,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gesture) => {
        if (disabled) return false;
        return Math.abs(gesture.dx) > ACTIVATE_THRESHOLD && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_evt, gesture) => {
        const base = openRef.current ? -DELETE_WIDTH : 0;
        let next = base + gesture.dx;
        if (next > 0) next = 0;
        if (next < -DELETE_WIDTH - 20) next = -DELETE_WIDTH - 20;
        translateX.setValue(next);
      },
      onPanResponderRelease: (_evt, gesture) => {
        const current = offsetRef.current;
        if (openRef.current) {
          if (gesture.dx > SWIPE_THRESHOLD || current > -DELETE_WIDTH / 2) {
            close();
          } else {
            open();
          }
        } else {
          if (gesture.dx < -SWIPE_THRESHOLD || current < -DELETE_WIDTH / 2) {
            open();
          } else {
            close();
          }
        }
      },
      onPanResponderTerminate: () => {
        if (openRef.current) open(); else close();
      },
    })
  ).current;

  const handleDeletePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    close();
    onDelete();
  }, [onDelete, close]);

  return (
    <View style={[styles.wrapper, containerStyle]} testID={testID}>
      <View style={styles.deleteBg} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDeletePress}
          activeOpacity={0.8}
          testID={testID ? `${testID}-delete` : undefined}
        >
          <Trash2 size={18} color="#FFFFFF" />
          <Text style={styles.deleteText}>{deleteLabel}</Text>
        </TouchableOpacity>
      </View>
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  deleteBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: DELETE_WIDTH,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#E53935',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginVertical: 0,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
});
