/**
 * RowActions — as ações de um registro atrás de um kebab, com rótulo em texto.
 *
 * Hoje cada tabela inventa a sua. Em Cupons são três ícones nus na última
 * coluna; em Clientes não há ação alguma e você precisa abrir o detalhe para
 * fazer qualquer coisa. Três problemas:
 *
 *   - Ícone sem rótulo é adivinhação. Lápis todo mundo lê; "duplicar" não.
 *   - Cada ação come largura da tabela — e é a tabela que carrega o dado.
 *   - O destrutivo fica a um clique dos inofensivos, colado neles, bem onde o
 *     dedo cai ao rolar a lista no celular.
 *
 * O kebab resolve os três de uma vez: rótulo em texto, largura de uma coluna
 * fixa, e o destrutivo isolado por uma divisória no fim do menu.
 *
 * `stopPropagation` no gatilho é obrigatório: as linhas são clicáveis, e sem
 * ele abrir o menu navegaria para o detalhe, levando o menu junto.
 */
import React, { useEffect, useRef, useState } from 'react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

import { cn } from '../../utils/cn';

export interface RowAction {
  rotulo: string;
  onClick: () => void;
  /** Ação irreversível: pintada de vermelho e separada por divisória. */
  destrutiva?: boolean;
  desabilitada?: boolean;
  icone?: React.ReactNode;
}

export interface RowActionsProps {
  /** Nome acessível do gatilho. Inclua o registro: "Ações do cupom BEMVINDO". */
  rotulo: string;
  acoes: RowAction[];
  className?: string;
}

export const RowActions: React.FC<RowActionsProps> = ({ rotulo, acoes, className }) => {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };
    const aoClicarFora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('mousedown', aoClicarFora);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('mousedown', aoClicarFora);
    };
  }, [aberto]);

  const normais = acoes.filter((a) => !a.destrutiva);
  const destrutivas = acoes.filter((a) => a.destrutiva);

  const item = (a: RowAction) => (
    <button
      key={a.rotulo}
      type="button"
      role="menuitem"
      disabled={a.desabilitada}
      onClick={(e) => {
        e.stopPropagation();
        if (a.desabilitada) return;
        a.onClick();
        setAberto(false);
      }}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-body transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        a.destrutiva
          ? 'text-[var(--danger)] hover:bg-[var(--danger)]/10'
          : 'text-fg-token hover:bg-surface-2'
      )}
    >
      {a.icone}
      {a.rotulo}
    </button>
  );

  return (
    <div ref={raiz} className={cn('relative inline-block', className)}>
      <button
        type="button"
        aria-label={rotulo}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={(e) => {
          // A linha é clicável: sem isto, abrir o menu navega para o detalhe.
          e.stopPropagation();
          setAberto((v) => !v);
        }}
        className="rounded p-1.5 text-fg-muted-token transition-colors hover:bg-surface-2 hover:text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>

      {aberto && (
        <div
          role="menu"
          // O menu carrega o nome do REGISTRO. Sem isso, um leitor de tela
          // anuncia só "Editar" e o usuário perde de qual cupom se trata —
          // exatamente o problema que os ícones nus tinham.
          aria-label={rotulo}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 z-30 mt-1 min-w-44 overflow-hidden rounded border border-border-token bg-surface py-1 shadow-lg"
        >
          {normais.map(item)}
          {destrutivas.length > 0 && normais.length > 0 && (
            <div className="my-1 h-px bg-border-token" aria-hidden />
          )}
          {destrutivas.map(item)}
        </div>
      )}
    </div>
  );
};

RowActions.displayName = 'RowActions';

/**
 * Props para tornar uma linha inteira clicável SEM perder o teclado.
 *
 * `onClick` num `<tr>` funciona com mouse e não existe para quem navega por
 * Tab. O helper devolve foco, rótulo e Enter/Espaço para que nenhuma tabela
 * precise lembrar disso de novo.
 *
 * NÃO coloca `role="button"`. Trocar o papel de um `<tr>` o remove da estrutura
 * da tabela: o leitor de tela deixa de anunciar "linha 4 de 20" e de casar
 * célula com cabeçalho — você ganha um botão e perde a tabela inteira. Fica o
 * papel nativo de linha, com `aria-label` dizendo o que acontece ao acionar.
 *
 * O clique na linha é CONVENIÊNCIA, não o único caminho: toda tabela que usa
 * este helper também expõe a mesma ação no `RowActions` da linha, que é um
 * botão de verdade. Assim ninguém depende de um `<tr>` se comportar como
 * controle.
 *
 *   <tr {...linhaClicavel(() => abrir(p), `Abrir pedido ${p.numero}`)}>
 */
export function linhaClicavel(onAcionar: () => void, rotulo: string) {
  return {
    tabIndex: 0,
    'aria-label': rotulo,
    onClick: onAcionar,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        // Espaço rola a página por padrão; num "botão" isso é surpresa.
        e.preventDefault();
        onAcionar();
      }
    },
    className:
      'cursor-pointer transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand',
  };
}

export default RowActions;
