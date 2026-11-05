import { render, screen } from '@testing-library/react';
import React from 'react';
import { dadosDoApp } from '../pedidoDeApp';
import { MarcaDoApp } from '../../../components/orders/MarcaDoApp';

describe('dadosDoApp', () => {
  it('99: número, quem entrega e códigos', () => {
    expect(dadosDoApp({
      source: '99food',
      metadata: { '99food': {
        numero: '16', quem_entrega: 'entregador da 99', codigo_entrega: '5000', codigo_retirada: '',
        ultimo_erro: 'confirm: 99 recusou',
      } },
    })).toEqual({
      app: '99food', nome: '99Food', numero: 16, rotulo: '99 #16', quemEntrega: 'entregador da 99',
      codigoEntrega: '5000', codigoRetirada: '', erro: 'confirm: 99 recusou',
    });
  });

  it('iFood: mesmo formato, número do iFood', () => {
    const d = dadosDoApp({ source: 'ifood', metadata: { ifood: { numero: 4821 } } });
    expect(d?.app).toBe('ifood');
    expect(d?.rotulo).toBe('iFood #4821');
  });

  it('sem número diz só o nome do app', () => {
    expect(dadosDoApp({ source: '99food', metadata: {} })?.rotulo).toBe('99Food');
    expect(dadosDoApp({ source: 'ifood' })?.rotulo).toBe('iFood');
  });

  it('pedido de outro canal não é de app', () => {
    expect(dadosDoApp({ source: 'web', metadata: { '99food': { numero: 7 } } })).toBeNull();
    expect(dadosDoApp({})).toBeNull();
  });
});

describe('MarcaDoApp', () => {
  it('99 com número', () => {
    render(<MarcaDoApp app="99food" numero={16} />);
    expect(screen.getByRole('img', { name: '99Food' })).toBeInTheDocument();
    expect(screen.getByText('#16')).toBeInTheDocument();
  });

  it('iFood sem número mostra só a marca', () => {
    render(<MarcaDoApp app="ifood" />);
    expect(screen.getByRole('img', { name: 'iFood' })).toBeInTheDocument();
    expect(screen.queryByText(/#/)).toBeNull();
  });
});
