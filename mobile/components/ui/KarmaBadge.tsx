import { View, Text, StyleSheet } from 'react-native';

interface KarmaBadgeProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
}

export function KarmaBadge({ points, size = 'md' }: KarmaBadgeProps) {
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 18 : 14;
  const padding = size === 'sm' ? 4 : size === 'lg' ? 10 : 6;

  return (
    <View style={[styles.badge, { paddingHorizontal: padding + 4, paddingVertical: padding }]}>
      <Text style={[styles.text, { fontSize }]}>⚡ {points}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.35)',
  },
  text: {
    color: '#F5A623',
    fontWeight: '700',
  },
});
