import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Medal, Crown, Users, User as UserIcon, Flame } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { resilientFetch } from '@/utils/resilientFetch';

interface LeaderboardParticipant {
  id: string;
  name: string;
  teamName: string | null;
  totalPoints: number;
  mealsLogged: number;
  activitiesLogged: number;
  sleepLogged: number;
  journalsLogged: number;
  badgesEarned: number;
  lastActive: string | null;
  isSelf: boolean;
}

interface LeaderboardResponse {
  participants: LeaderboardParticipant[];
  updatedAt: string;
}

type ViewMode = 'teams' | 'individuals';

export default function LeaderboardScreen() {
  const { profile, totalPoints } = useUser();
  const { token, refreshToken } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('teams');

  const leaderboardQuery = useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      if (!baseUrl) throw new Error('Backend not configured');
      let activeToken = token;
      if (!activeToken) {
        activeToken = await refreshToken();
      }
      if (!activeToken) throw new Error('Not signed in');
      let res = await resilientFetch(`${baseUrl}/api/leaderboard`, {
        headers: { 'Authorization': `Bearer ${activeToken}` },
        maxRetries: 2,
        skipWake: true,
      });
      if (res.status === 401) {
        const fresh = await refreshToken();
        if (fresh) {
          res = await resilientFetch(`${baseUrl}/api/leaderboard`, {
            headers: { 'Authorization': `Bearer ${fresh}` },
            maxRetries: 2,
            skipWake: true,
          });
        }
      }
      if (!res.ok) throw new Error(`Server ${res.status}`);
      return res.json() as Promise<LeaderboardResponse>;
    },
    enabled: !!token,
    refetchOnMount: true,
    staleTime: 30_000,
    retry: 1,
  });

  const participants = useMemo<LeaderboardParticipant[]>(() => {
    const base = leaderboardQuery.data?.participants ?? [];
    return base.map(p => p.isSelf ? { ...p, totalPoints, name: profile?.name || p.name, teamName: profile?.teamName || p.teamName } : p);
  }, [leaderboardQuery.data, totalPoints, profile?.name, profile?.teamName]);

  const teamStandings = useMemo(() => {
    const map = new Map<string, { name: string; totalPoints: number; members: LeaderboardParticipant[] }>();
    for (const p of participants) {
      if (!p.teamName) continue;
      const t = map.get(p.teamName) ?? { name: p.teamName, totalPoints: 0, members: [] };
      t.totalPoints += p.totalPoints;
      t.members.push(p);
      map.set(p.teamName, t);
    }
    return Array.from(map.values())
      .map(t => ({ ...t, members: [...t.members].sort((a, b) => b.totalPoints - a.totalPoints) }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }, [participants]);

  const sortedIndividuals = useMemo(() =>
    [...participants].sort((a, b) => b.totalPoints - a.totalPoints),
    [participants]
  );

  const myRank = useMemo(() => {
    const idx = sortedIndividuals.findIndex(p => p.isSelf);
    return idx === -1 ? null : idx + 1;
  }, [sortedIndividuals]);

  const userTeam = useMemo(() => {
    if (!profile?.teamName) return null;
    return teamStandings.find(t => t.name === profile.teamName) ?? null;
  }, [teamStandings, profile?.teamName]);

  const topPoints = useMemo(() => {
    if (viewMode === 'teams') return teamStandings[0]?.totalPoints ?? 0;
    return sortedIndividuals[0]?.totalPoints ?? 0;
  }, [viewMode, teamStandings, sortedIndividuals]);

  const motivation = useMemo(() => {
    if (myRank === null) return 'Log activities to enter the ranking 🌱';
    if (myRank === 1) return "You're #1! Keep that crown 👑";
    if (myRank <= 3) return 'Podium position. Push for the top 🔥';
    if (myRank <= 10) return 'Top 10 — keep stacking points 💪';
    return 'Every action moves you up the board ⚡';
  }, [myRank]);

  const onRefresh = useCallback(() => {
    void leaderboardQuery.refetch();
  }, [leaderboardQuery]);

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Crown size={16} color={Colors.white} fill={Colors.white} />;
    if (rank === 1) return <Medal size={16} color={Colors.white} />;
    if (rank === 2) return <Medal size={16} color={Colors.white} />;
    return null;
  };

  const rankTileColor = (rank: number): string => {
    if (rank === 0) return Colors.mood;
    if (rank === 1) return '#94A3B8';
    if (rank === 2) return '#CD7F32';
    return Colors.primary;
  };

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const isLoading = leaderboardQuery.isLoading;
  const isError = leaderboardQuery.isError;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={leaderboardQuery.isRefetching} onRefresh={onRefresh} />}
        >
          <Text style={styles.pageTitle}>Leaderboard</Text>
          <Text style={styles.pageSub}>
            {participants.length} participant{participants.length === 1 ? '' : 's'} · updated live
          </Text>

          {/* Hero card */}
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Your Rank</Text>
            <View style={styles.heroRow}>
              <Text style={styles.heroBig}>
                {myRank ? `#${myRank}` : '—'}
              </Text>
              <Text style={styles.heroPct}>{totalPoints.toLocaleString()}</Text>
            </View>
            <View style={styles.heroBarBg}>
              <View style={[styles.heroBarFill, {
                width: topPoints > 0 ? `${Math.min(100, (totalPoints / topPoints) * 100)}%` as any : '0%',
              }]} />
            </View>
            <Text style={styles.heroMsg}>{motivation}</Text>
          </View>

          {/* Segment */}
          <View style={styles.segment} testID="leaderboard-segment">
            <TouchableOpacity
              style={[styles.segmentBtn, viewMode === 'teams' && styles.segmentBtnActive]}
              onPress={() => setViewMode('teams')}
              testID="segment-teams"
            >
              <Users size={15} color={viewMode === 'teams' ? Colors.white : Colors.textSecondary} />
              <Text style={[styles.segmentText, viewMode === 'teams' && styles.segmentTextActive]}>Teams</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentBtn, viewMode === 'individuals' && styles.segmentBtnActive]}
              onPress={() => setViewMode('individuals')}
              testID="segment-individuals"
            >
              <UserIcon size={15} color={viewMode === 'individuals' ? Colors.white : Colors.textSecondary} />
              <Text style={[styles.segmentText, viewMode === 'individuals' && styles.segmentTextActive]}>Individuals</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading leaderboard...</Text>
            </View>
          ) : isError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorEmoji}>⚠️</Text>
              <Text style={styles.errorTitle}>Could not load leaderboard</Text>
              <Text style={styles.errorSub}>
                {leaderboardQuery.error instanceof Error ? leaderboardQuery.error.message : 'Pull down to retry'}
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={onRefresh} activeOpacity={0.8}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : viewMode === 'teams' ? (
            <>
              <Text style={styles.sectionTitle}>Team Rankings</Text>
              {teamStandings.length === 0 ? (
                <Text style={styles.emptyText}>No teams yet — join a team to see standings.</Text>
              ) : (
                teamStandings.map((team, idx) => {
                  const isUserTeam = team.name === profile?.teamName;
                  const pct = topPoints > 0 ? Math.min(100, (team.totalPoints / topPoints) * 100) : 0;
                  const tileColor = rankTileColor(idx);
                  return (
                    <View
                      key={team.name}
                      style={[styles.rowCard, isUserTeam && styles.rowCardHighlight]}
                    >
                      <View style={[styles.rankTile, { backgroundColor: tileColor, shadowColor: tileColor }]}>
                        {getRankIcon(idx) || (
                          <Text style={styles.rankTileNum}>{idx + 1}</Text>
                        )}
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={[styles.rowName, isUserTeam && styles.rowNameHighlight]}>
                          {team.name}{isUserTeam ? ' (You)' : ''}
                        </Text>
                        <Text style={styles.rowSub}>
                          {team.members.length} member{team.members.length === 1 ? '' : 's'}
                        </Text>
                        <View style={styles.slimBarBg}>
                          <View style={[styles.slimBarFill, {
                            width: `${pct}%` as any,
                            backgroundColor: tileColor,
                          }]} />
                        </View>
                      </View>
                      <View style={styles.rowRight}>
                        <Text style={styles.rowPoints}>{team.totalPoints.toLocaleString()}</Text>
                        <Text style={styles.rowPointsLabel}>pts</Text>
                      </View>
                    </View>
                  );
                })
              )}

              {userTeam && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 26 }]}>
                    Your Team — {userTeam.name}
                  </Text>
                  {userTeam.members.map((member, idx) => {
                    const isUser = member.isSelf;
                    const memberTop = userTeam.members[0]?.totalPoints ?? 0;
                    const pct = memberTop > 0 ? Math.min(100, (member.totalPoints / memberTop) * 100) : 0;
                    const tileColor = rankTileColor(idx);
                    return (
                      <View
                        key={member.id}
                        style={[styles.rowCard, isUser && styles.rowCardHighlight]}
                      >
                        <View style={[styles.rankTile, { backgroundColor: tileColor, shadowColor: tileColor }]}>
                          {getRankIcon(idx) || (
                            <Text style={styles.rankTileNum}>{idx + 1}</Text>
                          )}
                        </View>
                        <View style={styles.rowBody}>
                          <Text style={[styles.rowName, isUser && styles.rowNameHighlight]}>
                            {member.name}{isUser ? ' (You)' : ''}
                          </Text>
                          <Text style={styles.rowSub} numberOfLines={1}>
                            {member.mealsLogged} meals · {member.activitiesLogged} activities
                          </Text>
                          <View style={styles.slimBarBg}>
                            <View style={[styles.slimBarFill, {
                              width: `${pct}%` as any,
                              backgroundColor: tileColor,
                            }]} />
                          </View>
                        </View>
                        <View style={styles.rowRight}>
                          <Text style={styles.rowPoints}>{member.totalPoints.toLocaleString()}</Text>
                          <Text style={styles.rowPointsLabel}>pts</Text>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Individual Rankings</Text>
              {sortedIndividuals.length === 0 ? (
                <Text style={styles.emptyText}>No participants yet.</Text>
              ) : (
                sortedIndividuals.map((p, idx) => {
                  const pct = topPoints > 0 ? Math.min(100, (p.totalPoints / topPoints) * 100) : 0;
                  const tileColor = rankTileColor(idx);
                  return (
                    <View
                      key={p.id}
                      style={[styles.rowCard, p.isSelf && styles.rowCardHighlight]}
                    >
                      <View style={[styles.rankTile, { backgroundColor: tileColor, shadowColor: tileColor }]}>
                        {getRankIcon(idx) || (
                          <Text style={styles.rankTileNum}>{idx + 1}</Text>
                        )}
                      </View>
                      <View style={styles.rowBody}>
                        <View style={styles.nameRow}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{getInitials(p.name)}</Text>
                          </View>
                          <Text style={[styles.rowName, p.isSelf && styles.rowNameHighlight]} numberOfLines={1}>
                            {p.name}{p.isSelf ? ' (You)' : ''}
                          </Text>
                        </View>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {p.teamName ?? 'No team'} · {p.badgesEarned} badges
                        </Text>
                        <View style={styles.slimBarBg}>
                          <View style={[styles.slimBarFill, {
                            width: `${pct}%` as any,
                            backgroundColor: tileColor,
                          }]} />
                        </View>
                      </View>
                      <View style={styles.rowRight}>
                        <View style={styles.flameRow}>
                          <Flame size={12} color="#F97316" fill="#F97316" />
                          <Text style={styles.rowPoints}>{p.totalPoints.toLocaleString()}</Text>
                        </View>
                        <Text style={styles.rowPointsLabel}>pts</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 4 },

  pageTitle: { fontSize: 32, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.8 },
  pageSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 20 },

  // Hero (matches missions/insights green hero card)
  heroCard: {
    borderRadius: 22, padding: 20, marginBottom: 18,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary, shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: 'hidden' as const,
  },
  heroLabel: { color: Colors.white, fontSize: 13, fontWeight: '600' as const, opacity: 0.9 },
  heroRow: { flexDirection: 'row' as const, alignItems: 'flex-end' as const, justifyContent: 'space-between' as const, marginTop: 4 },
  heroBig: { color: Colors.white, fontSize: 38, fontWeight: '800' as const, letterSpacing: -1 },
  heroPct: { color: Colors.white, fontSize: 26, fontWeight: '800' as const, opacity: 0.55, letterSpacing: -0.6 },
  heroBarBg: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 4, overflow: 'hidden' as const,
    marginTop: 12,
  },
  heroBarFill: { height: 8, backgroundColor: Colors.white, borderRadius: 4 },
  heroMsg: { color: Colors.white, fontSize: 13, fontWeight: '600' as const, marginTop: 12, opacity: 0.95 },

  segment: {
    flexDirection: 'row' as const, backgroundColor: Colors.card, borderRadius: 14,
    padding: 4, marginBottom: 18, borderWidth: 1, borderColor: Colors.cardBorder,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  segmentBtn: {
    flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 6, paddingVertical: 11, borderRadius: 10,
  },
  segmentBtnActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
  segmentTextActive: { color: Colors.white },

  loadingBox: { alignItems: 'center' as const, paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 13, color: Colors.textSecondary },
  errorBox: { alignItems: 'center' as const, paddingVertical: 40, gap: 8 },
  errorEmoji: { fontSize: 36 },
  errorTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  errorSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' as const, paddingHorizontal: 20 },
  retryBtn: {
    marginTop: 12, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 12,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 3,
  },
  retryBtnText: { fontSize: 14, fontWeight: '800' as const, color: Colors.white, letterSpacing: -0.2 },
  emptyText: {
    fontSize: 13, color: Colors.textSecondary, textAlign: 'center' as const,
    fontStyle: 'italic' as const, paddingVertical: 20,
  },

  sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginBottom: 14, letterSpacing: -0.3 },

  // Row card (white 3D card, deep colored rank tile, slim progress bar)
  rowCard: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14,
    backgroundColor: Colors.white, borderRadius: 18, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#F1F3F6',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  rowCardHighlight: {
    borderColor: Colors.primary, borderWidth: 2,
    shadowColor: Colors.primary, shadowOpacity: 0.18, shadowRadius: 14,
  },
  rankTile: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 2, borderColor: Colors.white,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  rankTileNum: { fontSize: 16, fontWeight: '800' as const, color: Colors.white },
  rowBody: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  avatar: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primaryLight, alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  avatarText: { fontSize: 9, fontWeight: '800' as const, color: Colors.primaryDark },
  rowName: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.2, flexShrink: 1 },
  rowNameHighlight: { color: Colors.primaryDark },
  rowSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 3, fontWeight: '500' as const },
  slimBarBg: {
    height: 5, backgroundColor: '#EEF1F5', borderRadius: 3, overflow: 'hidden' as const, marginTop: 8,
  },
  slimBarFill: { height: 5, borderRadius: 3 },

  rowRight: { alignItems: 'flex-end' as const, gap: 2 },
  flameRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  rowPoints: { fontSize: 17, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.4 },
  rowPointsLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
});
