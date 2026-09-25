/**
 * Automações de e-mail — o que sai sozinho quando algo acontece (pedido
 * confirmado, pagamento, entrega, carrinho abandonado…).
 *
 * PageShell → KpiGrid → Secao com a lista. Estado no SeloDeEstado
 * (`estadoDeAutomacao`, o mesmo das mensagens automáticas do WhatsApp) e o
 * liga/desliga no Switch do kit. Antes cada gatilho tinha emoji e cor própria
 * (rosa cru no aniversário), o selo "Ativa" era verde cru e o formulário era
 * feito de campos nativos à mão.
 */
import React, { useState, useEffect } from 'react';
import {
  BoltIcon,
  PlusIcon,
  PlayIcon,
  TrashIcon,
  EnvelopeIcon,
  ClockIcon,
  CheckCircleIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Loading } from '../../components/common';
import {
  Button,
  EmptyState,
  Input,
  KpiGrid,
  Modal,
  NumberField,
  PageShell,
  Secao,
  Select,
  SeloDeEstado,
  Switch,
  Textarea,
  estadoDeAutomacao,
} from '../../components/ui';
import { useStore, useConfirm } from '../../hooks';
import {
  automationsApi,
  EmailAutomation,
  TriggerType
} from '../../services/marketingService';
import logger from '../../services/logger';

const VARIAVEIS = [
  'customer_name',
  'first_name',
  'email',
  'store_name',
  'order_number',
  'order_total',
  'tracking_code',
];

