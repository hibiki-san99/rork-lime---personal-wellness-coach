import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Download, Users, Activity, Moon, BookOpen, Footprints, ShieldCheck, ShieldOff, KeyRound, Check, ChevronDown, FileText, FileJson, Utensils, Heart, Award, Star, ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { resilientFetch, wakeBackend } from '@/utils/resilientFetch';
import {
  buildMultiExport, downloadExport, DATA_TYPE_ICONS, DATA_TYPE_TITLES,
  type ExportDataType, type ExportFormat, type TimeRangePreset,
  type ParticipantFilter, type TimeRange,
} from '@/utils/exportBuilder';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
  hasSynced: boolean;
  syncData: Record<string, unknown> | null;
}

export default function AdminScreen() {
  const router = useRouter();
  const { token, user: authUser, isLoading: authLoading, refreshToken } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || '';
  const tokenRef = React.useRef<string | null>(token);
  const hasInitialized = React.useRef(false);
  const refreshTokenRef = React.useRef(refreshToken);

  React.useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  React.useEffect(() => {
    refreshTokenRef.current = refreshToken;
  }, [refreshToken]);



  const getActiveToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    if (!forceRefresh) {
      const current = tokenRef.current;
      if (current) return current;
    }
    console.log('[Admin] Getting fresh token via refresh...');
    const newToken = await refreshTokenRef.current();
    if (newToken) {
      tokenRef.current = newToken;
    }
    return newToken;
  }, []);

  const doWakeBackend = useCallback(async (): Promise<boolean> => {
    return wakeBackend(baseUrl);
  }, [baseUrl]);

  const fetchWithToken = useCallback(async (url: string, activeToken: string): Promise<Response> => {
    console.log('[Admin] Fetching:', url, 'token length:', activeToken.length, 'token prefix:', activeToken.slice(0, 8));
    const res = await resilientFetch(url, {
      headers: { 'Authorization': `Bearer ${activeToken}` },
    });

    console.log('[Admin] Response status:', res.status);

    if (res.status === 401) {
      console.log('[Admin] 401 received, attempting token renewal...');
      const newToken = await refreshTokenRef.current();
      if (newToken) {
        tokenRef.current = newToken;
        console.log('[Admin] Token renewed, retrying with new token prefix:', newToken.slice(0, 8));
        return resilientFetch(url, {
          headers: { 'Authorization': `Bearer ${newToken}` },
        });
      } else {
        console.log('[Admin] Token renewal returned null');
      }
    }

    return res;
  }, []);

  const fetchUsers = useCallback(async (retryCount = 0) => {
    setErrorMsg(null);

    const forceRefresh = retryCount > 0;
    const activeToken = await getActiveToken(forceRefresh);

    if (!activeToken) {
      console.log('[Admin] No token available after refresh attempt');
      const newToken = await refreshTokenRef.current();
      if (newToken) {
        tokenRef.current = newToken;
        console.log('[Admin] Got token via renewal fallback');
        return fetchUsers(retryCount);
      }
      setErrorMsg('No auth token available. Please sign out and sign back in.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      console.log('[Admin] Fetching users with token length:', activeToken.length, 'prefix:', activeToken.slice(0, 8));
      const res = await fetchWithToken(`${baseUrl}/api/admin/users`, activeToken);

      if (res.status === 401) {
        const errBody = await res.text();
        console.log('[Admin] 401 body:', errBody);
        if (retryCount < 2) {
          console.log(`[Admin] 401 received, force-refreshing token (attempt ${retryCount + 1})...`);
          await doWakeBackend();
          await new Promise(r => setTimeout(r, 1500));
          return fetchUsers(retryCount + 1);
        }
        setErrorMsg(`Auth failed (401).\n\nServer response: ${errBody}\n\nPlease sign out and sign back in.`);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (res.status === 403) {
        const errBody = await res.text();
        console.log('[Admin] 403 body:', errBody);
        setErrorMsg(`Access denied (403).\n\nServer response: ${errBody}\n\nYour account may not have admin privileges.`);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!res.ok) {
        const errBody = await res.text();
        console.log('[Admin] Error response:', res.status, errBody);
        throw new Error(`Server returned ${res.status}: ${errBody}`);
      }
      const data = await res.json() as { users: AdminUser[] };
      setUsers(data.users || []);
      setErrorMsg(null);
      console.log('[Admin] Loaded', data.users?.length, 'users successfully');
    } catch (err) {
      console.log('[Admin] Fetch error:', err);

      if (retryCount < 2) {
        console.log(`[Admin] Retrying (attempt ${retryCount + 1})...`);
        await doWakeBackend();
        await new Promise(r => setTimeout(r, 2000));
        return fetchUsers(retryCount + 1);
      }

      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(`Could not load participant data.\n\nError: ${msg}\n\nThe backend may need a moment to start up. Pull down to retry.`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [baseUrl, getActiveToken, doWakeBackend, fetchWithToken]);

  React.useEffect(() => {
    if (authLoading) {
      console.log('[Admin] Auth still loading, waiting...');
      return;
    }
    if (!authUser?.isAdmin) {
      Alert.alert('Access Denied', 'You do not have admin privileges.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }
    if (hasInitialized.current) {
      console.log('[Admin] Already initialized, skipping');
      return;
    }
    hasInitialized.current = true;
    const init = async () => {
      console.log('[Admin] Starting init, token available:', !!tokenRef.current, 'prefix:', tokenRef.current?.slice(0, 8));
      console.log('[Admin] User:', authUser?.email, 'isAdmin:', authUser?.isAdmin);
      await doWakeBackend();
      await new Promise(r => setTimeout(r, 800));
      console.log('[Admin] Pre-refreshing token before first load...');
      const freshToken = await refreshTokenRef.current();
      if (freshToken) {
        tokenRef.current = freshToken;
        console.log('[Admin] Got fresh token for init, prefix:', freshToken.slice(0, 8));
      } else {
        console.log('[Admin] Token refresh returned null, using existing token');
      }
      void fetchUsers();
    };
    void init();
  }, [authUser?.isAdmin, authUser?.email, authLoading, router, doWakeBackend, fetchUsers]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log('[Admin] Refresh triggered, forcing token refresh first...');
    const newToken = await refreshToken();
    if (newToken) {
      tokenRef.current = newToken;
      console.log('[Admin] Token refreshed on retry');
    } else {
      console.log('[Admin] Token refresh failed, trying with existing token...');
    }
    void fetchUsers();
  }, [fetchUsers, refreshToken]);

  const handlePromoteToggle = useCallback(async (userId: string, currentAdmin: boolean) => {
    if (userId === authUser?.id) {
      Alert.alert('Cannot Change', 'You cannot change your own admin status.');
      return;
    }
    const action = currentAdmin ? 'remove admin from' : 'promote';
    Alert.alert(
      `${currentAdmin ? 'Remove Admin' : 'Promote to Admin'}`,
      `Are you sure you want to ${action} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setPromoting(userId);
            try {
              const activeToken = await getActiveToken();
              if (!activeToken) throw new Error('No valid session');
              const res = await fetch(`${baseUrl}/api/admin/promote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeToken}` },
                body: JSON.stringify({ userId, isAdmin: !currentAdmin }),
              });
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error((errData as Record<string, string>).error || 'Failed');
              }
              setUsers(prev => prev.map(u => u.id === userId ? { ...u, isAdmin: !currentAdmin } : u));
              Alert.alert('Success', `User has been ${currentAdmin ? 'demoted' : 'promoted'}.`);
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Unknown error';
              Alert.alert('Error', msg);
            } finally {
              setPromoting(null);
            }
          },
        },
      ]
    );
  }, [baseUrl, getActiveToken, authUser?.id]);

  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportDataTypes, setExportDataTypes] = useState<ExportDataType[]>(['meals']);
  const [exportTimeRange, setExportTimeRange] = useState<TimeRangePreset>('30d');
  const [exportCustomFrom, setExportCustomFrom] = useState<string>('');
  const [exportCustomTo, setExportCustomTo] = useState<string>('');
  const [exportParticipantMode, setExportParticipantMode] = useState<'all' | 'team' | 'individual'>('all');
  const [exportTeamName, setExportTeamName] = useState<string>('');
  const [exportUserId, setExportUserId] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [showTeamPicker, setShowTeamPicker] = useState<boolean>(false);
  const [showParticipantPicker, setShowParticipantPicker] = useState<boolean>(false);
  const [participantSearch, setParticipantSearch] = useState<string>('');

  const teamNames = useMemo(() => {
    const set = new Set<string>();
    for (const u of users) {
      const team = (u.syncData as Record<string, unknown> | null)?.profile as Record<string, unknown> | undefined;
      const name = team?.teamName as string | undefined;
      if (name && name.trim()) set.add(name);
    }
    return Array.from(set).sort();
  }, [users]);

  const filteredParticipants = useMemo(() => {
    const q = participantSearch.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, participantSearch]);

  const openExportModal = useCallback(() => {
    setExportDataTypes(['meals']);
    setExportTimeRange('30d');
    setExportCustomFrom('');
    setExportCustomTo('');
    setExportParticipantMode('all');
    setExportTeamName('');
    setExportUserId('');
    setExportFormat('csv');
    setShowExportModal(true);
  }, []);

  const handleDownloadExport = useCallback(async () => {
    setExporting(true);
    try {
      const timeRange: TimeRange = {
        preset: exportTimeRange,
        fromDate: exportCustomFrom || undefined,
        toDate: exportCustomTo || undefined,
      };
      if (exportTimeRange === 'custom' && (!exportCustomFrom || !exportCustomTo)) {
        Alert.alert('Missing dates', 'Please enter both a from and to date (YYYY-MM-DD) for a custom range.');
        setExporting(false);
        return;
      }
      const participants: ParticipantFilter = {
        mode: exportParticipantMode,
        teamName: exportParticipantMode === 'team' ? exportTeamName : undefined,
        userId: exportParticipantMode === 'individual' ? exportUserId : undefined,
      };
      if (exportParticipantMode === 'team' && !exportTeamName) {
        Alert.alert('Pick a team', 'Please select a team to export.');
        setExporting(false);
        return;
      }
      if (exportParticipantMode === 'individual' && !exportUserId) {
        Alert.alert('Pick a participant', 'Please select a participant to export.');
        setExporting(false);
        return;
      }

      if (exportDataTypes.length === 0) {
        Alert.alert('No categories selected', 'Please select at least one data category.');
        setExporting(false);
        return;
      }

      const result = buildMultiExport({
        dataTypes: exportDataTypes,
        timeRange,
        participants,
        format: exportFormat,
        users,
      });

      if (result.totalRows === 0) {
        Alert.alert(
          'No data found',
          'No data found for the selected filters. Try adjusting the date range or participant selection.'
        );
        setExporting(false);
        return;
      }

      await downloadExport(result);
      setShowExportModal(false);
    } catch (err) {
      console.log('[Admin] Download export error:', err);
      Alert.alert('Error', 'Could not generate export. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [exportDataTypes, exportTimeRange, exportCustomFrom, exportCustomTo, exportParticipantMode, exportTeamName, exportUserId, exportFormat, users]);

  const [showResetPwdModal, setShowResetPwdModal] = useState(false);
  const [resetPwdUserId, setResetPwdUserId] = useState<string>('');
  const [resetPwdUserName, setResetPwdUserName] = useState<string>('');
  const [resetPwdValue, setResetPwdValue] = useState<string>('');

  const handleResetUserPassword = useCallback((userId: string, userName: string) => {
    setResetPwdUserId(userId);
    setResetPwdUserName(userName);
    setResetPwdValue('');
    setShowResetPwdModal(true);
  }, []);

  const handleConfirmResetPassword = useCallback(async () => {
    if (!resetPwdValue || resetPwdValue.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setResettingPassword(resetPwdUserId);
    setShowResetPwdModal(false);
    try {
      const activeToken = await getActiveToken();
      if (!activeToken) throw new Error('No valid session');
      const res = await fetch(`${baseUrl}/api/admin/reset-user-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeToken}` },
        body: JSON.stringify({ userId: resetPwdUserId, newPassword: resetPwdValue }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as Record<string, string>).error || 'Failed');
      }
      Alert.alert('Success', `Password has been reset for ${resetPwdUserName}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Error', msg);
    } finally {
      setResettingPassword(null);
    }
  }, [resetPwdUserId, resetPwdUserName, resetPwdValue, baseUrl, getActiveToken]);

  const syncedCount = useMemo(() => users.filter(u => u.hasSynced).length, [users]);
  const totalMeals = useMemo(() =>
    users.reduce((sum, u) => sum + ((u.syncData as any)?.mealLogs?.length || 0), 0),
  [users]);
  const totalActivities = useMemo(() =>
    users.reduce((sum, u) => sum + ((u.syncData as any)?.activityLogs?.length || 0), 0),
  [users]);
  const totalSleep = useMemo(() =>
    users.reduce((sum, u) => sum + ((u.syncData as any)?.sleepLogs?.length || 0), 0),
  [users]);
  const totalJournals = useMemo(() =>
    users.reduce((sum, u) => sum + ((u.syncData as any)?.journalLogs?.length || 0), 0),
  [users]);

  if (authLoading || (!authUser?.isAdmin && !errorMsg)) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.socialConnection} />
          <Text style={styles.loadingText}>{authLoading ? 'Loading session...' : 'Checking access...'}</Text>
        </View>
      </View>
    );
  }

  const totalPoints = useMemo(() =>
    users.reduce((sum, u) => sum + ((u.syncData as any)?.totalPoints || 0), 0),
  [users]);
  const totalBadges = useMemo(() =>
    users.reduce((sum, u) => {
      const badges = (u.syncData as any)?.badges as Array<{ earned: boolean }> | undefined;
      return sum + (badges?.filter(b => b.earned)?.length || 0);
    }, 0),
  [users]);
  const heartAgeCount = useMemo(() =>
    users.filter(u => (u.syncData as any)?.heartAgeResult).length,
  [users]);
  const syncPct = users.length > 0 ? Math.round((syncedCount / users.length) * 100) : 0;
  const syncMsg = useMemo(() => {
    if (users.length === 0) return 'Waiting for participants to register';
    if (syncedCount === 0) return 'No data synced yet — share the app with your cohort';
    if (syncPct < 25) return 'Early data coming in — keep nudging participants';
    if (syncPct < 60) return 'Good momentum — over a quarter actively logging';
    if (syncPct < 90) return 'Strong engagement across the cohort';
    return 'Excellent — your study is fully engaged';
  }, [users.length, syncedCount, syncPct]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {loading ? (
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.topBarBtn}>
              <ArrowLeft size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading participants...</Text>
          </View>
        </SafeAreaView>
      ) : errorMsg ? (
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.topBarBtn}>
              <ArrowLeft size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.errorContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          >
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorTitle}>Connection Issue</Text>
            <Text style={styles.errorDesc}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      ) : (
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          >
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.back()} style={styles.topBarBtn}>
                <ArrowLeft size={22} color={Colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={openExportModal} style={styles.exportPill} disabled={loading}>
                <Download size={14} color={Colors.white} />
                <Text style={styles.exportPillText}>Export</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.pageTitle}>Research Dashboard</Text>
            <Text style={styles.pageSub}>{users.length} participant{users.length === 1 ? '' : 's'} · live cohort overview</Text>

            {/* Hero card — green */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Active participation</Text>
              <View style={styles.heroRow}>
                <Text style={styles.heroBig}>{syncedCount}<Text style={styles.heroBigSlash}>/{users.length}</Text></Text>
                <Text style={styles.heroPct}>{syncPct}%</Text>
              </View>
              <View style={styles.heroBarBg}>
                <View style={[styles.heroBarFill, { width: `${syncPct}%` as any }]} />
              </View>
              <Text style={styles.heroMsg}>{syncMsg}</Text>
            </View>

            {/* Stat grid — white 3D cards */}
            <Text style={styles.sectionTitle}>Cohort Activity</Text>
            <View style={styles.statGrid}>
              <StatTile color={Colors.nutrition} icon={<Utensils size={18} color={Colors.white} />} value={totalMeals} label="Meals logged" />
              <StatTile color={Colors.physicalActivity} icon={<Footprints size={18} color={Colors.white} />} value={totalActivities} label="Activities" />
              <StatTile color={Colors.sleep} icon={<Moon size={18} color={Colors.white} />} value={totalSleep} label="Sleep logs" />
              <StatTile color={Colors.stressManagement} icon={<BookOpen size={18} color={Colors.white} />} value={totalJournals} label="Journals" />
              <StatTile color={Colors.mood} icon={<Star size={18} color={Colors.white} />} value={totalPoints} label="Total points" />
              <StatTile color={Colors.riskySubstances} icon={<Heart size={18} color={Colors.white} />} value={heartAgeCount} label="Heart ages" />
              <StatTile color={Colors.socialConnection} icon={<Award size={18} color={Colors.white} />} value={totalBadges} label="Badges earned" />
              <StatTile color={Colors.primaryDark} icon={<Users size={18} color={Colors.white} />} value={syncedCount} label="Synced users" />
            </View>

            <Text style={styles.sectionTitle}>Participants</Text>

            {users.map(u => {
              const sd = u.syncData as Record<string, unknown> | null;
              return (
                <View key={u.id} style={styles.userCard}>
                  <View style={styles.userCardHeader}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{u.name}</Text>
                      <Text style={styles.userEmail}>{u.email}</Text>
                    </View>
                    {u.isAdmin && (
                      <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>Admin</Text>
                      </View>
                    )}
                  </View>
                {u.hasSynced && sd ? (
                  <>
                    <View style={styles.userStats}>
                      <View style={styles.userStatItem}>
                        <Text style={[styles.userStatValue, { color: Colors.nutrition }]}>
                          {(sd.mealLogs as unknown[])?.length || 0}
                        </Text>
                        <Text style={styles.userStatLabel}>Meals</Text>
                      </View>
                      <View style={styles.userStatItem}>
                        <Text style={[styles.userStatValue, { color: Colors.physicalActivity }]}>
                          {(sd.activityLogs as unknown[])?.length || 0}
                        </Text>
                        <Text style={styles.userStatLabel}>Activities</Text>
                      </View>
                      <View style={styles.userStatItem}>
                        <Text style={[styles.userStatValue, { color: Colors.sleep }]}>
                          {(sd.sleepLogs as unknown[])?.length || 0}
                        </Text>
                        <Text style={styles.userStatLabel}>Sleep</Text>
                      </View>
                      <View style={styles.userStatItem}>
                        <Text style={[styles.userStatValue, { color: Colors.stressManagement }]}>
                          {(sd.journalLogs as unknown[])?.length || 0}
                        </Text>
                        <Text style={styles.userStatLabel}>Journals</Text>
                      </View>
                    </View>
                    <View style={styles.userStatsRow2}>
                      <View style={styles.userStatItem}>
                        <Text style={[styles.userStatValue, { color: Colors.physicalActivity }]}>
                          {(sd.totalPoints as number) || 0}
                        </Text>
                        <Text style={styles.userStatLabel}>Points</Text>
                      </View>
                      <View style={styles.userStatItem}>
                        <Text style={[styles.userStatValue, { color: Colors.riskySubstances }]}>
                          {(sd.heartAgeResult as any)?.heartAge ?? '—'}
                        </Text>
                        <Text style={styles.userStatLabel}>Heart Age</Text>
                      </View>
                      <View style={styles.userStatItem}>
                        <Text style={[styles.userStatValue, { color: Colors.socialConnection }]}>
                          {((sd.profile as any)?.teamName as string)?.slice(0, 8) ?? '—'}
                        </Text>
                        <Text style={styles.userStatLabel}>Team</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <Text style={styles.noDataText}>No data synced yet</Text>
                )}

                <View style={styles.userActionRow}>
                  {u.id !== authUser?.id && (
                    <TouchableOpacity
                      style={[styles.promoteBtn, u.isAdmin && styles.demoteBtn, { flex: 1 }]}
                      onPress={() => void handlePromoteToggle(u.id, u.isAdmin)}
                      disabled={promoting === u.id}
                    >
                      {promoting === u.id ? (
                        <ActivityIndicator size="small" color={u.isAdmin ? Colors.riskySubstances : Colors.socialConnection} />
                      ) : u.isAdmin ? (
                        <>
                          <ShieldOff size={14} color={Colors.riskySubstances} />
                          <Text style={styles.demoteBtnText}>Remove Admin</Text>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={14} color={Colors.socialConnection} />
                          <Text style={styles.promoteBtnText}>Make Admin</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.resetPwdBtn}
                    onPress={() => handleResetUserPassword(u.id, u.name)}
                    disabled={resettingPassword === u.id}
                  >
                    {resettingPassword === u.id ? (
                      <ActivityIndicator size="small" color={Colors.stressManagement} />
                    ) : (
                      <>
                        <KeyRound size={14} color={Colors.stressManagement} />
                        <Text style={styles.resetPwdBtnText}>Reset Pwd</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

            {users.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📊</Text>
                <Text style={styles.emptyTitle}>No participants yet</Text>
                <Text style={styles.emptySub}>Users will appear here after they register and sync data</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      )}
      <ExportBuilderModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        exporting={exporting}
        dataTypes={exportDataTypes}
        setDataTypes={setExportDataTypes}
        timeRange={exportTimeRange}
        setTimeRange={setExportTimeRange}
        customFrom={exportCustomFrom}
        setCustomFrom={setExportCustomFrom}
        customTo={exportCustomTo}
        setCustomTo={setExportCustomTo}
        participantMode={exportParticipantMode}
        setParticipantMode={setExportParticipantMode}
        teamName={exportTeamName}
        setTeamName={setExportTeamName}
        userId={exportUserId}
        setUserId={setExportUserId}
        format={exportFormat}
        setFormat={setExportFormat}
        teamNames={teamNames}
        users={users}
        filteredParticipants={filteredParticipants}
        participantSearch={participantSearch}
        setParticipantSearch={setParticipantSearch}
        showTeamPicker={showTeamPicker}
        setShowTeamPicker={setShowTeamPicker}
        showParticipantPicker={showParticipantPicker}
        setShowParticipantPicker={setShowParticipantPicker}
        onDownload={() => void handleDownloadExport()}
      />
      <Modal visible={showResetPwdModal} animationType="slide" transparent onRequestClose={() => setShowResetPwdModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.resetModalOverlay} activeOpacity={1} onPress={() => setShowResetPwdModal(false)}>
            <View style={styles.resetModalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.resetModalHandle} />
              <Text style={styles.resetModalTitle}>Reset Password</Text>
              <Text style={styles.resetModalSub}>Set a new password for {resetPwdUserName}</Text>
              <TextInput
                style={styles.resetModalInput}
                value={resetPwdValue}
                onChangeText={setResetPwdValue}
                placeholder="New password (min 6 chars)"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry
                autoFocus
              />
              <View style={styles.resetModalActions}>
                <TouchableOpacity style={styles.resetModalCancel} onPress={() => setShowResetPwdModal(false)}>
                  <Text style={styles.resetModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.resetModalConfirm} onPress={() => void handleConfirmResetPassword()}>
                  <KeyRound size={16} color={Colors.white} />
                  <Text style={styles.resetModalConfirmText}>Reset Password</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

interface StatTileProps {
  color: string;
  icon: React.ReactNode;
  value: number;
  label: string;
}

function StatTile({ color, icon, value, label }: StatTileProps) {
  return (
    <View style={styles.statTileCard}>
      <View style={[styles.statTileIcon, { backgroundColor: color, shadowColor: color }]}>
        {icon}
      </View>
      <Text style={styles.statTileValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statTileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  topBarBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.card, alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 1, borderColor: Colors.cardBorder,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  exportPill: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6,
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 3,
  },
  exportPillText: { fontSize: 13, fontWeight: '700' as const, color: Colors.white, letterSpacing: -0.2 },
  pageTitle: { fontSize: 32, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.8, paddingHorizontal: 20, marginTop: 4 },
  pageSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 20, paddingHorizontal: 20 },

  heroCard: {
    marginHorizontal: 20,
    borderRadius: 22, padding: 20, marginBottom: 22,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary, shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: 'hidden' as const,
  },
  heroLabel: { color: Colors.white, fontSize: 13, fontWeight: '600' as const, opacity: 0.9 },
  heroRow: { flexDirection: 'row' as const, alignItems: 'flex-end' as const, justifyContent: 'space-between' as const, marginTop: 4 },
  heroBig: { color: Colors.white, fontSize: 40, fontWeight: '800' as const, letterSpacing: -1 },
  heroBigSlash: { fontSize: 22, fontWeight: '700' as const, opacity: 0.7 },
  heroPct: { color: Colors.white, fontSize: 26, fontWeight: '800' as const, opacity: 0.55, letterSpacing: -0.6 },
  heroBarBg: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 4, overflow: 'hidden' as const,
    marginTop: 12,
  },
  heroBarFill: { height: 8, backgroundColor: Colors.white, borderRadius: 4 },
  heroMsg: { color: Colors.white, fontSize: 13, fontWeight: '600' as const, marginTop: 12, opacity: 0.95 },

  statGrid: {
    flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 10,
    paddingHorizontal: 20, marginBottom: 12,
  },
  statTileCard: {
    width: '47.5%' as const,
    backgroundColor: Colors.card, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  statTileIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 2, borderColor: Colors.white,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
    marginBottom: 10,
  },
  statTileValue: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.5 },
  statTileLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontWeight: '600' as const },

  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { fontSize: 14, color: Colors.textSecondary },
  errorContainer: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  errorEmoji: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text, marginBottom: 8 },
  errorDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  retryBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 12,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 3,
  },
  retryBtnText: { fontSize: 15, fontWeight: '700' as const, color: Colors.white, letterSpacing: -0.2 },
  scroll: { paddingBottom: 40 },
  sectionTitle: {
    fontSize: 18, fontWeight: '700' as const, color: Colors.text,
    marginBottom: 14, marginTop: 12, paddingHorizontal: 20, letterSpacing: -0.3,
  },
  userCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card, borderRadius: 18, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  userCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
    borderWidth: 2, borderColor: Colors.white,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  userAvatarText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  userEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  adminBadge: {
    backgroundColor: Colors.primaryDark, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
  },
  adminBadgeText: { fontSize: 11, fontWeight: '700' as const, color: Colors.white, letterSpacing: 0.2 },
  userStats: { flexDirection: 'row', gap: 8 },
  userStatsRow2: { flexDirection: 'row', gap: 8, marginTop: 8 },
  userStatItem: {
    flex: 1, alignItems: 'center', backgroundColor: Colors.inputBg,
    borderRadius: 10, paddingVertical: 10,
  },
  userStatValue: { fontSize: 16, fontWeight: '800' as const },
  userStatLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  noDataText: {
    fontSize: 13, color: Colors.textTertiary, fontStyle: 'italic' as const,
    textAlign: 'center',
  },
  promoteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 12, paddingVertical: 11, borderRadius: 12,
    backgroundColor: Colors.primaryLight, borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  promoteBtnText: { fontSize: 13, fontWeight: '700' as const, color: Colors.primaryDark },
  demoteBtn: {
    backgroundColor: Colors.riskySubstancesLight,
    borderColor: Colors.riskySubstances + '30',
  },
  demoteBtnText: { fontSize: 13, fontWeight: '600' as const, color: Colors.riskySubstances },
  userActionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  resetPwdBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: Colors.stressManagementLight, borderWidth: 1,
    borderColor: Colors.stressManagement + '30',
  },
  resetPwdBtnText: { fontSize: 13, fontWeight: '600' as const, color: Colors.stressManagement },
  resetModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  resetModalContent: {
    backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
  },
  resetModalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.divider,
    alignSelf: 'center', marginBottom: 16,
  },
  resetModalTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text, textAlign: 'center', marginBottom: 4 },
  resetModalSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  resetModalInput: {
    backgroundColor: Colors.inputBg, borderRadius: 12, padding: 14,
    fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.inputBorder, marginBottom: 16,
  },
  resetModalActions: { flexDirection: 'row', gap: 12 },
  resetModalCancel: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12,
    backgroundColor: Colors.inputBg,
  },
  resetModalCancelText: { fontSize: 15, fontWeight: '600' as const, color: Colors.textSecondary },
  resetModalConfirm: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.stressManagement, gap: 6,
  },
  resetModalConfirmText: { fontSize: 15, fontWeight: '700' as const, color: Colors.white },
  emptyState: {
    alignItems: 'center', paddingVertical: 40,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  exportModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  exportModalContent: {
    backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  exportModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  exportModalTitle: { fontSize: 19, fontWeight: '700' as const, color: Colors.text },
  exportModalClose: { padding: 4 },
  stepLabel: {
    fontSize: 11, fontWeight: '700' as const, color: Colors.socialConnection,
    letterSpacing: 0.8, marginBottom: 8,
  },
  stepTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, marginBottom: 12 },
  stepSection: { paddingHorizontal: 20, paddingTop: 20 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: Colors.card, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.cardBorder, marginBottom: 8,
    gap: 12,
  },
  optionCardActive: {
    borderColor: Colors.socialConnection,
    backgroundColor: Colors.socialConnectionLight,
  },
  optionEmoji: { fontSize: 22 },
  optionLabel: { flex: 1, fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  optionLabelActive: { color: Colors.socialConnection },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: Colors.divider, alignItems: 'center', justifyContent: 'center',
  },
  checkCircleActive: {
    borderColor: Colors.socialConnection, backgroundColor: Colors.socialConnection,
  },
  checkSquare: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: Colors.divider, alignItems: 'center', justifyContent: 'center',
  },
  checkSquareActive: {
    borderColor: Colors.socialConnection, backgroundColor: Colors.socialConnection,
  },
  bulkRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  bulkCountText: { fontSize: 12, fontWeight: '600' as const, color: Colors.socialConnection },
  bulkBtns: { flexDirection: 'row', gap: 8 },
  bulkBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: Colors.socialConnectionLight, borderWidth: 1,
    borderColor: Colors.socialConnection + '40',
  },
  bulkBtnText: { fontSize: 12, fontWeight: '600' as const, color: Colors.socialConnection },
  rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  rangeChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.cardBorder,
  },
  rangeChipActive: {
    backgroundColor: Colors.socialConnectionLight,
    borderColor: Colors.socialConnection,
  },
  rangeChipText: { fontSize: 13, fontWeight: '600' as const, color: Colors.text },
  rangeChipTextActive: { color: Colors.socialConnection },
  customDateRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  dateInput: {
    flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
    fontSize: 13, color: Colors.text,
  },
  dateLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4, fontWeight: '600' as const },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.cardBorder,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginTop: 8,
  },
  pickerBtnText: { fontSize: 14, color: Colors.text, fontWeight: '600' as const, flex: 1 },
  pickerBtnPlaceholder: { color: Colors.textTertiary, fontWeight: '500' as const },
  formatRow: { flexDirection: 'row', gap: 10 },
  formatCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 12,
    backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.cardBorder,
  },
  formatCardActive: {
    borderColor: Colors.socialConnection, backgroundColor: Colors.socialConnectionLight,
  },
  formatText: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  formatTextActive: { color: Colors.socialConnection },
  downloadBtn: {
    margin: 20, marginTop: 24, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14,
    backgroundColor: Colors.socialConnection,
  },
  downloadBtnDisabled: { opacity: 0.6 },
  downloadBtnText: { fontSize: 15, fontWeight: '700' as const, color: Colors.white },
  pickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: Colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%', paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  pickerTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.text },
  pickerItem: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerItemText: { fontSize: 15, color: Colors.text, fontWeight: '500' as const },
  pickerItemSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  pickerSearch: {
    margin: 16, backgroundColor: Colors.card, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  emptyPicker: { padding: 30, alignItems: 'center' },
  emptyPickerText: { fontSize: 14, color: Colors.textSecondary },
});

