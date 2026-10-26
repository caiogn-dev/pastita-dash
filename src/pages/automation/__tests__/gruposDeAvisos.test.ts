/**
 * Avisos automáticos agrupados pelo momento da compra (26/10).
 *
 * Antes: 31 seções empilhadas, uma por evento, todas abertas mesmo vazias, em
 * Title Case. "Perguntas frequentes" brigava com Ensinar o bot e os lembretes
 * de carrinho moravam longe do Recuperador, que é onde eles fazem sentido.
 */
jest.mock('../../../services/api', () => ({ __esModule: true, default: {} }));

import { eventTypeLabels } from '../../../services/automation';
import {
  GRUPOS_DO_ATENDIMENTO,
  GRUPO_DO_CARRINHO,
  esperaEmTexto,
  idDoBotao,
  ondeEditar,
} from '../gruposDeAvisos';

const eventosDoAtendimento = GRUPOS_DO_ATENDIMENTO.flatMap((g) => g.eventos);

it('três grupos na tela de avisos: Conversa, Pedido, Pagamento', () => {
  expect(GRUPOS_DO_ATENDIMENTO.map((g) => g.titulo)).toEqual(['Conversa', 'Pedido', 'Pagamento']);
});

it('perguntas frequentes e carrinho não aparecem na tela de avisos', () => {
  expect(eventosDoAtendimento).not.toContain('faq');
  expect(eventosDoAtendimento.filter((e) => e.startsWith('cart_'))).toEqual([]);
});

it('o carrinho é um grupo à parte, com todos os eventos cart_*', () => {
  const carrinho = Object.keys(eventTypeLabels).filter((e) => e.startsWith('cart_'));
  expect([...GRUPO_DO_CARRINHO.eventos].sort()).toEqual(carrinho.sort());
});

it('todo evento, menos faq, mora em exatamente um grupo', () => {
  const todos = [...eventosDoAtendimento, ...GRUPO_DO_CARRINHO.eventos];
  const esperado = Object.keys(eventTypeLabels).filter((e) => e !== 'faq');
  expect([...todos].sort()).toEqual(esperado.sort());
  expect(new Set(todos).size).toBe(todos.length);
});

it('rótulos em frase, não em Title Case', () => {
  expect(eventTypeLabels.out_of_hours).toBe('Fora do horário');
  expect(eventTypeLabels.order_preparing).toBe('Pedido em preparo');
  for (const rotulo of Object.values(eventTypeLabels)) {
    const palavras = rotulo.split(/\s+/).slice(1);
    // Depois da primeira, nenhuma palavra começa com maiúscula (PIX é sigla).
    expect(palavras.filter((p) => /^[A-ZÀ-Ú][a-zà-ú]/.test(p))).toEqual([]);
  }
});

it('espera aparece em minutos', () => {
  expect(esperaEmTexto(0)).toBe('');
  expect(esperaEmTexto(1800)).toBe('Espera 30 min');
  expect(esperaEmTexto(90)).toBe('Espera 1,5 min');
  expect(esperaEmTexto(7200)).toBe('Espera 2 h');
});

it('id do botão sai do título, sem repetir', () => {
  expect(idDoBotao('Ver cardápio', [])).toBe('ver_cardapio');
  expect(idDoBotao('Ver cardápio', ['ver_cardapio'])).toBe('ver_cardapio_2');
  expect(idDoBotao('  ', [])).toBe('botao');
});

it('aviso que não chegou leva para onde se edita o texto', () => {
  expect(ondeEditar('pix_reminder')).toEqual({ aba: 'textos', foco: 'pix_reminder' });
  expect(ondeEditar('feedback_request')).toEqual({ aba: 'textos', foco: 'feedback_request' });
  expect(ondeEditar('status')).toEqual({ aba: 'textos', foco: 'pedido' });
  expect(ondeEditar('cart_reminder')).toEqual({ href: '/marketing/recuperacao#lembretes-de-carrinho' });
  expect(ondeEditar('session_cart_reminder')).toEqual({ href: '/marketing/recuperacao#lembretes-de-carrinho' });
  // Reengajamento não é texto editável aqui: sem ação, em vez de um link que leva a nada.
  expect(ondeEditar('reengagement')).toBeNull();
  expect(ondeEditar('faq')).toBeNull();
});
