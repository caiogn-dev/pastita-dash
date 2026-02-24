// IntentLogsPage - Versão simplificada sem Chakra UI
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { intentService, intentTypeLabels } from '../../services';
import type { IntentLog, IntentType } from '../../types';
import './IntentLogsPage.css';

const ITEMS_PER_PAGE = 20;

export const IntentLogsPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const [logs, setLogs] = useState<IntentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<IntentLog | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [intentFilter, setIntentFilter] = useState<IntentType | ''>('');
  const [methodFilter, setMethodFilter] = useState<'regex' | 'llm' | ''>('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await intentService.getLogs({
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        intent_type: intentFilter || undefined,
        method: methodFilter || undefined,
      });
      setLogs(response.results);
      setTotalCount(response.count);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [currentPage, intentFilter, methodFilter, companyId]);

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.message_text?.toLowerCase().includes(search) ||
      log.phone_number?.includes(search)
    );
  });

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="intent-logs-page">
      <div className="logs-header">
        <div>
          <h1>Logs de Intenções</h1>
          <p>Histórico de detecção de intenções</p>
        </div>
        <button onClick={loadLogs}>↻ Atualizar</button>
      </div>

      <div className="logs-filters">
        <input
          type="text"
          placeholder="Buscar mensagem, telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select 
          value={intentFilter}
          onChange={(e) => {
            setIntentFilter(e.target.value as IntentType);
            setCurrentPage(1);
          }}
        >
          <option value="">Todas intenções</option>
          {Object.entries(intentTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={methodFilter}
          onChange={(e) => {
            setMethodFilter(e.target.value as 'regex' | 'llm');
            setCurrentPage(1);
          }}
        >
          <option value="">Todos métodos</option>
          <option value="regex">Regex/Handler</option>
          <option value="llm">LLM/IA</option>
        </select>
      </div>

      <div className="logs-table-container">
        {loading ? (
          <div className="logs-loading">Carregando...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="logs-empty">Nenhum log encontrado</div>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Telefone</th>
                <th>Mensagem</th>
                <th>Intenção</th>
                <th>Método</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</td>
                  <td>{log.phone_number}</td>
                  <td className="message-cell">{log.message_text}</td>
                  <td>
                    <span className="intent-badge">
                      {intentTypeLabels[log.intent_type as IntentType] || log.intent_type}
                    </span>
                  </td>
                  <td>
                    <span className={`method-badge ${log.method}`}>
                      {log.method?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => setSelectedLog(log)}>Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="logs-pagination">
        <span>Mostrando {filteredLogs.length} de {totalCount} registros</span>
        
        <div className="pagination-controls">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >←</button>
          
          <span>Página {currentPage} de {totalPages}</span>
          
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >→</button>
        </div>
      </div>

      {selectedLog && (
        <div className="log-modal" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalhes do Log</h3>
              <button onClick={() => setSelectedLog(null)}>✕</button>
            </div>
            
            <div className="modal-body">
              <p><strong>Data/Hora:</strong> {format(new Date(selectedLog.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</p>
              <p><strong>Telefone:</strong> {selectedLog.phone_number}</p>
              <p><strong>Intenção:</strong> {intentTypeLabels[selectedLog.intent_type as IntentType] || selectedLog.intent_type}</p>
              <p><strong>Método:</strong> {selectedLog.method?.toUpperCase()}</p>
              <p><strong>Mensagem:</strong></p>
              <pre>{selectedLog.message_text}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntentLogsPage;
