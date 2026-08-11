import React from 'react';
import {
  HomeIcon, DevicePhoneMobileIcon, ChatBubbleLeftRightIcon,
  ShoppingCartIcon, CreditCardIcon, CpuChipIcon, Cog6ToothIcon,
  BoltIcon, UserGroupIcon, TagIcon, Squares2X2Icon, BuildingStorefrontIcon,
  MegaphoneIcon, DocumentTextIcon, DocumentChartBarIcon, EnvelopeIcon,
  ClockIcon, PresentationChartLineIcon, SparklesIcon, RectangleGroupIcon,
  QrCodeIcon, GiftIcon, LinkIcon, TrophyIcon,
  BeakerIcon,
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

/** Elo da trilha de navegação. Sem `href` = página atual. */
export interface TrilhaElo {
  rotulo: string;
  href?: string;
}

/**
 * Deriva a trilha de navegação do caminho atual usando a MESMA árvore que
 * desenha o menu.
 *
 * Breadcrumb escrito à mão em cada página mente no primeiro rename de seção, e
 * mentira de breadcrumb não quebra build — ninguém descobre. Aqui, renomear
 * "Cardápio" muda o menu e a trilha juntos.
 *
 * Casa por prefixo de rota (`/orders/123` → item "Pedidos"), preferindo sempre
 * o casamento MAIS LONGO: senão `/settings` roubaria `/settings/payments`.
 */
export function trilhaDoCaminho(sections: NavSection[], pathname: string): TrilhaElo[] {
  if (pathname === '/') return [];

  const casa = (href: string) =>
    pathname === href || pathname.startsWith(href.endsWith('/') ? href : `${href}/`);

  // Junta todos os destinos e escolhe o casamento mais longo depois. Fazer a
  // escolha dentro de uma closure faz o TS perder o tipo da variável mutada.
  const candidatos: { trilha: TrilhaElo[]; href: string }[] = [];
  for (const secao of sections) {
    if (secao.href) candidatos.push({ trilha: [{ rotulo: secao.label }], href: secao.href });
    for (const item of secao.items) {
      candidatos.push({
        trilha: [{ rotulo: secao.label }, { rotulo: item.name }],
        href: item.href,
      });
    }
  }

  const casados = candidatos.filter((c) => c.href !== '/' && casa(c.href));
  if (!casados.length) return [];

  return casados.reduce((a, b) => (b.href.length > a.href.length ? b : a)).trilha;
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
  // Campanhas (marketing) é feature avançada: fica sob o mesmo gate da Automação
  // pra manter o navbar focado na operação (pedidos/cardápio/chat). Reversível.
  const campanhas: NavSection = {
    label: 'Campanhas',
    icon: MegaphoneIcon,
    items: [
      { name: 'WhatsApp',  href: '/marketing/whatsapp',           icon: DevicePhoneMobileIcon },
      { name: 'Templates', href: '/marketing/whatsapp/templates', icon: DocumentTextIcon },
      { name: 'Email',     href: '/marketing/email/campaigns',    icon: EnvelopeIcon },
    ],
  };

  const automacao: NavSection = {
    label: 'Automação',
    icon: SparklesIcon,
    items: [
      { name: 'Agentes IA',   href: '/agents',               icon: CpuChipIcon, badge: 'Beta', sectionHeader: 'Principal' },
      { name: 'Automações',   href: '/automation/companies', icon: BoltIcon },
      { name: 'Agendamentos', href: '/automation/scheduled', icon: ClockIcon },
      { name: 'Handover',     href: '/whatsapp/handover',    icon: UserGroupIcon },
      { name: 'Insights (IA)', href: '/automation/conversation-insights', icon: ChatBubbleLeftRightIcon },
      { name: 'Logs IA',      href: '/automation/logs',         icon: DocumentChartBarIcon, sectionHeader: 'Monitoramento' },
      { name: 'Intenções',    href: '/automation/intents/stats', icon: DocumentChartBarIcon },
      { name: 'Sessões',      href: '/automation/sessions',      icon: ChatBubbleLeftRightIcon },
    ],
  };

  return [
    { label: 'Início', icon: HomeIcon, href: '/', items: [] },

    {
      // Só o histórico. A operação ao vivo saiu do menu: mora no botão
      // "Central de Pedidos" da barra do topo, que abre em aba própria e fica
      // ligada o expediente inteiro.
      //
      // Repetir a Central aqui daria dois caminhos para a mesma tela com
      // comportamentos diferentes — um navega, o outro troca de aba —, e é
      // esse tipo de inconsistência que faz o operador desconfiar do clique.
      //
      // Vira link direto: seção de acordeão com um filho só custa um clique
      // para revelar o que já cabia na linha.
      label: 'Histórico',
      icon: ClockIcon,
      href: storeHref('orders/historico'),
      items: [],
    },
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
        { name: 'Balcão (Scanner)',   href: storeHref('pdv'),      icon: QrCodeIcon },
        { name: 'Etiquetas',          href: storeHref('etiquetas'), icon: TagIcon },
        { name: 'Caixa',              href: storeHref('cash'),     icon: CreditCardIcon },
        { name: 'Link de pagamento',  href: '/payments/link',      icon: CreditCardIcon },
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
        { name: 'Ingredientes e TACO', href: storeHref('ingredientes'), icon: BeakerIcon },
        { name: 'Combos',   href: storeHref('combos'),   icon: RectangleGroupIcon },
        { name: 'Cupons',   href: storeHref('coupons'),  icon: TagIcon },
        { name: 'Fidelidade', href: storeHref('fidelidade'), icon: GiftIcon },
        { name: 'Link na Bio', href: storeHref('link-bio'), icon: LinkIcon },
      ],
    },
    {
      label: 'Relatórios',
      icon: PresentationChartLineIcon,
      items: [
        { name: 'Visão geral', href: '/analytics', icon: PresentationChartLineIcon },
        { name: 'Metas e Conquistas', href: '/conquistas', icon: TrophyIcon },
      ],
    },

    ...(automationEnabled ? [campanhas, automacao] : []),

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
