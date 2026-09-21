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
