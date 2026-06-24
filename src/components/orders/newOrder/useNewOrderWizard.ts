import { useState } from 'react';
import toast from 'react-hot-toast';
import { ordersService } from '../../../services/orders';
import type { Product } from '../../../services/products';
import type { CustomerSearchResult, UserAddress, DiscountType, RouteQuote } from '../../../types/crm';
import type { CartItem, PaymentMethod, Customer } from './types';

export interface UseNewOrderWizardOpts {
  storeSlug: string;
  storeId?: string;
  initialCustomer?: CustomerSearchResult | null;
  onCreated?: () => void;
}

export interface NewOrderWizard {
  step: number; setStep: (n: number) => void; next: () => void; back: () => void; canProceed: () => boolean;
  customer: Customer | null; setCustomer: (c: Customer | null) => void;
  deliveryMethod: 'delivery' | 'pickup'; setDeliveryMethod: (m: 'delivery' | 'pickup') => void;
  selectedAddress: UserAddress | null; setSelectedAddress: (a: UserAddress | null) => void;
  freeAddressText: string; setFreeAddressText: (v: string) => void;
  routeQuote: RouteQuote | null; calculatingRoute: boolean; handleCalculateRoute: (address: string) => Promise<void>;
  cart: CartItem[]; addToCart: (p: Product) => void; changeQty: (id: string, qty: number) => void; removeFromCart: (id: string) => void;
  discountType: DiscountType; setDiscountType: (v: DiscountType) => void;
  discountValue: string; setDiscountValue: (v: string) => void; discountReason: string; setDiscountReason: (v: string) => void;
  surchargeValue: string; setSurchargeValue: (v: string) => void; surchargeReason: string; setSurchargeReason: (v: string) => void;
  paymentMethod: PaymentMethod; setPaymentMethod: (m: PaymentMethod) => void; submitting: boolean; handleSubmit: () => Promise<void>;
  enableScheduling: boolean; setEnableScheduling: (v: boolean) => void;
  scheduledDate: string; setScheduledDate: (v: string) => void;
  scheduledTime: string; setScheduledTime: (v: string) => void;
  reset: () => void; productStoreKey: string; storeSlug: string;
}

export function useNewOrderWizard(opts: UseNewOrderWizardOpts): NewOrderWizard {
  const { storeSlug, storeId, initialCustomer = null, onCreated } = opts;
  const productStoreKey = storeId || storeSlug;

  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<Customer | null>(initialCustomer as Customer | null);
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [freeAddressText, setFreeAddressText] = useState('');
  const [routeQuote, setRouteQuote] = useState<RouteQuote | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [surchargeValue, setSurchargeValue] = useState('');
  const [surchargeReason, setSurchargeReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [submitting, setSubmitting] = useState(false);
  const [enableScheduling, setEnableScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const reset = () => {
    setStep(0); setCustomer(null); setDeliveryMethod('delivery'); setSelectedAddress(null);
    setFreeAddressText(''); setRouteQuote(null); setCart([]); setDiscountType('percent');
    setDiscountValue(''); setDiscountReason(''); setSurchargeValue(''); setSurchargeReason('');
    setPaymentMethod('pix'); setSubmitting(false);
    setEnableScheduling(false); setScheduledDate(''); setScheduledTime('');
  };

  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

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

  const addToCart = (product: Product) =>
    setCart((prev) => (prev.some((c) => c.product.id === product.id) ? prev : [...prev, { product, quantity: 1 }]));
  const changeQty = (productId: string, qty: number) =>
    setCart((prev) => prev.map((c) => (c.product.id === productId ? { ...c, quantity: qty } : c)));
  const removeFromCart = (productId: string) =>
    setCart((prev) => prev.filter((c) => c.product.id !== productId));

  const canProceed = (): boolean => {
    if (step === 0) {
      if (!customer) return false;
      const isNewCustomer = customer.id === '';
      if (isNewCustomer) {
        const phone = customer.phone_number_edited || customer.phone_number;
        return Boolean(phone && phone.replace(/\D/g, '').length >= 10);
      }
      return true;
    }
    if (step === 1) return deliveryMethod === 'pickup' || freeAddressText.trim().length > 0;
    if (step === 2) return cart.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!customer || cart.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const deliveryAddress = deliveryMethod === 'delivery' ? freeAddressText.trim() : undefined;
      const apiPaymentMethod: 'pix' | 'cash' | 'credit_card' | 'debit_card' =
        paymentMethod === 'fiado' ? 'cash' : (paymentMethod as 'pix' | 'cash' | 'credit_card');
      const isNewCustomer = customer.id === '';
      const customerPhone = isNewCustomer ? (customer.phone_number_edited || customer.phone_number) : customer.phone_number;
      const orderSubtotal = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);
      const discountRaw = parseFloat(discountValue) || 0;
      const discountAmount = discountType === 'percent' ? Math.round(orderSubtotal * discountRaw) / 100 : discountRaw;
      const surchargeAmount = parseFloat(surchargeValue) || 0;
      const adjustmentReason = [discountReason.trim(), surchargeReason.trim()].filter(Boolean).join(' | ');

      const created = await ordersService.createOrder({
        store: storeSlug,
        customer_name: customer.name || 'Cliente PDV',
        customer_phone: customerPhone.replace(/\D/g, ''),
        customer_email: customer.email,
        delivery_method: deliveryMethod,
        delivery_address: deliveryAddress,
        delivery_fee: deliveryMethod === 'delivery' ? (routeQuote?.fee ?? 0) : 0,
        items: cart.map((c) => ({ product_id: c.product.id, quantity: c.quantity })),
        payment_method: apiPaymentMethod,
        notes: paymentMethod === 'fiado' ? 'Fiado' : undefined,
        ...(discountAmount > 0 ? { discount: Number(discountAmount.toFixed(2)) } : {}),
        ...(surchargeAmount > 0 ? { surcharge: Number(surchargeAmount.toFixed(2)) } : {}),
        ...(adjustmentReason ? { adjustment_reason: adjustmentReason } : {}),
        ...(enableScheduling && scheduledDate && scheduledTime
          ? { scheduled_date: scheduledDate, scheduled_time: scheduledTime }
          : {}),
      });

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
      onCreated?.();
    } catch {
      toast.error('Erro ao criar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    step, setStep, next, back, canProceed,
    customer, setCustomer, deliveryMethod, setDeliveryMethod, selectedAddress, setSelectedAddress,
    freeAddressText, setFreeAddressText, routeQuote, calculatingRoute, handleCalculateRoute,
    cart, addToCart, changeQty, removeFromCart,
    discountType, setDiscountType, discountValue, setDiscountValue, discountReason, setDiscountReason,
    surchargeValue, setSurchargeValue, surchargeReason, setSurchargeReason,
    paymentMethod, setPaymentMethod, submitting, handleSubmit,
    enableScheduling, setEnableScheduling, scheduledDate, setScheduledDate, scheduledTime, setScheduledTime,
    reset, productStoreKey, storeSlug,
  };
}
