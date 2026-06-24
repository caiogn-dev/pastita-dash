import React from 'react';
import {
  HomeIcon, DevicePhoneMobileIcon, ChatBubbleLeftRightIcon,
  ShoppingCartIcon, CreditCardIcon, CpuChipIcon, Cog6ToothIcon,
  BoltIcon, UserGroupIcon, TagIcon, Squares2X2Icon, BuildingStorefrontIcon,
  MegaphoneIcon, DocumentTextIcon, DocumentChartBarIcon, EnvelopeIcon,
  ClockIcon, PresentationChartLineIcon, SparklesIcon, RectangleGroupIcon,
} from '@heroicons/react/24/outline';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  /** Quando presente, renderiza um cabeçalho de seção acima deste item */
  sectionHeader?: string;
}

export interface NavSection {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  href?: string;
  badge?: string;
}

export interface BuildNavSectionsOpts {
  storeHref: (path: string) => string;
  unreadBadge?: string;
  automationEnabled: boolean;
}

/**
 * Single source of truth for the dashboard top-nav IA.
 * Account-level links (Todas as Lojas, Integrações, Preferências, Plano) are
 * intentionally NOT here — they live in the avatar menu (AccountMenu.tsx).
 */
export function buildNavSections({ storeHref, unreadBadge, automationEnabled }: BuildNavSectionsOpts): NavSection[] {
  const automacao: NavSection = {
    label: 'Automação',
    icon: SparklesIcon,
    items: [
      { name: 'Agentes IA',   href: '/agents',               icon: CpuChipIcon, badge: 'Beta', sectionHeader: 'Principal' },
      { name: 'Automações',   href: '/automation/companies', icon: BoltIcon },
      { name: 'Agendamentos', href: '/automation/scheduled', icon: ClockIcon },
      { name: 'Handover',     href: '/whatsapp/handover',    icon: UserGroupIcon },
      { name: 'Logs IA',      href: '/automation/logs',         icon: DocumentChartBarIcon, sectionHeader: 'Monitoramento' },
      { name: 'Intenções',    href: '/automation/intents/stats', icon: DocumentChartBarIcon },
      { name: 'Sessões',      href: '/automation/sessions',      icon: ChatBubbleLeftRightIcon },
    ],
  };

  return [
    { label: 'Início', icon: HomeIcon, href: '/', items: [] },

    { label: 'Pedidos', icon: ShoppingCartIcon, href: storeHref('orders'), items: [] },
    {
      label: 'Chat',
      icon: ChatBubbleLeftRightIcon,
      href: '/inbox/whatsapp',
      badge: unreadBadge,
      items: [],
    },
    {
      label: 'PDV',
      icon: CreditCardIcon,
      items: [
        { name: 'Caixa',              href: storeHref('cash'),     icon: CreditCardIcon },
        { name: 'Modo Cozinha (KDS)', href: storeHref('kds'),      icon: ClockIcon },
        { name: 'Impressão',          href: storeHref('printing'), icon: DocumentTextIcon },
      ],
    },
    { label: 'Clientes', icon: UserGroupIcon, href: storeHref('customers'), items: [] },
    {
      label: 'Cardápio',
      icon: Squares2X2Icon,
      items: [
        { name: 'Produtos', href: storeHref('products'), icon: Squares2X2Icon },
        { name: 'Combos',   href: storeHref('combos'),   icon: RectangleGroupIcon },
        { name: 'Cupons',   href: storeHref('coupons'),  icon: TagIcon },
      ],
    },
    { label: 'Relatórios', icon: PresentationChartLineIcon, href: '/analytics', items: [] },

    {
      label: 'Campanhas',
      icon: MegaphoneIcon,
      items: [
        { name: 'WhatsApp',  href: '/marketing/whatsapp',           icon: DevicePhoneMobileIcon },
        { name: 'Templates', href: '/marketing/whatsapp/templates', icon: DocumentTextIcon },
        { name: 'Email',     href: '/marketing/email/campaigns',    icon: EnvelopeIcon },
      ],
    },

    ...(automationEnabled ? [automacao] : []),

    {
      label: 'Configurações',
      icon: Cog6ToothIcon,
      items: [
        { name: 'Geral',      href: storeHref('settings'),   icon: Cog6ToothIcon },
        { name: 'Entrega',    href: storeHref('delivery'),   icon: ShoppingCartIcon },
        { name: 'Storefront', href: storeHref('storefront'), icon: BuildingStorefrontIcon },
        { name: 'Pagamentos', href: storeHref('payments'),   icon: CreditCardIcon },
      ],
    },
  ];
}
