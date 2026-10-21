import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SugestoesDeCombos from '../SugestoesDeCombos';
import { ajudasDoCadastro, comboDaSugestao } from '../../../../services/ajudasDoCadastro';

jest.mock('../../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  getErrorMessage: (e: { response?: { data?: { error?: string } } }) => e?.response?.data?.error ?? String(e),
}));
jest.mock('../../../../services/ajudasDoCadastro', () => ({
  ...jest.requireActual('../../../../services/ajudasDoCadastro'),
  ajudasDoCadastro: { sugestoesDeCombos: jest.fn() },
}));
const ajuda = ajudasDoCadastro as unknown as Record<string, jest.Mock>;

const SUGESTAO = {
  produtos: [{ id: 'a', nome: 'Salada', preco: 30 }, { id: 'b', nome: 'Suco', preco: 10 }],
  pedidos_juntos: 4, preco_somado: 40, preco_sugerido: 36,
};

describe('SugestoesDeCombos', () => {
  it('lista o par e Montar entrega a sugestão', async () => {
    ajuda.sugestoesDeCombos.mockResolvedValue([SUGESTAO]);
    const onMontar = jest.fn();
    render(<SugestoesDeCombos storeSlug="ce" onMontar={onMontar} />);
    await screen.findByText(/Salada \+ Suco/);
    expect(screen.getByText('4 pedidos')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Montar' }));
    expect(onMontar).toHaveBeenCalledWith(SUGESTAO);
  });

  it('sem sugestão (ou se a busca falhar) não desenha nada', async () => {
    ajuda.sugestoesDeCombos.mockRejectedValue(new Error('caiu'));
    const { container } = render(<SugestoesDeCombos storeSlug="ce" onMontar={jest.fn()} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });
});

describe('comboDaSugestao', () => {
  it('vira um combo com um item fixo por produto e o preço sugerido', () => {
    const combo = comboDaSugestao(SUGESTAO);
    expect(combo.name).toBe('Salada + Suco');
    expect(combo.price).toBe(36);
    expect(combo.compare_at_price).toBe(40);
    expect(combo.groups?.map((g) => [g.min_selections, g.max_selections, g.product_options?.[0].product_id]))
      .toEqual([[1, 1, 'a'], [1, 1, 'b']]);
  });
});
