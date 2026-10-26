import React from 'react';
import {
  HomeIcon, DevicePhoneMobileIcon, ChatBubbleLeftRightIcon,
  CreditCardIcon, Cog6ToothIcon,
  ChatBubbleBottomCenterTextIcon, AcademicCapIcon, SunIcon, UserGroupIcon, TagIcon, Squares2X2Icon, BuildingStorefrontIcon,
  MegaphoneIcon, DocumentTextIcon, ClockIcon, PresentationChartLineIcon, StarIcon, RectangleGroupIcon,
  QrCodeIcon, GiftIcon, LinkIcon, BeakerIcon,
  // Um ícone por destino. Antes CreditCardIcon aparecia em três itens,
  // ClockIcon em três e TagIcon em dois: com o mesmo desenho repetido o
  // operador para de usar o ícone para se localizar e lê tudo de novo.
  ClipboardDocumentListIcon, PrinterIcon, BanknotesIcon, FireIcon, CubeIcon,
  TicketIcon, GlobeAltIcon, ChartBarIcon, ArchiveBoxArrowDownIcon,
  ArrowUpTrayIcon, UsersIcon, HandRaisedIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  BellAlertIcon, CurrencyDollarIcon, MapPinIcon,
} from '@heroicons/react/24/outline';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  /** Outros nomes que a busca (Ctrl+K) aceita — o nome antigo, a sigla. */
  tambem?: string[];
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
  /**
   * "Uso caixa com dinheiro vivo" (Configurações da loja → Recebimento).
   * Omitido vale `true`: o Caixa só sai do menu quando o dono desliga.
   */
  caixaEnabled?: boolean;
}

/**
 * Single source of truth for the dashboard top-nav IA.
 * Account-level links (Todas as Lojas, Integrações, Preferências, Plano) are
 * intentionally NOT here — they live in the avatar menu (AccountMenu.tsx).
 *
 * Arquitetura de 26/10. O menu tinha crescido uma tela por vez, cada uma onde
 * coube no dia: link de pagamento no Balcão, cupom e fidelidade em Cardápio,
 * cozinha e expedição no Balcão, avaliações em Pedidos, a impressora da
 * comanda dentro de Etiquetas. Agora cada seção responde UMA pergunta:
 *
 *   Pedidos      — por onde o pedido passa (histórico → cozinha → saída → rua)
 *   Atendimento  — a conversa com o cliente, e o que o bot diz sozinho
 *   Balcão       — a venda presencial e a gaveta
 *   Financeiro   — cobrar fora do pedido e faturar
 *   Cardápio     — o que se vende
 *   Etiquetas    — a bancada da etiqueta
 *   Clientes     — quem compra, o que achou, o que o faz voltar
 *   Marketing    — o que chama gente (desconto, campanha, vitrine na bio)
 *   Relatórios   — o que mede
 *   Configurações— como a loja funciona (inclusive impressora e equipe)
 */
