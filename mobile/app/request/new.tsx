import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RequestTypeToggle } from '../../components/request/RequestTypeToggle';
import api from '../../lib/api';

type RequestType = 'INSTANT' | 'GLOBAL';

export default function NewRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lat: string; lng: string }>();
  const lat = parseFloat(params.lat ?? '0');
  const lng = parseFloat(params.lng ?? '0');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<RequestType>('INSTANT');
  const [radius, setRadius] = useState('1000');
  const [loading, setLoading] = useState(false);
  const [costPreview, setCostPreview] = useState<{ cost: number; balance: number } | null>(null);

  // Fetch cost preview as soon as we have coordinates
  useEffect(() => {
    if (!lat || !lng) return;
    api
      .get<{ cost: number; balance: number }>('/requests/cost', { params: { lat, lng } })
      .then(({ data }) => setCostPreview(data))
      .catch(() => {}); // non-fatal
  }, [lat, lng]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!lat || !lng) {
      Alert.alert('Error', 'Location is required');
      return;
    }
    if (costPreview && costPreview.balance < costPreview.cost) {
      Alert.alert('Insufficient credits', `You need ${costPreview.cost} credits but only have ${costPreview.balance}.`);
      return;
    }

    setLoading(true);
    try {
      await api.post('/requests', {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        lat,
        lng,
        radiusMeters: type === 'INSTANT' ? Math.min(parseInt(radius) || 1000, 2000) : undefined,
      });
      router.back();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to create request';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const canAfford = !costPreview || costPreview.balance >= costPreview.cost;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>REQUEST TYPE</Text>
      <RequestTypeToggle value={type} onChange={setType} />

      <Text style={styles.sectionLabel}>TITLE *</Text>
      <TextInput
        style={styles.input}
        placeholder="What do you want to see?"
        value={title}
        onChangeText={setTitle}
        maxLength={100}
        placeholderTextColor="#5A5A70"
      />

      <Text style={styles.sectionLabel}>DESCRIPTION</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Any specific details? (optional)"
        value={description}
        onChangeText={setDescription}
        maxLength={500}
        multiline
        numberOfLines={3}
        placeholderTextColor="#5A5A70"
      />

      {type === 'INSTANT' && (
        <>
          <Text style={styles.sectionLabel}>RADIUS (meters, max 2000)</Text>
          <TextInput
            style={styles.input}
            placeholder="1000"
            value={radius}
            onChangeText={setRadius}
            keyboardType="numeric"
            placeholderTextColor="#5A5A70"
          />
        </>
      )}

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📍 Pin</Text>
          <Text style={styles.infoValue}>{lat.toFixed(5)}, {lng.toFixed(5)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>⏱ Expires</Text>
          <Text style={styles.infoValue}>{type === 'INSTANT' ? '15 minutes' : '48 hours'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>💎 Cost</Text>
          {costPreview ? (
            <Text style={[styles.infoValue, !canAfford && styles.infoValueDanger]}>
              {costPreview.cost} credits (balance: {costPreview.balance})
            </Text>
          ) : (
            <Text style={styles.infoValueMuted}>calculating…</Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, (loading || !canAfford) && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={loading || !canAfford}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>
            {canAfford
              ? `Drop Pin · ${costPreview ? costPreview.cost + ' credits' : '…'}`
              : 'Not enough credits'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F' },
  content: { padding: 20, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5A5A70',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#2C2C34',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#222228',
    color: '#F2F2F5',
  },
  textarea: {
    height: 90,
    textAlignVertical: 'top',
  },
  infoCard: {
    backgroundColor: '#18181C',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2C2C34',
    padding: 14,
    marginTop: 20,
    gap: 8,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13, color: '#A8A8B8' },
  infoValue: { fontSize: 13, color: '#EB7A9F', fontWeight: '600' },
  infoValueDanger: { color: '#FF5A5A' },
  infoValueMuted: { fontSize: 13, color: '#5A5A70' },
  submitBtn: {
    backgroundColor: '#EB7A9F',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: 'rgba(235, 122, 159, 0.30)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
