/**
 * Entregador do iFood (iFood Entrega / Sob Demanda) para pedido de entrega do
 * próprio site/WhatsApp. Fica na barra de ações do pedido, ao lado do
 * entregador próprio.
 *
 * Some quando a loja não tem iFood Entrega ligado — ou quando o estado não
 * carrega: um botão de chamar que talvez não funcione é pior que nenhum.
 * Enquanto a entrega está em andamento, relê a cada 30 s (o modal aberto é o
 * único consumidor; nada de polling em segundo plano).
 */
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowTopRightOnSquareIcon, PhoneIcon } from '@heroicons/react/24/outline';

import { getErrorMessage } from '../../services';
import { entregaIfoodService, type EntregaIfood } from '../../services/entregaIfood';
import { formatCurrency } from '../../utils/formatters';
import { IfoodIcon } from '../brand/BrandIcons';
import { ConfirmModal } from '../ui';

const ATUALIZAR_A_CADA_MS = 30_000;

const botao =
  'inline-flex items-center gap-1.5 rounded-lg border border-border-token px-3 py-2 text-xs font-medium text-fg-token transition hover:bg-surface-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

interface Props {
  pedidoId: string;
}

export const EntregadorIfood: React.FC<Props> = ({ pedidoId }) => {
  const [entrega, setEntrega] = useState<EntregaIfood | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

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

  const executar = async (acao: () => Promise<EntregaIfood>, sucesso: string) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      setEntrega(await acao());
      toast.success(sucesso);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setOcupado(false);
    }
  };

  const chamar = () => executar(() => entregaIfoodService.chamar(pedidoId), 'Entregador iFood chamado');
  const cancelar = async () => {
    await executar(() => entregaIfoodService.cancelar(pedidoId), 'Entregador cancelado');
    setConfirmando(false);
  };

  if (!entrega.chamado) {
    if (!entrega.pode_chamar) return null;
    return (
      <button type="button" onClick={chamar} disabled={ocupado} className={botao}>
        <IfoodIcon size={16} />
        <span className={ocupado ? 'animate-pulse' : undefined}>Chamar entregador iFood</span>
      </button>
    );
  }

  const { entregador } = entrega;

  return (
    <div
      role="group"
      aria-label="Entregador iFood"
      className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border-token px-3 py-1.5 text-xs text-fg-token"
    >
      <span className="inline-flex items-center gap-1.5 font-semibold">
        <IfoodIcon size={16} />
        Entregador iFood
      </span>

      <span aria-live="polite" className="font-medium">{entrega.status_texto}</span>

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

      {entrega.erro && <span className="text-danger-token">{entrega.erro}</span>}

      {entrega.rastreio_url && (
        <a
          href={entrega.rastreio_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline"
        >
          Rastrear
          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden />
        </a>
      )}

      {entrega.ativo && (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          disabled={ocupado}
          className="font-semibold text-danger-token underline-offset-2 hover:underline disabled:opacity-50"
        >
          Cancelar entregador
        </button>
      )}

      {entrega.pode_chamar && (
        <button type="button" onClick={chamar} disabled={ocupado} className={botao}>
          Chamar de novo
        </button>
      )}

      <ConfirmModal
        open={confirmando}
        title="Cancelar entregador iFood?"
        confirmText="Sim, cancelar"
        cancelText="Voltar"
        variant="danger"
        loading={ocupado}
        onConfirm={cancelar}
        onClose={() => setConfirmando(false)}
      />
    </div>
  );
};

export default EntregadorIfood;
