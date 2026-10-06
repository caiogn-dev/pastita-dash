/**
 * Zonas de preço fixo de entrega — do formulário para `metadata.fixed_price_zones`.
 *
 * O recurso existe e funciona no backend desde sempre (`geo/service.py` casa o
 * endereço reverso contra as palavras-chave da zona). Em 08/ago/2026 nenhuma
 * das lojas tinha o campo preenchido, porque a única forma de configurar era
 * editar JSON direto no banco. Recurso que só o programador consegue ligar é,
 * na prática, recurso desligado.
 *
 * DOIS MODOS, porque são duas situações reais:
 *
 * - PREÇO FIXO: condomínio longe onde a conta por km daria caro demais e o
 *   dono prefere um valor combinado. Substitui a taxa.
 * - ACRÉSCIMO: prédio fechado onde o entregador perde 10 minutos na portaria.
 *   Soma à taxa por km em vez de substituí-la.
 *
 * A validação aqui não é burocracia: zona sem taxa casa o endereço e devolve
 * frete R$ 0,00 no checkout, e taxa negativa vira desconto silencioso.
 */
export type ModoDeZona = 'fixo' | 'acrescimo';

export interface ZonaNoFormulario {
  nome: string;
  taxa: string;
  palavras?: string;
  modo?: ModoDeZona;
  acrescimo?: string;
  // Regras de região (só no modo fixo) — ver `regioes_de_entrega.py`.
  categorias?: string[];
  pedidoMinimo?: string;
  diaSeguinte?: boolean;
  diasSemEntrega?: number[];
  soAntecipado?: boolean;
}

export interface ZonaNoMetadata {
  name: string;
  fee?: number;
  keywords?: string[];
  surcharge_on_km?: boolean;
  surcharge?: number;
  categorias?: string[];
  pedido_minimo?: number;
  entrega_dia_seguinte?: boolean;
  dias_sem_entrega?: number[];
  so_pagamento_antecipado?: boolean;
}

/**
 * "12,50" → 12.5. Aqui se digita com vírgula.
 *
 * Campo vazio vira NaN, e NÃO zero: `Number('')` é 0 em JS, e por causa disso
 * uma zona salva sem taxa passaria na validação e cobraria frete R$ 0,00 do
 * cliente. A diferença entre "não preenchi" e "é de graça" precisa sobreviver
 * à conversão.
 */
function numero(valor: string | undefined): number {
  const texto = String(valor ?? '').replace(',', '.').trim();
  if (!texto) return NaN;
  const n = Number(texto);
  return Number.isFinite(n) ? n : NaN;
}

export function validarZona(z: ZonaNoFormulario): string | null {
  if (!z.nome?.trim()) return 'Dê um nome à zona — ele também é usado para reconhecer o endereço.';

  const modo = z.modo ?? 'fixo';

  if (modo === 'acrescimo') {
    const extra = numero(z.acrescimo);
    if (!Number.isFinite(extra) || extra < 0) return 'Informe quanto somar à taxa (não pode ser negativo).';
    return null;
  }

  if ((z.pedidoMinimo ?? '').trim()) {
    const minimo = numero(z.pedidoMinimo);
    if (!Number.isFinite(minimo) || minimo < 0) return 'Pedido mínimo inválido.';
  }
  // Com os 7 dias bloqueados a região aceita pedido e nunca tem dia de entrega.
  if (z.diaSeguinte && new Set(z.diasSemEntrega ?? []).size >= 7) {
    return 'Deixe pelo menos um dia de entrega.';
  }

  const taxa = numero(z.taxa);
  // Sem taxa a zona casa o endereço e devolve `fee` indefinido — o cliente
  // fecha o pedido com frete R$ 0,00 e a loja paga a entrega.
  if (!Number.isFinite(taxa)) return 'Informe a taxa fixa desta zona.';
  // Frete negativo vira desconto silencioso no total do pedido.
  if (taxa < 0) return 'A taxa não pode ser negativa.';
  return null;
}

export function zonaParaMetadata(z: ZonaNoFormulario): ZonaNoMetadata {
  const palavras = (z.palavras ?? '')
    .split(',')
    .map((p) => p.trim())
    // Palavra vazia casaria com QUALQUER endereço: string vazia está contida
    // em todas. É a diferença entre uma zona e um frete fixo para a cidade
    // inteira.
    .filter(Boolean);

  const base: ZonaNoMetadata = { name: z.nome.trim() };
  if (palavras.length) base.keywords = palavras;

  if ((z.modo ?? 'fixo') === 'acrescimo') {
    base.surcharge_on_km = true;
    base.surcharge = numero(z.acrescimo);
    return base;
  }

  // Número, não string: o backend soma e compara esse valor, e `"15" + 3`
  // em JS vira `"153"`.
  base.fee = numero(z.taxa);

  // Só grava o que foi ligado: zona de condomínio continua igual a antes.
  if (z.categorias?.length) base.categorias = [...z.categorias];
  const minimo = numero(z.pedidoMinimo);
  if (Number.isFinite(minimo) && minimo > 0) base.pedido_minimo = minimo;
  if (z.diaSeguinte) {
    base.entrega_dia_seguinte = true;
    if (z.diasSemEntrega?.length) base.dias_sem_entrega = [...z.diasSemEntrega].sort();
  }
  if (z.soAntecipado) base.so_pagamento_antecipado = true;
  return base;
}

export function zonasDoMetadata(bruto: unknown): ZonaNoFormulario[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter((z): z is ZonaNoMetadata => Boolean(z) && typeof z === 'object')
    .map((z) => ({
      nome: String(z.name ?? ''),
      taxa: z.fee != null ? String(z.fee) : '',
      palavras: (z.keywords ?? []).join(', '),
      modo: z.surcharge_on_km ? ('acrescimo' as const) : ('fixo' as const),
      acrescimo: z.surcharge != null ? String(z.surcharge) : '',
      categorias: (z.categorias ?? []).map(String),
      pedidoMinimo: z.pedido_minimo != null ? String(z.pedido_minimo) : '',
      diaSeguinte: Boolean(z.entrega_dia_seguinte),
      diasSemEntrega: (z.dias_sem_entrega ?? []).map(Number),
      soAntecipado: Boolean(z.so_pagamento_antecipado),
    }));
}
