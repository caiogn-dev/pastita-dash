/**
 * O quadro de pedidos baixava os 500 mais recentes (~570 KB) para mostrar só
 * os em aberto e os entregues de hoje — 182 vezes, 85 MB em 7 dias (06/10).
 * O backend recorta com `?quadro=1` (server2 0e3a29e); o quadro tem que pedir.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path') as typeof import('path');

const fonte = fs.readFileSync(path.resolve(__dirname, '../OrdersPage.tsx'), 'utf8');

describe('quadro de pedidos', () => {
  it('carrega a lista com quadro: 1', () => {
    const chamadas = fonte.match(/getOrders\(\{[^}]*\}\)/g) || [];
    expect(chamadas.length).toBeGreaterThan(0);
    for (const chamada of chamadas) expect(chamada).toMatch(/quadro:\s*1/);
  });
});