interface ExportBuilderModalProps {
  visible: boolean;
  onClose: () => void;
  exporting: boolean;
  dataTypes: ExportDataType[];
  setDataTypes: (v: ExportDataType[]) => void;
  timeRange: TimeRangePreset;
  setTimeRange: (v: TimeRangePreset) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
  participantMode: 'all' | 'team' | 'individual';
  setParticipantMode: (v: 'all' | 'team' | 'individual') => void;
  teamName: string;
  setTeamName: (v: string) => void;
  userId: string;
  setUserId: (v: string) => void;
  format: ExportFormat;
  setFormat: (v: ExportFormat) => void;
  teamNames: string[];
  users: AdminUser[];
  filteredParticipants: AdminUser[];
  participantSearch: string;
  setParticipantSearch: (v: string) => void;
  showTeamPicker: boolean;
  setShowTeamPicker: (v: boolean) => void;
  showParticipantPicker: boolean;
  setShowParticipantPicker: (v: boolean) => void;
  onDownload: () => void;
}

const DATA_TYPES: ExportDataType[] = ['profiles', 'meals', 'steps', 'activities', 'sleep', 'journal', 'markers', 'points', 'missions'];
const RANGE_OPTIONS: { id: TimeRangePreset; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '3m', label: 'Last 3 months' },
  { id: 'custom', label: 'Custom range' },
  { id: 'all', label: 'All time' },
];

