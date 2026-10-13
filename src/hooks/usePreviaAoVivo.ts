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
export const TIPO_INSPECIONAR = 'cardapidex:inspecionar';
export const TIPO_SELECIONAR = 'cardapidex:selecionar';

/** Partes da vitrine que a prévia sabe destacar. */
export type AreaDaPrevia = 'topo' | 'banners' | 'cartao' | 'estoque' | 'peca-novamente';
const AREAS: AreaDaPrevia[] = ['topo', 'banners', 'cartao', 'estoque', 'peca-novamente'];

export interface RascunhoDaPrevia {
  exibicao?: unknown;
  loja?: Record<string, unknown>;
}

export interface OpcoesDaPrevia {
  /** Dono clicou numa parte da prévia com o inspetor ligado. */
  onSelecionar?: (area: AreaDaPrevia) => void;
}

export function usePreviaAoVivo(url: string, { onSelecionar }: OpcoesDaPrevia = {}) {
  const iframe = useRef<HTMLIFrameElement | null>(null);
  const ultimo = useRef<RascunhoDaPrevia | null>(null);
  const inspetorLigado = useRef(false);
  const aoSelecionar = useRef(onSelecionar);
  aoSelecionar.current = onSelecionar;

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
      if (e.origin !== origem) return;
      if (e.source && iframe.current?.contentWindow && e.source !== iframe.current.contentWindow) return;
      if (e.data?.tipo === TIPO_PRONTA) {
        if (ultimo.current) postar({ tipo: TIPO_RASCUNHO, ...ultimo.current });
        postar({ tipo: TIPO_INSPECIONAR, ligado: inspetorLigado.current });
      } else if (e.data?.tipo === TIPO_SELECIONAR && AREAS.includes(e.data.area)) {
        aoSelecionar.current?.(e.data.area);
      }
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

  const inspecionar = useCallback(
    (ligado: boolean) => {
      inspetorLigado.current = ligado;
      postar({ tipo: TIPO_INSPECIONAR, ligado });
    },
    [postar]
  );

  return { registrarIframe, enviarRascunho, focar, inspecionar };
}

export default usePreviaAoVivo;
