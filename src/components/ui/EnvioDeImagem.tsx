/**
 * O jeito de pedir uma imagem: clicar, arrastar ou colar (Ctrl+V de um print
 * ou de uma foto copiada). Medido em 13/10: oito telas enviavam imagem, cada
 * uma de um jeito — umas aceitavam arrastar, outras não, nenhuma aceitava
 * colar, e a prévia ora existia, ora não.
 *
 * O `<input type="file">` fica dentro do `<label>`, escondido com `sr-only`
 * (não `hidden`): com `display:none` ele sai da ordem do Tab e quem usa
 * teclado não consegue enviar.
 */
import React, { useId, useState } from 'react';
import { ArrowUpTrayIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';

import { cn } from '../../utils/cn';

export interface EnvioDeImagemProps {
  rotulo: string;
  /** URL de exibição (blob local ou link já enviado). Vazio = sem imagem. */
  previaUrl?: string | null;
  onEscolher: (arquivo: File) => void;
  onRemover?: () => void;
  /** O arquivo não é imagem. */
  onInvalido?: (arquivo: File) => void;
  dica?: React.ReactNode;
  aceitar?: string;
  /** Desenho da prévia: logo é quadrado, capa e banner são largos. */
  formato?: 'quadrado' | 'largo';
  desabilitado?: boolean;
  className?: string;
}

const ACEITAR_PADRAO = 'image/png,image/jpeg,image/webp';

export const EnvioDeImagem: React.FC<EnvioDeImagemProps> = ({
  rotulo,
  previaUrl,
  onEscolher,
  onRemover,
  onInvalido,
  dica,
  aceitar = ACEITAR_PADRAO,
  formato = 'quadrado',
  desabilitado = false,
  className,
}) => {
  const id = useId();
  const [arrastando, setArrastando] = useState(false);
  const minusculo = rotulo.toLowerCase();

  const receber = (arquivo: File | undefined | null) => {
    if (!arquivo || desabilitado) return;
    if (!arquivo.type.startsWith('image/')) {
      onInvalido?.(arquivo);
      return;
    }
    onEscolher(arquivo);
  };

  const campoDeArquivo = (rotuloAcessivel?: string) => (
    <input
      id={rotuloAcessivel ? undefined : `${id}-arquivo`}
      type="file"
      accept={aceitar}
      className="sr-only"
      disabled={desabilitado}
      aria-label={rotuloAcessivel}
      onChange={(e) => {
        const arquivo = e.target.files?.[0];
        // Limpa: escolher o MESMO arquivo de novo (depois de remover) não
        // dispararia `change`.
        e.target.value = '';
        receber(arquivo);
      }}
    />
  );

  return (
    <div
      data-area-de-envio
      data-arrastando={arrastando ? 'true' : undefined}
      className={cn('flex flex-col gap-1.5', className)}
      onDragOver={(e) => {
        e.preventDefault();
        if (!desabilitado) setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastando(false);
        receber(e.dataTransfer?.files?.[0]);
      }}
      onPaste={(e) => {
        const arquivo = e.clipboardData?.files?.[0];
        if (!arquivo) return;
        e.preventDefault();
        receber(arquivo);
      }}
    >
      <label htmlFor={previaUrl ? undefined : `${id}-arquivo`} className="text-sm font-medium text-fg-token">
        {rotulo}
      </label>

      {previaUrl ? (
        <div
          className={cn(
            'flex items-center gap-3 rounded border border-border-input bg-surface p-2 transition-colors',
            arrastando && 'border-brand bg-brand-soft'
          )}
        >
          <img
            src={previaUrl}
            alt={rotulo}
            className={cn('shrink-0 rounded object-cover', formato === 'largo' ? 'h-14 w-24' : 'h-14 w-14')}
            decoding="async"
          />
          <span className="min-w-0 flex-1" />
          <label
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded px-3 text-sm font-medium text-fg-token transition-colors hover:bg-surface-2 focus-within:ring-2 focus-within:ring-brand"
          >
            <ArrowUpTrayIcon className="h-4 w-4" aria-hidden />
            Trocar
            {campoDeArquivo(`Trocar ${minusculo}`)}
          </label>
          {onRemover && (
            <button
              type="button"
              onClick={onRemover}
              disabled={desabilitado}
              aria-label={`Remover ${minusculo}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded text-fg-muted-token transition-colors hover:bg-danger-soft hover:text-danger-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <TrashIcon className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      ) : (
        <label
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-border-input px-4 py-5 text-center transition-colors',
            'hover:border-brand hover:bg-surface-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand',
            arrastando && 'border-brand bg-brand-soft',
            desabilitado && 'cursor-not-allowed opacity-60'
          )}
        >
          <PhotoIcon className="h-7 w-7 text-fg-muted-token" aria-hidden />
          <span className="text-sm font-medium text-fg-token">{arrastando ? 'Solte aqui' : 'Escolher imagem'}</span>
          <span className="text-xs text-fg-muted-token">ou arraste, ou cole</span>
          {campoDeArquivo()}
        </label>
      )}

      {dica && <p className="text-xs text-fg-muted-token">{dica}</p>}
    </div>
  );
};

EnvioDeImagem.displayName = 'EnvioDeImagem';

export default EnvioDeImagem;
