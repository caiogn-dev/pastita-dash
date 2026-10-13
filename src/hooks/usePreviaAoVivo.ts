/**
 * Prévia ao vivo: conversa com o iframe da vitrine (/preview/{slug}).
 *
 * Antes a prévia só mudava DEPOIS de salvar — o dono clicava "Direita", nada
 * acontecia, e ele salvava às cegas. Agora cada mudança vai na hora para a
 * vitrine de verdade, que desenha o rascunho sem gravar nada. Do outro lado:
 * cardapidex-web/src/hooks/useRascunhoDoPainel.js.
 *
 * O último rascunho fica guardado: quando a prévia (re)carrega ela avisa
 * "pronta" e recebe o rascunho de novo — senão salvar, recarregar ou o iframe
 * chegar depois do painel apagaria o que está na tela.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';

export const TIPO_RASCUNHO = 'cardapidex:rascunho';
export const TIPO_FOCAR = 'cardapidex:focar';
export const TIPO_PRONTA = 'cardapidex:previa-pronta';

/** Partes da vitrine que a prévia sabe destacar. */
export type AreaDaPrevia = 'topo' | 'cartao' | 'estoque' | 'peca-novamente';

export interface RascunhoDaPrevia {
  exibicao?: unknown;
  loja?: Record<string, unknown>;
}

export function usePreviaAoVivo(url: string) {
  const iframe = useRef<HTMLIFrameElement | null>(null);
  const ultimo = useRef<RascunhoDaPrevia | null>(null);

  const origem = useMemo(() => {
    try {
      return url ? new URL(url).origin : '';
    } catch {
      return '';
    }
  }, [url]);

  const postar = useCallback(
    (mensagem: Record<string, unknown>) => {
      const alvo = iframe.current?.contentWindow;
      if (!alvo || !origem) return;
      alvo.postMessage(mensagem, origem);
    },
    [origem]
  );

  useEffect(() => {
    if (!origem) return undefined;
    const aoReceber = (e: MessageEvent) => {
      if (e.origin !== origem || e.data?.tipo !== TIPO_PRONTA) return;
      if (e.source && iframe.current?.contentWindow && e.source !== iframe.current.contentWindow) return;
      if (ultimo.current) postar({ tipo: TIPO_RASCUNHO, ...ultimo.current });
    };
    window.addEventListener('message', aoReceber);
    return () => window.removeEventListener('message', aoReceber);
  }, [origem, postar]);

  const registrarIframe = useCallback((el: HTMLIFrameElement | null) => {
    iframe.current = el;
  }, []);

  const enviarRascunho = useCallback(
    (rascunho: RascunhoDaPrevia) => {
      ultimo.current = rascunho;
      postar({ tipo: TIPO_RASCUNHO, ...rascunho });
    },
    [postar]
  );

  const focar = useCallback((area: AreaDaPrevia) => postar({ tipo: TIPO_FOCAR, area }), [postar]);

  return { registrarIframe, enviarRascunho, focar };
}

export default usePreviaAoVivo;
