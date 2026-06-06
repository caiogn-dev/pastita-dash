/**
 * useComboValidation - Hook for real-time combo selection validation
 *
 * Validates:
 * - Required groups have selections
 * - Min/max selections per group
 * - Variant limits
 * - Stock availability
 * - Duplicate variants (when not allowed)
 */
import { useCallback, useState } from 'react';
import { StoreCombo } from '../services/storesApi';

interface ValidationResult {
  errors: string[];
  isValid: boolean;
}

export const useComboValidation = (combo: StoreCombo | null) => {
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);

  const validateSelections = useCallback(
    (selections: Record<string, string[]>): ValidationResult => {
      if (!combo || !combo.groups || combo.groups.length === 0) {
        setErrors([]);
        setIsValid(true);
        return { errors: [], isValid: true };
      }

      const validationErrors: string[] = [];

      // Validate each group
      combo.groups.forEach((group) => {
        const groupId = String(group.id);
        const selected = selections[groupId] || [];

        // Check if required group has selections
        if (group.is_required && selected.length === 0) {
          validationErrors.push(
            `Grupo '${group.product_name}' é obrigatório. Selecione pelo menos ${group.min_selections} item(ns).`
          );
        }

        // Check minimum selections
        if (selected.length > 0 && selected.length < group.min_selections) {
          validationErrors.push(
            `Grupo '${group.product_name}': selecione no mínimo ${group.min_selections} item(ns). Você selecionou ${selected.length}.`
          );
        }

        // Check maximum selections
        if (selected.length > group.max_selections) {
          validationErrors.push(
            `Grupo '${group.product_name}': selecione no máximo ${group.max_selections} item(ns). Você selecionou ${selected.length}.`
          );
        }

        // Check duplicates if not allowed
        if (!group.allow_duplicate_variants && selected.length > 0) {
          const uniqueIds = new Set(selected);
          if (uniqueIds.size !== selected.length) {
            const duplicates = selected.filter((id, idx) => selected.indexOf(id) !== idx);
            const uniqueDuplicates = [...new Set(duplicates)];
            const duplicateNames = uniqueDuplicates
              .map((id) => {
                const vl = group.variant_limits?.find((v) => v.variant_id === id);
                return vl?.variant_name || id;
              })
              .join(', ');

            validationErrors.push(
              `Grupo '${group.product_name}': não é permitido selecionar variantes duplicadas. Você selecionou múltiplas vezes: ${duplicateNames}.`
            );
          }
        }

        // Check variant limits and stock
        if (group.variant_limits && group.variant_limits.length > 0) {
          const variantCounts: Record<string, number> = {};
          selected.forEach((variantId) => {
            variantCounts[variantId] = (variantCounts[variantId] || 0) + 1;
          });

          Object.entries(variantCounts).forEach(([variantId, count]) => {
            const variantLimit = group.variant_limits?.find((vl) => vl.variant_id === variantId);

            if (!variantLimit) {
              validationErrors.push(
                `Variante desconhecida em '${group.product_name}': ${variantId}`
              );
              return;
            }

            // Check variant limit
            if (count > variantLimit.max_selections) {
              validationErrors.push(
                `Variante '${variantLimit.variant_name}' em '${group.product_name}': no máximo ${variantLimit.max_selections} seleção(ões) permitida(s). Você selecionou ${count}.`
              );
            }

            // Check stock
            if (variantLimit.stock === 0) {
              validationErrors.push(
                `Variante '${variantLimit.variant_name}' em '${group.product_name}': sem estoque disponível.`
              );
            } else if (count > variantLimit.stock) {
              validationErrors.push(
                `Variante '${variantLimit.variant_name}' em '${group.product_name}': estoque insuficiente. Disponível: ${variantLimit.stock}, solicitado: ${count}.`
              );
            }
          });
        }
      });

      const isValidResult = validationErrors.length === 0;
      setErrors(validationErrors);
      setIsValid(isValidResult);

      return { errors: validationErrors, isValid: isValidResult };
    },
    [combo]
  );

  return {
    validateSelections,
    errors,
    isValid,
  };
};
