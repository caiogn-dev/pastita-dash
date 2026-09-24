/**
 * LinhaDoTempoDoPedido — onde o pedido está e QUANDO passou por cada etapa.
 *
 * Solicitado → Confirmado → Em preparo → Pronto → Saiu para entrega → Entregue.
 * Retirada no balcão troca as duas últimas por "Retirado": não existe
 * entregador, e desenhar a etapa vazia sugeriria que algo travou ali.
 *
 * Quem manda na POSIÇÃO é o status; quem manda na HORA é o carimbo gravado
 * pelo backend (`confirmed_at`, `preparing_at`...). Pedido antigo ou ajustado
 * à mão pode ter avançado sem carimbo — a etapa fica concluída, sem hora, em
 * vez de a linha fingir que o pedido não saiu do lugar.
 *
 * Cancelado não some: a linha mostra até onde o pedido chegou e termina numa
 * etapa vermelha "Cancelado", com a hora. É o que responde "cancelou antes ou
 * depois de a cozinha começar?".
 *
 * Horizontal a partir do `sm`, vertical no celular — seis etapas lado a lado
 * numa tela de 360px viram rótulos de duas letras.
 */
import React from 'react';
import {
  BellAlertIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  CheckIcon,
  FireIcon,
  InboxArrowDownIcon,
  ShoppingBagIcon,
  TruckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { horaNoFuso } from '../../utils/fusoDeNegocio';
import { duracaoLegivel } from '../../pages/orders/marcosDoPedido';

export type EstadoDaEtapaNaLinha = 'concluida' | 'atual' | 'futura' | 'cancelada';

export type ChaveDaEtapa =
  | 'solicitado'
  | 'confirmado'
  | 'preparo'
  | 'pronto'
  | 'saiu'
  | 'fim'
  | 'cancelado';

export interface EtapaDaLinhaDoTempo {
  chave: ChaveDaEtapa;
  rotulo: string;
  estado: EstadoDaEtapaNaLinha;
  /** "19:05" no fuso da loja, ou `null` quando o backend não carimbou. */
  hora: string | null;
  /** Minutos desde a etapa anterior que tem hora — "ficou 20 min na cozinha". */
  minutos: number | null;
}

type Carimbo = string | null | undefined;

export interface PedidoDaLinhaDoTempo {
  status: string;
  delivery_method?: string | null;
  created_at: string;
  confirmed_at?: Carimbo;
  paid_at?: Carimbo;
  preparing_at?: Carimbo;
  ready_at?: Carimbo;
  out_for_delivery_at?: Carimbo;
  shipped_at?: Carimbo;
  picked_up_at?: Carimbo;
  delivered_at?: Carimbo;
  cancelled_at?: Carimbo;
}

const ehRetirada = (metodo?: string | null) => metodo === 'pickup' || metodo === 'digital';

function hora(carimbo: Carimbo): string | null {
  if (!carimbo) return null;
  const quando = new Date(carimbo);
  if (Number.isNaN(quando.getTime())) return null;
  return horaNoFuso(quando);
}

/**
 * Pendura em cada etapa a duração desde a anterior com hora. Nunca negativa:
 * ajuste manual consegue gravar `ready_at` antes de `preparing_at`, e "-5 min"
 * na tela lê como bug.
 */
function comDuracoes(
  etapas: Array<Omit<EtapaDaLinhaDoTempo, 'minutos'> & { carimbo: Carimbo }>,
): EtapaDaLinhaDoTempo[] {
  let anterior: number | null = null;
  return etapas.map(({ carimbo, ...etapa }) => {
    const ms = etapa.hora !== null && carimbo ? new Date(carimbo).getTime() : null;
    const minutos = ms !== null && anterior !== null ? Math.max(0, Math.round((ms - anterior) / 60_000)) : null;
    if (ms !== null) anterior = ms;
    return { ...etapa, minutos };
  });
}

/** Primeiro carimbo válido entre os candidatos. */
const primeiro = (...carimbos: Carimbo[]) => carimbos.find((c) => hora(c) !== null) ?? null;

/** Posição do status na linha. Status desconhecido cai no começo. */
function posicaoDoStatus(status: string, retirada: boolean): number {
  switch (status) {
    case 'confirmed':
    case 'paid':
      return 1;
    case 'preparing':
      return 2;
    case 'ready':
      return 3;
    case 'out_for_delivery':
    case 'shipped':
      return retirada ? 3 : 4;
    case 'delivered':
    case 'completed':
      return retirada ? 4 : 5;
    default:
      return 0;
  }
}

export function etapasDaLinhaDoTempo(pedido: PedidoDaLinhaDoTempo): EtapaDaLinhaDoTempo[] {
  const status = (pedido.status || '').toLowerCase();
  const retirada = ehRetirada(pedido.delivery_method);

  const base: Array<{ chave: ChaveDaEtapa; rotulo: string; carimbo: Carimbo }> = [
    { chave: 'solicitado', rotulo: 'Solicitado', carimbo: pedido.created_at },
    { chave: 'confirmado', rotulo: 'Confirmado', carimbo: primeiro(pedido.confirmed_at, pedido.paid_at) },
    { chave: 'preparo', rotulo: 'Em preparo', carimbo: pedido.preparing_at },
    { chave: 'pronto', rotulo: 'Pronto', carimbo: pedido.ready_at },
    ...(retirada
      ? [{ chave: 'fim' as const, rotulo: 'Retirado', carimbo: primeiro(pedido.picked_up_at, pedido.delivered_at) }]
      : [
          { chave: 'saiu' as const, rotulo: 'Saiu para entrega', carimbo: primeiro(pedido.out_for_delivery_at, pedido.shipped_at) },
          { chave: 'fim' as const, rotulo: 'Entregue', carimbo: pedido.delivered_at },
        ]),
  ];

  if (status === 'cancelled') {
    // Parou depois da última etapa que deixou carimbo. Sem nenhum além do
    // `created_at`, parou logo depois do Solicitado.
    let ultima = 0;
    base.forEach((etapa, i) => {
      if (hora(etapa.carimbo) !== null) ultima = i;
    });
    return comDuracoes([
      ...base.slice(0, ultima + 1).map((etapa) => ({
        ...etapa,
        estado: 'concluida' as const,
        hora: hora(etapa.carimbo),
      })),
      {
        chave: 'cancelado',
        rotulo: 'Cancelado',
        estado: 'cancelada',
        hora: hora(pedido.cancelled_at),
        carimbo: pedido.cancelled_at,
      },
    ]);
  }

  const atual = posicaoDoStatus(status, retirada);
  const terminou = atual === base.length - 1 && (status === 'delivered' || status === 'completed');

  return comDuracoes(base.map((etapa, i) => ({
    ...etapa,
    estado: i < atual || (terminou && i === atual) ? 'concluida' : i === atual ? 'atual' : 'futura',
    // Etapa futura não tem hora, mesmo se algum carimbo velho sobrou de um
    // ajuste manual: a linha não pode dizer que algo aconteceu e ainda falta.
    hora: i <= atual ? hora(etapa.carimbo) : null,
  })));
}

const ICONE: Record<ChaveDaEtapa, typeof CheckIcon> = {
  solicitado: InboxArrowDownIcon,
  confirmado: CheckCircleIcon,
  preparo: FireIcon,
  pronto: BellAlertIcon,
  saiu: TruckIcon,
  fim: CheckBadgeIcon,
  cancelado: XMarkIcon,
};

const CLASSE_DA_BOLINHA: Record<EstadoDaEtapaNaLinha, string> = {
  concluida: 'border-[var(--brand)] bg-[var(--brand)] text-brand-strong',
  atual: 'border-[var(--brand)] bg-surface text-[var(--brand)] ring-4 ring-brand-soft',
  futura: 'border-border-token bg-surface text-fg-muted-token',
  cancelada: 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]',
};

