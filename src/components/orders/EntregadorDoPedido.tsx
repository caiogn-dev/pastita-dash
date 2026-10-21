/**
 * Quem levou este pedido — base do ranking em Equipe e entregas (do Prefiro).
 * Some quando a loja não cadastrou entregador nenhum.
 */
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { getErrorMessage } from '../../services';
import { operacaoService, type Entregador } from '../../services/operacao';

interface Props {
  storeSlug: string;
  pedidoId: string;
  atual?: string | null;
  atualNome?: string | null;
}

export const EntregadorDoPedido: React.FC<Props> = ({ storeSlug, pedidoId, atual = null, atualNome = null }) => {
  const [lista, setLista] = useState<Entregador[]>([]);
  const [escolhido, setEscolhido] = useState<string>(atual ?? '');

  useEffect(() => { setEscolhido(atual ?? ''); }, [atual, pedidoId]);

  useEffect(() => {
    let vivo = true;
    operacaoService.entregadores(storeSlug).then((l) => { if (vivo) setLista(l); }).catch(() => undefined);
    return () => { vivo = false; };
  }, [storeSlug]);

  // Desligado continua aparecendo se for o deste pedido: o histórico não muda.
  const opcoes = lista.filter((e) => e.is_active || e.id === atual);
  if (opcoes.length === 0 && !atual) return null;

  const mudar = async (id: string) => {
    const antes = escolhido;
    setEscolhido(id);
    try {
      await operacaoService.atribuir(storeSlug, pedidoId, id || null);
    } catch (e) {
      setEscolhido(antes);
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <label className="inline-flex items-center gap-1.5 rounded-lg border border-border-token px-2 py-1 text-xs font-medium text-fg-token">
      <span className="text-fg-muted-token">Entregador</span>
      <select
        aria-label="Entregador"
        value={escolhido}
        onChange={(e) => mudar(e.target.value)}
        className="bg-transparent py-1 text-xs text-fg-token focus:outline-none"
      >
        <option value="">—</option>
        {opcoes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        {atual && !opcoes.some((e) => e.id === atual) && <option value={atual}>{atualNome ?? 'Entregador'}</option>}
      </select>
    </label>
  );
};

export default EntregadorDoPedido;
