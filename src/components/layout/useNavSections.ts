/**
 * A árvore de navegação, montada uma vez, consumida por todos.
 *
 * A Navbar montava as seções internamente. Quando a coluna lateral e a trilha
 * passaram a precisar da mesma árvore, a saída fácil seria copiar as quatro
 * linhas de `useMemo` para cada uma — e aí `automationEnabled` mudaria em um
 * lugar e não no outro, do jeito clássico.
 *
 * Um hook. Três consumidores.
 */
import { useMemo } from 'react';

import { useStore } from '../../hooks/useStore';
import { useTotalUnreadCount } from '../../stores/chatStore';
import { useAutomationEnabled } from '../../hooks/useAutomationEnabled';
import { buildNavSections, type NavSection } from './navSections';

export function useNavSections(): NavSection[] {
  const { store } = useStore();
  const totalUnreadCount = useTotalUnreadCount();
  const automationEnabled = useAutomationEnabled();

  const storeKey = store?.slug || store?.id || null;
  const storeHref = useMemo(
    () => (path: string) => (storeKey ? `/stores/${storeKey}/${path}` : '/stores'),
    [storeKey]
  );

  return useMemo(
    () =>
      buildNavSections({
        storeHref,
        unreadBadge:
          totalUnreadCount > 0
            ? String(totalUnreadCount > 99 ? '99+' : totalUnreadCount)
            : undefined,
        automationEnabled,
      }),
    [storeHref, totalUnreadCount, automationEnabled]
  );
}

export default useNavSections;
