/**
 * HandoverRequestsPage - Solicitações de handover (sem Chakra UI)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { ArrowPathIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Badge, Button } from '../../components/common';
import { handoverService, HandoverRequest } from '../../services/handover';

const PRIORITY_VARIANT: Record<HandoverRequest['priority'], string> = {
  low: 'gray', medium: 'info', high: 'warning', urgent: 'danger',
};
const STATUS_VARIANT: Record<HandoverRequest['status'], string> = {
  pending: 'warning', approved: 'success', rejected: 'danger', expired: 'gray',
};

export const HandoverRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<HandoverRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await handoverService.getRequests();
      setRequests(data);
    } catch { toast.error('Erro ao carregar solicitações de handover'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 30000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await handoverService.approveRequest(id);
      toast.success('Solicitação aprovada — conversa transferida para atendimento humano');
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' as const } : r));
    } catch { toast.error('Erro ao aprovar solicitação'); }
    finally { setProcessingId(null); }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await handoverService.rejectRequest(id);
      toast.success('Solicitação rejeitada');
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' as const } : r));
    } catch { toast.error('Erro ao rejeitar solicitação'); }
    finally { setProcessingId(null); }
  };

  const pending = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fg-primary">Solicitações de Handover</h1>
          <p className="text-sm text-fg-muted mt-0.5">Pedidos de agentes para transferência para atendimento humano</p>
        </div>
        <button
          onClick={loadRequests}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-fg-muted disabled:opacity-50"
          aria-label="Atualizar"
        >
          <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading && requests.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Pending */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-base font-semibold text-fg-primary">Pendentes</h2>
              {pending.length > 0 && (
                <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-bold rounded-full">{pending.length}</span>
              )}
            </div>

            {pending.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-border-primary rounded-xl">
                <p className="text-fg-muted">Nenhuma solicitação pendente</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pending.map(req => (
                  <div key={req.id} className="p-4 bg-bg-card border border-border-primary rounded-xl shadow-sm">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-fg-primary">
                            Conversa: <span className="font-mono text-xs text-fg-muted">{req.conversation}</span>
                          </span>
                          <Badge variant={PRIORITY_VARIANT[req.priority] as any} size="sm">{req.priority_display || req.priority}</Badge>
                        </div>
                        {req.reason && <p className="text-sm text-fg-muted">Motivo: {req.reason}</p>}
                        <p className="text-xs text-fg-muted">
                          Solicitado em {format(new Date(req.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {req.expires_at && <> — Expira em {format(new Date(req.expires_at), 'HH:mm', { locale: ptBR })}</>}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(req.id)}
                          isLoading={processingId === req.id}
                          disabled={processingId !== null && processingId !== req.id}
                          leftIcon={<CheckIcon className="w-4 h-4" />}
                        >
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleReject(req.id)}
                          isLoading={processingId === req.id}
                          disabled={processingId !== null && processingId !== req.id}
                          leftIcon={<XMarkIcon className="w-4 h-4" />}
                        >
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resolved */}
          {resolved.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-fg-muted mb-3">Histórico Recente</h2>
              <div className="flex flex-col gap-2">
                {resolved.slice(0, 10).map(req => (
                  <div key={req.id} className="p-3 bg-bg-subtle border border-border-primary rounded-lg opacity-80">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-fg-muted">{req.conversation}</span>
                        <Badge variant={STATUS_VARIANT[req.status] as any} size="sm">{req.status_display || req.status}</Badge>
                        <Badge variant={PRIORITY_VARIANT[req.priority] as any} size="sm">{req.priority_display || req.priority}</Badge>
                      </div>
                      <span className="text-xs text-fg-muted">{format(new Date(req.created_at), 'dd/MM HH:mm', { locale: ptBR })}</span>
                    </div>
                    {req.reason && <p className="text-xs text-fg-muted mt-1">{req.reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HandoverRequestsPage;
