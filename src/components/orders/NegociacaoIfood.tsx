/**
 * Plataforma de Negociação do iFood no topo do modal do pedido (critério de
 * homologação). O cliente pede algo depois do pedido feito — cancelar,
 * reembolso, mais tempo — e a loja tem um prazo para responder; sem resposta,
 * o iFood decide sozinho (`se_nao_responder`).
 *
 * Aberta: faixa destacada com contagem regressiva e as respostas possíveis.
 * Resolvida: uma linha discreta com o resultado. Relê a cada 30 s enquanto a
 * disputa pode mudar (ABERTA/RESPONDIDA) e o modal está montado.
 */
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ScaleIcon } from '@heroicons/react/24/outline';

import { getErrorMessage } from '../../services';
import {
  ifoodPedidoService,
  type AlternativaDaDisputa,
  type DisputaIfood,
  type RespostaDaDisputa,
} from '../../services/ifoodPedido';
import { formatCurrency } from '../../utils/formatters';
import { Button, Campo, Input, Select } from '../ui';
import { ContagemRegressiva } from './ContagemRegressiva';

const ATUALIZAR_A_CADA_MS = 30_000;

const PEDIDO_DO_CLIENTE: Record<DisputaIfood['acao'], string> = {
  CANCELLATION: 'cancelamento do pedido',
  PARTIAL_CANCELLATION: 'cancelamento de parte do pedido',
  PROPOSED_AMOUNT_REFUND: 'reembolso de valor',
  PROPOSED_ADDITIONAL_TIME: 'mais tempo',
};

const RESULTADO: Record<Exclude<DisputaIfood['status'], 'ABERTA'>, string> = {
  ACCEPTED: 'Aceita',
  REJECTED: 'Recusada',
  EXPIRED: 'Expirou',
  ALTERNATIVE_REPLIED: 'Contraproposta aceita',
  RESPONDIDA: 'Respondida',
};

const SEM_RESPOSTA: Partial<Record<DisputaIfood['se_nao_responder'], string>> = {
  ACCEPT_CANCELLATION: 'Sem resposta: cancela',
  REJECT_CANCELLATION: 'Sem resposta: recusa',
};

const MOTIVOS_DA_NEGOCIACAO: Record<string, string> = {
  PRODUCT_QUALITY: 'Qualidade do produto',
  CUSTOMER_SATISFACTION: 'Satisfação do cliente',
  WRONG_ORDER: 'Pedido errado',
  LATE_DELIVERY: 'Entrega atrasada',
  HIGH_STORE_DEMAND: 'Loja com muitos pedidos',
  INVENTORY_CHECK: 'Conferência de estoque',
  SYSTEM_ISSUE: 'Problema no sistema',
  UNKNOWN_ISSUE: 'Outro problema',
  CUSTOMER_REQUEST: 'Pedido do cliente',
};

const rotuloDoMotivo = (codigo: string) =>
  MOTIVOS_DA_NEGOCIACAO[codigo] ?? codigo.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const opcoesDeMotivo = (codigos: string[]) => codigos.map((c) => ({ valor: c, rotulo: rotuloDoMotivo(c) }));

const ROTULO_DA_ALTERNATIVA: Record<AlternativaDaDisputa['type'], string> = {
  REFUND: 'Oferecer reembolso',
  BENEFIT: 'Oferecer crédito',
  ADDITIONAL_TIME: 'Pedir mais tempo',
};

const podeMudar = (d: DisputaIfood | null) => d?.status === 'ABERTA' || d?.status === 'RESPONDIDA';

/** "12,50" → 1250; inválido → null. */
const centavos = (texto: string): number | null => {
  const t = texto.trim().replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
};

type Resposta =
  | { tipo: 'aceitar' }
  | { tipo: 'recusar' }
  | { tipo: 'alternativa'; alternativa: AlternativaDaDisputa };