export function buildNavSections({ storeHref, unreadBadge, automationEnabled, caixaEnabled = true }: BuildNavSectionsOpts): NavSection[] {
  // Cupom e link na bio valem para toda loja. As telas que disparam WhatsApp
  // (recuperador, promoção do dia, campanha, Instagram, modelos da Meta) só
  // aparecem com WhatsApp conectado — antes o gate escondia Marketing inteiro.
  const marketing: NavSection = {
    grupo: 'Crescimento',
    label: 'Marketing',
    icon: MegaphoneIcon,
    items: [
      { name: 'Cupons',      href: storeHref('coupons'),  icon: TicketIcon, tambem: ['desconto'] },
      ...(automationEnabled ? [
        // A única tela de marketing que fala do dinheiro que já está na mesa.
        { name: 'Recuperador de vendas', href: '/marketing/recuperacao',      icon: ArrowPathIcon },
        { name: 'Promoção do dia',     href: '/marketing/promocao-do-dia',    icon: SunIcon },
        { name: 'Campanha WhatsApp',   href: '/marketing/whatsapp',           icon: DevicePhoneMobileIcon },
        { name: 'Promoção no Instagram', href: '/marketing/instagram',        icon: MegaphoneIcon },
        // Modelo aprovado pela Meta: o que fura a janela de 24 h (131047).
        { name: 'Modelos de mensagem', href: '/marketing/whatsapp/templates', icon: DocumentTextIcon },
      ] : []),
      { name: 'Link na Bio', href: storeHref('link-bio'), icon: GlobeAltIcon },
      // Fora do menu (rotas de pé): 'Campanha por e-mail', 'E-mails
      // automáticos' (4 chamadas cada em 16 dias, 03/10) e 'Assinantes'
      // (modelo Subscriber em 0; o público real vive em StoreCustomer).
    ],
  };

  // 'Automação' saiu do menu em 03/10 (rotas de pé): Agentes de IA, Respostas
  // automáticas, Mensagens automáticas e Conversas da IA — 3 a 8 chamadas em
  // 16 dias. O que o lojista usa do bot mora em Atendimento.

  return [
    // ── Operação: o que se toca durante o expediente ──────────────────────
    { grupo: 'Operação', label: 'Início', icon: HomeIcon, href: '/', items: [] },
    {
      // O quadro ao vivo mora no botão "Central de Pedidos" da barra do topo
      // (aba própria, ligada o expediente inteiro). Aqui fica o resto do
      // caminho do pedido, na ordem em que ele anda.
      grupo: 'Operação',
      label: 'Pedidos',
      icon: ClipboardDocumentListIcon,
      items: [
        { name: 'Histórico',         href: storeHref('orders/historico'), icon: ClipboardDocumentListIcon },
        { name: 'Tela da cozinha',   href: storeHref('kds'),       icon: FireIcon, tambem: ['kds', 'cozinha'] },
        // Bipar o código de barras da comanda avança o pedido para a saída.
        { name: 'Expedição',         href: storeHref('expedicao'), icon: ArchiveBoxArrowDownIcon },
      ],
    },
    {
      grupo: 'Operação',
      label: 'Atendimento',
      icon: ChatBubbleLeftRightIcon,
      badge: unreadBadge,
      items: [
        { name: 'Conversas',    href: '/inbox/whatsapp',                     icon: ChatBubbleLeftRightIcon },
        { name: 'Esperando atendente', href: '/whatsapp/handover',           icon: HandRaisedIcon, tambem: ['fila humana', 'handover'] },
        // Texto que o atendente repete o dia todo, a um "/" de distância no chat.
        { name: 'Respostas rápidas', href: '/atendimento/respostas-rapidas', icon: ChatBubbleBottomCenterTextIcon },
        { name: 'Ensinar o bot', href: '/atendimento/ensinar-o-bot',         icon: AcademicCapIcon },
        // O que o bot manda sozinho: o texto e o registro, em abas da mesma
        // tela desde 26/10 (eram "Mensagens prontas" e "Avisos enviados").
        { name: 'Avisos automáticos', href: '/atendimento/avisos-automaticos', icon: BellAlertIcon, tambem: ['mensagens prontas', 'mensagens automáticas', 'fora do horário', 'boas-vindas', 'avisos enviados'] },
      ],
    },
    {
      grupo: 'Operação',
      label: 'Balcão',
      icon: QrCodeIcon,
      items: [
        { name: 'Venda no balcão', href: storeHref('pdv'), icon: QrCodeIcon, tambem: ['pdv'] },
        ...(caixaEnabled ? [{ name: 'Caixa', href: storeHref('cash'), icon: BanknotesIcon }] : []),
      ],
    },
    {
      // Link de pagamento morava no Balcão, mas é cobrança à distância, sem
      // pedido: é dinheiro, como a nota fiscal.
      grupo: 'Operação',
      label: 'Financeiro',
      icon: CurrencyDollarIcon,
      items: [
        { name: 'Link de pagamento', href: '/payments/link',            icon: LinkIcon, tambem: ['cobrança', 'cobrar'] },
        { name: 'Pagamentos recebidos', href: storeHref('pagamentos-recebidos'), icon: BanknotesIcon, tambem: ['extrato', 'recebido'] },
        { name: 'Notas fiscais',     href: storeHref('notas-fiscais'),  icon: DocumentTextIcon, tambem: ['nf-e', 'nfc-e'] },
      ],
    },

    // ── Catálogo: o que a loja vende e o que sai na etiqueta ─────────────
    {
      grupo: 'Catálogo',
      label: 'Cardápio',
      icon: Squares2X2Icon,
      items: [
        { name: 'Produtos', href: storeHref('products'), icon: CubeIcon },
        { name: 'Combos',   href: storeHref('combos'),   icon: RectangleGroupIcon },
        // Implantação: usado na primeira semana, depois quase nunca.
        { name: 'Importar planilha', href: '/cardapio/importar', icon: ArrowUpTrayIcon },
      ],
    },
    {
      grupo: 'Catálogo',
      label: 'Etiquetas',
      icon: TagIcon,
      items: [
        { name: 'Tabela nutricional', href: storeHref('ingredientes'), icon: BeakerIcon, tambem: ['ingredientes', 'taco', 'anvisa'] },
        { name: 'Imprimir etiquetas', href: storeHref('etiquetas'),    icon: TagIcon },
      ],
    },

    // ── Crescimento: quem compra, o que chama gente, o que mede ──────────
    {
      grupo: 'Crescimento',
      label: 'Clientes',
      icon: UserGroupIcon,
      items: [
        { name: 'Lista de clientes', href: storeHref('customers'),  icon: UserGroupIcon, tambem: ['clientes'] },
        { name: 'Avaliações',        href: '/avaliacoes',           icon: StarIcon },
        { name: 'Fidelidade',        href: storeHref('fidelidade'), icon: GiftIcon, tambem: ['carimbo', 'cartão fidelidade'] },
      ],
    },
    marketing,
    {
      grupo: 'Crescimento',
      label: 'Relatórios',
      icon: PresentationChartLineIcon,
      items: [
        { name: 'Visão geral', href: '/analytics/visao-geral', icon: ChartBarIcon },
        { name: 'Vendas',      href: '/analytics/vendas',      icon: ArrowTrendingUpIcon },
        { name: 'Clientes',    href: '/analytics/clientes',    icon: UsersIcon },
        { name: 'Operação',    href: '/analytics/operacao',    icon: ClockIcon, tambem: ['ranking', 'entregador', 'atendente', 'tempo de entrega'] },
        // Avisos ao dono no WhatsApp quando um número sai do normal (16/10).
        // Só se chegava pelo card do Início (26/10).
        { name: 'Vigias',      href: '/vigias',                icon: BellAlertIcon, tambem: ['alertas', 'avisos ao dono'] },
      ],
    },

    // ── Ajustes ──────────────────────────────────────────────────────────
    {
      grupo: 'Ajustes',
      label: 'Configurações',
      icon: Cog6ToothIcon,
      items: [
        { name: 'Geral',      href: storeHref('settings'),   icon: Cog6ToothIcon, tambem: ['horário', 'turnos'] },
        { name: 'Entrega',    href: storeHref('delivery'),   icon: MapPinIcon, tambem: ['frete', 'zonas', 'raio'] },
        // Era um extrato (26/10); agora configura como a loja recebe.
        { name: 'Pagamentos', href: storeHref('payments'),   icon: CreditCardIcon, tambem: ['mercado pago', 'pix', 'vale', 'recebimento', 'caixa'] },
        { name: 'Aparência da loja', href: storeHref('aparencia'), icon: BuildingStorefrontIcon, tambem: ['storefront', 'vitrine', 'cores', 'logo', 'capa', 'tema'] },
        // Saiu de Etiquetas: a mesma tela configura a COMANDA do pedido.
        { name: 'Impressoras e comanda', href: storeHref('printing'), icon: PrinterIcon, tambem: ['impressora', 'comanda', 'print agent'] },
        // Quem tem login e quem entrega (26/10: entregadores saíram de Pedidos).
        { name: 'Equipe', href: '/colaboradores', icon: UsersIcon, tambem: ['colaboradores', 'entregador', 'motoboy', 'remover'] },
      ],
    },
  ];
}
