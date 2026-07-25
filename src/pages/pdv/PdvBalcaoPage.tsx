import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  QrCodeIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  BuildingStorefrontIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Modal, ModalHeader, ModalBody, SearchInput } from '../../components/ui';
import { Loading } from '../../components/common';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import {
  getStores, getProducts, updateProduct, getCustomers,
  StoreProduct, StoreCustomer,
} from '../../services/storesApi';
import { ordersService } from '../../services/orders';
import type { Order } from '../../types';

const fmtMoney = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type PaymentChoice = 'cash' | 'pix' | 'credit_card' | 'debit_card';

const PAYMENT_LABELS: Record<PaymentChoice, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  credit_card: 'Crédito',
  debit_card: 'Débito',
};

/** Produto anotado com a loja dona — o balcão vende itens de todas as lojas do usuário. */
interface CatalogEntry {
  product: StoreProduct;
  storeSlug: string;
  storeName: string;
}

interface ComandaItem extends CatalogEntry {
  quantity: number;
}

/** Cliente vinculado à venda (opcional — sem ele a venda sai como "Cliente Balcão"). */
interface PdvCustomer {
  name: string;
  phone: string;
  email?: string;
}

/** Cobrança PIX pendente exibida no modal pós-venda (uma por loja). */
interface PixCharge {
  order: Order;
  storeSlug: string;
  storeName: string;
  paid: boolean;
}

/** Bipe curto de confirmação/erro via WebAudio (sem asset). */
const beep = (ok: boolean) => {
  try {
    const AudioCtx = window.AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = ok ? 1200 : 320;
    gain.gain.value = 0.08;
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.08 : 0.25));
    osc.onended = () => ctx.close();
  } catch {
    /* áudio é cortesia — nunca quebrar o fluxo por causa dele */
  }
};

const PdvBalcaoPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [storeCount, setStoreCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ComandaItem[]>([]);
  const [payment, setPayment] = useState<PaymentChoice>('cash');
  const [printReceipt, setPrintReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Código bipado que não bateu com nenhum produto → modal de vínculo
  const [unknownCode, setUnknownCode] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [linking, setLinking] = useState(false);

  // Cobranças PIX geradas na finalização (modal com QR + acompanhamento)
  const [pixCharges, setPixCharges] = useState<PixCharge[] | null>(null);

  // Busca manual — pra quando o produto não tem etiqueta ou o leitor não está à mão
  const [manualSearch, setManualSearch] = useState('');

  // Cliente vinculado (opcional) + modal de busca/cadastro
  const [customer, setCustomer] = useState<PdvCustomer | null>(null);
  const [customerModal, setCustomerModal] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [custResults, setCustResults] = useState<StoreCustomer[]>([]);
  const [custSearching, setCustSearching] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  const loadCatalog = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      // Todas as lojas ativas do usuário: o balcão físico vende produto de qualquer uma.
      let stores: { slug: string; name: string }[] = [];
      try {
        const res = await getStores();
        stores = (res.results || [])
          .filter((s) => s.status === 'active')
          .map((s) => ({ slug: s.slug, name: s.name }));
      } catch {
        /* sem lista de lojas → opera só com a loja da rota */
      }
      if (!stores.some((s) => s.slug === storeId)) {
        stores.push({ slug: storeId, name: storeId });
      }
      setStoreCount(stores.length);

      const perStore = await Promise.all(
        stores.map(async (s) => {
          const all: CatalogEntry[] = [];
          let page = 1;
          // pagina até esgotar — catálogo de loja é pequeno (centenas no máximo)
          for (;;) {
            const res = await getProducts({ store: s.slug, status: 'active', page, page_size: 200 });
            all.push(...res.results.map((product) => ({ product, storeSlug: s.slug, storeName: s.name })));
            if (!res.next) break;
            page += 1;
          }
          return all;
        }),
      );
      setCatalog(perStore.flat());
    } catch {
      toast.error('Erro ao carregar o catálogo');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const byCode = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    // Loja da rota entra por último: em código duplicado entre lojas, ela vence.
    const sorted = [...catalog].sort((a, b) => {
      if (a.storeSlug === storeId && b.storeSlug !== storeId) return 1;
      if (b.storeSlug === storeId && a.storeSlug !== storeId) return -1;
      return 0;
    });
    sorted.forEach((entry) => {
      if (entry.product.barcode) map.set(entry.product.barcode.trim(), entry);
      if (entry.product.sku) map.set(entry.product.sku.trim(), entry);
    });
    return map;
  }, [catalog, storeId]);

  const addEntry = useCallback((entry: CatalogEntry) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product.id === entry.product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { ...entry, quantity: 1 }];
    });
  }, []);

  const handleScan = useCallback((code: string) => {
    // gatilho segurado dispara leitura dupla — ignora repetição em <300ms
    const now = Date.now();
    if (lastScanRef.current.code === code && now - lastScanRef.current.at < 300) return;
    lastScanRef.current = { code, at: now };

    const entry = byCode.get(code.trim());
    if (entry) {
      beep(true);
      addEntry(entry);
    } else {
      beep(false);
      setLinkSearch('');
      setUnknownCode(code);
    }
  }, [byCode, addEntry]);

  useBarcodeScanner(handleScan, {
    disabled: unknownCode !== null || submitting || pixCharges !== null || customerModal,
  });

  // Busca de clientes (todas as lojas do usuário) com debounce
  useEffect(() => {
    if (!customerModal) return undefined;
    const term = custSearch.trim();
    if (term.length < 2) {
      setCustResults([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      setCustSearching(true);
      try {
        const res = await getCustomers({ search: term, page_size: 8 });
        setCustResults(res.results);
      } catch {
        setCustResults([]);
      } finally {
        setCustSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [custSearch, customerModal]);

  const pickCustomer = (c: StoreCustomer) => {
    const email = c.user_email && !c.user_email.endsWith('local.invalid') ? c.user_email : undefined;
    setCustomer({ name: c.user_name || 'Cliente', phone: c.phone || c.whatsapp || '00000000000', email });
    setCustomerModal(false);
    setCustSearch('');
  };

  const saveNewCustomer = () => {
    const name = newName.trim();
    const digits = newPhone.replace(/\D/g, '');
    if (!name || digits.length < 10) {
      toast.error('Preencha nome e um WhatsApp válido (com DDD)');
      return;
    }
    setCustomer({ name, phone: digits });
    setCustomerModal(false);
    setNewName('');
    setNewPhone('');
    setCustSearch('');
  };

  const changeQty = (productId: string, delta: number) => {
    setItems((prev) => prev
      .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
      .filter((i) => i.quantity > 0));
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const total = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);

  /** Itens agrupados por loja, na ordem em que cada loja apareceu na comanda. */
  const groups = useMemo(() => {
    const order: string[] = [];
    const byStore = new Map<string, { storeSlug: string; storeName: string; items: ComandaItem[] }>();
    items.forEach((i) => {
      if (!byStore.has(i.storeSlug)) {
        order.push(i.storeSlug);
        byStore.set(i.storeSlug, { storeSlug: i.storeSlug, storeName: i.storeName, items: [] });
      }
      byStore.get(i.storeSlug)!.items.push(i);
    });
    return order.map((slug) => byStore.get(slug)!);
  }, [items]);

  const handleLinkProduct = async (entry: CatalogEntry) => {
    if (!unknownCode || linking) return;
    setLinking(true);
    try {
      await updateProduct(entry.product.id, { barcode: unknownCode });
      setCatalog((prev) => prev.map((c) => (
        c.product.id === entry.product.id
          ? { ...c, product: { ...c.product, barcode: unknownCode } }
          : c
      )));
      addEntry(entry);
      toast.success(`Código vinculado a ${entry.product.name}`);
      setUnknownCode(null);
    } catch {
      toast.error('Erro ao vincular o código');
    } finally {
      setLinking(false);
    }
  };

  const handleSubmit = async () => {
    if (items.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      // Uma venda física pode misturar lojas → um pedido POR loja, e cada loja
      // enxerga só a sua parte nos relatórios.
      const created: PixCharge[] = [];
      const failedSlugs: string[] = [];
      for (const g of groups) {
        try {
          const order = await ordersService.createOrder({
            store: g.storeSlug,
            // Cliente vinculado: o backend cria/atualiza o cadastro dele em cada
            // loja (histórico e CRM). Sem vínculo, sai como venda anônima.
            customer_name: customer?.name ?? 'Cliente Balcão',
            customer_phone: customer?.phone ?? '00000000000',
            ...(customer?.email ? { customer_email: customer.email } : {}),
            delivery_method: 'pickup',
            payment_method: payment,
            items: g.items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
            suppress_notifications: true,
            ...(printReceipt ? { print_receipt: true } : {}),
          });

          // Balcão: dinheiro/cartão são recebidos na hora — marca pago direto.
          // PIX fica pendente até o cliente pagar o QR (modal acompanha).
          if (payment !== 'pix') {
            try {
              await ordersService.markPaid(order.id, g.storeSlug);
            } catch {
              toast.error(`${g.storeName}: venda criada, mas não consegui marcar como paga — marque no pedido.`);
            }
          }
          created.push({ order, storeSlug: g.storeSlug, storeName: g.storeName, paid: false });
        } catch {
          failedSlugs.push(g.storeSlug);
          toast.error(`Erro ao registrar a venda de ${g.storeName}`);
        }
      }

      // Mantém na comanda só o que falhou (dá pra tentar de novo).
      setItems((prev) => prev.filter((i) => failedSlugs.includes(i.storeSlug)));

      if (created.length > 0) {
        if (payment === 'pix') {
          setPixCharges(created);
        } else {
          beep(true);
          toast.success(`Venda de ${fmtMoney(created.reduce((s, c) => s + Number(c.order.total), 0))} registrada!`);
        }
        // estoque mudou no servidor → recarrega catálogo em background
        loadCatalog();
        setCustomer(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Acompanhamento das cobranças PIX (polling até todas pagarem) ──────────
  useEffect(() => {
    if (!pixCharges || pixCharges.every((c) => c.paid)) return undefined;
    const timer = setInterval(async () => {
      const pending = pixCharges.filter((c) => !c.paid);
      const updates = await Promise.all(pending.map(async (c) => {
        try {
          const fresh = await ordersService.getOrder(c.order.id, c.storeSlug);
          return { id: c.order.id, paid: fresh.payment_status === 'paid' };
        } catch {
          return { id: c.order.id, paid: false };
        }
      }));
      setPixCharges((prev) => {
        if (!prev) return prev;
        const next = prev.map((c) => {
          const u = updates.find((x) => x.id === c.order.id);
          return u && u.paid ? { ...c, paid: true } : c;
        });
        if (next.every((c) => c.paid) && !prev.every((c) => c.paid)) {
          beep(true);
          toast.success('PIX pago! Venda concluída.');
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [pixCharges]);

  const copyPix = async (code?: string) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Código PIX copiado');
    } catch {
      toast.error('Não consegui copiar — selecione o código manualmente');
    }
  };

  const manualMatches = useMemo(() => {
    const term = manualSearch.trim().toLowerCase();
    if (term.length < 2) return [];
    return catalog
      .filter((c) => c.product.name.toLowerCase().includes(term))
      .slice(0, 6);
  }, [catalog, manualSearch]);

  const addManual = (entry: CatalogEntry) => {
    beep(true);
    addEntry(entry);
    setManualSearch('');
  };

  const linkCandidates = useMemo(() => {
    const term = linkSearch.trim().toLowerCase();
    const base = term
      ? catalog.filter((c) => c.product.name.toLowerCase().includes(term))
      : catalog;
    return base.slice(0, 8);
  }, [catalog, linkSearch]);

  if (loading) return <Loading />;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 md:space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <QrCodeIcon className="w-6 h-6" /> PDV Balcão
          </h1>
          <p className="text-sm opacity-70">
            Bipe um produto com o leitor — não precisa clicar em nada antes.
            {storeCount > 1 && ` Reconhece produtos das suas ${storeCount} lojas.`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm opacity-70">{items.reduce((s, i) => s + i.quantity, 0)} itens</div>
          <div className="text-3xl font-bold tabular-nums" data-testid="pdv-total">{fmtMoney(total)}</div>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="relative mb-3">
          <SearchInput
            placeholder="Adicionar sem bipar — busque o produto por nome…"
            value={manualSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualSearch(e.target.value)}
            data-testid="pdv-busca-manual"
          />
          {manualMatches.length > 0 && (
            <ul className="absolute z-10 left-0 right-0 mt-1 rounded border border-black/15 dark:border-white/15 bg-white dark:bg-neutral-900 shadow-lg divide-y divide-black/10 dark:divide-white/10 max-h-64 overflow-y-auto">
              {manualMatches.map((c) => (
                <li key={c.product.id}>
                  <button
                    type="button"
                    onClick={() => addManual(c)}
                    className="w-full flex items-center justify-between gap-2 py-2.5 px-3 text-left hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.product.name}</span>
                      {storeCount > 1 && <span className="block text-xs opacity-60">{c.storeName}</span>}
                    </span>
                    <span className="text-sm opacity-70 shrink-0">{fmtMoney(Number(c.product.price))}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {items.length === 0 ? (
          <div className="py-14 text-center opacity-60">
            <QrCodeIcon className="w-12 h-12 mx-auto mb-3" />
            Comanda vazia — bipe o primeiro produto.
          </div>
        ) : (
          <div className="space-y-5" data-testid="pdv-comanda">
            {groups.map((g) => (
              <div key={g.storeSlug}>
                {groups.length > 1 && (
                  <div className="flex items-center justify-between gap-2 mb-1 pb-2 border-b border-black/10 dark:border-white/10">
                    <div className="flex items-center gap-1.5 text-sm font-semibold opacity-80">
                      <BuildingStorefrontIcon className="w-4 h-4" /> {g.storeName}
                    </div>
                    <div className="text-sm opacity-70">
                      {fmtMoney(g.items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0))}
                    </div>
                  </div>
                )}
                <ul className="divide-y divide-black/10 dark:divide-white/10">
                  {g.items.map((i) => (
                    <li key={i.product.id} className="flex items-center gap-3 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{i.product.name}</div>
                        <div className="text-sm opacity-70">{fmtMoney(Number(i.product.price))} un.</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" aria-label={`Diminuir ${i.product.name}`} onClick={() => changeQty(i.product.id, -1)}>
                          <MinusIcon className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-semibold tabular-nums">{i.quantity}</span>
                        <Button variant="ghost" size="sm" aria-label={`Aumentar ${i.product.name}`} onClick={() => changeQty(i.product.id, 1)}>
                          <PlusIcon className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="w-24 text-right font-semibold tabular-nums">
                        {fmtMoney(Number(i.product.price) * i.quantity)}
                      </div>
                      <Button variant="ghost" size="sm" aria-label={`Remover ${i.product.name}`} onClick={() => removeItem(i.product.id)}>
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 mb-4" data-testid="pdv-cliente">
          {customer ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-black/5 dark:bg-white/10 rounded-full pl-2.5 pr-1 py-1">
                <UserIcon className="w-4 h-4" />
                {customer.name}
                <span className="opacity-60 font-normal">· {customer.phone}</span>
                <button
                  type="button"
                  aria-label="Remover cliente"
                  className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                  onClick={() => setCustomer(null)}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </span>
              <span className="text-xs opacity-60">a venda entra no histórico dele</span>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={() => setCustomerModal(true)}>
                <UserIcon className="w-4 h-4 mr-1.5" /> Vincular cliente
              </Button>
              <span className="text-xs opacity-60">opcional — sem vínculo sai como venda anônima</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {(Object.keys(PAYMENT_LABELS) as PaymentChoice[]).map((key) => (
            <Button
              key={key}
              variant={payment === key ? 'primary' : 'secondary'}
              onClick={() => setPayment(key)}
            >
              {PAYMENT_LABELS[key]}
            </Button>
          ))}
          <label className="flex items-center gap-1.5 text-sm ml-auto">
            <input
              type="checkbox"
              checked={printReceipt}
              onChange={(e) => setPrintReceipt(e.target.checked)}
              data-testid="pdv-cupom"
            />
            Imprimir cupom
          </label>
          {groups.length > 1 && (
            <span className="text-xs opacity-60 w-full text-right">
              {groups.length} lojas na comanda → {groups.length} pedidos (um por loja)
            </span>
          )}
        </div>
        <Button
          className="w-full"
          size="lg"
          disabled={items.length === 0 || submitting}
          onClick={handleSubmit}
          data-testid="pdv-finalizar"
        >
          {submitting ? 'Registrando…' : `Finalizar venda — ${fmtMoney(total)}`}
        </Button>
      </Card>

      {/* Modal de vínculo de código desconhecido */}
      <Modal isOpen={unknownCode !== null} onClose={() => setUnknownCode(null)}>
        <ModalHeader title="Código não cadastrado" />
        <ModalBody>
          <p className="text-sm mb-3">
            O código <span className="font-mono font-semibold">{unknownCode}</span> não
            está vinculado a nenhum produto. Escolha o produto pra vincular — o próximo
            bipe já entra direto.
          </p>
          <SearchInput
            autoFocus
            placeholder="Buscar produto por nome…"
            value={linkSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkSearch(e.target.value)}
          />
          <ul className="mt-3 divide-y divide-black/10 dark:divide-white/10 max-h-64 overflow-y-auto">
            {linkCandidates.map((c) => (
              <li key={c.product.id}>
                <button
                  type="button"
                  disabled={linking}
                  onClick={() => handleLinkProduct(c)}
                  className="w-full flex items-center justify-between gap-2 py-2.5 px-2 text-left hover:bg-black/5 dark:hover:bg-white/5 rounded"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{c.product.name}</span>
                    {storeCount > 1 && (
                      <span className="block text-xs opacity-60">{c.storeName}</span>
                    )}
                  </span>
                  <span className="text-sm opacity-70 shrink-0">
                    {fmtMoney(Number(c.product.price))}{c.product.barcode ? ' · já tem código' : ''}
                  </span>
                </button>
              </li>
            ))}
            {linkCandidates.length === 0 && (
              <li className="py-4 text-center text-sm opacity-60">Nenhum produto encontrado</li>
            )}
          </ul>
        </ModalBody>
      </Modal>

      {/* Modal de vínculo de cliente: busca no cadastro ou cria na hora */}
      <Modal isOpen={customerModal} onClose={() => setCustomerModal(false)}>
        <ModalHeader title="Vincular cliente" />
        <ModalBody>
          <p className="text-sm mb-3 opacity-80">
            Busque quem já comprou em qualquer uma das suas lojas, ou cadastre na hora.
            A venda entra no histórico e no CRM da loja de cada produto.
          </p>
          <SearchInput
            autoFocus
            placeholder="Buscar por nome ou telefone…"
            value={custSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustSearch(e.target.value)}
          />
          <ul className="mt-3 divide-y divide-black/10 dark:divide-white/10 max-h-56 overflow-y-auto">
            {custResults.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => pickCustomer(c)}
                  className="w-full flex items-center justify-between gap-2 py-2.5 px-2 text-left hover:bg-black/5 dark:hover:bg-white/5 rounded"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.user_name || 'Sem nome'}</span>
                    <span className="block text-xs opacity-60">{c.phone || c.whatsapp || 'sem telefone'}</span>
                  </span>
                  <span className="text-xs opacity-60 shrink-0">
                    {c.total_orders > 0 ? `${c.total_orders} pedidos` : 'novo'}
                  </span>
                </button>
              </li>
            ))}
            {custSearch.trim().length >= 2 && !custSearching && custResults.length === 0 && (
              <li className="py-3 text-center text-sm opacity-60">Ninguém encontrado — cadastre abaixo</li>
            )}
          </ul>
          <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Cadastrar novo</p>
            <input
              className="w-full rounded border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
              placeholder="Nome"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              aria-label="Nome do cliente"
            />
            <input
              className="w-full rounded border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
              placeholder="WhatsApp com DDD (ex.: 63992001122)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              inputMode="tel"
              aria-label="WhatsApp do cliente"
            />
            <Button className="w-full" onClick={saveNewCustomer}>Usar este cliente</Button>
          </div>
        </ModalBody>
      </Modal>

      {/* Modal de cobrança PIX: QR na tela + acompanhamento até pagar */}
      <Modal isOpen={pixCharges !== null} onClose={() => setPixCharges(null)}>
        <ModalHeader title="Cobrança PIX" />
        <ModalBody>
          <p className="text-sm mb-4 opacity-80">
            Mostre o QR pro cliente pagar. O status atualiza sozinho quando o PIX cair.
          </p>
          <div className="space-y-5" data-testid="pdv-pix-charges">
            {(pixCharges ?? []).map((c) => (
              <div key={c.order.id} className="border border-black/10 dark:border-white/10 rounded p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="font-semibold">
                    {c.storeName}
                    <span className="opacity-70 font-normal"> — {fmtMoney(Number(c.order.total))}</span>
                  </div>
                  {c.paid ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600 dark:text-green-400">
                      <CheckCircleIcon className="w-5 h-5" /> Pago
                    </span>
                  ) : (
                    <span className="text-sm opacity-70">Aguardando…</span>
                  )}
                </div>
                {!c.paid && c.order.pix_qr_code && (
                  <img
                    src={`data:image/png;base64,${c.order.pix_qr_code}`}
                    alt={`QR Code PIX de ${c.storeName}`}
                    className="w-52 h-52 mx-auto mb-3 rounded bg-white p-2"
                  />
                )}
                {!c.paid && c.order.pix_code && (
                  <Button variant="secondary" className="w-full" onClick={() => copyPix(c.order.pix_code)}>
                    <ClipboardDocumentIcon className="w-4 h-4 mr-1.5" /> Copiar código PIX
                  </Button>
                )}
                {!c.paid && !c.order.pix_code && (
                  <p className="text-sm text-red-500">
                    O QR não foi gerado ({String((c.order as { payment_error?: string }).payment_error || 'erro no provedor')}).
                    Abra o pedido {c.order.order_number} e use “Gerar cobrança”.
                  </p>
                )}
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            className="w-full mt-4"
            onClick={() => setPixCharges(null)}
          >
            {pixCharges?.every((c) => c.paid) ? 'Concluir' : 'Fechar (pedido fica aguardando pagamento)'}
          </Button>
        </ModalBody>
      </Modal>
    </div>
  );
};

export default PdvBalcaoPage;
