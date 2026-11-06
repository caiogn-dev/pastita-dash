import { linhaDoCanal } from '../linhaDoCanal';

describe('linhaDoCanal', () => {
  it('99Food mostra a venda de cardápio e o que caiu na conta', () => {
    const linha = linhaDoCanal({
      channel: '99food', orders: 6, revenue: 258.76, avg_ticket: 43.13,
      recebido: 158.42, comissao_taxas: 100.34, desconto_plataforma: 120, conciliados: 6,
    });
    expect(linha.label).toBe('99Food');
    expect(linha.value).toBe(258.76);
    expect(linha.sub).toMatch(/6 pedidos/);
    expect(linha.sub).toMatch(/recebido R\$\s?158,42/);
  });

  it('99Food sem extrato importado não inventa recebido', () => {
    const linha = linhaDoCanal({ channel: '99food', orders: 2, revenue: 80, avg_ticket: 40, recebido: 0, conciliados: 0 });
    expect(linha.sub).not.toMatch(/recebido/);
  });

  it('extrato parcial avisa quantos pedidos o recebido cobre', () => {
    const linha = linhaDoCanal({ channel: '99food', orders: 6, revenue: 258.76, avg_ticket: 43.13, recebido: 17.62, conciliados: 1 });
    expect(linha.sub).toMatch(/recebido R\$\s?17,62 \(1 de 6\)/);
  });

  it('canal da casa continua igual', () => {
    const linha = linhaDoCanal({ channel: 'bot', orders: 3, revenue: 90, avg_ticket: 30 });
    expect(linha.label).toBe('Bot WhatsApp');
    expect(linha.sub).not.toMatch(/recebido/);
  });
});
