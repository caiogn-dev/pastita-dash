/**
 * Por que o bot parou, dito para o lojista — nunca o código do backend.
 */
import { fraseDoMotivo, rotuloDoMotivo, rotuloDoPasso } from '../motivoDoModoHumano';

const agora = Date.parse('2026-09-26T12:00:00Z');
const motivo = (codigo: string, extra: Record<string, unknown> = {}) => ({
  codigo, texto: '', desde: '2026-09-26T11:48:00Z', ...extra,
}) as never;

describe('rotuloDoMotivo', () => {
  it.each([
    ['pediu_atendente', 'Cliente pediu atendente'],
    ['bot_nao_entendeu', 'O bot não entendeu o cliente'],
    ['eco_do_celular', 'Alguém respondeu pelo WhatsApp do celular'],
    ['atendente_assumiu', 'Um atendente assumiu a conversa'],
  ])('%s', (codigo, texto) => {
    expect(rotuloDoMotivo(motivo(codigo))).toBe(texto);
  });

  it('"outro" usa o texto do backend', () => {
    expect(rotuloDoMotivo(motivo('outro', { texto: 'Pedido grande' }))).toBe('Pedido grande');
  });

  it('código desconhecido sem texto não mostra o código cru', () => {
    expect(rotuloDoMotivo(motivo('xyz_novo'))).toBe('Atendimento humano');
  });

  it('resposta antiga (motivo em texto) passa como veio', () => {
    expect(rotuloDoMotivo('Respondido pelo WhatsApp do celular')).toBe('Respondido pelo WhatsApp do celular');
  });

  it('sem motivo', () => {
    expect(rotuloDoMotivo(null)).toBe('Atendimento humano');
  });
});

describe('fraseDoMotivo', () => {
  it('junta o motivo com há quanto tempo', () => {
    expect(fraseDoMotivo(motivo('pediu_atendente'), agora)).toBe('Cliente pediu atendente há 12 min');
  });

  it('sem data, só o motivo', () => {
    expect(fraseDoMotivo(motivo('bot_nao_entendeu', { desde: null }), agora)).toBe('O bot não entendeu o cliente');
  });

  it('acabou de acontecer', () => {
    expect(fraseDoMotivo(motivo('pediu_atendente', { desde: '2026-09-26T11:59:40Z' }), agora)).toBe('Cliente pediu atendente agora');
  });
});

describe('rotuloDoPasso', () => {
  it.each([
    ['endereco', 'Parou pedindo o endereço'],
    ['observacao', 'Parou pedindo observações'],
    ['pagamento', 'Parou na forma de pagamento'],
  ])('%s', (passo, texto) => {
    expect(rotuloDoPasso(passo as never)).toBe(texto);
  });

  it('nenhum passo = nada a dizer', () => {
    expect(rotuloDoPasso('nenhum')).toBeNull();
    expect(rotuloDoPasso(undefined)).toBeNull();
  });
});
