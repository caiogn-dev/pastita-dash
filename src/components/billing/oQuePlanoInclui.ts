/**
 * O que cada plano inclui, em palavras do lojista.
 *
 * Havia duas telas de plano no painel — /plano e /assinatura — e só uma delas
 * dizia o que vinha em cada plano. A outra mostrava só preço e um botão. Quem
 * caía na segunda escolhia às cegas.
 */
import type { Plan } from '../../services/billing';

export interface ItemDoPlano {
  rotulo: string;
  /** `true`/`false` viram ✓/✗; texto aparece como está. */
  valor: string | boolean;
}

export function oQuePlanoInclui(plano: Plan): ItemDoPlano[] {
  const l = plano.limits;
  return [
    {
      rotulo: 'Produtos no cardápio',
      valor: l.max_products === null ? 'Ilimitados' : `Até ${l.max_products}`,
    },
    { rotulo: 'Endereço próprio na internet', valor: l.custom_domain },
    { rotulo: 'Atendimento por WhatsApp', valor: l.whatsapp_bot },
    { rotulo: 'Atendente de IA', valor: l.ai_agent },
  ];
}

/** O texto do botão muda com a situação: assinar, trocar ou nada a fazer. */
export function acaoDoPlano(
  plano: Plan,
  planoAtual: string | null | undefined,
  temAssinatura: boolean,
): { rotulo: string; desabilitado: boolean } {
  if (plano.key === planoAtual) return { rotulo: 'Plano atual', desabilitado: true };
  // "Assinar" num plano gratuito manda o dono para um checkout que não existe.
  // O Grátis não se assina: começa-se nele.
  if (plano.monthly_price === 0) {
    return { rotulo: 'Começar grátis', desabilitado: false };
  }
  return { rotulo: temAssinatura ? 'Mudar para este' : 'Assinar', desabilitado: false };
}
