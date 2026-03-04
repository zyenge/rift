import { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, TextInput, ActivityIndicator, FlatList, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import MapView from 'react-native-maps';
import { RiftMap } from '../../components/map/PulseMap';
import { useLocation } from '../../hooks/useLocation';
import api from '../../lib/api';

interface PinData {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: 'INSTANT' | 'GLOBAL';
  expiresAt: string;
}

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

export default function MapScreen() {
  const router = useRouter();
  const { location } = useLocation();
  const mapRef = useRef<MapView>(null);
  const [pins, setPins] = useState<PinData[]>([]);
  const [pendingCoord, setPendingCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchPin, setSearchPin] = useState<{ latitude: number; longitude: number; name: string } | null>(null);

  const fetchNearbyRequests = useCallback(async () => {
    if (!location) return;
    try {
      const { data } = await api.get<PinData[]>('/requests', {
        params: { lat: location.lat, lng: location.lng, radius: 10000 },
      });
      setPins(data);
      setPendingCoord(null);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  }, [location]);

  // Animate map to user's location once it's available
  const hasAnimated = useRef(false);
  useEffect(() => {
    if (location && !hasAnimated.current) {
      hasAnimated.current = true;
      mapRef.current?.animateToRegion(
        { latitude: location.lat, longitude: location.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        800
      );
    }
  }, [location]);

  // Re-fetch whenever this screen comes into focus (e.g. after creating a request)
  useFocusEffect(
    useCallback(() => {
      fetchNearbyRequests();
    }, [fetchNearbyRequests])
  );

  const handlePinPress = (pin: PinData) => {
    router.push(`/request/${pin.id}`);
  };

  const handleLongPress = (coord: { latitude: number; longitude: number }) => {
    setSearchPin(null);
    setSearchResults([]);
    setPendingCoord(coord);
    router.push({
      pathname: '/request/new',
      params: { lat: coord.latitude.toString(), lng: coord.longitude.toString() },
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const q = encodeURIComponent(searchQuery.trim());
      const base = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&addressdetails=1`;
      const headers = { 'User-Agent': 'RiftApp/1.0' };

      let data: SearchResult[] = [];

      if (location) {
        // First try: strictly bounded to ~110km around user
        const { lat, lng } = location;
        const delta = 1.0;
        const viewbox = `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`;
        const localRes = await fetch(`${base}&viewbox=${viewbox}&bounded=1`, { headers });
        data = await localRes.json();
      }

      // Fallback: global search if nothing found nearby
      if (data.length === 0) {
        const globalRes = await fetch(base, { headers });
        data = await globalRes.json();
      }

      if (data.length > 0) {
        // Sort by distance from user if location available
        if (location) {
          data.sort((a, b) => {
            const dist = (r: SearchResult) => {
              const dLat = parseFloat(r.lat) - location.lat;
              const dLon = parseFloat(r.lon) - location.lng;
              return dLat * dLat + dLon * dLon;
            };
            return dist(a) - dist(b);
          });
        }
        setSearchResults(data);
      } else {
        Alert.alert('Not found', 'No results for that search');
      }
    } catch {
      Alert.alert('Error', 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    Keyboard.dismiss();
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);
    const name = result.display_name.split(',')[0];
    setSearchPin({ latitude, longitude, name });
    setSearchResults([]);
    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      500
    );
  };

  const initialRegion = location
    ? {
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : undefined;

  return (
    <View style={styles.container}>
      <RiftMap
        ref={mapRef}
        initialRegion={initialRegion}
        pins={pins}
        pendingPin={pendingCoord}
        searchPin={searchPin}
        onPinPress={handlePinPress}
        onLongPress={handleLongPress}
        onMapPress={() => setSearchResults([])}
      />

      {/* Search bar + results */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search location..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={(t) => {
              setSearchQuery(t);
              if (!t.trim()) setSearchResults([]);
            }}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searchLoading}>
            {searchLoading
              ? <ActivityIndicator size="small" color="#A8A8B8" />
              : <Ionicons name="arrow-forward" size={18} color="#A8A8B8" />
            }
          </TouchableOpacity>
        </View>

        {searchResults.length > 0 && (
          <FlatList
            style={styles.resultsList}
            data={searchResults}
            keyExtractor={(_, i) => i.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[styles.resultItem, index < searchResults.length - 1 && styles.resultItemBorder]}
                onPress={() => handleSelectResult(item)}
              >
                <Text style={styles.resultName} numberOfLines={1}>{item.display_name.split(',')[0]}</Text>
                <Text style={styles.resultAddress} numberOfLines={1}>
                  {item.display_name.split(',').slice(1, 3).join(',').trim()}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (!location) {
            Alert.alert('Location needed', 'Waiting for your location...');
            return;
          }
          router.push({
            pathname: '/request/new',
            params: { lat: location.lat.toString(), lng: location.lng.toString() },
          });
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.refreshBtn} onPress={fetchNearbyRequests}>
        <Text style={styles.refreshText}>↻</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrapper: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(18, 18, 20, 0.92)',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#F2F2F5',
  },
  searchBtn: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    backgroundColor: 'rgba(18, 18, 20, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    maxHeight: 220,
  },
  resultItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  resultItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  resultName: { fontSize: 14, fontWeight: '600', color: '#F2F2F5' },
  resultAddress: { fontSize: 12, color: '#5A5A70', marginTop: 1 },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EB7A9F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(235, 122, 159, 0.50)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
  refreshBtn: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(18, 18, 20, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  refreshText: { fontSize: 22, color: '#A8A8B8' },
});