export default function AutomationsPage() {
  const { storeId } = useStore();
  const [ConfirmDialog, confirm] = useConfirm();

  // State
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [triggerTypes, setTriggerTypes] = useState<TriggerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<EmailAutomation | null>(null);
  const [testEmail, setTestEmail] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: '',
    subject: '',
    html_content: '',
    delay_minutes: 0,
    is_active: true,
  });

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  useEffect(() => {
    const loadData = async () => {
      if (!storeId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [automationsData, typesData] = await Promise.all([
          automationsApi.list(storeId),
          automationsApi.getTriggerTypes(),
        ]);
        setAutomations(automationsData);
        setTriggerTypes(typesData);
      } catch (error) {
        logger.error('Failed to load automations', error);
        toast.error('Erro ao carregar automações');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [storeId]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleToggle = async (automation: EmailAutomation) => {
    try {
      const updated = await automationsApi.toggle(automation.id);
      setAutomations(prev =>
        prev.map(a => a.id === automation.id ? updated : a)
      );
      toast.success(updated.is_active ? 'Automação ativada' : 'Automação pausada');
    } catch (error) {
      logger.error('Failed to toggle automation', error);
      toast.error('Erro ao alterar automação');
    }
  };

  const handleDelete = async (automation: EmailAutomation) => {
    const confirmed = await confirm({
      title: 'Excluir automação',
      message: `Excluir automação "${automation.name}"?`,
    });
    if (!confirmed) return;

    try {
      await automationsApi.delete(automation.id);
      setAutomations(prev => prev.filter(a => a.id !== automation.id));
      toast.success('Automação excluída');
    } catch (error) {
      logger.error('Failed to delete automation', error);
      toast.error('Erro ao excluir automação');
    }
  };

  const handleCreate = async () => {
    if (!storeId || !formData.name || !formData.trigger_type || !formData.subject) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const newAutomation = await automationsApi.create({
        store: storeId,
        ...formData,
      });
      setAutomations(prev => [...prev, newAutomation]);
      setShowCreateModal(false);
      resetForm();
      toast.success('Automação criada com sucesso!');
    } catch (error) {
      logger.error('Failed to create automation', error);
      toast.error('Erro ao criar automação');
    }
  };

  const handleTest = async () => {
    if (!selectedAutomation || !testEmail) {
      toast.error('Informe um email para teste');
      return;
    }

    try {
      const result = await automationsApi.test(selectedAutomation.id, testEmail);
      if (result.success) {
        toast.success('Email de teste enviado!');
        setShowTestModal(false);
        setTestEmail('');
      } else {
        toast.error(result.error || 'Erro ao enviar teste');
      }
    } catch (error) {
      logger.error('Failed to send test', error);
      toast.error('Erro ao enviar email de teste');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      trigger_type: '',
      subject: '',
      html_content: '',
      delay_minutes: 0,
      is_active: true,
    });
  };

  const openTestModal = (automation: EmailAutomation) => {
    setSelectedAutomation(automation);
    setShowTestModal(true);
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading size="lg" />
      </div>
    );
  }

  if (!storeId) {
    return (
      <EmptyState
        titulo="Selecione uma loja"
        descricao="As automações de e-mail são de cada loja. Escolha uma para ver e configurar."
      />
    );
  }

  const totalEnviados = automations.reduce((sum, a) => sum + a.total_sent, 0);
  const totalAbertos = automations.reduce((sum, a) => sum + a.total_opened, 0);

  return (
    <PageShell
      trilha={[{ rotulo: 'Automação' }, { rotulo: 'E-mail' }]}
      titulo="Automações de e-mail"
      descricao="E-mails que saem sozinhos quando algo acontece com o pedido ou o cliente."
      acoes={
        <Button leftIcon={<PlusIcon className="h-5 w-5" />} onClick={() => setShowCreateModal(true)}>
          Nova automação
        </Button>
      }
    >

      <KpiGrid
        itens={[
          {
            label: 'Automações',
            value: automations.length,
            definicao: 'Todas as regras de e-mail automático, ligadas ou não.',
            icone: <BoltIcon />,
          },
          {
            label: 'Ativas',
            value: automations.filter((a) => a.is_active).length,
            definicao: 'As que estão de fato disparando quando o gatilho acontece.',
            tone: 'success',
            icone: <PlayIcon />,
          },
          {
            label: 'E-mails enviados',
            value: totalEnviados,
            definicao: 'Total já disparado por estas automações, desde sempre.',
            icone: <EnvelopeIcon />,
          },
          {
            label: 'Abertos',
            value: totalAbertos,
            // A taxa é o que decide se vale continuar; o número absoluto
            // sozinho não diz nada sem o denominador ao lado.
            definicao:
              totalEnviados > 0
                ? `Abriram o e-mail — ${Math.round((totalAbertos / totalEnviados) * 100)}% dos enviados.`
                : 'Quantos abriram o e-mail.',
            tone: 'brand',
            icone: <CheckCircleIcon />,
          },
        ]}
      />

      {automations.length === 0 ? (
        <div className="superficie">
          <EmptyState
            icone={<BoltIcon className="h-12 w-12" />}
            titulo="Nenhuma automação configurada"
            descricao="Crie automações para enviar e-mails sozinhos quando algo acontecer, como um pedido confirmado."
            acao={
              <Button leftIcon={<PlusIcon className="h-5 w-5" />} onClick={() => setShowCreateModal(true)}>
                Criar primeira automação
              </Button>
            }
          />
        </div>
      ) : (
        <Secao titulo="Automações" contador={automations.length}>
          <ul className="-my-3 divide-y divide-border-token">
            {automations.map(automation => {
              const estado = estadoDeAutomacao(automation.is_active);
              return (
                <li key={automation.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="rounded-lg bg-surface-2 p-2.5 text-fg-muted-token" aria-hidden>
                      <EnvelopeIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-fg-token">{automation.name}</h3>
                        <SeloDeEstado tone={estado.tone}>{estado.rotulo}</SeloDeEstado>
                      </div>
                      <p className="text-sm text-fg-muted-token">
                        {automation.trigger_type_display}
                        {automation.delay_minutes > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" aria-hidden />
                            {automation.delay_minutes} min depois
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-fg-muted-token">
                        Assunto: {automation.subject}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="font-medium tabular-nums text-fg-token">{automation.total_sent}</p>
                      <p className="text-fg-muted-token">enviados</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Switch
                        ligado={automation.is_active}
                        onMudar={() => void handleToggle(automation)}
                        rotulo={`Automação ${automation.name} ativa`}
                      />
                      <Button size="sm" variant="ghost" onClick={() => openTestModal(automation)} aria-label="Enviar teste" title="Enviar teste">
                        <BeakerIcon className="h-5 w-5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(automation)} aria-label="Excluir" title="Excluir">
                        <TrashIcon className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Secao>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Nova automação de e-mail"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nome da automação *"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: E-mail de confirmação de pedido"
          />

          <Select
            rotulo="Quando enviar *"
            vazio="Selecione um gatilho..."
            valor={formData.trigger_type}
            onMudar={(v) => setFormData(prev => ({ ...prev, trigger_type: v }))}
            opcoes={triggerTypes.map(type => ({ valor: type.value, rotulo: type.label }))}
          />

          <Input
            label="Assunto do e-mail *"
            value={formData.subject}
            onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="Ex: Seu pedido #{{order_number}} foi confirmado!"
          />

          <div className="rounded-lg bg-surface-2 p-4">
            <p className="mb-1 text-sm font-medium text-fg-token">Variáveis disponíveis</p>
            <p className="mb-2 text-xs text-fg-muted-token">
              Use no assunto e no conteúdo; elas são preenchidas no envio.
            </p>
            <div className="flex flex-wrap gap-1">
              {VARIAVEIS.map((v) => (
                <code key={v} className="rounded bg-surface px-1.5 py-0.5 text-xs text-fg-token">{`{{${v}}}`}</code>
              ))}
            </div>
          </div>

          <Textarea
            label="Conteúdo HTML *"
            value={formData.html_content}
            onChange={e => setFormData(prev => ({ ...prev, html_content: e.target.value }))}
            className="font-mono"
            rows={8}
            placeholder="<html>...</html>"
            hint="Dica: copie um modelo da página de Marketing e personalize aqui."
          />

          <div>
            <NumberField
              rotulo="Esperar antes de enviar"
              sufixo="min"
              valor={formData.delay_minutes}
              onMudar={(v) => setFormData(prev => ({ ...prev, delay_minutes: v }))}
            />
            <p className="mt-1 text-xs text-fg-muted-token">
              0 = envio imediato. Para "pedir avaliação", por exemplo, 1440 = 24h.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-fg-token">Ativar automação imediatamente</span>
            <Switch
              ligado={formData.is_active}
              onMudar={(ligado) => setFormData(prev => ({ ...prev, is_active: ligado }))}
              rotulo="Ativar automação imediatamente"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-border-token pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate}>
              Criar automação
            </Button>
          </div>
        </div>
      </Modal>

      {/* Test Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => {
          setShowTestModal(false);
          setTestEmail('');
          setSelectedAutomation(null);
        }}
        title="Enviar e-mail de teste"
      >
        <div className="space-y-4">
          <p className="text-fg-muted-token">
            Veja como a automação
            <strong className="text-fg-token"> "{selectedAutomation?.name}"</strong> chega na caixa de entrada.
          </p>

          <Input
            type="email"
            label="E-mail para teste"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="seu@email.com"
          />

          <div className="flex justify-end gap-3 border-t border-border-token pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowTestModal(false);
                setTestEmail('');
              }}
            >
              Cancelar
            </Button>
            <Button leftIcon={<BeakerIcon className="h-5 w-5" />} onClick={handleTest}>
              Enviar teste
            </Button>
          </div>
        </div>
      </Modal>
      {ConfirmDialog}
    </PageShell>
  );
}
