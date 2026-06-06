/**
 * ComboModal — Modal for viewing and selecting a combo in storefront context
 *
 * Displays:
 * - Combo info (name, price, description)
 * - Groups with product variant checkboxes
 * - Real-time validation
 * - "Adicionar ao Carrinho" button
 */
import React, { useState, useMemo, useEffect } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Button, Modal } from '../common';
import { StoreCombo } from '../../services/storesApi';

const CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (v: number | string) => CURRENCY.format(Number(v));

export interface ComboModalProps {
  combo: StoreCombo | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (combo: StoreCombo, selectedItems: Record<string, string[]>) => Promise<void>;
  isLoading?: boolean;
}

export const ComboModal: React.FC<ComboModalProps> = ({
  combo,
  isOpen,
  onClose,
  onAddToCart,
  isLoading = false,
}) => {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!isOpen || !combo) {
      setSelectedVariants({});
      return;
    }
    // Initialize selection state for each group
    const init: Record<string, string[]> = {};
    combo.items.forEach((item, idx) => {
      init[`group_${idx}`] = [];
    });
    setSelectedVariants(init);
  }, [isOpen, combo]);

  const handleToggleVariant = (groupKey: string, variantId: string) => {
    setSelectedVariants(prev => {
      const current = prev[groupKey] || [];
      const isSelected = current.includes(variantId);
      return {
        ...prev,
        [groupKey]: isSelected ? current.filter(v => v !== variantId) : [...current, variantId],
      };
    });
  };

  const isValid = useMemo(() => {
    if (!combo || combo.items.length === 0) return true;
    // Check if minimum requirements are met for required groups
    return combo.items.every((item, idx) => {
      const key = `group_${idx}`;
      const selected = selectedVariants[key] || [];
      return selected.length > 0;
    });
  }, [combo, selectedVariants]);

  const handleAddToCart = async () => {
    if (!combo || !isValid) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (onAddToCart) {
        await onAddToCart(combo, selectedVariants);
      } else {
        toast.success('Combo adicionado ao carrinho!');
        onClose();
      }
    } catch (err) {
      toast.error('Erro ao adicionar combo ao carrinho');
    }
  };

  if (!combo) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={combo.name} size="lg">
      <div className="space-y-6">
        {/* Header Info */}
        <div>
          <p className="text-gray-600 dark:text-[var(--dark-text-secondary,#a1a1aa)]">{combo.description}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(combo.price)}</span>
            {combo.compare_at_price && Number(combo.compare_at_price) > combo.price && (
              <span className="text-sm text-gray-400 line-through">{fmt(combo.compare_at_price)}</span>
            )}
          </div>
        </div>

        {/* Items/Groups */}
        {combo.items.length === 0 ? (
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-[var(--dark-bg-hover,#161616)]">
            <p className="text-sm text-gray-600 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
              Este combo não possui produtos pré-selecionados. Personalize sua escolha!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {combo.items.map((item, idx) => {
              const groupKey = `group_${idx}`;
              const selected = selectedVariants[groupKey] || [];

              return (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {item.product_name}
                      {item.quantity > 1 && <span className="text-sm text-gray-500"> (x{item.quantity})</span>}
                    </h4>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                      Obrigatório
                    </span>
                  </div>
                  <div className="space-y-2 pl-0">
                    {/* Since we don't have variants from API yet, we show the product itself as selectable */}
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-[var(--dark-border,#2a2a2a)] cursor-pointer hover:bg-gray-50 dark:hover:bg-[var(--dark-bg-hover,#161616)] transition-colors">
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={() => handleToggleVariant(groupKey, item.id)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] text-brand-600 focus:ring-2 focus:ring-brand-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                            Quantidade: {item.quantity}
                          </p>
                        )}
                      </div>
                      {selected.includes(item.id) && (
                        <CheckIcon className="w-5 h-5 text-brand-600" />
                      )}
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Image */}
        {combo.image_url && (
          <div className="rounded-lg overflow-hidden">
            <img
              src={combo.image_url}
              alt={combo.name}
              className="w-full h-48 object-cover"
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-[var(--dark-border,#2a2a2a)]">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleAddToCart}
            disabled={!isValid || isLoading}
            className="flex-1"
          >
            {isLoading ? 'Adicionando...' : 'Adicionar ao Carrinho'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ComboModal;
