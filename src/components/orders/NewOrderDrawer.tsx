/**
 * NewOrderDrawer — PDV: criação manual de pedido em 5 passos
 *
 * Passo 1: Cliente (busca + seleção)
 * Passo 2: Entrega (delivery/pickup + endereço + cálculo de taxa)
 * Passo 3: Itens (busca de produto + carrinho)
 * Passo 4: Ajustes (desconto / acréscimo opcionais)
 * Passo 5: Confirmar (resumo + forma de pagamento + botão criar)
 *
 * NOTA BACKEND: O endpoint POST /stores/{slug}/orders/ é o usado pelo dashboard.
 * Os campos manual_discount_* e surcharge_* dependem das migrações da Fase 1.
 * Enquanto não estiverem prontos, o pedido é criado sem esses campos extras.
 */
import React, { useEffect, useState } from 'react';
import {
  XMarkIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ordersService } from '../../services/orders';
import type { Product } from '../../services/products';
import type {
  CustomerSearchResult,
  UserAddress,
  DiscountType,
  RouteQuote,
} from '../../types/crm';
import { StepCliente } from './newOrder/steps/StepCliente';
import { StepEntrega } from './newOrder/steps/StepEntrega';
import { StepItens } from './newOrder/steps/StepItens';
import { StepAjustes } from './newOrder/steps/StepAjustes';
import { StepConfirmar } from './newOrder/steps/StepConfirmar';
import { STEP_LABELS, type CartItem, type PaymentMethod, type Customer } from './newOrder/types';

// ── Props ──────────────────────────────────────────────────────────────────────

interface NewOrderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  storeSlug: string;
  /**
   * Store UUID — used for product search via productsService.
   * Falls back to storeSlug if not provided (backend may accept both).
   */
  storeId?: string;
  /** If provided, the drawer opens with this customer pre-filled */
  initialCustomer?: CustomerSearchResult | null;
  /** Called after a successful order creation */
  onOrderCreated?: () => void;
}

// ── Main Drawer ────────────────────────────────────────────────────────────────

