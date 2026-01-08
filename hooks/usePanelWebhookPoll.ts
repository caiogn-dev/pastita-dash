import { useEffect, useRef } from "react";
import useSWR, { useSWRConfig } from "swr";

type PanelEvent = {
  event?: string | null;
  received_at?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePanelWebhookPoll(
  intervalMs = 5000,
  onEvent?: (event: PanelEvent) => void,
) {
  const { mutate } = useSWRConfig();
  const lastRef = useRef<string | null>(null);
  const { data } = useSWR<PanelEvent>("/api/events/last", fetcher, {
    refreshInterval: intervalMs,
  });

  useEffect(() => {
    const receivedAt = data?.received_at;
    if (!receivedAt || receivedAt === lastRef.current) return;
    lastRef.current = receivedAt;
    mutate((key) => typeof key === "string" && key.startsWith("/admin/orders/"));
    mutate("/admin/summary/");
    if (data?.event) {
      onEvent?.(data);
    }
  }, [data, mutate, onEvent]);

  return data;
}
