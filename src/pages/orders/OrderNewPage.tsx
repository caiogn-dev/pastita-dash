import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { MinusIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Button, Card, Input, PageLoading } from '../../components/common';
import { getErrorMessage, ordersService, productsService } from '../../services';
import { useStore } from '../../hooks/useStore';
import { Product } from '../../services/products';
import type { CreateOrder } from '../../types';

type OrderLine = {
  product: Product;
  quantity: number;
};

const formatMoney = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const OrderNewPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, storeSlug } = useStore();
  const storeId = routeStoreId || contextStoreId || storeSlug;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [items, setItems] = useState<OrderLine[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash' | 'credit_card' | 'debit_card'>('pix');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const loadProducts = async () => {
      if (!storeId) {
        toast.error('Loja nao informada');
        navigate('/stores');
        return;
      }

      try {
        setLoading(true);
        const response = await productsService.getProducts({ store: storeId, page_size: 200 });
        setProducts(response.results || []);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [storeId, navigate]);

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + Number(item.product.price || 0) * item.quantity, 0);
  }, [items]);

  const addItem = () => {
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;
    if (selectedQty <= 0) return;

    setItems((prev) => {
      const idx = prev.findIndex((line) => line.product.id === product.id);
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = { ...clone[idx], quantity: clone[idx].quantity + selectedQty };
        return clone;
      }
      return [...prev, { product, quantity: selectedQty }];
    });

    setSelectedProductId('');
    setSelectedQty(1);
  };

  const updateQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((line) => line.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((line) => (line.product.id === productId ? { ...line, quantity } : line))
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((line) => line.product.id !== productId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Preencha nome e telefone do cliente');
      return;
    }
    if (!items.length) {
      toast.error('Adicione ao menos um produto');
      return;
    }

    const payload: CreateOrder = {
      store: storeId,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_email: customerEmail.trim() || undefined,
      items: items.map((line) => ({
        product_id: line.product.id,
        quantity: line.quantity,
      })),
      payment_method: paymentMethod,
      delivery_address: deliveryAddress.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      setSaving(true);
      const order = await ordersService.createOrder(payload);
      toast.success(`Pedido #${order.order_number} criado`);
      navigate(`/stores/${storeId}/orders/${order.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="p-6">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">Novo Pedido</h1>
            <p className="text-gray-500">Crie um pedido manual para esta loja</p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/stores/${storeId}/orders`)}>
            Voltar
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <Card title="Cliente">
              <div className="flex flex-col gap-4">
                <Input
                  label="Nome"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nome do cliente"
                  required
                />
                <Input
                  label="Telefone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  required
                />
                <Input
                  label="Email (opcional)"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="cliente@email.com"
                />
              </div>
            </Card>

            <Card title="Produtos">
              <div className="flex flex-col gap-4">
                <div className="flex gap-3 flex-wrap">
                  <div className="min-w-[300px] flex-1">
                    <label className="block text-sm mb-1">Produto</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                    >
                      <option value="">Selecione um produto</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - R$ {formatMoney(Number(product.price || 0))}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-[120px]">
                    <Input
                      label="Qtd"
                      type="number"
                      min={1}
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(Number(e.target.value || 1))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addItem} type="button">
                      <PlusIcon className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                {!items.length ? (
                  <p className="text-gray-500">Nenhum item adicionado.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {items.map((line) => (
                      <div
                        key={line.product.id}
                        className="flex justify-between items-center p-3 border border-gray-200 rounded-md"
                      >
                        <div>
                          <p className="font-semibold">{line.product.name}</p>
                          <p className="text-gray-500 text-sm">
                            R$ {formatMoney(Number(line.product.price || 0))} cada
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateQty(line.product.id, line.quantity - 1)}
                          >
                            <MinusIcon className="w-3 h-3" />
                          </Button>
                          <span className="min-w-[24px] text-center">
                            {line.quantity}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateQty(line.product.id, line.quantity + 1)}
                          >
                            <PlusIcon className="w-3 h-3" />
                          </Button>
                          <span className="min-w-[120px] text-right font-semibold">
                            R$ {formatMoney(Number(line.product.price || 0) * line.quantity)}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeItem(line.product.id)}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card title="Entrega e Pagamento">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm mb-1">Forma de pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="pix">PIX</option>
                    <option value="cash">Dinheiro</option>
                    <option value="credit_card">Cartao de credito</option>
                    <option value="debit_card">Cartao de debito</option>
                  </select>
                </div>
                <Input
                  label="Endereco de entrega (opcional)"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Rua, numero, bairro, cidade"
                />
                <Input
                  label="Observacoes (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: sem cebola, entregar no portao"
                />
              </div>
            </Card>

            <Card>
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                  <p className="text-gray-500">Subtotal</p>
                  <h2 className="text-xl font-bold">R$ {formatMoney(subtotal)}</h2>
                </div>
                <Button type="submit" isLoading={saving}>
                  Criar Pedido
                </Button>
              </div>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderNewPage;