export const NewOrderDrawer: React.FC<NewOrderDrawerProps> = ({
  isOpen,
  onClose,
  storeSlug,
  storeId,
  initialCustomer = null,
  onOrderCreated,
}) => {
  // Use storeId if provided (UUID for product search), else fallback to storeSlug
  const productStoreKey = storeId || storeSlug;
  const [step, setStep] = useState(0);

  // Step 1 state
  const [customer, setCustomer] = useState<Customer | null>(initialCustomer as Customer | null);

  // Step 2 state
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [freeAddressText, setFreeAddressText] = useState('');
  const [routeQuote, setRouteQuote] = useState<RouteQuote | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  // Step 3 state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Step 4 state
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [surchargeValue, setSurchargeValue] = useState('');
  const [surchargeReason, setSurchargeReason] = useState('');

  // Step 5 state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [submitting, setSubmitting] = useState(false);

  // Sync initialCustomer when drawer opens
  useEffect(() => {
    if (isOpen) {
      setCustomer(initialCustomer ?? null);
      setStep(0);
    }
  }, [isOpen, initialCustomer]);

  // Reset on close
  const handleClose = () => {
    setStep(0);
    setCustomer(null);
    setDeliveryMethod('delivery');
    setSelectedAddress(null);
    setFreeAddressText('');
    setRouteQuote(null);
    setCart([]);
    setDiscountType('percent');
    setDiscountValue('');
    setDiscountReason('');
    setSurchargeValue('');
    setSurchargeReason('');
    setPaymentMethod('pix');
    setSubmitting(false);
    onClose();
  };

  // Route calculation
  const handleCalculateRoute = async (address: string) => {
    if (!address.trim() || !storeSlug) return;
    setCalculatingRoute(true);
    try {
      const data = await ordersService.calculateDeliveryFee(storeSlug, address);
      setRouteQuote({ fee: data.fee, distance_km: data.distance_km, duration_minutes: data.duration_minutes });
    } catch {
      toast.error('Erro ao calcular rota');
      setRouteQuote(null);
    } finally {
      setCalculatingRoute(false);
    }
  };

  // Cart actions
  const addToCart = (product: Product) => {
    setCart((prev) => {
      if (prev.some((c) => c.product.id === product.id)) return prev;
      return [...prev, { product, quantity: 1 }];
    });
  };

  const changeQty = (productId: string, qty: number) => {
    setCart((prev) =>
      prev.map((c) => (c.product.id === productId ? { ...c, quantity: qty } : c))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  // Validation per step
  const canProceed = (): boolean => {
    if (step === 0) {
      if (!customer) return false;
      // For new customers, require phone number to be filled
      const isNewCustomer = customer.id === '';
      if (isNewCustomer) {
        const phone = (customer as Customer).phone_number_edited || customer.phone_number;
        return Boolean(phone && phone.replace(/\D/g, '').length >= 10);
      }
      return true;
    }
    if (step === 1)
      return (
        deliveryMethod === 'pickup' ||
        freeAddressText.trim().length > 0
      );
    if (step === 2) return cart.length > 0;
    return true;
  };

  // Submit
  const handleSubmit = async () => {
    if (!customer || cart.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const deliveryAddress =
        deliveryMethod === 'delivery' ? freeAddressText.trim() : undefined;

      const apiPaymentMethod: 'pix' | 'cash' | 'credit_card' | 'debit_card' =
        paymentMethod === 'fiado' ? 'cash' : (paymentMethod as 'pix' | 'cash' | 'credit_card');

      const isNewCustomer = customer.id === '';
      const customerPhone = isNewCustomer
        ? ((customer as Customer).phone_number_edited || customer.phone_number)
        : customer.phone_number;

      // Desconto/acréscimo entram no total do backend (e portanto no PIX gerado)
      const orderSubtotal = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);
      const discountRaw = parseFloat(discountValue) || 0;
      const discountAmount = discountType === 'percent'
        ? Math.round(orderSubtotal * discountRaw) / 100
        : discountRaw;
      const surchargeAmount = parseFloat(surchargeValue) || 0;
      const adjustmentReason = [discountReason.trim(), surchargeReason.trim()]
        .filter(Boolean)
        .join(' | ');

      const created = await ordersService.createOrder({
        store: storeSlug,
        customer_name: customer.name || 'Cliente PDV',
        customer_phone: customerPhone.replace(/\D/g, ''),
        customer_email: customer.email,
        delivery_method: deliveryMethod,
        delivery_address: deliveryAddress,
        delivery_fee: deliveryMethod === 'delivery' ? (routeQuote?.fee ?? 0) : 0,
        items: cart.map((c) => ({
          product_id: c.product.id,
          quantity: c.quantity,
        })),
        payment_method: apiPaymentMethod,
        notes: paymentMethod === 'fiado' ? 'Fiado' : undefined,
        ...(discountAmount > 0 ? { discount: Number(discountAmount.toFixed(2)) } : {}),
        ...(surchargeAmount > 0 ? { surcharge: Number(surchargeAmount.toFixed(2)) } : {}),
        ...(adjustmentReason ? { adjustment_reason: adjustmentReason } : {}),
      });

      // PDV PIX: backend agora gera o pagamento na criação — entregar o link na hora
      const pixLink = (created as { pix_ticket_url?: string })?.pix_ticket_url || '';
      const pixCode = (created as { pix_code?: string })?.pix_code || '';
      const paymentError = (created as { payment_error?: string })?.payment_error;
      if (paymentMethod === 'pix' && (pixLink || pixCode)) {
        try {
          await navigator.clipboard.writeText(pixLink || pixCode);
          toast.success('Pedido criado! Link PIX copiado — cole no WhatsApp do cliente.', { duration: 6000 });
        } catch {
          toast.success('Pedido criado! Abra o pedido para ver o PIX.', { duration: 6000 });
        }
      } else if (paymentMethod === 'pix' && paymentError) {
        toast.error(`Pedido criado, mas o PIX falhou: ${paymentError}`, { duration: 8000 });
      } else {
        toast.success('Pedido criado com sucesso!');
      }
      onOrderCreated?.();
      handleClose();
    } catch {
      toast.error('Erro ao criar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Novo Pedido (PDV)</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500">
              Passo {step + 1} de {STEP_LABELS.length}: {STEP_LABELS[step]}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex px-4 py-2 gap-1 flex-shrink-0">
          {STEP_LABELS.map((label, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i <= step
                  ? 'bg-primary-600'
                  : 'bg-gray-200 dark:bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {step === 0 && (
            <StepCliente
              storeSlug={storeSlug}
              customer={customer}
              onCustomerSelected={setCustomer}
              onCustomerCleared={() => setCustomer(null)}
            />
          )}
          {step === 1 && (
            <StepEntrega
              customer={customer}
              deliveryMethod={deliveryMethod}
              setDeliveryMethod={setDeliveryMethod}
              selectedAddress={selectedAddress}
              setSelectedAddress={setSelectedAddress}
              freeAddressText={freeAddressText}
              setFreeAddressText={setFreeAddressText}
              routeQuote={routeQuote}
              calculatingRoute={calculatingRoute}
              onCalculateRoute={handleCalculateRoute}
            />
          )}
          {step === 2 && (
            <StepItens
              storeId={productStoreKey}
              cart={cart}
              onAdd={addToCart}
              onQtyChange={changeQty}
              onRemove={removeFromCart}
            />
          )}
          {step === 3 && (
            <StepAjustes
              discountType={discountType}
              setDiscountType={setDiscountType}
              discountValue={discountValue}
              setDiscountValue={setDiscountValue}
              discountReason={discountReason}
              setDiscountReason={setDiscountReason}
              surchargeValue={surchargeValue}
              setSurchargeValue={setSurchargeValue}
              surchargeReason={surchargeReason}
              setSurchargeReason={setSurchargeReason}
            />
          )}
          {step === 4 && (
            <StepConfirmar
              cart={cart}
              deliveryMethod={deliveryMethod}
              deliveryAddress={freeAddressText}
              routeQuote={routeQuote}
              discountType={discountType}
              discountValue={discountValue}
              surchargeValue={surchargeValue}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              submitting={submitting}
              onSubmit={handleSubmit}
            />
          )}
        </div>

        {/* Footer navigation */}
        {step < 4 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-zinc-800 flex-shrink-0">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-default transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Voltar
            </button>
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-default text-white text-sm font-semibold transition-colors"
            >
              Próximo
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default NewOrderDrawer;
