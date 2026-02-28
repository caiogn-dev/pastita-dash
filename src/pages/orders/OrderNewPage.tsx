/**
 * OrderNewPage - Página de criação de pedido
 * Formulário completo para criar novos pedidos
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Flex,
  Stack,
  Heading,
  Text,
  Grid,
  GridItem,
  Input,
  Textarea,
  IconButton,
  Badge,
  Separator,
  Card as ChakraCard,
} from '@chakra-ui/react';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CreditCardIcon,
  TruckIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Card, Button, PageLoading } from '../../components/common';
import { ordersService, productsService, getErrorMessage } from '../../services';
import { useStore } from '../../hooks';

// Tipos
interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  sku: string;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

// Schema de validação
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

export const OrderNewPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, storeSlug } = useStore();
  const effectiveStoreId = routeStoreId || storeSlug || contextStoreId;

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      delivery_method: 'delivery',
      delivery_address: '',
      payment_method: 'pix',
      notes: '',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const deliveryMethod = watch('delivery_method');
  const items = watch('items');

  // Calcular totais
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const deliveryFee = deliveryMethod === 'delivery' ? 5.00 : 0; // Taxa fixa exemplo
    const total = subtotal + deliveryFee;
    return { subtotal, deliveryFee, total };
  }, [items, deliveryMethod]);

  // Carregar produtos
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await productsService.getProducts({ is_active: true });
        setProducts(response.results || []);
      } catch (error) {
        toast.error('Erro ao carregar produtos');
      } finally {
        setProductsLoading(false);
      }
    };
    loadProducts();
  }, []);

  // Adicionar item ao pedido
  const handleAddItem = () => {
    if (!selectedProduct || quantity < 1) return;
    
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    // Verificar se já existe
    const existingIndex = items.findIndex(item => item.product_id === product.id);
    if (existingIndex >= 0) {
      const existing = items[existingIndex];
      const newQuantity = existing.quantity + quantity;
      const updatedItems = [...items];
      updatedItems[existingIndex] = { ...existing, quantity: newQuantity };
      setValue('items', updatedItems);
    } else {
      append({
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: product.price,
      });
    }

    setSelectedProduct('');
    setQuantity(1);
  };

  // Remover item
  const handleRemoveItem = (index: number) => {
    remove(index);
  };

  // Submit do formulário
  const onSubmit = async (data: OrderFormData) => {
    if (!effectiveStoreId) {
      toast.error('Selecione uma loja');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData = {
        store: effectiveStoreId,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || undefined,
        delivery_address: data.delivery_method === 'delivery' ? data.delivery_address : undefined,
        payment_method: data.payment_method,
        notes: data.notes,
        items: data.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      };

      const order = await ordersService.createOrder(orderData);
      toast.success(`Pedido #${order.order_number} criado com sucesso!`);
      navigate(`/stores/${effectiveStoreId}/orders/${order.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (productsLoading) {
    return <PageLoading />;
  }

  return (
    <Box p={6}>
      <Stack gap={6}>
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={4}>
            <IconButton
              aria-label="Voltar"
              variant="ghost"
              onClick={() => navigate(`/stores/${effectiveStoreId}/orders`)}
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </IconButton>
            <Heading size="xl">Novo Pedido</Heading>
          </Flex>
        </Flex>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
            {/* Coluna Principal */}
            <Stack gap={6}>
              {/* Cliente */}
              <Card>
                <Stack gap={4}>
                  <Flex align="center" gap={2}>
                    <UserIcon className="w-5 h-5" />
                    <Heading size="md">Dados do Cliente</Heading>
                  </Flex>
                  
                  <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
                    <GridItem>
                      <Text mb={1} fontSize="sm" fontWeight="medium">Nome *</Text>
                      <Input
                        {...register('customer_name')}
                        placeholder="Nome do cliente"
                      />
                      {errors.customer_name && (
                        <Text color="red.500" fontSize="xs">{errors.customer_name.message}</Text>
                      )}
                    </GridItem>
                    
                    <GridItem>
                      <Text mb={1} fontSize="sm" fontWeight="medium">Telefone *</Text>
                      <Input
                        {...register('customer_phone')}
                        placeholder="(11) 99999-9999"
                      />
                      {errors.customer_phone && (
                        <Text color="red.500" fontSize="xs">{errors.customer_phone.message}</Text>
                      )}
                    </GridItem>
                  </Grid>

                  <GridItem>
                    <Text mb={1} fontSize="sm" fontWeight="medium">Email</Text>
                    <Input
                      {...register('customer_email')}
                      placeholder="cliente@email.com"
                      type="email"
                    />
                  </GridItem>
                </Stack>
              </Card>

              {/* Produtos */}
              <Card>
                <Stack gap={4}>
                  <Flex align="center" gap={2}>
                    <ShoppingCartIcon className="w-5 h-5" />
                    <Heading size="md">Produtos</Heading>
                  </Flex>

                  {/* Adicionar Produto */}
                  <Flex gap={3} align="flex-end">
                    <Box flex={1}>
                      <Text mb={1} fontSize="sm" fontWeight="medium">Produto</Text>
                      <select
                        value={selectedProduct}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedProduct(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">Selecione um produto</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - R$ {product.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </Box>
                    <Box w="100px">
                      <Text mb={1} fontSize="sm" fontWeight="medium">Qtd</Text>
                      <Input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      />
                    </Box>
                    <Button
                      leftIcon={<PlusIcon className="w-4 h-4" />}
                      onClick={handleAddItem}
                      disabled={!selectedProduct}
                    >
                      Adicionar
                    </Button>
                  </Flex>

                  {errors.items && (
                    <Text color="red.500" fontSize="sm">{errors.items.message}</Text>
                  )}

                  {/* Lista de Itens */}
                  {fields.length > 0 && (
                    <ChakraCard.Root variant="outline">
                      <ChakraCard.Body p={0}>
                        {fields.map((field, index) => (
                          <Flex
                            key={field.id}
                            p={3}
                            justify="space-between"
                            align="center"
                            borderBottomWidth={index < fields.length - 1 ? 1 : 0}
                          >
                            <Stack gap={0} flex={1}>
                              <Text fontWeight="medium">{field.product_name}</Text>
                              <Text fontSize="sm" color="fg.muted">
                                {field.quantity} x R$ {field.unit_price.toFixed(2)}
                              </Text>
                            </Stack>
                            <Flex align="center" gap={4}>
                              <Text fontWeight="semibold">
                                R$ {(field.quantity * field.unit_price).toFixed(2)}
                              </Text>
                              <IconButton
                                aria-label="Remover"
                                variant="ghost"
                                size="sm"
                                colorPalette="red"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <TrashIcon className="w-4 h-4" />
                              </IconButton>
                            </Flex>
                          </Flex>
                        ))}
                      </ChakraCard.Body>
                    </ChakraCard.Root>
                  )}
                </Stack>
              </Card>

              {/* Entrega */}
              <Card>
                <Stack gap={4}>
                  <Flex align="center" gap={2}>
                    <TruckIcon className="w-5 h-5" />
                    <Heading size="md">Entrega</Heading>
                  </Flex>

                  <select
                    {...register('delivery_method')}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      fontSize: '14px'
                    }}
                  >
                    <option value="delivery">Entrega</option>
                    <option value="pickup">Retirada</option>
                    <option value="digital">Digital</option>
                  </select>

                  {deliveryMethod === 'delivery' && (
                    <Box>
                      <Text mb={1} fontSize="sm" fontWeight="medium">Endereço de Entrega</Text>
                      <Textarea
                        {...register('delivery_address')}
                        placeholder="Rua, número, bairro, cidade..."
                        rows={3}
                      />
                    </Box>
                  )}
                </Stack>
              </Card>

              {/* Observações */}
              <Card>
                <Stack gap={4}>
                  <Heading size="md">Observações</Heading>
                  <Textarea
                    {...register('notes')}
                    placeholder="Observações sobre o pedido..."
                    rows={3}
                  />
                </Stack>
              </Card>
            </Stack>

            {/* Coluna Lateral - Resumo */}
            <Stack gap={6}>
              <Card>
                <Stack gap={4}>
                  <Flex align="center" gap={2}>
                    <CreditCardIcon className="w-5 h-5" />
                    <Heading size="md">Pagamento</Heading>
                  </Flex>

                  <select
                    {...register('payment_method')}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      fontSize: '14px'
                    }}
                  >
                    <option value="pix">PIX</option>
                    <option value="cash">Dinheiro</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="debit_card">Cartão de Débito</option>
                  </select>
                </Stack>
              </Card>

              <Card>
                <Stack gap={4}>
                  <Heading size="md">Resumo do Pedido</Heading>
                  
                  <Flex justify="space-between">
                    <Text color="fg.muted">Subtotal</Text>
                    <Text>R$ {totals.subtotal.toFixed(2)}</Text>
                  </Flex>
                  
                  <Flex justify="space-between">
                    <Text color="fg.muted">Taxa de Entrega</Text>
                    <Text>R$ {totals.deliveryFee.toFixed(2)}</Text>
                  </Flex>
                  
                  <Separator />
                  
                  <Flex justify="space-between">
                    <Text fontWeight="bold" fontSize="lg">Total</Text>
                    <Text fontWeight="bold" fontSize="lg" color="green.500">
                      R$ {totals.total.toFixed(2)}
                    </Text>
                  </Flex>

                  <Button
                    type="submit"
                    size="lg"
                    width="full"
                    isLoading={isSubmitting}
                    leftIcon={<PlusIcon className="w-5 h-5" />}
                  >
                    Criar Pedido
                  </Button>
                </Stack>
              </Card>
            </Stack>
          </Grid>
        </form>
      </Stack>
    </Box>
  );
};

export default OrderNewPage;
