import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, Button, Card, Input } from '../../components/ui';
import { Loading } from '../../components/common';
import { couponsService } from '../../services/coupons';
import { loyaltyService, LoyaltyAccountRow } from '../../services/loyalty';
import { getStores, updateStore, getCategories, Store, StoreCategory } from '../../services/storesApi';

const FidelidadePage: React.FC = () => {
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();

  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [storeError, setStoreError] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState('10');
  const [qualifyingCategoryIds, setQualifyingCategoryIds] = useState<string[]>([]);
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
  const [saving, setSaving] = useState(false);

  const [pct, setPct] = useState('');
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [createdCoupon, setCreatedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<LoyaltyAccountRow[]>([]);
  const [accountsCount, setAccountsCount] = useState(0);
  const [accountsPage, setAccountsPage] = useState(1);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingStore(true);
    setStoreError(null);
    getStores()
      .then((res) => {
        if (!active) return;
        const match = res.results.find((s) => s.id === routeStoreId || s.slug === routeStoreId);
        if (!match) {
          setStoreError('Loja não encontrada.');
          return;
        }
        setStore(match);
        const metadata = (match.metadata as Record<string, unknown>) || {};
        setEnabled(metadata.loyalty_enabled !== false);
        setThreshold(String(metadata.loyalty_salads_required ?? 10));
        const qualifyingCategories = metadata.loyalty_qualifying_categories;
        setQualifyingCategoryIds(Array.isArray(qualifyingCategories) ? qualifyingCategories : []);
      })
      .catch(() => {
        if (active) setStoreError('Não foi possível carregar a loja.');
      })
      .finally(() => {
        if (active) setLoadingStore(false);
      });
    return () => {
      active = false;
    };
  }, [routeStoreId]);

  const storeIdentifier = useMemo(() => store?.slug || store?.id, [store]);

  // Categorias da loja alimentam a seleção de categorias que pontuam no fidelidade
  useEffect(() => {
    if (!store?.id) return;
    getCategories(store.id)
      .then((res) => setStoreCategories(res.results))
      .catch(() => setStoreCategories([]));
  }, [store?.id]);

  const toggleQualifyingCategory = (id: string) => {
    setQualifyingCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (!storeIdentifier) return;
    let active = true;
    setLoadingAccounts(true);
    setAccountsError(null);
    loyaltyService
      .getAccounts(storeIdentifier, accountsPage)
      .then((res) => {
        if (!active) return;
        setAccounts((prev) => (accountsPage === 1 ? res.results : [...prev, ...res.results]));
        setAccountsCount(res.count);
      })
      .catch(() => {
        if (active) setAccountsError('Não foi possível carregar os clientes do programa.');
      })
      .finally(() => {
        if (active) setLoadingAccounts(false);
      });
    return () => {
      active = false;
    };
  }, [storeIdentifier, accountsPage]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setSaving(true);
    try {
      const currentMetadata = (store.metadata as Record<string, unknown>) || {};
      const updated = await updateStore(store.id, {
        metadata: {
          ...currentMetadata,
          loyalty_enabled: enabled,
          loyalty_salads_required: Number(threshold),
          loyalty_qualifying_categories: qualifyingCategoryIds,
        },
      });
      setStore(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!store) return;
    setCreatingCoupon(true);
    setCouponError(null);
    setCreatedCoupon(null);
    try {
      const percentValue = Number(pct) || 10;
      const coupon = await couponsService.createCoupon({
        store: store.id,
        code: `BEMVINDO${percentValue}`,
        description: 'Cupom de boas-vindas',
        discount_type: 'percentage',
        discount_value: percentValue,
        first_order_only: true,
        is_active: true,
        is_featured: true,
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      setCreatedCoupon(coupon.code);
    } catch {
      setCouponError('Não foi possível criar o cupom de boas-vindas.');
    } finally {
      setCreatingCoupon(false);
    }
  };

  if (loadingStore) {
    return <Loading />;
  }

  if (storeError || !store) {
    return <p className="text-fg-muted-token">{storeError || 'Loja não encontrada.'}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-fg-token">Fidelidade & Cupons</h1>
        <p className="text-sm text-fg-muted-token">Programa &quot;10 ganhe 1&quot; e cupom de boas-vindas.</p>
      </div>

      <Card title="Programa de fidelidade">
        <form className="space-y-4" onSubmit={handleSaveConfig}>
          <label className="flex items-center gap-2 text-sm text-fg-token">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Programa ativo
          </label>

          <Input
            id="loyalty-threshold"
            label="Itens para ganhar 1 grátis"
            type="number"
            min={1}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />

          <div>
            <p className="block text-sm font-medium text-fg-token mb-1">Categorias que pontuam</p>
            {storeCategories.length > 0 ? (
              <div className="space-y-1.5 rounded-md border border-border-token bg-surface p-3">
                {storeCategories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-2 text-sm text-fg-token"
                  >
                    <input
                      type="checkbox"
                      checked={qualifyingCategoryIds.includes(cat.id)}
                      onChange={() => toggleQualifyingCategory(cat.id)}
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-fg-muted-token">Nenhuma categoria cadastrada nesta loja.</p>
            )}
            <p className="text-xs text-fg-muted-token mt-1">
              Nenhuma marcada = todos os itens do cardápio contam
            </p>
          </div>

          <Button type="submit" isLoading={saving}>
            Salvar
          </Button>
        </form>
      </Card>

      <Card title="Cupom de boas-vindas">
        <div className="space-y-4">
          <Input
            id="loyalty-coupon-pct"
            label="Desconto (%)"
            type="number"
            min={1}
            max={100}
            placeholder="10"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
          />
          <Button onClick={handleCreateCoupon} isLoading={creatingCoupon}>
            Criar cupom de boas-vindas
          </Button>
          {createdCoupon && (
            <Badge tone="success">Cupom criado: {createdCoupon}</Badge>
          )}
          {couponError && <p className="text-sm text-fg-muted-token">{couponError}</p>}
          <p className="text-xs text-fg-muted-token">
            Banner no cardápio disponível nos planos Pro e Premium.
          </p>
        </div>
      </Card>

      <Card title="Clientes no programa">
        {loadingAccounts && accounts.length === 0 ? (
          <Loading />
        ) : accountsError ? (
          <p className="text-sm text-fg-muted-token">{accountsError}</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-fg-muted-token">Nenhum cliente no programa ainda.</p>
        ) : (
          <div className="space-y-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-fg-muted-token">
                  <th className="py-1 font-medium">Nome</th>
                  <th className="py-1 font-medium">E-mail</th>
                  <th className="py-1 font-medium">Progresso</th>
                  <th className="py-1 font-medium">Resgates</th>
                  <th className="py-1 font-medium">Grátis disponíveis</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.user_id} className="border-t border-border-token text-fg-token">
                    <td className="py-2">{account.display_name}</td>
                    <td className="py-2">{account.email}</td>
                    <td className="py-2">
                      {account.progress}/{threshold}
                    </td>
                    <td className="py-2">{account.redeemed_count}</td>
                    <td className="py-2">
                      {account.available_rewards > 0 ? (
                        <Badge tone="success">{account.available_rewards}</Badge>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {accountsCount > accounts.length && (
              <Button
                variant="outline"
                onClick={() => setAccountsPage((p) => p + 1)}
                isLoading={loadingAccounts}
              >
                Carregar mais
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default FidelidadePage;
