/**
 * Uma decisão, um lugar.
 *
 * O menu da conta tinha "Plano" e "Assinatura": duas telas com o mesmo
 * catálogo, dois desenhos diferentes e dois botões que chamavam endpoints
 * distintos para a mesma coisa. O lojista escolhia com informação diferente
 * dependendo de qual porta tinha usado.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const menu = readFileSync(join(__dirname, '..', 'AccountMenu.tsx'), 'utf8');
const rotas = readFileSync(join(__dirname, '..', '..', '..', 'App.tsx'), 'utf8');

it('o menu da conta tem uma entrada só para plano e cobrança', () => {
  const entradas = menu.match(/href: '\/(plano|assinatura)'/g) || [];
  expect(entradas).toEqual(["href: '/assinatura'"]);
});

it('/plano continua de pé, levando para a tela única', () => {
  expect(rotas).toMatch(/path="plano"[^\n]*Navigate to="\/assinatura"/);
});
