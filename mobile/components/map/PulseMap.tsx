import { forwardRef } from 'react';
import MapView, { LongPressEvent, Marker, Region } from 'react-native-maps';
import { StyleSheet, View, Text, Keyboard } from 'react-native';
import { RequestPin } from './RequestPin';

interface PinData {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: 'INSTANT' | 'GLOBAL';
  expiresAt: string;
}

interface RiftMapProps {
  initialRegion?: Region;
  pins: PinData[];
  onPinPress: (pin: PinData) => void;
  onLongPress: (coordinate: { latitude: number; longitude: number }) => void;
  onMapPress?: () => void;
  pendingPin?: { latitude: number; longitude: number } | null;
  searchPin?: { latitude: number; longitude: number; name: string } | null;
}

export const RiftMap = forwardRef<MapView, RiftMapProps>(
  ({ initialRegion, pins, onPinPress, onLongPress, onMapPress, pendingPin, searchPin }, ref) => {
    const handleLongPress = (e: LongPressEvent) => {
      onLongPress(e.nativeEvent.coordinate);
    };

    return (
      <MapView
        ref={ref}
        style={styles.map}
        onPress={() => { Keyboard.dismiss(); onMapPress?.(); }}
        initialRegion={
          initialRegion ?? {
            latitude: 37.7749,
            longitude: -122.4194,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }
        }
        showsUserLocation
        onLongPress={handleLongPress}
      >
        {pins.map((pin) => (
          <RequestPin key={pin.id} pin={pin} onPress={onPinPress} />
        ))}
        {pendingPin && (
          <Marker coordinate={pendingPin}>
            <View style={styles.pendingPin}>
              <Text style={styles.pendingIcon}>📍</Text>
            </View>
          </Marker>
        )}
        {searchPin && (
          <Marker key={`${searchPin.latitude},${searchPin.longitude}`} coordinate={searchPin} title={searchPin.name}>
            <View style={styles.searchPinContainer}>
              <Text style={styles.searchPinIcon}>🔍</Text>
              <View style={styles.searchPinLabel}>
                <Text style={styles.searchPinText} numberOfLines={1}>{searchPin.name}</Text>
              </View>
            </View>
          </Marker>
        )}
      </MapView>
    );
  }
);

const styles = StyleSheet.create({
  map: { flex: 1 },
  pendingPin: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingIcon: { fontSize: 32 },
  searchPinContainer: {
    alignItems: 'center',
  },
  searchPinIcon: { fontSize: 28 },
  searchPinLabel: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    maxWidth: 140,
  },
  searchPinText: { fontSize: 11, fontWeight: '600', color: '#333' },
});
