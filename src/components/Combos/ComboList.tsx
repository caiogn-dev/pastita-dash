/**
 * ComboList — combos como o lojista reconhece: foto, nome, preço e o que o
 * cliente escolhe. Ligar/desligar no cardápio e destacar sem abrir o combo.
 */
import React, { useMemo, useState } from 'react';
import {
  DocumentDuplicateIcon,
  PhotoIcon,
  StarIcon,
  TrashIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { SearchInput, Switch } from '../ui';
import type { StoreCombo } from '../../services/storesApi';
import { formatCurrency } from '../../utils/formatters';

export interface ComboListProps {
  combos: StoreCombo[];
  loading?: boolean;
  onEdit: (combo: StoreCombo) => void;
  onDelete: (combo: StoreCombo) => void;
  onToggleActive: (combo: StoreCombo) => void;
  onToggleFeatured: (combo: StoreCombo) => void;
  onDuplicate?: (combo: StoreCombo) => void;
}

type Filtro = 'todos' | 'ativos' | 'fora';

const resumoDasEscolhas = (combo: StoreCombo): string => {
  const grupos = combo.groups || [];
  if (grupos.length === 0) return 'Sem escolhas';
  const opcoes = grupos.reduce(
    (soma, g) => soma + ((g.product_options?.length || 0) || (g.variant_limits?.length || 0)),
    0,
  );
  const escolhas = grupos.length === 1 ? '1 escolha' : `${grupos.length} escolhas`;
  return `${escolhas} · ${opcoes} ${opcoes === 1 ? 'opção' : 'opções'}`;
};

const CartaoDoCombo: React.FC<{
  combo: StoreCombo;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onToggleFeatured: () => void;
  onDuplicate?: () => void;
}> = ({ combo, onEdit, onDelete, onToggleActive, onToggleFeatured, onDuplicate }) => {
  const [menuAberto, setMenuAberto] = useState(false);
  const foto = combo.image_url || combo.image;

  return (
    <li className={`superficie relative flex flex-col overflow-hidden ${combo.is_active ? '' : 'opacity-70'}`}>
      <button type="button" onClick={onEdit} className="text-left" aria-label={`Editar ${combo.name}`}>
        <div className="aspect-[16/10] bg-surface-2">
          {foto ? (
            <img src={foto} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <PhotoIcon className="h-8 w-8 text-fg-muted-token" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="space-y-1 p-4 pb-2">
          <p className="truncate font-semibold text-fg-token">{combo.name}</p>
          <p className="text-sm">
            {combo.dynamic_pricing && <span className="text-fg-muted-token">a partir de </span>}
            <span className="font-semibold text-brand-ink">{formatCurrency(combo.price)}</span>
            {combo.compare_at_price && Number(combo.compare_at_price) > Number(combo.price) && (
              <span className="ml-2 text-fg-muted-token line-through">{formatCurrency(combo.compare_at_price)}</span>
            )}
          </p>
          <p className="text-xs text-fg-muted-token">{resumoDasEscolhas(combo)}</p>
        </div>
      </button>

      <div className="mt-auto flex items-center gap-2 px-4 pb-3 pt-1">
        <Switch ligado={combo.is_active} onMudar={onToggleActive} rotulo={`${combo.name} no cardápio`} />
        <span className="text-xs text-fg-muted-token">{combo.is_active ? 'No cardápio' : 'Fora'}</span>
        <button
          type="button"
          onClick={onToggleFeatured}
          aria-pressed={combo.featured}
          aria-label={combo.featured ? `Tirar destaque de ${combo.name}` : `Destacar ${combo.name}`}
          className="ml-auto rounded-lg p-1.5 text-fg-muted-token hover:bg-surface-2"
        >
          {combo.featured ? <StarSolidIcon className="h-5 w-5 text-warning-token" /> : <StarIcon className="h-5 w-5" />}
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuAberto(v => !v)}
            aria-expanded={menuAberto}
            aria-label={`Mais ações de ${combo.name}`}
            className="rounded-lg p-1.5 text-fg-muted-token hover:bg-surface-2"
          >
            <EllipsisVerticalIcon className="h-5 w-5" />
          </button>
          {menuAberto && (
            <div
              role="menu"
              className="superficie-alta absolute bottom-full right-0 z-10 mb-1 w-40 overflow-hidden py-1"
              onMouseLeave={() => setMenuAberto(false)}
            >
              {onDuplicate && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setMenuAberto(false); onDuplicate(); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-fg-token hover:bg-surface-2"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" /> Duplicar
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuAberto(false); onDelete(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger-token hover:bg-danger-soft"
              >
                <TrashIcon className="h-4 w-4" /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

export const ComboList: React.FC<ComboListProps> = ({
  combos, loading = false, onEdit, onDelete, onToggleActive, onToggleFeatured, onDuplicate,
}) => {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const contagem = useMemo(() => ({
    todos: combos.length,
    ativos: combos.filter(c => c.is_active).length,
    fora: combos.filter(c => !c.is_active).length,
  }), [combos]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return combos
      .filter(c => (filtro === 'ativos' ? c.is_active : filtro === 'fora' ? !c.is_active : true))
      .filter(c => !termo || c.name.toLowerCase().includes(termo) || c.description?.toLowerCase().includes(termo))
      .sort((a, b) => Number(b.is_active) - Number(a.is_active) || Number(b.featured) - Number(a.featured));
  }, [combos, busca, filtro]);

  const FILTROS: { id: Filtro; rotulo: string }[] = [
    { id: 'todos', rotulo: 'Todos' },
    { id: 'ativos', rotulo: 'No cardápio' },
    { id: 'fora', rotulo: 'Fora' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <SearchInput value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar combos" />
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Filtro">
          {FILTROS.map(f => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filtro === f.id}
              onClick={() => setFiltro(f.id)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                filtro === f.id ? 'border-brand bg-brand text-on-brand' : 'border-border-token text-fg-muted-token hover:bg-surface-2'
              }`}
            >
              {f.rotulo} <span className="opacity-70">{contagem[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {visiveis.length === 0 ? (
        <p className="py-16 text-center text-sm text-fg-muted-token">
          {loading ? 'Carregando…' : busca ? 'Nenhum combo encontrado' : 'Nenhum combo ainda'}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Combos">
          {visiveis.map(combo => (
            <CartaoDoCombo
              key={combo.id}
              combo={combo}
              onEdit={() => onEdit(combo)}
              onDelete={() => onDelete(combo)}
              onToggleActive={() => onToggleActive(combo)}
              onToggleFeatured={() => onToggleFeatured(combo)}
              onDuplicate={onDuplicate ? () => onDuplicate(combo) : undefined}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default ComboList;
