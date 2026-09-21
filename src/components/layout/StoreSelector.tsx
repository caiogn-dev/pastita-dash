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

export interface StoreSelectorProps {
  /**
   * `coluna` é o seletor dentro da barra lateral: ocupa a largura toda e alinha
   * com os itens do menu. `navbar` é a pílula compacta da barra de cima.
   */
  variante?: 'navbar' | 'coluna';
  /** Coluna recolhida: sobra o avatar. O nome continua no accessible name. */
  estreito?: boolean;
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({
  variante = 'navbar',
  estreito = false,
}) => {
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
      <span
        title={estreito ? atual?.name : undefined}
        className={cn(
          'flex items-center gap-2 text-body font-semibold',
          variante === 'coluna'
            ? cn('w-full rounded-lg px-2 py-1.5 text-fg-token', estreito && 'justify-center px-0')
            : 'max-w-[180px] px-1 text-chrome-fg',
        )}
      >
        <Avatar nome={atual?.name || ''} logo={(atual as { logo_url?: string })?.logo_url} />
        <span className={cn('truncate', estreito && 'sr-only')}>{atual?.name}</span>
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
        // Sem rótulo próprio o botão se anunciava só pelo nome da loja atual —
        // "Pastita" não diz que aquilo TROCA de loja.
        aria-label={`Trocar de loja — atual: ${atual?.name ?? ''}`}
        title={estreito ? atual?.name : undefined}
        onClick={() => setAberto((v) => !v)}
        className={cn(
          'flex items-center gap-2 rounded-lg border text-body font-semibold',
          // `transition-colors` sozinho não anima o que ninguém declarou: a
          // borda tinha uma cor só, então mudava de nada para nada. Agora os
          // três estados (repouso, hover, aberto) são cores DIFERENTES.
          'transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
          variante === 'coluna'
            ? cn(
                'w-full px-2 py-1.5 text-fg-token',
                estreito && 'justify-center px-0',
                aberto
                  ? 'border-brand bg-brand-soft'
                  : 'border-border-token hover:border-brand hover:bg-surface-2',
              )
            : cn(
                'max-w-[200px] px-2 py-1.5 text-chrome-fg',
                aberto
                  ? 'border-brand bg-chrome-hover'
                  : 'border-chrome-border hover:border-brand hover:bg-chrome-hover',
              ),
        )}
      >
        <Avatar nome={atual?.name || ''} logo={(atual as { logo_url?: string })?.logo_url} />
        <span className={cn('min-w-0 flex-1 truncate text-left', estreito && 'sr-only')}>
          {atual?.name}
        </span>
        <ChevronUpDownIcon
          className={cn(
            'h-4 w-4 shrink-0 transition-colors',
            estreito && 'sr-only',
            aberto ? 'text-brand-ink' : 'text-fg-muted-token',
          )}
          aria-hidden
        />
      </button>

      {aberto && (
        <div
          role="menu"
          aria-label="Trocar de loja"
          // `left-0`, não `right-0`: o seletor vive na PONTA ESQUERDA da barra, e
          // um menu ancorado à direita cresce para fora da tela — os 256px
          // entravam na faixa da coluna lateral, que pinta por cima. O clique
          // funcionava, o menu abria, e nada aparecia.
          className={cn(
            'absolute left-0 z-50 mt-1 overflow-hidden rounded border border-border-token bg-surface shadow-flutuante',
            // Na coluna recolhida o menu não pode herdar os 72px do botão:
            // ficaria mais estreito que os nomes que precisa mostrar.
            variante === 'coluna' && estreito ? 'w-64 min-w-max' : 'w-64',
          )}
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
