import React, { useId } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Props {
  titulo: string;
  descricao: string;
  /** URL de exibição (blob local ou link já enviado). Vazio = sem imagem. */
  previaUrl: string;
  nomeDoArquivo?: string;
  onEscolher: (arquivo: File) => void;
  onRemover: () => void;
  /** Chamado quando o arquivo não é imagem. */
  onInvalido: () => void;
}

/**
 * Anexar a imagem da campanha — no cabeçalho do template ou junto do texto.
 *
 * Havia duas cópias deste bloco na página, uma para cada modo, com as mesmas
 * classes cruas. Uma só agora: o que muda entre os modos é só o texto.
 *
 * O `<input type="file">` fica dentro do `<label>` e visualmente escondido
 * com `sr-only` (não `hidden`): com `display:none` ele sai da ordem do Tab e
 * quem usa teclado não consegue anexar.
 */
export const CampoDeImagem: React.FC<Props> = ({
  titulo,
  descricao,
  previaUrl,
  nomeDoArquivo,
  onEscolher,
  onRemover,
  onInvalido,
}) => {
  const id = useId();

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3">
      <div>
        <h3 id={`${id}-titulo`} className="text-body font-semibold text-fg-token">
          {titulo}
        </h3>
        <p className="mt-0.5 text-caption text-fg-muted-token">{descricao}</p>
      </div>

      {previaUrl ? (
        <div className="superficie flex items-center gap-3 p-2">
          <img
            src={previaUrl}
            alt={`Imagem escolhida: ${nomeDoArquivo || 'imagem da campanha'}`}
            className="h-16 w-16 shrink-0 rounded-md object-cover"
            loading="lazy"
            decoding="async"
          />
          <p className="min-w-0 flex-1 truncate text-body text-fg-token">
            {nomeDoArquivo || 'Imagem da campanha'}
          </p>
          <button
            type="button"
            onClick={onRemover}
            aria-label="Remover imagem"
            className="rounded-lg p-2 text-fg-muted-token transition-colors hover:bg-danger-soft hover:text-danger-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden />
          </button>
        </div>
      ) : (
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border-token p-6 text-center transition-colors hover:border-brand hover:bg-surface-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand"
        >
          <PhotoIcon className="h-8 w-8 text-fg-muted-token" aria-hidden />
          <span className="text-body font-medium text-fg-token">Escolher imagem</span>
          <span className="text-caption text-fg-muted-token">PNG, JPG ou WEBP</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => {
              const arquivo = event.target.files?.[0];
              // Limpa o campo: escolher o MESMO arquivo de novo (depois de
              // remover) não dispararia `change`.
              event.target.value = '';
              if (!arquivo) return;
              if (!arquivo.type.startsWith('image/')) {
                onInvalido();
                return;
              }
              onEscolher(arquivo);
            }}
          />
        </label>
      )}
    </section>
  );
};

export default CampoDeImagem;
