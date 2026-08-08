/**
 * FormStepper — transforma um formulário longo numa sequência com fim visível.
 *
 * Abas dizem "escolha uma"; passos dizem "faça nesta ordem, e acaba aqui".
 * Num cadastro que a pessoa faz pela primeira vez, a diferença é entre saber
 * quanto falta e não saber — e o modal de produto tinha seis abas soltas, sem
 * nenhuma noção de progresso.
 *
 * TRÊS COMPORTAMENTOS QUE SEPARAM UM ASSISTENTE DE UMA FILEIRA DE BOTÕES:
 *
 * 1. O primário MUDA no último passo (`Avançar →` vira `Criar produto`, e de
 *    roxo para verde). Sem isso a pessoa clica em "Avançar" achando que
 *    salvou, ou hesita no último passo sem saber qual botão conclui.
 *
 * 2. Passo com pendência é marcado — e continua clicável. Marcar sem deixar
 *    entrar seria acusar o problema e trancar a saída.
 *
 * 3. `podeAvancar` bloqueia de verdade. Deixar passar transforma o assistente
 *    em decoração: o erro só apareceria no fim, depois de a pessoa ter
 *    preenchido todo o resto.
 *
 * A trilha permite pular direto para qualquer passo: quem já conhece o
 * formulário não deve ser obrigado a percorrer a sequência.
 */
import React, { useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface PassoDeFormulario {
  id: string;
  rotulo: string;
  icone?: React.ComponentType<{ className?: string }>;
  /** Marca o passo como tendo campo faltando ou inválido. */
  pendente?: boolean;
}

export interface FormStepperProps {
  passos: PassoDeFormulario[];
  children: (passoAtivo: string) => React.ReactNode;
  onConcluir: () => void;
  rotuloConcluir: string;
  /** Retorne false para segurar o usuário no passo atual. */
  podeAvancar?: (passoAtual: string) => boolean;
  onCancelar?: () => void;
  /**
   * Ações extras no rodapé, à esquerda do primário.
   *
   * Existe para "Salvar e criar outro": é uma conclusão alternativa, não uma
   * navegação, então não cabe na trilha nem substitui o primário.
   */
  acoesExtras?: React.ReactNode;
  concluindo?: boolean;
  /**
   * Passo atual controlado pelo pai.
   *
   * Sem isso o passo é estado interno, e quem está de fora não consegue
   * mandar a pessoa para o lugar do erro — que é exatamente o que o checklist
   * e a validação precisam fazer. Omitindo, o componente se controla sozinho.
   */
  passoAtivo?: string;
  onMudarPasso?: (id: string) => void;
  className?: string;
}

export const FormStepper: React.FC<FormStepperProps> = ({
  passos,
  children,
  onConcluir,
  rotuloConcluir,
  podeAvancar,
  onCancelar,
  acoesExtras,
  concluindo = false,
  passoAtivo,
  onMudarPasso,
  className,
}) => {
  const [interno, setInterno] = useState(0);

  const controlado = passoAtivo !== undefined;
  const indiceControlado = passos.findIndex((p) => p.id === passoAtivo);
  // Passo controlado que não existe na lista (ex.: `variants` some ao criar)
  // cairia em -1 e sumiria o formulário inteiro. Volta para o primeiro.
  const i = controlado ? Math.max(0, indiceControlado) : interno;

  const atual = passos[i];
  const ultimo = i === passos.length - 1;

  const irPara = (idx: number) => {
    const alvo = passos[idx];
    if (!alvo) return;
    if (controlado) onMudarPasso?.(alvo.id);
    else setInterno(idx);
  };

  if (!atual) return null;

  const avancar = () => {
    if (podeAvancar && !podeAvancar(atual.id)) return;
    irPara(Math.min(i + 1, passos.length - 1));
  };

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {/* Trilha */}
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-border-token pb-3">
        {passos.map((p, idx) => {
          const Icone = p.icone;
          const ativo = idx === i;
          const passado = idx < i;
          return (
            <li key={p.id} className="flex items-center gap-1">
              {idx > 0 && (
                <span className="px-1 text-fg-muted-token" aria-hidden>›</span>
              )}
              <button
                type="button"
                aria-current={ativo ? 'step' : undefined}
                onClick={() => irPara(idx)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-body font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                  ativo
                    ? 'bg-brand-soft text-brand-ink'
                    : 'text-fg-muted-token hover:bg-surface-2 hover:text-fg-token'
                )}
              >
                {passado ? (
                  <CheckIcon className="h-4 w-4 shrink-0 text-[var(--success)]" aria-hidden />
                ) : Icone ? (
                  <Icone className="h-4 w-4 shrink-0" />
                ) : null}
                {p.rotulo}
                {p.pendente && (
                  <>
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-pill bg-[var(--danger)]"
                    />
                    <span className="sr-only">(requer atenção)</span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div>{children(atual.id)}</div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-token pt-4">
        {/* Progresso em TEXTO: a trilha colorida não existe para quem usa
            leitor de tela, e some para quem não distingue as cores. */}
        <p className="text-caption text-fg-muted-token">
          Passo {i + 1} de {passos.length} · {atual.rotulo}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {onCancelar && (
            <Button type="button" variant="ghost" onClick={onCancelar}>
              Cancelar
            </Button>
          )}
          {i > 0 && (
            <Button type="button" variant="outline" onClick={() => irPara(i - 1)}>
              ← Voltar
            </Button>
          )}
          {ultimo && acoesExtras}
          {ultimo ? (
            <Button type="button" variant="primary" onClick={onConcluir} disabled={concluindo}>
              {concluindo ? 'Salvando…' : rotuloConcluir}
            </Button>
          ) : (
            <Button type="button" variant="primary" onClick={avancar}>
              Avançar →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

FormStepper.displayName = 'FormStepper';

export default FormStepper;
