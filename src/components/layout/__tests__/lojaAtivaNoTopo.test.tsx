/**
 * Telas sem loja no endereço (Relatórios, Marketing, Atendimento) mostram no
 * topo de qual loja são os números — quem tem várias lojas não precisa abrir
 * a coluna para saber.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { LojaAtivaNoTopo } from '../LojaAtivaNoTopo';
import { useRootStore } from '../../../stores/rootStore';

const LOJAS = [
  { id: 'u-pastita', slug: 'pastita', name: 'Pastita' },
  { id: 'u-ce', slug: 'ce-saladas', name: 'Cê Saladas' },
];

function montar(caminho: string, stores = LOJAS, selecionada = 'u-ce') {
  useRootStore.setState({ stores, selectedStoreId: selecionada } as never);
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <LojaAtivaNoTopo />
    </MemoryRouter>,
  );
}

describe('LojaAtivaNoTopo', () => {
  it.each(['/analytics/vendas', '/marketing/whatsapp', '/atendimento/avisos-automaticos', '/inbox/whatsapp', '/'])(
    'em %s mostra o nome da loja ativa',
    (caminho) => {
      montar(caminho);
      expect(screen.getByText('Cê Saladas')).toBeInTheDocument();
    },
  );

  it('sob /stores/<slug> não repete (a loja já está no endereço e no seletor)', () => {
    const { container } = montar('/stores/ce-saladas/products');
    expect(container).toBeEmptyDOMElement();
  });

  it('com uma loja só não aparece', () => {
    const { container } = montar('/analytics/vendas', [LOJAS[1]]);
    expect(container).toBeEmptyDOMElement();
  });
});
