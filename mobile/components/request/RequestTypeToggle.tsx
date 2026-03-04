import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type RequestType = 'INSTANT' | 'GLOBAL';

interface RequestTypeToggleProps {
  value: RequestType;
  onChange: (type: RequestType) => void;
}

export function RequestTypeToggle({ value, onChange }: RequestTypeToggleProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.option, value === 'INSTANT' && styles.activeInstant]}
        onPress={() => onChange('INSTANT')}
      >
        <Text style={[styles.icon]}>⚡</Text>
        <Text style={[styles.label, value === 'INSTANT' && styles.activeLabel]}>
          Instant
        </Text>
        <Text style={[styles.sub, value === 'INSTANT' && styles.activeSub]}>
          ≤2km · 15 min
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, value === 'GLOBAL' && styles.activeGlobal]}
        onPress={() => onChange('GLOBAL')}
      >
        <Text style={styles.icon}>🌐</Text>
        <Text style={[styles.label, value === 'GLOBAL' && styles.activeLabel]}>
          Global
        </Text>
        <Text style={[styles.sub, value === 'GLOBAL' && styles.activeSub]}>
          Anywhere · 48 hr
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  activeInstant: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF0F0',
  },
  activeGlobal: {
    borderColor: '#E27396',
    backgroundColor: '#F0F0FF',
  },
  icon: { fontSize: 24, marginBottom: 4 },
  label: { fontSize: 16, fontWeight: '700', color: '#333' },
  activeLabel: { color: '#111' },
  sub: { fontSize: 12, color: '#999', marginTop: 2 },
  activeSub: { color: '#666' },
});
