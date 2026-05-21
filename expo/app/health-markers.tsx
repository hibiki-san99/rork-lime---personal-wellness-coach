import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Modal, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, FileText, Search, Check, X, Upload,
  Camera as CameraIcon, ImageIcon, FolderOpen, ChevronDown, ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useUser } from '@/context/UserContext';
import { useLanguage } from '@/context/LanguageContext';
import { HEALTH_MARKER_PRESETS, isAbnormal, normalizeMarkerName } from '@/constants/healthMarkers';
import { HealthMarkerEntry } from '@/types';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'blood', label: 'Blood' },
  { id: 'lipid', label: 'Lipid' },
  { id: 'body', label: 'Body' },
  { id: 'other', label: 'Other' },
] as const;



function CollapsibleDateGroup({
  date,
  entries,
  defaultExpanded,
  formatDate,
  userSex,
}: {
  date: string;
  entries: HealthMarkerEntry[];
  defaultExpanded: boolean;
  formatDate: (d: string) => string;
  userSex?: 'male' | 'female';
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(prev => !prev);
  }, []);

  const hasLabUpload = entries.some(e => e.source === 'lab_upload');

  return (
    <View style={styles.collapsibleGroup}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={toggle}
        activeOpacity={0.7}
      >
        <View style={styles.collapsibleHeaderLeft}>
          {expanded ? (
            <ChevronDown size={16} color={Colors.textSecondary} />
          ) : (
            <ChevronRight size={16} color={Colors.textSecondary} />
          )}
          <Text style={styles.collapsibleDateText}>{formatDate(date)}</Text>
          {hasLabUpload && (
            <View style={styles.labSourceBadge}>
              <FileText size={10} color={Colors.socialConnection} />
              <Text style={styles.labSourceText}>Lab</Text>
            </View>
          )}
        </View>
        <Text style={styles.collapsibleCount}>
          {entries.length} marker{entries.length !== 1 ? 's' : ''}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.collapsibleBody}>
          {entries.map((entry, idx) => {
            const abnormal = isAbnormal(entry.markerName, entry.value, userSex);
            return (
              <View
                key={entry.id}
                style={[
                  styles.measurementRow,
                  idx < entries.length - 1 && styles.measurementRowBorder,
                ]}
              >
                <Text
                  style={[
                    styles.measurementName,
                    abnormal && styles.measurementNameAbnormal,
                  ]}
                  numberOfLines={1}
                >
                  {entry.markerName}
                </Text>
                <View style={styles.measurementValueWrap}>
                  <Text
                    style={[
                      styles.measurementValue,
                      abnormal && styles.measurementValueAbnormal,
                    ]}
                  >
                    {entry.value}
                  </Text>
                  <Text style={styles.measurementUnit}>{entry.unit}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function HealthMarkersScreen() {
  const router = useRouter();
  const { healthMarkers, addHealthMarker, addHealthMarkersBatch, profile } = useUser();
  const { t } = useLanguage();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<typeof HEALTH_MARKER_PRESETS[number] | null>(null);
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isParsingPDF, setIsParsingPDF] = useState(false);
  const [parsedResults, setParsedResults] = useState<Array<{ name: string; value: number; unit: string }>>([]);
  const [showParsedModal, setShowParsedModal] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [parsedTestDate, setParsedTestDate] = useState<string | null>(null);

  const filteredPresets = useMemo(() => {
    let presets = HEALTH_MARKER_PRESETS;
    if (selectedCategory !== 'all') {
      presets = presets.filter(p => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      presets = presets.filter(p => p.name.toLowerCase().includes(q));
    }
    return presets;
  }, [selectedCategory, searchQuery]);

  const groupedByDate = useMemo(() => {
    const sorted = [...healthMarkers].sort((a, b) => b.timestamp - a.timestamp);
    const groups: Record<string, HealthMarkerEntry[]> = {};
    for (const m of sorted) {
      if (!groups[m.date]) groups[m.date] = [];
      groups[m.date]!.push(m);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [healthMarkers]);

  const handleSelectPreset = useCallback((preset: typeof HEALTH_MARKER_PRESETS[number]) => {
    router.push(`/marker-detail?name=${encodeURIComponent(preset.name)}&unit=${encodeURIComponent(preset.unit)}&icon=${encodeURIComponent(preset.icon)}`);
  }, [router]);

  const handleSaveMarker = useCallback(() => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      Alert.alert('Invalid Value', 'Please enter a valid number.');
      return;
    }

    const markerName = selectedPreset ? selectedPreset.name : customName.trim();
    const markerUnit = selectedPreset ? selectedPreset.unit : customUnit.trim();

    if (!markerName) {
      Alert.alert('Missing Name', 'Please enter a marker name.');
      return;
    }

    const entry: HealthMarkerEntry = {
      id: `hm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date: new Date().toISOString().split('T')[0] ?? '',
      markerName,
      value: numValue,
      unit: markerUnit || '',
      notes: notes.trim() || undefined,
      source: 'manual',
      points: 15,
      timestamp: Date.now(),
    };

    const pts = addHealthMarker(entry);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Saved!', `${markerName}: ${numValue} ${markerUnit}\n+${pts} points earned!`);
    setShowAddModal(false);
    setShowCustomModal(false);
    setValue('');
    setNotes('');
    setCustomName('');
    setCustomUnit('');
    setSelectedPreset(null);
  }, [value, notes, selectedPreset, customName, customUnit, addHealthMarker]);

  const processLabImage = useCallback(async (uri: string) => {
    setIsParsingPDF(true);
    setShowUploadOptions(false);
    try {
      let fileData: string;
      const response = await fetch(uri);
      const blob = await response.blob();
      fileData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const base64Data = fileData.split(',')[1] ?? fileData;

      const parsed = await generateObject({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all health/lab test markers from this document. The document may be in English, Indonesian (Bahasa Indonesia), or Chinese (Mandarin). Translate all marker names to English. Use mg/dL for blood glucose, cholesterol, triglycerides, creatinine, uric acid. Use mmHg for blood pressure. Use g/dL for hemoglobin. Use % for HbA1c. Use standard medical units. Extract every single marker you can find. If a value has a range, just use the actual value.

IMPORTANT: Also look for the date the lab test was conducted/collected/reported. Look for date fields like "Tanggal" (Indonesian), "Date", "Collection Date", "Report Date", "Specimen Date", "检验日期" / "报告日期" (Chinese), etc. Return the date in YYYY-MM-DD format. If multiple dates are found, prefer the specimen/collection date. If no date is found, return null.`,
              },
              {
                type: 'image',
                image: base64Data,
              },
            ],
          },
        ],
        schema: z.object({
          markers: z.array(z.object({
            name: z.string().describe('English name of the health marker'),
            value: z.number().describe('Numeric value of the marker'),
            unit: z.string().describe('Unit of measurement'),
          })),
          testDate: z.string().nullable().describe('Date the lab test was conducted in YYYY-MM-DD format, or null if not found'),
          language: z.string().describe('Detected language of the document'),
        }),
      });

      console.log('[HealthMarkers] Parsed lab results:', parsed.markers.length, 'markers, language:', parsed.language, 'testDate:', parsed.testDate);

      if (parsed.markers.length === 0) {
        Alert.alert('No Results', 'Could not detect any health markers in this document. Please try a clearer image or enter values manually.');
      } else {
        setParsedResults(parsed.markers);
        setParsedTestDate(parsed.testDate ?? null);
        setShowParsedModal(true);
      }
    } catch (err) {
      console.log('[HealthMarkers] Parse error:', err);
      Alert.alert('Error', 'Could not process the image. Please try again or enter values manually.');
    } finally {
      setIsParsingPDF(false);
    }
  }, []);

  const handleUploadFromCamera = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Camera access is required to photograph lab results.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        console.log('[HealthMarkers] Camera photo taken');
        void processLabImage(result.assets[0].uri);
      }
    } catch (err) {
      console.log('[HealthMarkers] Camera error:', err);
      Alert.alert('Error', 'Could not open camera.');
    }
  }, [processLabImage]);

  const handleUploadFromGallery = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        console.log('[HealthMarkers] Gallery photo selected');
        void processLabImage(result.assets[0].uri);
      }
    } catch (err) {
      console.log('[HealthMarkers] Gallery error:', err);
      Alert.alert('Error', 'Could not open photo library.');
    }
  }, [processLabImage]);

  const handleUploadFromFiles = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      console.log('[HealthMarkers] Picked file:', asset.name, asset.mimeType);
      void processLabImage(asset.uri);
    } catch (err) {
      console.log('[HealthMarkers] File picker error:', err);
      Alert.alert('Error', 'Could not open file picker.');
    }
  }, [processLabImage]);

  const handleConfirmParsedResults = useCallback(() => {
    const dateStr = parsedTestDate ?? (new Date().toISOString().split('T')[0] ?? '');
    const dateTimestamp = new Date(dateStr + 'T12:00:00').getTime() || Date.now();
    const entries: HealthMarkerEntry[] = parsedResults.map((r, idx) => ({
      id: `hm_lab_${Date.now()}_${idx}`,
      date: dateStr,
      markerName: normalizeMarkerName(r.name),
      value: r.value,
      unit: r.unit,
      source: 'lab_upload' as const,
      points: 15,
      timestamp: dateTimestamp + idx,
    }));

    const pts = addHealthMarkersBatch(entries);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Lab Results Saved!', `${entries.length} markers imported\n+${pts} points earned!`);
    setShowParsedModal(false);
    setParsedResults([]);
    setParsedTestDate(null);
  }, [parsedResults, parsedTestDate, addHealthMarkersBatch]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const lastTestDate = useMemo(() => {
    if (groupedByDate.length === 0) return null;
    return groupedByDate[0]?.[0] ?? null;
  }, [groupedByDate]);

  const abnormalCount = useMemo(() => {
    return healthMarkers.filter(m => isAbnormal(m.markerName, m.value, profile?.sex)).length;
  }, [healthMarkers, profile?.sex]);

  const motivation = useMemo(() => {
    if (healthMarkers.length === 0) return 'Start tracking to see your trends 🌱';
    if (abnormalCount === 0) return 'All markers in healthy range 🎉';
    if (abnormalCount === 1) return '1 marker needs attention — keep tracking 💪';
    return `${abnormalCount} markers to focus on — small changes add up 🔥`;
  }, [healthMarkers.length, abnormalCount]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnLight}>
            <ChevronLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={{ width: 38 }} />
        </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>{t('healthMarkers.title')}</Text>
        <Text style={styles.pageSub}>Track your lab results and body metrics over time</Text>

        {/* Hero progress card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Tracked Measurements</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroBig}>{healthMarkers.length}</Text>
            <Text style={styles.heroPct}>{abnormalCount > 0 ? `${abnormalCount}⚠` : '✓'}</Text>
          </View>
          <View style={styles.heroBarBg}>
            <View style={[styles.heroBarFill, { width: `${Math.min(100, healthMarkers.length * 5)}%` as any }]} />
          </View>
          <Text style={styles.heroMsg}>{motivation}</Text>
          {lastTestDate && (
            <Text style={styles.heroFootnote}>Last test: {formatDate(lastTestDate)}</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.uploadCard}
          onPress={() => setShowUploadOptions(true)}
          disabled={isParsingPDF}
          activeOpacity={0.7}
        >
          <View style={[styles.iconTile, { backgroundColor: Colors.primary }]}>
            {isParsingPDF ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Upload size={20} color={Colors.white} strokeWidth={2.5} />
            )}
          </View>
          <View style={styles.uploadBtnInfo}>
            <Text style={styles.uploadBtnTitle}>Upload Lab Test</Text>
            <Text style={styles.uploadBtnSub}>Photo, screenshot, or PDF</Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Select a Marker</Text>

        <View style={styles.searchBar}>
          <Search size={16} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search markers..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ paddingRight: 16 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.categoryChip, { borderColor: Colors.primary + '40' }]}
            onPress={() => {
              setShowCustomModal(true);
              setCustomName('');
              setCustomUnit('');
              setValue('');
              setNotes('');
            }}
          >
            <Text style={[styles.categoryText, { color: Colors.primary }]}>+ Custom</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.presetGrid}>
          {filteredPresets.map(preset => (
            <TouchableOpacity
              key={preset.name}
              style={styles.presetCard}
              onPress={() => handleSelectPreset(preset)}
              activeOpacity={0.7}
            >
              <Text style={styles.presetIcon}>{preset.icon}</Text>
              <Text style={styles.presetName} numberOfLines={2}>{preset.name}</Text>
              <Text style={styles.presetUnit}>{preset.unit}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {groupedByDate.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Recent Measurements</Text>
            {groupedByDate.map(([date, entries], idx) => (
              <CollapsibleDateGroup
                key={date}
                date={date}
                entries={entries}
                defaultExpanded={idx === 0}
                formatDate={formatDate}
                userSex={profile?.sex}
              />
            ))}
          </>
        )}

        {healthMarkers.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔬</Text>
            <Text style={styles.emptyTitle}>No measurements yet</Text>
            <Text style={styles.emptySub}>
              Track your health markers to monitor progress.{'\n'}
              You can enter values manually or upload lab test results.
            </Text>
          </View>
        )}
      </ScrollView>
      </SafeAreaView>

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>
                {selectedPreset ? selectedPreset.icon + ' ' + selectedPreset.name : 'Add Measurement'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Value {selectedPreset ? `(${selectedPreset.unit})` : ''}</Text>
                <TextInput
                  style={styles.valueInput}
                  value={value}
                  onChangeText={setValue}
                  placeholder="Enter value"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g. Fasting, post-meal, morning..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMarker}>
                <Check size={18} color={Colors.white} />
                <Text style={styles.saveBtnText}>Save (+15 pts)</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showCustomModal} animationType="slide" transparent onRequestClose={() => setShowCustomModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCustomModal(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Custom Marker</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Marker Name</Text>
                <TextInput
                  style={styles.valueInput}
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="e.g. CRP, Insulin, VO2 Max..."
                  placeholderTextColor={Colors.textTertiary}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Unit</Text>
                <TextInput
                  style={styles.valueInput}
                  value={customUnit}
                  onChangeText={setCustomUnit}
                  placeholder="e.g. mg/dL, mmol/L, %..."
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Value</Text>
                <TextInput
                  style={styles.valueInput}
                  value={value}
                  onChangeText={setValue}
                  placeholder="Enter value"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional notes..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMarker}>
                <Check size={18} color={Colors.white} />
                <Text style={styles.saveBtnText}>Save (+15 pts)</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showParsedModal} animationType="slide" transparent onRequestClose={() => setShowParsedModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowParsedModal(false)}>
          <View style={styles.parsedModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Lab Results Detected</Text>
            <Text style={styles.parsedSubtitle}>
              {parsedResults.length} markers found
            </Text>

            <View style={styles.testDateRow}>
              <Text style={styles.testDateLabel}>Test Date:</Text>
              <TextInput
                style={styles.testDateInput}
                value={parsedTestDate ?? new Date().toISOString().split('T')[0] ?? ''}
                onChangeText={(text) => setParsedTestDate(text)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="default"
              />
              {parsedTestDate ? (
                <Text style={styles.testDateDetected}>detected</Text>
              ) : (
                <Text style={styles.testDateManual}>edit if needed</Text>
              )}
            </View>

            <ScrollView style={styles.parsedScroll} showsVerticalScrollIndicator={false}>
              {parsedResults.map((r, idx) => (
                <View key={idx} style={styles.parsedRow}>
                  <View style={styles.parsedLeft}>
                    <Text style={styles.parsedName}>{r.name}</Text>
                    <Text style={styles.parsedUnit}>{r.unit}</Text>
                  </View>
                  <Text style={styles.parsedValue}>{r.value}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setParsedResults(prev => prev.filter((_, i) => i !== idx));
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.parsedActions}>
              <TouchableOpacity style={styles.parsedCancelBtn} onPress={() => setShowParsedModal(false)}>
                <Text style={styles.parsedCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.parsedConfirmBtn} onPress={handleConfirmParsedResults}>
                <Check size={16} color={Colors.white} />
                <Text style={styles.parsedConfirmText}>Save All (+{parsedResults.length * 15} pts)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showUploadOptions} animationType="slide" transparent onRequestClose={() => setShowUploadOptions(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowUploadOptions(false)}>
          <View style={styles.uploadOptionsContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Upload Lab Results</Text>
            <Text style={styles.uploadOptionsSub}>Choose how to upload your lab test results</Text>

            <View style={styles.uploadOptionsGrid}>
              <TouchableOpacity style={styles.uploadOptionCard} onPress={handleUploadFromCamera}>
                <View style={[styles.uploadOptionIcon, { backgroundColor: '#E8F5E9' }]}>
                  <CameraIcon size={24} color="#2E7D32" />
                </View>
                <Text style={styles.uploadOptionLabel}>Camera</Text>
                <Text style={styles.uploadOptionHint}>Take a photo of{"\n"}your lab results</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.uploadOptionCard} onPress={handleUploadFromGallery}>
                <View style={[styles.uploadOptionIcon, { backgroundColor: '#E3F2FD' }]}>
                  <ImageIcon size={24} color="#1565C0" />
                </View>
                <Text style={styles.uploadOptionLabel}>Photo Library</Text>
                <Text style={styles.uploadOptionHint}>Pick a screenshot{"\n"}from your camera roll</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.uploadOptionCard} onPress={handleUploadFromFiles}>
                <View style={[styles.uploadOptionIcon, { backgroundColor: '#FFF3E0' }]}>
                  <FolderOpen size={24} color="#E65100" />
                </View>
                <Text style={styles.uploadOptionLabel}>Files / iCloud</Text>
                <Text style={styles.uploadOptionHint}>Browse for PDF{"\n"}or image documents</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4,
  },
  backBtnLight: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 4 },

  pageTitle: { fontSize: 32, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.8 },
  pageSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 18 },

  heroCard: {
    backgroundColor: Colors.primary, borderRadius: 22, padding: 20, marginBottom: 18,
    shadowColor: Colors.primary, shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 4, overflow: 'hidden',
  },
  heroLabel: { color: Colors.white, fontSize: 13, fontWeight: '600' as const, opacity: 0.9 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 },
  heroBig: { color: Colors.white, fontSize: 38, fontWeight: '800' as const, letterSpacing: -1 },
  heroPct: { color: Colors.white, fontSize: 32, fontWeight: '800' as const, opacity: 0.28, letterSpacing: -1 },
  heroBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 4, overflow: 'hidden', marginTop: 10 },
  heroBarFill: { height: 8, backgroundColor: Colors.white, borderRadius: 4 },
  heroMsg: { color: Colors.white, fontSize: 13, fontWeight: '600' as const, marginTop: 12, opacity: 0.95 },
  heroFootnote: { color: Colors.white, fontSize: 11, fontWeight: '500' as const, marginTop: 4, opacity: 0.75 },

  iconTile: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 2, borderColor: Colors.white,
  },
  uploadCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: 18, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: Colors.cardBorder,
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  uploadBtnInfo: { flex: 1 },
  uploadBtnTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  uploadBtnSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  sectionLabel: {
    fontSize: 13, fontWeight: '700' as const, color: Colors.textSecondary,
    textTransform: 'uppercase' as const, letterSpacing: 0.6,
    marginBottom: 10, marginTop: 6, marginLeft: 4,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  categoryScroll: { marginBottom: 14 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: Colors.card, marginRight: 8,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
  },
  categoryText: { fontSize: 13, fontWeight: '700' as const, color: Colors.textSecondary },
  categoryTextActive: { color: Colors.white },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  presetCard: {
    width: '31%' as any, backgroundColor: Colors.card, borderRadius: 16, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.cardBorder,
    shadowColor: '#0F172A', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  presetIcon: { fontSize: 24, marginBottom: 6 },
  presetName: { fontSize: 11, fontWeight: '700' as const, color: Colors.text, textAlign: 'center', lineHeight: 15 },
  presetUnit: { fontSize: 10, color: Colors.textTertiary, marginTop: 3, fontWeight: '500' as const },
  collapsibleGroup: {
    backgroundColor: Colors.card, borderRadius: 18, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.cardBorder, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  collapsibleHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  collapsibleHeaderLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  collapsibleDateText: {
    fontSize: 14, fontWeight: '700' as const, color: Colors.text,
  },
  labSourceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.socialConnectionLight, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6,
  },
  labSourceText: {
    fontSize: 10, fontWeight: '600' as const, color: Colors.socialConnection,
  },
  collapsibleCount: {
    fontSize: 12, color: Colors.textTertiary, fontWeight: '500' as const,
  },
  collapsibleBody: {
    borderTopWidth: 1, borderTopColor: Colors.divider,
    paddingHorizontal: 16, paddingVertical: 4,
  },
  measurementRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10,
  },
  measurementRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider,
  },
  measurementName: {
    fontSize: 14, fontWeight: '500' as const, color: Colors.text, flex: 1,
  },
  measurementNameAbnormal: {
    color: '#E53935',
  },
  measurementValueWrap: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4,
  },
  measurementValue: {
    fontSize: 16, fontWeight: '700' as const, color: Colors.primary,
  },
  measurementValueAbnormal: {
    color: '#E53935',
  },
  measurementUnit: {
    fontSize: 11, color: Colors.textTertiary,
  },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 4, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.divider,
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text, textAlign: 'center', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 6 },
  valueInput: {
    backgroundColor: Colors.inputBg, borderRadius: 12, padding: 14,
    fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.inputBorder,
  },
  notesInput: {
    backgroundColor: Colors.inputBg, borderRadius: 12, padding: 14,
    fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.inputBorder,
    minHeight: 60, textAlignVertical: 'top',
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 14, gap: 8, marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
  parsedModalContent: {
    backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12, maxHeight: '80%',
  },
  parsedSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  parsedScroll: { maxHeight: 400 },
  parsedRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  parsedLeft: { flex: 1 },
  parsedName: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  parsedUnit: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  parsedValue: { fontSize: 18, fontWeight: '800' as const, color: Colors.primary, marginRight: 12 },
  parsedActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  parsedCancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12,
    backgroundColor: Colors.inputBg,
  },
  parsedCancelText: { fontSize: 15, fontWeight: '600' as const, color: Colors.textSecondary },
  parsedConfirmBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.primary, gap: 6,
  },
  parsedConfirmText: { fontSize: 15, fontWeight: '700' as const, color: Colors.white },
  uploadOptionsContent: {
    backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
  },
  uploadOptionsSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' as const, marginBottom: 20 },
  uploadOptionsGrid: { flexDirection: 'row' as const, gap: 12 },
  uploadOptionCard: {
    flex: 1, backgroundColor: Colors.inputBg, borderRadius: 14, padding: 16,
    alignItems: 'center' as const, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  uploadOptionIcon: {
    width: 52, height: 52, borderRadius: 16, alignItems: 'center' as const,
    justifyContent: 'center' as const, marginBottom: 10,
  },
  uploadOptionLabel: { fontSize: 13, fontWeight: '700' as const, color: Colors.text, marginBottom: 4 },
  uploadOptionHint: { fontSize: 10, color: Colors.textTertiary, textAlign: 'center' as const, lineHeight: 14 },
  testDateRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8,
    backgroundColor: '#F5FAF9', borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#E0F2F1',
  },
  testDateLabel: { fontSize: 13, fontWeight: '600' as const, color: Colors.text },
  testDateInput: {
    flex: 1, fontSize: 14, fontWeight: '600' as const, color: Colors.primary,
    backgroundColor: Colors.white, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.inputBorder,
  },
  testDateDetected: { fontSize: 10, color: '#43A047', fontWeight: '600' as const },
  testDateManual: { fontSize: 10, color: Colors.textTertiary, fontWeight: '500' as const },
});
