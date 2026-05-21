import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, Animated, Platform, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, X, Check, Sparkles, ChevronRight, Pencil, ChevronDown, ChevronUp, Plus, Trash2, Clock, Flame, Users, Search, UtensilsCrossed, Sun, Moon, Coffee, Cookie } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import Colors from '@/constants/colors';
import { calculateMealPoints } from '@/constants/data';
import { useUser } from '@/context/UserContext';
import { useLanguage } from '@/context/LanguageContext';
import { MealLog, MealType, NutritionProfile } from '@/types';
import { getMealCoachingNudge } from '@/utils/mealCoaching';
import SwipeToDelete from '@/components/SwipeToDelete';

type EntryMode = 'photo' | 'manual';
type Step = 'choose_mode' | 'photo' | 'analyzing' | 'manual_search' | 'manual_picking' | 'review_items' | 'confirm';
type AddedSugar = 'yes' | 'no' | 'not_sure';

interface NutrientRow {
  key: keyof NutritionProfile;
  label: string;
  unit: string;
  indent?: boolean;
}

interface DishSuggestion {
  name: string;
  description: string;
  calories: number;
  foodItems: { name: string; estimatedGrams: number }[];
  categories: string[];
  nutrition: NutritionProfile;
}

const MEAL_TYPE_CONFIG: { value: MealType; label: string; color: string }[] = [
  { value: 'breakfast', label: 'Breakfast', color: '#EF6C00' },
  { value: 'lunch', label: 'Lunch', color: '#43A047' },
  { value: 'dinner', label: 'Dinner', color: '#5C6BC0' },
  { value: 'snack', label: 'Snack', color: '#EC407A' },
];

function MealTypeIcon({ type, color }: { type: MealType; color: string }) {
  switch (type) {
    case 'breakfast': return <Coffee size={16} color={color} />;
    case 'lunch': return <Sun size={16} color={color} />;
    case 'dinner': return <Moon size={16} color={color} />;
    case 'snack': return <Cookie size={16} color={color} />;
  }
}

const ENERGY_ROWS: NutrientRow[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
];

const MACRO_ROWS: NutrientRow[] = [
  { key: 'totalFatG', label: 'Total Fat', unit: 'g' },
  { key: 'saturatedFatG', label: 'Saturated Fat', unit: 'g', indent: true },
  { key: 'transFatG', label: 'Trans Fat', unit: 'g', indent: true },
  { key: 'totalCarbsG', label: 'Total Carbohydrates', unit: 'g' },
  { key: 'dietaryFiberG', label: 'Dietary Fiber', unit: 'g', indent: true },
  { key: 'totalSugarsG', label: 'Total Sugars', unit: 'g', indent: true },
  { key: 'proteinG', label: 'Protein', unit: 'g' },
];

const MINERAL_ROWS: NutrientRow[] = [
  { key: 'sodiumMg', label: 'Sodium', unit: 'mg' },
  { key: 'calciumMg', label: 'Calcium', unit: 'mg' },
  { key: 'ironMg', label: 'Iron', unit: 'mg' },
  { key: 'potassiumMg', label: 'Potassium', unit: 'mg' },
];

const VITAMIN_ROWS: NutrientRow[] = [
  { key: 'vitaminDMcg', label: 'Vitamin D', unit: 'mcg' },
  { key: 'vitaminCMg', label: 'Vitamin C', unit: 'mg' },
];

const foodAnalysisSchema = z.object({
  foodName: z.string().describe('A concise name for the overall meal, e.g. "Grilled salmon with quinoa and roasted vegetables"'),
  foodItems: z.array(z.object({
    name: z.string().describe('Name of the food item'),
    estimatedGrams: z.number().describe('Estimated weight in grams using credit card as 8.56cm x 5.4cm reference'),
  })).describe('List of individual food items identified on the plate'),
  categories: z.array(z.string()).describe('Food categories present: whole_grains, legumes, leafy_greens, other_vegetables, fruits, nuts_seeds, processed_foods, animal_products'),
  nutrition: z.object({
    calories: z.number().describe('Total calories in kcal'),
    totalFatG: z.number().describe('Total fat in grams'),
    saturatedFatG: z.number().describe('Saturated fat in grams'),
    transFatG: z.number().describe('Trans fat in grams'),
    totalCarbsG: z.number().describe('Total carbohydrates in grams'),
    dietaryFiberG: z.number().describe('Dietary fiber in grams'),
    totalSugarsG: z.number().describe('Total sugars in grams including natural sugars from fruits, dairy, etc'),
    addedSugarG: z.number().describe('Only ADDED sugars in grams. Natural sugars from whole fruits, plain dairy, vegetables = 0 added sugar. Only count sugars from sweeteners, syrups, honey, processed foods, candy, soft drinks, desserts, etc.'),
    proteinG: z.number().describe('Protein in grams'),
    sodiumMg: z.number().describe('Sodium in milligrams'),
    calciumMg: z.number().describe('Calcium in milligrams'),
    ironMg: z.number().describe('Iron in milligrams'),
    potassiumMg: z.number().describe('Potassium in milligrams'),
    vitaminDMcg: z.number().describe('Vitamin D in micrograms'),
    vitaminCMg: z.number().describe('Vitamin C in milligrams'),
  }).describe('Complete nutrition profile for the entire meal'),
});

const dishSuggestionsSchema = z.object({
  suggestions: z.array(z.object({
    name: z.string().describe('Name of the dish variation'),
    description: z.string().describe('Short description of the dish, 10-15 words'),
    calories: z.number().describe('Estimated total calories'),
    foodItems: z.array(z.object({
      name: z.string().describe('Name of the food component'),
      estimatedGrams: z.number().describe('Estimated grams for a standard serving'),
    })).describe('Breakdown of food items in this dish'),
    categories: z.array(z.string()).describe('Food categories: whole_grains, legumes, leafy_greens, other_vegetables, fruits, nuts_seeds, processed_foods, animal_products'),
    nutrition: z.object({
      calories: z.number(),
      totalFatG: z.number(),
      saturatedFatG: z.number(),
      transFatG: z.number(),
      totalCarbsG: z.number(),
      dietaryFiberG: z.number(),
      totalSugarsG: z.number(),
      addedSugarG: z.number(),
      proteinG: z.number(),
      sodiumMg: z.number(),
      calciumMg: z.number(),
      ironMg: z.number(),
      potassiumMg: z.number(),
      vitaminDMcg: z.number(),
      vitaminCMg: z.number(),
    }).describe('Complete nutrition profile for a standard single serving'),
  })).min(3).max(5).describe('3-5 variations of the dish with different preparation styles or regional varieties'),
});

const defaultNutrition: NutritionProfile = {
  calories: 0, totalFatG: 0, saturatedFatG: 0, transFatG: 0,
  totalCarbsG: 0, dietaryFiberG: 0, totalSugarsG: 0, addedSugarG: 0, proteinG: 0,
  sodiumMg: 0, calciumMg: 0, ironMg: 0, potassiumMg: 0,
  vitaminDMcg: 0, vitaminCMg: 0,
};

function getDefaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'snack';
  return 'dinner';
}

