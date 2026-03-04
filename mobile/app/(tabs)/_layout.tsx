import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#EB7A9F',
        tabBarInactiveTintColor: '#5A5A70',
        tabBarStyle: {
          backgroundColor: '#111115',
          borderTopColor: '#2C2C34',
          borderTopWidth: 1,
        },
        headerStyle: { backgroundColor: '#0D0D0F' },
        headerTintColor: '#F2F2F5',
        headerTitleStyle: { fontWeight: '700', color: '#F2F2F5' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          headerTitle: 'Rift',
          tabBarIcon: ({ color }) => (
            <Ionicons name="radio-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'My Requests',
          tabBarIcon: ({ color }) => (
            <Ionicons name="albums-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="aperture-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
