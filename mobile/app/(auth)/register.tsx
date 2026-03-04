import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '../../lib/auth.store';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);

  const handleRegister = async () => {
    if (!email || !username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), username.trim(), password);
    } catch (err: any) {
      const e = err?.response?.data?.error;
      const msg = typeof e === 'string' ? e : e ? Object.entries(e).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join('\n') : err?.message ?? 'Something went wrong';
      Alert.alert('Registration failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>Rift</Text>
        <Text style={styles.subtitle}>Join the network</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#5A5A70"
        />
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholderTextColor="#5A5A70"
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 chars)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#5A5A70"
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/login" style={styles.link}>
          Already have an account? <Text style={styles.linkBold}>Sign in</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F' },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    color: '#EB7A9F',
  },
  subtitle: {
    fontSize: 16,
    color: '#A8A8B8',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#2C2C34',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    marginBottom: 14,
    backgroundColor: '#222228',
    color: '#F2F2F5',
  },
  button: {
    backgroundColor: '#EB7A9F',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: 'rgba(235, 122, 159, 0.30)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: {
    textAlign: 'center',
    marginTop: 24,
    color: '#A8A8B8',
    fontSize: 14,
  },
  linkBold: { color: '#EB7A9F', fontWeight: '700' },
});
