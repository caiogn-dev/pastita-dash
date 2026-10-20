import { filtrarPedidosDoQuadro } from '../buscaNoQuadro';

// Auditoria 20/10: no pico, achar o "#1234" ou o pedido de quem ligou exigia
// varrer as cinco colunas com os olhos.
const pedidos = [
  { id: '1', order_number: 'CE-2610201234', customer_name: 'Maria Souza', customer_phone: '5563999881234' },
  { id: '2', order_number: 'CE-2610205678', customer_name: 'João Lima', customer_phone: '63 98877-6655' },
  { id: '3', order_number: 'CE-2610209999', customer_name: '', customer_phone: '' },
];
const ids = (busca: string) => filtrarPedidosDoQuadro(pedidos, busca).map((p) => p.id);

describe('filtrarPedidosDoQuadro', () => {
  it('vazio devolve tudo', () => expect(ids('  ')).toEqual(['1', '2', '3']));
  it('pelo fim do número, com ou sem #', () => {
    expect(ids('1234')).toEqual(['1']);
    expect(ids('#5678')).toEqual(['2']);
  });
  it('pelo nome, sem acento e sem caixa', () => expect(ids('joao')).toEqual(['2']));
  it('pelo telefone, com qualquer máscara', () => expect(ids('98877-66')).toEqual(['2']));
  it('número curto não casa com telefone por acaso', () => expect(ids('99')).toEqual(['3']));
});