export default function MealLoggerScreen() {
  const router = useRouter();
  const { addMealLog, deleteMealLog, mealLogs, profile, nutrientTargets } = useUser();
  const { t } = useLanguage();
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'today' | 'week' | 'all'>('today');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('choose_mode');
  const [entryMode, setEntryMode] = useState<EntryMode>('photo');
  const [foodItems, setFoodItems] = useState<{ name: string; estimatedGrams: number }[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [nutrition, setNutrition] = useState<NutritionProfile>(defaultNutrition);
  const [foodName, setFoodName] = useState<string>('');
  const [saltRating, setSaltRating] = useState<number>(0.3);
  const [addedSugar, setAddedSugar] = useState<AddedSugar>('not_sure');
  const [editingNutrient, setEditingNutrient] = useState<keyof NutritionProfile | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showFoodItems, setShowFoodItems] = useState<boolean>(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [isSharedDish, setIsSharedDish] = useState<boolean>(false);
  const [sharedCount, setSharedCount] = useState<string>('2');
  const [mealType, setMealType] = useState<MealType>(getDefaultMealType());

  const [manualQuery, setManualQuery] = useState<string>('');
  const [dishSuggestions, setDishSuggestions] = useState<DishSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('meal.permissionNeeded'), t('meal.cameraAccessRequired'));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        setAnalyzeError(null);
      }
    } catch (error) {
      console.log('Camera error:', error);
      Alert.alert(t('common.error'), t('meal.cameraError'));
    }
  }, [t]);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        setAnalyzeError(null);
      }
    } catch (error) {
      console.log('Gallery error:', error);
    }
  }, []);

  const analyzePhoto = useCallback(async () => {
    if (!photoUri) return;
    setStep('analyzing');
    setAnalyzeError(null);
    startPulse();

    try {
      let base64Image = '';
      if (Platform.OS === 'web') {
        const response = await fetch(photoUri);
        const blob = await response.blob();
        base64Image = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || result);
          };
          reader.readAsDataURL(blob);
        });
      } else {
        base64Image = await FileSystem.readAsStringAsync(photoUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      console.log('Sending image for AI analysis...');
      const result = await generateObject({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this meal photo. A credit card is included for portion size reference (standard credit card is 8.56cm x 5.4cm). Identify each food item, estimate grams using the credit card scale, and calculate a complete nutrition profile for the entire meal including: calories, total fat, saturated fat, trans fat, total carbohydrates, dietary fiber, total sugars, protein, sodium, calcium, iron, potassium, vitamin D, and vitamin C. Also classify which food categories are present from: whole_grains, legumes, leafy_greens, other_vegetables, fruits, nuts_seeds, processed_foods, animal_products. Provide a concise name for the overall meal.',
              },
              {
                type: 'image',
                image: `data:image/jpeg;base64,${base64Image}`,
              },
            ],
          },
        ],
        schema: foodAnalysisSchema,
      });

      console.log('AI analysis result:', JSON.stringify(result, null, 2));
      setFoodItems(result.foodItems);
      setCategories(result.categories);
      setNutrition(result.nutrition);
      setFoodName(result.foodName);
      setStep('review_items');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log('AI analysis error:', error);
      setAnalyzeError(t('meal.couldNotAnalyze'));
      setStep('photo');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [photoUri, startPulse, t]);

  const searchDishes = useCallback(async () => {
    const query = manualQuery.trim();
    if (!query) {
      Alert.alert(t('meal.enterDishName'), t('meal.pleaseTypeDish'));
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    console.log('Searching for dish suggestions:', query);

    try {
      const result = await generateObject({
        messages: [
          {
            role: 'user',
            content: `The user is logging a meal and typed: "${query}". Generate 3-5 dish variations that match this query. For each variation, provide a name, short description, estimated calories, breakdown of food items with grams for a standard single serving, food categories, and a complete nutrition profile. Include different preparation styles or regional varieties if applicable (e.g. "Nasi Goreng - Indonesian Fried Rice", "Chicken Fried Rice - Chinese Style"). Estimate for one standard adult serving.`,
          },
        ],
        schema: dishSuggestionsSchema,
      });

      console.log('Dish suggestions:', JSON.stringify(result, null, 2));
      setDishSuggestions(result.suggestions);
      setStep('manual_picking');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log('Dish search error:', error);
      setSearchError(t('meal.couldNotFindSuggestions'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSearching(false);
    }
  }, [manualQuery, t]);

  const selectDishSuggestion = useCallback((suggestion: DishSuggestion) => {
    setFoodName(suggestion.name);
    setFoodItems(suggestion.foodItems);
    setCategories(suggestion.categories);
    setNutrition(suggestion.nutrition);
    setStep('review_items');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleNutrientTap = useCallback((key: keyof NutritionProfile) => {
    void Haptics.selectionAsync();
    if (editingNutrient === key) {
      setEditingNutrient(null);
      return;
    }
    setEditingNutrient(key);
    setEditValue(String(nutrition[key]));
  }, [editingNutrient, nutrition]);

  const saveNutrientEdit = useCallback(() => {
    if (editingNutrient === null) return;
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed) && parsed >= 0) {
      setNutrition(prev => ({ ...prev, [editingNutrient]: Math.round(parsed * 10) / 10 }));
    }
    setEditingNutrient(null);
    void Haptics.selectionAsync();
  }, [editingNutrient, editValue]);

  const addFoodItem = useCallback(() => {
    setFoodItems(prev => [...prev, { name: 'New item', estimatedGrams: 100 }]);
    void Haptics.selectionAsync();
  }, []);

  const removeFoodItem = useCallback((index: number) => {
    setFoodItems(prev => prev.filter((_, i) => i !== index));
    void Haptics.selectionAsync();
  }, []);

  const updateFoodItemName = useCallback((index: number, name: string) => {
    setFoodItems(prev => prev.map((item, i) => i === index ? { ...item, name } : item));
  }, []);

  const updateFoodItemGrams = useCallback((index: number, text: string) => {
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed)) {
      setFoodItems(prev => prev.map((item, i) =>
        i === index ? { ...item, estimatedGrams: Math.max(0, parsed) } : item
      ));
    }
  }, []);

  const saveMeal = useCallback(() => {
    if (foodItems.length === 0) {
      Alert.alert(t('meal.noFoodItems'), t('meal.addFoodItemsFirst'));
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const divider = isSharedDish ? Math.max(1, parseInt(sharedCount, 10) || 1) : 1;

    const finalNutrition: NutritionProfile = divider > 1
      ? (Object.fromEntries(
          Object.entries(nutrition).map(([k, v]) => [k, Math.round((v / divider) * 10) / 10])
        ) as unknown as NutritionProfile)
      : nutrition;

    const adjustedNutrition: NutritionProfile = {
      ...finalNutrition,
      addedSugarG: addedSugar === 'no'
        ? 0
        : addedSugar === 'yes'
          ? (finalNutrition.addedSugarG ?? finalNutrition.totalSugarsG ?? 0)
          : Math.round((finalNutrition.addedSugarG ?? finalNutrition.totalSugarsG ?? 0) * 0.5 * 10) / 10,
    };

    const log: MealLog = {
      id: Date.now().toString(),
      date: today,
      photoUri: photoUri ?? undefined,
      categories,
      foodItems: foodItems.map(fi => ({
        name: fi.name,
        estimatedGrams: divider > 1 ? Math.round(fi.estimatedGrams / divider) : fi.estimatedGrams,
      })),
      nutrition: adjustedNutrition,
      foodName: foodName ? (divider > 1 ? `${foodName} (shared ÷${divider})` : foodName) : undefined,
      saltRating,
      addedSugar,
      mealType,
      entryMethod: entryMode,
      points: 0,
      timestamp: Date.now(),
    };
    const points = addMealLog(log);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const coaching = getMealCoachingNudge(
      profile?.healthGoal,
      adjustedNutrition,
      categories,
      new Date().getHours(),
      [foodName ?? '', ...foodItems.map(fi => fi.name)].filter(Boolean)
    );

    const mealCalories = Math.round(adjustedNutrition.calories ?? 0);
    const dailyGoal = nutrientTargets?.calories ?? 0;
    const percentOfGoal = dailyGoal > 0 ? Math.round((mealCalories / dailyGoal) * 100) : 0;

    const sharedNote = divider > 1 ? ` (shared ÷${divider})` : '';
    const line2 = t('meal.pointsEarned', { points }) + sharedNote;
    const line3 = dailyGoal > 0
      ? t('meal.caloriesLogged', { calories: mealCalories, percent: percentOfGoal })
      : t('meal.caloriesLoggedNoGoal', { calories: mealCalories });

    Alert.alert(
      t('meal.wellDone'),
      `${line2}\n${line3}\n\n${coaching.nudge}`,
      [{ text: t('common.ok'), onPress: () => router.back() }]
    );
  }, [foodItems, photoUri, categories, nutrition, foodName, saltRating, addedSugar, mealType, entryMode, addMealLog, router, isSharedDish, sharedCount, profile?.healthGoal, nutrientTargets?.calories, t]);

  const resetToStart = useCallback(() => {
    setStep('choose_mode');
    setPhotoUri(null);
    setFoodItems([]);
    setCategories([]);
    setNutrition(defaultNutrition);
    setFoodName('');
    setManualQuery('');
    setDishSuggestions([]);
    setSearchError(null);
    setAnalyzeError(null);
  }, []);

  const _plantCount = useMemo(() =>
    categories.filter(c => !['processed_foods', 'animal_products'].includes(c)).length,
  [categories]);

  const filteredHistory = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0] ?? '';
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0] ?? '';

    let filtered = [...mealLogs];
    if (historyFilter === 'today') {
      filtered = filtered.filter(m => m.date === todayStr);
    } else if (historyFilter === 'week') {
      filtered = filtered.filter(m => m.date >= weekAgoStr);
    }
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [mealLogs, historyFilter]);

  const formatTime = useCallback((timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }, []);

  const getMealTypeLabel = useCallback((type?: MealType) => {
    if (!type) return null;
    const found = MEAL_TYPE_CONFIG.find(m => m.value === type);
    return found ?? null;
  }, []);

  const renderNutrientRow = useCallback((row: NutrientRow) => {
    const isEditing = editingNutrient === row.key;
    const value = nutrition[row.key];
    const isCalorie = row.key === 'calories';

    return (
      <View key={row.key}>
        <TouchableOpacity
          style={[styles.nutrientRow, row.indent && styles.nutrientRowIndent]}
          onPress={() => handleNutrientTap(row.key)}
          activeOpacity={0.6}
        >
          <Text style={[
            styles.nutrientLabel,
            !row.indent && styles.nutrientLabelBold,
            isCalorie && styles.nutrientLabelCalorie,
          ]}>
            {row.label}
          </Text>
          <View style={styles.nutrientValueRow}>
            <Text style={[
              styles.nutrientValue,
              isCalorie && styles.nutrientValueCalorie,
            ]}>
              {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
            </Text>
            <Text style={[styles.nutrientUnit, isCalorie && styles.nutrientUnitCalorie]}>{row.unit}</Text>
            <Pencil size={11} color={Colors.textTertiary} style={{ marginLeft: 6 }} />
          </View>
        </TouchableOpacity>
        {isEditing && (
          <View style={styles.editNutrientRow}>
            <TextInput
              style={styles.editNutrientInput}
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
              onSubmitEditing={saveNutrientEdit}
            />
            <Text style={styles.editNutrientUnit}>{row.unit}</Text>
            <TouchableOpacity style={styles.editNutrientSave} onPress={saveNutrientEdit}>
              <Check size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [editingNutrient, nutrition, editValue, handleNutrientTap, saveNutrientEdit]);

  const renderSliderTrack = useCallback((value: number, onValueChange: (v: number) => void, leftLabel: string, rightLabel: string, leftColor: string, rightColor: string) => {
    return (
      <View style={styles.sliderContainer}>
        <View style={styles.sliderLabels}>
          <Text style={[styles.sliderLabel, { color: leftColor }]}>{leftLabel}</Text>
          <Text style={[styles.sliderLabel, { color: rightColor }]}>{rightLabel}</Text>
        </View>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${value * 100}%`, backgroundColor: rightColor }]} />
          <View style={[styles.sliderThumb, { left: `${value * 100}%` }]} />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={(e) => {
              const nativeEvent = e.nativeEvent;
              const trackWidth = 280;
              const newValue = Math.max(0, Math.min(1, nativeEvent.locationX / trackWidth));
              onValueChange(Math.round(newValue * 20) / 20);
              void Haptics.selectionAsync();
            }}
          />
        </View>
        <View style={styles.sliderDots}>
          {[0, 0.25, 0.5, 0.75, 1].map((dot) => (
            <View
              key={dot}
              style={[styles.sliderDot, value >= dot && { backgroundColor: rightColor }]}
            />
          ))}
        </View>
      </View>
    );
  }, []);

  const renderMealTypeSelector = useCallback(() => (
    <View style={styles.mealTypeSection}>
      <Text style={styles.mealTypeTitle}>Meal Type</Text>
      <View style={styles.mealTypeRow}>
        {MEAL_TYPE_CONFIG.map((mt) => {
          const isActive = mealType === mt.value;
          return (
            <TouchableOpacity
              key={mt.value}
              style={[
                styles.mealTypeChip,
                isActive && { backgroundColor: mt.color, borderColor: mt.color },
              ]}
              onPress={() => { setMealType(mt.value); void Haptics.selectionAsync(); }}
              activeOpacity={0.7}
            >
              <MealTypeIcon type={mt.value} color={isActive ? Colors.white : mt.color} />
              <Text style={[
                styles.mealTypeChipText,
                isActive && { color: Colors.white },
              ]}>
                {mt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  ), [mealType]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('meal.logMeal')}</Text>
          {step === 'confirm' ? (
            <TouchableOpacity onPress={saveMeal} style={styles.saveBtn} testID="save-meal">
              <Check size={20} color={Colors.white} />
              <Text style={styles.saveBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 70 }} />
          )}
        </View>

        {step === 'analyzing' ? (
          <View style={styles.analyzingContainer}>
            <Animated.View style={[styles.analyzingCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Sparkles size={40} color={Colors.nutrition} />
            </Animated.View>
            <Text style={styles.analyzingTitle}>{t('meal.analyzing')}</Text>
            <Text style={styles.analyzingSub}>{t('meal.analyzingSub')}</Text>
            <ActivityIndicator size="small" color={Colors.nutrition} style={{ marginTop: 16 }} />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {step === 'choose_mode' && (
                <>
                  <Text style={styles.modeTitle}>{t('meal.howWouldYouLikeToLog')}</Text>
                  <Text style={styles.modeSub}>{t('meal.chooseMethod')}</Text>

                  <View style={styles.modeCards}>
                    <TouchableOpacity
                      style={styles.modeCard}
                      onPress={() => { setEntryMode('photo'); setStep('photo'); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      activeOpacity={0.85}
                      testID="mode-photo"
                    >
                      <View style={[styles.modeIconTile, { backgroundColor: Colors.primary, shadowColor: Colors.primary }]}>
                        <Camera size={24} color={Colors.white} />
                      </View>
                      <View style={styles.modeCardBody}>
                        <Text style={styles.modeCardTitle}>{t('meal.takePhoto')}</Text>
                        <Text style={styles.modeCardDesc} numberOfLines={2}>
                          {t('meal.takePhotoDesc')}
                        </Text>
                      </View>
                      <View style={styles.modeCardChevron}>
                        <ChevronRight size={20} color={Colors.textTertiary} />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modeCard}
                      onPress={() => { setEntryMode('manual'); setStep('manual_search'); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      activeOpacity={0.85}
                      testID="mode-manual"
                    >
                      <View style={[styles.modeIconTile, { backgroundColor: Colors.mood, shadowColor: Colors.mood }]}>
                        <UtensilsCrossed size={24} color={Colors.white} />
                      </View>
                      <View style={styles.modeCardBody}>
                        <Text style={styles.modeCardTitle}>{t('meal.enterManually')}</Text>
                        <Text style={styles.modeCardDesc} numberOfLines={2}>
                          {t('meal.enterManuallyDesc')}
                        </Text>
                      </View>
                      <View style={styles.modeCardChevron}>
                        <ChevronRight size={20} color={Colors.textTertiary} />
                      </View>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.historyToggle}
                    onPress={() => { setShowHistory(!showHistory); void Haptics.selectionAsync(); }}
                  >
                    <Clock size={16} color={Colors.nutrition} />
                    <Text style={styles.historyToggleText}>
                      {t('meal.mealHistory')} ({mealLogs.length})
                    </Text>
                    {showHistory ? (
                      <ChevronUp size={18} color={Colors.textSecondary} />
                    ) : (
                      <ChevronDown size={18} color={Colors.textSecondary} />
                    )}
                  </TouchableOpacity>

                  {showHistory && (
                    <View style={styles.historySection}>
                      <View style={styles.historyFilterRow}>
                        {(['today', 'week', 'all'] as const).map(f => (
                          <TouchableOpacity
                            key={f}
                            style={[
                              styles.historyFilterBtn,
                              historyFilter === f && styles.historyFilterBtnActive,
                            ]}
                            onPress={() => { setHistoryFilter(f); void Haptics.selectionAsync(); }}
                          >
                            <Text style={[
                              styles.historyFilterText,
                              historyFilter === f && styles.historyFilterTextActive,
                            ]}>
                              {f === 'today' ? t('common.today') : f === 'week' ? t('common.thisWeek') : t('common.all')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {filteredHistory.length === 0 ? (
                        <View style={styles.historyEmpty}>
                          <Text style={styles.historyEmptyText}>
                            {t('meal.noMealsLogged', { when: historyFilter === 'today' ? t('common.today').toLowerCase() : historyFilter === 'week' ? t('common.thisWeek').toLowerCase() : '' })}
                          </Text>
                        </View>
                      ) : (
                        filteredHistory.map(meal => {
                          const mtInfo = getMealTypeLabel(meal.mealType);
                          const confirmDeleteMeal = () => {
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            Alert.alert(
                              t('meal.deleteMealTitle'),
                              t('meal.deleteMealMessage'),
                              [
                                { text: t('common.cancel'), style: 'cancel' },
                                {
                                  text: t('common.delete'),
                                  style: 'destructive',
                                  onPress: () => {
                                    deleteMealLog(meal.id);
                                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                  },
                                },
                              ],
                            );
                          };
                          return (
                            <SwipeToDelete
                              key={meal.id}
                              onDelete={confirmDeleteMeal}
                              testID={`meal-history-${meal.id}`}
                              containerStyle={styles.historyCardWrap}
                            >
                            <View style={styles.historyCard}>
                              <View style={styles.historyCardRow}>
                                {meal.photoUri ? (
                                  <Image source={{ uri: meal.photoUri }} style={styles.historyThumb} contentFit="cover" />
                                ) : (
                                  <View style={styles.historyThumbPlaceholder}>
                                    {meal.entryMethod === 'manual'
                                      ? <UtensilsCrossed size={16} color={Colors.textTertiary} />
                                      : <Camera size={16} color={Colors.textTertiary} />
                                    }
                                  </View>
                                )}
                                <View style={styles.historyCardInfo}>
                                  <Text style={styles.historyCardName} numberOfLines={1}>
                                    {meal.foodName || 'Meal'}
                                  </Text>
                                  <Text style={styles.historyCardMeta}>
                                    {formatDate(meal.date)} at {formatTime(meal.timestamp)}
                                  </Text>
                                  <View style={styles.historyCardChips}>
                                    {mtInfo && (
                                      <View style={[styles.historyChip, { backgroundColor: mtInfo.color + '18' }]}>
                                        <Text style={[styles.historyChipText, { color: mtInfo.color }]}>{mtInfo.label}</Text>
                                      </View>
                                    )}
                                    {meal.nutrition?.calories != null && (
                                      <View style={styles.historyChip}>
                                        <Flame size={10} color={Colors.physicalActivity} />
                                        <Text style={styles.historyChipText}>{meal.nutrition.calories} kcal</Text>
                                      </View>
                                    )}
                                    <View style={[styles.historyChip, { backgroundColor: Colors.nutritionLight }]}>
                                      <Text style={[styles.historyChipText, { color: Colors.nutrition }]}>+{meal.points} pts</Text>
                                    </View>
                                  </View>
                                </View>
                              </View>
                              {meal.foodItems.length > 0 && (
                                <View style={styles.historyItemsList}>
                                  {meal.foodItems.slice(0, 4).map((fi, idx) => (
                                    <Text key={idx} style={styles.historyItemText}>
                                      {fi.name} ({fi.estimatedGrams}g)
                                    </Text>
                                  ))}
                                  {meal.foodItems.length > 4 && (
                                    <Text style={styles.historyItemMore}>+{meal.foodItems.length - 4} more</Text>
                                  )}
                                </View>
                              )}
                            </View>
                            </SwipeToDelete>
                          );
                        })
                      )}
                    </View>
                  )}
                </>
              )}

              {step === 'photo' && (
                <>
                  <View style={styles.photoSection}>
                    {photoUri ? (
                      <View>
                        <TouchableOpacity onPress={takePhoto} style={styles.photoPreview}>
                          <Image source={{ uri: photoUri }} style={styles.photoImage} contentFit="cover" />
                          <View style={styles.retakeOverlay}>
                            <Camera size={18} color={Colors.white} />
                            <Text style={styles.retakeText}>{t('meal.retake')}</Text>
                          </View>
                        </TouchableOpacity>
                        {analyzeError && (
                          <View style={styles.errorBanner}>
                            <Text style={styles.errorText}>{analyzeError}</Text>
                          </View>
                        )}
                        <TouchableOpacity style={styles.analyzeBtn} onPress={analyzePhoto} testID="analyze-photo">
                          <Sparkles size={20} color={Colors.white} />
                          <Text style={styles.analyzeBtnText}>{t('meal.analyze')}</Text>
                          <ChevronRight size={18} color={Colors.white} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.photoPrompt}>
                        <View style={styles.cameraCircle}>
                          <Camera size={32} color={Colors.nutrition} />
                        </View>
                        <Text style={styles.photoPromptTitle}>{t('meal.photographYourMeal')}</Text>
                        <Text style={styles.photoPromptSub}>
                          {t('meal.photographSub')}
                        </Text>
                        <View style={styles.photoButtons}>
                          <TouchableOpacity style={styles.photoBtnPrimary} onPress={takePhoto} testID="take-photo">
                            <Camera size={18} color={Colors.white} />
                            <Text style={styles.photoBtnPrimaryText}>{t('meal.takePhotoBtn')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.photoBtnSecondary} onPress={pickImage} testID="pick-image">
                            <Text style={styles.photoBtnSecondaryText}>{t('meal.chooseFromGallery')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity style={styles.backToModeBtn} onPress={resetToStart}>
                    <Text style={styles.backToModeBtnText}>{t('meal.backToOptions')}</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 'manual_search' && (
                <>
                  <View style={styles.manualSearchSection}>
                    <View style={styles.manualSearchIconCircle}>
                      <Search size={28} color={Colors.physicalActivity} />
                    </View>
                    <Text style={styles.manualSearchTitle}>{t('meal.whatDidYouEat')}</Text>
                    <Text style={styles.manualSearchSub}>{t('meal.typeDish')}</Text>

                    <View style={styles.manualSearchInputRow}>
                      <TextInput
                        style={styles.manualSearchInput}
                        value={manualQuery}
                        onChangeText={setManualQuery}
                        placeholder="e.g. Nasi Goreng, Caesar Salad..."
                        placeholderTextColor={Colors.textTertiary}
                        autoFocus
                        returnKeyType="search"
                        onSubmitEditing={searchDishes}
                        testID="manual-search-input"
                      />
                    </View>

                    {searchError && (
                      <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>{searchError}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.manualSearchBtn, isSearching && { opacity: 0.7 }]}
                      onPress={searchDishes}
                      disabled={isSearching}
                      testID="search-dishes"
                    >
                      {isSearching ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <Search size={18} color={Colors.white} />
                      )}
                      <Text style={styles.manualSearchBtnText}>
                        {isSearching ? t('meal.searching') : t('meal.findMyDish')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.backToModeBtn} onPress={resetToStart}>
                    <Text style={styles.backToModeBtnText}>{t('meal.backToOptions')}</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 'manual_picking' && (
                <>
                  <Text style={styles.pickTitle}>{t('meal.pickYourDish')}</Text>
                  <Text style={styles.pickSub}>{t('meal.pickClosest', { query: manualQuery })}</Text>

                  {dishSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionCard}
                      onPress={() => selectDishSuggestion(suggestion)}
                      activeOpacity={0.7}
                      testID={`suggestion-${index}`}
                    >
                      <View style={styles.suggestionHeader}>
                        <Text style={styles.suggestionName}>{suggestion.name}</Text>
                        <View style={styles.suggestionCalBadge}>
                          <Flame size={12} color={Colors.physicalActivity} />
                          <Text style={styles.suggestionCalText}>{suggestion.calories} kcal</Text>
                        </View>
                      </View>
                      <Text style={styles.suggestionDesc}>{suggestion.description}</Text>
                      <View style={styles.suggestionMacros}>
                        <View style={styles.suggestionMacro}>
                          <Text style={styles.suggestionMacroValue}>{suggestion.nutrition.proteinG}g</Text>
                          <Text style={styles.suggestionMacroLabel}>Protein</Text>
                        </View>
                        <View style={styles.suggestionMacroDivider} />
                        <View style={styles.suggestionMacro}>
                          <Text style={styles.suggestionMacroValue}>{suggestion.nutrition.totalCarbsG}g</Text>
                          <Text style={styles.suggestionMacroLabel}>Carbs</Text>
                        </View>
                        <View style={styles.suggestionMacroDivider} />
                        <View style={styles.suggestionMacro}>
                          <Text style={styles.suggestionMacroValue}>{suggestion.nutrition.totalFatG}g</Text>
                          <Text style={styles.suggestionMacroLabel}>Fat</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={styles.retrySearchBtn}
                    onPress={() => { setStep('manual_search'); setDishSuggestions([]); }}
                  >
                    <Search size={14} color={Colors.physicalActivity} />
                    <Text style={styles.retrySearchBtnText}>{t('meal.searchAgain')}</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 'review_items' && (
                <>
                  {photoUri && entryMode === 'photo' && (
                    <View style={styles.reviewHeader}>
                      <Image source={{ uri: photoUri }} style={styles.reviewThumb} contentFit="cover" />
                      <View style={styles.reviewHeaderInfo}>
                        <Text style={styles.reviewMealName}>{foodName || 'Detected Meal'}</Text>
                        <Text style={styles.reviewItemCount}>
                          {foodItems.length} item{foodItems.length !== 1 ? 's' : ''} {entryMode === 'photo' ? 'detected by AI' : 'in this dish'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {entryMode === 'manual' && (
                    <View style={styles.reviewManualHeader}>
                      <View style={[styles.reviewManualIcon, { backgroundColor: '#FFF3E0' }]}>
                        <UtensilsCrossed size={22} color={Colors.physicalActivity} />
                      </View>
                      <View style={styles.reviewHeaderInfo}>
                        <Text style={styles.reviewMealName}>{foodName || 'Manual Entry'}</Text>
                        <Text style={styles.reviewItemCount}>
                          {foodItems.length} item{foodItems.length !== 1 ? 's' : ''} in this dish
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.reviewSection}>
                    <Text style={styles.reviewTitle}>Review Items</Text>
                    <Text style={styles.reviewSubtitle}>Edit names or portions before calculating nutrition</Text>

                    {foodItems.map((item, index) => (
                      <View key={index} style={styles.reviewItemCard}>
                        <View style={styles.reviewItemContent}>
                          <TextInput
                            style={styles.reviewItemNameInput}
                            value={item.name}
                            onChangeText={(text) => updateFoodItemName(index, text)}
                            placeholder="Item name"
                            placeholderTextColor={Colors.textTertiary}
                          />
                          <View style={styles.reviewItemGramsRow}>
                            <TextInput
                              style={styles.reviewItemGramsInput}
                              value={String(item.estimatedGrams)}
                              onChangeText={(text) => updateFoodItemGrams(index, text)}
                              keyboardType="numeric"
                              selectTextOnFocus
                            />
                            <Text style={styles.reviewItemGramsUnit}>g</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => removeFoodItem(index)}
                          style={styles.reviewItemDelete}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={16} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <TouchableOpacity style={styles.addItemBtn} onPress={addFoodItem}>
                      <Plus size={16} color={Colors.nutrition} />
                      <Text style={styles.addItemBtnText}>Add Item</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.reviewMealNameSection}>
                    <Text style={styles.reviewMealNameLabel}>Meal Description</Text>
                    <TextInput
                      style={styles.reviewMealNameInputField}
                      value={foodName}
                      onChangeText={setFoodName}
                      placeholder="e.g. Grilled salmon with quinoa..."
                      placeholderTextColor={Colors.textTertiary}
                      multiline
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.confirmCalcBtn}
                    onPress={() => { setStep('confirm'); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                    testID="confirm-calculate"
                  >
                    <Check size={20} color={Colors.white} />
                    <Text style={styles.confirmCalcBtnText}>Confirm & Continue</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.reviewReanalyzeLink}
                    onPress={resetToStart}
                  >
                    <Text style={styles.reviewReanalyzeLinkText}>Start over</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 'confirm' && (
                <>
                  {photoUri && entryMode === 'photo' && (
                    <View style={styles.confirmPhoto}>
                      <Image source={{ uri: photoUri }} style={styles.confirmPhotoImage} contentFit="cover" />
                    </View>
                  )}

                  {renderMealTypeSelector()}

                  <View style={styles.foodNameSection}>
                    <Text style={styles.foodNameLabel}>Meal Description</Text>
                    <TextInput
                      style={styles.foodNameInput}
                      value={foodName}
                      onChangeText={setFoodName}
                      placeholder="e.g. Grilled salmon with quinoa..."
                      placeholderTextColor={Colors.textTertiary}
                      multiline
                      testID="food-name-input"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.foodItemsToggle}
                    onPress={() => { setShowFoodItems(!showFoodItems); void Haptics.selectionAsync(); }}
                  >
                    <Sparkles size={16} color={Colors.nutrition} />
                    <Text style={styles.foodItemsToggleText}>
                      {foodItems.length} item{foodItems.length !== 1 ? 's' : ''}
                    </Text>
                    {showFoodItems ? (
                      <ChevronUp size={18} color={Colors.textSecondary} />
                    ) : (
                      <ChevronDown size={18} color={Colors.textSecondary} />
                    )}
                  </TouchableOpacity>

                  {showFoodItems && (
                    <View style={styles.foodItemsList}>
                      {foodItems.map((item, index) => (
                        <View key={index} style={styles.foodItemChip}>
                          <Text style={styles.foodItemChipName}>{item.name}</Text>
                          <Text style={styles.foodItemChipGrams}>{item.estimatedGrams}g</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.nutritionCard}>
                    <View style={styles.nutritionHeader}>
                      <Text style={styles.nutritionTitle}>Nutrition Facts</Text>
                      <Text style={styles.nutritionHint}>Tap any value to edit</Text>
                    </View>

                    <View style={styles.nutritionDividerThick} />

                    <Text style={styles.sectionLabel}>ENERGY</Text>
                    {ENERGY_ROWS.map(renderNutrientRow)}

                    <View style={styles.nutritionDividerThick} />

                    <Text style={styles.sectionLabel}>MACRONUTRIENTS</Text>
                    {MACRO_ROWS.map(renderNutrientRow)}

                    <View style={styles.nutritionDividerThick} />

                    <Text style={styles.sectionLabel}>MINERALS</Text>
                    {MINERAL_ROWS.map(renderNutrientRow)}

                    <View style={styles.nutritionDivider} />

                    <Text style={styles.sectionLabel}>VITAMINS</Text>
                    {VITAMIN_ROWS.map(renderNutrientRow)}
                  </View>

                  <View style={styles.sharedDishSection}>
                    <TouchableOpacity
                      style={[styles.sharedDishToggle, isSharedDish && styles.sharedDishToggleActive]}
                      onPress={() => { setIsSharedDish(!isSharedDish); void Haptics.selectionAsync(); }}
                      activeOpacity={0.7}
                    >
                      <Users size={18} color={isSharedDish ? Colors.white : Colors.socialConnection} />
                      <Text style={[styles.sharedDishToggleText, isSharedDish && styles.sharedDishToggleTextActive]}>
                        Shared Dish
                      </Text>
                    </TouchableOpacity>

                    {isSharedDish && (
                      <View style={styles.sharedDishInput}>
                        <Text style={styles.sharedDishLabel}>How many people shared this dish?</Text>
                        <View style={styles.sharedCountRow}>
                          {['2', '3', '4', '5'].map(n => (
                            <TouchableOpacity
                              key={n}
                              style={[
                                styles.sharedCountChip,
                                sharedCount === n && styles.sharedCountChipActive,
                              ]}
                              onPress={() => { setSharedCount(n); void Haptics.selectionAsync(); }}
                            >
                              <Text style={[
                                styles.sharedCountText,
                                sharedCount === n && styles.sharedCountTextActive,
                              ]}>{n}</Text>
                            </TouchableOpacity>
                          ))}
                          <TextInput
                            style={styles.sharedCountInput}
                            value={sharedCount}
                            onChangeText={setSharedCount}
                            keyboardType="numeric"
                            maxLength={2}
                            selectTextOnFocus
                          />
                        </View>
                        <Text style={styles.sharedDishHint}>
                          Nutrition values will be divided by {parseInt(sharedCount, 10) || 2} before logging
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.perceptionSection}>
                    <Text style={styles.perceptionTitle}>Your Perception</Text>
                    <Text style={styles.perceptionSub}>Help us estimate what AI can't see</Text>

                    <View style={styles.perceptionCard}>
                      <Text style={styles.perceptionQuestion}>How salty do you think this food/drink is?</Text>
                      {renderSliderTrack(saltRating, setSaltRating, 'Not salty', 'Very salty', Colors.textTertiary, '#5C6BC0')}
                    </View>

                    <View style={styles.perceptionCard}>
                      <Text style={styles.perceptionQuestion}>Was there added sugar in this food/drink?</Text>
                      <View style={styles.sugarToggleRow}>
                        {([
                          { value: 'yes' as const, label: 'Yes', color: '#EC407A' },
                          { value: 'no' as const, label: 'No', color: Colors.nutrition },
                          { value: 'not_sure' as const, label: 'Not sure', color: Colors.textSecondary },
                        ]).map((opt) => (
                          <TouchableOpacity
                            key={opt.value}
                            style={[
                              styles.sugarToggleBtn,
                              addedSugar === opt.value && { backgroundColor: opt.color, borderColor: opt.color },
                            ]}
                            onPress={() => { setAddedSugar(opt.value); void Haptics.selectionAsync(); }}
                          >
                            <Text style={[
                              styles.sugarToggleText,
                              addedSugar === opt.value && styles.sugarToggleTextActive,
                            ]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.reanalyzeBtn}
                    onPress={resetToStart}
                  >
                    <Text style={styles.reanalyzeBtnText}>Start over</Text>
                  </TouchableOpacity>

                  <View style={styles.pointsPreview}>
                    {(() => {
                      const { total, breakdown } = calculateMealPoints(categories);
                      return (
                        <>
                          {breakdown.map((line, i) => (
                            <View key={i} style={styles.pointsRow}>
                              <Text style={[styles.pointsLabel, i > 0 && { color: Colors.nutrition }]}>{line.split(': ')[0]}</Text>
                              <Text style={[styles.pointsValue, i > 0 && { color: Colors.nutrition }]}>{line.split(': ')[1]}</Text>
                            </View>
                          ))}
                          <View style={[styles.pointsRow, styles.pointsTotal]}>
                            <Text style={styles.pointsTotalLabel}>Total</Text>
                            <Text style={styles.pointsTotalValue}>{total}</Text>
                          </View>
                        </>
                      );
                    })()}
                  </View>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  closeBtn: { padding: 4 },
  title: { flex: 1, fontSize: 18, fontWeight: '700' as const, color: Colors.text, textAlign: 'center' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.nutrition,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 4,
  },
  saveBtnText: { fontSize: 14, fontWeight: '600' as const, color: Colors.white },
  scroll: { padding: 20, paddingBottom: 50 },

  modeTitle: { fontSize: 28, fontWeight: '800' as const, color: Colors.text, marginBottom: 4, letterSpacing: -0.6 },
  modeSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: 22 },
  modeCards: { gap: 12, marginBottom: 24 },
  modeCard: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14,
    backgroundColor: Colors.white, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  modeIconTile: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 2, borderColor: Colors.white,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 3,
  },
  modeCardBody: { flex: 1 },
  modeCardTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, marginBottom: 3, letterSpacing: -0.2 },
  modeCardDesc: { fontSize: 12.5, color: Colors.textSecondary, lineHeight: 17 },
  modeCardChevron: { paddingLeft: 4 },

  photoSection: { marginBottom: 24 },
  photoPreview: { borderRadius: 16, overflow: 'hidden', height: 220 },
  photoImage: { width: '100%', height: '100%' },
  retakeOverlay: {
    position: 'absolute', bottom: 12, right: 12, flexDirection: 'row',
    alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 10, gap: 6,
  },
  retakeText: { fontSize: 13, fontWeight: '600' as const, color: Colors.white },
  photoPrompt: {
    backgroundColor: Colors.nutritionLight, borderRadius: 16, padding: 28,
    alignItems: 'center', borderWidth: 2, borderColor: Colors.nutrition, borderStyle: 'dashed',
  },
  cameraCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  photoPromptTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.text, marginBottom: 6 },
  photoPromptSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 18, lineHeight: 19 },
  photoButtons: { gap: 10, width: '100%' },
  photoBtnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.nutrition, paddingVertical: 14, borderRadius: 12, gap: 8,
  },
  photoBtnPrimaryText: { fontSize: 15, fontWeight: '600' as const, color: Colors.white },
  photoBtnSecondary: {
    alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.inputBorder,
  },
  photoBtnSecondaryText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  analyzeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.nutrition, paddingVertical: 16, borderRadius: 14,
    marginTop: 14, gap: 8,
  },
  analyzeBtnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
  errorBanner: {
    backgroundColor: '#FFEBEE', borderRadius: 10, padding: 12, marginTop: 10,
  },
  errorText: { fontSize: 13, color: Colors.error, textAlign: 'center' },
  analyzingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40,
  },
  analyzingCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.nutritionLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: 24, borderWidth: 3, borderColor: Colors.nutrition,
  },
  analyzingTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text, marginBottom: 8 },
  analyzingSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  manualSearchSection: {
    alignItems: 'center' as const, paddingVertical: 10, marginBottom: 20,
  },
  manualSearchIconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF3E0',
    alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 16,
  },
  manualSearchTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text, marginBottom: 6 },
  manualSearchSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' as const, marginBottom: 24, lineHeight: 20 },
  manualSearchInputRow: { width: '100%', marginBottom: 12 },
  manualSearchInput: {
    backgroundColor: Colors.card, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16,
    fontSize: 16, color: Colors.text, borderWidth: 1.5, borderColor: Colors.physicalActivity,
  },
  manualSearchBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: Colors.physicalActivity, paddingVertical: 16, borderRadius: 14, gap: 8,
    width: '100%',
  },
  manualSearchBtnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },

  pickTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.text, marginBottom: 4 },
  pickSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: 18 },
  suggestionCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: 12,
  },
  suggestionHeader: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const, marginBottom: 6,
  },
  suggestionName: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, flex: 1, marginRight: 10 },
  suggestionCalBadge: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4,
    backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  suggestionCalText: { fontSize: 13, fontWeight: '700' as const, color: Colors.physicalActivity },
  suggestionDesc: { fontSize: 13, color: Colors.textSecondary, marginBottom: 14, lineHeight: 18 },
  suggestionMacros: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: Colors.inputBg, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16,
  },
  suggestionMacro: { flex: 1, alignItems: 'center' as const },
  suggestionMacroValue: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  suggestionMacroLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  suggestionMacroDivider: { width: 1, height: 24, backgroundColor: Colors.divider },
  retrySearchBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 6, paddingVertical: 14, marginTop: 4,
  },
  retrySearchBtnText: { fontSize: 14, fontWeight: '600' as const, color: Colors.physicalActivity },

  backToModeBtn: { alignItems: 'center' as const, paddingVertical: 14 },
  backToModeBtnText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary, textDecorationLine: 'underline' as const },

  mealTypeSection: { marginBottom: 20 },
  mealTypeTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 10 },
  mealTypeRow: { flexDirection: 'row' as const, gap: 8 },
  mealTypeChip: {
    flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 5, paddingVertical: 11, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.inputBorder, backgroundColor: Colors.card,
  },
  mealTypeChipText: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary },

  confirmPhoto: { borderRadius: 14, overflow: 'hidden', height: 180, marginBottom: 16 },
  confirmPhotoImage: { width: '100%', height: '100%' },

  foodNameSection: { marginBottom: 16 },
  foodNameLabel: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 6, letterSpacing: 0.3 },
  foodNameInput: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 14,
    fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.cardBorder,
    minHeight: 44,
  },

  foodItemsToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: Colors.nutritionLight, borderRadius: 10, marginBottom: 4,
  },
  foodItemsToggleText: { flex: 1, fontSize: 14, fontWeight: '600' as const, color: Colors.nutrition },
  foodItemsList: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingVertical: 10, marginBottom: 12,
  },
  foodItemChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  foodItemChipName: { fontSize: 13, fontWeight: '600' as const, color: Colors.text },
  foodItemChipGrams: { fontSize: 12, fontWeight: '500' as const, color: Colors.textSecondary },

  nutritionCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.cardBorder, marginTop: 12, marginBottom: 24,
  },
  nutritionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  nutritionTitle: { fontSize: 18, fontWeight: '800' as const, color: Colors.text },
  nutritionHint: { fontSize: 11, color: Colors.textTertiary, fontStyle: 'italic' as const },
  nutritionDividerThick: { height: 3, backgroundColor: Colors.text, borderRadius: 2, marginVertical: 8 },
  nutritionDivider: { height: 1, backgroundColor: Colors.divider, marginVertical: 6 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700' as const, color: Colors.textTertiary,
    letterSpacing: 1, marginTop: 4, marginBottom: 6,
  },
  nutrientRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider,
  },
  nutrientRowIndent: { paddingLeft: 16 },
  nutrientLabel: { fontSize: 14, color: Colors.text },
  nutrientLabelBold: { fontWeight: '600' as const },
  nutrientLabelCalorie: { fontSize: 16, fontWeight: '800' as const },
  nutrientValueRow: { flexDirection: 'row', alignItems: 'center' },
  nutrientValue: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  nutrientValueCalorie: { fontSize: 18, fontWeight: '800' as const },
  nutrientUnit: { fontSize: 12, color: Colors.textSecondary, marginLeft: 3 },
  nutrientUnitCalorie: { fontSize: 14 },

  editNutrientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: 16, backgroundColor: Colors.inputBg, borderRadius: 8,
    marginBottom: 4,
  },
  editNutrientInput: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 8, fontSize: 16, fontWeight: '600' as const, color: Colors.text,
    borderWidth: 1, borderColor: Colors.nutrition,
  },
  editNutrientUnit: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' as const },
  editNutrientSave: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.nutrition,
    alignItems: 'center', justifyContent: 'center',
  },

  perceptionSection: { marginBottom: 20 },
  perceptionTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginBottom: 4 },
  perceptionSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 14 },
  perceptionCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: 10,
  },
  perceptionQuestion: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, marginBottom: 14 },

  sugarToggleRow: { flexDirection: 'row', gap: 10 },
  sugarToggleBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.inputBorder, backgroundColor: Colors.inputBg,
  },
  sugarToggleText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  sugarToggleTextActive: { color: Colors.white },

  reanalyzeBtn: {
    alignItems: 'center', paddingVertical: 12, marginBottom: 16,
  },
  reanalyzeBtnText: { fontSize: 14, fontWeight: '600' as const, color: Colors.nutrition, textDecorationLine: 'underline' as const },

  sliderContainer: { alignItems: 'center' },
  sliderLabels: {
    flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8,
  },
  sliderLabel: { fontSize: 12, fontWeight: '500' as const },
  sliderTrack: {
    width: '100%', height: 8, backgroundColor: Colors.inputBg, borderRadius: 4,
    position: 'relative', overflow: 'visible',
  },
  sliderFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute', top: -6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.white, marginLeft: -10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15,
    shadowRadius: 4, elevation: 3, borderWidth: 2, borderColor: Colors.divider,
  },
  sliderDots: {
    flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 6,
  },
  sliderDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.inputBorder,
  },
  pointsPreview: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  pointsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bonusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pointsLabel: { fontSize: 14, color: Colors.textSecondary },
  pointsValue: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  pointsTotal: { borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 10, marginBottom: 0, marginTop: 4 },
  pointsTotalLabel: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  pointsTotalValue: { fontSize: 20, fontWeight: '800' as const, color: Colors.nutrition },
  reviewHeader: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, marginBottom: 20,
  },
  reviewThumb: { width: 72, height: 72, borderRadius: 12 },
  reviewManualHeader: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, marginBottom: 20,
  },
  reviewManualIcon: {
    width: 72, height: 72, borderRadius: 12,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  reviewHeaderInfo: { flex: 1 },
  reviewMealName: { fontSize: 17, fontWeight: '700' as const, color: Colors.text, marginBottom: 2 },
  reviewItemCount: { fontSize: 13, color: Colors.textSecondary },
  reviewSection: { marginBottom: 20 },
  reviewTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginBottom: 4 },
  reviewSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  reviewItemCard: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  reviewItemContent: { flex: 1, gap: 8 },
  reviewItemNameInput: {
    fontSize: 15, fontWeight: '600' as const, color: Colors.text, padding: 0,
  },
  reviewItemGramsRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  reviewItemGramsInput: {
    fontSize: 14, fontWeight: '500' as const, color: Colors.physicalActivity,
    backgroundColor: Colors.inputBg, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, minWidth: 60, textAlign: 'center' as const,
  },
  reviewItemGramsUnit: { fontSize: 13, color: Colors.textSecondary },
  reviewItemDelete: { padding: 8 },
  addItemBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 6, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.nutrition, borderStyle: 'dashed' as const, marginTop: 4,
  },
  addItemBtnText: { fontSize: 14, fontWeight: '600' as const, color: Colors.nutrition },
  reviewMealNameSection: { marginBottom: 20 },
  reviewMealNameLabel: {
    fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary,
    marginBottom: 6, letterSpacing: 0.3,
  },
  reviewMealNameInputField: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 14,
    fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.cardBorder, minHeight: 44,
  },
  confirmCalcBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: Colors.nutrition, paddingVertical: 18, borderRadius: 14, gap: 8, marginBottom: 12,
  },
  confirmCalcBtnText: { fontSize: 17, fontWeight: '700' as const, color: Colors.white },
  reviewReanalyzeLink: { alignItems: 'center' as const, paddingVertical: 12, marginBottom: 20 },
  reviewReanalyzeLinkText: {
    fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary,
    textDecorationLine: 'underline' as const,
  },
  historyToggle: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10,
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: Colors.white, borderRadius: 16, marginBottom: 4,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  historyToggleText: { flex: 1, fontSize: 15, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.2 },
  historySection: { marginTop: 12, marginBottom: 16 },
  historyFilterRow: {
    flexDirection: 'row' as const, gap: 4, marginBottom: 14,
    backgroundColor: Colors.white, borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  historyFilterBtn: {
    flex: 1, alignItems: 'center' as const, paddingVertical: 10, borderRadius: 10,
  },
  historyFilterBtnActive: {
    backgroundColor: Colors.primary,
  },
  historyFilterText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
  historyFilterTextActive: { color: Colors.white },
  historyEmpty: {
    paddingVertical: 24, alignItems: 'center' as const,
  },
  historyEmptyText: { fontSize: 14, color: Colors.textTertiary },
  historyCardWrap: { marginBottom: 10 },
  historyCard: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  historyCardRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  historyThumb: { width: 52, height: 52, borderRadius: 10 },
  historyThumbPlaceholder: {
    width: 52, height: 52, borderRadius: 10, backgroundColor: Colors.inputBg,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  historyCardInfo: { flex: 1 },
  historyCardName: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  historyCardMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  historyCardChips: { flexDirection: 'row' as const, gap: 8, marginTop: 6, flexWrap: 'wrap' as const },
  historyChip: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4,
    backgroundColor: Colors.inputBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  historyChipText: { fontSize: 11, fontWeight: '600' as const, color: Colors.textSecondary },
  historyItemsList: {
    flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6, marginTop: 10,
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.divider,
  },
  historyItemText: { fontSize: 12, color: Colors.textSecondary },
  historyItemMore: { fontSize: 12, color: Colors.nutrition, fontWeight: '600' as const },
  longPressHint: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, marginTop: 8,
  },
  longPressHintText: { fontSize: 10, color: Colors.textTertiary, fontWeight: '500' as const },
  sharedDishSection: { marginBottom: 20 },
  sharedDishToggle: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 8, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.socialConnection, backgroundColor: Colors.card,
  },
  sharedDishToggleActive: {
    backgroundColor: Colors.socialConnection, borderColor: Colors.socialConnection,
  },
  sharedDishToggleText: { fontSize: 15, fontWeight: '600' as const, color: Colors.socialConnection },
  sharedDishToggleTextActive: { color: Colors.white },
  sharedDishInput: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginTop: 10,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  sharedDishLabel: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, marginBottom: 12 },
  sharedCountRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  sharedCountChip: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder,
  },
  sharedCountChipActive: {
    backgroundColor: Colors.socialConnection, borderColor: Colors.socialConnection,
  },
  sharedCountText: { fontSize: 16, fontWeight: '700' as const, color: Colors.textSecondary },
  sharedCountTextActive: { color: Colors.white },
  sharedCountInput: {
    width: 52, height: 44, borderRadius: 12, textAlign: 'center' as const,
    fontSize: 16, fontWeight: '700' as const, color: Colors.text,
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder,
  },
  sharedDishHint: { fontSize: 12, color: Colors.textTertiary, marginTop: 10, lineHeight: 17 },
});
