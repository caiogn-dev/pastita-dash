import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  loginTimestamp: number | null;
  setAuth: (token: string, user: Partial<User>) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      loginTimestamp: null,
      setAuth: (token, userData) =>
        set({
          token,
          user: userData as User,
          isAuthenticated: true,
          loginTimestamp: Date.now(),
        }),
      setUser: (user) => set({ user }),
      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          loginTimestamp: null,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
