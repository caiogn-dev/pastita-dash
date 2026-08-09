/**
 * A Central de Pedidos vive na barra do topo e abre em aba própria.
 *
 * É a tela que fica aberta o expediente inteiro: o operador acompanha os
 * pedidos nela enquanto usa o resto do painel para cadastrar produto,
 * responder cliente, conferir caixa. Navegar para dentro dela pelo menu
 * significa perder o lugar toda vez.
 *
 * Fica na NAVBAR, não no menu lateral: o menu é para navegar dentro do
 * painel; isto é abrir a estação de trabalho. São gestos diferentes, e o
 * de abrir a estação acontece uma vez por turno.
 *
 * DUAS REGRAS:
 *
 * 1. O contrato é VISÍVEL. Link que rouba para outra aba sem avisar é um dos
 *    incômodos clássicos de web; com o ícone de "abre fora" e o texto para
 *    leitor de tela, vira escolha.
 *
 * 2. Sempre guia NOVA (`_blank`). A primeira versão usava uma aba nomeada
 *    para reaproveitar a já aberta, e o link passou a navegar na própria aba:
 *    basta a aba do painel receber esse nome — o que acontece assim que
 *    alguém volta ao painel dentro da aba da Central — para todo clique
 *    seguinte virar navegação comum.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { CentralDePedidosLink } from '../CentralDePedidosLink';

describe('Central de Pedidos', () => {
  it('aponta para o painel de pedidos da loja atual', () => {
    render(<CentralDePedidosLink storeSlug="minha-loja" />);
    expect(screen.getByRole('link', { name: /Central de Pedidos/ }))
      .toHaveAttribute('href', '/stores/minha-loja/orders');
  });

  it('abre sempre em guia nova, nunca na atual', () => {
    // Aba nomeada era imprevisível: quando o painel passava a rodar na aba
    // com aquele nome, o link virava navegação comum.
    render(<CentralDePedidosLink storeSlug="minha-loja" />);
    const link = screen.getByRole('link', { name: /Central de Pedidos/ });
    expect(link).toHaveAttribute('target', '_blank');
    // `noopener`: sem isso a aba nova recebe `window.opener` e consegue
    // manipular a aba de origem.
    expect(link.getAttribute('rel')).toMatch(/noopener/);
  });

  it('avisa que abre fora — para quem vê e para quem ouve', () => {
    render(<CentralDePedidosLink storeSlug="minha-loja" />);
    expect(screen.getByRole('link', { name: /Central de Pedidos/ }))
      .toHaveAccessibleName(/nova aba/i);
  });

  it('sem loja escolhida não aparece', () => {
    // Levaria a /stores//orders — uma tela de erro no meio do expediente.
    const { container } = render(<CentralDePedidosLink storeSlug={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
