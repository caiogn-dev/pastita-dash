/**
 * O que o bot sabe da conversa aberta, mantido fresco enquanto ela está na
 * tela: busca ao abrir, a cada 30 s e quando o WebSocket que o inbox já tem
 * entrega mensagem nova (o `gatilho` é o id da última mensagem). Nenhum canal
 * novo: o timer só roda com a conversa aberta em modo humano.
 *
 * Assumir e Devolver ao bot são otimistas — a tela muda na hora e volta atrás,
 * com o erro escrito, se o backend recusar.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { conversationsService, type ContextoDoBot } from '../../services/conversations';
import { useChatStore } from '../../stores/chatStore';
import type { Conversation } from '../../types';

const REFRESCO_MS = 30_000;

export type AcaoDoContexto = 'assumindo' | 'devolvendo' | null;

const mudarModo = (id: string, mode: Conversation['mode']) =>
  useChatStore.getState().updateConversation({ id, mode });

export function useContextoDoBot(conversationId: string | null, ativo: boolean, gatilho: unknown) {
  const [contexto, setContexto] = useState<ContextoDoBot | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [acao, setAcao] = useState<AcaoDoContexto>(null);
  const [erroDaAcao, setErroDaAcao] = useState<string | null>(null);
  const idAtual = useRef(conversationId);
  idAtual.current = conversationId;

  // Trocou de conversa: nada da anterior pode ficar na faixa.
  useEffect(() => {
    setContexto(null);
    setFalhou(false);
    setErroDaAcao(null);
    setAcao(null);
  }, [conversationId]);

  const buscar = useCallback(async () => {
    if (!conversationId) return;
    try {
      const novo = await conversationsService.getContextoDoBot(conversationId);
      if (idAtual.current !== conversationId) return;
      setContexto(novo);
      setFalhou(false);
    } catch {
      if (idAtual.current === conversationId) setFalhou(true);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!ativo || !conversationId) return;
    void buscar();
    const t = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) void buscar();
    }, REFRESCO_MS);
    return () => clearInterval(t);
  }, [ativo, conversationId, buscar]);

  // Mensagem nova pelo WebSocket: o bot pode ter anotado algo.
  const primeiroGatilho = useRef(true);
  useEffect(() => {
    if (primeiroGatilho.current) { primeiroGatilho.current = false; return; }
    if (ativo && conversationId) void buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatilho]);

  const assumir = useCallback(async () => {
    if (!conversationId) return;
    const anterior = contexto;
    setAcao('assumindo');
    setErroDaAcao(null);
    setContexto((c) => c && { ...c, motivo: { codigo: 'atendente_assumiu', texto: '', desde: new Date().toISOString() } });
    mudarModo(conversationId, 'human');
    try {
      await conversationsService.assumir(conversationId);
    } catch {
      setContexto(anterior);
      setErroDaAcao('Não foi possível assumir a conversa. Tente de novo.');
    } finally {
      setAcao(null);
    }
  }, [conversationId, contexto]);

  const devolver = useCallback(async () => {
    if (!conversationId) return;
    setAcao('devolvendo');
    setErroDaAcao(null);
    mudarModo(conversationId, 'auto');
    try {
      await conversationsService.devolverAoBot(conversationId);
    } catch {
      mudarModo(conversationId, 'human');
      setErroDaAcao('Não foi possível devolver ao bot. A conversa continua com você.');
    } finally {
      setAcao(null);
    }
  }, [conversationId]);

  return { contexto, falhou, acao, erroDaAcao, assumir, devolver };
}
