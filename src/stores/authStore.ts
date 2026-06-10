import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

// Lazy imports to avoid circular deps — resolved at call time, not at module load.
const clearDependentStores = () => {
  import('./chatStore').then(({ useChatStore }) => useChatStore.getState().reset());
  import('./rootStore').then(({ useRootStore }) => {
    const root = useRootStore.getState();
    root.clearAuth();
    root.setSelectedStore(null);
  });
};

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
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
      setAuth: (token, userData) =>
        set({
          token,
          user: userData as User,
          isAuthenticated: true,
        }),
      setUser: (user) => set({ user }),
      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
        clearDependentStores();
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
