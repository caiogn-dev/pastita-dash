/**
 * 28/10: o som de pedido novo só tocava com o quadro, a cozinha ou o celular
 * abertos — o hook de tempo real era montado por página. No Início ou no
 * inbox o pedido entrava mudo. Agora quem monta é o layout, uma vez só.
 */
import { render } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PedidosAoVivo } from '../PedidosAoVivo';
import { useTempoRealDosPedidos } from '../../../stores/tempoRealDosPedidos';

const mockHook = jest.fn();
jest.mock('../../../hooks/useRealTimeOrders', () => ({
  useRealTimeOrders: (cfg: unknown) => mockHook(cfg),
}));

it('publica o estado da conexão para quem quiser mostrar o selo', () => {
  mockHook.mockReturnValue({ isConnected: true, connectionError: false });
  render(<PedidosAoVivo />);
  expect(useTempoRealDosPedidos.getState()).toMatchObject({ conectado: true, falhou: false });

  mockHook.mockReturnValue({ isConnected: false, connectionError: true });
  render(<PedidosAoVivo />);
  expect(useTempoRealDosPedidos.getState()).toMatchObject({ conectado: false, falhou: true });
});

it('o socket tem um dono só: layout (painel) e cozinha (fora do layout)', () => {
  // Singleton + clearWebSocketInstance no unmount: um segundo consumidor que
  // desmonta derruba o socket de todo mundo.
  const src = join(__dirname, '..', '..', '..');
  const { execSync } = jest.requireActual('child_process') as typeof import('child_process');
  const arquivos = execSync(`grep -rl "useRealTimeOrders(" ${src} --include=*.ts --include=*.tsx`)
    .toString().trim().split('\n')
    .filter((f) => !f.includes('__tests__'))
    .map((f) => f.split('/src/')[1])
    .sort();
  expect(arquivos).toEqual([
    'components/realtime/PedidosAoVivo.tsx',
    'hooks/useRealTimeOrders.ts',
    'pages/kds/KdsPage.tsx',
  ]);
  expect(readFileSync(join(src, 'components/layout/MainLayout.tsx'), 'utf8')).toMatch(/<PedidosAoVivo \/>/);
});