/** Formulário curto de cada resposta; Confirmar só liga com o que o iFood exige. */
const FormularioDeResposta: React.FC<{
  disputa: DisputaIfood;
  resposta: Resposta;
  enviando: boolean;
  onEnviar: (corpo: RespostaDaDisputa) => void;
  onVoltar: () => void;
}> = ({ disputa, resposta, enviando, onEnviar, onVoltar }) => {
  const aceite = disputa.motivos_aceite ?? [];
  const alternativa = resposta.tipo === 'alternativa' ? resposta.alternativa : null;
  const minutosPermitidos = alternativa?.metadata.allowedsAdditionalTimeInMinutes ?? [];
  const motivosDeTempo = alternativa?.metadata.allowedsAdditionalTimeReasons ?? [];
  const maxCentavos = alternativa?.metadata.maxAmount ? Number(alternativa.metadata.maxAmount.value) : null;

  const [motivo, setMotivo] = useState(resposta.tipo === 'aceitar' ? (aceite[0] ?? '') : '');
  const [valor, setValor] = useState('');
  const [minutos, setMinutos] = useState('');

  let corpo: RespostaDaDisputa | null = null;
  if (resposta.tipo === 'aceitar') {
    corpo = motivo ? { resposta: 'aceitar', motivo } : { resposta: 'aceitar' };
  } else if (resposta.tipo === 'recusar') {
    corpo = motivo ? { resposta: 'recusar', motivo } : null;
  } else if (alternativa?.type === 'ADDITIONAL_TIME') {
    const precisaMotivo = motivosDeTempo.length > 0;
    corpo = minutos && (!precisaMotivo || motivo)
      ? { resposta: 'alternativa', tipo: 'ADDITIONAL_TIME', minutos: Number(minutos), ...(motivo ? { motivo } : {}) }
      : null;
  } else if (alternativa) {
    const c = centavos(valor);
    corpo = c !== null && c > 0 && (maxCentavos === null || c <= maxCentavos)
      ? { resposta: 'alternativa', tipo: alternativa.type, valor_centavos: c }
      : null;
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => { e.preventDefault(); if (corpo) onEnviar(corpo); }}
    >
      {resposta.tipo === 'aceitar' && aceite.length > 1 && (
        <Select rotulo="Motivo" valor={motivo} onMudar={setMotivo} opcoes={opcoesDeMotivo(aceite)} className="min-w-[12rem]" />
      )}
      {resposta.tipo === 'recusar' && (
        <Select
          rotulo="Motivo"
          vazio="Escolha…"
          valor={motivo}
          onMudar={setMotivo}
          opcoes={opcoesDeMotivo(Object.keys(MOTIVOS_DA_NEGOCIACAO))}
          className="min-w-[12rem]"
        />
      )}
      {alternativa?.type === 'ADDITIONAL_TIME' && (
        <>
          <Select
            rotulo="Minutos"
            vazio="Escolha…"
            valor={minutos}
            onMudar={setMinutos}
            opcoes={minutosPermitidos.map((n) => ({ valor: String(n), rotulo: `${n} min` }))}
            className="w-32"
          />
          {motivosDeTempo.length > 0 && (
            <Select
              rotulo="Motivo"
              vazio="Escolha…"
              valor={motivo}
              onMudar={setMotivo}
              opcoes={opcoesDeMotivo(motivosDeTempo)}
              className="min-w-[12rem]"
            />
          )}
        </>
      )}
      {alternativa && alternativa.type !== 'ADDITIONAL_TIME' && (
        <Campo
          rotulo="Valor (R$)"
          dica={maxCentavos !== null ? `máx. ${formatCurrency(maxCentavos / 100)}` : undefined}
          className="w-36"
        >
          <Input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
          />
        </Campo>
      )}
      <Button type="submit" size="sm" disabled={!corpo || enviando}>Confirmar</Button>
      <Button type="button" size="sm" variant="outline" onClick={onVoltar} disabled={enviando}>Voltar</Button>
    </form>
  );
};

interface Props {
  pedidoId: string;
  /** Depois de responder: o pedido pode ter mudado (ex.: cancelado). */
  aoResponder?: () => void;
}

export const NegociacaoIfood: React.FC<Props> = ({ pedidoId, aoResponder }) => {
  const [disputa, setDisputa] = useState<DisputaIfood | null>(null);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setDisputa(await ifoodPedidoService.negociacao(pedidoId));
    } catch {
      // Silencioso: sem estado confiável, a faixa não aparece.
    }
  }, [pedidoId]);

  useEffect(() => {
    setDisputa(null);
    setResposta(null);
    carregar();
  }, [carregar]);

  const vivo = podeMudar(disputa);
  useEffect(() => {
    if (!vivo) return undefined;
    const id = window.setInterval(carregar, ATUALIZAR_A_CADA_MS);
    return () => window.clearInterval(id);
  }, [vivo, carregar]);

  if (!disputa) return null;

  const enviar = async (corpo: RespostaDaDisputa) => {
    if (enviando) return;
    setEnviando(true);
    try {
      setDisputa(await ifoodPedidoService.responder(pedidoId, corpo));
      setResposta(null);
      toast.success('Resposta enviada ao iFood');
      aoResponder?.();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setEnviando(false);
    }
  };

  const pedido = PEDIDO_DO_CLIENTE[disputa.acao] ?? 'negociação';

  if (disputa.status !== 'ABERTA') {
    return (
      <section aria-label="Negociação iFood" className="flex items-center gap-2 text-xs text-fg-muted-token">
        <ScaleIcon className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          Negociação iFood ({pedido}): <strong className="font-semibold text-fg-token">{RESULTADO[disputa.status] ?? disputa.status}</strong>
        </span>
      </section>
    );
  }

  const semResposta = SEM_RESPOSTA[disputa.se_nao_responder];

  return (
    <section
      aria-label="Negociação iFood"
      className="flex flex-col gap-3 rounded-xl border border-warning-token bg-warning-soft px-4 py-3 text-fg-token"
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Cliente pediu: {pedido}</p>
          {disputa.mensagem && <p className="text-sm">“{disputa.mensagem}”</p>}
        </div>
        <div className="flex flex-col items-end">
          <ContagemRegressiva ate={disputa.expira_em} />
          {semResposta && <span className="text-xs font-medium">{semResposta}</span>}
        </div>
      </div>

      {resposta ? (
        <FormularioDeResposta
          disputa={disputa}
          resposta={resposta}
          enviando={enviando}
          onEnviar={enviar}
          onVoltar={() => setResposta(null)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={() => setResposta({ tipo: 'aceitar' })}>Aceitar</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setResposta({ tipo: 'recusar' })}>Recusar</Button>
          {(disputa.alternativas ?? []).map((a) => (
            <Button key={a.id} type="button" size="sm" variant="outline" onClick={() => setResposta({ tipo: 'alternativa', alternativa: a })}>
              {ROTULO_DA_ALTERNATIVA[a.type] ?? a.type}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
};

export default NegociacaoIfood;
