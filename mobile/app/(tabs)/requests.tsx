import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../lib/api';

interface MyRequest {
  id: string;
  title: string;
  type: 'INSTANT' | 'GLOBAL';
  status: 'OPEN' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
  fulfillments: { id: string; status: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#34C97B',
  FULFILLED: '#EB7A9F',
  EXPIRED: '#5A5A70',
  CANCELLED: '#FF5A5A',
};

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('Expired');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setRemaining(`${h}h ${m}m`);
      else if (m > 0) setRemaining(`${m}m ${s}s`);
      else setRemaining(`${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return <Text style={styles.countdown}>⏱ {remaining}</Text>;
}

export default function MyRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<MyRequest[]>('/requests/mine');
      setRequests(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleCancel = async (id: string) => {
    Alert.alert('Cancel request', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/requests/${id}`);
            setRequests((prev) =>
              prev.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' } : r))
            );
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error ?? 'Failed to cancel');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: MyRequest }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/request/${item.id}`)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.type === 'INSTANT' ? '⚡' : '🌐'} {item.title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        {item.status === 'OPEN' && <CountdownTimer expiresAt={item.expiresAt} />}
        <Text style={styles.fulfillCount}>
          {item.fulfillments.length} fulfillment{item.fulfillments.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {item.status === 'OPEN' && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => handleCancel(item.id)}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No requests yet</Text>
            <Text style={styles.emptySubtext}>Long-press on the map to create one</Text>
          </View>
        }
        contentContainerStyle={requests.length === 0 ? { flex: 1 } : { padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F' },
  card: {
    backgroundColor: '#18181C',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2C2C34',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#F2F2F5', marginRight: 8 },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  countdown: { fontSize: 13, color: '#FF5A5A', fontWeight: '600' },
  fulfillCount: { fontSize: 13, color: '#A8A8B8' },
  cancelBtn: {
    marginTop: 12,
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 90, 90, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 90, 0.35)',
    alignItems: 'center',
  },
  cancelText: { color: '#FF5A5A', fontWeight: '600', fontSize: 13 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#A8A8B8', marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: '#5A5A70' },
});
