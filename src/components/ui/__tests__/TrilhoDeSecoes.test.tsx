/**
 * Trilho de seções: chips com contagem, fixo no topo, para pular entre as
 * partes de uma página longa. 06/10: o dono sentiu falta no Cardápio — 20
 * categorias e só um seletor que FILTRAVA, sem navegar.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TrilhoDeSecoes } from '../TrilhoDeSecoes';

const ITENS = [
  { id: 'saladas', rotulo: 'Saladas', contador: 7 },
  { id: 'bebidas', rotulo: 'Bebidas', contador: 12 },
];

it('mostra cada seção com a contagem', () => {
  render(<TrilhoDeSecoes itens={ITENS} ativo={null} onEscolher={() => undefined} rotulo="Categorias" />);
  expect(screen.getByRole('navigation', { name: 'Categorias' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /saladas.*7/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /bebidas.*12/i })).toBeInTheDocument();
});

it('marca a seção ativa', () => {
  render(<TrilhoDeSecoes itens={ITENS} ativo="bebidas" onEscolher={() => undefined} rotulo="Categorias" />);
  expect(screen.getByRole('button', { name: /bebidas/i })).toHaveAttribute('aria-current', 'true');
  expect(screen.getByRole('button', { name: /saladas/i })).not.toHaveAttribute('aria-current');
});

it('tocar escolhe a seção', () => {
  const onEscolher = jest.fn();
  render(<TrilhoDeSecoes itens={ITENS} ativo={null} onEscolher={onEscolher} rotulo="Categorias" />);
  fireEvent.click(screen.getByRole('button', { name: /bebidas/i }));
  expect(onEscolher).toHaveBeenCalledWith('bebidas');
});
