// IntentStatsPage - Versão simplificada sem Chakra UI
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { intentService, intentTypeLabels } from '../../services';
import type { IntentStats, IntentType } from '../../types';
import './IntentStatsPage.css';

const methodLabels: Record<string, string> = {
  regex: 'Regex/Handler',
  llm: 'LLM/IA',
  none: 'Nenhum',
  handler: 'Handler',
  automessage: 'AutoMessage',
  fallback: 'Fallback',
};

export const IntentStatsPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const [stats, setStats] = useState<IntentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    loadStats();
  }, [companyId, days]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const data = await intentService.getStats({ company_id: companyId, start_date: startDate, end_date: endDate });
      setStats(data);
    } catch (err) {
      setError('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="stats-loading">Carregando...</div>;
  }

  if (error) {
    return <div className="stats-error">{error}</div>;
  }

  const totalIntents = stats?.total_detected || 0;

  return (
    <div className="intent-stats-page">
      <div className="stats-header">
        <div>
          <h1>Estatísticas de Intenções</h1>
          <p>Análise de processamento de mensagens</p>
        </div>
        <div className="stats-controls">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>Últimas 24h</option>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
          </select>
          <button onClick={loadStats}>↻ Atualizar</button>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{totalIntents.toLocaleString()}</div>
          <div className="stat-label">Total de Intenções</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats?.top_intents?.length || 0}</div>
          <div className="stat-label">Intenções Únicas</div>
        </div>
      </div>

      <div className="stats-section">
        <h2>Top Intenções</h2>
        <table className="stats-table">
          <thead>
            <tr>
              <th>Intenção</th>
              <th>Quantidade</th>
              <th>Percentual</th>
            </tr>
          </thead>
          <tbody>
            {stats?.top_intents?.map((item) => (
              <tr key={item.intent}>
                <td>{intentTypeLabels[item.intent as IntentType] || item.intent}</td>
                <td>{item.count}</td>
                <td>{totalIntents > 0 ? ((item.count / totalIntents) * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IntentStatsPage;
