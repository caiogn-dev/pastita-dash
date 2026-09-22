import { nomeDoPlano } from '../nomeDoPlano';

const catalogo = [
  { key: 'free', name: 'Grátis' },
  { key: 'starter', name: 'Loja' },
  { key: 'pro', name: 'Loja + WhatsApp' },
  { key: 'premium', name: 'Rede' },
];

it('usa o nome do catálogo, não um apelido da tela', () => {
  expect(nomeDoPlano('pro', catalogo)).toBe('Loja + WhatsApp');
  expect(nomeDoPlano('starter', catalogo)).toBe('Loja');
});

it('catálogo ainda vazio não mostra a chave crua', () => {
  expect(nomeDoPlano('starter', [])).toBe('Starter');
});

it('sem plano, não inventa texto', () => {
  expect(nomeDoPlano(null, catalogo)).toBe('');
});
