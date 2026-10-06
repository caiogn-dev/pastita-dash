/** Reajuste de preço em massa (server2 7ee4e27). */
import api from './api';

export type Operacao = 'acrescentar' | 'reduzir';
export type Modo = 'valor' | 'percentual';

export interface ItemReajustado {
  id: string;
  nome: string;
  antes: string;
  depois: string;
  avisos: string[];
  variantes: { nome: string; antes: string; depois: string }[];
}

export interface PedidoDeReajuste {
  store: string;
  operacao: Operacao;
  modo: Modo;
  valor: string;
  produtos: string[];
  previa: boolean;
}

export const reajusteDePrecoService = {
  async reajustar(pedido: PedidoDeReajuste): Promise<{ aplicado: boolean; itens: ItemReajustado[] }> {
    const { data } = await api.post('/stores/products/reajuste-de-preco/', pedido);
    return data;
  },
  async desfazer(store: string): Promise<{ desfeitos: string[]; mantidos: string[] }> {
    const { data } = await api.post('/stores/products/reajuste-de-preco/desfazer/', { store });
    return data;
  },
};
