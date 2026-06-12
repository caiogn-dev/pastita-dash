// Agent é considerado online se o heartbeat chegou nos últimos 90s
// (o pastita-print-agent faz polling a cada ~2s; 90s cobre quedas curtas de rede).
const ONLINE_THRESHOLD_MS = 90 * 1000;

export const isAgentOnline = (lastSeenAt: string | null | undefined, now: Date = new Date()): boolean => {
  if (!lastSeenAt) return false;
  const last = new Date(lastSeenAt).getTime();
  if (Number.isNaN(last)) return false;
  return now.getTime() - last <= ONLINE_THRESHOLD_MS;
};
