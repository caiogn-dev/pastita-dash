/**
 * Valida o produto dizendo EM QUE ABA está cada problema.
 *
 * O formulário tem seis abas e validava com `toast.error('Preço deve ser maior
 * que zero')`. O preço mora na aba Preços; se você estivesse em Mídia ao
 * clicar em salvar, aparecia um toast vermelho sobre uma aba sem campo de
 * preço, ele sumia em quatro segundos, e a tela ficava idêntica. O usuário
 * clica de novo, mesmo toast, e conclui que o botão está quebrado.
 *
 * Devolvendo a aba junto do erro, a interface pula para lá e marca a aba: o
 * problema deixa de ser uma mensagem e vira um lugar.
 *
 * A ordem dos erros segue a ordem das abas, não a ordem em que se descobre o
 * problema — pular para a última aba com erro faria o usuário voltar.
 */
import type { StoreProductInput as ProductInput } from '../../services/storesApi';

export type AbaDoProduto = 'basic' | 'pricing' | 'inventory' | 'variants' | 'media' | 'seo';

export interface ErroDeProduto {
  aba: AbaDoProduto;
  campo: string;
  mensagem: string;
}

/** Mesma ordem das abas na tela. */
const ORDEM: AbaDoProduto[] = ['basic', 'pricing', 'inventory', 'variants', 'media', 'seo'];

export function validarProduto(dados: ProductInput): ErroDeProduto[] {
  const erros: ErroDeProduto[] = [];

  if (!String(dados.name ?? '').trim()) {
    erros.push({ aba: 'basic', campo: 'name', mensagem: 'O nome do produto é obrigatório.' });
  }

  const preco = Number(dados.price);
  if (!Number.isFinite(preco) || preco <= 0) {
    erros.push({
      aba: 'pricing',
      campo: 'price',
      mensagem: 'O preço precisa ser maior que zero.',
    });
  }

  // "De R$ 20 por R$ 30" é desconto negativo: a vitrine mostraria um selo de
  // promoção que ENCARECE. Passava direto, porque só o preço base era conferido.
  const de = dados.compare_at_price;
  if (de !== undefined && de !== null && String(de) !== '') {
    const precoDe = Number(de);
    if (Number.isFinite(precoDe) && precoDe > 0 && precoDe < preco) {
      erros.push({
        aba: 'pricing',
        campo: 'compare_at_price',
        mensagem: 'O preço "de" precisa ser maior que o preço de venda — senão a promoção encarece o produto.',
      });
    }
  }

  // Sem `track_stock` o backend ignora a quantidade: exigir conserto de um
  // dado que não é usado só trava quem quer salvar.
  if (dados.track_stock && Number(dados.stock_quantity) < 0) {
    erros.push({
      aba: 'inventory',
      campo: 'stock_quantity',
      mensagem: 'O estoque não pode ser negativo.',
    });
  }

  return erros.sort((a, b) => ORDEM.indexOf(a.aba) - ORDEM.indexOf(b.aba));
}

export default validarProduto;
