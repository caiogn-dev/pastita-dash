/**
 * Faixa "por que o bot parou" + "O bot já anotou", no topo do chat em modo
 * humano. Componente puro: recebe o contexto e as ações; quem busca e mantém
 * fresco é `useContextoDoBot`.
 *
 * Antes o atendente abria a conversa e lia o histórico inteiro para descobrir
 * o que o cliente queria e onde o bot tinha parado — informação que o bot já
 * tinha anotado (itens, endereço, taxa, observações, passo do pedido).
 */
import React from 'react';
import { ArrowUturnLeftIcon, HandRaisedIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { Button, SeloDeEstado } from '../../components/ui';
import type { ContextoDoBot as Contexto } from '../../services/conversations';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { AcaoDoContexto } from './useContextoDoBot';
import { fraseDoMotivo, rotuloDoPasso } from './motivoDoModoHumano';
import { haQuanto, tomDaEspera } from './tempoDeEspera';

export interface ContextoDoBotProps {
  contexto: Contexto | null;
  /** Relógio de quem desenha — mantém o componente puro e testável. */
  agora: number;
  falhou: boolean;
  acao: AcaoDoContexto;
  erroDaAcao: string | null;
  onAssumir: () => void;
  onDevolver: () => void;
}

function rotuloDaEntrega(entrega: string | boolean | null | undefined): string | null {
  if (entrega === true) return 'Entrega';
  if (entrega === false) return 'Retirada';
  if (!entrega) return null;
  const chave = entrega.toLowerCase();
  if (['delivery', 'entrega'].includes(chave)) return 'Entrega';
  if (['pickup', 'retirada', 'takeaway'].includes(chave)) return 'Retirada';
  return entrega;
}

const temValor = (v: unknown) => v !== null && v !== undefined && v !== '';

const Campo: React.FC<{ rotulo: string; children: React.ReactNode }> = ({ rotulo, children }) => (
  <div className="flex gap-2 text-caption">
    <dt className="shrink-0 text-fg-muted-token">{rotulo}</dt>
    <dd className="min-w-0 text-fg-token">{children}</dd>
  </div>
);

const Anotacoes: React.FC<{ carrinho: NonNullable<Contexto['carrinho']> }> = ({ carrinho }) => {
  const passo = rotuloDoPasso(carrinho.passo);
  const entrega = rotuloDaEntrega(carrinho.entrega);
  const itens = carrinho.itens ?? [];
  return (
    <>
      {passo && <SeloDeEstado tone="info">{passo}</SeloDeEstado>}
      {itens.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {itens.map((item, i) => (
            <li key={`${item.nome}-${i}`} className="flex justify-between gap-3 text-sm text-fg-token">
              <span className="min-w-0 truncate">{item.quantidade}× {item.nome}</span>
              {temValor(item.preco) && <span className="shrink-0 tabular-nums">{formatCurrency(item.preco)}</span>}
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-2 space-y-0.5">
        {entrega && <Campo rotulo="Como recebe">{entrega}</Campo>}
        {carrinho.endereco && <Campo rotulo="Endereço">{carrinho.endereco}</Campo>}
        {temValor(carrinho.taxa) && <Campo rotulo="Taxa">{formatCurrency(carrinho.taxa)}</Campo>}
        {carrinho.notas && <Campo rotulo="Observações">{carrinho.notas}</Campo>}
      </dl>
    </>
  );
};

const carrinhoVazio = (c: Contexto['carrinho']) =>
  !c || ((c.itens ?? []).length === 0 && !c.endereco && !c.notas && !rotuloDoPasso(c.passo));

export const ContextoDoBot: React.FC<ContextoDoBotProps> = ({
  contexto, agora, falhou, acao, erroDaAcao, onAssumir, onDevolver,
}) => {
  const jaAssumida = contexto?.motivo?.codigo === 'atendente_assumiu';
  const espera = contexto?.esperando_ha_segundos ?? 0;
  const cliente = contexto?.cliente;

  return (
    <section aria-label="Por que o bot parou" className="border-b border-border-token bg-warning-soft px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg-token">
            <HandRaisedIcon className="h-4 w-4 shrink-0 text-warning-token" aria-hidden />
            {contexto ? fraseDoMotivo(contexto.motivo, agora) : 'O bot está pausado nesta conversa'}
            {espera > 0 && !jaAssumida && (
              <SeloDeEstado tone={tomDaEspera(espera)} ponto>esperando {haQuanto(espera)}</SeloDeEstado>
            )}
          </p>
          {cliente && typeof cliente.pedidos === 'number' && (
            <p className="mt-0.5 text-caption text-fg-muted-token">
              {cliente.pedidos === 0
                ? 'Ainda não fez pedido'
                : `${cliente.pedidos} ${cliente.pedidos === 1 ? 'pedido' : 'pedidos'}`}
              {cliente.pedidos > 0 && cliente.ultimo_pedido && ` · último em ${formatDate(cliente.ultimo_pedido)}`}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!jaAssumida && (
            <Button
              size="sm"
              leftIcon={<HandRaisedIcon className="h-4 w-4" />}
              onClick={onAssumir}
              disabled={acao !== null}
              isLoading={acao === 'assumindo'}
            >
              Assumir
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            leftIcon={<ArrowUturnLeftIcon className="h-4 w-4" />}
            onClick={onDevolver}
            disabled={acao !== null}
            title="O atendimento acabou: o bot volta a responder"
          >
            Devolver ao bot
          </Button>
        </div>
      </div>

      {erroDaAcao && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-caption font-semibold text-danger-token">
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0" aria-hidden />
          {erroDaAcao}
        </p>
      )}

      <section aria-label="O bot já anotou" className="superficie mt-3 px-3 py-2.5">
        <h3 className="text-caption font-semibold text-fg-muted-token">O bot já anotou</h3>
        <div className="mt-1.5">
          {!contexto && falhou && (
            <p className="text-caption text-fg-muted-token">Não foi possível ver o que o bot anotou. Tentando de novo em instantes.</p>
          )}
          {!contexto && !falhou && <p className="text-caption text-fg-muted-token">Carregando…</p>}
          {contexto && carrinhoVazio(contexto.carrinho) && (
            <p className="text-caption text-fg-muted-token">O bot ainda não anotou nenhum pedido nesta conversa.</p>
          )}
          {contexto?.carrinho && !carrinhoVazio(contexto.carrinho) && <Anotacoes carrinho={contexto.carrinho} />}
        </div>
      </section>
    </section>
  );
};

export default ContextoDoBot;
