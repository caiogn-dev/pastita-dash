/**
 * Impressão local (pastita-print-agent) — gestão de agentes e fila de jobs.
 * Backend: StorePrintAgentViewSet / StorePrintJobViewSet (rotas nested por loja).
 */
import api from './api';

export interface PrintAgent {
  id: string;
  store: string;
  name: string;
  slug: string;
  status: string;
  station: string;
  platform: string;
  connection_mode: string;
  printer_name: string;
  printer_host: string | null;
  printer_port: number | null;
  poll_interval_seconds: number;
  last_seen_at: string | null;
  last_seen_ip: string | null;
  last_error: string;
  app_version: string;
  host_name: string;
  is_online: boolean;
  is_active: boolean;
  created_at: string;
  /** Presente apenas na resposta de criação/rotação — chave exibida uma única vez */
  api_key?: string;
}

export interface PrintJob {
  id: string;
  order: string | null;
  order_number: string | null;
  status: string;
  station: string;
  template: string;
  title: string;
  claimed_by_name: string | null;
  printed_at: string | null;
  failed_at: string | null;
  attempts: number;
  last_error: string;
  created_at: string;
}

const base = (slug: string) => `/stores/stores/${slug}`;

export const listPrintAgents = (storeSlug: string) =>
  api.get(`${base(storeSlug)}/print-agents/`);

export const createPrintAgent = (storeSlug: string, data: Partial<PrintAgent> & { name: string }) =>
  api.post(`${base(storeSlug)}/print-agents/`, data);

export const updatePrintAgent = (storeSlug: string, agentId: string, data: Partial<PrintAgent>) =>
  api.patch(`${base(storeSlug)}/print-agents/${agentId}/`, data);

export const rotatePrintAgentKey = (storeSlug: string, agentId: string) =>
  api.post(`${base(storeSlug)}/print-agents/${agentId}/rotate-key/`, {});

export const deletePrintAgent = (storeSlug: string, agentId: string) =>
  api.delete(`${base(storeSlug)}/print-agents/${agentId}/`);

export const listPrintJobs = (storeSlug: string, params?: { page?: number }) =>
  api.get(`${base(storeSlug)}/print-jobs/`, { params });

export const requeuePrintJob = (storeSlug: string, jobId: string) =>
  api.post(`${base(storeSlug)}/print-jobs/${jobId}/requeue/`, {});
