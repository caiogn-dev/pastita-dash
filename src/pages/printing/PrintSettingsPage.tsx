import { copyToClipboard } from '../../utils/clipboard';
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  PrinterIcon,
  DocumentTextIcon,
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
  updatePrintAgent,
  PAPEIS_DO_AGENTE,
  PapelDoAgente,
  papeisDoAgente,
  rotatePrintAgentKey,
  deletePrintAgent,
  listPrintJobs,
  requeuePrintJob,
  cancelPrintJob,
  cancelarFilaDeImpressao,
  NA_FILA,
  podeCancelar,
  imprimeEtiquetas,
  enviarEtiquetasParaAgente,
  carregarLayouts,
  LayoutDeEtiqueta,
} from '../../services/printing';
import { PageShell, Tabela, RowActions } from '../../components/ui';
import AssistenteDeInstalacao from './AssistenteDeInstalacao';
import {
  ROTULO_DA_SITUACAO,
  TOM_DA_SITUACAO,
  desdeQuando,
} from '../../components/printing/situacaoDaImpressora';

const JOB_STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  completed: 'success',
  printed: 'success',
  pending: 'warning',
  claimed: 'warning',
  failed: 'danger',
};

const fmtDate = (iso: string | null) =>
  iso ? format(new Date(iso), "dd/MM HH:mm", { locale: ptBR }) : '—';

const STATION_LABELS: Record<string, string> = {
  kitchen: 'Cozinha (comanda)',
  balcao: 'Balcão (cupom)',
};

const PrintSettingsPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  // UUID da loja selecionada — o assistente cria o agente com a FK, não o slug
  const { store } = useStore();
  const [agents, setAgents] = useState<PrintAgent[]>([]);
  const [ConfirmDialog, confirmAction] = useConfirm();
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [assistenteAberto, setAssistenteAberto] = useState(false);
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

  // Uma linha de exemplo no layout da loja: prova que a impressora, a chave e
  // o layout estão conversando, sem precisar abrir a tela de Etiquetas.
  const handleTesteDeEtiqueta = async (agent: PrintAgent) => {
    try {
      let layout: LayoutDeEtiqueta | undefined;
      try { layout = (await carregarLayouts(agent.store)).data.validade.layout; } catch { layout = undefined; }
      const colunas = layout?.papel.colunas ?? 1;
      const exemplo = { name: 'Etiqueta de teste', manip: new Date().toLocaleDateString('pt-BR'), val: new Date(Date.now() + 5 * 86400000).toLocaleDateString('pt-BR') };
      await enviarEtiquetasParaAgente({
        store: agent.store, agent: agent.id, modelo: 'validade', etiquetas: Array.from({ length: colunas }, () => exemplo),
        ...(layout ? { motor: 'bitmap' as const, layout } : { config: { cols: 3, labelW: 33, labelH: 22, gap: 2, paperW: 107 } }),
      });
      toast.success(`Teste enviado para ${agent.name}.`);
    } catch {
      toast.error('Não foi possível enviar o teste.');
    }
  };

  // O que o agente imprime. Marcar/desmarcar grava na hora: é uma decisão
  // de bancada ("o pc da produção fica só com etiquetas"), não um formulário.
  const handleTogglePapel = async (agent: PrintAgent, papel: PapelDoAgente) => {
    if (!storeId) return;
    const atual = papeisDoAgente(agent);
    const imprime = atual.includes(papel) ? atual.filter((p) => p !== papel) : [...atual, papel];
    try {
      await updatePrintAgent(storeId, agent.id, { imprime });
      loadData();
    } catch {
      toast.error('Erro ao mudar o que o agente imprime');
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

  const handleCancelar = async (job: PrintJob) => {
    try {
      await cancelPrintJob(job.id);
      toast.success('Impressão cancelada');
      loadData();
    } catch {
      toast.error('Erro ao cancelar');
    }
  };

  const naFila = jobs.filter((j) => NA_FILA.includes(j.status)).length;
  const [confirmandoFila, setConfirmandoFila] = useState(false);
  const limparFila = async () => {
    if (!storeId) return;
    setConfirmandoFila(false);
    try {
      const { data } = await cancelarFilaDeImpressao(storeId);
      toast.success(data.canceladas === 1 ? '1 impressão cancelada' : `${data.canceladas} impressões canceladas`);
      loadData();
    } catch {
      toast.error('Erro ao cancelar a fila');
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
      titulo="Impressoras e comanda"
      acoes={
        <div className="flex gap-2">
        <Link to="comanda">
          <Button variant="outline" leftIcon={<DocumentTextIcon className="w-4 h-4" />}>Layout da comanda</Button>
        </Link>
        <Button variant="ghost" onClick={loadData} disabled={loading} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
        {loading ? 'Atualizando…' : 'Atualizar'}
        </Button>
        <Button onClick={() => setAssistenteAberto(true)} leftIcon={<PrinterIcon className="w-4 h-4" />}>
        Instalar impressora
        </Button>
        </div>
      }
    >

      {/* Agentes */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-fg-token mb-4">Computadores com impressora</h2>
        <Tabela<(typeof agents)[number]>
          itens={agents}
          chave={(a) => String(a.id)}
          rotuloDaLinha={(a) => a.name}
          carregando={loading}
          vazio={{
            titulo: 'Nenhum agente configurado',
            descricao:
              'Crie um computador aqui e cole a chave no programa de impressão instalado nele.',
            icone: <PrinterIcon className="h-12 w-12" />,
            acao: <Button onClick={() => setAssistenteAberto(true)} leftIcon={<PrinterIcon className="w-4 h-4" />}>Instalar impressora</Button>,
          }}
          colunas={[
            {
              chave: 'agente',
              cabecalho: 'Computador',
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
              chave: 'imprime',
              cabecalho: 'Imprime',
              render: (a) => {
                const papeis = papeisDoAgente(a);
                return (
                  <div className="flex flex-col gap-0.5 text-sm">
                    {PAPEIS_DO_AGENTE.map(({ valor, rotulo }) => (
                      <label key={valor} className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={papeis.includes(valor)}
                          onChange={() => handleTogglePapel(a, valor)}
                          aria-label={`${a.name} imprime ${rotulo}`}
                        />
                        {rotulo}
                        {valor === 'etiquetas' && papeis.includes('etiquetas') && storeId && (
                          <Link to={`/stores/${storeId}/etiquetas/desenho/validade`} className="ml-1 text-xs text-brand underline" title="Desenhar e calibrar a etiqueta desta impressora">desenhar</Link>
                        )}
                      </label>
                    ))}
                  </div>
                );
              },
            },
            {
              chave: 'impressora',
              cabecalho: 'Impressora',
              render: (a) =>
                (a.available_printers?.length ?? 0) > 0 ? (
                  <select
                    value={a.printer_name || ''}
                    onChange={(e) => handleSelectPrinter(a, e.target.value)}
                    className="controle h-9 max-w-[220px] px-2 text-sm"
                    title="Impressoras detectadas no computador"
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
                  <span title="As impressoras aparecem quando o computador conectar">
                    {a.printer_name || '—'}
                    <span className="block text-badge text-fg-muted-token">
                      aguardando detecção…
                    </span>
                  </span>
                ),
            },
            {
              chave: 'status',
              cabecalho: 'Situação',
              render: (a) => {
                // A situação vem do vigia de impressão do backend. Backend
                // antigo não manda; aí vale o online/offline de sempre.
                const situacao = a.situacao;
                const desde = situacao && situacao !== 'ok' ? desdeQuando(a.situacao_desde) : null;
                return (
                  <>
                    {situacao ? (
                      <Badge tone={TOM_DA_SITUACAO[situacao]} className="gap-1">
                        {situacao === 'offline' ? (
                          <SignalSlashIcon className="h-3.5 w-3.5" />
                        ) : (
                          <SignalIcon className="h-3.5 w-3.5" />
                        )}
                        {ROTULO_DA_SITUACAO[situacao]}
                      </Badge>
                    ) : a.is_online ? (
                      <Badge tone="success" className="gap-1">
                        <SignalIcon className="h-3.5 w-3.5" /> Online
                      </Badge>
                    ) : (
                      <Badge tone="danger" className="gap-1">
                        <SignalSlashIcon className="h-3.5 w-3.5" /> Offline
                      </Badge>
                    )}
                    {desde && (
                      <p className="mt-0.5 text-xs text-fg-muted-token">desde {desde}</p>
                    )}
                    {situacao && situacao !== 'ok' && a.situacao_detalhe ? (
                      <p className="mt-0.5 max-w-[260px] text-xs text-[var(--danger)]">
                        {a.situacao_detalhe}
                      </p>
                    ) : (
                      a.last_error && (
                        <p
                          className="mt-0.5 max-w-[200px] truncate text-xs text-[var(--danger)]"
                          title={a.last_error}
                        >
                          {a.last_error}
                        </p>
                      )
                    )}
                    {a.versao_desatualizada && (
                      <Badge tone="warning" className="mt-1">
                        Atualize o programa de impressão ({a.app_version || '?'} → {a.versao_atual || 'nova'})
                      </Badge>
                    )}
                  </>
                );
              },
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
                  rotulo={`Ações de ${a.name}`}
                  acoes={[
                    ...(imprimeEtiquetas(a) ? [{
                      rotulo: 'Imprimir etiqueta de teste',
                      icone: <PrinterIcon className="h-4 w-4" />,
                      onClick: () => handleTesteDeEtiqueta(a),
                    }] : []),
                    {
                      rotulo: 'Gerar nova chave',
                      icone: <KeyIcon className="h-4 w-4" />,
                      onClick: () => handleRotateKey(a),
                    },
                    {
                      rotulo: 'Remover computador',
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

      {/* Para quem avisar quando a impressora parar */}

      {/* Fila de jobs */}
      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-fg-token">Últimas impressões</h2>
          {naFila > 0 && (
            <div className="flex gap-2">
              {confirmandoFila ? (
                <>
                  <Button variant="ghost" onClick={() => setConfirmandoFila(false)}>Manter</Button>
                  <Button variant="danger" onClick={limparFila}>Confirmar: cancelar {naFila}</Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setConfirmandoFila(true)}>Cancelar fila ({naFila})</Button>
              )}
            </div>
          )}
        </div>
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
                <div className="flex justify-end gap-1">
                  {podeCancelar(j.status) && (
                    <Button
                      variant="ghost"
                      className="text-danger-token"
                      aria-label={`Cancelar impressão ${j.order_number || j.title || j.id}`}
                      onClick={() => handleCancelar(j)}
                    >
                      Cancelar
                    </Button>
                  )}
                  {!NA_FILA.includes(j.status) && (
                    <Button variant="ghost" onClick={() => handleRequeue(j)}>
                      Reimprimir
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Modal da chave (exibida uma única vez) */}
      <Modal isOpen={Boolean(revealedKey)} onClose={() => setRevealedKey(null)} title="Chave de acesso — copie agora">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-fg-muted-token">
            <strong>{revealedKey?.agentName}</strong> · aparece uma vez só. Cole em <code>config/agent.json</code>.
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
      <AssistenteDeInstalacao
        aberto={assistenteAberto}
        onClose={() => setAssistenteAberto(false)}
        storeSlug={storeId ?? ''}
        storeUuid={store?.id}
        onMudou={loadData}
      />
      {ConfirmDialog}
    </PageShell>
  );
};

export default PrintSettingsPage;
