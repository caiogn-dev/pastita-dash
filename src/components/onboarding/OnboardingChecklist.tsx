/**
 * OnboardingChecklist — card "Primeiros Passos" no topo do dashboard.
 *
 * Busca o checklist de onboarding da loja selecionada (Task 1-3: backend +
 * service) e renderiza progresso + passos pendentes com link para a rota
 * real onde aquele passo é resolvido. Some sozinho quando `all_done` ou
 * quando o usuário dispensa (persistido por loja no localStorage).
 *
 * Rotas são domínio do front (o backend só devolve key/label/done) — ver
 * `ROUTE_BY_KEY` abaixo, derivado de `src/App.tsx`.
 */
import { useEffect, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../hooks/useStore';
import { getChecklist, type OnboardingChecklist as Checklist, type ChecklistKey } from '../../services/onboarding';

/**
 * Mapa key -> rota real. Alguns passos vivem em rotas aninhadas por
 * `storeId` (`stores/:storeId/...`, ver `src/App.tsx`); quando não há
 * `storeId` resolvido ainda (ex.: store ainda carregando), cai em
 * `/settings` (rota confirmada, sempre existente) em vez de montar uma
 * rota quebrada.
 */
function buildRouteByKey(storeId: string | null | undefined): Record<ChecklistKey, string> {
  return {
    account: '/',
    product: storeId ? `/stores/${storeId}/products` : '/settings',
    delivery: storeId ? `/stores/${storeId}/delivery` : '/settings',
    hours: storeId ? `/stores/${storeId}/settings` : '/settings',
    // logo/branding é editado na mesma tela que StorefrontPage usa
    // (ver comentário de saveStoreBranding em services/onboarding.ts).
    logo: storeId ? `/stores/${storeId}/storefront` : '/settings',
    // Conexão de canal WhatsApp é gerenciada na página unificada de conexões.
    whatsapp: '/connections',
  };
}

const OnboardingChecklist: FC = () => {
  const { store, storeId } = useStore();
  const slug = store?.slug;
  const [data, setData] = useState<Checklist | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setDismissed(localStorage.getItem(`onboarding_dismissed_${slug}`) === '1');
    getChecklist(slug).then(setData).catch(() => { /* silencioso: não quebra o home */ });
  }, [slug]);

  if (!data || data.all_done || dismissed) return null;

  function dismiss() {
    if (slug) localStorage.setItem(`onboarding_dismissed_${slug}`, '1');
    setDismissed(true);
  }

  const routeByKey = buildRouteByKey(storeId);

  return (
    <section
      role="region"
      aria-label="Primeiros passos"
      className="mb-6 rounded-lg border border-border-token bg-surface-token p-4"
    >
      <header className="flex items-center justify-between">
        <h2 className="font-semibold text-fg-token">Primeiros passos</h2>
        <span className="text-sm text-fg-muted-token">{data.completed}/{data.total}</span>
      </header>
      <ul className="mt-3 space-y-2">
        {data.steps.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm">
            <span aria-hidden>{s.done ? '✅' : '⬜'}</span>
            {s.done ? (
              <span className="text-fg-muted-token line-through">{s.label}</span>
            ) : (
              <Link to={routeByKey[s.key]} className="text-fg-token hover:text-brand">
                {s.label} →
              </Link>
            )}
          </li>
        ))}
      </ul>
      <button onClick={dismiss} className="mt-3 text-xs text-fg-muted-token underline">
        Dispensar
      </button>
    </section>
  );
};

export default OnboardingChecklist;
