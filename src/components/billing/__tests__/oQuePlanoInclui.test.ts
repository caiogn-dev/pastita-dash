import { acaoDoPlano, oQuePlanoInclui } from '../oQuePlanoInclui';
import type { Plan } from '../../../services/billing';

const plano = {
  key: 'pro', name: 'Loja + WhatsApp', setup_fee: 0, monthly_price: 99,
  limits: { max_products: null, custom_domain: true, whatsapp_bot: true, ai_agent: false },
} as unknown as Plan;

it('diz o que vem no plano, sem jargão de limite', () => {
  expect(oQuePlanoInclui(plano)).toEqual([
    { rotulo: 'Produtos no cardápio', valor: 'Ilimitados' },
    { rotulo: 'Endereço próprio na internet', valor: true },
    { rotulo: 'Atendimento por WhatsApp', valor: true },
    { rotulo: 'Atendente de IA', valor: false },
  ]);
});

it('limite numérico aparece como "Até N"', () => {
  const limitado = { ...plano, limits: { ...plano.limits, max_products: 30 } } as Plan;
  expect(oQuePlanoInclui(limitado)[0].valor).toBe('Até 30');
});

it('o botão fala a língua da situação', () => {
  expect(acaoDoPlano(plano, 'pro', true)).toEqual({ rotulo: 'Plano atual', desabilitado: true });
  expect(acaoDoPlano(plano, 'free', true)).toEqual({ rotulo: 'Mudar para este', desabilitado: false });
  expect(acaoDoPlano(plano, null, false)).toEqual({ rotulo: 'Assinar', desabilitado: false });
});

// ── 22/09: a tela estava feia, e parte da feiura era texto errado ───────────

describe('o plano Grátis não promete o que não existe', () => {
  const gratis = { key: 'free', name: 'Grátis', monthly_price: 0, setup_fee: 0 } as never;

  it('não diz "Assinar" num plano que não tem assinatura', () => {
    // "Assinar" num plano grátis manda o dono para um checkout que não existe.
    const acao = acaoDoPlano(gratis, null, false);
    expect(acao.rotulo).toBe('Começar grátis');
  });

  it('quem já está no Grátis vê que está nele', () => {
    expect(acaoDoPlano(gratis, 'free', false).rotulo).toBe('Plano atual');
  });

  it('plano pago segue como estava', () => {
    const pro = { key: 'pro', name: 'Loja + WhatsApp', monthly_price: 249, setup_fee: 1200 } as never;
    expect(acaoDoPlano(pro, null, false).rotulo).toBe('Assinar');
    expect(acaoDoPlano(pro, 'free', true).rotulo).toBe('Mudar para este');
  });
});
