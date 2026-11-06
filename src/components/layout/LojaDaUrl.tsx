/**
 * O endereço manda na loja ativa.
 *
 * Toda rota `/stores/:storeId/...` passa por aqui antes da tela. As telas leem
 * a loja de `useStore()` (a loja salva no navegador); sem este portão, abrir
 * `/stores/ce-saladas/products` com a Pastita salva mostrava a Pastita.
 *
 * Mão única: URL → loja ativa. A loja salva nunca reescreve o endereço. Quem
 * troca de loja num seletor usa `useTrocarDeLoja`, que leva o endereço junto.
 */
import React, { useCallback, useLayoutEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useRootStore } from '../../stores/rootStore';
import { PageLoading } from '../common/Loading';
import { EmptyState } from '../ui/EmptyState';

const PREFIXO = /^\/stores\/([^/]+)(\/.*)?$/;

/** Sub-rotas que não carregam id da loja antiga e por isso sobrevivem à troca. */
const SUBROTAS_FIXAS = new Set(['historico', 'novo', 'new', 'comanda']);

/**
 * O mesmo lugar em outra loja. Id de pedido/combo é da loja antiga: cai na
 * lista da seção. Fora de `/stores/<slug>` devolve null (nada a navegar).
 */
export function caminhoNaOutraLoja(pathname: string, slug: string): string | null {
  const m = PREFIXO.exec(pathname);
  if (!m) return null;
  const [secao, sub] = (m[2] || '').split('/').filter(Boolean);
  let resto = secao ? `/${secao}` : '';
  if (secao && sub && SUBROTAS_FIXAS.has(sub)) resto += `/${sub}`;
  return `/stores/${slug}${resto}`;
}

/** Trocar de loja num seletor: muda a loja ativa e, sob /stores/<slug>, o endereço. */
export function useTrocarDeLoja(): (storeId: string) => void {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useCallback(
    (storeId: string) => {
      const { stores, setSelectedStore } = useRootStore.getState();
      const loja = stores.find((s) => s.id === storeId);
      const destino = loja ? caminhoNaOutraLoja(pathname, loja.slug || loja.id) : null;
      setSelectedStore(storeId);
      if (destino && destino !== pathname) navigate(destino);
    },
    [navigate, pathname],
  );
}

export const LojaDaUrl: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { storeId: daUrl } = useParams<{ storeId: string }>();
  const stores = useRootStore((s) => s.stores);
  const selectedStoreId = useRootStore((s) => s.selectedStoreId);
  const setSelectedStore = useRootStore((s) => s.setSelectedStore);

  const loja = daUrl ? stores.find((s) => s.id === daUrl || s.slug === daUrl) : undefined;

  // Layout effect: a troca acontece antes da pintura, e a tela só monta
  // quando a loja ativa já é a do endereço (nem um quadro com a loja errada).
  useLayoutEffect(() => {
    if (loja && selectedStoreId !== loja.id) setSelectedStore(loja.id);
  }, [loja, selectedStoreId, setSelectedStore]);

  if (stores.length === 0) return <PageLoading />;

  if (!loja) {
    return (
      <div className="p-6">
        <EmptyState
          titulo="Você não tem acesso a esta loja"
          acao={<Link to="/" className="text-brand underline">Voltar ao início</Link>}
        />
      </div>
    );
  }

  if (selectedStoreId !== loja.id) return <PageLoading />;

  return <>{children ?? <Outlet />}</>;
};

export default LojaDaUrl;
