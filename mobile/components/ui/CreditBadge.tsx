import { View, Text, StyleSheet } from 'react-native';

interface CreditBadgeProps {
  credits: number;
  size?: 'sm' | 'md' | 'lg';
}

export function CreditBadge({ credits, size = 'md' }: CreditBadgeProps) {
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 18 : 14;
  const padding = size === 'sm' ? 4 : size === 'lg' ? 10 : 6;

  return (
    <View style={[styles.badge, { paddingHorizontal: padding + 4, paddingVertical: padding }]}>
      <Text style={[styles.text, { fontSize }]}>💎 {credits}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(99, 179, 237, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.35)',
  },
  text: {
    color: '#63B3ED',
    fontWeight: '700',
  },
});
