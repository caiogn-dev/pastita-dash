import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  TruckIcon,
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Header } from '../../components/layout';
import { Card, Button, StatusBadge, Modal, Input, Textarea, PageLoading } from '../../components/common';
import { ordersService, paymentsService, getErrorMessage } from '../../services';
import { Order, OrderItem, OrderEvent, Payment } from '../../types';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals
  const [shipModal, setShipModal] = useState(false);
  const [noteModal, setNoteModal] = useState(false);
  const [addItemModal, setAddItemModal] = useState(false);

  // Form states
  const [shipForm, setShipForm] = useState({ tracking_code: '', carrier: '' });
  const [noteForm, setNoteForm] = useState({ note: '', is_internal: false });
  const [itemForm, setItemForm] = useState({
    product_name: '',
    product_sku: '',
    quantity: 1,
    unit_price: 0,
  });

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [orderData, eventsData, paymentsData] = await Promise.all([
        ordersService.getOrder(id),
        ordersService.getEvents(id),
        paymentsService.getByOrder(id),
      ]);
      setOrder(orderData);
      setEvents(eventsData);
      setPayments(paymentsData);
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate('/orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusAction = async (action: string) => {
    if (!order) return;
    setActionLoading(action);
    try {
      let updated: Order;
      switch (action) {
        case 'confirm':
          updated = await ordersService.confirmOrder(order.id);
          break;
        case 'awaiting_payment':
          updated = await ordersService.markAwaitingPayment(order.id);
          break;
        case 'paid':
          updated = await ordersService.markPaid(order.id);
          break;
        case 'processing':
          updated = await ordersService.startProcessing(order.id);
          break;
        case 'preparing':
          updated = await ordersService.startPreparing(order.id);
          break;
        case 'ready':
          updated = await ordersService.markReady(order.id);
          break;
        case 'out_for_delivery':
          updated = await ordersService.markOutForDelivery(order.id);
          break;
        case 'delivered':
          updated = await ordersService.deliverOrder(order.id);
          break;
        case 'deliver':
          updated = await ordersService.deliverOrder(order.id);
          break;
        case 'cancel':
          updated = await ordersService.cancelOrder(order.id);
          break;
        default:
          return;
      }
      setOrder(updated);
      loadOrder(); // Reload events
      toast.success('Status atualizado!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  const handleShip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setActionLoading('ship');
    try {
      const updated = await ordersService.shipOrder(
        order.id,
        shipForm.tracking_code,
        shipForm.carrier
      );
      setOrder(updated);
      setShipModal(false);
      setShipForm({ tracking_code: '', carrier: '' });
      loadOrder();
      toast.success('Pedido enviado!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setActionLoading('note');
    try {
      const updated = await ordersService.addNote(
        order.id,
        noteForm.note,
        noteForm.is_internal
      );
      setOrder(updated);
      setNoteModal(false);
      setNoteForm({ note: '', is_internal: false });
      loadOrder();
      toast.success('Nota adicionada!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setActionLoading('item');
    try {
      await ordersService.addItem(order.id, itemForm);
      setAddItemModal(false);
      setItemForm({ product_name: '', product_sku: '', quantity: 1, unit_price: 0 });
      loadOrder();
      toast.success('Item adicionado!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!order) return;
    try {
      await ordersService.removeItem(order.id, itemId);
      loadOrder();
      toast.success('Item removido!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (isLoading || !order) {
    return <PageLoading />;
  }

  const getStatusActions = () => {
    const actions: Array<{ action: string; label: string; variant?: 'primary' | 'secondary' | 'danger' }> = [];

    switch (order.status) {
      case 'pending':
        actions.push({ action: 'confirm', label: 'Confirmar Pedido' });
        break;
      case 'confirmed':
        actions.push({ action: 'processing', label: 'Iniciar Processamento' });
        break;
      case 'processing':
        actions.push({ action: 'preparing', label: 'Iniciar Preparo' });
        break;
      case 'paid':
        actions.push({ action: 'preparing', label: 'Iniciar Preparo' });
        break;
      case 'preparing':
        actions.push({ action: 'ready', label: 'Pronto para Entrega' });
        break;
      case 'ready':
        actions.push({ action: 'out_for_delivery', label: 'Saiu para Entrega' });
        break;
      case 'out_for_delivery':
        actions.push({ action: 'delivered', label: 'Marcar como Entregue' });
        break;
      case 'shipped':
        actions.push({ action: 'delivered', label: 'Marcar como Entregue' });
        break;
    }

    if (!['cancelled', 'delivered', 'refunded', 'completed', 'failed'].includes(order.status)) {
      actions.push({ action: 'cancel', label: 'Cancelar', variant: 'danger' });
    }

    return actions;
  };

  return (
    <div>
      <Header
        title={`Pedido #${order.order_number}`}
        subtitle={`Criado em ${format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`}
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeftIcon className="w-5 h-5" />}
            onClick={() => navigate('/orders')}
          >
            <span className="hidden sm:inline">Voltar</span>
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Status and Actions */}
        <Card>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <StatusBadge status={order.status} />
                <span className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  R$ {(order.total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {getStatusActions().map(({ action, label, variant }) => (
                <Button
                  key={action}
                  variant={variant || 'primary'}
                  size="sm"
                  isLoading={actionLoading === action}
                  onClick={() => {
                    if (action === 'ship') {
                      setShipModal(true);
                    } else {
                      handleStatusAction(action);
                    }
                  }}
                  className="flex-1 sm:flex-none"
                >
                  {label}
                </Button>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setNoteModal(true)}
                className="flex-1 sm:flex-none"
              >
                Adicionar Nota
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Customer Info */}
          <Card title="Cliente">
            <div className="space-y-3">
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nome</p>
                <p className="text-sm md:text-base font-medium text-gray-900 dark:text-white">{order.customer_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Telefone</p>
                <p className="text-sm md:text-base font-medium text-gray-900 dark:text-white">{order.customer_phone}</p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</p>
                <p className="text-sm md:text-base font-medium text-gray-900 dark:text-white break-all">{order.customer_email || '-'}</p>
              </div>
            </div>
          </Card>

          {/* Shipping Info */}
          <Card title="Entrega">
            <div className="space-y-3">
              {(() => {
                const address = order.delivery_address || order.shipping_address;
                const hasAddress = address && Object.keys(address).length > 0;
                return hasAddress ? (
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Endereço</p>
                    <p className="text-sm md:text-base font-medium text-gray-900 dark:text-white">
                      {(address as Record<string, string>).street || (address as Record<string, string>).address || '-'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {(address as Record<string, string>).neighborhood && `${(address as Record<string, string>).neighborhood}, `}
                      {(address as Record<string, string>).city},{' '}
                      {(address as Record<string, string>).state}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      CEP: {(address as Record<string, string>).zip_code || (address as Record<string, string>).cep || '-'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">Endereço não informado</p>
                );
              })()}
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Frete</p>
                <p className="text-sm md:text-base font-medium text-gray-900 dark:text-white">
                  R$ {(order.delivery_fee ?? order.shipping_cost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>

          {/* Payment Info */}
          <Card title="Pagamento" className="md:col-span-2 lg:col-span-1">
            <div className="space-y-3">
              {payments.length > 0 ? (
                payments.map((payment) => (
                  <div key={payment.id} className="flex items-start justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-sm md:text-base font-medium text-gray-900 dark:text-white">{payment.payment_method || 'N/A'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        R$ {(payment.amount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {payment.payment_url && (
                        <a
                          href={payment.payment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                        >
                          Abrir link →
                        </a>
                      )}
                    </div>
                    <StatusBadge status={payment.status} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">Nenhum pagamento registrado</p>
              )}
            </div>
          </Card>
        </div>

        {/* Order Items */}
        <Card
          title="Itens do Pedido"
          actions={
            !['cancelled', 'delivered', 'refunded'].includes(order.status) && (
              <Button
                size="sm"
                leftIcon={<PlusIcon className="w-4 h-4" />}
                onClick={() => setAddItemModal(true)}
              >
                <span className="hidden sm:inline">Adicionar Item</span>
                <span className="sm:hidden">Adicionar</span>
              </Button>
            )
          }
        >
          {/* Mobile Items View */}
          <div className="block md:hidden divide-y divide-gray-200">
            {order.items?.map((item: OrderItem) => (
              <div key={item.id} className="py-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                    {item.product_sku && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.product_sku}</p>
                    )}
                  </div>
                  {!['cancelled', 'delivered', 'refunded'].includes(order.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:text-red-300"
                    >
                      Remover
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {item.quantity}x R$ {(item.unit_price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    R$ {(item.subtotal ?? item.total_price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Mobile Summary */}
            <div className="pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-900 dark:text-white">R$ {(order.subtotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              {(order.discount ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 dark:text-green-400">Desconto</span>
                  <span className="text-green-600 dark:text-green-400">- R$ {(order.discount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Frete</span>
                <span className="text-gray-900 dark:text-white">R$ {(order.delivery_fee ?? order.shipping_cost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-gray-900 dark:text-white">R$ {(order.total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Produto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Qtd
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Preço Unit.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Total
                  </th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:bg-gray-800">
                {order.items?.map((item: OrderItem) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {item.product_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {item.product_sku || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">
                      R$ {(item.unit_price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                      R$ {(item.subtotal ?? item.total_price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!['cancelled', 'delivered', 'refunded'].includes(order.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:text-red-300 hover:bg-red-50"
                        >
                          Remover
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-900">
                  <td colSpan={4} className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                    Subtotal
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                    R$ {(order.subtotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
                {(order.discount ?? 0) > 0 && (
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <td colSpan={4} className="px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400 text-right">
                      Desconto
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400 text-right">
                      - R$ {(order.discount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                )}
                <tr className="bg-gray-50 dark:bg-gray-900">
                  <td colSpan={4} className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                    Frete
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                    R$ {(order.delivery_fee ?? order.shipping_cost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <td colSpan={4} className="px-4 py-3 text-base font-bold text-gray-900 dark:text-white text-right">
                    Total
                  </td>
                  <td className="px-4 py-3 text-base font-bold text-gray-900 dark:text-white text-right">
                    R$ {(order.total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Notes */}
        {(order.notes || order.internal_notes) && (
          <Card title="Notas">
            <div className="space-y-4">
              {order.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Notas do Cliente</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{order.notes}</p>
                </div>
              )}
              {order.internal_notes && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Notas Internas</p>
                  <p className="mt-1 text-gray-900 dark:text-white">{order.internal_notes}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Timeline */}
        <Card title="Histórico">
          <div className="flow-root">
            <ul className="-mb-8">
              {events.map((event, idx) => (
                <li key={event.id}>
                  <div className="relative pb-8">
                    {idx !== events.length - 1 && (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                          <CheckCircleIcon className="h-5 w-5 text-white" />
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">{event.description}</p>
                          {event.old_status && event.new_status && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {event.old_status} → {event.new_status}
                            </p>
                          )}
                        </div>
                        <div className="whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                          {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {/* Ship Modal */}
      <Modal
        isOpen={shipModal}
        onClose={() => setShipModal(false)}
        title="Enviar Pedido"
        size="sm"
      >
        <form onSubmit={handleShip} className="space-y-4">
          <Input
            label="Código de Rastreio"
            value={shipForm.tracking_code}
            onChange={(e) => setShipForm({ ...shipForm, tracking_code: e.target.value })}
            placeholder="Ex: BR123456789BR"
          />
          <Input
            label="Transportadora"
            value={shipForm.carrier}
            onChange={(e) => setShipForm({ ...shipForm, carrier: e.target.value })}
            placeholder="Ex: Correios, Jadlog"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShipModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={actionLoading === 'ship'}>
              Confirmar Envio
            </Button>
          </div>
        </form>
      </Modal>

      {/* Note Modal */}
      <Modal
        isOpen={noteModal}
        onClose={() => setNoteModal(false)}
        title="Adicionar Nota"
        size="sm"
      >
        <form onSubmit={handleAddNote} className="space-y-4">
          <Textarea
            label="Nota"
            required
            rows={4}
            value={noteForm.note}
            onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })}
            placeholder="Digite a nota..."
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={noteForm.is_internal}
              onChange={(e) => setNoteForm({ ...noteForm, is_internal: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600 text-green-600 dark:text-green-400 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Nota interna (não visível para o cliente)</span>
          </label>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setNoteModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={actionLoading === 'note'}>
              Adicionar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        isOpen={addItemModal}
        onClose={() => setAddItemModal(false)}
        title="Adicionar Item"
        size="sm"
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          <Input
            label="Nome do Produto"
            required
            value={itemForm.product_name}
            onChange={(e) => setItemForm({ ...itemForm, product_name: e.target.value })}
            placeholder="Nome do produto"
          />
          <Input
            label="SKU"
            value={itemForm.product_sku}
            onChange={(e) => setItemForm({ ...itemForm, product_sku: e.target.value })}
            placeholder="Código SKU"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantidade"
              type="number"
              min={1}
              required
              value={itemForm.quantity}
              onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) })}
            />
            <Input
              label="Preço Unitário"
              type="number"
              step="0.01"
              min={0}
              required
              value={itemForm.unit_price}
              onChange={(e) => setItemForm({ ...itemForm, unit_price: parseFloat(e.target.value) })}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAddItemModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={actionLoading === 'item'}>
              Adicionar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
