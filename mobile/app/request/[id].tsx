import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FulfillmentMedia } from '../../components/request/FulfillmentMedia';
import { useRequestSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../lib/auth.store';
import api from '../../lib/api';

interface Fulfillment {
  id: string;
  mediaUrl: string;
  mediaType: 'PHOTO' | 'VIDEO';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  creditsEarned: number;
  fulfiller: { id: string; username: string; credits: number };
  rating: { score: number; comment?: string } | null;
}

interface RequestDetail {
  id: string;
  title: string;
  description: string | null;
  type: 'INSTANT' | 'GLOBAL';
  status: 'OPEN' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';
  lat: number;
  lng: number;
  radiusMeters: number;
  creditCost: number;
  expiresAt: string;
  createdAt: string;
  requester: { id: string; username: string; credits: number };
  fulfillments: Fulfillment[];
}

function CountdownBadge({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return <Text style={styles.countdown}>⏱ {remaining}</Text>;
}

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get<RequestDetail>(`/requests/${id}`);
      setRequest(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Real-time updates via Socket.io
  useRequestSocket(
    id ?? '',
    (newFulfillment) => {
      setRequest((prev) => {
        if (!prev) return prev;
        return { ...prev, fulfillments: [...prev.fulfillments, newFulfillment as Fulfillment] };
      });
    },
    (updatedFulfillment) => {
      setRequest((prev) => {
        if (!prev) return prev;
        const f = updatedFulfillment as Fulfillment;
        return {
          ...prev,
          fulfillments: prev.fulfillments.map((ff) => (ff.id === f.id ? f : ff)),
        };
      });
    }
  );

  const handleAccept = async (fulfillmentId: string) => {
    try {
      await api.put(`/fulfillments/${fulfillmentId}/status`, { status: 'ACCEPTED' });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'Failed');
    }
  };

  const handleReject = async (fulfillmentId: string) => {
    try {
      await api.put(`/fulfillments/${fulfillmentId}/status`, { status: 'REJECTED' });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'Failed');
    }
  };

  const handleRate = async (fulfillmentId: string, score: number) => {
    Alert.alert(`Rate ${score} star${score > 1 ? 's' : ''}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await api.post(`/fulfillments/${fulfillmentId}/rate`, { score });
            await load();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error ?? 'Failed');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#EB7A9F" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.centered}>
        <Text>Request not found</Text>
      </View>
    );
  }

  const isRequester = user?.id === request.requester.id;
  const isOpen = request.status === 'OPEN';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.typeTag}>
            {request.type === 'INSTANT' ? '⚡ Instant' : '🌐 Global'}
          </Text>
          <Text style={styles.statusTag}>{request.status}</Text>
        </View>
        <Text style={styles.title}>{request.title}</Text>
        {request.description && (
          <Text style={styles.description}>{request.description}</Text>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>by @{request.requester.username}</Text>
          {isOpen && <CountdownBadge expiresAt={request.expiresAt} />}
        </View>
        <Text style={styles.coords}>
          📍 {request.lat.toFixed(4)}, {request.lng.toFixed(4)} · r={request.radiusMeters}m
        </Text>
      </View>

      {/* Fulfill CTA */}
      {!isRequester && isOpen && (
        <TouchableOpacity
          style={styles.fulfillBtn}
          onPress={() => router.push(`/fulfill/${request.id}`)}
        >
          <Text style={styles.fulfillBtnText}>📸 Capture & Fulfill This Request</Text>
        </TouchableOpacity>
      )}

      {/* Fulfillments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Fulfillments ({request.fulfillments.length})
        </Text>
        {request.fulfillments.length === 0 ? (
          <Text style={styles.noFulfillments}>No one has fulfilled this yet.</Text>
        ) : (
          request.fulfillments.map((f) => (
            <FulfillmentMedia
              key={f.id}
              fulfillment={f}
              isRequester={isRequester}
              onAccept={handleAccept}
              onReject={handleReject}
              onRate={handleRate}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0F' },
  header: {
    backgroundColor: '#18181C',
    padding: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C34',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  typeTag: { fontSize: 11, color: '#EB7A9F', fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  statusTag: { fontSize: 11, color: '#A8A8B8', fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: '800', color: '#F2F2F5', marginBottom: 8 },
  description: { fontSize: 15, color: '#A8A8B8', marginBottom: 12, lineHeight: 22 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { fontSize: 13, color: '#5A5A70' },
  countdown: { fontSize: 13, color: '#FF5A5A', fontWeight: '700' },
  coords: { fontSize: 12, color: '#5A5A70', marginTop: 8 },
  fulfillBtn: {
    backgroundColor: '#EB7A9F',
    margin: 16,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: 'rgba(235, 122, 159, 0.30)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  fulfillBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 17, fontWeight: '700', color: '#F2F2F5', marginBottom: 12,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#2C2C34',
  },
  noFulfillments: { color: '#5A5A70', textAlign: 'center', paddingVertical: 24 },
});
