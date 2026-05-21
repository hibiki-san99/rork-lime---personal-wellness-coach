import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, Modal, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Plus, Check, ChevronDown, ChevronRight, TrendingUp,
  TrendingDown, Calendar,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useUser } from '@/context/UserContext';
import { HealthMarkerEntry } from '@/types';
import { isAbnormal as checkAbnormal, normalizeMarkerName } from '@/constants/healthMarkers';

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
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.collapsibleBody}>
          {entries.map((entry, idx) => {
            const abnormal = checkAbnormal(entry.markerName, entry.value, userSex);
            return (
              <View
                key={entry.id}
                style={[
                  styles.historyRow,
                  idx < entries.length - 1 && styles.historyRowBorder,
                ]}
              >
                <View style={styles.historyLeft}>
                  <Text style={styles.historyValue}>
                    {entry.value} <Text style={styles.historyUnit}>{entry.unit}</Text>
                  </Text>
                  {entry.notes && <Text style={styles.historyNotes}>{entry.notes}</Text>}
                </View>
                {abnormal && (
                  <View style={styles.abnormalBadge}>
                    <Text style={styles.abnormalText}>Abnormal</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function MarkerDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const markerName = (params.name as string) ?? '';
  const markerUnit = (params.unit as string) ?? '';
  const markerIcon = (params.icon as string) ?? '';

  const { healthMarkers, addHealthMarker, profile } = useUser();
  const [showAddModal, setShowAddModal] = useState(false);
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0] ?? '');

  const markerEntries = useMemo(() => {
    const normalizedTarget = normalizeMarkerName(markerName);
    return healthMarkers
      .filter(m => normalizeMarkerName(m.markerName) === normalizedTarget)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [healthMarkers, markerName]);

  const groupedByDate = useMemo(() => {
    const sorted = [...markerEntries].sort((a, b) => b.timestamp - a.timestamp);
    const groups: Record<string, HealthMarkerEntry[]> = {};
    for (const m of sorted) {
      if (!groups[m.date]) groups[m.date] = [];
      groups[m.date]!.push(m);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [markerEntries]);

  const latestEntry = markerEntries.length > 0 ? markerEntries[markerEntries.length - 1] : null;
  const firstEntry = markerEntries.length > 0 ? markerEntries[0] : null;

  const change = useMemo(() => {
    if (!latestEntry || !firstEntry || markerEntries.length < 2) return null;
    const diff = latestEntry.value - firstEntry.value;
    const pct = firstEntry.value > 0 ? ((diff / firstEntry.value) * 100) : 0;
    return { diff, pct, isUp: diff > 0 };
  }, [latestEntry, firstEntry, markerEntries.length]);

  const chartData = useMemo(() => {
    if (markerEntries.length < 2) return null;
    const points = markerEntries.slice(-20);
    const values = points.map(p => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const padding = (maxVal - minVal) * 0.15 || 1;
    return {
      points,
      minVal: minVal - padding,
      maxVal: maxVal + padding,
      range: (maxVal + padding) - (minVal - padding),
    };
  }, [markerEntries]);

  const handleSave = useCallback(() => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      Alert.alert('Invalid Value', 'Please enter a valid number.');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateInput)) {
      Alert.alert('Invalid Date', 'Please enter a date in YYYY-MM-DD format.');
      return;
    }

    const entry: HealthMarkerEntry = {
      id: `hm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date: dateInput,
      markerName,
      value: numValue,
      unit: markerUnit,
      notes: notes.trim() || undefined,
      source: 'manual',
      points: 15,
      timestamp: new Date(dateInput + 'T12:00:00').getTime() || Date.now(),
    };

    const pts = addHealthMarker(entry);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Saved!', `${markerName}: ${numValue} ${markerUnit}\n+${pts} points earned!`);
    setShowAddModal(false);
    setValue('');
    setNotes('');
    setDateInput(new Date().toISOString().split('T')[0] ?? '');
  }, [value, notes, dateInput, markerName, markerUnit, addHealthMarker]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const CHART_HEIGHT = 160;
  const BAR_WIDTH = 28;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headerBg}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ChevronLeft size={22} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{markerIcon} {markerName}</Text>
              <Text style={styles.headerSub}>{markerUnit}</Text>
            </View>
            <View style={{ width: 30 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {latestEntry && (
          <View style={styles.latestCard}>
            <Text style={styles.latestLabel}>Latest Reading</Text>
            <View style={styles.latestRow}>
              <Text style={styles.latestValue}>{latestEntry.value}</Text>
              <Text style={styles.latestUnit}>{latestEntry.unit}</Text>
              {change && (
                <View style={[styles.changeBadge, { backgroundColor: change.isUp ? Colors.physicalActivityLight : Colors.primaryLight }]}>
                  {change.isUp ? (
                    <TrendingUp size={12} color={Colors.error} />
                  ) : (
                    <TrendingDown size={12} color={Colors.primaryDark} />
                  )}
                  <Text style={[styles.changeText, { color: change.isUp ? Colors.error : Colors.primaryDark }]}>
                    {change.isUp ? '+' : ''}{change.pct.toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.latestDate}>{formatDate(latestEntry.date)}</Text>
          </View>
        )}

        {markerEntries.length === 1 && (
          <View style={styles.singleMeasurementCard}>
            <Text style={styles.singleMeasurementText}>
              Log another measurement to see your trend
            </Text>
          </View>
        )}

        {chartData && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Trend</Text>
            <View style={styles.chartContainer}>
              <View style={styles.yAxisLabels}>
                <Text style={styles.yLabel}>{chartData.maxVal.toFixed(1)}</Text>
                <Text style={styles.yLabel}>{((chartData.maxVal + chartData.minVal) / 2).toFixed(1)}</Text>
                <Text style={styles.yLabel}>{chartData.minVal.toFixed(1)}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
                <View style={[styles.chartArea, { height: CHART_HEIGHT }]}>
                  <View style={[styles.gridLine, { top: 0 }]} />
                  <View style={[styles.gridLine, { top: CHART_HEIGHT / 2 }]} />
                  <View style={[styles.gridLine, { top: CHART_HEIGHT - 1 }]} />

                  <View style={styles.barsRow}>
                    {chartData.points.map((entry, idx) => {
                      const normalizedHeight = ((entry.value - chartData.minVal) / chartData.range) * (CHART_HEIGHT - 20);
                      const barHeight = Math.max(normalizedHeight, 4);
                      const abnormal = checkAbnormal(entry.markerName, entry.value, profile?.sex);
                      const isLast = idx === chartData.points.length - 1;
                      return (
                        <View key={entry.id} style={styles.barColumn}>
                          <View style={[styles.barWrapper, { height: CHART_HEIGHT }]}>
                            <View
                              style={[
                                styles.bar,
                                {
                                  height: barHeight,
                                  width: BAR_WIDTH,
                                  backgroundColor: abnormal ? Colors.error : isLast ? Colors.primaryDark : Colors.primary + '60',
                                  borderRadius: 4,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.barDate} numberOfLines={1}>
                            {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </Text>
                          <Text style={styles.barValue}>{entry.value}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.addMeasurementBtn}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.7}
        >
          <Plus size={18} color={Colors.white} />
          <Text style={styles.addMeasurementText}>Add Measurement</Text>
        </TouchableOpacity>

        {groupedByDate.length > 0 && (
          <>
            <Text style={styles.pastTitle}>Past Measurements</Text>
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

        {markerEntries.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{markerIcon || '📊'}</Text>
            <Text style={styles.emptyTitle}>No measurements yet</Text>
            <Text style={styles.emptySub}>
              Tap "Add Measurement" to log your first reading.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{markerIcon} {markerName}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Value ({markerUnit})</Text>
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
                <Text style={styles.inputLabel}>Date</Text>
                <View style={styles.dateInputRow}>
                  <Calendar size={16} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.dateInput}
                    value={dateInput}
                    onChangeText={setDateInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="default"
                  />
                </View>
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

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Check size={18} color={Colors.white} />
                <Text style={styles.saveBtnText}>Save (+15 pts)</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerBg: { backgroundColor: Colors.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  scroll: { padding: 20, paddingBottom: 40 },
  latestCard: {
    backgroundColor: Colors.card, borderRadius: 22, padding: 20, marginBottom: 14,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 2,
  },
  latestLabel: { fontSize: 12, fontWeight: '600' as const, color: Colors.textTertiary, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  latestRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  latestValue: { fontSize: 36, fontWeight: '800' as const, color: Colors.primaryDark, letterSpacing: -0.8 },
  latestUnit: { fontSize: 16, fontWeight: '500' as const, color: Colors.textSecondary },
  changeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginLeft: 8,
  },
  changeText: { fontSize: 12, fontWeight: '700' as const },
  latestDate: { fontSize: 13, color: Colors.textTertiary, marginTop: 6 },
  singleMeasurementCard: {
    backgroundColor: Colors.moodLight, borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.mood + '40',
  },
  singleMeasurementText: { fontSize: 13, color: Colors.mood, fontWeight: '700' as const, textAlign: 'center' },
  chartCard: {
    backgroundColor: Colors.card, borderRadius: 22, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 2,
  },
  chartTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 12 },
  chartContainer: { flexDirection: 'row' },
  yAxisLabels: {
    width: 40, justifyContent: 'space-between', paddingRight: 4, paddingVertical: 2,
  },
  yLabel: { fontSize: 9, color: Colors.textTertiary, textAlign: 'right' },
  chartScroll: { flex: 1 },
  chartArea: {
    position: 'relative', paddingBottom: 0,
  },
  gridLine: {
    position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.divider,
  },
  barsRow: {
    flexDirection: 'row', alignItems: 'flex-end', height: '100%', gap: 6, paddingHorizontal: 4,
  },
  barColumn: { alignItems: 'center' },
  barWrapper: { justifyContent: 'flex-end', alignItems: 'center' },
  bar: {},
  barDate: { fontSize: 9, color: Colors.textTertiary, marginTop: 4, width: 36, textAlign: 'center' },
  barValue: { fontSize: 9, fontWeight: '600' as const, color: Colors.textSecondary, marginTop: 1 },
  addMeasurementBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, gap: 8, marginBottom: 20,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 4,
  },
  addMeasurementText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
  pastTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.text, marginBottom: 12 },
  collapsibleGroup: {
    backgroundColor: Colors.card, borderRadius: 18, marginBottom: 10,
    borderWidth: 1, borderColor: '#F1F3F6', overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 1,
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
  collapsibleBody: {
    borderTopWidth: 1, borderTopColor: Colors.divider,
    paddingHorizontal: 16, paddingVertical: 4,
  },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10,
  },
  historyRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider,
  },
  historyLeft: { flex: 1 },
  historyValue: { fontSize: 16, fontWeight: '700' as const, color: Colors.primaryDark },
  historyUnit: { fontSize: 12, fontWeight: '500' as const, color: Colors.textTertiary },
  historyNotes: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  abnormalBadge: {
    backgroundColor: Colors.physicalActivityLight, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  abnormalText: { fontSize: 11, fontWeight: '700' as const, color: Colors.error },
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
  dateInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: Colors.inputBorder,
  },
  dateInput: {
    flex: 1, fontSize: 16, color: Colors.text, paddingVertical: 14,
  },
  notesInput: {
    backgroundColor: Colors.inputBg, borderRadius: 12, padding: 14,
    fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.inputBorder,
    minHeight: 60, textAlignVertical: 'top',
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 14, gap: 8, marginTop: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 3,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
});
