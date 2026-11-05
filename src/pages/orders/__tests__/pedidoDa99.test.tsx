import { seloDa99 } from '../pedidoDa99';

describe('seloDa99', () => {
  it('pedido da 99 mostra o número que o entregador e o app da 99 usam', () => {
    expect(seloDa99({ source: '99food', metadata: { '99food': { numero: 7 } } })).toBe('99 #7');
  });

  it('sem número ainda diz que é da 99', () => {
    expect(seloDa99({ source: '99food', metadata: {} })).toBe('99Food');
  });

  it('pedido de outro canal não tem selo', () => {
    expect(seloDa99({ source: 'web', metadata: { '99food': { numero: 7 } } })).toBeNull();
    expect(seloDa99({})).toBeNull();
  });
});

import { render, screen } from '@testing-library/react';
import React from 'react';
import { dadosDa99 } from '../pedidoDa99';
import { Marca99 } from '../../../components/orders/Marca99';

describe('dadosDa99', () => {
  it('junta número, quem entrega e os códigos que o entregador pede', () => {
    expect(dadosDa99({
      source: '99food',
      metadata: { '99food': {
        numero: '16', quem_entrega: 'entregador da 99', codigo_entrega: '5000', codigo_retirada: '',
        ultimo_erro: 'confirm: 99 recusou',
      } },
    })).toEqual({
      numero: 16, rotulo: '99 #16', quemEntrega: 'entregador da 99',
      codigoEntrega: '5000', codigoRetirada: '', erro: 'confirm: 99 recusou',
    });
  });

  it('pedido de outro canal não tem dados da 99', () => {
    expect(dadosDa99({ source: 'web' })).toBeNull();
  });
});

describe('Marca99', () => {
  it('tem nome acessível e mostra o número quando houver', () => {
    render(<Marca99 numero={16} />);
    expect(screen.getByRole('img', { name: '99Food' })).toBeInTheDocument();
    expect(screen.getByText('#16')).toBeInTheDocument();
  });

  it('sem número mostra só a marca', () => {
    render(<Marca99 />);
    expect(screen.queryByText(/#/)).toBeNull();
  });
});
