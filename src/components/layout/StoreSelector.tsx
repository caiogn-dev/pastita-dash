/**
 * Seletor de loja — identidade primeiro, controle só quando há escolha.
 *
 * Era um `<select>` nativo: aparência do sistema operacional dentro de um
 * painel com identidade própria, e presente SEMPRE — inclusive para quem tem
 * uma loja só, que é a maioria dos donos. Um seletor que só pode selecionar
 * uma coisa não é seletor; é ruído no lugar mais nobre da tela, e ensina o
 * operador a ignorar aquela região inteira.
 *
 * Duas formas, uma regra: quantas lojas existem de verdade.
 *
 *   1 loja  → o nome é IDENTIDADE. Você lê e sabe onde está. Sem gesto,
 *             porque não há escolha a fazer.
 *   2+      → botão de verdade, com avatar, marca da loja atual e busca
 *             quando a lista passa do que o olho varre de uma vez.
 *
 * A loja atual continua NA lista, marcada. Removê-la faria os itens mudarem de
 * posição a cada troca: você aprende "Pastita é a segunda" e da próxima vez
 * ela é a primeira.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, ChevronUpDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { cn } from '../../utils/cn';
import { useRootStore } from '../../stores/rootStore';

/** Acima disto a lista deixa de ser varrível de relance e ganha busca. */
const LIMITE_SEM_BUSCA = 8;

function iniciais(nome: string): string {
  return (nome || '?').trim().charAt(0).toUpperCase();
}

const Avatar: React.FC<{ nome: string; logo?: string | null }> = ({ nome, logo }) =>
  logo ? (
    <img src={logo} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
  ) : (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-brand text-badge font-bold text-on-brand">
      {iniciais(nome)}
    </span>
  );

export const StoreSelector: React.FC = () => {
  const stores = useRootStore((s) => s.stores);
  const selectedStoreId = useRootStore((s) => s.selectedStoreId);
  const setSelectedStore = useRootStore((s) => s.setSelectedStore);

  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    setTermo('');
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };
    const aoClicarFora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('mousedown', aoClicarFora);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('mousedown', aoClicarFora);
    };
  }, [aberto]);

  const atual = useMemo(
    () => stores.find((s) => s.id === selectedStoreId) ?? stores[0],
    [stores, selectedStoreId]
  );

  const filtradas = useMemo(() => {
    const q = termo.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter((s) => (s.name || '').toLowerCase().includes(q));
  }, [stores, termo]);

  if (stores.length === 0) return null;

  // Uma loja: identidade, não controle.
  if (stores.length === 1) {
    return (
      <span className="flex max-w-[180px] items-center gap-2 px-1 text-body font-semibold text-chrome-fg">
        <Avatar nome={atual?.name || ''} logo={(atual as { logo_url?: string })?.logo_url} />
        <span className="truncate">{atual?.name}</span>
      </span>
    );
  }

  const comBusca = stores.length > LIMITE_SEM_BUSCA;

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex max-w-[200px] items-center gap-2 rounded-lg border border-chrome-border px-2 py-1.5 text-body font-semibold text-chrome-fg transition-colors hover:bg-chrome-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Avatar nome={atual?.name || ''} logo={(atual as { logo_url?: string })?.logo_url} />
        <span className="truncate">{atual?.name}</span>
        <ChevronUpDownIcon className="h-4 w-4 shrink-0 text-chrome-muted" aria-hidden />
      </button>

      {aberto && (
        <div
          role="menu"
          aria-label="Trocar de loja"
          className="absolute right-0 z-50 mt-1 w-64 overflow-hidden rounded border border-border-token bg-surface shadow-flutuante"
        >
          {comBusca && (
            <div className="flex items-center gap-2 border-b border-border-token px-3">
              <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-fg-muted-token" aria-hidden />
              <input
                role="searchbox"
                aria-label="Buscar loja"
                autoFocus
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Buscar loja…"
                className="w-full bg-transparent py-2.5 text-body text-fg-token outline-none placeholder:text-fg-muted-token"
              />
            </div>
          )}

          <ul className="max-h-72 overflow-y-auto py-1">
            {filtradas.length === 0 ? (
              <li className="px-3 py-4 text-center text-caption text-fg-muted-token">
                Nenhuma loja com “{termo}”.
              </li>
            ) : (
              filtradas.map((s) => {
                const ehAtual = s.id === atual?.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="menuitem"
                      aria-current={ehAtual}
                      onClick={() => {
                        setSelectedStore(s.id);
                        setAberto(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-body transition-colors',
                        ehAtual
                          ? 'bg-surface-2 font-semibold text-fg-token'
                          : 'text-fg-muted-token hover:bg-surface-2 hover:text-fg-token'
                      )}
                    >
                      <Avatar nome={s.name} logo={(s as { logo_url?: string }).logo_url} />
                      <span className="min-w-0 flex-1 truncate">{s.name}</span>
                      {ehAtual && (
                        <CheckIcon className="h-4 w-4 shrink-0 text-brand-ink" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StoreSelector;
