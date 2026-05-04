import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Medal, Crown, Users, User as UserIcon } from 'lucide-react-native';
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
  const { token } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('teams');

  const leaderboardQuery = useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      if (!baseUrl || !token) throw new Error('Not connected');
      const res = await resilientFetch(`${baseUrl}/api/leaderboard`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      return res.json() as Promise<LeaderboardResponse>;
    },
    enabled: !!token,
    refetchOnMount: true,
    staleTime: 30_000,
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

  const onRefresh = useCallback(() => {
    void leaderboardQuery.refetch();
  }, [leaderboardQuery]);

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Crown size={18} color="#FFD700" />;
    if (rank === 1) return <Medal size={18} color="#C0C0C0" />;
    if (rank === 2) return <Medal size={18} color="#CD7F32" />;
    return null;
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
          <View style={styles.headerSection}>
            <Trophy size={28} color={Colors.socialConnection} />
            <Text style={styles.headerTitle}>Live Leaderboard</Text>
            <Text style={styles.headerSub}>
              {participants.length} participant{participants.length === 1 ? '' : 's'} • updated live
            </Text>
          </View>

          {profile && (
            <View style={styles.youCard}>
              <View style={styles.youAvatar}>
                <Text style={styles.youAvatarText}>{getInitials(profile.name || 'You')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.youLabel}>Your rank</Text>
                <Text style={styles.youName}>
                  {profile.name}{profile.teamName ? ` • ${profile.teamName}` : ''}
                </Text>
              </View>
              <View style={styles.youStats}>
                <Text style={styles.youRank}>{myRank ? `#${myRank}` : '—'}</Text>
                <Text style={styles.youPoints}>{totalPoints.toLocaleString()} pts</Text>
              </View>
            </View>
          )}

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
              <ActivityIndicator size="large" color={Colors.socialConnection} />
              <Text style={styles.loadingText}>Loading leaderboard...</Text>
            </View>
          ) : isError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorEmoji}>⚠️</Text>
              <Text style={styles.errorTitle}>Could not load leaderboard</Text>
              <Text style={styles.errorSub}>Pull down to retry</Text>
            </View>
          ) : viewMode === 'teams' ? (
            <>
              <Text style={styles.sectionTitle}>Team Rankings</Text>
              {teamStandings.length === 0 ? (
                <Text style={styles.emptyText}>No teams yet — join a team to see standings.</Text>
              ) : (
                teamStandings.map((team, idx) => {
                  const isUserTeam = team.name === profile?.teamName;
                  return (
                    <View
                      key={team.name}
                      style={[styles.teamCard, isUserTeam && styles.teamCardHighlight]}
                    >
                      <View style={styles.teamRank}>
                        {getRankIcon(idx) || (
                          <Text style={[styles.teamRankNum, idx === 0 && styles.teamRankFirst]}>
                            {idx + 1}
                          </Text>
                        )}
                      </View>
                      <View style={styles.teamInfo}>
                        <Text style={[styles.teamName, isUserTeam && styles.teamNameHighlight]}>
                          {team.name} {isUserTeam ? '(You)' : ''}
                        </Text>
                        <Text style={styles.teamMembers}>{team.members.length} member{team.members.length === 1 ? '' : 's'}</Text>
                      </View>
                      <View style={styles.teamPoints}>
                        <Text style={[styles.teamPointsNum, isUserTeam && styles.teamPointsHighlight]}>
                          {team.totalPoints.toLocaleString()}
                        </Text>
                        <Text style={styles.teamPointsLabel}>pts</Text>
                      </View>
                    </View>
                  );
                })
              )}

              {userTeam && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
                    Your Team — {userTeam.name}
                  </Text>
                  {userTeam.members.map((member, idx) => {
                    const isUser = member.isSelf;
                    return (
                      <View
                        key={member.id}
                        style={[styles.memberRow, isUser && styles.memberRowHighlight]}
                      >
                        <View style={styles.memberRank}>
                          {getRankIcon(idx) || (
                            <Text style={styles.memberRankNum}>{idx + 1}</Text>
                          )}
                        </View>
                        <View style={[styles.memberAvatar, isUser && styles.memberAvatarUser]}>
                          <Text style={[styles.memberAvatarText, isUser && styles.memberAvatarTextUser]}>
                            {getInitials(member.name)}
                          </Text>
                        </View>
                        <View style={styles.memberInfo}>
                          <Text style={[styles.memberName, isUser && styles.memberNameUser]}>
                            {member.name} {isUser ? '(You)' : ''}
                          </Text>
                          <Text style={styles.memberSub}>
                            {member.mealsLogged} meals • {member.activitiesLogged} activities • {member.sleepLogged} sleep
                          </Text>
                        </View>
                        <Text style={[styles.memberPoints, isUser && styles.memberPointsUser]}>
                          {member.totalPoints}
                        </Text>
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
                sortedIndividuals.map((p, idx) => (
                  <View
                    key={p.id}
                    style={[styles.memberRow, p.isSelf && styles.memberRowHighlight]}
                  >
                    <View style={styles.memberRank}>
                      {getRankIcon(idx) || (
                        <Text style={styles.memberRankNum}>{idx + 1}</Text>
                      )}
                    </View>
                    <View style={[styles.memberAvatar, p.isSelf && styles.memberAvatarUser]}>
                      <Text style={[styles.memberAvatarText, p.isSelf && styles.memberAvatarTextUser]}>
                        {getInitials(p.name)}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, p.isSelf && styles.memberNameUser]}>
                        {p.name} {p.isSelf ? '(You)' : ''}
                      </Text>
                      <Text style={styles.memberSub}>
                        {p.teamName ?? 'No team'} • 🏅 {p.badgesEarned}
                      </Text>
                    </View>
                    <Text style={[styles.memberPoints, p.isSelf && styles.memberPointsUser]}>
                      {p.totalPoints}
                    </Text>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5F3' },
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 30 },
  headerSection: { alignItems: 'center', marginBottom: 20, paddingTop: 8 },
  headerTitle: {
    fontSize: 26, fontWeight: '800' as const, color: Colors.text, marginTop: 10, letterSpacing: -0.5,
  },
  headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  youCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.socialConnection, borderRadius: 16, padding: 16,
    marginBottom: 18,
  },
  youAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  youAvatarText: { fontSize: 15, fontWeight: '700' as const, color: Colors.white },
  youLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5, textTransform: 'uppercase' as const },
  youName: { fontSize: 15, fontWeight: '700' as const, color: Colors.white, marginTop: 2 },
  youStats: { alignItems: 'flex-end' },
  youRank: { fontSize: 22, fontWeight: '800' as const, color: Colors.white },
  youPoints: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' as const },
  segment: {
    flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 12,
    padding: 4, marginBottom: 16, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  segmentBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 9,
  },
  segmentBtnActive: { backgroundColor: Colors.socialConnection },
  segmentText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
  segmentTextActive: { color: Colors.white },
  loadingBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 13, color: Colors.textSecondary },
  errorBox: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  errorEmoji: { fontSize: 36 },
  errorTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  errorSub: { fontSize: 13, color: Colors.textSecondary },
  emptyText: {
    fontSize: 13, color: Colors.textSecondary, textAlign: 'center',
    fontStyle: 'italic' as const, paddingVertical: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginBottom: 12 },
  teamCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  teamCardHighlight: {
    borderColor: Colors.socialConnection, backgroundColor: Colors.socialConnectionLight,
  },
  teamRank: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.inputBg,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  teamRankNum: { fontSize: 16, fontWeight: '700' as const, color: Colors.textSecondary },
  teamRankFirst: { color: Colors.socialConnection },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  teamNameHighlight: { color: Colors.socialConnection },
  teamMembers: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  teamPoints: { alignItems: 'flex-end' },
  teamPointsNum: { fontSize: 18, fontWeight: '800' as const, color: Colors.text },
  teamPointsHighlight: { color: Colors.socialConnection },
  teamPointsLabel: { fontSize: 11, color: Colors.textSecondary },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  memberRowHighlight: { borderColor: Colors.socialConnection, backgroundColor: Colors.socialConnectionLight },
  memberRank: { width: 28, alignItems: 'center', marginRight: 10 },
  memberRankNum: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  memberAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.inputBg,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  memberAvatarUser: { backgroundColor: Colors.socialConnection },
  memberAvatarText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
  memberAvatarTextUser: { color: Colors.white },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '500' as const, color: Colors.text },
  memberNameUser: { fontWeight: '700' as const, color: Colors.socialConnection },
  memberSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  memberPoints: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  memberPointsUser: { color: Colors.socialConnection },
});
