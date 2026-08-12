/**
 * Os relatórios, e onde cada um mora.
 *
 * A página de análises tinha DEZ abas numa faixa de duas camadas dentro dela —
 * rótulos de grupo ("Vendas", "Clientes", "Operação & Financeiro") em cima de
 * uma fileira de abas. Era uma segunda navegação desenhada por cima da
 * primeira: a coluna da esquerda já é o lugar de escolher para onde ir, e
 * duas navegações concorrendo ensinam o operador duas vezes.
 *
 * Agora cada grupo é um destino de verdade (`/analytics/vendas`), aparece na
 * coluna junto com o resto do produto, tem URL para mandar por WhatsApp e
 * volta no histórico do navegador. Dentro de um relatório com mais de uma
 * visão sobra um seletor curto — dois a quatro botões, não dez.
 */
export type TabValue =
  | 'overview' | 'orders' | 'products' | 'stock'
  | 'peaks' | 'geo' | 'operations' | 'crm' | 'finance' | 'bot';

export interface Relatorio {
  /** Segmento da URL: /analytics/<slug>. */
  slug: string;
  titulo: string;
  /** Uma frase dizendo a que pergunta o relatório responde. */
  descricao: string;
  visoes: { value: TabValue; label: string }[];
}

export const RELATORIOS: Relatorio[] = [
  {
    slug: 'visao-geral',
    titulo: 'Visão geral',
    descricao: 'O resumo do período: quanto entrou, quantos pedidos e o que puxou o resultado.',
    visoes: [{ value: 'overview', label: 'Visão Geral' }],
  },
  {
    slug: 'vendas',
    titulo: 'Vendas',
    descricao: 'O que vendeu, quando vendeu e o que está encalhando.',
    visoes: [
      { value: 'orders', label: 'Pedidos e faturamento' },
      { value: 'peaks', label: 'Horários e canais' },
      { value: 'products', label: 'Produtos' },
      { value: 'stock', label: 'Estoque' },
    ],
  },
  {
    slug: 'clientes',
    titulo: 'Clientes',
    descricao: 'Quem compra, com que frequência volta e o que anda dizendo.',
    visoes: [
      { value: 'crm', label: 'Base de clientes' },
      { value: 'bot', label: 'Atendimento e avaliações' },
    ],
  },
  {
    slug: 'operacao',
    titulo: 'Operação',
    descricao: 'Tempo de preparo, entrega, geografia e para onde vai o dinheiro em taxas.',
    visoes: [
      { value: 'operations', label: 'Tempos' },
      { value: 'geo', label: 'Geografia' },
      { value: 'finance', label: 'Taxas e cupons' },
    ],
  },
];

export const relatorioPorSlug = (slug?: string): Relatorio =>
  RELATORIOS.find((r) => r.slug === slug) ?? RELATORIOS[0];

/** Em qual relatório vive uma visão — usado para não perder link antigo. */
export const relatorioDaVisao = (visao: TabValue): Relatorio =>
  RELATORIOS.find((r) => r.visoes.some((v) => v.value === visao)) ?? RELATORIOS[0];
