import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  PrinterIcon,
  PlusIcon,
  ArrowPathIcon,
  KeyIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  SignalIcon,
  SignalSlashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, Button, Badge, Modal, Loading } from '../../components/common';
import {
  PrintAgent,
  PrintJob,
  listPrintAgents,
  createPrintAgent,
  updatePrintAgent,
  rotatePrintAgentKey,
  deletePrintAgent,
  listPrintJobs,
  requeuePrintJob,
} from '../../services/printing';

const JOB_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'subtle'> = {
  completed: 'success',
  printed: 'success',
  pending: 'warning',
  claimed: 'warning',
  failed: 'danger',
};

const fmtDate = (iso: string | null) =>
  iso ? format(new Date(iso), "dd/MM HH:mm", { locale: ptBR }) : '—';

const PrintSettingsPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const [agents, setAgents] = useState<PrintAgent[]>([]);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newPrinterName, setNewPrinterName] = useState('');
  const [creating, setCreating] = useState(false);
  // Chave exibida uma única vez após criar/rotacionar
  const [revealedKey, setRevealedKey] = useState<{ agentName: string; key: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [agentsRes, jobsRes] = await Promise.all([
        listPrintAgents(storeId),
        listPrintJobs(storeId),
      ]);
      const agentList = agentsRes.data.results ?? agentsRes.data;
      const jobList = jobsRes.data.results ?? jobsRes.data;
      setAgents(Array.isArray(agentList) ? agentList : []);
      setJobs(Array.isArray(jobList) ? jobList.slice(0, 30) : []);
    } catch {
      toast.error('Erro ao carregar dados de impressão');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleCreate = async () => {
    if (!storeId || !newAgentName.trim()) return;
    setCreating(true);
    try {
      const res = await createPrintAgent(storeId, {
        name: newAgentName.trim(),
        printer_name: newPrinterName.trim(),
      });
      setIsCreateOpen(false);
      setNewAgentName('');
      setNewPrinterName('');
      if (res.data.api_key) {
        setRevealedKey({ agentName: res.data.name, key: res.data.api_key });
      }
      loadData();
    } catch {
      toast.error('Erro ao criar agente de impressão');
    } finally {
      setCreating(false);
    }
  };

  const handleSelectPrinter = async (agent: PrintAgent, printerName: string) => {
    if (!storeId || !printerName) return;
    try {
      await updatePrintAgent(storeId, agent.id, { printer_name: printerName });
      toast.success(`Impressora "${printerName}" selecionada — o agent troca no próximo heartbeat (~30s)`);
      loadData();
    } catch {
      toast.error('Erro ao trocar impressora');
    }
  };

  const handleRotateKey = async (agent: PrintAgent) => {
    if (!storeId) return;
    try {
      const res = await rotatePrintAgentKey(storeId, agent.id);
      const key = res.data.api_key || res.data.key;
      if (key) setRevealedKey({ agentName: agent.name, key });
      toast.success('Chave rotacionada — a anterior parou de funcionar');
    } catch {
      toast.error('Erro ao rotacionar chave');
    }
  };

  const handleDelete = async (agent: PrintAgent) => {
    if (!storeId) return;
    if (!window.confirm(`Remover o agente "${agent.name}"? A impressão automática nessa estação para de funcionar.`)) return;
    try {
      await deletePrintAgent(storeId, agent.id);
      toast.success('Agente removido');
      loadData();
    } catch {
      toast.error('Erro ao remover agente');
    }
  };

  const handleRequeue = async (job: PrintJob) => {
    if (!storeId) return;
    try {
      await requeuePrintJob(storeId, job.id);
      toast.success('Job reenfileirado para impressão');
      loadData();
    } catch {
      toast.error('Erro ao reimprimir');
    }
  };

  const copyKey = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey.key);
    toast.success('Chave copiada');
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg-primary flex items-center gap-2">
            <PrinterIcon className="w-7 h-7" />
            Impressão automática
          </h1>
          <p className="text-sm text-fg-muted mt-0.5">
            Comandas impressas automaticamente quando entra pedido — sem dialog do navegador.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={loadData} isLoading={loading} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)} leftIcon={<PlusIcon className="w-4 h-4" />}>
            Novo agente
          </Button>
        </div>
      </div>

      {/* Agentes */}
      <Card>
        <h2 className="text-lg font-semibold text-fg-primary mb-4">Agentes (computadores com impressora)</h2>
        {loading && agents.length === 0 ? (
          <Loading />
        ) : agents.length === 0 ? (
          <div className="text-center py-8">
            <PrinterIcon className="w-12 h-12 text-fg-muted mx-auto mb-3" />
            <p className="font-medium text-fg-primary">Nenhum agente configurado</p>
            <p className="text-sm text-fg-muted mt-1 max-w-md mx-auto">
              Instale o print-agent no computador do caixa (Windows + impressora térmica),
              crie um agente aqui e cole a chave no <code>config/agent.json</code>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary text-left">
                  <th className="pb-2 px-2 text-fg-muted font-medium">Agente</th>
                  <th className="pb-2 px-2 text-fg-muted font-medium">Impressora</th>
                  <th className="pb-2 px-2 text-fg-muted font-medium">Status</th>
                  <th className="pb-2 px-2 text-fg-muted font-medium">Último contato</th>
                  <th className="pb-2 px-2 text-fg-muted font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id} className="border-b border-border-primary last:border-0">
                    <td className="py-2.5 px-2">
                      <p className="font-medium text-fg-primary">{agent.name}</p>
                      <p className="text-xs text-fg-muted">{agent.host_name || agent.platform}</p>
                    </td>
                    <td className="py-2.5 px-2">
                      {(agent.available_printers?.length ?? 0) > 0 ? (
                        <select
                          value={agent.printer_name || ''}
                          onChange={(e) => handleSelectPrinter(agent, e.target.value)}
                          className="text-sm border border-border-primary rounded-lg px-2 py-1.5 bg-bg-card text-fg-primary max-w-[220px]"
                          title="Impressoras detectadas no computador do agent"
                        >
                          {!agent.printer_name && <option value="">Escolha a impressora…</option>}
                          {agent.printer_name && !agent.available_printers!.includes(agent.printer_name) && (
                            <option value={agent.printer_name}>{agent.printer_name} (não detectada)</option>
                          )}
                          {agent.available_printers!.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-fg-primary" title="Conecte o agent para detectar as impressoras automaticamente">
                          {agent.printer_name || '—'}
                          <span className="block text-[11px] text-fg-muted">aguardando detecção…</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      {agent.is_online ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                          <SignalIcon className="w-3.5 h-3.5" /> Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium">
                          <SignalSlashIcon className="w-3.5 h-3.5" /> Offline
                        </span>
                      )}
                      {agent.last_error && (
                        <p className="text-xs text-red-400 mt-0.5 max-w-[200px] truncate" title={agent.last_error}>
                          {agent.last_error}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-fg-muted">{fmtDate(agent.last_seen_at)}</td>
                    <td className="py-2.5 px-2">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleRotateKey(agent)}
                          className="p-1.5 rounded-lg hover:bg-bg-hover"
                          title="Gerar nova chave (a atual para de funcionar)"
                        >
                          <KeyIcon className="w-4 h-4 text-fg-muted" />
                        </button>
                        <button
                          onClick={() => handleDelete(agent)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Remover agente"
                        >
                          <TrashIcon className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Fila de jobs */}
      <Card>
        <h2 className="text-lg font-semibold text-fg-primary mb-4">Últimas impressões</h2>
        {loading && jobs.length === 0 ? (
          <Loading />
        ) : jobs.length === 0 ? (
          <p className="text-sm text-fg-muted py-4 text-center">Nenhum job de impressão ainda. Eles aparecem aqui quando entra pedido.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary text-left">
                  <th className="pb-2 px-2 text-fg-muted font-medium">Pedido</th>
                  <th className="pb-2 px-2 text-fg-muted font-medium">Template</th>
                  <th className="pb-2 px-2 text-fg-muted font-medium">Status</th>
                  <th className="pb-2 px-2 text-fg-muted font-medium">Criado</th>
                  <th className="pb-2 px-2 text-fg-muted font-medium">Impresso</th>
                  <th className="pb-2 px-2 text-fg-muted font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border-primary last:border-0">
                    <td className="py-2 px-2 font-medium text-fg-primary">{job.order_number || job.title || '—'}</td>
                    <td className="py-2 px-2 text-fg-muted">{job.template}</td>
                    <td className="py-2 px-2">
                      <Badge variant={JOB_STATUS_VARIANT[job.status] || 'subtle'}>{job.status}</Badge>
                      {job.last_error && (
                        <p className="text-xs text-red-400 mt-0.5 max-w-[180px] truncate" title={job.last_error}>
                          {job.last_error}
                        </p>
                      )}
                    </td>
                    <td className="py-2 px-2 text-fg-muted">{fmtDate(job.created_at)}</td>
                    <td className="py-2 px-2 text-fg-muted">{fmtDate(job.printed_at)}</td>
                    <td className="py-2 px-2">
                      <div className="flex justify-end">
                        <Button variant="ghost" size="sm" onClick={() => handleRequeue(job)}>
                          Reimprimir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de criação */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Novo agente de impressão">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">Nome do agente</label>
            <input
              type="text"
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              placeholder="Ex.: Caixa principal"
              className="w-full text-sm border border-border-primary rounded-lg px-3 py-2 bg-bg-card text-fg-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">
              Impressora <span className="text-fg-muted font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={newPrinterName}
              onChange={(e) => setNewPrinterName(e.target.value)}
              placeholder="Deixe vazio — detectamos automaticamente"
              className="w-full text-sm border border-border-primary rounded-lg px-3 py-2 bg-bg-card text-fg-primary"
            />
            <p className="text-xs text-fg-muted mt-1">
              Assim que o agent conectar, as impressoras do computador aparecem aqui num dropdown para você escolher.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} isLoading={creating} disabled={!newAgentName.trim()}>
              Criar agente
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal da chave (exibida uma única vez) */}
      <Modal isOpen={Boolean(revealedKey)} onClose={() => setRevealedKey(null)} title="Chave do agente — copie agora">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-fg-muted">
            Esta chave do agente <strong>{revealedKey?.agentName}</strong> é exibida{' '}
            <strong>uma única vez</strong>. Cole no <code>config/agent.json</code> do print-agent.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-bg-hover rounded-lg px-3 py-2 break-all select-all">
              {revealedKey?.key}
            </code>
            <Button variant="outline" size="sm" onClick={copyKey} leftIcon={<ClipboardDocumentIcon className="w-4 h-4" />}>
              Copiar
            </Button>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setRevealedKey(null)}>Já copiei</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PrintSettingsPage;
