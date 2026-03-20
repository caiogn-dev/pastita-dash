/**
 * AgentDebugPage - Diagnóstico do Agente AI (sem Chakra UI)
 */
import React, { useState } from 'react';
import {
  MagnifyingGlassIcon, CpuChipIcon, UserIcon,
  CheckCircleIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Card, Button, Badge } from '../../components/common';
import api from '@/services/api';
import { handoverService } from '@/services/handover';

interface DebugResult {
  timestamp: string;
  conversation?: { id: string; status: string };
  account?: { id: string; phone_number: string; has_default_agent: boolean };
  agent?: { id: string; name: string; is_active: boolean; model: string } | null;
  handover?: { id: string; status: string; assigned_to: string | null } | null;
  checks: { agent_active?: boolean; handover_bot_mode?: boolean; agent_error?: string };
  agent_would_respond: boolean;
  recommendation: string;
}

export default function AgentDebugPage() {
  const [conversationId, setConversationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    if (!conversationId.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/debug/agent-status/?conversation_id=${conversationId}`);
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao verificar status');
    } finally { setLoading(false); }
  };

  const forceHandover = async (target: 'bot' | 'human') => {
    if (!conversationId.trim()) return;
    try {
      setLoading(true);
      if (target === 'bot') await handoverService.transferToBot(conversationId, 'Manual override from debug page');
      else await handoverService.transferToHuman(conversationId, { reason: 'Manual override from debug page' });
      await checkStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao transferir');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <Card className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <CpuChipIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-fg-primary">Diagnóstico do Agente AI</h1>
            <p className="text-sm text-fg-muted">Verifique o status e controle o modo de operação do agente</p>
          </div>
        </div>
      </Card>

      {/* Query */}
      <Card className="mb-6">
        <h2 className="text-base font-semibold text-fg-primary mb-4">Verificar Status</h2>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-fg-secondary mb-1">ID da Conversa</label>
            <input
              className="w-full px-3 py-2 text-sm border border-border-primary rounded-lg bg-bg-card text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Digite o ID da conversa..."
              value={conversationId}
              onChange={(e) => setConversationId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && checkStatus()}
            />
          </div>
          <Button
            onClick={checkStatus}
            disabled={loading || !conversationId.trim()}
            isLoading={loading}
            leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
            className="sm:self-end"
          >
            Verificar
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500 text-red-700 dark:text-red-400">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}
      </Card>

      {/* Result */}
      {result && (
        <Card>
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-base font-semibold text-fg-primary">Resultado do Diagnóstico</h2>
            <span className="text-sm text-fg-muted">{new Date(result.timestamp).toLocaleString('pt-BR')}</span>
          </div>

          {/* Overall status */}
          <div className={`mb-6 p-6 rounded-xl border-2 text-center ${result.agent_would_respond ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              {result.agent_would_respond
                ? <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                : <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />}
              <span className={`text-lg font-bold ${result.agent_would_respond ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                {result.agent_would_respond ? 'AGENTE ESTÁ RESPONDENDO' : 'AGENTE NÃO RESPONDE'}
              </span>
            </div>
            <p className="text-sm text-fg-muted max-w-xl mx-auto">{result.recommendation}</p>
          </div>

          <div className="border-t border-border-primary my-6" />

          {/* Checks */}
          <div className="mb-6">
            <h3 className="font-semibold text-fg-primary mb-3">Verificações</h3>
            <div className="flex flex-wrap gap-3">
              <Badge variant={result.checks.agent_active ? 'success' : 'danger'}>
                <span className="flex items-center gap-1">
                  {result.checks.agent_active ? <CheckCircleIcon className="w-4 h-4" /> : <ExclamationTriangleIcon className="w-4 h-4" />}
                  {result.checks.agent_active ? 'Agente Ativo' : 'Agente Inativo'}
                </span>
              </Badge>
              <Badge variant={result.checks.handover_bot_mode ? 'success' : 'warning'}>
                <span className="flex items-center gap-1">
                  {result.checks.handover_bot_mode ? <CheckCircleIcon className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                  {result.checks.handover_bot_mode ? 'Modo Bot' : 'Modo Humano'}
                </span>
              </Badge>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Agent info */}
            {result.agent && (
              <div className="p-4 bg-bg-subtle border border-border-primary rounded-lg">
                <h3 className="font-semibold text-fg-primary mb-3">Informações do Agente</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-fg-muted">Nome:</span>
                    <span className="text-sm font-medium text-fg-primary">{result.agent.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-fg-muted">Status:</span>
                    <Badge variant={result.agent.is_active ? 'success' : 'danger'} size="sm">{result.agent.is_active ? 'Ativo' : 'Inativo'}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-fg-muted">Modelo:</span>
                    <code className="text-xs bg-bg-muted px-2 py-0.5 rounded font-mono text-fg-primary">{result.agent.model}</code>
                  </div>
                </div>
              </div>
            )}

            {/* Handover info */}
            <div className="p-4 bg-bg-subtle border border-border-primary rounded-lg">
              <h3 className="font-semibold text-fg-primary mb-3">Handover</h3>
              {result.handover ? (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-fg-muted">Status:</span>
                    <Badge variant="info" size="sm">{result.handover.status}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-fg-muted">Atribuído a:</span>
                    <span className="text-sm text-fg-primary">{result.handover.assigned_to || <em className="text-fg-muted">Ninguém</em>}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-fg-muted">Sem registro de handover (assume modo bot)</p>
              )}
            </div>
          </div>

          <div className="border-t border-border-primary my-6" />

          {/* Actions */}
          <div>
            <h3 className="font-semibold text-fg-primary mb-3">Ações</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => forceHandover('bot')} disabled={loading} leftIcon={<CpuChipIcon className="w-5 h-5" />}>
                Forçar Modo Bot
              </Button>
              <Button variant="outline" onClick={() => forceHandover('human')} disabled={loading} leftIcon={<UserIcon className="w-5 h-5" />}>
                Forçar Modo Humano
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