function ExportBuilderModal(props: ExportBuilderModalProps) {
  const {
    visible, onClose, exporting,
    dataTypes, setDataTypes,
    timeRange, setTimeRange,
    customFrom, setCustomFrom, customTo, setCustomTo,
    participantMode, setParticipantMode,
    teamName, setTeamName,
    userId, setUserId,
    format, setFormat,
    teamNames, users, filteredParticipants,
    participantSearch, setParticipantSearch,
    showTeamPicker, setShowTeamPicker,
    showParticipantPicker, setShowParticipantPicker,
    onDownload,
  } = props;

  const selectedUser = users.find(u => u.id === userId);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.exportModalOverlay}>
        <View style={styles.exportModalContent}>
          <View style={styles.exportModalHeader}>
            <Text style={styles.exportModalTitle}>Build Export</Text>
            <TouchableOpacity onPress={onClose} style={styles.exportModalClose} testID="close-export-modal">
              <X size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.stepSection}>
              <Text style={styles.stepLabel}>STEP 1</Text>
              <Text style={styles.stepTitle}>Choose data categories</Text>
              <View style={styles.bulkRow}>
                <Text style={styles.bulkCountText}>{dataTypes.length} selected</Text>
                <View style={styles.bulkBtns}>
                  <TouchableOpacity
                    style={styles.bulkBtn}
                    onPress={() => setDataTypes(DATA_TYPES.slice())}
                    testID="select-all-categories"
                  >
                    <Text style={styles.bulkBtnText}>Select All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bulkBtn}
                    onPress={() => setDataTypes([])}
                    testID="clear-all-categories"
                  >
                    <Text style={styles.bulkBtnText}>Clear All</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {DATA_TYPES.map(dt => {
                const active = dataTypes.includes(dt);
                const toggle = () => {
                  if (active) {
                    setDataTypes(dataTypes.filter(x => x !== dt));
                  } else {
                    setDataTypes([...dataTypes, dt]);
                  }
                };
                return (
                  <TouchableOpacity
                    key={dt}
                    style={[styles.optionCard, active && styles.optionCardActive]}
                    onPress={toggle}
                    testID={`data-type-${dt}`}
                  >
                    <Text style={styles.optionEmoji}>{DATA_TYPE_ICONS[dt]}</Text>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                      {DATA_TYPE_TITLES[dt]}
                    </Text>
                    <View style={[styles.checkSquare, active && styles.checkSquareActive]}>
                      {active && <Check size={14} color={Colors.white} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.stepSection}>
              <Text style={styles.stepLabel}>STEP 2</Text>
              <Text style={styles.stepTitle}>Choose time period</Text>
              <View style={styles.rangeRow}>
                {RANGE_OPTIONS.map(r => {
                  const active = timeRange === r.id;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.rangeChip, active && styles.rangeChipActive]}
                      onPress={() => setTimeRange(r.id)}
                      testID={`range-${r.id}`}
                    >
                      <Text style={[styles.rangeChipText, active && styles.rangeChipTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {timeRange === 'custom' && (
                <View style={styles.customDateRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dateLabel}>From (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.dateInput}
                      value={customFrom}
                      onChangeText={setCustomFrom}
                      placeholder="2026-01-01"
                      placeholderTextColor={Colors.textTertiary}
                      testID="custom-from"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dateLabel}>To (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.dateInput}
                      value={customTo}
                      onChangeText={setCustomTo}
                      placeholder="2026-04-22"
                      placeholderTextColor={Colors.textTertiary}
                      testID="custom-to"
                    />
                  </View>
                </View>
              )}
            </View>

            <View style={styles.stepSection}>
              <Text style={styles.stepLabel}>STEP 3</Text>
              <Text style={styles.stepTitle}>Choose participants</Text>
              {([
                { id: 'all' as const, label: 'All participants', sub: `${users.length} total` },
                { id: 'team' as const, label: 'Specific team', sub: `${teamNames.length} teams available` },
                { id: 'individual' as const, label: 'Individual participant', sub: 'Searchable' },
              ]).map(p => {
                const active = participantMode === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.optionCard, active && styles.optionCardActive]}
                    onPress={() => setParticipantMode(p.id)}
                    testID={`participant-mode-${p.id}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{p.label}</Text>
                      <Text style={styles.pickerItemSub}>{p.sub}</Text>
                    </View>
                    <View style={[styles.checkCircle, active && styles.checkCircleActive]}>
                      {active && <Check size={14} color={Colors.white} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
              {participantMode === 'team' && (
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setShowTeamPicker(true)}
                  testID="open-team-picker"
                >
                  <Text style={[styles.pickerBtnText, !teamName && styles.pickerBtnPlaceholder]}>
                    {teamName || 'Select a team'}
                  </Text>
                  <ChevronDown size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
              {participantMode === 'individual' && (
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setShowParticipantPicker(true)}
                  testID="open-participant-picker"
                >
                  <Text style={[styles.pickerBtnText, !userId && styles.pickerBtnPlaceholder]}>
                    {selectedUser ? selectedUser.name : 'Select a participant'}
                  </Text>
                  <ChevronDown size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.stepSection}>
              <Text style={styles.stepLabel}>STEP 4</Text>
              <Text style={styles.stepTitle}>Choose export format</Text>
              <View style={styles.formatRow}>
                <TouchableOpacity
                  style={[styles.formatCard, format === 'csv' && styles.formatCardActive]}
                  onPress={() => setFormat('csv')}
                  testID="format-csv"
                >
                  <FileText size={18} color={format === 'csv' ? Colors.socialConnection : Colors.textSecondary} />
                  <Text style={[styles.formatText, format === 'csv' && styles.formatTextActive]}>CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formatCard, format === 'json' && styles.formatCardActive]}
                  onPress={() => setFormat('json')}
                  testID="format-json"
                >
                  <FileJson size={18} color={format === 'json' ? Colors.socialConnection : Colors.textSecondary} />
                  <Text style={[styles.formatText, format === 'json' && styles.formatTextActive]}>JSON</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.downloadBtn, exporting && styles.downloadBtnDisabled]}
              onPress={onDownload}
              disabled={exporting}
              testID="download-export"
            >
              {exporting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Download size={18} color={Colors.white} />
                  <Text style={styles.downloadBtnText}>Download Export</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      <Modal visible={showTeamPicker} animationType="slide" transparent onRequestClose={() => setShowTeamPicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowTeamPicker(false)}>
          <View style={styles.pickerSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Team</Text>
              <TouchableOpacity onPress={() => setShowTeamPicker(false)}>
                <X size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {teamNames.length === 0 ? (
                <View style={styles.emptyPicker}>
                  <Text style={styles.emptyPickerText}>No teams found.</Text>
                </View>
              ) : teamNames.map(t => (
                <TouchableOpacity
                  key={t}
                  style={styles.pickerItem}
                  onPress={() => { setTeamName(t); setShowTeamPicker(false); }}
                >
                  <Text style={styles.pickerItemText}>{t}</Text>
                  {teamName === t && <Check size={18} color={Colors.socialConnection} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showParticipantPicker} animationType="slide" transparent onRequestClose={() => setShowParticipantPicker(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowParticipantPicker(false)}>
            <View style={styles.pickerSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Participant</Text>
                <TouchableOpacity onPress={() => setShowParticipantPicker(false)}>
                  <X size={20} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.pickerSearch}
                value={participantSearch}
                onChangeText={setParticipantSearch}
                placeholder="Search by name or email"
                placeholderTextColor={Colors.textTertiary}
                autoCorrect={false}
                autoCapitalize="none"
              />
              <ScrollView keyboardShouldPersistTaps="handled">
                {filteredParticipants.length === 0 ? (
                  <View style={styles.emptyPicker}>
                    <Text style={styles.emptyPickerText}>No matches.</Text>
                  </View>
                ) : filteredParticipants.map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.pickerItem}
                    onPress={() => { setUserId(u.id); setShowParticipantPicker(false); setParticipantSearch(''); }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerItemText}>{u.name}</Text>
                      <Text style={styles.pickerItemSub}>{u.email}</Text>
                    </View>
                    {userId === u.id && <Check size={18} color={Colors.socialConnection} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </Modal>
  );
}
