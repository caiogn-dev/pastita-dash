/**
 * PageShell — o cabeçalho de toda página do painel, em um lugar só.
 *
 * Cada tela montava o próprio topo: `text-2xl` aqui, `text-xl` ali, subtítulo
 * às vezes, botões ora à direita do título ora numa linha solta embaixo, e
 * zero trilha de navegação. O resultado é que o painel parece cinco produtos
 * diferentes, e mexer no padrão vira caçada arquivo por arquivo.
 *
 * A ORDEM DOS BLOCOS É O CONTRATO, e ela responde às perguntas do operador
 * na sequência em que ele as faz:
 *
 *   trilha    → "onde eu estou?"
 *   título    → "o que é esta tela?"
 *   descrição → "para que ela serve?"
 *   ações     → "o que posso fazer aqui?"
 *   filtros   → "sobre quais dados?"
 *   conteúdo  → os dados
 *
 * Ações ficam ao lado do título (não embaixo dos filtros) porque são sobre a
 * PÁGINA; filtros ficam na faixa própria porque são sobre os DADOS. Misturar
 * os dois é o que faz o usuário clicar em "Exportar" achando que exporta o
 * filtro atual quando não exporta.
 *
 * DUAS DENSIDADES, UMA IDENTIDADE
 *
 * `documento` (padrão) é a página que se lê de cima para baixo: cardápio,
 * cupons, relatórios.
 *
 * `quadro` é a superfície que o dono deixa aberta o dia inteiro — Pedidos, KDS,
 * PDV. Elas ficaram de fora da padronização porque o cabeçalho de documento
 * comeria a altura do quadro, que é o que importa com o restaurante cheio; e
 * aí cada uma inventou o próprio topo (o de Pedidos é minúsculo, em caixa alta
 * com `tracking-[0.24em]`, e não parece nenhum outro título do painel).
 *
 * O que muda entre as duas é a DENSIDADE, não a identidade: mesmo título,
 * mesma trilha, ações no mesmo canto. O quadro só encolhe o título, dispensa a
 * descrição e entrega ao conteúdo a altura que sobra.
 */
import React from 'react';
import { Link } from 'react-router-dom';

import { cn } from '../../utils/cn';

export interface TrilhaItem {
  rotulo: string;
  /** Ausente = é a página atual; vira texto, não link. */
  href?: string;
}

export interface PageShellProps {
  titulo: string;
  /** Uma frase explicando o que a tela faz. Aparece sob o título. */
  descricao?: string;
  /** Caminho até aqui. O último item deve vir SEM href. */
  trilha?: TrilhaItem[];
  /** Botões da página (o primário por último, à direita). */
  acoes?: React.ReactNode;
  /** Chips de período, buscas, toggles de escopo. */
  filtros?: React.ReactNode;
  /**
   * `documento` (padrão) para páginas que se lê; `quadro` para superfícies de
   * trabalho que ocupam a tela — Pedidos, KDS, PDV.
   */
  variante?: 'documento' | 'quadro';
  children: React.ReactNode;
  className?: string;
}

export const PageShell: React.FC<PageShellProps> = ({
  titulo,
  descricao,
  trilha,
  acoes,
  filtros,
  children,
  className,
  variante = 'documento',
}) => {
  const temTrilha = Boolean(trilha && trilha.length > 0);
  const quadro = variante === 'quadro';

  return (
    // Sem padding externo: quem espaça é o <main> da casca. Duplicar aqui
    // dobraria a margem nas páginas que já usam o shell.
    <div
      className={cn(
        'flex flex-col',
        // O quadro precisa saber até onde pode crescer: sem `h-full` e
        // `min-h-0`, as colunas do kanban ficam com a altura do conteúdo e
        // aparece rolagem dupla, com o rodapé da coluna fora da tela.
        quadro ? 'h-full min-h-0 gap-3' : 'gap-5',
        className,
      )}
    >
      <header className={cn('flex flex-col', quadro ? 'gap-2' : 'gap-3')}>
        {temTrilha && (
          <nav aria-label="Trilha de navegação">
            <ol className="flex flex-wrap items-center gap-1.5 text-caption text-fg-muted-token">
              {trilha!.map((item, i) => {
                const ultimo = i === trilha!.length - 1;
                return (
                  <li key={`${item.rotulo}-${i}`} className="flex items-center gap-1.5">
                    {i > 0 && <span aria-hidden>›</span>}
                    {item.href && !ultimo ? (
                      <Link
                        to={item.href}
                        className="rounded hover:text-fg-token hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        {item.rotulo}
                      </Link>
                    ) : (
                      // aria-current avisa o leitor de tela que este é o destino
                      // atual — sem isso a trilha lê como uma lista de opções.
                      <span aria-current="page" className="font-medium text-fg-token">
                        {item.rotulo}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1
              className={cn(
                // `font-display` é o Cinzel da identidade do painel. O chassi
                // não o usava, e o `PageTitle` — o cabeçalho paralelo que seis
                // páginas usavam — usava: padronizar sem isto TIRAVA a marca
                // das telas convertidas, deixando-as mais genéricas que antes.
                'font-display font-bold tracking-tight text-fg-token',
                quadro ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl',
              )}
            >
              {titulo}
            </h1>
            {/* No quadro a descrição não entra: quem trabalha ali já sabe o que
                a tela faz, e a frase empurra as colunas para baixo. */}
            {descricao && !quadro && (
              <p className="mt-1 max-w-2xl text-body text-fg-muted-token">{descricao}</p>
            )}
          </div>
          {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
        </div>
      </header>

      {filtros && (
        <div className="flex flex-wrap items-center justify-between gap-3">{filtros}</div>
      )}

      <div className={cn('flex flex-col', quadro ? 'min-h-0 flex-1 gap-3' : 'gap-5')}>
        {children}
      </div>
    </div>
  );
};

PageShell.displayName = 'PageShell';

export default PageShell;
