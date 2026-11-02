/**
 * Alarme de pedido novo (28/10).
 *
 * Sino de balcão que repete a cada 6 s até o pedido sair de "Recebido" —
 * antes era um arpejo que calava em 30 s, e pedido entrado com a cozinha
 * barulhenta ficava parado sem ninguém ver. Quem decide quando parar é
 * `alarmeDePedidos` (aceito, cancelado, PIX não pago); teto de 10 min para
 * não tocar a noite inteira num painel esquecido aberto.
 * Liga/desliga e volume: `somDosPedidos`, por aparelho.
 */
import { useCallback, useRef, useEffect, useState } from 'react';
import { useRootStore } from '../stores/rootStore';
import { useSomDosPedidos, GANHO_DO_VOLUME } from '../stores/somDosPedidos';
import { tocarSino, tocarPix } from '../utils/sinoDoBalcao';
import { aindaAguardando } from './alarmeDePedidos';

const REPETE_A_CADA_MS = 6000;
const TETO_MS = 10 * 60 * 1000;

function pedidosDaLoja() {
  const { orders, selectedStoreId } = useRootStore.getState();
  return (selectedStoreId && orders[selectedStoreId]) || [];
}

export const useNotificationSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const aguardando = useRef<Set<string>>(new Set());
  const intervalo = useRef<number | undefined>(undefined);
  const teto = useRef<number | undefined>(undefined);
  const [isAlertActive, setIsAlertActive] = useState(false);

  const initAudio = useCallback(() => {
    if (audioCtx.current) {
      if (audioCtx.current.state === 'suspended') void audioCtx.current.resume();
      return audioCtx.current;
    }
    try {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext!)();
      return audioCtx.current;
    } catch {
      return null;
    }
  }, []);

  // O navegador só libera áudio depois de um clique ou tecla.
  useEffect(() => {
    const liberar = () => {
      initAudio();
      if ('Notification' in window && Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    };
    document.addEventListener('click', liberar, { once: true });
    document.addEventListener('keydown', liberar, { once: true });
    return () => {
      document.removeEventListener('click', liberar);
      document.removeEventListener('keydown', liberar);
    };
  }, [initAudio]);

  const ganho = () => GANHO_DO_VOLUME[useSomDosPedidos.getState().volume];

  const sino = useCallback(() => {
    const ctx = initAudio();
    if (ctx) tocarSino(ctx, ganho());
  }, [initAudio]);

  const stopAlert = useCallback(() => {
    window.clearInterval(intervalo.current);
    window.clearTimeout(teto.current);
    intervalo.current = undefined;
    teto.current = undefined;
    aguardando.current.clear();
    setIsAlertActive(false);
  }, []);

  const conferir = useCallback(() => {
    aguardando.current = aindaAguardando(aguardando.current, pedidosDaLoja());
    if (aguardando.current.size === 0) stopAlert();
    return aguardando.current.size > 0;
  }, [stopAlert]);

  const armar = useCallback((orderId: string) => {
    aguardando.current.add(orderId);
    if (intervalo.current) return;
    setIsAlertActive(true);
    intervalo.current = window.setInterval(() => { if (conferir()) sino(); }, REPETE_A_CADA_MS);
    teto.current = window.setTimeout(stopAlert, TETO_MS);
  }, [conferir, sino, stopAlert]);

  // Aceitou no quadro (ou em outra aba, via WebSocket) → cala na hora.
  useEffect(() => useRootStore.subscribe(() => {
    if (intervalo.current) conferir();
  }), [conferir]);

  useEffect(() => stopAlert, [stopAlert]);

  const avisarNoSistema = (titulo: string, corpo: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      new Notification(titulo, { body: corpo, icon: '/brand/icon-192.png', tag: 'new-order', requireInteraction: true });
    } catch {
      // Notificação do sistema é bônus; o sino já tocou.
    }
  };

  const playOrderSound = useCallback((orderId?: string | null) => {
    if (!useSomDosPedidos.getState().ligado) return;
    sino();
    if (orderId) armar(orderId);
    avisarNoSistema('Novo pedido!', 'Você tem um novo pedido para aceitar');
  }, [sino, armar]);

  /** PIX caiu: toque de caixa e, se o pedido ainda espera aceite, o sino segue. */
  const playPixSound = useCallback((orderId?: string | null) => {
    if (!useSomDosPedidos.getState().ligado) return;
    const ctx = initAudio();
    if (ctx) tocarPix(ctx, ganho());
    if (orderId) {
      aguardando.current.add(orderId);
      if (conferir()) armar(orderId);
    }
  }, [initAudio, conferir, armar]);

  /** Botão "Testar" das preferências: toca mesmo com o som desligado. */
  const testar = useCallback((qual: 'sino' | 'pix' = 'sino') => {
    const ctx = initAudio();
    if (!ctx) return;
    (qual === 'pix' ? tocarPix : tocarSino)(ctx, ganho());
  }, [initAudio]);

  return {
    playOrderSound,
    playPixSound,
    playNotificationSound: playOrderSound,
    stopAlert,
    testar,
    isAlertActive,
  };
};

export default useNotificationSound;
