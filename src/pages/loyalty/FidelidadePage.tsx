import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Badge, Button, Card, Input, PageShell, KpiGrid, EmptyState,
} from '../../components/ui';
import {
  UserGroupIcon, GiftIcon, Squares2X2Icon, TicketIcon,
} from '@heroicons/react/24/outline';
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
    <PageShell
      trilha={[{ rotulo: 'Cardápio' }, { rotulo: 'Fidelidade' }]}
      titulo="Fidelidade & Cupons"
      descricao="Cliente junta compras e ganha uma grátis. Quem volta pela recompensa volta mais vezes."
      acoes={
        <Badge tone={enabled ? 'success' : 'neutral'}>
          {enabled ? 'Programa ativo' : 'Programa inativo'}
        </Badge>
      }
    >
      {/* Desligado, a tela era um checkbox desmarcado dentro de um card
          cinza — não dizia o que o programa faz nem por que ligar, e ninguém
          liga o que não entende. Aqui ela vende antes de configurar. */}
      {!enabled && (
        <EmptyState
          variante="ativacao"
          estado="Programa inativo"
          titulo="Ative a fidelidade e transforme compra avulsa em hábito."
          descricao={`A cada ${threshold || '10'} itens comprados, o cliente ganha 1 grátis. O cartão anda sozinho a cada pedido pago — você não precisa marcar nada.`}
          acao={
            <Button onClick={() => setEnabled(true)}>
              Ativar programa
            </Button>
          }
          beneficios={[
            {
              titulo: 'Motivo para voltar',
              descricao: 'Quem está a 2 itens do grátis escolhe você e não o concorrente.',
            },
            {
              titulo: 'Pedido maior',
              descricao: 'Falta 1 para fechar o cartão? O cliente adiciona mais um item.',
            },
            {
              titulo: 'Sem trabalho no balcão',
              descricao: 'O progresso é contado no pedido pago, automaticamente.',
            },
            {
              titulo: 'Você escolhe o que pontua',
              descricao: 'Pode valer o cardápio inteiro ou só as categorias que te dão margem.',
            },
          ]}
        />
      )}

      {enabled && (
        <KpiGrid
          titulo="Como está o programa"
          itens={[
            {
              label: 'Participantes',
              value: accountsCount,
              definicao: 'Clientes com pelo menos um item já acumulado.',
              icone: <UserGroupIcon />,
              tone: 'brand',
            },
            {
              label: 'Meta do cartão',
              value: `${threshold} itens`,
              definicao: 'Quantos itens o cliente junta para ganhar 1 grátis.',
              icone: <GiftIcon />,
            },
            {
              label: 'Categorias que pontuam',
              value: qualifyingCategoryIds.length || 'Todas',
              definicao:
                qualifyingCategoryIds.length > 0
                  ? 'Só os itens destas categorias contam para o cartão.'
                  : 'Nenhuma categoria marcada: o cardápio inteiro pontua.',
              icone: <Squares2X2Icon />,
            },
            {
              label: 'Cupom de boas-vindas',
              value: createdCoupon || '—',
              definicao: createdCoupon
                ? 'Código gerado nesta sessão. Divulgue para a primeira compra.'
                : 'Ainda não criado. Serve para trazer o cliente na primeira vez.',
              icone: <TicketIcon />,
            },
          ]}
        />
      )}

      <Card title="Programa de fidelidade">
        <form className="space-y-4" onSubmit={handleSaveConfig}>
          {/* Era um checkbox nu escrito "Programa ativo". Um quadradinho não
              diz o que acontece ao marcar, e o cliente é quem sente o efeito —
              a linha explica antes de você clicar. */}
          <label className="flex cursor-pointer items-start justify-between gap-4 rounded border border-border-token bg-surface-2 p-3">
            <span className="min-w-0">
              <span className="block text-body font-semibold text-fg-token">
                Programa ativo
              </span>
              <span className="mt-0.5 block text-caption text-fg-muted-token">
                Ligado, o cartão do cliente anda a cada pedido pago e o grátis
                aparece sozinho no carrinho dele.
              </span>
            </span>
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--brand)]"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
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
          <EmptyState
            titulo="Ninguém no programa ainda"
            descricao={
              enabled
                ? 'O cliente entra sozinho no primeiro pedido pago. Avise no WhatsApp que agora tem cartão fidelidade.'
                : 'O programa está desligado — ligue acima para os clientes começarem a acumular.'
            }
          />
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
                      {/* "7/10" obriga a fazer a conta de cabeça, linha por
                          linha. A barra responde "quem está quase lá?" de
                          relance — que é a única pergunta que se faz aqui. */}
                      <div className="flex items-center gap-2">
                        <span
                          className="h-1.5 w-20 overflow-hidden rounded-pill bg-surface-2"
                          role="progressbar"
                          aria-valuenow={account.progress}
                          aria-valuemin={0}
                          aria-valuemax={Number(threshold) || 10}
                          aria-label={`${account.progress} de ${threshold} itens`}
                        >
                          <span
                            className="block h-full rounded-pill bg-brand"
                            style={{
                              width: `${Math.min(100, (account.progress / (Number(threshold) || 10)) * 100)}%`,
                            }}
                          />
                        </span>
                        <span className="text-caption tabular-nums text-fg-muted-token">
                          {account.progress}/{threshold}
                        </span>
                      </div>
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
    </PageShell>
  );
};

export default FidelidadePage;
