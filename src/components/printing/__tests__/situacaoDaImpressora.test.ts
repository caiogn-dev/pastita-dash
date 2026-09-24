/**
 * A faixa do quadro de pedidos quando a impressão para.
 *
 * O dono só descobria que a cozinha não imprimia quando o cliente ligava
 * perguntando do pedido. O backend agora diz a situação de cada agente; a
 * faixa traduz para uma frase e escolhe a cor.
 */
import { alertasDeImpressora, type AgenteComSituacao } from '../situacaoDaImpressora';

const AGORA = new Date('2026-09-24T23:30:00Z'); // 20:30 em Brasília

const agente = (p: Partial<AgenteComSituacao>): AgenteComSituacao => ({
  id: 'a1',
  name: 'Caixa',
  station: 'kitchen',
  is_active: true,
  situacao: 'ok',
  situacao_desde: null,
  situacao_detalhe: '',
  ...p,
});

describe('alertasDeImpressora', () => {
  it('tudo ok: nenhuma faixa', () => {
    expect(alertasDeImpressora([agente({})], AGORA)).toEqual([]);
  });

  it('impressora indisponível é vermelha, com a hora e o detalhe', () => {
    const [alerta] = alertasDeImpressora(
      [
        agente({
          situacao: 'impressora_indisponivel',
          situacao_desde: '2026-09-24T22:00:00Z',
          situacao_detalhe: 'EPSON TM-T20 não responde — 10 impressões presas no Windows',
        }),
      ],
      AGORA,
    );
    expect(alerta.tom).toBe('perigo');
    expect(alerta.texto).toBe(
      'Impressora da cozinha parada desde 19:00 — EPSON TM-T20 não responde — 10 impressões presas no Windows',
    );
  });

  it('agente offline é amarelo', () => {
    const [alerta] = alertasDeImpressora(
      [agente({ situacao: 'offline', situacao_desde: '2026-09-24T22:00:00Z', situacao_detalhe: 'Computador sem sinal' })],
      AGORA,
    );
    expect(alerta.tom).toBe('aviso');
    expect(alerta.texto).toBe('Impressora da cozinha parada desde 19:00 — Computador sem sinal');
  });

  it('balcão fala "do balcão"; sem hora nem detalhe, a frase não fica pendurada', () => {
    const [alerta] = alertasDeImpressora([agente({ station: 'balcao', situacao: 'offline' })], AGORA);
    expect(alerta.texto).toBe('Impressora do balcão parada');
  });

  it('parada desde outro dia mostra a data junto', () => {
    const [alerta] = alertasDeImpressora(
      [agente({ situacao: 'offline', situacao_desde: '2026-09-22T22:00:00Z' })],
      AGORA,
    );
    expect(alerta.texto).toBe('Impressora da cozinha parada desde 22/09 19:00');
  });

  it('o vermelho vem antes do amarelo', () => {
    const alertas = alertasDeImpressora(
      [
        agente({ id: 'a1', situacao: 'offline' }),
        agente({ id: 'a2', station: 'balcao', situacao: 'impressora_indisponivel' }),
      ],
      AGORA,
    );
    expect(alertas.map((a) => a.tom)).toEqual(['perigo', 'aviso']);
  });

  it('agente desativado ou sem a situação (backend antigo) não acende faixa', () => {
    expect(
      alertasDeImpressora(
        [agente({ is_active: false, situacao: 'offline' }), agente({ id: 'a2', situacao: undefined })],
        AGORA,
      ),
    ).toEqual([]);
  });
});
