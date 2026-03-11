import { View, Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

interface Fulfillment {
  id: string;
  mediaUrl: string;
  mediaType: 'PHOTO' | 'VIDEO';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  fulfiller: { id: string; username: string; credits: number };
  rating?: { score: number; comment?: string } | null;
  creditsEarned: number;
}

interface FulfillmentMediaProps {
  fulfillment: Fulfillment;
  isRequester: boolean;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onRate?: (id: string, score: number) => void;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

function VideoPlayer({ uri }: { uri: string }) {
  return (
    <Video
      source={{ uri }}
      style={styles.media}
      useNativeControls
      resizeMode={ResizeMode.COVER}
      shouldPlay={false}
    />
  );
}

function getMediaUrl(url: string) {
  if (url.startsWith('http')) return url;
  return `${API_URL.replace('/api/v1', '')}${url}`;
}

export function FulfillmentMedia({
  fulfillment,
  isRequester,
  onAccept,
  onReject,
  onRate,
}: FulfillmentMediaProps) {
  const mediaUrl = getMediaUrl(fulfillment.mediaUrl);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.username}>@{fulfillment.fulfiller.username}</Text>
        <View style={[styles.badge, getStatusStyle(fulfillment.status)]}>
          <Text style={[styles.badgeText, { color: getStatusTextColor(fulfillment.status) }]}>
            {fulfillment.status}
          </Text>
        </View>
      </View>

      {fulfillment.mediaType === 'PHOTO' ? (
        <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />
      ) : (
        <VideoPlayer uri={mediaUrl} />
      )}

      {isRequester && fulfillment.status === 'PENDING' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => onAccept?.(fulfillment.id)}
          >
            <Text style={styles.actionText}>✓ Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => onReject?.(fulfillment.id)}
          >
            <Text style={styles.rejectText}>✗ Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {isRequester && fulfillment.status === 'ACCEPTED' && !fulfillment.rating && (
        <View style={styles.ratingRow}>
          <Text style={styles.ratingLabel}>Rate:</Text>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => onRate?.(fulfillment.id, star)}>
              <Text style={styles.star}>⭐</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {fulfillment.rating && (
        <Text style={styles.ratingDone}>
          Rated: {'⭐'.repeat(fulfillment.rating.score)}
        </Text>
      )}

      {fulfillment.creditsEarned > 0 && (
        <Text style={styles.credits}>💎 {fulfillment.creditsEarned} credits earned</Text>
      )}
    </View>
  );
}

function getStatusStyle(status: string) {
  if (status === 'ACCEPTED') return { backgroundColor: 'rgba(52, 201, 123, 0.12)' };
  if (status === 'REJECTED') return { backgroundColor: 'rgba(255, 90, 90, 0.12)' };
  return { backgroundColor: 'rgba(245, 166, 35, 0.12)' };
}

function getStatusTextColor(status: string) {
  if (status === 'ACCEPTED') return '#34C97B';
  if (status === 'REJECTED') return '#FF5A5A';
  return '#F5A623';
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2C34',
    overflow: 'hidden',
    backgroundColor: '#18181C',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#222228',
  },
  username: { fontWeight: '700', color: '#F2F2F5', fontSize: 15 },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  media: { width: '100%', height: 260 },
  actions: { flexDirection: 'row', gap: 8, padding: 12 },
  actionBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptBtn: { backgroundColor: '#34C97B' },
  rejectBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 90, 90, 0.50)',
  },
  actionText: { color: '#fff', fontWeight: '700' },
  rejectText: { color: '#FF5A5A', fontWeight: '700' },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 4,
  },
  ratingLabel: { color: '#A8A8B8', marginRight: 4, fontSize: 13 },
  star: { fontSize: 24 },
  ratingDone: { paddingHorizontal: 12, paddingBottom: 8, color: '#A8A8B8' },
  credits: { padding: 12, fontSize: 12, color: '#63B3ED', fontWeight: '600' },
});
