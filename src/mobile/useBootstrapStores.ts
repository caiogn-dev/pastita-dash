import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useRootStore } from '../stores/rootStore';
import { getStores } from '../services/storesApi';

/**
 * Loads the user's stores into the global store once after auth, regardless of
 * which layout (desktop/mobile) is active. rootStore.setStores auto-selects the
 * first store when none is selected, which unblocks the mobile screens.
 */
export function useBootstrapStores(): void {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isAuthed || fetchedRef.current) return;
    if (useRootStore.getState().stores.length > 0) return;
    fetchedRef.current = true;
    getStores()
      .then((res) => useRootStore.getState().setStores(res.results || []))
      .catch(() => { fetchedRef.current = false; });
  }, [isAuthed]);
}
