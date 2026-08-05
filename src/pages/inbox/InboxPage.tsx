import React, { Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loading } from '../../components/common';
import { INBOX_TABS, resolveInboxTab } from './inboxTabs';

// Conteúdo de cada aba reaproveita as páginas existentes (consolidação por rota;
// a fusão real dos componentes vem depois).
const WhatsAppInboxPage = lazy(() => import('../whatsapp').then((m) => ({ default: m.WhatsAppInboxPage })));
const ConversationsPage = lazy(() => import('../conversations/ConversationsPage').then((m) => ({ default: m.ConversationsPage })));

const TAB_CONTENT: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  whatsapp: WhatsAppInboxPage,
  conversas: ConversationsPage,
};

/** Inbox unificado — substitui /conversations, /messages, /whatsapp/*, /instagram/inbox, /messenger/inbox. */
const InboxPage: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const activeTab = resolveInboxTab(tab);
  const Content = TAB_CONTENT[activeTab];

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-border-primary bg-bg-card px-4 pt-2">
        {INBOX_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => navigate(`/inbox/${t.id}`, { replace: true })}
            className={[
              'px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
              activeTab === t.id
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-fg-muted hover:text-fg-primary',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* overflow-y-auto: a rota /inbox cai no ramo fullscreen do MainLayout,
          cujo container é `flex-1 overflow-hidden`. Nenhum ancestral rolava, e
          `overflow: hidden` não é rolável pelo usuário — a aba "Todas" (página
          de altura natural) era simplesmente cortada: do 6º card em diante nada
          aparecia e a roda do mouse não fazia nada.
          A aba WhatsApp não gera rolagem dupla porque seu container é
          `height: 100%` com overflow próprio. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Suspense fallback={<Loading />}>
          <Content />
        </Suspense>
      </div>
    </div>
  );
};

export default InboxPage;
