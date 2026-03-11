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
import { CreditBadge } from '../../components/ui/CreditBadge';
import api from '../../lib/api';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  credits: number;
  createdAt: string;
}

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<UserProfile>('/users/me');
      setProfile(data);
      updateUser({ credits: data.credits });
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

      {/* Credits */}
      <View style={styles.creditCard}>
        <Text style={styles.creditTitle}>Credits</Text>
        <CreditBadge credits={displayUser.credits} size="lg" />
        <Text style={styles.creditHint}>
          Spend to request · Earn by fulfilling
        </Text>
      </View>

      {/* How it works */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How credits work</Text>
        <View style={styles.row}>
          <Text style={styles.rowIcon}>📍</Text>
          <Text style={styles.rowLabel}>Post a request</Text>
          <Text style={[styles.rowValue, { color: '#FF5A5A' }]}>− 2–10 credits</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowIcon}>📸</Text>
          <Text style={styles.rowLabel}>Fulfill a request</Text>
          <Text style={[styles.rowValue, { color: '#34C97B' }]}>+ credits</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowIcon}>💎</Text>
          <Text style={styles.rowLabel}>New user bonus</Text>
          <Text style={[styles.rowValue, { color: '#63B3ED' }]}>30 free</Text>
        </View>
      </View>

      {/* Pricing tiers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Request pricing</Text>
        <Text style={styles.sectionSubtitle}>Based on nearby users within 0.75 mi</Text>
        <View style={styles.row}>
          <Text style={styles.rowIcon}>🏜️</Text>
          <Text style={styles.rowLabel}>No one nearby</Text>
          <Text style={styles.rowValue}>10 credits</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowIcon}>🌆</Text>
          <Text style={styles.rowLabel}>1–5 users</Text>
          <Text style={styles.rowValue}>8 credits</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowIcon}>🏙️</Text>
          <Text style={styles.rowLabel}>6–15 users</Text>
          <Text style={styles.rowValue}>6 credits</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowIcon}>🌇</Text>
          <Text style={styles.rowLabel}>16–30 users</Text>
          <Text style={styles.rowValue}>4 credits</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowIcon}>🎪</Text>
          <Text style={styles.rowLabel}>31+ users</Text>
          <Text style={styles.rowValue}>2 credits</Text>
        </View>
      </View>

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
  creditCard: {
    backgroundColor: '#18181C',
    margin: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.20)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  creditTitle: {
    fontSize: 11,
    color: '#5A5A70',
    marginBottom: 8,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  creditHint: { fontSize: 12, color: '#5A5A70', marginTop: 8, textAlign: 'center' },
  section: {
    backgroundColor: '#18181C',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C34',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F2F2F5', marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: '#5A5A70', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C34',
  },
  rowIcon: { fontSize: 20, width: 40 },
  rowLabel: { flex: 1, fontSize: 14, color: '#A8A8B8' },
  rowValue: { fontSize: 14, fontWeight: '700', color: '#F2F2F5' },
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
