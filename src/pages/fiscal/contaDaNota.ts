/**
 * A conta da nota — que é a conta do pedido.
 *
 * O formulário de emissão edita o PEDIDO (itens, frete, desconto, acréscimo)
 * e a nota sai dele. Em 19/10 a Ivoneth ampliou um coffee break de 50 para 60
 * pessoas e não tinha onde pôr isso na nota: lançou um acréscimo solto, a soma
 * dos itens não bateu com o pagamento e a SEFAZ recusou.
 */
import type { OrderAdjustPayload, OrderItemOp } from '../../types';
import type { PedidoParaNota } from '../../services/fiscal';

export interface LinhaDaNota {
  /** Chave da linha na tela; o id do item quando ele já existe no pedido. */
  chave: string;
  itemId?: string;
  productId?: string;
  nome: string;
  quantidade: number;
  /** Texto: o campo aceita vírgula e fica vazio enquanto se digita. */
  valor: string;
  doCardapio: boolean;
  removida?: boolean;
}

export interface ValoresEditaveis {
  frete: string;
  desconto: string;
  acrescimo: string;
}

export const dinheiro = (texto: string | number | undefined | null): number => {
  const n = Number(String(texto ?? '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

export const linhasDoPedido = (pedido: PedidoParaNota): LinhaDaNota[] =>
  (pedido.itens ?? []).map((item) => ({
    chave: item.id,
    itemId: item.id,
    nome: item.nome,
    quantidade: item.quantidade,
    valor: item.valor_unitario,
    doCardapio: item.do_cardapio,
  }));

export const valoresDoPedido = (pedido: PedidoParaNota): ValoresEditaveis => ({
  frete: pedido.valores?.frete ?? '0.00',
  desconto: pedido.valores?.desconto ?? '0.00',
  acrescimo: pedido.valores?.acrescimo ?? '0.00',
});

export interface Conta {
  itens: number;
  frete: number;
  desconto: number;
  acrescimo: number;
  taxaDoVale: number;
  total: number;
}

/** Mesma fórmula do servidor (recalculate_totals), com piso em zero. */
export const calcularConta = (
  linhas: LinhaDaNota[], valores: ValoresEditaveis, taxaDoVale = 0,
): Conta => {
  const itens = linhas
    .filter((l) => !l.removida)
    .reduce((soma, l) => soma + dinheiro(l.valor) * l.quantidade, 0);
  const conta = {
    itens: Math.round(itens * 100) / 100,
    frete: dinheiro(valores.frete),
    desconto: dinheiro(valores.desconto),
    acrescimo: dinheiro(valores.acrescimo),
    taxaDoVale,
  };
  const total = conta.itens - conta.desconto + conta.frete + conta.acrescimo + taxaDoVale;
  return { ...conta, total: Math.max(0, Math.round(total * 100) / 100) };
};

/** O que falta para a nota sair, por linha. Vazio = pode emitir. */
export const problemasDasLinhas = (linhas: LinhaDaNota[]): Record<string, string> => {
  const problemas: Record<string, string> = {};
  for (const l of linhas) {
    if (l.removida) continue;
    if (!l.nome.trim()) problemas[l.chave] = 'Informe o nome';
    else if (dinheiro(l.valor) <= 0) problemas[l.chave] = 'Informe o valor';
  }
  return problemas;
};

/**
 * O pedido de ajuste que leva a tela para o pedido. `null` quando nada mudou —
 * aí a nota sai direto, sem tocar no pedido.
 */
export const ajusteDoPedido = (
  pedido: PedidoParaNota, linhas: LinhaDaNota[], valores: ValoresEditaveis,
): OrderAdjustPayload | null => {
  const originais = new Map((pedido.itens ?? []).map((i) => [i.id, i]));
  const ops: OrderItemOp[] = [];

  for (const l of linhas) {
    const original = l.itemId ? originais.get(l.itemId) : undefined;
    if (original) {
      if (l.removida) {
        ops.push({ op: 'remove', item_id: original.id });
        continue;
      }
      const nome = l.nome.trim();
      const valor = dinheiro(l.valor);
      const mudouPreco = valor !== dinheiro(original.valor_unitario);
      const mudouNome = nome !== original.nome;
      if (mudouPreco || mudouNome || l.quantidade !== original.quantidade) {
        ops.push({
          op: 'update', item_id: original.id, quantity: l.quantidade,
          ...(mudouPreco ? { unit_price: valor } : {}),
          ...(mudouNome ? { name: nome } : {}),
        });
      }
    } else if (!l.removida) {
      ops.push(l.productId
        ? { op: 'add', product_id: l.productId, quantity: l.quantidade }
        : { op: 'add_custom', name: l.nome.trim(), quantity: l.quantidade, unit_price: dinheiro(l.valor) });
    }
  }

  const ajuste: OrderAdjustPayload = {};
  const antes = valoresDoPedido(pedido);
  if (dinheiro(valores.frete) !== dinheiro(antes.frete)) ajuste.delivery_fee = dinheiro(valores.frete);
  if (dinheiro(valores.desconto) !== dinheiro(antes.desconto)) ajuste.discount = dinheiro(valores.desconto);
  if (dinheiro(valores.acrescimo) !== dinheiro(antes.acrescimo)) ajuste.surcharge_value = dinheiro(valores.acrescimo);
  if (ops.length) ajuste.item_ops = ops;

  return Object.keys(ajuste).length ? ajuste : null;
};
