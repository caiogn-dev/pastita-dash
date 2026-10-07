import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PlusIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  PencilIcon,
  CpuChipIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Badge, Modal, Input, Loading } from '../../components/common';
import { agentFlowService, AgentFlow } from '../../services/automation';
import { useStore, useConfirm } from '../../hooks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageShell, KpiGrid, FalhaAoCarregar } from '../../components/ui';
import { estadoDaLista } from '../../utils/estadoDaLista';

export const AgentFlowsPage: React.FC = () => {
  const { storeId } = useStore();
  const [_ConfirmDialog, confirm] = useConfirm();
  const [flows, setFlows] = useState<AgentFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  // Separa "vazio de verdade" (busca deu certo e veio zero) de "vazio porque a
  // busca caiu". Sem isto a tela adivinha e volta o vazio enganoso.
  const [carregouAlgumaVez, setCarregouAlgumaVez] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<AgentFlow | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    store: storeId || '',
    is_active: true,
    is_default: false,
    flow_json: '{}',
  });

  // O botão Atualizar e o duplo disparo do StrictMode sobrepõem buscas; cada
  // `loadFlows` captura a sua sequência e só a mais recente aplica resultado,
  // erro e fim do loading. Rejeição obsoleta não liga `erro` sobre o vazio
  // legítimo da mais nova.
  const requisicaoRef = useRef(0);

  // Troca de loja: o cache (`flows`/`carregouAlgumaVez`) é da loja ANTERIOR.
  // Zera em render, antes de `estadoDaLista`, para a nova carga cair em
  // 'carregando' em vez de 'lista' — sem isto a tela mostraria os fluxos da
  // loja anterior (com editar/ativar/excluir) sob a loja recém-selecionada, e
  // os manteria indefinidamente se a busca falhasse. Regra multi-tenant.
  const storeAnteriorRef = useRef(storeId);
  if (storeAnteriorRef.current !== storeId) {
    storeAnteriorRef.current = storeId;
    setFlows([]);
    setCarregouAlgumaVez(false);
    setErro(false);
  }

  const loadFlows = useCallback(async () => {
    const req = ++requisicaoRef.current;
    setLoading(true);
    setErro(false);
    try {
      const params: Record<string, string> = {};
      if (storeId) params.store_id = storeId;
      const res = await agentFlowService.list(params);
      if (req !== requisicaoRef.current) return; // busca superada por uma mais nova
      setFlows(res.results);
      setCarregouAlgumaVez(true);
    } catch {
      if (req !== requisicaoRef.current) return; // rejeição obsoleta: ignora
      // Sem isto, a falha deixava `flows` em `[]` e a tela mostrava os KPIs
      // zerados e "Nenhum flow criado" — dizendo ao lojista que ele não tem
      // automação quando, na verdade, a busca caiu.
      setErro(true);
      toast.error('Erro ao carregar flows');
    } finally {
      if (req === requisicaoRef.current) setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  const openCreate = () => {
    setEditingFlow(null);
    setFormData({ name: '', description: '', store: storeId || '', is_active: true, is_default: false, flow_json: '{}' });
    setIsFormOpen(true);
  };

  const openEdit = (flow: AgentFlow) => {
    setEditingFlow(flow);
    setFormData({
      name: flow.name,
      description: flow.description || '',
      store: flow.store,
      is_active: flow.is_active,
      is_default: flow.is_default,
      flow_json: typeof flow.flow_json === 'string' ? flow.flow_json : JSON.stringify(flow.flow_json, null, 2),
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let flowJsonParsed: AgentFlow['flow_json'];
      try {
        flowJsonParsed = JSON.parse(formData.flow_json) as AgentFlow['flow_json'];
      } catch {
        toast.error('JSON do flow inválido');
        return;
      }
      const payload = { ...formData, flow_json: flowJsonParsed };
      if (editingFlow) {
        await agentFlowService.update(editingFlow.id, payload);
        toast.success('Flow atualizado!');
      } else {
        await agentFlowService.create(payload);
        toast.success('Flow criado!');
      }
      setIsFormOpen(false);
      loadFlows();
    } catch {
      toast.error('Erro ao salvar flow');
    }
  };

  const handleToggleActive = async (flow: AgentFlow) => {
    try {
      await agentFlowService.update(flow.id, { is_active: !flow.is_active });
      toast.success(flow.is_active ? 'Flow desativado' : 'Flow ativado');
      loadFlows();
    } catch {
      toast.error('Erro ao atualizar flow');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Excluir flow',
      message: 'Tem certeza que deseja excluir este flow?',
    });
    if (!confirmed) return;
    try {
      await agentFlowService.delete(id);
      toast.success('Flow excluído');
      loadFlows();
    } catch {
      toast.error('Erro ao excluir flow');
    }
  };

  // A mesma regra de todas as listas do painel (`estadoDaLista`): a falha sem
  // cache vira erro acionável, não o vazio/zeros enganoso.
  const estado = estadoDaLista({
    temDados: carregouAlgumaVez,
    buscando: loading,
    falhou: erro,
    quantidade: flows.length,
  });

  if (estado === 'carregando') return <Loading />;

  return (
    <PageShell
      titulo="Fluxos do robô"
      acoes={
        <div className="flex gap-2">
        <Button variant="secondary" onClick={loadFlows}>
        <ArrowPathIcon className="h-5 w-5" />
        </Button>
        <Button onClick={openCreate}>
        <PlusIcon className="h-5 w-5 mr-2" />
        Novo Flow
        </Button>
        </div>
      }
    >

      {/* Na falha sem cache os KPIs seriam zeros enganosos ("Fluxos: 0") — omite. */}
      {estado !== 'falhou' && (
      <KpiGrid
        itens={[
          {
            label: 'Fluxos',
            value: flows.length,
            definicao: 'Todos os passo a passo cadastrados, ligados ou não.',
          },
          {
            label: 'Ativos',
            value: flows.filter((f) => f.is_active).length,
            definicao: 'Os que o robô realmente usa quando o cliente escreve.',
            tone: 'success',
          },
          {
            label: 'Execuções',
            value: flows.reduce((acc, f) => acc + (f.total_executions || 0), 0),
            definicao: 'Quantas vezes um fluxo rodou, somando todos, desde sempre.',
          },
          {
            label: 'Taxa de acerto',
            value:
              flows.filter((f) => f.is_default).length > 0
                ? `${Math.round((flows.filter((f) => f.is_default)[0]?.success_rate || 0) * 100)}%`
                : '—',
            // O número é só do fluxo padrão, e a tela não dizia isso: quem
            // lesse "Taxa de Sucesso" acharia que era a média de todos.
            definicao: 'Do fluxo padrão: quantas conversas ele levou até o fim.',
            tone: 'brand',
          },
        ]}
      />
      )}

      {/* Flows List */}
      {estado === 'falhou' ? (
        // Falha sem dado em cache: erro acionável no lugar do vazio enganoso.
        // Com dado em cache (falha só ao atualizar), `estadoDaLista` devolve
        // 'lista' e a grade abaixo segue mostrando os fluxos + o `toast` avisa.
        <FalhaAoCarregar
          titulo="Não foi possível carregar os fluxos"
          descricao="A conexão falhou. Isto não quer dizer que você não tem automação — tente de novo."
          onTentarDeNovo={loadFlows}
        />
      ) : flows.length === 0 ? (
        <Card className="p-12 text-center">
          <CpuChipIcon className="w-16 h-16 mx-auto text-fg-muted-token opacity-50 mb-4" />
          <p className="text-lg font-medium text-fg-token mb-2">Nenhum flow criado</p>
          <p className="text-sm text-fg-muted-token mb-6">
            Crie flows para automatizar atendimentos com IA
          </p>
          <Button onClick={openCreate}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Criar Primeiro Flow
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-4">
          {flows.map(flow => (
            <Card key={flow.id} className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-fg-token truncate">{flow.name}</h3>
                    {flow.is_default && (
                      <Badge variant="info">Padrão</Badge>
                    )}
                  </div>
                  {flow.description && (
                    <p className="text-sm text-fg-muted-token line-clamp-2">{flow.description}</p>
                  )}
                </div>
                <Badge variant={flow.is_active ? 'success' : 'gray'}>
                  {flow.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-1.5 text-fg-muted-token">
                  <PlayIcon className="h-4 w-4" />
                  <span>{flow.total_executions || 0} execuções</span>
                </div>
                <div className="flex items-center gap-1.5 text-fg-muted-token">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>{Math.round((flow.success_rate || 0) * 100)}% sucesso</span>
                </div>
                <div className="flex items-center gap-1.5 text-fg-muted-token col-span-2">
                  <ClockIcon className="h-4 w-4" />
                  <span>
                    {format(new Date(flow.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border-token">
                <Button
                  size="sm"
                  variant={flow.is_active ? 'secondary' : 'primary'}
                  onClick={() => handleToggleActive(flow)}
                  className="flex-1"
                >
                  {flow.is_active
                    ? <><PauseIcon className="h-4 w-4 mr-1" />Desativar</>
                    : <><PlayIcon className="h-4 w-4 mr-1" />Ativar</>
                  }
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(flow)}>
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(flow.id)}>
                  <TrashIcon className="h-4 w-4 text-danger-token" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingFlow ? 'Editar Flow' : 'Novo Flow'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome *"
            value={formData.name}
            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            required
          />
          <div>
            <label className="block text-sm font-medium text-fg-token mb-1">Descrição</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              className="controle w-full py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-token mb-1">
              Flow JSON
            </label>
            <textarea
              rows={8}
              value={formData.flow_json}
              onChange={e => setFormData(p => ({ ...p, flow_json: e.target.value }))}
              className="controle h-auto w-full py-2 text-sm font-mono"
              placeholder='{"nodes": [], "edges": []}'
            />
            <p className="text-xs text-fg-muted-token mt-1">JSON de definição do fluxo</p>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-border-token text-primary-600"
              />
              <span className="text-sm text-fg-token">Ativo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={e => setFormData(p => ({ ...p, is_default: e.target.checked }))}
                className="h-4 w-4 rounded border-border-token text-primary-600"
              />
              <span className="text-sm text-fg-token">Flow padrão</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingFlow ? 'Atualizar' : 'Criar Flow'}
            </Button>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
};

export default AgentFlowsPage;
