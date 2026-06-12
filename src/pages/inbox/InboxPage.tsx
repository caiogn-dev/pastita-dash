import React, { Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loading } from '../../components/common';
import { INBOX_TABS, resolveInboxTab } from './inboxTabs';

// Conteúdo de cada aba reaproveita as páginas existentes (consolidação por rota;
// a fusão real dos componentes vem depois).
const WhatsAppInboxPage = lazy(() => import('../whatsapp').then((m) => ({ default: m.WhatsAppInboxPage })));
const InstagramInbox = lazy(() => import('../instagram').then((m) => ({ default: m.InstagramInbox })));
const MessengerInbox = lazy(() => import('../messenger').then((m) => ({ default: m.MessengerInbox })));
const ConversationsPage = lazy(() => import('../conversations/ConversationsPage').then((m) => ({ default: m.ConversationsPage })));

const TAB_CONTENT: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  whatsapp: WhatsAppInboxPage,
  instagram: InstagramInbox,
  messenger: MessengerInbox,
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
      <div className="min-h-0 flex-1">
        <Suspense fallback={<Loading />}>
          <Content />
        </Suspense>
      </div>
    </div>
  );
};

export default InboxPage;
