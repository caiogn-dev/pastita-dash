/**
 * Mensagens automáticas do WhatsApp, agrupadas pelo evento que as dispara.
 *
 * PageShell → uma Secao por evento → lista com o estado no SeloDeEstado
 * (`estadoDeAutomacao`, o mesmo das automações de e-mail) e o liga/desliga no
 * Switch do kit. Antes: verde cru no botão "Criar", ícone de check como
 * interruptor e campos nativos à mão no formulário.
 */
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import {
  autoMessageService,
  companyProfileService,
  eventTypeLabels,
  messageVariables,
} from '../../services/automation';
import { AutoMessage, CompanyProfile, AutoMessageEventType, CreateAutoMessage } from '../../types';
import { Loading as LoadingSpinner } from '../../components/common/Loading';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../components/ui/modal';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../hooks';
import {
  Button,
  Input,
  NumberField,
  PageShell,
  Secao,
  Select,
  SeloDeEstado,
  Switch,
  Textarea,
  estadoDeAutomacao,
} from '../../components/ui';

const AutoMessagesPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const [ConfirmDialog, confirm] = useConfirm();
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [messages, setMessages] = useState<AutoMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<AutoMessage | null>(null);
  const [testModal, setTestModal] = useState<AutoMessage | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateAutoMessage>({
    account: '',
    company_id: companyId || '',
    event_type: 'welcome',
    name: '',
    message_text: '',
    message_type: 'text',
    is_active: true,
    delay_seconds: 0,
    priority: 100,
    buttons: [],
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | undefined> = companyId ? { company_id: companyId } : {};
      const [messagesData, companyData] = await Promise.all([
        autoMessageService.list(params),
        companyId ? companyProfileService.get(companyId) : Promise.resolve(null),
      ]);
      setCompany(companyData);
      setMessages(messagesData.results);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMessage) {
        await autoMessageService.update(editingMessage.id, formData);
        toast.success('Mensagem atualizada!');
      } else {
        await autoMessageService.create(formData);
        toast.success('Mensagem criada!');
      }
      setShowModal(false);
      setEditingMessage(null);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar mensagem');
    }
  };

  const handleEdit = (message: AutoMessage) => {
    setEditingMessage(message);
    setFormData({
      account: message.account,
      company_id: companyId || '',
      event_type: message.event_type,
      name: message.name,
      message_text: message.message_text,
      message_type: message.message_type,
      media_url: message.media_url || undefined,
      media_type: message.media_type || undefined,
      buttons: message.buttons,
      is_active: message.is_active,
      delay_seconds: message.delay_seconds,
      priority: message.priority,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Excluir mensagem',
      message: 'Tem certeza que deseja excluir esta mensagem?',
    });
    if (!confirmed) return;
    try {
      await autoMessageService.delete(id);
      toast.success('Mensagem excluída!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir mensagem');
    }
  };

  const handleToggleActive = async (message: AutoMessage) => {
    try {
      await autoMessageService.update(message.id, { is_active: !message.is_active });
      toast.success(message.is_active ? 'Mensagem desativada' : 'Mensagem ativada');
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar mensagem');
    }
  };

  const handleTest = async () => {
    if (!testModal || !testPhone) return;
    try {
      const result = await autoMessageService.test(testModal.id, {
        phone_number: testPhone,
        send: false,
      });
      setTestResult(result.rendered_message);
    } catch (error) {
      toast.error('Erro ao testar mensagem');
    }
  };

  // Fechar o teste tem que limpar o telefone e a prévia: reabrir o modal com
  // o número da vez passada mostrando a prévia de OUTRA mensagem já mandou
  // teste para o contato errado.
  const fecharTeste = () => {
    setTestModal(null);
    setTestPhone('');
    setTestResult(null);
  };

  const handleSendTest = async () => {
    if (!testModal || !testPhone) return;
    try {
      await autoMessageService.test(testModal.id, {
        phone_number: testPhone,
        send: true,
      });
      toast.success('Mensagem de teste enviada!');
      fecharTeste();
    } catch (error) {
      toast.error('Erro ao enviar mensagem de teste');
    }
  };

  const resetForm = () => {
    setFormData({
      account: '',
      company_id: companyId || '',
      event_type: 'welcome',
      name: '',
      message_text: '',
      message_type: 'text',
      is_active: true,
      delay_seconds: 0,
      priority: 100,
      buttons: [],
    });
  };

  // Fecha o modal de criar/editar limpando o estado do formulário (usado pelo
  // botão Cancelar e pelo Escape/overlay-click do Modal canônico).
  const closeFormModal = () => {
    setShowModal(false);
    setEditingMessage(null);
    resetForm();
  };

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      message_text: prev.message_text + `{${variable}}`,
    }));
  };

  const addButton = () => {
    setFormData(prev => ({
      ...prev,
      buttons: [...(prev.buttons || []), { id: `btn_${Date.now()}`, title: '' }],
    }));
  };

  const updateButton = (index: number, field: 'id' | 'title', value: string) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons?.map((btn, i) =>
        i === index ? { ...btn, [field]: value } : btn
      ),
    }));
  };

  const removeButton = (index: number) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons?.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Group messages by event type
  const groupedMessages = messages.reduce((acc, msg) => {
    if (!acc[msg.event_type]) {
      acc[msg.event_type] = [];
    }
    acc[msg.event_type].push(msg);
    return acc;
  }, {} as Record<string, AutoMessage[]>);

  return (
    <PageShell
      trilha={[
        { rotulo: 'Automação', href: '/automation/companies' },
        { rotulo: company?.company_name || 'Perfil', href: `/automation/companies/${companyId}` },
        { rotulo: 'Mensagens automáticas' },
      ]}
      titulo="Mensagens automáticas"
      descricao="O que o WhatsApp responde sozinho em cada momento do pedido."
      acoes={
        <Button
          leftIcon={<PlusIcon className="h-5 w-5" />}
          onClick={() => {
            resetForm();
            setEditingMessage(null);
            setShowModal(true);
          }}
        >
          Nova mensagem
        </Button>
      }
    >
      {Object.keys(eventTypeLabels).map((eventType) => {
        const eventMessages = groupedMessages[eventType] || [];
        const adicionarNoEvento = () => {
          resetForm();
          setFormData(prev => ({ ...prev, event_type: eventType as AutoMessageEventType }));
          setShowModal(true);
        };
        return (
          <Secao
            key={eventType}
            titulo={eventTypeLabels[eventType as AutoMessageEventType]}
            contador={eventMessages.length}
          >
            {eventMessages.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted-token">
                <p>Nenhuma mensagem configurada para este momento.</p>
                <Button size="sm" variant="outline" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={adicionarNoEvento}>
                  Adicionar mensagem
                </Button>
              </div>
            ) : (
              <ul className="-my-3 divide-y divide-border-token">
                {eventMessages.map((message) => {
                  const estado = estadoDeAutomacao(message.is_active);
                  return (
                    <li key={message.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-medium text-fg-token">{message.name}</h3>
                          <SeloDeEstado tone={estado.tone}>{estado.rotulo}</SeloDeEstado>
                          {message.delay_seconds && message.delay_seconds > 0 ? (
                            <span className="text-xs text-fg-muted-token">
                              Espera {message.delay_seconds}s
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-fg-muted-token">{message.message_text}</p>
                        {message.buttons && message.buttons.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {message.buttons.map((btn, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center rounded bg-surface-2 px-2 py-1 text-xs text-fg-token"
                              >
                                {btn.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Switch
                          ligado={message.is_active}
                          onMudar={() => void handleToggleActive(message)}
                          rotulo={`Mensagem ${message.name} ativa`}
                        />
                        <Button size="sm" variant="ghost" onClick={() => setTestModal(message)} aria-label="Testar" title="Testar">
                          <PlayIcon className="h-5 w-5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(message)} aria-label="Editar" title="Editar">
                          <PencilIcon className="h-5 w-5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(message.id)} aria-label="Excluir" title="Excluir">
                          <TrashIcon className="h-5 w-5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Secao>
        );
      })}

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={closeFormModal}
        size="lg"
        showCloseButton={false}
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ModalHeader title={editingMessage ? 'Editar mensagem' : 'Nova mensagem'} />
          <ModalBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                rotulo="Quando enviar"
                valor={formData.event_type}
                onMudar={(v) => setFormData({ ...formData, event_type: v as AutoMessageEventType })}
                opcoes={Object.entries(eventTypeLabels).map(([valor, rotulo]) => ({ valor, rotulo }))}
              />
              <Input
                label="Nome interno"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Textarea
                label="Texto da mensagem"
                rows={5}
                value={formData.message_text}
                onChange={(e) => setFormData({ ...formData, message_text: e.target.value })}
                required
              />
              <div className="mt-2">
                <p className="mb-1 text-xs text-fg-muted-token">Variáveis disponíveis:</p>
                <div className="flex flex-wrap gap-1">
                  {messageVariables.map((v) => (
                    <Button
                      key={v.key}
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => insertVariable(v.key)}
                      title={v.description}
                    >
                      {`{${v.key}}`}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField
                rotulo="Espera"
                sufixo="s"
                valor={formData.delay_seconds ?? 0}
                onMudar={(v) => setFormData(prev => ({ ...prev, delay_seconds: v }))}
              />
              <NumberField
                rotulo="Prioridade"
                min={1}
                valor={formData.priority ?? 100}
                onMudar={(v) => setFormData(prev => ({ ...prev, priority: v }))}
              />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-fg-muted-token">Ativa</span>
                <Switch
                  ligado={Boolean(formData.is_active)}
                  onMudar={(ligado) => setFormData(prev => ({ ...prev, is_active: ligado }))}
                  rotulo="Mensagem ativa"
                />
              </div>
            </div>

            {/* Buttons */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-fg-token">Botões interativos (até 3)</p>
                {(formData.buttons?.length || 0) < 3 && (
                  <Button type="button" size="sm" variant="ghost" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={addButton}>
                    Adicionar botão
                  </Button>
                )}
              </div>
              {formData.buttons?.map((btn, index) => (
                <div key={index} className="mb-2 flex items-center gap-2">
                  <div className="w-32">
                    <Input
                      size="sm"
                      placeholder="ID"
                      aria-label={`ID do botão ${index + 1}`}
                      value={btn.id}
                      onChange={(e) => updateButton(index, 'id', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      size="sm"
                      placeholder="Título do botão"
                      aria-label={`Título do botão ${index + 1}`}
                      value={btn.title}
                      onChange={(e) => updateButton(index, 'title', e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeButton(index)}
                    aria-label={`Remover botão ${index + 1}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={closeFormModal}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingMessage ? 'Salvar mensagem' : 'Criar mensagem'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {ConfirmDialog}

      {/* Test Modal */}
      <Modal
        open={Boolean(testModal)}
        onClose={fecharTeste}
        title={testModal ? `Testar: ${testModal.name}` : 'Testar mensagem'}
        size="lg"
      >
        {testModal && (
          <div className="flex flex-col gap-4">
            <Input
              id="teste-telefone"
              label="Número de telefone"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="5511999999999"
            />

            <Button variant="outline" className="w-full" onClick={handleTest}>
              Ver como vai ficar
            </Button>

            {testResult && (
              <div className="rounded-lg bg-surface-2 p-4">
                <p className="mb-2 text-sm font-medium text-fg-token">Prévia</p>
                <div className="whitespace-pre-wrap rounded-lg bg-surface p-3 text-sm text-fg-token">
                  {testResult}
                </div>
                {testModal.buttons && testModal.buttons.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {testModal.buttons.map((btn, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-pill border border-border-token bg-surface px-3 py-1 text-sm text-fg-token"
                      >
                        {btn.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <ModalFooter>
          <Button variant="outline" onClick={fecharTeste}>
            Fechar
          </Button>
          {/* Só aparece depois da prévia: mandar mensagem de teste para um
              número real sem ter visto o texto é disparar às cegas. */}
          {testResult && <Button onClick={handleSendTest}>Enviar teste</Button>}
        </ModalFooter>
      </Modal>
    </PageShell>
  );
};

export default AutoMessagesPage;
