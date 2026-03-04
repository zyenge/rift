import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from './api';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  karmaPoints: number;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('jwt_token');
      if (token) {
        const { data } = await api.get<AuthUser>('/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        set({ token, user: data, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync('jwt_token');
      set({ token: null, user: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/login', {
      email,
      password,
    });
    await SecureStore.setItemAsync('jwt_token', data.token);
    set({ token: data.token, user: data.user });
  },

  register: async (email, username, password) => {
    const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/register', {
      email,
      username,
      password,
    });
    await SecureStore.setItemAsync('jwt_token', data.token);
    set({ token: data.token, user: data.user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('jwt_token');
    set({ token: null, user: null });
  },

  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),
}));
