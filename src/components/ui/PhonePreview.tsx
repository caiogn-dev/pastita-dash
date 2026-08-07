/**
 * PhonePreview — a página real do cliente, ao lado do formulário que a edita.
 *
 * Editar uma página pública é abstrato: você preenche "Headline", liga quatro
 * switches, e não faz ideia de como fica na tela de quem abriu o link do
 * Instagram. Sem preview, o ciclo é salvar → abrir noutra aba → voltar →
 * corrigir. São três trocas de contexto por ajuste, então ninguém ajusta: a
 * página fica do jeito que o formulário deixou.
 *
 * DUAS DECISÕES:
 *
 * 1. `<iframe>` da página de verdade, não uma reconstrução em React. Uma
 *    reconstrução vira um segundo renderizador para manter em sincronia, e no
 *    dia em que divergir o preview passa a mentir — pior que não ter preview.
 *
 * 2. A moldura de celular carrega informação: ela fixa a LARGURA em que o
 *    conteúdo vai ser lido. Headline que cabe numa div de 900px estoura em 390.
 *
 * Recarregar troca a `key`, não o `src`: atribuir a mesma URL não refaz o
 * fetch, e o preview continuaria mostrando o estado anterior ao salvar.
 */
import React, { useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

import { cn } from '../../utils/cn';

export interface PhonePreviewProps {
  /** URL da página pública. Vazio = ainda não dá para pré-visualizar. */
  url: string;
  /** Vira o `title` do iframe — é o nome que o leitor de tela anuncia. */
  titulo: string;
  /** Mostra o selo "atualiza em tempo real". Só passe quando for verdade. */
  aoVivo?: boolean;
  /** Legenda sob a moldura (ex.: a própria URL pública). */
  rodape?: React.ReactNode;
  className?: string;
}

export const PhonePreview: React.FC<PhonePreviewProps> = ({
  url,
  titulo,
  aoVivo = false,
  rodape,
  className,
}) => {
  const [geracao, setGeracao] = useState(0);

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="flex w-full items-center justify-between gap-2">
        <p className="overline">{titulo}</p>
        <div className="flex items-center gap-2">
          {aoVivo && (
            <span className="flex items-center gap-1.5 text-caption text-fg-muted-token">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--success)]" aria-hidden />
              Atualiza em tempo real
            </span>
          )}
          <button
            type="button"
            aria-label="Atualizar pré-visualização"
            onClick={() => setGeracao((g) => g + 1)}
            disabled={!url}
            className="rounded p-1.5 text-fg-muted-token transition-colors hover:bg-surface-2 hover:text-fg-token disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Moldura: 390×760 é o iPhone de referência — a menor largura em que
          vale garantir que o conteúdo respira. */}
      <div className="w-full max-w-[390px] overflow-hidden rounded-[2rem] border-8 border-fg-token/85 bg-surface shadow-xl">
        {url ? (
          <iframe
            key={geracao}
            src={url}
            title={titulo}
            className="h-[600px] w-full border-0 bg-white"
            // A página pública é nossa, mas o iframe não precisa de nada além
            // de rodar e navegar — sem top-navigation, sem downloads.
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            loading="lazy"
          />
        ) : (
          <div className="flex h-[600px] items-center justify-center p-6 text-center">
            <p className="text-body text-fg-muted-token">
              Pré-visualização indisponível: a loja ainda não tem um endereço público.
            </p>
          </div>
        )}
      </div>

      {url && (
        // Escape hatch obrigatório. Um iframe pode falhar por motivos que o JS
        // não consegue detectar de fora — cabeçalho de enquadramento, extensão
        // do navegador, rede da loja bloqueando. Sem esta saída, o dono vê um
        // erro do Chrome dentro do nosso painel e conclui que a página dele
        // está fora do ar, quando ela está no ar e funcionando.
        <p className="text-caption text-fg-muted-token">
          Não está vendo a página?{' '}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-ink underline-offset-2 hover:underline"
          >
            Abrir em nova aba
          </a>
        </p>
      )}

      {rodape && <div className="w-full max-w-[390px] text-center">{rodape}</div>}
    </div>
  );
};

PhonePreview.displayName = 'PhonePreview';

export default PhonePreview;
