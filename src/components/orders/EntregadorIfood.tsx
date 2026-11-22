/**
 * Entregador do iFood (iFood Entrega / Sob Demanda) para pedido de entrega do
 * próprio site/WhatsApp. Fica na barra de ações do pedido, ao lado do
 * entregador próprio.
 *
 * Some quando a loja não tem iFood Entrega ligado — ou quando o estado não
 * carrega: um botão de chamar que talvez não funcione é pior que nenhum.
 * Enquanto a entrega está em andamento, relê a cada 30 s (o modal aberto é o
 * único consumidor; nada de polling em segundo plano).
 *
 * Cancelar exige um dos motivos que o iFood devolve para a entrega; lista
 * vazia = o iFood não deixa mais cancelar. Quando o cliente pede outro
 * endereço, uma faixa com prazo pede aceitar ou recusar.
 */
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MapPinIcon, PhoneIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { getErrorMessage } from '../../services';
import {
  entregaIfoodService,
  type EntregaIfood,
  type MotivoDeCancelamentoDaEntrega,
} from '../../services/entregaIfood';
import { formatCurrency } from '../../utils/formatters';
import { IfoodIcon } from '../brand/BrandIcons';
import { Button, Modal } from '../common';
import { ContagemRegressiva } from './ContagemRegressiva';

const ATUALIZAR_A_CADA_MS = 30_000;

const botao =
  'inline-flex items-center gap-1.5 rounded-lg border border-border-token px-3 py-2 text-xs font-medium text-fg-token transition hover:bg-surface-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

const CANCELANDO = new Set(['CANCELLATION_REQUESTED', 'DELIVERY_CANCELLATION_REQUESTED']);

const icone =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-muted-token transition hover:bg-surface-2 hover:text-fg-token disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

const SEM_CANCELAMENTO = 'O iFood não permite mais cancelar esta entrega';

interface Props {
  pedidoId: string;
  /** O pedido mudou no servidor (endereço novo aceito): relê sem piscar. */
  aoMudarPedido?: () => void;
}

