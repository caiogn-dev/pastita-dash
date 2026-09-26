/**
 * Situação do agente de impressão, como a tela de Impressão mostra.
 *
 * A faixa no quadro de pedidos e o aviso por WhatsApp foram retirados em
 * 26/09 a pedido do dono; ficou só o rótulo e o "desde quando" na tela.
 */
import { ROTULO_DA_SITUACAO, TOM_DA_SITUACAO, desdeQuando } from '../situacaoDaImpressora';

const AGORA = new Date('2026-09-24T23:30:00Z'); // 20:30 em Brasília

describe('desdeQuando', () => {
  it('no mesmo dia mostra só a hora', () => {
    expect(desdeQuando('2026-09-24T22:00:00Z', AGORA)).toBe('19:00');
  });

  it('em outro dia mostra dia e hora', () => {
    expect(desdeQuando('2026-09-22T22:00:00Z', AGORA)).toBe('22/09 19:00');
  });

  it('sem data ou com data inválida não mostra nada', () => {
    expect(desdeQuando(null, AGORA)).toBeNull();
    expect(desdeQuando('lixo', AGORA)).toBeNull();
  });
});

describe('rótulo e tom da situação', () => {
  it('cada situação tem rótulo para o lojista e um tom', () => {
    for (const situacao of ['ok', 'offline', 'impressora_indisponivel'] as const) {
      expect(ROTULO_DA_SITUACAO[situacao]).toBeTruthy();
      expect(TOM_DA_SITUACAO[situacao]).toBeTruthy();
    }
    expect(TOM_DA_SITUACAO.impressora_indisponivel).toBe('danger');
  });
});
