/**
 * Quais `{variáveis}` cada mensagem pronta entende — e a prévia com dado real.
 *
 * Até 22/10 o criador oferecia as mesmas 20 variáveis para qualquer evento,
 * mas cada envio no server2 preenche um conjunto diferente: a Cê escreveu
 * {website_url} na mensagem fora de horário e o cliente recebia as chaves
 * cruas. A lista abaixo espelha `apps/automation/variaveis.py`.
 */
import type { AutoMessageEventType, CompanyProfile } from '../types';

export interface VariavelDeMensagem {
  key: string;
  description: string;
}

const LOJA: VariavelDeMensagem[] = [
  { key: 'customer_name', description: 'Nome do cliente' },
  { key: 'company_name', description: 'Nome da loja' },
  { key: 'website_url', description: 'Link do cardápio' },
  { key: 'menu_url', description: 'Link do cardápio' },
  { key: 'business_hours_today', description: 'Horário de hoje' },
];

const CONVERSA: VariavelDeMensagem[] = [
  { key: 'phone_number', description: 'Telefone do cliente' },
];

const CARRINHO: VariavelDeMensagem[] = [
  { key: 'cart_items', description: 'Itens do carrinho' },
  { key: 'cart_total', description: 'Valor do carrinho' },
  { key: 'cart_item_count', description: 'Quantidade de itens' },
];

const PAGAMENTO: VariavelDeMensagem[] = [
  { key: 'order_number', description: 'Número do pedido' },
  { key: 'amount', description: 'Valor' },
  { key: 'pix_code', description: 'PIX copia e cola' },
  { key: 'time_remaining', description: 'Tempo restante' },
];

const PEDIDO: VariavelDeMensagem[] = [
  { key: 'order_number', description: 'Número do pedido' },
  { key: 'primeiro_nome', description: 'Primeiro nome' },
  { key: 'total', description: 'Total do pedido' },
  { key: 'tempo', description: 'Minutos de preparo' },
  { key: 'endereco', description: 'Endereço de entrega' },
  { key: 'entregue_ou_retirado', description: '"entregue" ou "retirado"' },
  { key: 'order_status', description: 'Status do pedido' },
];

export function variaveisDoEvento(evento: AutoMessageEventType | string): VariavelDeMensagem[] {
  let extra = CONVERSA;
  if (evento.startsWith('cart_')) extra = CARRINHO;
  else if (evento.startsWith('pix_') || evento.startsWith('payment_')) extra = PAGAMENTO;
  else if (evento.startsWith('order_')) extra = PEDIDO;
  else if (evento === 'feedback_request') extra = [PEDIDO[0]];
  return [...LOJA, ...extra];
}

type PerfilDaPrevia = Pick<CompanyProfile, 'company_name' | 'store_slug' | 'menu_url' | 'website_url'> & {
  link_do_cardapio?: string;
};

/** Valores da prévia: o link é o da loja; o resto, um cliente de exemplo. */
export function exemploDeVariaveis(perfil: PerfilDaPrevia | null | undefined): Record<string, string> {
  const link =
    perfil?.link_do_cardapio ||
    perfil?.menu_url ||
    perfil?.website_url ||
    (perfil?.store_slug ? `https://cardapidex.com.br/${perfil.store_slug}` : '');
  return {
    customer_name: 'Maria Silva',
    company_name: perfil?.company_name || '',
    website_url: link,
    menu_url: link,
    business_hours_today: '11:00 às 15:00',
    phone_number: '(63) 99999-0000',
    cart_items: '• Salada Caesar x1 = R$ 32,00',
    cart_total: '32,00',
    cart_item_count: '1',
    order_number: 'CE-2610221234',
    amount: '32,00',
    pix_code: '00020126580014br.gov.bcb.pix…',
    time_remaining: '30 minutos',
    primeiro_nome: 'Maria',
    total: '32,00',
    tempo: '40',
    endereco: 'Quadra 110 Sul, Alameda 3, 12',
    entregue_ou_retirado: 'entregue',
    order_status: '🛵 Saiu para entrega',
  };
}

const CHAVE = /\{(\w+)\}/g;

/** Texto como o cliente vai ler + variáveis que esse evento não preenche. */
export function previaDaMensagem(
  texto: string,
  evento: AutoMessageEventType | string,
  valores: Record<string, string>,
): { texto: string; desconhecidas: string[] } {
  const validas = new Set(variaveisDoEvento(evento).map((v) => v.key));
  const desconhecidas: string[] = [];
  const pronto = (texto || '').replace(CHAVE, (inteiro, chave: string) => {
    if (!validas.has(chave)) {
      if (!desconhecidas.includes(chave)) desconhecidas.push(chave);
      return inteiro;
    }
    return valores[chave] ?? '';
  });
  return { texto: pronto, desconhecidas };
}
