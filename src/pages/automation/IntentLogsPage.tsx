// IntentLogsPage - Página completa com estatísticas e filtros avançados
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DocumentChartBarIcon,
  FunnelIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { intentService, intentTypeLabels } from '../../services';
import type { IntentLog, IntentType, PaginatedResponse } from '../../types';
import toast from 'react-hot-toast';
import './IntentLogsPage.css';

const ITEMS_PER_PAGE = 30;

const IntentLogsPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const [logs, setLogs] = useState<IntentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<IntentLog | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [intentFilter, setIntentFilter] = useState<IntentType | ''>('');
  const [methodFilter, setMethodFilter] = useState<'regex' | 'llm' | ''>('');
  const [stats, setStats] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await intentService.getLogs({
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        intent_type: intentFilter || undefined,
        method: methodFilter || undefined,
      });
      setLogs((response as any).results || response);
      setTotalCount((response as any).count || (Array.isArray(response) ? response.length : 0));
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast.error('Erro ao carregar logs de intenções');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await intentService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [currentPage, intentFilter, methodFilter, companyId]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadLogs();
      loadStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, currentPage, intentFilter, methodFilter, companyId]);

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.message_text?.toLowerCase().includes(search) ||
      log.phone_number?.includes(search)
    );
  });

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getAllIntentTypes = (): (IntentType | string)[] => {
    return Object.keys(intentTypeLabels).filter(key => {
      const label = (intentTypeLabels as any)[key];
      return typeof label === 'string';
    });
  };

  const getConfidenceColor = (score?: number) => {
    if (!score) return 'gray';
    if (score >= 0.8) return 'green';
    if (score >= 0.6) return 'yellow';
    return 'red';
  };

  return (
    <div className="intent-logs-page">
      {/* Header */}
      <div className="logs-header">
        <div>
          <div className="header-title">
            <DocumentChartBarIcon className="w-8 h-8" />
            <div>
              <h1>Logs de Detecção de Intenções</h1>
              <p>Histórico completo de detecção de intenções e padrões de mensagem</p>
            </div>
          </div>
        </div>
        <div className="header-controls">
          <label className="auto-refresh">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-atualizar
          </label>
          <button onClick={loadLogs} disabled={loading} className="refresh-btn">
            <ArrowPathIcon className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-panel">
          <div className="stat-card">
            <h3>Total de Logs</h3>
            <p className="stat-value">{totalCount}</p>
          </div>
          <div className="stat-card">
            <h3>Taxa de Sucesso</h3>
            <p className="stat-value">{stats.success_rate || '0'}%</p>
          </div>
          <div className="stat-card">
            <h3>Métodos Mais Usados</h3>
            <p className="stat-value">{stats.most_common_method || '-'}</p>
          </div>
          <div className="stat-card">
            <h3>Intenção Mais Comum</h3>
            <p className="stat-value">{stats.most_common_intent || '-'}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="logs-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="🔍 Buscar por mensagem, telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>
            <FunnelIcon className="w-4 h-4" />
            Intenção
          </label>
          <select 
            value={intentFilter}
            onChange={(e) => {
              setIntentFilter(e.target.value as IntentType | '');
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="">Todas intenções</option>
            {getAllIntentTypes().map((key) => (
              <option key={key} value={key}>
                {(intentTypeLabels as any)[key] || key}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>
            <FunnelIcon className="w-4 h-4" />
            Método
          </label>
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value as 'regex' | 'llm' | '');
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="">Todos métodos</option>
            <option value="regex">Regex/Padrão</option>
            <option value="llm">IA/LLM</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="logs-table-container">
        {loading ? (
          <div className="logs-loading">
            <div className="spinner"></div>
            Carregando logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="logs-empty">
            <ExclamationTriangleIcon className="w-12 h-12" />
            <p>Nenhum log encontrado com os filtros selecionados</p>
          </div>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Telefone</th>
                <th>Mensagem</th>
                <th>Intenção Detectada</th>
                <th>Método</th>
                <th>Confiança</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="log-row">
                  <td className="time-cell">
                    <span className="time">
                      {format(new Date(log.created_at), 'dd/MM HH:mm:ss', { locale: ptBR })}
                    </span>
                  </td>
                  <td className="phone-cell">
                    <code>{log.phone_number}</code>
                  </td>
                  <td className="message-cell">
                    <span className="message-preview" title={log.message_text}>
                      {log.message_text?.substring(0, 50)}
                      {log.message_text && log.message_text.length > 50 ? '...' : ''}
                    </span>
                  </td>
                  <td className="intent-cell">
                    <span className={`intent-badge intent-${log.intent_type || 'unknown'}`}>
                      {(intentTypeLabels as any)[log.intent_type as IntentType] || log.intent_type || '-'}
                    </span>
                  </td>
                  <td className="method-cell">
                    <span className={`method-badge method-${log.method || 'unknown'}`}>
                      {log.method === 'llm' ? '🤖 IA' : log.method === 'regex' ? '🔍 Padrão' : '?'}
                    </span>
                  </td>
                  <td className="confidence-cell">
                    <div className="confidence-bar">
                      <div
                        className={`confidence-fill confidence-${getConfidenceColor(log.confidence_score)}`}
                        style={{ width: `${(log.confidence_score || 0) * 100}%` }}
                      ></div>
                    </div>
                    <span className="confidence-value">
                      {log.confidence_score ? (log.confidence_score * 100).toFixed(0) + '%' : '-'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="view-btn"
                      title="Ver detalhes"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="logs-pagination">
          <span className="pagination-info">
            Mostrando {Math.min(filteredLogs.length, ITEMS_PER_PAGE)} de {totalCount} registros
          </span>

          <div className="pagination-controls">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              ← Anterior
            </button>

            <span className="page-indicator">
              Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="pagination-btn"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="log-modal" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalhes da Detecção de Intenção</h3>
              <button className="close-btn" onClick={() => setSelectedLog(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h4>Informações Básicas</h4>
                <div className="detail-row">
                  <span className="label">Data/Hora:</span>
                  <span className="value">
                    {format(new Date(selectedLog.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Telefone:</span>
                  <span className="value"><code>{selectedLog.phone_number}</code></span>
                </div>
              </div>

              <div className="detail-section">
                <h4>Detecção</h4>
                <div className="detail-row">
                  <span className="label">Intenção:</span>
                  <span className="value">
                    <span className={`intent-badge intent-${selectedLog.intent_type || 'unknown'}`}>
                      {(intentTypeLabels as any)[selectedLog.intent_type as IntentType] || selectedLog.intent_type || '-'}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Método:</span>
                  <span className="value">
                    <span className={`method-badge method-${selectedLog.method || 'unknown'}`}>
                      {selectedLog.method === 'llm' ? '🤖 Inteligência Artificial' : '🔍 Regex/Padrão'}
                    </span>
                  </span>
                </div>
                {selectedLog.confidence_score !== undefined && (
                  <div className="detail-row">
                    <span className="label">Confiança:</span>
                    <span className="value">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="confidence-bar" style={{ width: '150px' }}>
                          <div
                            className={`confidence-fill confidence-${getConfidenceColor(selectedLog.confidence_score)}`}
                            style={{ width: `${selectedLog.confidence_score * 100}%` }}
                          ></div>
                        </div>
                        {(selectedLog.confidence_score * 100).toFixed(2)}%
                      </div>
                    </span>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h4>Mensagem Original</h4>
                <div className="message-box">
                  <p>{selectedLog.message_text}</p>
                </div>
              </div>

              {selectedLog.response_text && (
                <div className="detail-section">
                  <h4>Resposta Gerada</h4>
                  <div className="message-box response">
                    <p>{selectedLog.response_text}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="close-modal-btn" onClick={() => setSelectedLog(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntentLogsPage;
