import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  ChatBubbleLeftRightIcon,
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

  const handleSendTest = async () => {
    if (!testModal || !testPhone) return;
    try {
      await autoMessageService.test(testModal.id, {
        phone_number: testPhone,
        send: true,
      });
      toast.success('Mensagem de teste enviada!');
      setTestModal(null);
      setTestPhone('');
      setTestResult(null);
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/automation/companies/${companyId}`}
            className="p-2 rounded-lg text-fg-muted-token hover:text-fg-token hover:bg-surface-2 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-fg-token">Mensagens Automáticas</h1>
            <p className="text-sm text-fg-muted-token">{company?.company_name}</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingMessage(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-medium shadow-sm transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Nova Mensagem
        </button>
      </div>

      {/* Messages by Event Type */}
      {Object.keys(eventTypeLabels).map((eventType) => {
        const eventMessages = groupedMessages[eventType] || [];
        return (
          <div key={eventType} className="bg-surface border border-border-token shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border-token bg-surface-2">
              <h3 className="text-lg font-medium text-fg-token">
                {eventTypeLabels[eventType as AutoMessageEventType]}
              </h3>
            </div>
            {eventMessages.length === 0 ? (
              <div className="px-6 py-8 text-center text-fg-muted-token">
                <ChatBubbleLeftRightIcon className="mx-auto h-8 w-8 text-fg-muted-token opacity-60" />
                <p className="mt-2">Nenhuma mensagem configurada</p>
                <button
                  onClick={() => {
                    resetForm();
                    setFormData(prev => ({ ...prev, event_type: eventType as AutoMessageEventType }));
                    setShowModal(true);
                  }}
                  className="mt-2 text-brand hover:underline text-sm font-medium"
                >
                  + Adicionar mensagem
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-border-token">
                {eventMessages.map((message) => (
                  <li key={message.id} className="px-6 py-4 hover:bg-surface-2 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-sm font-medium text-fg-token truncate">
                            {message.name}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            message.is_active
                              ? 'bg-[var(--success-soft)] text-[var(--success)]'
                              : 'bg-surface-2 text-fg-muted-token'
                          }`}>
                            {message.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                          {message.delay_seconds && message.delay_seconds > 0 && (
                            <span className="text-xs text-fg-muted-token">
                              Delay: {message.delay_seconds}s
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-fg-muted-token line-clamp-2">
                          {message.message_text}
                        </p>
                        {message.buttons && message.buttons.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {message.buttons.map((btn, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2 py-1 rounded bg-brand-soft text-brand text-xs"
                              >
                                {btn.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => setTestModal(message)}
                          className="p-2 text-fg-muted-token hover:text-[var(--info)] transition-colors"
                          title="Testar"
                        >
                          <PlayIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(message)}
                          className="p-2 text-fg-muted-token hover:text-brand transition-colors"
                          title="Editar"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(message)}
                          className={`p-2 transition-colors ${
                            message.is_active
                              ? 'text-[var(--success)] hover:text-fg-muted-token'
                              : 'text-fg-muted-token hover:text-[var(--success)]'
                          }`}
                          title={message.is_active ? 'Desativar' : 'Ativar'}
                        >
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(message.id)}
                          className="p-2 text-fg-muted-token hover:text-[var(--danger)] transition-colors"
                          title="Excluir"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
          <ModalHeader title={editingMessage ? 'Editar Mensagem' : 'Nova Mensagem'} />
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-fg-token">
                  Tipo de Evento
                </label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value as AutoMessageEventType })}
                  className="mt-1 block w-full rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  {Object.entries(eventTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-token">
                  Nome Interno
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fg-token">
                Texto da Mensagem
              </label>
              <textarea
                rows={5}
                value={formData.message_text}
                onChange={(e) => setFormData({ ...formData, message_text: e.target.value })}
                required
                className="mt-1 block w-full rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-green-500 focus:ring-green-500"
              />
              <div className="mt-2">
                <p className="text-xs text-fg-muted-token mb-1">Variáveis disponíveis:</p>
                <div className="flex flex-wrap gap-1">
                  {messageVariables.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="inline-flex items-center px-2 py-1 rounded bg-surface-2 border border-border-token text-fg-muted-token text-xs hover:text-fg-token transition-colors"
                      title={v.description}
                    >
                      {`{${v.key}}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-fg-token">
                  Delay (segundos)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.delay_seconds}
                  onChange={(e) => setFormData({ ...formData, delay_seconds: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-token">
                  Prioridade
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-green-600 dark:text-green-400 focus:ring-green-500 border-border-token rounded"
                  />
                  <span className="ml-2 text-sm text-fg-token">Ativo</span>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-fg-token">
                  Botões Interativos (máx. 3)
                </label>
                {(formData.buttons?.length || 0) < 3 && (
                  <button
                    type="button"
                    onClick={addButton}
                    className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                  >
                    + Adicionar botão
                  </button>
                )}
              </div>
              {formData.buttons?.map((btn, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="ID"
                    value={btn.id}
                    onChange={(e) => updateButton(index, 'id', e.target.value)}
                    className="w-32 rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Título do botão"
                    value={btn.title}
                    onChange={(e) => updateButton(index, 'title', e.target.value)}
                    className="flex-1 rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeButton(index)}
                    className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-300"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              type="button"
              onClick={closeFormModal}
              className="px-4 py-2 border border-border-token rounded-md shadow-sm text-sm font-medium text-fg-token bg-surface hover:bg-surface-2 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              {editingMessage ? 'Atualizar' : 'Criar'}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {ConfirmDialog}

      {/* Test Modal */}
      {testModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/60" onClick={() => {
              setTestModal(null);
              setTestPhone('');
              setTestResult(null);
            }} />
            <div className="relative bg-surface border border-border-token rounded-lg shadow-xl max-w-lg w-full">
              <div className="px-6 py-4 border-b border-border-token">
                <h3 className="text-lg font-medium text-fg-token">
                  Testar Mensagem: {testModal.name}
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-fg-token">
                    Número de Telefone
                  </label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="5511999999999"
                    className="mt-1 block w-full rounded-md border-border-token bg-surface-2 text-fg-token shadow-sm focus:border-brand focus:ring-brand"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTest}
                  className="w-full px-4 py-2 border border-border-token rounded-md shadow-sm text-sm font-medium text-fg-token bg-surface hover:bg-surface-2 transition-colors"
                >
                  Visualizar Preview
                </button>
                {testResult && (
                  <div className="bg-surface-2 rounded-lg p-4">
                    <p className="text-sm font-medium text-fg-token mb-2">Preview:</p>
                    <div className="bg-[var(--success-soft)] text-fg-token rounded-lg p-3 text-sm whitespace-pre-wrap">
                      {testResult}
                    </div>
                    {testModal.buttons && testModal.buttons.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {testModal.buttons.map((btn, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-3 py-1 rounded-full bg-surface border border-brand text-brand text-sm"
                          >
                            {btn.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-border-token flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setTestModal(null);
                    setTestPhone('');
                    setTestResult(null);
                  }}
                  className="px-4 py-2 border border-border-token rounded-md shadow-sm text-sm font-medium text-fg-token bg-surface hover:bg-surface-2 transition-colors"
                >
                  Fechar
                </button>
                {testResult && (
                  <button
                    type="button"
                    onClick={handleSendTest}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:bg-brand-hover transition-colors"
                  >
                    Enviar Teste
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoMessagesPage;
