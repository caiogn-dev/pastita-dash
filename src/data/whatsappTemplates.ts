export interface WhatsAppTemplate {
  id: string;
  name: string;
  description: string;
  category: 'transactional' | 'marketing' | 'support';
  content: string;
  variables: string[];
}

export const whatsappTemplates: WhatsAppTemplate[] = [
  {
    id: 'welcome',
    name: 'Boas-vindas',
    description: 'Mensagem de boas-vindas para novos clientes',
    category: 'transactional',
    content: `Olá {{nome}}! 👋\n\nSeja bem-vindo(a) à *{{loja}}*!\n\nAqui você encontra {{especialidade}}.\n\n📍 {{localizacao}}\n\n{{canal_pedido}}`,
    variables: ['nome', 'loja', 'especialidade', 'localizacao', 'canal_pedido']
  },
  {
    id: 'coupon',
    name: 'Cupom de Desconto',
    description: 'Envia cupom de desconto promocional',
    category: 'marketing',
    content: `🎁 *Cupom especial para você!*\n\nOlá {{nome}},\n\n🏷️ *{{cupom}}*\n💰 *{{desconto}}% OFF*\n⏰ Válido até: {{data}}\n\n👉 {{link}}`,
    variables: ['nome', 'cupom', 'desconto', 'data', 'link']
  },
  {
    id: 'reengagement',
    name: 'Reengajamento',
    description: 'Traz cliente de volta com oferta especial',
    category: 'marketing',
    content: `👋 *Sentimos sua falta, {{nome}}!*\n\nPreparamos algo especial:\n🏷️ *{{cupom}}* - *{{desconto}}% OFF*\n\nVálido por 3 dias!\n👉 {{link}}`,
    variables: ['nome', 'cupom', 'desconto', 'link']
  },
  {
    id: 'birthday',
    name: 'Aniversário',
    description: 'Parabeniza cliente com desconto especial',
    category: 'marketing',
    content: `🎂 *Feliz Aniversário, {{nome}}!*\n\n🎁 *PARABENS{{idade}}*\n*{{desconto}}% OFF* válido hoje!\n\nComemore com a gente.\n{{link}}`,
    variables: ['nome', 'idade', 'desconto', 'link']
  },
  {
    id: 'abandoned_cart',
    name: 'Abandono de Carrinho',
    description: 'Recupera vendas de carrinhos abandonados',
    category: 'marketing',
    content: `🛒 *Esqueceu algo, {{nome}}?*\n\nItens reservados por 30 min!\n\nUse *{{cupom}}* para *{{desconto}}% OFF*\n👉 {{link}}`,
    variables: ['nome', 'cupom', 'desconto', 'link']
  }
];

export const getTemplateById = (id: string) => whatsappTemplates.find(t => t.id === id);
export const getTemplatesByCategory = (category: WhatsAppTemplate['category']) => 
  whatsappTemplates.filter(t => t.category === category);
