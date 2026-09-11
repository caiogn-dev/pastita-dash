import { mesmoDiaNoFuso, horaNoFuso, FUSO_DE_NEGOCIO } from '../fusoDeNegocio';

/**
 * O painel é operado no Brasil, mas o "dia" de trabalho e o horário de cada
 * marco do pedido não podem depender do fuso do DISPOSITIVO: um celular em
 * viagem, mal configurado, ou o runner de CI em UTC fariam a coluna de
 * finalizados arrastar o pedido entregue às 21h de ontem para hoje, e a régua
 * de status mostrar 10:29 onde a loja fechou às 07:29. O dia e a hora são do
 * NEGÓCIO (fuso fixo), não de quem está olhando.
 */
describe('fuso de negócio', () => {
  it('a constante é o fuso comercial do Brasil', () => {
    expect(FUSO_DE_NEGOCIO).toBe('America/Sao_Paulo');
  });

  describe('mesmoDiaNoFuso', () => {
    it('21h de ontem (horário de Brasília) não é o mesmo dia que hoje de tarde', () => {
      // 2026-08-26 21:00 -03:00 == 2026-08-27 00:00 UTC: em UTC parece "hoje".
      const ontemTarde = new Date('2026-08-26T21:00:00-03:00');
      const hojeTarde = new Date('2026-08-27T16:00:00-03:00');
      expect(mesmoDiaNoFuso(ontemTarde, hojeTarde)).toBe(false);
    });

    it('manhã e tarde do mesmo dia no fuso do negócio são o mesmo dia', () => {
      expect(
        mesmoDiaNoFuso(
          new Date('2026-08-27T09:00:00-03:00'),
          new Date('2026-08-27T16:00:00-03:00'),
        ),
      ).toBe(true);
    });

    it('00:30 UTC ainda é o dia anterior no fuso do negócio', () => {
      // 2026-08-27 00:30 UTC == 2026-08-26 21:30 -03:00.
      expect(
        mesmoDiaNoFuso(
          new Date('2026-08-27T00:30:00Z'),
          new Date('2026-08-26T18:00:00-03:00'),
        ),
      ).toBe(true);
    });
  });

  describe('horaNoFuso', () => {
    it('formata a hora no fuso do negócio, não no do dispositivo', () => {
      // 07:29 -03:00 == 10:29 UTC; deve sair "07:29" seja qual for o fuso do runner.
      expect(horaNoFuso(new Date('2026-09-09T07:29:00-03:00'))).toBe('07:29');
    });

    it('usa relógio de 24h', () => {
      expect(horaNoFuso(new Date('2026-09-09T20:05:00-03:00'))).toBe('20:05');
    });
  });
});
