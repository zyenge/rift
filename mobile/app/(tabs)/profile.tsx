import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../lib/auth.store';
import { KarmaBadge } from '../../components/ui/KarmaBadge';
import api from '../../lib/api';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  karmaPoints: number;
  createdAt: string;
}

interface FulfillmentHistory {
  id: string;
  mediaType: 'PHOTO' | 'VIDEO';
  status: string;
  karmaAwarded: number;
  createdAt: string;
  request: { title: string };
}

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fulfillments, setFulfillments] = useState<FulfillmentHistory[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<UserProfile>('/users/me');
      setProfile(data);
      updateUser({ karmaPoints: data.karmaPoints });
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  const displayUser = profile ?? user;

  if (!displayUser) return null;

  const joinedYear = profile ? new Date(profile.createdAt).getFullYear() : '';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {displayUser.username[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.username}>@{displayUser.username}</Text>
        <Text style={styles.email}>{displayUser.email}</Text>
        {joinedYear && <Text style={styles.joined}>Member since {joinedYear}</Text>}
      </View>

      {/* Karma */}
      <View style={styles.karmaCard}>
        <Text style={styles.karmaTitle}>Karma Points</Text>
        <KarmaBadge points={displayUser.karmaPoints} size="lg" />
        <Text style={styles.karmaHint}>
          Earn by fulfilling requests · Bonus for great ratings
        </Text>
      </View>

      {/* Karma breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to earn</Text>
        <View style={styles.earningRow}>
          <Text style={styles.earningIcon}>📸</Text>
          <Text style={styles.earningLabel}>Photo upload</Text>
          <Text style={styles.earningPoints}>+10 pts</Text>
        </View>
        <View style={styles.earningRow}>
          <Text style={styles.earningIcon}>🎥</Text>
          <Text style={styles.earningLabel}>Video upload</Text>
          <Text style={styles.earningPoints}>+15 pts</Text>
        </View>
        <View style={styles.earningRow}>
          <Text style={styles.earningIcon}>⭐⭐⭐⭐</Text>
          <Text style={styles.earningLabel}>Rating ≥ 4 stars</Text>
          <Text style={styles.earningPoints}>+5 bonus</Text>
        </View>
        <View style={styles.earningRow}>
          <Text style={styles.earningIcon}>⭐⭐</Text>
          <Text style={styles.earningLabel}>Rating ≤ 2 stars</Text>
          <Text style={[styles.earningPoints, { color: '#FF5A5A' }]}>−2 pts</Text>
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F' },
  header: {
    backgroundColor: '#0D0D0F',
    paddingTop: 40,
    paddingBottom: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C34',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#222228',
    borderWidth: 3,
    borderColor: '#EB7A9F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarText: { color: '#F2F2F5', fontSize: 34, fontWeight: '800' },
  username: { color: '#F2F2F5', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  email: { color: '#A8A8B8', fontSize: 14 },
  joined: { color: '#5A5A70', fontSize: 12, marginTop: 4 },
  karmaCard: {
    backgroundColor: '#18181C',
    margin: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(235, 122, 159, 0.20)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  karmaTitle: { fontSize: 11, color: '#5A5A70', marginBottom: 8, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  karmaHint: { fontSize: 12, color: '#5A5A70', marginTop: 8, textAlign: 'center' },
  section: {
    backgroundColor: '#18181C',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C34',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F2F2F5', marginBottom: 12 },
  earningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C34',
  },
  earningIcon: { fontSize: 20, width: 40 },
  earningLabel: { flex: 1, fontSize: 14, color: '#A8A8B8' },
  earningPoints: { fontSize: 14, fontWeight: '700', color: '#34C97B' },
  logoutBtn: {
    margin: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 90, 90, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 90, 0.35)',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoutText: { color: '#FF5A5A', fontWeight: '700', fontSize: 16 },
});
