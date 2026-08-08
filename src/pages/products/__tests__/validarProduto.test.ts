/**
 * Validação do produto sabe EM QUE ABA está o problema.
 *
 * O formulário tem seis abas (Básico, Preços, Estoque, Variações, Mídia, SEO) e
 * validava assim:
 *
 *     if (formData.price <= 0) { toast.error('Preço deve ser maior que zero'); return; }
 *
 * O preço mora na aba Preços. Se você estava em Mídia quando clicou em salvar,
 * aparecia um toast vermelho sobre uma aba onde não há campo de preço nenhum,
 * some em quatro segundos, e a tela fica exatamente como estava. O usuário
 * clica salvar de novo, dá o mesmo toast, e conclui que o botão está quebrado.
 *
 * Devolvendo a ABA junto do erro, a interface pode pular para lá e marcar a
 * aba — o problema deixa de ser uma mensagem e vira um lugar.
 */
import { validarProduto } from '../validarProduto';

const ok = {
  name: 'Salada Caesar',
  price: 29.9,
} as never;

describe('validarProduto', () => {
  it('produto válido não gera erro', () => {
    expect(validarProduto(ok)).toEqual([]);
  });

  it('nome vazio aponta para a aba Básico', () => {
    const [erro] = validarProduto({ ...ok, name: '   ' } as never);
    expect(erro.aba).toBe('basic');
    expect(erro.campo).toBe('name');
    expect(erro.mensagem).toMatch(/nome/i);
  });

  it('preço zerado aponta para a aba Preços', () => {
    // É este o caso que gerava o toast órfão.
    const [erro] = validarProduto({ ...ok, price: 0 } as never);
    expect(erro.aba).toBe('pricing');
    expect(erro.campo).toBe('price');
  });

  it('preço negativo também é inválido', () => {
    expect(validarProduto({ ...ok, price: -5 } as never)).toHaveLength(1);
  });

  it('preço promocional acima do preço cheio é erro', () => {
    // "De R$ 20 por R$ 30" é um desconto negativo: o storefront mostraria um
    // selo de promoção que ENCARECE. Passava direto, porque só o preço base
    // era conferido.
    const [erro] = validarProduto({ ...ok, price: 20, compare_at_price: 15 } as never);
    expect(erro.aba).toBe('pricing');
    expect(erro.campo).toBe('compare_at_price');
  });

  it('preço promocional igual ao preço não é promoção, mas não bloqueia', () => {
    // Chato, não errado. Bloquear aqui impediria salvar por um detalhe que o
    // dono pode estar ajustando em duas etapas.
    expect(validarProduto({ ...ok, price: 20, compare_at_price: 20 } as never)).toEqual([]);
  });

  it('vários erros vêm juntos, e o primeiro é o da aba mais à esquerda', () => {
    // Pular para a última aba com erro faria o usuário voltar. A ordem das
    // abas é a ordem de leitura do formulário.
    const erros = validarProduto({ name: '', price: 0 } as never);
    expect(erros.map((e) => e.aba)).toEqual(['basic', 'pricing']);
  });

  it('estoque negativo aponta para a aba Estoque', () => {
    const [erro] = validarProduto({ ...ok, track_stock: true, stock_quantity: -3 } as never);
    expect(erro.aba).toBe('inventory');
  });

  it('estoque negativo sem controle de estoque não importa', () => {
    // Sem `track_stock` o campo é ignorado pelo backend — bloquear seria
    // exigir conserto de um dado que não é usado.
    expect(validarProduto({ ...ok, track_stock: false, stock_quantity: -3 } as never)).toEqual([]);
  });
});
