/**
 * A leitura humana das indicações.
 *
 * Nasceu da pergunta do dono que a tela de cashback não respondia: "a
 * Elisangela quis indicar, mas como vou saber quem veio pela Elisangela?". O
 * painel mostrava só um total somado — "saldo de indicação: R$ 12,40" — que
 * não permite agradecer ninguém nem perceber abuso.
 */

export interface IndicadorAgregado {
  phone: string;
  nome: string;
  total_indicados: number;
  total_creditado: string;
}

export interface IndicacaoRow {
  id: string;
  indicador_phone: string;
  indicador_nome: string;
  amigo_nome: string;
  amigo_phone: string;
  pedido: string;
  pedido_total: string;
  valor: string;
  data: string;
}

/** 5563999547790 → (63) 99954-7790. Telefone cru não se lê num relance. */
export function telefoneLegivel(e164: string): string {
  const d = (e164 || '').replace(/\D/g, '').replace(/^55/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return e164 || '';
}

/**
 * Quem indica muitas vezes AINDA NÃO É CLIENTE — indicou antes de comprar —,
 * e aí a loja não tem nome dele. O telefone legível é a identificação de
 * verdade nesse caso: é por ele que o dono manda o obrigado no WhatsApp.
 */
export function rotuloDoIndicador(i: { phone: string; nome: string }): string {
  if (i.nome) return i.nome;
  if (i.phone) return telefoneLegivel(i.phone);
  return 'Sem identificação';
}

export function rotuloDoAmigo(r: { amigo_nome: string; amigo_phone: string }): string {
  if (r.amigo_nome) return r.amigo_nome;
  if (r.amigo_phone) return telefoneLegivel(r.amigo_phone);
  return 'Sem identificação';
}

/**
 * Por QUANTAS PESSOAS trouxe, não por quanto custou.
 *
 * A pergunta desta tela é "quem são meus divulgadores". Ordenar por dinheiro
 * colocaria na frente quem trouxe um cliente de ticket alto uma vez, e não
 * quem traz gente toda semana — que é a pessoa a quem a loja quer ligar.
 */
export function ordenarIndicadores(linhas: IndicadorAgregado[]): IndicadorAgregado[] {
  return [...linhas].sort(
    (a, b) =>
      b.total_indicados - a.total_indicados
      || Number(b.total_creditado || 0) - Number(a.total_creditado || 0),
  );
}
