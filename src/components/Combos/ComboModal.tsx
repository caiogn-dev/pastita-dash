/**
 * ComboModal — Modal for viewing and selecting a combo in storefront context
 *
 * Features:
 * - Displays combo info (name, price, description)
 * - Real-time validation as customer selects variants
 * - Shows validation errors (required group, min/max, variant limits)
 * - Disables checkboxes when: stock = 0, variant limit reached
 * - Real-time feedback on selections
 * - "Adicionar ao Carrinho" button (disabled until valid)
 */
import React, { useState, useMemo, useEffect } from 'react';
import { XMarkIcon, CheckIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Button, Modal } from '../common';
import { StoreCombo } from '../../services/storesApi';
import { useComboValidation } from '../../hooks/useComboValidation';

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
  const { validateSelections, errors, isValid } = useComboValidation(combo);

  useEffect(() => {
    if (!isOpen || !combo) {
      setSelectedVariants({});
      return;
    }
    // Initialize selection state for each group
    const init: Record<string, string[]> = {};
    combo.groups?.forEach((group) => {
      init[String(group.id)] = [];
    });
    setSelectedVariants(init);
  }, [isOpen, combo]);

  // Validate on every selection change
  useEffect(() => {
    if (combo) {
      validateSelections(selectedVariants);
    }
  }, [selectedVariants, combo, validateSelections]);

  const handleToggleVariant = (groupId: string, variantId: string, canSelect: boolean) => {
    if (!canSelect) {
      return; // Prevent selection if checkbox is disabled
    }

    setSelectedVariants(prev => {
      const current = prev[groupId] || [];
      const isSelected = current.includes(variantId);
      return {
        ...prev,
        [groupId]: isSelected ? current.filter(v => v !== variantId) : [...current, variantId],
      };
    });
  };

  const getVariantDisabledReason = (groupId: string, variantId: string): string | null => {
    if (!combo) return null;

    const group = combo.groups?.find(g => String(g.id) === groupId);
    if (!group) return null;

    const variantLimit = group.variant_limits?.find(vl => vl.variant_id === variantId);
    const variant = variantLimit?.variant_id ? variantLimit : null;

    // Check stock
    if (variantLimit && variantLimit.stock === 0) {
      return 'Sem estoque';
    }

    // Check variant limit reached
    const currentCount = (selectedVariants[groupId] || []).filter(v => v === variantId).length;
    const maxForVariant = variantLimit?.max_selections || group.max_selections;
    if (currentCount >= maxForVariant) {
      return `Limite atingido (${maxForVariant}/${maxForVariant})`;
    }

    return null;
  };

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

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex gap-3">
              <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                {errors.map((error, idx) => (
                  <p key={idx} className="text-sm text-red-700 dark:text-red-300">
                    {error}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Items/Groups */}
        {!combo.groups || combo.groups.length === 0 ? (
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-[var(--dark-bg-hover,#161616)]">
            <p className="text-sm text-gray-600 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
              Este combo não possui grupos de produtos. Configure no painel administrativo.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {combo.groups.map((group) => {
              const groupId = String(group.id);
              const selected = selectedVariants[groupId] || [];
              const hasError = errors.some(e => e.includes(group.product_name));

              return (
                <div key={group.id} className="space-y-3">
                  {/* Group Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {group.product_name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] mt-1">
                        {group.is_required ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            Obrigatório: {group.min_selections} - {group.max_selections} seleção(ões)
                          </span>
                        ) : (
                          <span>
                            Opcional: até {group.max_selections} seleção(ões)
                          </span>
                        )}
                      </p>
                    </div>
                    {selected.length > 0 && !hasError && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                        {selected.length}/{group.max_selections}
                      </span>
                    )}
                  </div>

                  {/* Variants List */}
                  <div className="space-y-2">
                    {group.variant_limits && group.variant_limits.length > 0 ? (
                      group.variant_limits.map((variantLimit) => {
                        const variantId = variantLimit.variant_id;
                        const isSelected = selected.includes(variantId);
                        const disabledReason = getVariantDisabledReason(groupId, variantId);
                        const canSelect = !disabledReason && selected.length < group.max_selections;
                        const currentVariantCount = selected.filter(v => v === variantId).length;
                        const maxForVariant = variantLimit.max_selections;

                        return (
                          <label
                            key={variantLimit.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                              disabledReason
                                ? 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
                                : 'border-gray-200 dark:border-[var(--dark-border,#2a2a2a)] cursor-pointer hover:bg-gray-50 dark:hover:bg-[var(--dark-bg-hover,#161616)]'
                            } ${
                              isSelected && !disabledReason ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleVariant(groupId, variantId, canSelect)}
                              disabled={!canSelect}
                              className="w-4 h-4 rounded border-gray-300 dark:border-[var(--dark-border,#2a2a2a)] text-brand-600 focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {variantLimit.variant_name}
                                {variantLimit.variant_sku && (
                                  <span className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] ml-2">
                                    ({variantLimit.variant_sku})
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                                  {variantLimit.stock > 0 ? (
                                    <>Estoque: {variantLimit.stock}</>
                                  ) : (
                                    <span className="text-red-600 dark:text-red-400 font-medium">Sem estoque</span>
                                  )}
                                </span>
                                {maxForVariant > 1 && (
                                  <span className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                                    • Máx. {maxForVariant}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Selection Status / Disabled Reason */}
                            <div className="text-right">
                              {isSelected ? (
                                <CheckIcon className="w-5 h-5 text-brand-600" />
                              ) : disabledReason ? (
                                <span className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] font-medium">
                                  {disabledReason}
                                </span>
                              ) : null}
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                          Nenhuma variante configurada para este grupo.
                        </p>
                      </div>
                    )}
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
              loading="lazy"
              decoding="async"
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
