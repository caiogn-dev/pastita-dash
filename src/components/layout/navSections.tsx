import React from 'react';
import {
  HomeIcon, DevicePhoneMobileIcon, ChatBubbleLeftRightIcon,
  ShoppingCartIcon, CreditCardIcon, CpuChipIcon, Cog6ToothIcon,
  BoltIcon, UserGroupIcon, TagIcon, Squares2X2Icon, BuildingStorefrontIcon,
  MegaphoneIcon, DocumentTextIcon, DocumentChartBarIcon, EnvelopeIcon,
  ClockIcon, PresentationChartLineIcon, SparklesIcon, RectangleGroupIcon,
  QrCodeIcon, GiftIcon, LinkIcon, TrophyIcon,
  BeakerIcon,
  // Um ícone por destino. Antes CreditCardIcon aparecia em três itens,
  // ClockIcon em três e TagIcon em dois: com o mesmo desenho repetido o
  // operador para de usar o ícone para se localizar e lê tudo de novo.
  ClipboardDocumentListIcon, PrinterIcon, BanknotesIcon, FireIcon, CubeIcon,
  TicketIcon, GlobeAltIcon, ChartBarIcon, CalendarDaysIcon, ShareIcon,
  UsersIcon, LightBulbIcon, RectangleStackIcon, HandRaisedIcon,
  ArrowPathRoundedSquareIcon, WrenchScrewdriverIcon, SignalIcon, ArrowTrendingUpIcon,
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
  /**
   * Bloco a que a seção pertence ("Operação", "Catálogo", …).
   *
   * Onze seções numa lista corrida obrigam a ler tudo para achar uma. O bloco
   * responde antes: "isso é coisa de hoje, de catálogo, de crescer ou de
   * ajuste?" — e o operador só varre o pedaço certo.
   */
  grupo?: GrupoDoMenu;
}

