import React, { useState, useEffect, useCallback } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon, ServerIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Loading, Badge } from '../../components/common';
import api from '../../services/api';
import logger from '../../services/logger';
import { PageHeader } from '../../components/layout';

interface WebhookEvent {
  id: string;
  event_type: string;
  is_active: boolean;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

interface DiagnosticsData {
  webhooks: WebhookEvent[];
  stats: {
    total: number;
    active: number;
    with_errors: number;
    inactive: number;
  };
}

export const WebhookDiagnosticsPage: React.FC = () => {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchDiagnostics = useCallback(async () => {
    try {
      const response = await api.get('/stores/webhooks/');
      const webhooks: WebhookEvent[] = response.data.results || [];
      setData({
        webhooks,
        stats: {
          total: webhooks.length,
          active: webhooks.filter((w) => w.is_active).length,
          with_errors: webhooks.filter((w) => w.last_error).length,
          inactive: webhooks.filter((w) => !w.is_active && !w.last_error).length,
        },
      });
    } catch (error) {
      logger.error('Failed to fetch diagnostics', error);
      toast.error('Erro ao carregar diagnóstico');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiagnostics();
  }, [fetchDiagnostics]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchDiagnostics, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchDiagnostics]);

  if (loading) return <Loading />;

  if (!data) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Erro ao carregar diagnóstico</h2>
          <Button onClick={fetchDiagnostics}>Tentar novamente</Button>
        </Card>
      </div>
    );
  }

  const { stats, webhooks } = data;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader title="Diagnóstico de Webhooks" subtitle="Monitore os webhooks configurados nas lojas" />
      
      <div className="flex items-center justify-end gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded border-gray-300" />
          Auto-refresh (5s)
        </label>
        <Button variant="secondary" onClick={fetchDiagnostics}><ArrowPathIcon className="w-5 h-5" /></Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-sm text-gray-500">Total</p></Card>
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{stats.active}</p><p className="text-sm text-gray-500">Ativos</p></Card>
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{stats.with_errors}</p><p className="text-sm text-gray-500">Com Erros</p></Card>
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{stats.inactive}</p><p className="text-sm text-gray-500">Inativos</p></Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Webhooks Configurados</h3>
        {webhooks.length === 0 ? (
          <div className="text-center py-8 text-gray-500"><ServerIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" /><p>Nenhum webhook configurado</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Erro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {webhooks.map((webhook) => (
                  <tr key={webhook.id}>
                    <td className="px-4 py-2 text-sm font-mono text-gray-600">{webhook.id.slice(0, 8)}...</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{webhook.event_type}</td>
                    <td className="px-4 py-2">{webhook.is_active ? <Badge variant="success">Ativo</Badge> : <Badge variant="warning">Inativo</Badge>}</td>
                    <td className="px-4 py-2 text-sm text-red-600">{webhook.last_error || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default WebhookDiagnosticsPage;
