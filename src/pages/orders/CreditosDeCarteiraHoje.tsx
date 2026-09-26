/**
 * Compras de saldo (carteira pré-paga) de hoje, acima do quadro de pedidos.
 *
 * Venda de saldo nasce como pedido (source='carteira') para entrar no
 * faturamento, mas não entra nas colunas: não há o que preparar nem
 * entregar. Em 26/09 o push dizia "Novo pedido", o dono abriu o quadro, não
 * achou nada e concluiu que o pedido tinha sumido sem imprimir. Esta faixa
 * mostra o que aconteceu, com nome, quanto pagou e quanto ganhou de saldo.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ordersService from '../../services/orders';
import type { Order } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { SeloDeEstado } from '../../components/ui';
import { EVENTO_COMPRA_DE_CARTEIRA } from '../../hooks/orderRealtimeEvents';

export interface CreditoDeCarteira {
  id: string;
  nome: string;
  pagou: number;
  saldo: number;
  hora: string;
}

/** Data de hoje no formato que a API filtra (`date_from`), no fuso local. */
export function hojeIso(agora = new Date()): string {
  const y = agora.getFullYear();
  const m = String(agora.getMonth() + 1).padStart(2, '0');
  const d = String(agora.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Traduz o pedido de carteira para a linha da faixa. */
export function creditoDoPedido(pedido: Order): CreditoDeCarteira {
  const meta = (pedido.metadata || {}) as Record<string, unknown>;
  const saldo = Number(meta.credito_concedido ?? pedido.total ?? 0);
  return {
    id: pedido.id,
    nome: pedido.customer_name || 'Cliente',
    pagou: Number(pedido.total ?? 0),
    saldo: Number.isFinite(saldo) ? saldo : 0,
    hora: pedido.created_at
      ? new Date(pedido.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '',
  };
}

interface Props {
  storeSlug: string;
}

export const CreditosDeCarteiraHoje: React.FC<Props> = ({ storeSlug }) => {
  const [creditos, setCreditos] = useState<CreditoDeCarteira[]>([]);

  const carregar = useCallback(async () => {
    try {
      const resposta = await ordersService.getOrders({ store: storeSlug, source: 'carteira', date_from: hojeIso() });
      setCreditos((resposta.results || []).map(creditoDoPedido));
    } catch {
      // Faixa acessória: falha aqui não pode esconder o quadro.
      setCreditos([]);
    }
  }, [storeSlug]);

  useEffect(() => {
    if (!storeSlug) return;
    void carregar();
    // O tempo real avisa a compra (useRealTimeOrders); a faixa recarrega.
    const aoComprar = () => { void carregar(); };
    window.addEventListener(EVENTO_COMPRA_DE_CARTEIRA, aoComprar);
    return () => window.removeEventListener(EVENTO_COMPRA_DE_CARTEIRA, aoComprar);
  }, [carregar, storeSlug]);

  if (creditos.length === 0) return null;

  return (
    <section
      aria-label="Créditos de carteira de hoje"
      className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border-token bg-surface-2 px-3 py-2 text-body"
    >
      <SeloDeEstado tone="success">Carteira</SeloDeEstado>
      <span className="font-semibold text-fg-token">
        {creditos.length === 1 ? '1 compra de saldo hoje' : `${creditos.length} compras de saldo hoje`}
      </span>
      <span className="text-fg-muted-token">— não é pedido: nada para preparar.</span>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {creditos.map((c) => (
          <li key={c.id} className="text-fg-token">
            <strong>{c.nome}</strong> pagou {formatCurrency(c.pagou)} e ganhou {formatCurrency(c.saldo)} de saldo
            {c.hora ? ` · ${c.hora}` : ''}
          </li>
        ))}
      </ul>
      <Link to={`/stores/${storeSlug}/fidelidade`} className="ml-auto text-body text-primary-token underline-offset-2 hover:underline">
        Ver carteira
      </Link>
    </section>
  );
};

export default CreditosDeCarteiraHoje;
