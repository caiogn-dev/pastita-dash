/**
 * Quem levou este pedido — base do ranking em Equipe e entregas (do Prefiro).
 * Some quando a loja não cadastrou entregador nenhum.
 */
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { getErrorMessage } from '../../services';
import { Select } from '../ui';
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

  const semCadastro = atual && !opcoes.some((e) => e.id === atual)
    ? [{ valor: atual, rotulo: atualNome ?? 'Entregador' }]
    : [];

  return (
    <Select
      rotuloOculto="Entregador"
      vazio="Entregador…"
      valor={escolhido}
      onMudar={mudar}
      opcoes={[...opcoes.map((e) => ({ valor: e.id, rotulo: e.nome })), ...semCadastro]}
      className="w-40"
    />
  );
};

export default EntregadorDoPedido;
