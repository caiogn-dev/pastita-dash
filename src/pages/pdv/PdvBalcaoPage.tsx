import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  QrCodeIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Modal, ModalHeader, ModalBody, SearchInput } from '../../components/ui';
import { Loading } from '../../components/common';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { getProducts, updateProduct, StoreProduct } from '../../services/storesApi';
import { ordersService } from '../../services/orders';

const fmtMoney = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type PaymentChoice = 'cash' | 'pix' | 'credit_card' | 'debit_card';

const PAYMENT_LABELS: Record<PaymentChoice, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  credit_card: 'Crédito',
  debit_card: 'Débito',
};

interface ComandaItem {
  product: StoreProduct;
  quantity: number;
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
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ComandaItem[]>([]);
  const [payment, setPayment] = useState<PaymentChoice>('cash');
  const [submitting, setSubmitting] = useState(false);

  // Código bipado que não bateu com nenhum produto → modal de vínculo
  const [unknownCode, setUnknownCode] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [linking, setLinking] = useState(false);

  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  const loadProducts = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const all: StoreProduct[] = [];
      let page = 1;
      // pagina até esgotar — catálogo de loja é pequeno (centenas no máximo)
      for (;;) {
        const res = await getProducts({ store: storeId, status: 'active', page, page_size: 200 });
        all.push(...res.results);
        if (!res.next) break;
        page += 1;
      }
      setProducts(all);
    } catch {
      toast.error('Erro ao carregar o catálogo');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const byCode = useMemo(() => {
    const map = new Map<string, StoreProduct>();
    products.forEach((p) => {
      if (p.barcode) map.set(p.barcode.trim(), p);
      if (p.sku) map.set(p.sku.trim(), p);
    });
    return map;
  }, [products]);

  const addProduct = useCallback((product: StoreProduct) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const handleScan = useCallback((code: string) => {
    // gatilho segurado dispara leitura dupla — ignora repetição em <300ms
    const now = Date.now();
    if (lastScanRef.current.code === code && now - lastScanRef.current.at < 300) return;
    lastScanRef.current = { code, at: now };

    const product = byCode.get(code.trim());
    if (product) {
      beep(true);
      addProduct(product);
    } else {
      beep(false);
      setLinkSearch('');
      setUnknownCode(code);
    }
  }, [byCode, addProduct]);

  useBarcodeScanner(handleScan, { disabled: unknownCode !== null || submitting });

  const changeQty = (productId: string, delta: number) => {
    setItems((prev) => prev
      .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
      .filter((i) => i.quantity > 0));
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  const handleLinkProduct = async (product: StoreProduct) => {
    if (!unknownCode || linking) return;
    setLinking(true);
    try {
      await updateProduct(product.id, { barcode: unknownCode });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, barcode: unknownCode } : p)));
      addProduct(product);
      toast.success(`Código vinculado a ${product.name}`);
      setUnknownCode(null);
    } catch {
      toast.error('Erro ao vincular o código');
    } finally {
      setLinking(false);
    }
  };

  const handleSubmit = async () => {
    if (!storeId || items.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const created = await ordersService.createOrder({
        store: storeId,
        customer_name: 'Cliente Balcão',
        customer_phone: '00000000000',
        delivery_method: 'pickup',
        payment_method: payment === 'debit_card' ? 'debit_card' : payment,
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        suppress_notifications: true,
      });

      // Venda de balcão: pagamento acontece na hora — marca pago direto,
      // exceto PIX (o QR gerado precisa ser pago primeiro).
      if (payment !== 'pix') {
        try {
          await ordersService.markPaid(created.id, storeId);
        } catch {
          toast.error('Venda criada, mas não consegui marcar como paga — marque no pedido.');
        }
      }

      const pixCode = (created as { pix_code?: string }).pix_code || '';
      if (payment === 'pix' && pixCode) {
        try {
          await navigator.clipboard.writeText(pixCode);
          toast.success('Venda registrada! Código PIX copiado.', { duration: 6000 });
        } catch {
          toast.success('Venda registrada! PIX disponível no pedido.', { duration: 6000 });
        }
      } else {
        toast.success(`Venda de ${fmtMoney(total)} registrada!`);
      }
      setItems([]);
      // estoque mudou no servidor → recarrega catálogo em background
      loadProducts();
    } catch {
      toast.error('Erro ao registrar a venda');
    } finally {
      setSubmitting(false);
    }
  };

  const linkCandidates = useMemo(() => {
    const term = linkSearch.trim().toLowerCase();
    const base = term
      ? products.filter((p) => p.name.toLowerCase().includes(term))
      : products;
    return base.slice(0, 8);
  }, [products, linkSearch]);

  if (loading) return <Loading />;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <QrCodeIcon className="w-6 h-6" /> PDV Balcão
          </h1>
          <p className="text-sm opacity-70">
            Bipe um produto com o leitor — não precisa clicar em nada antes.
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm opacity-70">{items.length} itens</div>
          <div className="text-2xl font-bold" data-testid="pdv-total">{fmtMoney(total)}</div>
        </div>
      </div>

      <Card>
        {items.length === 0 ? (
          <div className="py-16 text-center opacity-60">
            <QrCodeIcon className="w-12 h-12 mx-auto mb-3" />
            Comanda vazia — bipe o primeiro produto.
          </div>
        ) : (
          <ul className="divide-y divide-black/10 dark:divide-white/10" data-testid="pdv-comanda">
            {items.map((i) => (
              <li key={i.product.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{i.product.name}</div>
                  <div className="text-sm opacity-70">{fmtMoney(i.product.price)} un.</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" aria-label={`Diminuir ${i.product.name}`} onClick={() => changeQty(i.product.id, -1)}>
                    <MinusIcon className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold">{i.quantity}</span>
                  <Button variant="ghost" size="sm" aria-label={`Aumentar ${i.product.name}`} onClick={() => changeQty(i.product.id, 1)}>
                    <PlusIcon className="w-4 h-4" />
                  </Button>
                </div>
                <div className="w-24 text-right font-semibold">{fmtMoney(i.product.price * i.quantity)}</div>
                <Button variant="ghost" size="sm" aria-label={`Remover ${i.product.name}`} onClick={() => removeItem(i.product.id)}>
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
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
            {linkCandidates.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={linking}
                  onClick={() => handleLinkProduct(p)}
                  className="w-full flex items-center justify-between py-2 px-1 text-left hover:bg-black/5 dark:hover:bg-white/5 rounded"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-sm opacity-70 ml-2 shrink-0">
                    {fmtMoney(p.price)}{p.barcode ? ' · já tem código' : ''}
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
    </div>
  );
};

export default PdvBalcaoPage;
