import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import api from '../lib/api';

export interface UserLocation {
  lat: number;
  lng: number;
}

export function useLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const appState = useRef(AppState.currentState);

  const updateServerLocation = async (lat: number, lng: number) => {
    try {
      await api.put('/users/me/location', { lat, lng });
    } catch {
      // Non-fatal — will retry on next foreground
    }
  };

  const fetchAndUpdateLocation = async () => {
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = pos.coords;
      setLocation({ lat, lng });
      await updateServerLocation(lat, lng);
    } catch {
      // Location unavailable
    }
  };

  useEffect(() => {
    const requestPermission = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      setPermissionGranted(true);
      await fetchAndUpdateLocation();
    };

    requestPermission();

    // Update location every time app comes to foreground
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        fetchAndUpdateLocation();
      }
      appState.current = nextState;
    };

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSub.remove();
    };
  }, []);

  return { location, permissionGranted };
}
