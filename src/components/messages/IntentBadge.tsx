import React from 'react';
import { cn } from '../../utils/cn';
import { intentTypeLabels } from '../../services';
import type { IntentType } from '../../types';

interface IntentBadgeProps {
  intent: IntentType;
  method?: 'regex' | 'llm' | 'none';
  confidence?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Componente para exibir a intenção detectada de uma mensagem
 * Mostra badge colorido baseado no tipo de intenção
 */
export const IntentBadge: React.FC<IntentBadgeProps> = ({
  intent,
  method,
  confidence,
  showLabel = true,
  size = 'sm',
  className,
}) => {
  // Cores baseadas no método de detecção
  const methodColors = {
    regex: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    llm: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    none: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  };

  // Cores baseadas na intenção
  const intentColors: Record<string, string> = {
    greeting: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    price_check: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    menu_request: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    create_order: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    track_order: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    payment_status: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    human_handoff: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    unknown: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const label = intentTypeLabels[intent] || intent;
  const colorClass = intentColors[intent] || methodColors[method || 'none'];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          sizeClasses[size],
          colorClass
        )}
        title={`Intenção: ${label}${method ? ` (${method.toUpperCase()})` : ''}${confidence ? ` - Confiança: ${(confidence * 100).toFixed(0)}%` : ''}`}
      >
        {showLabel && label}
      </span>

      {/* Indicador de método */}
      {method && (
        <span
          className={cn(
            'text-xs',
            method === 'regex' && 'text-green-600 dark:text-green-400',
            method === 'llm' && 'text-purple-600 dark:text-purple-400',
            method === 'none' && 'text-fg-muted-token'
          )}
          title={method === 'regex' ? 'Detectado via Regex (rápido)' : method === 'llm' ? 'Detectado via IA' : 'Não detectado'}
        >
          {method === 'regex' && '⚡'}
          {method === 'llm' && '🤖'}
          {method === 'none' && '?'}
        </span>
      )}

      {/* Indicador de confiança */}
      {confidence !== undefined && confidence > 0 && (
        <div className="flex items-center gap-1" title={`Confiança: ${(confidence * 100).toFixed(0)}%`}>
          <div className="w-8 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                confidence >= 0.9 && 'bg-green-500',
                confidence >= 0.7 && confidence < 0.9 && 'bg-yellow-500',
                confidence < 0.7 && 'bg-red-500'
              )}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <span className="text-xs text-fg-muted-token">
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default IntentBadge;
