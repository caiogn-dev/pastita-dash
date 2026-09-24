import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { CartaoDeAdicional } from '../CartaoDeAdicional';
import { AdicionalBloqueado } from '../AdicionalBloqueado';
import type { UseAdicional } from '../../../hooks/useAdicional';

const ETIQUETA = {
  key: 'etiqueta_anvisa' as const,
  nome: 'Etiqueta nutricional ANVISA',
  descricao: 'Tabela nutricional pronta para imprimir.',
  inclui: ['Base TACO e POF', 'Alergênicos conforme a RDC 26'],
  implantacao: 390,
  mensal: 79,
  anual: 790,
};

const noop = jest.fn();

describe('CartaoDeAdicional', () => {
  it('disponível: preço do servidor, o que inclui e o botão de contratar', () => {
    const contratar = jest.fn();
    render(<CartaoDeAdicional adicional={ETIQUETA} estado="disponivel" onContratar={contratar} onCancelar={noop} />);
    expect(screen.getByText('Etiqueta nutricional ANVISA')).toBeInTheDocument();
    expect(screen.getByText('R$ 79,00')).toBeInTheDocument();
    expect(screen.getByText(/R\$ 390,00 de implantação/)).toBeInTheDocument();
    expect(screen.getByText('Alergênicos conforme a RDC 26')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Contratar/ }));
    expect(contratar).toHaveBeenCalled();
  });

  it('contratado: selo e botão de cancelar', () => {
    const cancelar = jest.fn();
    render(<CartaoDeAdicional adicional={ETIQUETA} estado="contratado" onContratar={noop} onCancelar={cancelar} />);
    expect(screen.getByText('Contratado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cancelar adicional/ }));
    expect(cancelar).toHaveBeenCalled();
  });

  it('incluso (loja isenta): nem contratar nem cancelar', () => {
    render(<CartaoDeAdicional adicional={ETIQUETA} estado="incluso" onContratar={noop} onCancelar={noop} />);
    expect(screen.getByText('Incluso na sua loja')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('mostra o motivo quando a contratação falha', () => {
    render(
      <CartaoDeAdicional
        adicional={ETIQUETA} estado="disponivel" erro="Assine um plano para contratar o adicional."
        onContratar={noop} onCancelar={noop}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Assine um plano');
  });
});

describe('AdicionalBloqueado', () => {
  const hook = (parcial: Partial<UseAdicional> = {}): UseAdicional => ({
    estado: 'disponivel', liberado: false, adicional: ETIQUETA, ocupado: false, erro: null,
    contratar: jest.fn(), cancelar: jest.fn(), ...parcial,
  });

  it('explica o bloqueio e oferece o mesmo cartão de contratar', () => {
    const etiqueta = hook();
    render(<MemoryRouter><AdicionalBloqueado etiqueta={etiqueta} /></MemoryRouter>);
    expect(screen.getByText(/fazem parte do adicional/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Contratar/ }));
    expect(etiqueta.contratar).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /Ver assinatura/ })).toHaveAttribute('href', '/assinatura');
  });

  it('sem catálogo ainda assim diz o que fazer, sem erro cru', () => {
    render(<MemoryRouter><AdicionalBloqueado etiqueta={hook({ adicional: null })} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Ver assinatura/ })).toBeInTheDocument();
  });
});
