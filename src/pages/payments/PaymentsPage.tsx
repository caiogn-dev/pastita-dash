import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Header } from '../../components/layout';
import { Card, Button, Table, StatusBadge, Modal, Input, PageLoading } from '../../components/common';
import { paymentsService, getErrorMessage } from '../../services';
import { Payment, PaymentGateway } from '../../types';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payments' | 'gateways'>('payments');
  const [refundModal, setRefundModal] = useState<{ isOpen: boolean; payment: Payment | null }>({
    isOpen: false,
    payment: null,
  });
  const [refundAmount, setRefundAmount] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

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
    setIsRefunding(true);
    try {
      const amount = refundAmount ? parseFloat(refundAmount) : undefined;
      const updated = await paymentsService.refundPayment(refundModal.payment.id, amount);
      setPayments(payments.map((p) => (p.id === updated.id ? updated : p)));
      toast.success('Reembolso processado!');
      setRefundModal({ isOpen: false, payment: null });
      setRefundAmount('');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsRefunding(false);
    }
  };

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
                setRefundModal({ isOpen: true, payment });
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
        <div className="flex gap-4 mb-6">
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

        {activeTab === 'payments' ? (
          <Card noPadding>
            <Table
              columns={paymentColumns}
              data={payments}
              keyExtractor={(payment) => payment.id}
              emptyMessage="Nenhum pagamento encontrado"
            />
          </Card>
        ) : (
          <Card noPadding>
            <Table
              columns={gatewayColumns}
              data={gateways}
              keyExtractor={(gateway) => gateway.id}
              emptyMessage="Nenhum gateway configurado"
            />
          </Card>
        )}
      </div>

      {/* Refund Modal */}
      <Modal
        isOpen={refundModal.isOpen}
        onClose={() => setRefundModal({ isOpen: false, payment: null })}
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
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setRefundModal({ isOpen: false, payment: null })}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleRefund} isLoading={isRefunding}>
              Reembolsar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
