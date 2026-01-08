import { useEffect, useState } from "react";
import { usePanelWebhookPoll } from "@/hooks/usePanelWebhookPoll";

type PanelEvent = {
  event?: string | null;
  data?: Record<string, unknown>;
  received_at?: string;
};

const eventLabels: Record<string, string> = {
  order_created: "Novo pedido recebido",
  payment_updated: "Pagamento atualizado",
};

const formatMessage = (evt: PanelEvent) => {
  const orderNumber = evt.data?.order_number as string | undefined;
  const customerName = evt.data?.customer_name as string | undefined;
  if (orderNumber && customerName) {
    return `Pedido ${orderNumber} - ${customerName}`;
  }
  if (orderNumber) {
    return `Pedido ${orderNumber}`;
  }
  return "Evento atualizado";
};

const playSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      ctx.close();
    }, 180);
  } catch {
    // Ignore audio errors (autoplay restrictions).
  }
};

const maybeNotify = async (title: string, body: string) => {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      return;
    }
  }
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
};

export function EventsBridge() {
  const [toast, setToast] = useState<PanelEvent | null>(null);

  usePanelWebhookPoll(5000, (event) => {
    setToast(event);
    playSound();
    const title = eventLabels[event.event || ""] || "Atualizacao";
    const message = formatMessage(event);
    maybeNotify(title, message);
  });

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const title = eventLabels[toast.event || ""] || "Atualizacao";
  const message = formatMessage(toast);

  return (
    <div className="toast">
      <div className="toast-title">{title}</div>
      <div className="toast-body">{message}</div>
    </div>
  );
}