/** Escolher o motivo do iFood e cancelar o entregador. */
const CancelarEntregador: React.FC<{
  motivos: MotivoDeCancelamentoDaEntrega[] | null;
  enviando: boolean;
  onConfirmar: (codigo: string) => void;
  onFechar: () => void;
}> = ({ motivos, enviando, onConfirmar, onFechar }) => {
  const [codigo, setCodigo] = useState('');

  useEffect(() => { if (motivos) setCodigo(''); }, [motivos]);

  return (
    <Modal isOpen={motivos !== null} onClose={onFechar} title="Cancelar entregador iFood">
      <div className="space-y-4">
        <div role="radiogroup" aria-label="Motivo do cancelamento" className="grid gap-2 sm:grid-cols-2">
          {(motivos ?? []).map((m) => (
            <label
              key={m.codigo}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                codigo === m.codigo ? 'border-brand bg-brand-soft text-fg-token' : 'border-border-token text-fg-token hover:bg-surface-2'
              }`}
            >
              <input
                type="radio"
                name="motivo-cancelamento-entrega-ifood"
                value={m.codigo}
                checked={codigo === m.codigo}
                onChange={() => setCodigo(m.codigo)}
                className="accent-[var(--brand)]"
              />
              {m.descricao}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onFechar}>Voltar</Button>
          <Button variant="danger" disabled={!codigo || enviando} isLoading={enviando} onClick={() => onConfirmar(codigo)}>
            Confirmar cancelamento
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export const EntregadorIfood: React.FC<Props> = ({ pedidoId, aoMudarPedido }) => {
  const [entrega, setEntrega] = useState<EntregaIfood | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [motivos, setMotivos] = useState<MotivoDeCancelamentoDaEntrega[] | null>(null);

  const carregar = useCallback(async () => {
    try {
      setEntrega(await entregaIfoodService.estado(pedidoId));
    } catch {
      // Silencioso: sem estado confiável, o bloco não aparece.
    }
  }, [pedidoId]);

  useEffect(() => {
    let vivo = true;
    setEntrega(null);
    entregaIfoodService.estado(pedidoId)
      .then((e) => { if (vivo) setEntrega(e); })
      .catch(() => undefined);
    return () => { vivo = false; };
  }, [pedidoId]);

  const ativo = !!entrega?.ativo;
  useEffect(() => {
    if (!ativo) return undefined;
    const id = window.setInterval(carregar, ATUALIZAR_A_CADA_MS);
    return () => window.clearInterval(id);
  }, [ativo, carregar]);

  if (!entrega?.disponivel) return null;

  /** true = deu certo. */
  const executar = async (acao: () => Promise<EntregaIfood>, sucesso: string): Promise<boolean> => {
    if (ocupado) return false;
    setOcupado(true);
    try {
      setEntrega(await acao());
      toast.success(sucesso);
      return true;
    } catch (e) {
      toast.error(getErrorMessage(e));
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const chamar = () => executar(() => entregaIfoodService.chamar(pedidoId), 'Entregador iFood chamado');

  const pedirCancelamento = async () => {
    if (ocupado) return;
    setOcupado(true);
    try {
      const lista = await entregaIfoodService.motivosDeCancelamento(pedidoId);
      if (lista.length === 0) toast.error(SEM_CANCELAMENTO);
      else setMotivos(lista);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setOcupado(false);
    }
  };

  const cancelar = async (codigo: string) => {
    if (await executar(() => entregaIfoodService.cancelar(pedidoId, codigo), 'Entregador cancelado')) setMotivos(null);
  };

  const responderEndereco = async (aceitar: boolean) => {
    const ok = await executar(
      () => entregaIfoodService.responderEndereco(pedidoId, aceitar),
      aceitar ? 'Endereço novo aceito' : 'Endereço novo recusado',
    );
    if (ok && aceitar) aoMudarPedido?.();
  };

  const coleta = entrega.codigo_coleta ? (
    <span
      aria-label="Código de coleta"
      title="Código de coleta"
      className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] uppercase tracking-wide text-fg-muted-token"
    >
      Coleta
      <span className="font-mono text-sm font-bold tracking-widest text-fg-token">{entrega.codigo_coleta}</span>
    </span>
  ) : null;

  if (!entrega.chamado) {
    if (!entrega.pode_chamar) return coleta;
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <button type="button" onClick={chamar} disabled={ocupado} className={botao}>
          <IfoodIcon size={16} />
          <span className={ocupado ? 'animate-pulse' : undefined}>Chamar entregador iFood</span>
        </button>
        {coleta}
      </span>
    );
  }

  const { entregador, mudanca_endereco: mudanca } = entrega;
  const podeCancelar = entrega.ativo && !CANCELANDO.has(entrega.status);

  return (
    <>
    {mudanca && (
      <section
        aria-label="Cliente pediu outro endereço"
        className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-warning-token bg-warning-soft px-3 py-2 text-sm text-fg-token"
      >
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Cliente pediu outro endereço</p>
          {mudanca.texto && <p>{mudanca.texto}</p>}
        </div>
        {mudanca.prazo && <ContagemRegressiva ate={mudanca.prazo} className="font-mono text-base font-bold tabular-nums" />}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => responderEndereco(true)}
            disabled={ocupado}
            className="inline-flex items-center rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-on-brand transition hover:bg-brand-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Aceitar
          </button>
          <button type="button" onClick={() => responderEndereco(false)} disabled={ocupado} className={botao}>
            Recusar
          </button>
        </div>
      </section>
    )}
    <div
      role="group"
      aria-label="Entregador iFood"
      className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-lg border border-border-token py-1 pl-2.5 pr-1 text-xs text-fg-token"
    >
      <IfoodIcon size={16} />

      <span aria-live="polite" className="inline-flex items-center gap-1.5 font-semibold">
        {entrega.ativo && <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />}
        {entrega.status_texto}
      </span>

      {entregador && (
        <span className="inline-flex items-center gap-1">
          <span>{entregador.nome}</span>
          {entregador.telefone && (
            <a
              href={`tel:${entregador.telefone}`}
              className="inline-flex rounded p-0.5 text-fg-muted-token hover:text-fg-token"
              aria-label={`Ligar para ${entregador.nome}`}
              title={entregador.telefone}
            >
              <PhoneIcon className="h-3.5 w-3.5" />
            </a>
          )}
        </span>
      )}

      {entrega.valor != null && <span className="text-fg-muted-token">{formatCurrency(entrega.valor)}</span>}

      {entrega.codigo_entrega && (
        <span
          aria-label="Código de entrega"
          title="Código de entrega"
          className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-sm font-bold tracking-widest"
        >
          {entrega.codigo_entrega}
        </span>
      )}

      {coleta}

      {entrega.erro && <span className="text-danger-token">{entrega.erro}</span>}

      {(entrega.rastreio_url || podeCancelar) && (
        <span className="inline-flex items-center">
          {entrega.rastreio_url && (
            <a
              href={entrega.rastreio_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Rastrear"
              title="Rastrear"
              className={icone}
            >
              <MapPinIcon className="h-4 w-4" aria-hidden />
            </a>
          )}
          {podeCancelar && (
            <button
              type="button"
              onClick={pedirCancelamento}
              disabled={ocupado}
              aria-label="Cancelar entregador"
              title="Cancelar entregador"
              className={`${icone} hover:!text-danger-token`}
            >
              <XMarkIcon className="h-4 w-4" aria-hidden />
            </button>
          )}
        </span>
      )}

      {entrega.pode_chamar && (
        <button type="button" onClick={chamar} disabled={ocupado} className={botao}>
          Chamar de novo
        </button>
      )}

      <CancelarEntregador
        motivos={motivos}
        enviando={ocupado}
        onConfirmar={cancelar}
        onFechar={() => setMotivos(null)}
      />
    </div>
    </>
  );
};

export default EntregadorIfood;
