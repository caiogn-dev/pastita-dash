/**
 * O aviso de endereço divergente tem que aparecer — e calar quando não há o quê.
 *
 * O backend já detecta a divergência (pedido CE-2608140823: texto na 110 Sul,
 * pin na 706 Sul, 5,15 km) e grava em `metadata.endereco_divergente`. Sem esta
 * tela, o dado existe e ninguém vê — e o entregador sai mesmo assim.
 */
import { render, screen } from '@testing-library/react';

import { AvisoEnderecoDivergente, lerDivergencia } from '../AvisoEnderecoDivergente';

const BARBARA = {
  endereco_divergente: {
    digitado: '110 sul',
    pin: '706 sul',
    lat: -10.2298952,
    lng: -48.3205388,
    aviso: 'O cliente escreveu "110 sul" mas o pin do mapa cai em "706 sul".',
  },
};

describe('AvisoEnderecoDivergente', () => {
  it('mostra as DUAS leituras — para onde ir e para onde não ir', () => {
    render(<AvisoEnderecoDivergente metadata={BARBARA} />);

    expect(screen.getByText('110 sul')).toBeInTheDocument();
    expect(screen.getByText('706 sul')).toBeInTheDocument();
  });

  it('avisa que a taxa saiu do pin — é o dinheiro cobrado a mais', () => {
    render(<AvisoEnderecoDivergente metadata={BARBARA} />);

    expect(screen.getByTestId('aviso-endereco-divergente')).toHaveTextContent(
      /taxa de entrega foi calculada pelo pin/i,
    );
  });

  it('é um alerta de verdade, não nota de rodapé', () => {
    render(<AvisoEnderecoDivergente metadata={BARBARA} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('oferece o mapa do pin para conferir', () => {
    render(<AvisoEnderecoDivergente metadata={BARBARA} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('-10.2298952,-48.3205388'),
    );
  });
});

describe('quando NÃO deve aparecer', () => {
  it('pedido normal não mostra nada', () => {
    const { container } = render(<AvisoEnderecoDivergente metadata={{ origem: 'whatsapp' }} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('sem metadata não mostra nada', () => {
    const { container } = render(<AvisoEnderecoDivergente />);

    expect(container).toBeEmptyDOMElement();
  });

  it('divergência pela metade não vira alarme vago', () => {
    // "endereço suspeito" sem dizer por quê é pior que silêncio: a loja não
    // tem o que fazer com a informação.
    const { container } = render(
      <AvisoEnderecoDivergente metadata={{ endereco_divergente: { digitado: '110 sul' } }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('sem coordenada, não oferece link quebrado', () => {
    render(
      <AvisoEnderecoDivergente
        metadata={{ endereco_divergente: { digitado: '110 sul', pin: '706 sul' } }}
      />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('lerDivergencia — metadata é campo livre', () => {
  it.each([null, undefined, 'texto', 42, [], {}])('não quebra com %p', (lixo) => {
    expect(lerDivergencia(lixo)).toBeNull();
  });

  it('devolve a divergência quando ela está completa', () => {
    expect(lerDivergencia(BARBARA)?.pin).toBe('706 sul');
  });
});
