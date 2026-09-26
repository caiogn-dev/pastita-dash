/**
 * Liga `useContextoDoBot` ao componente puro `ContextoDoBot`, com um relógio
 * de 30 s para o "há 12 min" andar. Fica montado com a conversa aberta, mas só
 * aparece em modo humano — ou enquanto houver erro de uma ação para mostrar
 * (Devolver ao bot que falhou volta o modo e a faixa diz o porquê).
 */
import React, { useEffect, useState } from 'react';
import { ContextoDoBot } from './ContextoDoBot';
import { useContextoDoBot } from './useContextoDoBot';

export interface FaixaDoBotProps {
  conversationId: string;
  modo: string | undefined;
  /** Id da última mensagem — muda quando o WebSocket entrega mensagem nova. */
  gatilho: unknown;
}

export const FaixaDoBot: React.FC<FaixaDoBotProps> = ({ conversationId, modo, gatilho }) => {
  const humano = modo === 'human';
  const { contexto, falhou, acao, erroDaAcao, assumir, devolver } = useContextoDoBot(conversationId, humano, gatilho);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!humano) return;
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [humano, contexto]);

  if (!humano && !erroDaAcao && acao !== 'devolvendo') return null;

  return (
    <ContextoDoBot
      contexto={contexto}
      agora={agora}
      falhou={falhou}
      acao={acao}
      erroDaAcao={erroDaAcao}
      onAssumir={() => void assumir()}
      onDevolver={() => void devolver()}
    />
  );
};

export default FaixaDoBot;
