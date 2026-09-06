import { copyToClipboard } from '../../utils/clipboard';
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
import { Card, Button, Badge } from '../../components/ui';
import { Modal } from '../../components/common';
import { useConfirm } from '../../hooks/useConfirm';
import { useStore } from '../../hooks/useStore';
import { PRINT_JOB_STATUS_LABELS } from '../../utils/rotulosDeEstado';
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
import { PageShell, Tabela, RowActions } from '../../components/ui';

const JOB_STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  completed: 'success',
  printed: 'success',
  pending: 'warning',
  claimed: 'warning',
  failed: 'danger',
};

const fmtDate = (iso: string | null) =>
  iso ? format(new Date(iso), "dd/MM HH:mm", { locale: ptBR }) : '—';

/** Slug exigido pelo backend (SlugField sem default) — derivado do nome. */
const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'agente';

const STATION_LABELS: Record<string, string> = {
  kitchen: 'Cozinha (comanda)',
  balcao: 'Balcão (cupom)',
};

const PrintSettingsPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  // UUID da loja selecionada — o create do agente exige a FK, não o slug
  const { store } = useStore();
  const [agents, setAgents] = useState<PrintAgent[]>([]);
  const [ConfirmDialog, confirmAction] = useConfirm();
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newPrinterName, setNewPrinterName] = useState('');
  const [newStation, setNewStation] = useState('kitchen');
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
    if (!store?.id) {
      toast.error('Selecione a loja no menu superior antes de criar o agente');
      return;
    }
    setCreating(true);
    try {
      const res = await createPrintAgent(storeId, {
        store: store.id,
        name: newAgentName.trim(),
        slug: slugify(newAgentName),
        printer_name: newPrinterName.trim(),
        station: newStation,
      });
      setIsCreateOpen(false);
      setNewAgentName('');
      setNewPrinterName('');
      setNewStation('kitchen');
      if (res.data.api_key) {
        setRevealedKey({ agentName: res.data.name, key: res.data.api_key });
      }
      loadData();
    } catch (err) {
      // Mostra o motivo real da validação (ex.: campo faltando) em vez de erro genérico
      const detail = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      toast.error(detail ? `Erro ao criar agente: ${JSON.stringify(detail)}` : 'Erro ao criar agente de impressão');
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
    const confirmed = await confirmAction({
      title: 'Remover agente de impressão',
      message: `Remover o agente "${agent.name}"? A impressão automática nessa estação para de funcionar.`,
      confirmText: 'Remover',
      variant: 'danger',
    });
    if (!confirmed) return;
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

  const copyKey = async () => {
    if (!revealedKey) return;
    const ok = await copyToClipboard(revealedKey.key);
    if (ok) toast.success('Chave copiada');
    else toast.error('Não foi possível copiar. Copie manualmente.');
  };

  return (
    <PageShell
      titulo="Impressão automática"
      acoes={
        <div className="flex gap-2">
        <Button variant="ghost" onClick={loadData} disabled={loading} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
        {loading ? 'Atualizando…' : 'Atualizar'}
        </Button>
        <Button onClick={() => setIsCreateOpen(true)} leftIcon={<PlusIcon className="w-4 h-4" />}>
        Novo agente
        </Button>
        </div>
      }
    >

      {/* Agentes */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-fg-token mb-4">Agentes (computadores com impressora)</h2>
        <Tabela<(typeof agents)[number]>
          itens={agents}
          chave={(a) => String(a.id)}
          rotuloDaLinha={(a) => `Agente ${a.name}`}
          carregando={loading}
          vazio={{
            titulo: 'Nenhum agente configurado',
            descricao:
              'Instale o print-agent no computador do caixa (Windows + impressora térmica), crie um agente aqui e cole a chave no config/agent.json.',
            icone: <PrinterIcon className="h-12 w-12" />,
          }}
          colunas={[
            {
              chave: 'agente',
              cabecalho: 'Agente',
              render: (a) => (
                <div className="min-w-0">
                  <p className="font-medium text-fg-token">{a.name}</p>
                  <p className="text-xs text-fg-muted-token">{a.host_name || a.platform}</p>
                </div>
              ),
            },
            {
              chave: 'estacao',
              cabecalho: 'Estação',
              render: (a) => (
                <Badge tone={a.station === 'balcao' ? 'warning' : 'neutral'}>
                  {STATION_LABELS[a.station] || a.station}
                </Badge>
              ),
            },
            {
              chave: 'impressora',
              cabecalho: 'Impressora',
              render: (a) =>
                (a.available_printers?.length ?? 0) > 0 ? (
                  <select
                    value={a.printer_name || ''}
                    onChange={(e) => handleSelectPrinter(a, e.target.value)}
                    className="max-w-[220px] rounded border border-border-token bg-surface px-2 py-1.5 text-sm text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
                    title="Impressoras detectadas no computador do agente"
                  >
                    {!a.printer_name && <option value="">Escolha a impressora…</option>}
                    {a.printer_name && !a.available_printers!.includes(a.printer_name) && (
                      <option value={a.printer_name}>{a.printer_name} (não detectada)</option>
                    )}
                    {a.available_printers!.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span title="Conecte o agente para detectar as impressoras automaticamente">
                    {a.printer_name || '—'}
                    <span className="block text-badge text-fg-muted-token">
                      aguardando detecção…
                    </span>
                  </span>
                ),
            },
            {
              chave: 'status',
              cabecalho: 'Status',
              render: (a) => (
                <>
                  {a.is_online ? (
                    <Badge tone="success" className="gap-1">
                      <SignalIcon className="h-3.5 w-3.5" /> Online
                    </Badge>
                  ) : (
                    <Badge tone="danger" className="gap-1">
                      <SignalSlashIcon className="h-3.5 w-3.5" /> Offline
                    </Badge>
                  )}
                  {a.last_error && (
                    <p
                      className="mt-0.5 max-w-[200px] truncate text-xs text-[var(--danger)]"
                      title={a.last_error}
                    >
                      {a.last_error}
                    </p>
                  )}
                </>
              ),
            },
            {
              chave: 'contato',
              cabecalho: 'Último contato',
              classe: 'max-lg:hidden',
              render: (a) => fmtDate(a.last_seen_at),
            },
            {
              chave: 'acoes',
              cabecalho: 'Ações',
              alinhamento: 'direita',
              render: (a) => (
                // Eram uma chave e uma lixeira nuas. "Gerar nova chave" invalida
                // a atual e para a impressão do caixa até alguém colar a nova —
                // um pictograma não avisa isso.
                <RowActions
                  rotulo={`Ações do agente ${a.name}`}
                  acoes={[
                    {
                      rotulo: 'Gerar nova chave',
                      icone: <KeyIcon className="h-4 w-4" />,
                      onClick: () => handleRotateKey(a),
                    },
                    {
                      rotulo: 'Remover agente',
                      icone: <TrashIcon className="h-4 w-4" />,
                      destrutiva: true,
                      onClick: () => handleDelete(a),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Fila de jobs */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-fg-token mb-4">Últimas impressões</h2>
        <Tabela<(typeof jobs)[number]>
          itens={jobs}
          chave={(j) => String(j.id)}
          rotuloDaLinha={(j) => `Impressão ${j.order_number || j.title || j.id}`}
          carregando={loading}
          vazio={{
            titulo: 'Nenhuma impressão ainda',
            descricao: 'As comandas aparecem aqui quando entra pedido.',
            icone: <PrinterIcon className="h-12 w-12" />,
          }}
          colunas={[
            {
              chave: 'pedido',
              cabecalho: 'Pedido',
              render: (j) => (
                <span className="font-medium">{j.order_number || j.title || '—'}</span>
              ),
            },
            { chave: 'template', cabecalho: 'Comanda', classe: 'max-lg:hidden', render: (j) => j.template },
            {
              chave: 'status',
              cabecalho: 'Status',
              render: (j) => (
                <>
                  <Badge tone={JOB_STATUS_TONE[j.status] || 'neutral'}>
                    {PRINT_JOB_STATUS_LABELS[j.status] ?? j.status}
                  </Badge>
                  {j.last_error && (
                    <p
                      className="mt-0.5 max-w-[180px] truncate text-xs text-[var(--danger)]"
                      title={j.last_error}
                    >
                      {j.last_error}
                    </p>
                  )}
                </>
              ),
            },
            { chave: 'criado', cabecalho: 'Criado', render: (j) => fmtDate(j.created_at) },
            {
              chave: 'impresso',
              cabecalho: 'Impresso',
              classe: 'max-lg:hidden',
              render: (j) => fmtDate(j.printed_at),
            },
            {
              chave: 'acoes',
              cabecalho: 'Ações',
              alinhamento: 'direita',
              render: (j) => (
                <Button variant="ghost" onClick={() => handleRequeue(j)}>
                  Reimprimir
                </Button>
              ),
            },
          ]}
        />
      </Card>

      {/* Modal de criação */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Novo agente de impressão">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-fg-token mb-1">Nome do agente</label>
            <input
              type="text"
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              placeholder="Ex.: Caixa principal"
              className="w-full text-sm border border-border-token rounded px-3 py-2 bg-surface text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-token mb-1">Estação</label>
            <select
              value={newStation}
              onChange={(e) => setNewStation(e.target.value)}
              className="w-full text-sm border border-border-token rounded px-3 py-2 bg-surface text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="print-agent-station"
            >
              <option value="kitchen">Cozinha — comanda de pedido</option>
              <option value="balcao">Balcão — cupom do cliente (PDV)</option>
            </select>
            <p className="text-xs text-fg-muted-token mt-1">
              Cada estação recebe seus próprios jobs: comanda vai pra cozinha, cupom do PDV vai pro balcão.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-token mb-1">
              Impressora <span className="text-fg-muted-token font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={newPrinterName}
              onChange={(e) => setNewPrinterName(e.target.value)}
              placeholder="Deixe vazio — detectamos automaticamente"
              className="w-full text-sm border border-border-token rounded px-3 py-2 bg-surface text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <p className="text-xs text-fg-muted-token mt-1">
              Assim que o agent conectar, as impressoras do computador aparecem aqui num dropdown para você escolher.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !newAgentName.trim()}>
              {creating ? 'Criando…' : 'Criar agente'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal da chave (exibida uma única vez) */}
      <Modal isOpen={Boolean(revealedKey)} onClose={() => setRevealedKey(null)} title="Chave do agente — copie agora">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-fg-muted-token">
            Esta chave do agente <strong>{revealedKey?.agentName}</strong> é exibida{' '}
            <strong>uma única vez</strong>. Cole no <code>config/agent.json</code> do print-agent.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-surface-2 rounded px-3 py-2 break-all select-all">
              {revealedKey?.key}
            </code>
            <Button variant="outline" onClick={copyKey} leftIcon={<ClipboardDocumentIcon className="w-4 h-4" />}>
              Copiar
            </Button>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setRevealedKey(null)}>Já copiei</Button>
          </div>
        </div>
      </Modal>
      {ConfirmDialog}
    </PageShell>
  );
};

export default PrintSettingsPage;
