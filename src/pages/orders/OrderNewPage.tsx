/**
 * OrderNewPage - Página de criação de pedido
 * Formulário completo para criar novos pedidos
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
  CreditCardIcon,
  TruckIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Card, Button, PageLoading } from '../../components/common';
import { ordersService, productsService, getErrorMessage } from '../../services';
import { useStore } from '../../hooks';

interface Product {
  id: string;
  name: string;
  price: number | string;
  stock_quantity: number;
  sku: string;
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  return 0;
};

const formatPrice = (value: unknown): string => toNumber(value).toFixed(2);

const orderSchema = z.object({
  customer_name: z.string().min(2, 'Nome é obrigatório'),
  customer_phone: z.string().min(10, 'Telefone inválido'),
  customer_email: z.string().email('Email inválido').optional().or(z.literal('')),
  delivery_method: z.enum(['delivery', 'pickup', 'digital']),
  delivery_address: z.string().optional(),
  payment_method: z.enum(['pix', 'cash', 'credit_card', 'debit_card']),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string(),
    product_name: z.string(),
    quantity: z.number().min(1, 'Quantidade mínima é 1'),
    unit_price: z.number(),
  })).min(1, 'Adicione pelo menos um item'),
});

type OrderFormData = z.infer<typeof orderSchema>;

const inputCls = 'w-full px-3 py-2 text-sm border border-border-primary rounded-lg bg-bg-card text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-500';
const selectCls = inputCls;
const labelCls = 'block text-sm font-medium text-fg-secondary mb-1';
const errorCls = 'text-xs text-red-500 mt-1';

export const OrderNewPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, stores } = useStore();
  const effectiveStoreId = useMemo(() => {
    if (!routeStoreId) return contextStoreId || null;
    const match = stores.find(s => s.id === routeStoreId || s.slug === routeStoreId);
    return match?.id || contextStoreId || null;
  }, [routeStoreId, contextStoreId, stores]);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_name: '', customer_phone: '', customer_email: '',
      delivery_method: 'delivery', delivery_address: '',
      payment_method: 'pix', notes: '', items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const deliveryMethod = watch('delivery_method');
  const items = watch('items');

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const deliveryFee = deliveryMethod === 'delivery' ? 5.00 : 0;
    return { subtotal, deliveryFee, total: subtotal + deliveryFee };
  }, [items, deliveryMethod]);

  useEffect(() => {
    if (!effectiveStoreId) return;
    const load = async () => {
      try {
        const response = await productsService.getProducts({ store: effectiveStoreId, is_active: true });
        setProducts((response.results || []).map(p => ({
          ...p,
          price: toNumber(p.price),
          stock_quantity: toNumber(p.stock_quantity),
        })));
      } catch { toast.error('Erro ao carregar produtos'); }
      finally { setProductsLoading(false); }
    };
    load();
  }, [effectiveStoreId]);

  const handleAddItem = () => {
    if (!selectedProduct || quantity < 1) return;
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    const existingIndex = items.findIndex(item => item.product_id === product.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + quantity };
      setValue('items', updated);
    } else {
      append({ product_id: product.id, product_name: product.name, quantity, unit_price: toNumber(product.price) });
    }
    setSelectedProduct('');
    setQuantity(1);
  };

  const onSubmit = async (data: OrderFormData) => {
    if (!effectiveStoreId) { toast.error('Selecione uma loja'); return; }
    setIsSubmitting(true);
    try {
      const order = await ordersService.createOrder({
        store: effectiveStoreId,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || undefined,
        delivery_address: data.delivery_method === 'delivery' ? data.delivery_address : undefined,
        payment_method: data.payment_method,
        notes: data.notes,
        items: data.items.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
      });
      toast.success(`Pedido #${order.order_number} criado com sucesso!`);
      navigate(`/stores/${effectiveStoreId}/orders/${order.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally { setIsSubmitting(false); }
  };

  if (productsLoading) return <PageLoading />;

  return (
    <div className="p-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(`/stores/${effectiveStoreId}/orders`)}
            className="p-2 rounded-lg hover:bg-bg-hover text-fg-muted transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-fg-primary">Novo Pedido</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
            {/* Coluna Principal */}
            <div className="flex flex-col gap-6">
              {/* Cliente */}
              <Card>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-fg-muted" />
                    <h2 className="text-base font-semibold text-fg-primary">Dados do Cliente</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Nome *</label>
                      <input {...register('customer_name')} placeholder="Nome do cliente" className={inputCls} />
                      {errors.customer_name && <p className={errorCls}>{errors.customer_name.message}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Telefone *</label>
                      <input {...register('customer_phone')} placeholder="(11) 99999-9999" className={inputCls} />
                      {errors.customer_phone && <p className={errorCls}>{errors.customer_phone.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Email</label>
                    <input {...register('customer_email')} type="email" placeholder="cliente@email.com" className={inputCls} />
                  </div>
                </div>
              </Card>

              {/* Produtos */}
              <Card>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCartIcon className="w-5 h-5 text-fg-muted" />
                    <h2 className="text-base font-semibold text-fg-primary">Produtos</h2>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1">
                      <label className={labelCls}>Produto</label>
                      <select
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(e.target.value)}
                        className={selectCls}
                      >
                        <option value="">Selecione um produto</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} — R$ {formatPrice(p.price)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <label className={labelCls}>Qtd</label>
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className={inputCls}
                      />
                    </div>
                    <Button
                      type="button"
                      leftIcon={<PlusIcon className="w-4 h-4" />}
                      onClick={handleAddItem}
                      disabled={!selectedProduct}
                    >
                      Adicionar
                    </Button>
                  </div>

                  {errors.items && (
                    <p className="text-sm text-red-500">{errors.items.message as string}</p>
                  )}

                  {fields.length > 0 && (
                    <div className="border border-border-primary rounded-lg overflow-hidden">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className={`flex items-center justify-between p-3 ${index < fields.length - 1 ? 'border-b border-border-primary' : ''}`}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-fg-primary">{field.product_name}</p>
                            <p className="text-xs text-fg-muted">{field.quantity} x R$ {formatPrice(field.unit_price)}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-fg-primary">
                              R$ {formatPrice(field.quantity * toNumber(field.unit_price))}
                            </span>
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-1.5 rounded hover:bg-bg-hover text-red-500 transition-colors"
                              aria-label="Remover"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Entrega */}
              <Card>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <TruckIcon className="w-5 h-5 text-fg-muted" />
                    <h2 className="text-base font-semibold text-fg-primary">Entrega</h2>
                  </div>

                  <select {...register('delivery_method')} className={selectCls}>
                    <option value="delivery">Entrega</option>
                    <option value="pickup">Retirada</option>
                    <option value="digital">Digital</option>
                  </select>

                  {deliveryMethod === 'delivery' && (
                    <div>
                      <label className={labelCls}>Endereço de Entrega</label>
                      <textarea
                        {...register('delivery_address')}
                        placeholder="Rua, número, bairro, cidade..."
                        rows={3}
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                  )}
                </div>
              </Card>

              {/* Observações */}
              <Card>
                <div className="flex flex-col gap-4">
                  <h2 className="text-base font-semibold text-fg-primary">Observações</h2>
                  <textarea
                    {...register('notes')}
                    placeholder="Observações sobre o pedido..."
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </Card>
            </div>

            {/* Coluna Lateral */}
            <div className="flex flex-col gap-6">
              {/* Pagamento */}
              <Card>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <CreditCardIcon className="w-5 h-5 text-fg-muted" />
                    <h2 className="text-base font-semibold text-fg-primary">Pagamento</h2>
                  </div>
                  <select {...register('payment_method')} className={selectCls}>
                    <option value="pix">PIX</option>
                    <option value="cash">Dinheiro</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="debit_card">Cartão de Débito</option>
                  </select>
                </div>
              </Card>

              {/* Resumo */}
              <Card>
                <div className="flex flex-col gap-4">
                  <h2 className="text-base font-semibold text-fg-primary">Resumo do Pedido</h2>

                  <div className="flex justify-between text-sm">
                    <span className="text-fg-muted">Subtotal</span>
                    <span className="text-fg-primary">R$ {formatPrice(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-muted">Taxa de Entrega</span>
                    <span className="text-fg-primary">R$ {formatPrice(totals.deliveryFee)}</span>
                  </div>

                  <div className="border-t border-border-primary" />

                  <div className="flex justify-between">
                    <span className="font-bold text-lg text-fg-primary">Total</span>
                    <span className="font-bold text-lg text-green-600 dark:text-green-400">R$ {formatPrice(totals.total)}</span>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isSubmitting}
                    leftIcon={<PlusIcon className="w-5 h-5" />}
                  >
                    Criar Pedido
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderNewPage;
