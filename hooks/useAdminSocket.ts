import { useEffect, useRef } from "react";
import { useSWRConfig } from "swr";

const buildWsUrl = () => {
  const envWs = process.env.NEXT_PUBLIC_WS_URL;
  if (envWs) return envWs;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  try {
    const url = new URL(apiUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws/admin/";
    url.search = "";
    return url.toString();
  } catch {
    return "ws://localhost:8000/ws/admin/";
  }
};

export function useAdminSocket() {
  const { mutate } = useSWRConfig();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = sessionStorage.getItem("pastita_dash_token");
    if (!token) return;

    const baseUrl = buildWsUrl();
    const wsUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.event === "order" || data?.event === "payment") {
          mutate((key) => typeof key === "string" && key.startsWith("/admin/orders/"));
          mutate("/admin/summary/");
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
    };
  }, [mutate]);
}