const CLASSE_DO_ROTULO: Record<EstadoDaEtapaNaLinha, string> = {
  concluida: 'text-fg-token',
  atual: 'font-semibold text-fg-token',
  futura: 'text-fg-muted-token',
  cancelada: 'font-semibold text-[var(--danger)]',
};

interface LinhaDoTempoDoPedidoProps {
  pedido: PedidoDaLinhaDoTempo;
  className?: string;
}

export const LinhaDoTempoDoPedido: React.FC<LinhaDoTempoDoPedidoProps> = ({ pedido, className }) => {
  const etapas = etapasDaLinhaDoTempo(pedido);
  const retirada = ehRetirada(pedido.delivery_method);

  return (
    <ol
      aria-label="Andamento do pedido"
      className={['flex flex-col gap-0 sm:flex-row', className].filter(Boolean).join(' ')}
    >
      {etapas.map((etapa, i) => {
        const Icone = etapa.chave === 'fim' && retirada ? ShoppingBagIcon : ICONE[etapa.chave];
        const proxima = etapas[i + 1];
        // O trecho até a próxima etapa acende quando a próxima já foi
        // alcançada — é o caminho que o pedido de fato percorreu.
        const trechoPercorrido = proxima && proxima.estado !== 'futura';
        const trechoCancelado = proxima?.estado === 'cancelada';

        return (
          <li
            key={etapa.chave}
            aria-current={etapa.estado === 'atual' ? 'step' : undefined}
            className="relative flex min-h-[3.25rem] items-start gap-3 pb-3 sm:min-h-0 sm:flex-1 sm:flex-col sm:items-center sm:gap-1.5 sm:pb-0 sm:text-center"
          >
            {proxima && (
              <span
                aria-hidden="true"
                className={[
                  'absolute left-[15px] top-8 bottom-0 w-0.5 rounded-full',
                  'sm:left-1/2 sm:right-auto sm:top-4 sm:bottom-auto sm:h-0.5 sm:w-full',
                  trechoCancelado
                    ? 'bg-[var(--danger)]'
                    : trechoPercorrido
                      ? 'bg-[var(--brand)]'
                      : 'bg-border-token',
                ].join(' ')}
              />
            )}
            <span
              className={[
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors',
                CLASSE_DA_BOLINHA[etapa.estado],
              ].join(' ')}
            >
              {etapa.estado === 'concluida' ? (
                <CheckIcon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Icone className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <span className="flex min-w-0 flex-col pt-1 sm:items-center sm:px-1 sm:pt-0">
              <span className={['text-xs leading-tight', CLASSE_DO_ROTULO[etapa.estado]].join(' ')}>
                {etapa.rotulo}
              </span>
              <span className="text-badge tabular-nums text-fg-muted-token">
                {etapa.hora ?? ' '}
                {etapa.hora && etapa.minutos !== null ? ` · ${duracaoLegivel(etapa.minutos)}` : null}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
};

export default LinhaDoTempoDoPedido;
