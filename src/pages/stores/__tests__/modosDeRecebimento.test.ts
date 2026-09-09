/**
 * Como o cliente recebe: entrega, retirada, ou os dois.
 *
 * Os campos `delivery_enabled` / `pickup_enabled` existem no banco desde
 * sempre e o storefront já os respeita (`DeliveryBar.jsx`), mas só o wizard de
 * onboarding os escrevia — uma vez, na criação. Depois disso o dono não tinha
 * como mudar de ideia.
 */
import { aoAlternarModo, resumoDosModos } from '../modosDeRecebimento';

describe('alternar', () => {
  it('desliga a entrega e mantém a retirada', () => {
    expect(aoAlternarModo({ delivery: true, pickup: true }, 'delivery', false))
      .toEqual({ delivery: false, pickup: true });
  });

  it('religa a entrega', () => {
    expect(aoAlternarModo({ delivery: false, pickup: true }, 'delivery', true))
      .toEqual({ delivery: true, pickup: true });
  });

  it('RECUSA deixar a loja sem nenhum modo', () => {
    // Sem entrega e sem retirada, o cardápio fica no ar sem forma de receber:
    // o cliente monta o carrinho e descobre no fim que não dá.
    expect(aoAlternarModo({ delivery: false, pickup: true }, 'pickup', false)).toBeNull();
    expect(aoAlternarModo({ delivery: true, pickup: false }, 'delivery', false)).toBeNull();
  });

  it('desligar o que já está desligado não é erro', () => {
    expect(aoAlternarModo({ delivery: false, pickup: true }, 'delivery', false))
      .toEqual({ delivery: false, pickup: true });
  });
});

describe('resumo para o dono', () => {
  it('diz o que o cliente vê em cada combinação', () => {
    expect(resumoDosModos({ delivery: true, pickup: true }))
      .toBe('O cliente escolhe entre entrega e retirada.');
    expect(resumoDosModos({ delivery: true, pickup: false }))
      .toBe('Só entrega. A retirada não aparece no cardápio.');
    expect(resumoDosModos({ delivery: false, pickup: true }))
      .toBe('Só retirada. A entrega não aparece no cardápio.');
  });

  it('estado impossível não trava a tela', () => {
    expect(resumoDosModos({ delivery: false, pickup: false }))
      .toBe('Nenhuma forma de receber está ligada — o cliente não consegue fechar o pedido.');
  });
});
