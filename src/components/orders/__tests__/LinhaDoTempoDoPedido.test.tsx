/**
 * A linha do tempo do pedido: cada etapa com a HORA em que aconteceu.
 *
 * Duas perguntas que o lojista faz quando o cliente reclama — "onde está?" e
 * "quanto tempo ficou em cada lugar?". A régua só respondia a primeira.
 */
import { render, screen, within } from '@testing-library/react';

import { LinhaDoTempoDoPedido, etapasDaLinhaDoTempo } from '../LinhaDoTempoDoPedido';

// Horários em UTC; o painel mostra no fuso de negócio (America/Sao_Paulo, -3h).
const ENTREGUE = {
  status: 'delivered',
  delivery_method: 'delivery' as const,
  created_at: '2026-09-24T22:00:00Z',
  confirmed_at: '2026-09-24T22:02:00Z',
  preparing_at: '2026-09-24T22:05:00Z',
  ready_at: '2026-09-24T22:25:00Z',
  out_for_delivery_at: '2026-09-24T22:30:00Z',
  delivered_at: '2026-09-24T22:50:00Z',
};

describe('etapasDaLinhaDoTempo', () => {
  it('entrega percorre as seis etapas, na ordem', () => {
    expect(etapasDaLinhaDoTempo(ENTREGUE).map((e) => e.rotulo)).toEqual([
      'Solicitado',
      'Confirmado',
      'Em preparo',
      'Pronto',
      'Saiu para entrega',
      'Entregue',
    ]);
  });

  it('retirada no balcão não mostra a etapa de entrega', () => {
    const rotulos = etapasDaLinhaDoTempo({
      status: 'ready',
      delivery_method: 'pickup',
      created_at: ENTREGUE.created_at,
    }).map((e) => e.rotulo);
    expect(rotulos).toEqual(['Solicitado', 'Confirmado', 'Em preparo', 'Pronto', 'Retirado']);
    expect(rotulos).not.toContain('Saiu para entrega');
    expect(rotulos).not.toContain('Entregue');
  });

  it('pedido entregue: todas concluídas, cada uma com a sua hora', () => {
    const etapas = etapasDaLinhaDoTempo(ENTREGUE);
    expect(etapas.every((e) => e.estado === 'concluida')).toBe(true);
    expect(etapas.map((e) => e.hora)).toEqual(['19:00', '19:02', '19:05', '19:25', '19:30', '19:50']);
  });

  it('pedido em preparo: o que passou está concluído, o preparo é o atual, o resto espera', () => {
    const etapas = etapasDaLinhaDoTempo({
      status: 'preparing',
      delivery_method: 'delivery',
      created_at: ENTREGUE.created_at,
      confirmed_at: ENTREGUE.confirmed_at,
      preparing_at: ENTREGUE.preparing_at,
    });
    expect(etapas.map((e) => e.estado)).toEqual([
      'concluida',
      'concluida',
      'atual',
      'futura',
      'futura',
      'futura',
    ]);
    expect(etapas[3].hora).toBeNull();
  });

  it('status sem carimbo de hora ainda avança a linha — o status manda na posição', () => {
    const etapas = etapasDaLinhaDoTempo({
      status: 'ready',
      delivery_method: 'delivery',
      created_at: ENTREGUE.created_at,
    });
    expect(etapas[3]).toMatchObject({ rotulo: 'Pronto', estado: 'atual' });
    expect(etapas[1]).toMatchObject({ estado: 'concluida', hora: null });
  });

  it('cancelado mostra a etapa cancelada em vermelho no ponto em que parou', () => {
    const etapas = etapasDaLinhaDoTempo({
      status: 'cancelled',
      delivery_method: 'delivery',
      created_at: ENTREGUE.created_at,
      confirmed_at: ENTREGUE.confirmed_at,
      cancelled_at: '2026-09-24T22:10:00Z',
    });
    expect(etapas.map((e) => e.rotulo)).toEqual(['Solicitado', 'Confirmado', 'Cancelado']);
    expect(etapas[2]).toMatchObject({ estado: 'cancelada', hora: '19:10' });
  });

  it('cancelado antes de qualquer confirmação para logo depois do Solicitado', () => {
    const etapas = etapasDaLinhaDoTempo({
      status: 'cancelled',
      delivery_method: 'pickup',
      created_at: ENTREGUE.created_at,
    });
    expect(etapas.map((e) => e.rotulo)).toEqual(['Solicitado', 'Cancelado']);
    expect(etapas[1].hora).toBeNull();
  });

  it('retirada concluída usa o carimbo de retirada', () => {
    const etapas = etapasDaLinhaDoTempo({
      status: 'delivered',
      delivery_method: 'pickup',
      created_at: ENTREGUE.created_at,
      ready_at: ENTREGUE.ready_at,
      picked_up_at: '2026-09-24T22:40:00Z',
    });
    expect(etapas[4]).toMatchObject({ rotulo: 'Retirado', estado: 'concluida', hora: '19:40' });
  });
});

describe('<LinhaDoTempoDoPedido />', () => {
  it('é uma lista ordenada com a hora de cada etapa', () => {
    render(<LinhaDoTempoDoPedido pedido={ENTREGUE} />);
    const lista = screen.getByRole('list', { name: /andamento do pedido/i });
    const itens = within(lista).getAllByRole('listitem');
    expect(itens).toHaveLength(6);
    expect(itens[0]).toHaveTextContent('Solicitado');
    expect(itens[0]).toHaveTextContent('19:00');
    expect(itens[5]).toHaveTextContent('Entregue');
    expect(itens[5]).toHaveTextContent('19:50');
  });

  it('vertical no celular, horizontal a partir do sm', () => {
    render(<LinhaDoTempoDoPedido pedido={ENTREGUE} />);
    const lista = screen.getByRole('list', { name: /andamento do pedido/i });
    expect(lista.className).toMatch(/\bflex-col\b/);
    expect(lista.className).toMatch(/\bsm:flex-row\b/);
  });

  it('marca a etapa atual para leitor de tela', () => {
    render(<LinhaDoTempoDoPedido pedido={{ ...ENTREGUE, status: 'preparing', ready_at: null, out_for_delivery_at: null, delivered_at: null }} />);
    expect(screen.getByText('Em preparo').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('a etapa cancelada é pintada com a cor de perigo', () => {
    render(
      <LinhaDoTempoDoPedido
        pedido={{ status: 'cancelled', delivery_method: 'delivery', created_at: ENTREGUE.created_at, cancelled_at: '2026-09-24T22:10:00Z' }}
      />,
    );
    const item = screen.getByText('Cancelado').closest('li')!;
    expect(item.innerHTML).toMatch(/--danger/);
    expect(item).toHaveTextContent('19:10');
  });
});
