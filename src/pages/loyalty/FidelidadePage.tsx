import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Badge, Button, Card, Input, PageShell, KpiGrid, EmptyState,
} from '../../components/ui';
import {
  UserGroupIcon, GiftIcon, FireIcon, CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { Loading } from '../../components/common';
import { couponsService } from '../../services/coupons';
import { loyaltyService, LoyaltyAccountRow, LoyaltyResumo } from '../../services/loyalty';
import { getStores, updateStore, getCategories, Store, StoreCategory } from '../../services/storesApi';

/**
 * Extrai a mensagem que o servidor mandou, em vez de descartá-la.
 *
 * O DRF devolve erro em três formatos conforme onde a validação falhou:
 * `{detail}`, `{campo: [msgs]}` ou lista solta. Mostrar "não foi possível"
 * para os três joga fora a única informação que resolveria o problema do
 * usuário — e nos manda investigar produção para descobrir algo que já estava
 * escrito na resposta.
 */
function mensagemDoServidor(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === 'string') return data;
  const d = data as Record<string, unknown>;
  if (typeof d.detail === 'string') return d.detail;
  for (const valor of Object.values(d)) {
    if (typeof valor === 'string') return valor;
    if (Array.isArray(valor) && typeof valor[0] === 'string') return valor[0];
  }
  return null;
}

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
  const [resumo, setResumo] = useState<LoyaltyResumo | null>(null);

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
      // Resumo só na primeira página: é agregado do banco inteiro, pedi-lo a
      // cada "carregar mais" repetiria a mesma conta.
      .getAccounts(storeIdentifier, accountsPage, accountsPage === 1)
      .then((res) => {
        if (!active) return;
        setAccounts((prev) => (accountsPage === 1 ? res.results : [...prev, ...res.results]));
        setAccountsCount(res.count);
        if (res.resumo) setResumo(res.resumo);
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
    } catch (e) {
      // O `catch {}` mudo dizia "não foi possível" para qualquer causa. O caso
      // mais comum é o código já existir — BEMVINDO10 estava criado desde
      // julho e a tela insistia num erro genérico, como se fosse falha nossa.
      // Saber que já existe muda a ação: você vai divulgar, não recriar.
      const resp = (e as { response?: { status?: number; data?: unknown } })?.response;
      const codigo = `BEMVINDO${Number(pct) || 10}`;
      const jaExiste =
        resp?.status === 400 && JSON.stringify(resp?.data ?? '').toLowerCase().includes('cod');
      setCouponError(
        jaExiste
          ? `O cupom ${codigo} já existe nesta loja — é só divulgar. Para mudar a porcentagem, crie com outro valor ou edite em Cupons.`
          : mensagemDoServidor(resp?.data) ||
            'Não foi possível criar o cupom de boas-vindas. Tente novamente.'
      );
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
              value: resumo?.participantes ?? accountsCount,
              definicao: 'Clientes com pelo menos um item já acumulado.',
              icone: <UserGroupIcon />,
            },
            {
              // O número que vira ação hoje: dá para mandar "falta 1 para
              // você ganhar" e o cliente pede.
              label: 'A um item de ganhar',
              value: resumo?.quase_la ?? '—',
              definicao: `Clientes que precisam de mais 1 item para fechar o cartão de ${threshold}.`,
              icone: <FireIcon />,
              tone: (resumo?.quase_la ?? 0) > 0 ? 'brand' : 'default',
            },
            {
              label: 'Brindes a resgatar',
              value: resumo?.brindes_disponiveis ?? '—',
              definicao: 'Já conquistados e ainda não usados. Saem no próximo pedido.',
              icone: <GiftIcon />,
              tone: (resumo?.brindes_disponiveis ?? 0) > 0 ? 'warning' : 'default',
            },
            {
              label: 'Brindes já entregues',
              value: resumo?.brindes_resgatados ?? '—',
              definicao: 'Total de grátis que o programa já pagou desde o início.',
              icone: <CheckBadgeIcon />,
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

      <Card
        title="Quem está mais perto de ganhar"
        subtitle="Ordenado do mais perto de fechar o cartão para o mais longe — é essa a lista de quem vale mandar mensagem hoje."
      >
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
            <table className="w-full text-body">
              <thead>
                <tr className="border-b border-border-token text-left">
                  <th className="overline py-2">Cliente</th>
                  <th className="overline py-2">Progresso</th>
                  <th className="overline py-2 text-right">Falta</th>
                  <th className="overline py-2 text-right">Resgates</th>
                  <th className="overline py-2 text-right">Grátis disponíveis</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr
                    key={account.user_id}
                    className="border-t border-border-token text-fg-token transition-colors hover:bg-surface-2"
                  >
                    <td className="py-2.5">
                      {/* Nome e e-mail eram duas colunas. O e-mail sozinho não
                          responde nenhuma pergunta desta tela — vira metadado
                          sob o nome e devolve uma coluna para o que importa. */}
                      <p className="font-semibold">{account.display_name}</p>
                      <p className="text-caption text-fg-muted-token">{account.email}</p>
                    </td>
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
                    <td className="py-2.5 text-right">
                      {/* Destaque só em quem está a 1: é o corte que vira ação.
                          Pintar todas as faixas de cor tiraria o sinal do
                          número que realmente pede um empurrão hoje. */}
                      {account.falta === 1 ? (
                        <Badge tone="success">falta 1</Badge>
                      ) : (
                        <span className="tabular-nums text-fg-muted-token">
                          {account.falta}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-fg-muted-token">
                      {account.redeemed_count}
                    </td>
                    <td className="py-2.5 text-right">
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
