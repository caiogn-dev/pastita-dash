import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Header } from '../../components/layout';
import {
  Card,
  Button,
  Table,
  StatusBadge,
  Modal,
  Input,
  PageLoading,
  StatusFilter,
  Select,
  Textarea,
} from '../../components/common';
import { paymentsService, exportService, getErrorMessage } from '../../services';
import { Payment, PaymentGateway } from '../../types';

const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente', color: 'warning' },
  { value: 'processing', label: 'Processando', color: 'purple' },
  { value: 'completed', label: 'Concluído', color: 'success' },
  { value: 'failed', label: 'Falhou', color: 'danger' },
  { value: 'cancelled', label: 'Cancelado', color: 'gray' },
  { value: 'refunded', label: 'Reembolsado', color: 'gray' },
  { value: 'partially_refunded', label: 'Reembolso parcial', color: 'orange' },
];

const GATEWAY_TYPE_OPTIONS = [
  { value: 'mercadopago', label: 'Mercado Pago' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'pagseguro', label: 'PagSeguro' },
  { value: 'pix', label: 'PIX' },
  { value: 'custom', label: 'Custom' },
];

const DEFAULT_GATEWAY_FORM = {
  name: '',
  gateway_type: 'mercadopago',
  is_enabled: true,
  is_sandbox: true,
  endpoint_url: '',
  webhook_url: '',
  configuration: '{}',
};

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payments' | 'gateways'>('payments');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [refundModal, setRefundModal] = useState<{ isOpen: boolean; payment: Payment | null }>({
    isOpen: false,
    payment: null,
  });
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundError, setRefundError] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [gatewayModalOpen, setGatewayModalOpen] = useState(false);
  const [gatewayForm, setGatewayForm] = useState(DEFAULT_GATEWAY_FORM);
  const [gatewayErrors, setGatewayErrors] = useState<Record<string, string>>({});
  const [isCreatingGateway, setIsCreatingGateway] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [paymentsRes, gatewaysRes] = await Promise.all([
        paymentsService.getPayments(),
        paymentsService.getGateways(),
      ]);
      setPayments(paymentsRes.results);
      setGateways(gatewaysRes.results);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPayment = async (payment: Payment) => {
    try {
      const updated = await paymentsService.confirmPayment(payment.id);
      setPayments(payments.map((p) => (p.id === updated.id ? updated : p)));
      toast.success('Pagamento confirmado!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCancelPayment = async (payment: Payment) => {
    try {
      const updated = await paymentsService.cancelPayment(payment.id);
      setPayments(payments.map((p) => (p.id === updated.id ? updated : p)));
      toast.success('Pagamento cancelado!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleRefund = async () => {
    if (!refundModal.payment) return;
    setRefundError('');
    let amount: number | undefined;
    if (refundAmount) {
      amount = Number.parseFloat(refundAmount);
      if (Number.isNaN(amount) || amount <= 0) {
        setRefundError('Informe um valor válido para reembolso.');
        return;
      }
      if (amount > refundModal.payment.amount) {
        setRefundError('O valor não pode ser maior que o pagamento original.');
        return;
      }
    }
    setIsRefunding(true);
    try {
      const reason = refundReason.trim() || undefined;
      const updated = await paymentsService.refundPayment(refundModal.payment.id, amount, reason);
      setPayments(payments.map((p) => (p.id === updated.id ? updated : p)));
      toast.success('Reembolso processado!');
      setRefundModal({ isOpen: false, payment: null });
      setRefundAmount('');
      setRefundReason('');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsRefunding(false);
    }
  };

  const handleOpenRefund = (payment: Payment) => {
    setRefundModal({ isOpen: true, payment });
    setRefundAmount('');
    setRefundReason('');
    setRefundError('');
  };

  const handleCloseRefund = () => {
    setRefundModal({ isOpen: false, payment: null });
    setRefundAmount('');
    setRefundReason('');
    setRefundError('');
  };

  const handleOpenGatewayModal = () => {
    setGatewayForm({ ...DEFAULT_GATEWAY_FORM });
    setGatewayErrors({});
    setGatewayModalOpen(true);
  };

  const handleCloseGatewayModal = () => {
    setGatewayModalOpen(false);
    setGatewayErrors({});
  };

  const handleCreateGateway = async () => {
    const errors: Record<string, string> = {};
    const name = gatewayForm.name.trim();
    if (!name) {
      errors.name = 'Informe um nome para o gateway.';
    }

    let configuration: Record<string, unknown> = {};
    const configRaw = gatewayForm.configuration.trim();
    if (configRaw) {
      try {
        configuration = JSON.parse(configRaw) as Record<string, unknown>;
      } catch {
        errors.configuration = 'Configuração precisa ser um JSON válido.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setGatewayErrors(errors);
      return;
    }

    setIsCreatingGateway(true);
    try {
      const created = await paymentsService.createGateway({
        name,
        gateway_type: gatewayForm.gateway_type,
        is_enabled: gatewayForm.is_enabled,
        is_sandbox: gatewayForm.is_sandbox,
        endpoint_url: gatewayForm.endpoint_url.trim() || undefined,
        webhook_url: gatewayForm.webhook_url.trim() || undefined,
        configuration,
      });
      setGateways((prev) => [created, ...prev]);
      toast.success('Gateway criado com sucesso!');
      handleCloseGatewayModal();
      setGatewayForm({ ...DEFAULT_GATEWAY_FORM });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsCreatingGateway(false);
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setIsExporting(true);
    try {
      const blob = await exportService.exportPayments({
        format,
        status: statusFilter || undefined,
      });
      const dateStamp = new Date().toISOString().slice(0, 10);
      exportService.downloadBlob(blob, `pagamentos-${dateStamp}.${format}`);
      toast.success('Exportação concluída!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  };

  const paymentStatusCounts = useMemo(() => {
    return payments.reduce<Record<string, number>>((acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    }, {});
  }, [payments]);

  const filteredPayments = useMemo(() => {
    if (!statusFilter) return payments;
    return payments.filter((payment) => payment.status === statusFilter);
  }, [payments, statusFilter]);

  const paymentFilterOptions = useMemo(() => {
    return PAYMENT_STATUS_OPTIONS.map((option) => ({
      ...option,
      count: paymentStatusCounts[option.value] || 0,
    }));
  }, [paymentStatusCounts]);

  const paymentColumns = [
    {
      key: 'payment_id',
      header: 'ID',
      render: (payment: Payment) => (
        <span className="font-mono text-sm text-gray-600">{payment.payment_id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'order',
      header: 'Pedido',
      render: (payment: Payment) => (
        <span className="text-sm text-gray-900">{payment.order.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      render: (payment: Payment) => (
        <span className="font-medium text-gray-900">
          R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Método',
      render: (payment: Payment) => (
        <span className="text-sm text-gray-600 capitalize">
          {payment.payment_method?.replace('_', ' ') || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (payment: Payment) => <StatusBadge status={payment.status} />,
    },
    {
      key: 'created_at',
      header: 'Data',
      render: (payment: Payment) => (
        <span className="text-sm text-gray-600">
          {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (payment: Payment) => (
        <div className="flex items-center gap-2">
          {payment.status === 'pending' && (
            <>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirmPayment(payment);
                }}
              >
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelPayment(payment);
                }}
              >
                Cancelar
              </Button>
            </>
          )}
          {payment.status === 'completed' && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenRefund(payment);
              }}
            >
              Reembolsar
            </Button>
          )}
        </div>
      ),
    },
  ];

  const gatewayColumns = [
    {
      key: 'name',
      header: 'Nome',
      render: (gateway: PaymentGateway) => (
        <span className="font-medium text-gray-900">{gateway.name}</span>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (gateway: PaymentGateway) => (
        <span className="text-sm text-gray-600 capitalize">{gateway.gateway_type}</span>
      ),
    },
    {
      key: 'enabled',
      header: 'Habilitado',
      render: (gateway: PaymentGateway) => (
        <span className={`text-sm ${gateway.is_enabled ? 'text-green-600' : 'text-gray-400'}`}>
          {gateway.is_enabled ? 'Sim' : 'Não'}
        </span>
      ),
    },
    {
      key: 'sandbox',
      header: 'Sandbox',
      render: (gateway: PaymentGateway) => (
        <span className={`text-sm ${gateway.is_sandbox ? 'text-yellow-600' : 'text-green-600'}`}>
          {gateway.is_sandbox ? 'Sim' : 'Produção'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Criado em',
      render: (gateway: PaymentGateway) => (
        <span className="text-sm text-gray-600">
          {format(new Date(gateway.created_at), "dd/MM/yyyy", { locale: ptBR })}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div>
      <Header
        title="Pagamentos"
        subtitle={`${payments.length} pagamento(s) | ${gateways.length} gateway(s)`}
      />

      <div className="p-6">
        {/* Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-4">
            <button
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                activeTab === 'payments'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('payments')}
            >
              Pagamentos
            </button>
            <button
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                activeTab === 'gateways'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('gateways')}
            >
              Gateways
            </button>
          </div>
          {activeTab === 'payments' && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExport('csv')}
                isLoading={isExporting}
              >
                Exportar CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExport('xlsx')}
                isLoading={isExporting}
              >
                Exportar XLSX
              </Button>
            </div>
          )}
        </div>

        {activeTab === 'payments' ? (
          <div className="space-y-4">
            <StatusFilter
              options={paymentFilterOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              className="flex-wrap"
            />
            <Card noPadding>
              <Table
                columns={paymentColumns}
                data={filteredPayments}
                keyExtractor={(payment) => payment.id}
                emptyMessage="Nenhum pagamento encontrado"
              />
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Gateways</h3>
                <p className="text-sm text-gray-500">Gerencie os provedores de pagamento ativos.</p>
              </div>
              <Button onClick={handleOpenGatewayModal}>Novo gateway</Button>
            </div>
            <Card noPadding>
              <Table
                columns={gatewayColumns}
                data={gateways}
                keyExtractor={(gateway) => gateway.id}
                emptyMessage="Nenhum gateway configurado"
              />
            </Card>
          </div>
        )}
      </div>

      {/* Refund Modal */}
      <Modal
        isOpen={refundModal.isOpen}
        onClose={handleCloseRefund}
        title="Reembolsar Pagamento"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Valor original: R$ {refundModal.payment?.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <Input
            label="Valor do Reembolso (deixe em branco para reembolso total)"
            type="number"
            step="0.01"
            min={0}
            max={refundModal.payment?.amount}
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder="Valor"
            error={refundError || undefined}
          />
          <Textarea
            label="Motivo do reembolso (opcional)"
            rows={3}
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder="Detalhes para controle interno"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={handleCloseRefund}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleRefund} isLoading={isRefunding}>
              Reembolsar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={gatewayModalOpen}
        onClose={handleCloseGatewayModal}
        title="Novo Gateway"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nome do gateway"
            value={gatewayForm.name}
            onChange={(e) => setGatewayForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Mercado Pago Principal"
            error={gatewayErrors.name}
          />
          <Select
            label="Tipo de gateway"
            value={gatewayForm.gateway_type}
            onChange={(e) => setGatewayForm((prev) => ({ ...prev, gateway_type: e.target.value }))}
            options={GATEWAY_TYPE_OPTIONS}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                checked={gatewayForm.is_enabled}
                onChange={(e) => setGatewayForm((prev) => ({ ...prev, is_enabled: e.target.checked }))}
              />
              Gateway habilitado
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                checked={gatewayForm.is_sandbox}
                onChange={(e) => setGatewayForm((prev) => ({ ...prev, is_sandbox: e.target.checked }))}
              />
              Ambiente sandbox
            </label>
          </div>
          <Input
            label="Endpoint (opcional)"
            value={gatewayForm.endpoint_url}
            onChange={(e) => setGatewayForm((prev) => ({ ...prev, endpoint_url: e.target.value }))}
            placeholder="https://api.exemplo.com"
          />
          <Input
            label="Webhook (opcional)"
            value={gatewayForm.webhook_url}
            onChange={(e) => setGatewayForm((prev) => ({ ...prev, webhook_url: e.target.value }))}
            placeholder="https://sua-api.com/webhooks/pagamentos"
          />
          <Textarea
            label="Configura??o (JSON)"
            rows={4}
            value={gatewayForm.configuration}
            onChange={(e) => setGatewayForm((prev) => ({ ...prev, configuration: e.target.value }))}
            placeholder='{"client_id": "...", "client_secret": "..."}'
            error={gatewayErrors.configuration}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={handleCloseGatewayModal}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGateway} isLoading={isCreatingGateway}>
              Criar gateway
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
