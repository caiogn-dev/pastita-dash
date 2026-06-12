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
import React, { useEffect, useRef, useState } from 'react';
import {
  XMarkIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { CustomerSearchInput } from '../crm/CustomerSearchInput';
import { ordersService } from '../../services/orders';
import { productsService } from '../../services/products';
import type { Product } from '../../services/products';
import type {
  CustomerSearchResult,
  UserAddress,
  DiscountType,
  RouteQuote,
} from '../../types/crm';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

type PaymentMethod = 'pix' | 'cash' | 'credit_card' | 'fiado';

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  credit_card: 'Cartão',
  fiado: 'Fiado',
};

const STEP_LABELS = [
  'Cliente',
  'Entrega',
  'Itens',
  'Ajustes',
  'Confirmar',
];

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

interface Customer extends CustomerSearchResult {
  phone_number_edited?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ── Step components ────────────────────────────────────────────────────────────

/** Step 1 */
function StepCliente({
  storeSlug,
  customer,
  onCustomerSelected,
  onCustomerCleared,
}: {
  storeSlug: string;
  customer: Customer | null;
  onCustomerSelected: (c: Customer) => void;
  onCustomerCleared: () => void;
}) {
  const isNewCustomer = customer && customer.id === '';
  const displayPhone = isNewCustomer
    ? (customer.phone_number_edited || customer.phone_number)
    : customer?.phone_number;

  const handlePhoneChange = (phone: string) => {
    if (customer && isNewCustomer) {
      onCustomerSelected({
        ...customer,
        phone_number_edited: phone,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-2">
          Buscar cliente
        </label>
        <CustomerSearchInput
          storeSlug={storeSlug}
          onSelect={onCustomerSelected}
          onClear={onCustomerCleared}
          selectedCustomer={customer}
        />
      </div>
      {!customer && (
        <p className="text-xs text-gray-400 dark:text-zinc-500">
          Digite nome ou telefone para buscar. Se não encontrar, um novo cliente
          será criado.
        </p>
      )}
      {isNewCustomer && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-3">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            Novo cliente — preencha o telefone
          </p>
          <input
            type="tel"
            value={customer.phone_number_edited || ''}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="(11) 99999-9999"
            className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
      )}
      {customer && customer.addresses.length > 0 && (
        <div className="rounded-xl border border-gray-100 dark:border-zinc-800 p-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-2">
            Endereços salvos
          </p>
          <div className="space-y-1">
            {customer.addresses.slice(0, 3).map((addr) => (
              <p key={addr.id} className="text-xs text-gray-600 dark:text-zinc-400">
                {addr.label}: {addr.street}, {addr.number} — {addr.neighborhood}, {addr.city}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Step 2 */
function StepEntrega({
  customer,
  deliveryMethod,
  setDeliveryMethod,
  selectedAddress,
  setSelectedAddress,
  freeAddressText,
  setFreeAddressText,
  routeQuote,
  calculatingRoute,
  onCalculateRoute,
}: {
  customer: Customer | null;
  deliveryMethod: 'delivery' | 'pickup';
  setDeliveryMethod: (m: 'delivery' | 'pickup') => void;
  selectedAddress: UserAddress | null;
  setSelectedAddress: (a: UserAddress | null) => void;
  freeAddressText: string;
  setFreeAddressText: (v: string) => void;
  routeQuote: RouteQuote | null;
  calculatingRoute: boolean;
  onCalculateRoute: (address: string) => void;
}) {
  const addresses = customer?.addresses ?? [];

  const handleSelectSaved = (addr: UserAddress) => {
    setSelectedAddress(addr);
    const full = `${addr.street}, ${addr.number} — ${addr.neighborhood}, ${addr.city}-${addr.state}`;
    setFreeAddressText(full);
    onCalculateRoute(full);
  };

  return (
    <div className="space-y-4">
      {/* Radio: Entrega / Retirada */}
      <div className="flex gap-2">
        {(['delivery', 'pickup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setDeliveryMethod(m)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              deliveryMethod === m
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
            }`}
          >
            {m === 'delivery' ? '🚚 Entrega' : '🏠 Retirada'}
          </button>
        ))}
      </div>

      {deliveryMethod === 'delivery' && (
        <>
          {/* Endereços salvos */}
          {addresses.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-2">
                Endereços do cliente
              </label>
              <div className="space-y-1.5">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSelectSaved(addr)}
                    className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-colors ${
                      selectedAddress?.id === addr.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="font-semibold">{addr.label}</span>: {addr.street}, {addr.number} — {addr.neighborhood}, {addr.city}
                    {addr.is_default && (
                      <span className="ml-2 text-[10px] bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 px-1.5 py-0.5 rounded-full">
                        padrão
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Endereço livre */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-2">
              Ou digitar endereço
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={freeAddressText}
                onChange={(e) => {
                  setFreeAddressText(e.target.value);
                  setSelectedAddress(null);
                }}
                placeholder="Rua das Flores, 123, Palmas-TO"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
              <button
                type="button"
                disabled={!freeAddressText.trim() || calculatingRoute}
                onClick={() => onCalculateRoute(freeAddressText.trim())}
                className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {calculatingRoute ? 'Calc...' : 'Calcular'}
              </button>
            </div>
          </div>

          {/* Resultado da rota */}
          {routeQuote && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Taxa de entrega
                </span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {fmt(routeQuote.fee)}
                </span>
              </div>
              {routeQuote.distance_km != null && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {Number(routeQuote.distance_km).toFixed(1)} km
                  {routeQuote.duration_minutes != null &&
                    ` · ~${Math.round(Number(routeQuote.duration_minutes))} min`}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {deliveryMethod === 'pickup' && (
        <p className="text-sm text-gray-500 dark:text-zinc-400 py-2">
          O cliente buscará o pedido na loja. Nenhuma taxa de entrega será cobrada.
        </p>
      )}
    </div>
  );
}

/** Step 3 */
function StepItens({
  storeId,
  cart,
  onAdd,
  onQtyChange,
  onRemove,
}: {
  storeId: string;
  cart: CartItem[];
  onAdd: (product: Product) => void;
  onQtyChange: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!storeId) {
      setLoadingProducts(false);
      return;
    }
    setLoadingProducts(true);
    productsService
      .getProducts({ store: storeId, is_active: true, page_size: 40, ordering: 'name' })
      .then((data) => setProducts(data.results || []))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [storeId]);

  const filteredProducts = products.filter((p) => {
    if (!search.trim()) return true;
    return p.name.toLowerCase().includes(search.toLowerCase());
  });

  const handleSearch = (q: string) => {
    clearTimeout(debounceRef.current);
    setSearch(q);
  };

  const cartProductIds = new Set(cart.map((c) => c.product.id));
  const subtotal = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar produto..."
          className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
        />
      </div>

      {/* Product list */}
      {loadingProducts ? (
        <p className="text-sm text-gray-400 text-center py-4">Carregando produtos...</p>
      ) : filteredProducts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          {search ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
        </p>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
          {filteredProducts.map((product) => {
            const inCart = cartProductIds.has(product.id);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => !inCart && onAdd(product)}
                disabled={inCart}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-sm transition-colors text-left ${
                  inCart
                    ? 'border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20 opacity-60 cursor-default'
                    : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300'
                }`}
              >
                <span className="truncate font-medium">{product.name}</span>
                <span className="flex-shrink-0 text-emerald-600 dark:text-emerald-400 font-semibold">
                  {inCart ? 'Adicionado' : fmt(product.price)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Cart */}
      {cart.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
            Carrinho
          </p>
          {cart.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {item.product.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {fmt(item.product.price)} × {item.quantity} ={' '}
                  <strong>{fmt(item.product.price * item.quantity)}</strong>
                </p>
              </div>
              {/* Qty controls */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    item.quantity > 1
                      ? onQtyChange(item.product.id, item.quantity - 1)
                      : onRemove(item.product.id)
                  }
                  className="flex items-center justify-center h-6 w-6 rounded-full border border-gray-200 dark:border-zinc-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <MinusIcon className="h-3 w-3" />
                </button>
                <span className="text-sm font-bold w-5 text-center text-gray-900 dark:text-white">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onQtyChange(item.product.id, item.quantity + 1)}
                  className="flex items-center justify-center h-6 w-6 rounded-full border border-gray-200 dark:border-zinc-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <PlusIcon className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(item.product.id)}
                  className="ml-1 text-red-400 hover:text-red-600 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center px-3 py-1">
            <span className="text-sm text-gray-600 dark:text-zinc-400">Subtotal</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {fmt(subtotal)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Step 4 */
function StepAjustes({
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  discountReason,
  setDiscountReason,
  surchargeValue,
  setSurchargeValue,
  surchargeReason,
  setSurchargeReason,
}: {
  discountType: DiscountType;
  setDiscountType: (v: DiscountType) => void;
  discountValue: string;
  setDiscountValue: (v: string) => void;
  discountReason: string;
  setDiscountReason: (v: string) => void;
  surchargeValue: string;
  setSurchargeValue: (v: string) => void;
  surchargeReason: string;
  setSurchargeReason: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Desconto */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
          Desconto (opcional)
        </p>
        <div className="flex gap-2">
          {(['percent', 'fixed'] as DiscountType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDiscountType(t)}
              className={`flex-1 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
                discountType === t
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              {t === 'percent' ? '% Percentual' : 'R$ Fixo'}
            </button>
          ))}
        </div>
        <input
          type="number"
          min="0"
          step="0.01"
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
          placeholder={discountType === 'percent' ? 'Ex: 10 (para 10%)' : 'Ex: 5.00'}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
        <input
          type="text"
          value={discountReason}
          onChange={(e) => setDiscountReason(e.target.value)}
          placeholder="Motivo do desconto"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* Acréscimo */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
          Acréscimo (opcional)
        </p>
        <input
          type="number"
          min="0"
          step="0.01"
          value={surchargeValue}
          onChange={(e) => setSurchargeValue(e.target.value)}
          placeholder="Ex: 2.50"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
        <input
          type="text"
          value={surchargeReason}
          onChange={(e) => setSurchargeReason(e.target.value)}
          placeholder="Motivo do acréscimo"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <p className="text-xs text-gray-400 dark:text-zinc-500">
        Desconto e acréscimo são aplicados ao total do pedido.
      </p>
    </div>
  );
}

/** Step 5 */
function StepConfirmar({
  cart,
  deliveryMethod,
  deliveryAddress,
  routeQuote,
  discountType,
  discountValue,
  surchargeValue,
  paymentMethod,
  setPaymentMethod,
  submitting,
  onSubmit,
}: {
  cart: CartItem[];
  deliveryMethod: 'delivery' | 'pickup';
  deliveryAddress: string;
  routeQuote: RouteQuote | null;
  discountType: DiscountType;
  discountValue: string;
  surchargeValue: string;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const subtotal = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);
  const deliveryFee = deliveryMethod === 'delivery' ? (routeQuote?.fee ?? 0) : 0;
  const surcharge = parseFloat(surchargeValue) || 0;
  const discountRaw = parseFloat(discountValue) || 0;
  const discountAmount =
    discountType === 'percent' ? subtotal * (discountRaw / 100) : discountRaw;
  const total = subtotal + deliveryFee + surcharge - discountAmount;

  return (
    <div className="space-y-4">
      {/* Summary rows */}
      <div className="rounded-xl border border-gray-100 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800 overflow-hidden">
        {cart.map((item) => (
          <div key={item.product.id} className="flex justify-between px-3 py-2 text-sm">
            <span className="text-gray-700 dark:text-zinc-300">
              {item.quantity}× {item.product.name}
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {fmt(item.product.price * item.quantity)}
            </span>
          </div>
        ))}
        <div className="flex justify-between px-3 py-2 text-sm">
          <span className="text-gray-500 dark:text-zinc-400">Subtotal</span>
          <span className="text-gray-900 dark:text-white">{fmt(subtotal)}</span>
        </div>
        {deliveryMethod === 'delivery' && (
          <div className="flex justify-between px-3 py-2 text-sm">
            <span className="text-gray-500 dark:text-zinc-400">
              Taxa de entrega
              {deliveryAddress && ` (${deliveryAddress.slice(0, 25)}...)`}
            </span>
            <span className="text-gray-900 dark:text-white">{fmt(deliveryFee)}</span>
          </div>
        )}
        {surcharge > 0 && (
          <div className="flex justify-between px-3 py-2 text-sm">
            <span className="text-gray-500 dark:text-zinc-400">Acréscimo</span>
            <span className="text-gray-900 dark:text-white">+ {fmt(surcharge)}</span>
          </div>
        )}
        {discountAmount > 0 && (
          <div className="flex justify-between px-3 py-2 text-sm">
            <span className="text-gray-500 dark:text-zinc-400">Desconto</span>
            <span className="text-emerald-600 dark:text-emerald-400">- {fmt(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between px-3 py-3 bg-gray-50 dark:bg-zinc-800/50">
          <span className="font-bold text-gray-900 dark:text-white">Total</span>
          <span className="font-bold text-lg text-primary-600 dark:text-primary-400">
            {fmt(total)}
          </span>
        </div>
      </div>

      {/* Payment method */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-2">
          Forma de pagamento
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPaymentMethod(m)}
              className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                paymentMethod === m
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              {PAYMENT_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || cart.length === 0}
        className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
      >
        {submitting ? 'Criando pedido...' : 'Criar Pedido'}
      </button>
    </div>
  );
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

      const subtotal = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);
      const discountRaw = parseFloat(discountValue) || 0;
      const discountAmount =
        discountType === 'percent' ? subtotal * (discountRaw / 100) : discountRaw;
      const surchargeAmount = parseFloat(surchargeValue) || 0;

      const reasonParts: string[] = [];
      if (discountAmount > 0 && discountReason.trim())
        reasonParts.push(`Desconto: ${discountReason.trim()}`);
      if (surchargeAmount > 0 && surchargeReason.trim())
        reasonParts.push(`Acréscimo: ${surchargeReason.trim()}`);

      await ordersService.createOrder({
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
        discount: discountAmount > 0 ? discountAmount : undefined,
        surcharge: surchargeAmount > 0 ? surchargeAmount : undefined,
        adjustment_reason: reasonParts.length > 0 ? reasonParts.join(' | ') : undefined,
      });

      toast.success('Pedido criado com sucesso!');
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
