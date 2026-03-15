/**
 * Debug Dashboard - Página consolidada para debug de chat, mensagens e handlers
 * Mostra em tempo real: conversas, mensagens, status dos handlers e logs
 */
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { conversationsService } from '../../services/conversations';
import { intentService } from '../../services/intents';
import { automationLogService } from '../../services/automation';
import toast from 'react-hot-toast';
import type { Conversation, Message, IntentLog, AutomationLog } from '../../types';
import './DebugDashboard.css';

interface ConversationWithMessages extends Conversation {
  messages?: Message[];
}

const DebugDashboardPage: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationWithMessages[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithMessages | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [intentLogs, setIntentLogs] = useState<IntentLog[]>([]);
  const [automationLogs, setAutomationLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'conversations' | 'intents' | 'automation'>('conversations');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadConversations = async () => {
    try {
      const response = await conversationsService.getConversations();
      setConversations(response.results || []);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast.error('Erro ao carregar conversas');
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const msgs = await conversationsService.getMessages(conversationId);
      setMessages(msgs);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    }
  };

  const loadIntentLogs = async () => {
    try {
      const response = await intentService.getLogs({ limit: 20 });
      setIntentLogs(response.results || []);
    } catch (error) {
      console.error('Erro ao carregar logs de intenções:', error);
    }
  };

  const loadAutomationLogs = async () => {
    try {
      const response = await automationLogService.list({ page_size: 20 });
      setAutomationLogs(response.results || []);
    } catch (error) {
      console.error('Erro ao carregar logs de automação:', error);
    }
  };

  const handleSelectConversation = async (conversation: ConversationWithMessages) => {
    setSelectedConversation(conversation);
    await loadMessages(conversation.id);
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([
      loadConversations(),
      loadIntentLogs(),
      loadAutomationLogs(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refreshAll, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [activeTab]);

  return (
    <div className="debug-dashboard">
      <div className="debug-header">
        <div>
          <h1>🐛 Debug Dashboard</h1>
          <p>Monitore conversas, mensagens, handlers e logs em tempo real</p>
        </div>
        <div className="header-actions">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-atualizar
          </label>
          <button onClick={refreshAll} disabled={loading} className="refresh-btn">
            <ArrowPathIcon className="w-4 h-4" /> Atualizar
          </button>
        </div>
      </div>

      <div className="debug-tabs">
        <button
          className={`tab ${activeTab === 'conversations' ? 'active' : ''}`}
          onClick={() => setActiveTab('conversations')}
        >
          <ChatBubbleLeftRightIcon className="w-4 h-4" />
          Conversas ({conversations.length})
        </button>
        <button
          className={`tab ${activeTab === 'intents' ? 'active' : ''}`}
          onClick={() => setActiveTab('intents')}
        >
          <ExclamationTriangleIcon className="w-4 h-4" />
          Intenções ({intentLogs.length})
        </button>
        <button
          className={`tab ${activeTab === 'automation' ? 'active' : ''}`}
          onClick={() => setActiveTab('automation')}
        >
          <CheckCircleIcon className="w-4 h-4" />
          Handlers ({automationLogs.length})
        </button>
      </div>

      <div className="debug-content">
        {loading ? (
          <div className="loading-state">Carregando...</div>
        ) : activeTab === 'conversations' ? (
          <div className="conversations-section">
            <div className="conversations-list">
              <h2>Conversas Ativas</h2>
              {conversations.length === 0 ? (
                <div className="empty-state">Nenhuma conversa encontrada</div>
              ) : (
                <div className="conversations-grid">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`conversation-card ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                      onClick={() => handleSelectConversation(conv)}
                    >
                      <div className="card-header">
                        <h3>{conv.contact_name || conv.phone_number}</h3>
                        <span className={`status-badge ${conv.mode}`}>{conv.mode}</span>
                      </div>
                      <div className="card-body">
                        <div className="info-row">
                          <span>Telefone:</span>
                          <code>{conv.phone_number}</code>
                        </div>
                        <div className="info-row">
                          <span>Status:</span>
                          <code>{conv.status}</code>
                        </div>
                        <div className="info-row">
                          <span>Modo:</span>
                          <code>{conv.mode}</code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedConversation && (
              <div className="messages-panel">
                <div className="panel-header">
                  <h2>Mensagens - {selectedConversation.contact_name || selectedConversation.phone_number}</h2>
                  <button onClick={() => loadMessages(selectedConversation.id)} className="mini-refresh">
                    <ArrowPathIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="messages-container">
                  {messages.length === 0 ? (
                    <div className="empty-state">Nenhuma mensagem nesta conversa</div>
                  ) : (
                    <div className="messages-list">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`message-item ${msg.direction}`}>
                          <div className="message-header">
                            <span className={`direction-badge ${msg.direction}`}>
                              {msg.direction === 'inbound' ? '📥' : '📤'}
                            </span>
                            <span className="time">
                              {format(new Date(msg.created_at), 'HH:mm:ss', { locale: ptBR })}
                            </span>
                            <span className={`status-badge ${msg.status}`}>
                              {msg.status}
                            </span>
                          </div>
                          <div className="message-body">
                            {msg.media_url ? (
                              <div className="media-message">
                                <span className="media-type">{msg.message_type}</span>
                                <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                                  {msg.text_body || 'Mídia'}
                                </a>
                              </div>
                            ) : (
                              <p>{msg.text_body}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'intents' ? (
          <div className="intents-section">
            <h2>Detecção de Intenções Recentes</h2>
            {intentLogs.length === 0 ? (
              <div className="empty-state">Nenhum log de intenção encontrado</div>
            ) : (
              <div className="logs-table">
                <table>
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Telefone</th>
                      <th>Mensagem</th>
                      <th>Intenção</th>
                      <th>Método</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intentLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <span className="time">
                            {format(new Date(log.created_at), 'HH:mm:ss', { locale: ptBR })}
                          </span>
                        </td>
                        <td>
                          <code>{log.phone_number}</code>
                        </td>
                        <td className="message-cell">
                          <span title={log.message_text}>{log.message_text?.substring(0, 40)}</span>
                        </td>
                        <td>
                          <span className="intent-badge">{log.intent_type}</span>
                        </td>
                        <td>
                          <span className={`method-badge ${log.method}`}>
                            {log.method === 'llm' ? 'IA' : 'Regex'}
                          </span>
                        </td>
                        <td>
                          <span className="status-indicator">
                            {log.confidence_score && log.confidence_score > 0.8 ? (
                              <CheckCircleIcon className="w-4 h-4 text-green-500" />
                            ) : (
                              <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="automation-section">
            <h2>Execução de Handlers Recentes</h2>
            {automationLogs.length === 0 ? (
              <div className="empty-state">Nenhum log de handler encontrado</div>
            ) : (
              <div className="logs-table">
                <table>
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Ação</th>
                      <th>Detalhes</th>
                      <th>Status</th>
                      <th>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {automationLogs.map((log) => (
                      <tr key={log.id} className={log.is_error ? 'error-row' : ''}>
                        <td>
                          <span className="time">
                            {format(new Date(log.created_at), 'HH:mm:ss', { locale: ptBR })}
                          </span>
                        </td>
                        <td>
                          <span className="action-badge">{log.action_type}</span>
                        </td>
                        <td className="details-cell">
                          <code>{log.phone_number}</code>
                        </td>
                        <td>
                          {log.is_error ? (
                            <XCircleIcon className="w-4 h-4 text-red-500" />
                          ) : (
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          )}
                        </td>
                        <td className="result-cell">
                          {log.is_error && log.error_message ? (
                            <span className="error-text" title={log.error_message}>
                              {log.error_message.substring(0, 50)}
                            </span>
                          ) : (
                            <span className="success-text">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugDashboardPage;
