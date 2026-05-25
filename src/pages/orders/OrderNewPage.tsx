import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Flex, Heading, Stack, Text } from '@chakra-ui/react';
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
    <Box p={6}>
      <Stack gap={6}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
          <Stack gap={1}>
            <Heading size="xl">Novo Pedido</Heading>
            <Text color="fg.muted">Crie um pedido manual para esta loja</Text>
          </Stack>
          <Button variant="outline" onClick={() => navigate(`/stores/${storeId}/orders`)}>
            Voltar
          </Button>
        </Flex>

        <form onSubmit={handleSubmit}>
          <Stack gap={6}>
            <Card title="Cliente">
              <Stack gap={4}>
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
              </Stack>
            </Card>

            <Card title="Produtos">
              <Stack gap={4}>
                <Flex gap={3} wrap="wrap">
                  <Box minW="300px" flex={1}>
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
                  </Box>
                  <Box w="120px">
                    <Input
                      label="Qtd"
                      type="number"
                      min={1}
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(Number(e.target.value || 1))}
                    />
                  </Box>
                  <Flex align="flex-end">
                    <Button onClick={addItem} type="button">
                      <PlusIcon className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </Flex>
                </Flex>

                {!items.length ? (
                  <Text color="fg.muted">Nenhum item adicionado.</Text>
                ) : (
                  <Stack gap={2}>
                    {items.map((line) => (
                      <Flex
                        key={line.product.id}
                        justify="space-between"
                        align="center"
                        p={3}
                        borderWidth="1px"
                        borderRadius="md"
                        borderColor="border.subtle"
                      >
                        <Box>
                          <Text fontWeight="semibold">{line.product.name}</Text>
                          <Text color="fg.muted" fontSize="sm">
                            R$ {formatMoney(Number(line.product.price || 0))} cada
                          </Text>
                        </Box>
                        <Flex align="center" gap={2}>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateQty(line.product.id, line.quantity - 1)}
                          >
                            <MinusIcon className="w-3 h-3" />
                          </Button>
                          <Text minW="24px" textAlign="center">
                            {line.quantity}
                          </Text>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateQty(line.product.id, line.quantity + 1)}
                          >
                            <PlusIcon className="w-3 h-3" />
                          </Button>
                          <Text minW="120px" textAlign="right" fontWeight="semibold">
                            R$ {formatMoney(Number(line.product.price || 0) * line.quantity)}
                          </Text>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeItem(line.product.id)}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </Flex>
                      </Flex>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Card>

            <Card title="Entrega e Pagamento">
              <Stack gap={4}>
                <Box>
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
                </Box>
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
              </Stack>
            </Card>

            <Card>
              <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                <Stack gap={0}>
                  <Text color="fg.muted">Subtotal</Text>
                  <Heading size="lg">R$ {formatMoney(subtotal)}</Heading>
                </Stack>
                <Button type="submit" isLoading={saving}>
                  Criar Pedido
                </Button>
              </Flex>
            </Card>
          </Stack>
        </form>
      </Stack>
    </Box>
  );
};

export default OrderNewPage;
