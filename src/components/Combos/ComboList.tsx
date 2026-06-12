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
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  StarIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { StoreCombo, StoreProduct as Product } from '../../services/storesApi';
import { Button, Modal } from '../common';

const CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (v: number | string) => CURRENCY.format(Number(v));

export interface ComboListProps {
  combos: StoreCombo[];
  products: Product[];
  loading?: boolean;
  onEdit: (combo: StoreCombo) => void;
  onDelete: (combo: StoreCombo) => void;
  onToggleActive: (combo: StoreCombo) => void;
  onToggleFeatured: (combo: StoreCombo) => void;
  onDuplicate?: (combo: StoreCombo) => void;
}

export const ComboList: React.FC<ComboListProps> = ({
  combos,
  products,
  loading = false,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleFeatured,
  onDuplicate,
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
      <div className="p-8 text-center rounded-lg border border-gray-200 dark:border-[var(--dark-border,#2a2a2a)]">
        <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-[var(--dark-text-secondary,#a1a1aa)] mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Nenhum combo encontrado</h3>
        <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
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
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar combos..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                filterStatus === f
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)] text-gray-600 dark:text-[var(--dark-text-secondary,#a1a1aa)] border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] hover:bg-gray-50 dark:hover:bg-[var(--dark-bg-hover,#161616)]'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center rounded-lg border border-gray-200 dark:border-[var(--dark-border,#2a2a2a)] border-dashed">
          <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
            Nenhum combo encontrado com os filtros selecionados
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-[var(--dark-border,#2a2a2a)]">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-[var(--dark-bg-hover,#161616)] border-b border-gray-200 dark:border-[var(--dark-border,#2a2a2a)]">
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Nome
                </th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Preço
                </th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Produtos
                </th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((combo, idx) => (
                <tr
                  key={combo.id}
                  className={`border-b border-gray-200 dark:border-[var(--dark-border,#2a2a2a)] ${
                    idx % 2 === 0
                      ? 'bg-white dark:bg-[var(--dark-bg-card,#1a1a1a)]'
                      : 'bg-gray-50 dark:bg-[var(--dark-bg-hover,#161616)]'
                  } hover:bg-gray-100 dark:hover:bg-[var(--dark-bg-card,#1a1a1a)] transition-colors`}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{combo.name}</p>
                      {combo.description && (
                        <p className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] line-clamp-1">
                          {combo.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{fmt(combo.price)}</p>
                      {combo.compare_at_price && Number(combo.compare_at_price) > combo.price && (
                        <p className="text-xs text-gray-400 line-through">{fmt(combo.compare_at_price)}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium">
                      {combo.groups?.length ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {combo.is_active ? (
                        <span className="inline-block px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-medium">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium">
                          Inativo
                        </span>
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
                        className={`p-1.5 rounded-md transition-colors ${
                          combo.is_active
                            ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-[var(--dark-bg-hover,#161616)]'
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
                        className={`p-1.5 rounded-md transition-colors ${
                          combo.featured
                            ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-[var(--dark-bg-hover,#161616)]'
                        }`}
                      >
                        <StarIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(combo)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[var(--dark-bg-hover,#161616)] transition-colors"
                        title="Editar"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(combo)}
                        className="p-1.5 rounded-md text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
