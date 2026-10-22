/**
 * Quem levou este pedido — base do ranking em Equipe e entregas (do Prefiro).
 * Some quando a loja não cadastrou entregador nenhum.
 */
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardDocumentIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

import { getErrorMessage } from '../../services';
import { Select } from '../ui';
import { copyToClipboard } from '../../utils/clipboard';
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

  // A janela abre no clique (síncrono): aberta depois do `await`, o
  // navegador a trata como pop-up e bloqueia.
  const enviar = async () => {
    const janela = window.open('', '_blank');
    try {
      const { whatsapp } = await operacaoService.mensagem(storeSlug, pedidoId);
      if (janela) janela.location.href = whatsapp;
      else window.location.assign(whatsapp);
    } catch (e) {
      janela?.close();
      toast.error(getErrorMessage(e));
    }
  };

  const copiar = async () => {
    try {
      const { texto } = await operacaoService.mensagem(storeSlug, pedidoId);
      if (await copyToClipboard(texto)) toast.success('Mensagem copiada');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const botao = 'inline-flex items-center rounded-lg border border-border-token p-2 text-fg-token transition hover:bg-surface-2';

  return (
    <span className="inline-flex items-center gap-1">
      <Select
        rotuloOculto="Entregador"
        vazio="Entregador…"
        valor={escolhido}
        onMudar={mudar}
        opcoes={[...opcoes.map((e) => ({ valor: e.id, rotulo: e.nome })), ...semCadastro]}
        className="w-40"
      />
      <button type="button" onClick={enviar} className={botao} title="Enviar ao entregador no WhatsApp" aria-label="Enviar ao entregador no WhatsApp">
        <PaperAirplaneIcon className="h-4 w-4" />
      </button>
      <button type="button" onClick={copiar} className={botao} title="Copiar mensagem" aria-label="Copiar mensagem">
        <ClipboardDocumentIcon className="h-4 w-4" />
      </button>
    </span>
  );
};

export default EntregadorDoPedido;
