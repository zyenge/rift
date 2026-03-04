import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Marker } from 'react-native-maps';

interface PinData {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: 'INSTANT' | 'GLOBAL';
  expiresAt: string;
}

interface RequestPinProps {
  pin: PinData;
  onPress: (pin: PinData) => void;
}

export function RequestPin({ pin, onPress }: RequestPinProps) {
  const isExpiringSoon =
    new Date(pin.expiresAt).getTime() - Date.now() < 5 * 60 * 1000; // < 5 min

  return (
    <Marker
      coordinate={{ latitude: pin.lat, longitude: pin.lng }}
      onPress={() => onPress(pin)}
    >
      <View style={[styles.pin, pin.type === 'INSTANT' ? styles.instant : styles.global]}>
        <Text style={styles.icon}>{pin.type === 'INSTANT' ? '⚡' : '🌐'}</Text>
        {isExpiringSoon && <View style={styles.urgentDot} />}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  instant: {
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: '#FF3333',
  },
  global: {
    backgroundColor: '#E27396',
    borderWidth: 2,
    borderColor: '#C4527A',
  },
  icon: { fontSize: 18 },
  urgentDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF0',
  },
});
