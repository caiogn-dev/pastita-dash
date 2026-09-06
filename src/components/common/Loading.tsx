import React from 'react';

import { cn } from '../../utils/cn';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  /** O que está sendo esperado. Vai para o leitor de tela, não para a tela. */
  rotulo?: string;
  className?: string;
}

const TAMANHOS = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
} as const;

/**
 * A espera do painel. ESPECIFICAÇÃO em `ui/__tests__/Loading.spec.tsx`.
 *
 * Vinte e oito arquivos desenhavam o próprio spinner porque este tinha três
 * defeitos: pintava `border-primary-500` (o terracota do storefront, que num
 * tenant é a cor DA LOJA — o spinner do painel mudava conforme a loja
 * selecionada), usava `border-b-2` em vez do anel cheio, e era mudo.
 */
export const Loading: React.FC<LoadingProps> = ({ size = 'md', rotulo, className }) => (
  <div role="status" className={cn('flex items-center justify-center', className)}>
    <div
      aria-hidden
      className={cn(
        'animate-spin rounded-full border-brand border-t-transparent',
        TAMANHOS[size],
      )}
    />
    {/* Só para quem ouve: desenhar este texto empurraria o layout. */}
    <span className="sr-only">{rotulo ?? 'Carregando…'}</span>
  </div>
);

/** Espera de uma página inteira, com o aviso escrito. */
export const PageLoading: React.FC<{ rotulo?: string }> = ({ rotulo }) => (
  <div className="flex min-h-[400px] items-center justify-center">
    <div className="text-center">
      <Loading size="lg" rotulo={rotulo} />
      <p className="mt-4 text-fg-muted-token" aria-hidden>
        {rotulo ?? 'Carregando…'}
      </p>
    </div>
  </div>
);

/** Espera que cobre a tela — só na entrada do painel, com a marca. */
export const FullPageLoading: React.FC = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas transition-colors">
    <div className="text-center">
      <img
        src="/brand/symbol-256.png"
        alt=""
        aria-hidden
        className="mx-auto mb-4 h-20 w-20 animate-pulse"
      />
      <Loading size="md" rotulo="Abrindo o Cardapidex" />
      <p className="mt-4 font-medium text-fg-muted-token" aria-hidden>
        Cardapidex
      </p>
    </div>
  </div>
);
