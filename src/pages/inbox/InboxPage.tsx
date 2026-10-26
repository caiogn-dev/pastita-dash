import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loading } from '../../components/common';
import { channelsApi } from '../../features/channels';
import { montarAbas, resolveInboxTab, rolagemDaAba } from './inboxTabs';

// Conteúdo de cada aba reaproveita as páginas existentes (consolidação por rota;
// a fusão real dos componentes vem depois).
const WhatsAppInboxPage = lazy(() => import('../whatsapp').then((m) => ({ default: m.WhatsAppInboxPage })));
const DirectPage = lazy(() => import('../instagram/DirectPage'));

const TAB_CONTENT: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  whatsapp: WhatsAppInboxPage,
  instagram: DirectPage,
};

/** Inbox unificado — substitui /conversations, /messages, /whatsapp/*, /instagram/inbox, /messenger/inbox. */
const InboxPage: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  // A aba do direct só existe para quem conectou o Instagram: ela saiu do
  // produto em agosto justamente por aparecer vazia para todo mundo.
  const [temInstagram, setTemInstagram] = useState(false);

  useEffect(() => {
    let vivo = true;
    channelsApi.listAccounts('instagram')
      .then((contas) => { if (vivo) setTemInstagram(contas.some((c) => c.isActive)); })
      .catch(() => { /* sem Instagram é o estado normal da maioria das lojas */ });
    return () => { vivo = false; };
  }, []);

  const abas = montarAbas({ temInstagram });
  const activeTab = resolveInboxTab(tab, { temInstagram });
  const Content = TAB_CONTENT[activeTab];

  return (
    <div className="flex h-full flex-col">
      {/* Com um canal só, a faixa de abas era um segundo cabeçalho em cima do
          cabeçalho da lista. Só aparece quando há mais de um canal (26/10). */}
      {abas.length > 1 && (
        <div role="tablist" aria-label="Canais" className="flex shrink-0 items-center gap-1 border-b border-border-token bg-surface px-4 pt-2">
          {abas.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => navigate(`/inbox/${t.id}`, { replace: true })}
              className={[
                'px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
                activeTab === t.id
                  ? 'border-brand text-brand-ink'
                  : 'border-transparent text-fg-muted-token hover:text-fg-token',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {/* Quem rola depende da aba — ver `rolagemDaAba`. WhatsApp e Direct são
          shells de altura fixa que rolam por dentro: com o wrapper rolando, o
          chat inteiro — mensagens MAIS o campo de digitar — virava conteúdo de
          uma página comprida. */}
      <div
        className={[
          'min-h-0 flex-1',
          rolagemDaAba(activeTab) === 'propria' ? 'overflow-hidden' : 'overflow-y-auto',
        ].join(' ')}
      >
        <Suspense fallback={<Loading />}>
          <Content />
        </Suspense>
      </div>
    </div>
  );
};

export default InboxPage;
