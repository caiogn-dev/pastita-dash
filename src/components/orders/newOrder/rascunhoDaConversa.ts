/**
 * Rascunho do Novo Pedido montado a partir do que o bot já juntou na conversa.
 *
 * O atendente assume a conversa com o carrinho meio pronto e, sem isto,
 * redigitava tudo: nome, telefone, endereço e cada item. Aqui o contexto do
 * bot vira o estado inicial do wizard — o atendente só revisa.
 *
 * Item que não casa com nenhum produto não some: vai para as observações,
 * senão o pedido sai menor do que a cliente pediu e ninguém percebe.
 */
import type { Product } from '../../../services/products';
import type { ContextoDoBot } from '../../../services/atendimentoBot';
import type { CartItem } from './types';

export interface RascunhoDePedido {
  cliente: { nome: string; telefone: string };
  entrega: 'delivery' | 'pickup';
  endereco: string;
  itens: CartItem[];
  observacoes: string;
  naoAchados: string[];
}

const normalizar = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function acharProduto(nome: string, produtos: Product[]): Product | null {
  const alvo = normalizar(nome);
  if (!alvo) return null;
  const exato = produtos.find((p) => normalizar(p.name) === alvo);
  if (exato) return exato;
  const parciais = produtos.filter((p) => {
    const n = normalizar(p.name);
    return n.includes(alvo) || alvo.includes(n);
  });
  // Dois candidatos é chute: melhor deixar para o atendente do que errar o item.
  return parciais.length === 1 ? parciais[0] : null;
}

function textoDoEndereco(bruto: unknown): string {
  if (typeof bruto === 'string') return bruto.trim();
  if (!bruto || typeof bruto !== 'object') return '';
  const e = bruto as Record<string, unknown>;
  for (const chave of ['texto', 'formatted', 'formatted_address', 'label']) {
    if (typeof e[chave] === 'string' && (e[chave] as string).trim()) return (e[chave] as string).trim();
  }
  const s = (k: string) => (typeof e[k] === 'string' || typeof e[k] === 'number' ? String(e[k]).trim() : '');
  const rua = [s('street'), s('number')].filter(Boolean).join(', ');
  return [rua, s('complement'), s('neighborhood'), s('city')].filter(Boolean).join(' - ');
}

function tipoDeEntrega(bruto: unknown): 'delivery' | 'pickup' {
  if (bruto === false) return 'pickup';
  const t = normalizar(typeof bruto === 'string' ? bruto : '');
  return ['pickup', 'retirada', 'retirar', 'balcao'].includes(t) ? 'pickup' : 'delivery';
}

export function montarRascunho(
  contexto: ContextoDoBot,
  produtos: Product[],
  daConversa?: { nome?: string | null; telefone?: string | null },
): RascunhoDePedido {
  const carrinho = contexto.carrinho ?? {};
  const cliente = contexto.cliente ?? {};

  const itens: CartItem[] = [];
  const naoAchados: string[] = [];
  for (const item of carrinho.itens ?? []) {
    const quantidade = Math.max(1, Math.round(Number(item.quantidade) || 1));
    const produto = acharProduto(item.nome, produtos);
    if (!produto) {
      naoAchados.push(`${quantidade}× ${item.nome}`);
      continue;
    }
    const ja = itens.find((i) => i.product.id === produto.id);
    if (ja) ja.quantity += quantidade;
    else itens.push({ product: produto, quantity: quantidade });
  }

  const observacoes = [
    (carrinho.notas || '').trim(),
    naoAchados.length ? `Pedido no chat e não achado no cardápio: ${naoAchados.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  return {
    cliente: {
      nome: (cliente.nome || daConversa?.nome || '').trim(),
      telefone: (cliente.telefone || daConversa?.telefone || '').replace(/\D/g, ''),
    },
    entrega: tipoDeEntrega(carrinho.entrega),
    endereco: textoDoEndereco(carrinho.endereco),
    itens,
    observacoes,
    naoAchados,
  };
}

/** Lê o rascunho do `location.state` da navegação, sem confiar no formato. */
export function rascunhoDoEstado(state: unknown): RascunhoDePedido | null {
  const r = (state as { rascunhoDoPedido?: RascunhoDePedido } | null)?.rascunhoDoPedido;
  if (!r || typeof r !== 'object' || !r.cliente || !Array.isArray(r.itens)) return null;
  return r;
}
