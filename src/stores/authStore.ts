import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

// Lazy imports to avoid circular deps — resolved at call time, not at module load.
const clearDependentStores = () => {
  import('./chatStore').then(({ useChatStore }) => useChatStore.getState().reset());
  import('./storeContextStore').then(({ useStoreContextStore }) =>
    useStoreContextStore.getState().clearSelection()
  );
};

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
      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          loginTimestamp: null,
        });
        clearDependentStores();
      },
    }),
    {
      name: 'auth-storage',
      // loginTimestamp is persisted so the post-login grace period in api.ts
      // survives page reloads (e.g. user logs in and immediately refreshes).
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        loginTimestamp: state.loginTimestamp,
      }),
    }
  )
);
