/**
 * A ordem dos elementos da barra do topo.
 *
 * Antes a barra misturava dois assuntos sem separação: o logo da loja ficava
 * na ponta esquerda e o nome da MESMA loja ("Cê Saladas") na ponta direita,
 * separados por 800px de vazio — a mesma informação duas vezes, e nenhum dos
 * dois lados com significado próprio.
 *
 * A regra que organiza tudo é DE QUEM É CADA COISA:
 *
 *   ESQUERDA  o contexto da LOJA — qual loja, se está no ar, sua central
 *   DIREITA   as ferramentas da PESSOA — busca, tema, avisos, conta
 *
 * Quem opera pergunta "estou na loja certa?" olhando para um lugar só, e
 * "onde mexo no meu perfil?" olhando para o outro. Sem essa divisão, cada
 * pergunta obriga a varrer a barra inteira.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ordemDaNavbar, GRUPOS_DA_NAVBAR } from '../ordemDaNavbar';

describe('ordemDaNavbar', () => {
  it('separa o que é da loja do que é da pessoa', () => {
    const { esquerda, direita } = ordemDaNavbar();
    expect(esquerda).toContain('loja');
    expect(esquerda).toContain('central');
    expect(direita).toContain('conta');
    expect(direita).toContain('busca');
  });

  it('a identidade da loja vem antes de tudo à esquerda', () => {
    // É a primeira coisa que se lê e a que define o significado do resto da
    // tela: um número de faturamento sem saber de qual loja não vale nada.
    expect(ordemDaNavbar().esquerda[0]).toBe('loja');
  });

  it('a Central vem logo depois da loja, não no meio das ferramentas', () => {
    // É ação da loja, não do usuário. No meio de tema e notificações ela
    // viraria mais um ícone utilitário.
    const { esquerda } = ordemDaNavbar();
    expect(esquerda.indexOf('central')).toBe(esquerda.indexOf('loja') + 1);
  });

  it('a conta é o último item da direita', () => {
    // Convenção de toda web: o avatar mora na ponta. Quebrar isso custa uma
    // busca visual em cada sessão.
    const { direita } = ordemDaNavbar();
    expect(direita[direita.length - 1]).toBe('conta');
  });

  it('nenhum elemento aparece nos dois lados', () => {
    // Duplicar era exatamente o defeito: logo da loja à esquerda e nome da
    // mesma loja à direita.
    const { esquerda, direita } = ordemDaNavbar();
    expect(esquerda.filter((e) => direita.includes(e))).toEqual([]);
  });

  it('cada grupo declara o que é seu — a regra fica no código, não na cabeça', () => {
    for (const g of Object.values(GRUPOS_DA_NAVBAR)) {
      expect(g.dono).toMatch(/loja|pessoa/);
      expect(g.porque.length).toBeGreaterThan(10);
    }
  });
});
