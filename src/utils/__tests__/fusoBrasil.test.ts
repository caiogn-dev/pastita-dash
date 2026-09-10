/**
 * O fuso do painel.
 *
 * O CI roda em UTC (é onde estes testes falhariam se o código seguisse o fuso
 * do runtime). Cada caso usa um horário de PAREDE brasileiro (`-03:00`) e prova
 * que a leitura acontece em `America/Sao_Paulo`, não em UTC.
 */
import { FUSO_BRASIL, diaNoFuso, mesmoDiaNoFuso } from '../fusoBrasil';

describe('fuso do painel', () => {
  it('o default é America/Sao_Paulo', () => {
    expect(FUSO_BRASIL).toBe('America/Sao_Paulo');
  });

  describe('diaNoFuso', () => {
    it('lê o dia civil no fuso do Brasil, não em UTC', () => {
      // 21h de 26/08 no Brasil é meia-noite de 27/08 em UTC. O dia é 26.
      expect(diaNoFuso(new Date('2026-08-26T21:00:00-03:00'))).toBe('2026-08-26');
    });

    it('meio-dia do Brasil fica no mesmo dia civil', () => {
      expect(diaNoFuso(new Date('2026-08-27T12:00:00-03:00'))).toBe('2026-08-27');
    });

    it('respeita um fuso explícito quando informado', () => {
      // 21h -03:00 = meia-noite do dia seguinte em UTC.
      expect(diaNoFuso(new Date('2026-08-26T21:00:00-03:00'), 'UTC')).toBe('2026-08-27');
    });
  });

  describe('mesmoDiaNoFuso', () => {
    it('16h e 9h do mesmo dia no Brasil são o mesmo dia', () => {
      expect(mesmoDiaNoFuso(
        new Date('2026-08-27T16:00:00-03:00'),
        new Date('2026-08-27T09:00:00-03:00'),
      )).toBe(true);
    });

    it('21h de ontem NÃO é hoje, mesmo caindo em UTC no dia seguinte', () => {
      expect(mesmoDiaNoFuso(
        new Date('2026-08-27T16:00:00-03:00'),
        new Date('2026-08-26T21:00:00-03:00'),
      )).toBe(false);
    });
  });
});
