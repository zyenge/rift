import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

type Mode = 'photo' | 'video';

export default function FulfillScreen() {
  const { id: requestId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [mode, setMode] = useState<Mode>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ uri: string; type: 'photo' | 'video' } | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || uploading) return;

    try {
      if (mode === 'photo') {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        if (photo) setPreview({ uri: photo.uri, type: 'photo' });
      } else {
        if (isRecording) {
          cameraRef.current.stopRecording();
        } else {
          setIsRecording(true);
          const video = await cameraRef.current.recordAsync({ maxDuration: 60 });
          setIsRecording(false);
          if (video) setPreview({ uri: video.uri, type: 'video' });
        }
      }
    } catch (err) {
      setIsRecording(false);
      Alert.alert('Capture failed', String(err));
    }
  }, [mode, isRecording, uploading]);

  const uploadMedia = async (uri: string, mimeType: string, filename: string) => {
    setUploading(true);
    try {
      const token = await SecureStore.getItemAsync('jwt_token');
      const formData = new FormData();
      formData.append('media', {
        uri,
        type: mimeType,
        name: filename,
      } as unknown as Blob);

      await axios.post(`${API_URL}/requests/${requestId}/fulfill`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      Alert.alert(
        '✅ Submitted!',
        'Your fulfillment has been submitted. Karma points have been provisionally awarded!',
        [{ text: 'View Request', onPress: () => router.replace(`/request/${requestId}`) }]
      );
    } catch (err: any) {
      Alert.alert('Upload failed', err?.response?.data?.error ?? String(err));
    } finally {
      setUploading(false);
    }
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access is needed to fulfill this request.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Preview screen — shown after capture, before upload
  if (preview) {
    const mimeType = preview.type === 'photo' ? 'image/jpeg' : 'video/mp4';
    const filename = `capture_${Date.now()}.${preview.type === 'photo' ? 'jpg' : 'mp4'}`;
    return (
      <View style={styles.container}>
        {preview.type === 'photo' ? (
          <Image source={{ uri: preview.uri }} style={styles.previewMedia} resizeMode="cover" />
        ) : (
          <Video
            source={{ uri: preview.uri }}
            style={styles.previewMedia}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
          />
        )}
        <View style={styles.previewActions}>
          <TouchableOpacity
            style={[styles.previewBtn, styles.retakeBtn]}
            onPress={() => setPreview(null)}
          >
            <Text style={styles.previewBtnText}>↩ Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.previewBtn, styles.sendBtn]}
            disabled={uploading}
            onPress={() => uploadMedia(preview.uri, mimeType, filename)}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.previewBtnText}>Send ✓</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode={mode === 'video' ? 'video' : 'picture'}
      >
        {/* Top controls */}
        <View style={styles.topControls}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
          >
            <Text style={styles.iconBtnText}>🔄</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, mode === 'photo' && styles.modeBtnActive]}
            onPress={() => setMode('photo')}
          >
            <Text style={styles.modeBtnText}>📸 Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'video' && styles.modeBtnActive]}
            onPress={() => setMode('video')}
          >
            <Text style={styles.modeBtnText}>🎥 Video</Text>
          </TouchableOpacity>
        </View>

        {/* Shutter */}
        <View style={styles.shutterContainer}>
          {uploading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <TouchableOpacity
              style={[
                styles.shutter,
                mode === 'video' && styles.shutterVideo,
                isRecording && styles.shutterRecording,
              ]}
              onPress={handleCapture}
            >
              {mode === 'video' && isRecording ? (
                <View style={styles.stopIcon} />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>
          )}
          {isRecording && (
            <Text style={styles.recordingLabel}>● REC</Text>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#111',
  },
  permissionText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  permissionBtn: {
    backgroundColor: '#EB7A9F',
    padding: 16,
    borderRadius: 14,
  },
  permissionBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    gap: 8,
  },
  iconBtn: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnText: { fontSize: 18 },
  modeBtn: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modeBtnActive: { backgroundColor: '#EB7A9F' },
  modeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  shutterContainer: {
    position: 'absolute',
    bottom: 60,
    width: '100%',
    alignItems: 'center',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterVideo: { borderColor: '#FF6B6B' },
  shutterRecording: { backgroundColor: 'rgba(255,107,107,0.5)' },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
  },
  stopIcon: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  recordingLabel: {
    color: '#FF6B6B',
    fontWeight: '700',
    fontSize: 14,
    marginTop: 8,
  },
  previewMedia: { flex: 1, width: '100%' },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    backgroundColor: '#000',
  },
  previewBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  retakeBtn: { backgroundColor: '#555' },
  sendBtn: {
    backgroundColor: '#EB7A9F',
    shadowColor: 'rgba(235, 122, 159, 0.30)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  previewBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