/** A ordem aqui é a ordem dos blocos na coluna. */
export const GRUPOS = ['Operação', 'Catálogo', 'Crescimento', 'Ajustes'] as const;
export type GrupoDoMenu = typeof GRUPOS[number];

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
  // Marketing e Automação são features avançadas: ficam sob o mesmo gate para
  // manter a coluna focada em operação (pedidos/cardápio/atendimento).
  const marketing: NavSection = {
    grupo: 'Crescimento',
    label: 'Marketing',
    icon: MegaphoneIcon,
    items: [
      { name: 'Campanha WhatsApp',   href: '/marketing/whatsapp',           icon: DevicePhoneMobileIcon },
      { name: 'Campanha por e-mail', href: '/marketing/email/campaigns',    icon: EnvelopeIcon },
      // Recuperadas: existiam no código e não tinham caminho nenhum no menu.
      { name: 'E-mails automáticos', href: '/marketing/automations',        icon: ArrowPathRoundedSquareIcon },
      { name: 'Modelos de mensagem', href: '/marketing/whatsapp/templates', icon: DocumentTextIcon },
      // 'Assinantes' (/marketing/subscribers) saiu do menu: o modelo Subscriber
      // está em 0 e nada o alimenta. O público real de campanha vive em
      // EmailRecipient (136) e StoreCustomer (100) — a tela ficaria vazia para
      // sempre, não por falta de uso, mas por olhar a tabela errada. A rota
      // segue de pé; volta ao menu quando apontar para o público de verdade.
    ],
  };

  const automacao: NavSection = {
    grupo: 'Crescimento',
    label: 'Automação',
    icon: SparklesIcon,
    items: [
      { name: 'Agentes de IA',        href: '/agents',               icon: CpuChipIcon, badge: 'Beta' },
      { name: 'Respostas automáticas', href: '/automation/companies', icon: BoltIcon },
      // Recuperada: 166 AutoMessage em produção e nenhum caminho no menu — ao
      // contrário de flows/scheduled/logs (zerados), esta tela tem conteúdo
      // real. 'Respostas automáticas' configura QUANDO o bot fala;
      // 'Mensagens automáticas' é O QUE ele diz. São telas complementares, e
      // faltava a segunda.
      { name: 'Mensagens automáticas', href: '/automation/messages', icon: ChatBubbleLeftRightIcon },
      // 'Fluxos do agente' (/automation/flows) e 'Agendamentos'
      // (/automation/scheduled) saíram do menu. Levantamento de 19/08 contra o
      // banco de produção: AgentFlow 0, FlowSession 0, FlowExecutionLog 0,
      // ScheduledMessage 0 — nunca executaram uma vez. O agente de IA não roda
      // em produção (as 14 AgentConversation têm 0 mensagens cada), então
      // "fluxo do agente" oferece configurar algo que não está ligado.
      // As rotas continuam de pé; voltam ao menu quando houver o que mostrar.
      // Duas telas de log, uma delas permanentemente vazia: `AutomationLog`
      // (/automation/logs) só é escrito em evento de carrinho, e o caminho
      // real da mensagem não passa por lá. O `IntentLog` passou a registrar
      // TODA mensagem — texto, intenção, handler, resposta, duração e também
      // o silêncio —, então ele é o log. A rota antiga continua de pé para
      // não virar link quebrado; fora do menu para não prometer o que não tem.
      { name: 'Conversas da IA', href: '/automation/intents/stats', icon: SignalIcon, sectionHeader: 'Monitoramento' },
    ],
  };

  return [
    // ── Operação: o que se toca durante o expediente ──────────────────────
    { grupo: 'Operação', label: 'Início', icon: HomeIcon, href: '/', items: [] },
    {
      // Só o histórico. A operação ao vivo mora no botão "Central de Pedidos"
      // da barra do topo, que abre em aba própria e fica ligada o expediente
      // inteiro; repetir aqui daria dois caminhos com comportamentos
      // diferentes para a mesma tela.
      grupo: 'Operação',
      label: 'Pedidos',
      icon: ClipboardDocumentListIcon,
      href: storeHref('orders/historico'),
      items: [],
    },
    {
      // Atendimento era um item solto ("Chat") enquanto fila humana, sessões e
      // insights viviam espalhados dentro de Automação — três telas sobre a
      // MESMA conversa em dois lugares distantes.
      grupo: 'Operação',
      label: 'Atendimento',
      icon: ChatBubbleLeftRightIcon,
      badge: unreadBadge,
      items: [
        { name: 'Conversas',    href: '/inbox/whatsapp',                     icon: ChatBubbleLeftRightIcon },
        { name: 'Fila humana',  href: '/whatsapp/handover',                  icon: HandRaisedIcon },
        { name: 'Sessões',      href: '/automation/sessions',                icon: RectangleStackIcon },
        { name: 'Insights',     href: '/automation/conversation-insights',   icon: LightBulbIcon },
      ],
    },
    {
      // "PDV" carregava etiqueta, impressora e KDS junto com a venda. Aqui
      // fica só o dinheiro entrando no balcão.
      grupo: 'Operação',
      label: 'Balcão',
      icon: QrCodeIcon,
      items: [
        { name: 'Venda no balcão',   href: storeHref('pdv'),  icon: QrCodeIcon },
        { name: 'Caixa',             href: storeHref('cash'), icon: BanknotesIcon },
        { name: 'Link de pagamento', href: '/payments/link',  icon: LinkIcon },
        { name: 'Cozinha (KDS)',     href: storeHref('kds'),  icon: FireIcon },
      ],
    },

    // ── Catálogo: o que a loja vende e o que sai impresso ────────────────
    {
      grupo: 'Catálogo',
      label: 'Cardápio',
      icon: Squares2X2Icon,
      items: [
        { name: 'Produtos',    href: storeHref('products'), icon: CubeIcon },
        { name: 'Combos',      href: storeHref('combos'),   icon: RectangleGroupIcon },
        { name: 'Cupons',      href: storeHref('coupons'),  icon: TicketIcon },
        { name: 'Fidelidade',  href: storeHref('fidelidade'), icon: GiftIcon },
        { name: 'Link na Bio', href: storeHref('link-bio'), icon: GlobeAltIcon },
      ],
    },
    {
      // A bancada: o dado nutricional alimenta a etiqueta, que sai na
      // impressora. Estavam em três lugares diferentes do menu.
      grupo: 'Catálogo',
      label: 'Etiquetas',
      icon: TagIcon,
      items: [
        { name: 'Ingredientes e TACO', href: storeHref('ingredientes'), icon: BeakerIcon },
        { name: 'Imprimir etiquetas',  href: storeHref('etiquetas'),    icon: TagIcon },
        { name: 'Impressoras',         href: storeHref('printing'),     icon: PrinterIcon },
      ],
    },

    // ── Crescimento: o que faz voltar e o que mede ───────────────────────
    { grupo: 'Crescimento', label: 'Clientes', icon: UserGroupIcon, href: storeHref('customers'), items: [] },
    {
      grupo: 'Crescimento',
      label: 'Relatórios',
      icon: PresentationChartLineIcon,
      // Os quatro relatórios eram DEZ abas numa faixa de duas camadas dentro
      // da própria página — uma segunda navegação por cima desta. Agora são
      // destinos de verdade: entram na coluna, têm URL e voltam no histórico.
      items: [
        { name: 'Visão geral',        href: '/analytics/visao-geral', icon: ChartBarIcon },
        { name: 'Vendas',             href: '/analytics/vendas',      icon: ArrowTrendingUpIcon },
        { name: 'Clientes',           href: '/analytics/clientes',    icon: UsersIcon },
        { name: 'Operação',           href: '/analytics/operacao',    icon: ClockIcon },
        { name: 'Metas e Conquistas', href: '/conquistas',            icon: TrophyIcon },
      ],
    },
    ...(automationEnabled ? [marketing, automacao] : []),

    // ── Ajustes ──────────────────────────────────────────────────────────
    {
      grupo: 'Ajustes',
      label: 'Configurações',
      icon: Cog6ToothIcon,
      items: [
        { name: 'Geral',      href: storeHref('settings'),   icon: Cog6ToothIcon },
        { name: 'Entrega',    href: storeHref('delivery'),   icon: ShoppingCartIcon },
        { name: 'Storefront', href: storeHref('storefront'), icon: BuildingStorefrontIcon },
        { name: 'Pagamentos', href: storeHref('payments'),   icon: CreditCardIcon },
        // Recuperadas: diagnósticos que existiam sem rota — quando o WhatsApp
        // cai, é aqui que se olha em vez de abrir o log do servidor.
        { name: 'Diagnóstico do WhatsApp', href: '/whatsapp/diagnostics', icon: WrenchScrewdriverIcon, sectionHeader: 'Quando algo falha' },
        { name: 'Diagnóstico do chat',     href: '/whatsapp/debug',       icon: ChatBubbleLeftRightIcon },
      ],
    },
  ];
}
