/**
 * ComboList — Table/list view of combos
 *
 * Displays combos in a structured table format with:
 * - Name, Price, Groups Count, Status, Actions
 * - Fetch from API
 * - Filter by status
 * - Edit/Delete/Duplicate actions
 */
import React, { useState, useMemo } from 'react';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  StarIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { StoreCombo } from '../../services/storesApi';
import { Badge } from '../ui';

const CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (v: number | string) => CURRENCY.format(Number(v));

export interface ComboListProps {
  combos: StoreCombo[];
  loading?: boolean;
  onEdit: (combo: StoreCombo) => void;
  onDelete: (combo: StoreCombo) => void;
  onToggleActive: (combo: StoreCombo) => void;
  onToggleFeatured: (combo: StoreCombo) => void;
  onDuplicate?: (combo: StoreCombo) => void;
}

export const ComboList: React.FC<ComboListProps> = ({
  combos,
  loading: _loading = false,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleFeatured,
  onDuplicate: _onDuplicate,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const filtered = useMemo(() => {
    let list = combos;
    if (filterStatus === 'active') list = list.filter(c => c.is_active);
    if (filterStatus === 'inactive') list = list.filter(c => !c.is_active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
    }
    return list;
  }, [combos, search, filterStatus]);

  if (combos.length === 0) {
    return (
      <div className="p-8 text-center rounded border border-border-token">
        <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-fg-muted-token mb-3" />
        <h3 className="text-lg font-semibold text-fg-token mb-1">Nenhum combo encontrado</h3>
        <p className="text-sm text-fg-muted-token">
          Crie seu primeiro combo para oferecer kits de produtos aos seus clientes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted-token" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar combos..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded border border-border-token bg-surface text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-2 text-sm rounded border transition-colors ${
                filterStatus === f
                  ? 'bg-brand text-white border-brand'
                  : 'bg-surface text-fg-muted-token border-border-token hover:bg-surface-2'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center rounded border border-border-token border-dashed">
          <p className="text-sm text-fg-muted-token">
            Nenhum combo encontrado com os filtros selecionados
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-border-token">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-2 border-b border-border-token">
                <th className="text-left px-6 py-3 text-sm font-semibold text-fg-token">
                  Nome
                </th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-fg-token">
                  Preço
                </th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-fg-token">
                  Produtos
                </th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-fg-token">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-fg-token">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((combo, idx) => (
                <tr
                  key={combo.id}
                  className={`border-b border-border-token ${
                    idx % 2 === 0 ? 'bg-surface' : 'bg-surface-2'
                  } hover:bg-surface-2 transition-colors`}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-fg-token">{combo.name}</p>
                      {combo.description && (
                        <p className="text-xs text-fg-muted-token line-clamp-1">
                          {combo.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div>
                      <p className="font-semibold text-fg-token">{fmt(combo.price)}</p>
                      {combo.compare_at_price && Number(combo.compare_at_price) > combo.price && (
                        <p className="text-xs text-fg-muted-token line-through">{fmt(combo.compare_at_price)}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge tone="neutral">{combo.groups?.length ?? 0}</Badge>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {combo.is_active ? (
                        <Badge tone="success">Ativo</Badge>
                      ) : (
                        <Badge tone="neutral">Inativo</Badge>
                      )}
                      {combo.featured && (
                        <StarIconSolid className="w-4 h-4 text-yellow-500" title="Destaque" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onToggleActive(combo)}
                        title={combo.is_active ? 'Desativar' : 'Ativar'}
                        className={`p-1.5 rounded transition-colors hover:bg-surface-2 ${
                          combo.is_active ? 'text-brand' : 'text-fg-muted-token'
                        }`}
                      >
                        {combo.is_active ? (
                          <EyeIcon className="w-4 h-4" />
                        ) : (
                          <EyeSlashIcon className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => onToggleFeatured(combo)}
                        title={combo.featured ? 'Remover destaque' : 'Destacar'}
                        className={`p-1.5 rounded transition-colors hover:bg-surface-2 ${
                          combo.featured ? 'text-yellow-500' : 'text-fg-muted-token'
                        }`}
                      >
                        <StarIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(combo)}
                        className="p-1.5 rounded text-fg-muted-token hover:text-fg-token hover:bg-surface-2 transition-colors"
                        title="Editar"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(combo)}
                        className="p-1.5 rounded text-[var(--danger)] hover:bg-red-50 transition-colors"
                        title="Excluir"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ComboList;
