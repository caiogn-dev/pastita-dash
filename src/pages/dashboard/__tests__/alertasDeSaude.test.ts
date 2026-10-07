import { itensDeSaude } from '../alertasDeSaude';

const ir = jest.fn();

beforeEach(() => ir.mockClear());

it('sem alerta, nenhum item — a seção some quando não há nada esperando', () => {
  expect(itensDeSaude([], 'loja-x', ir)).toEqual([]);
});

it('entrega sem endereço leva para onde se marca a loja no mapa', () => {
  const [item] = itensDeSaude([{ key: 'entrega_sem_endereco', quantidade: 1 }], 'loja-x', ir);
  expect(item.titulo).toBe('Entrega ligada sem o endereço da loja');
  item.acao!.onClick();
  expect(ir).toHaveBeenCalledWith('/stores/loja-x/settings');
});

it('produto a R$ 0 diz quantos e leva aos produtos', () => {
  const [item] = itensDeSaude([{ key: 'produto_sem_preco', quantidade: 2 }], 'loja-x', ir);
  expect(item.titulo).toBe('2 produtos à venda por R$ 0,00');
  expect(item.valor).toBe('2');
  item.acao!.onClick();
  expect(ir).toHaveBeenCalledWith('/stores/loja-x/products');
});

it('singular quando é um só', () => {
  const [item] = itensDeSaude([{ key: 'produto_escondido', quantidade: 1 }], 'loja-x', ir);
  expect(item.titulo).toBe('1 produto à venda escondido do cardápio');
});

it('alerta que o painel ainda não conhece é ignorado, não quebra a tela', () => {
  expect(itensDeSaude([{ key: 'novo_alerta_do_backend', quantidade: 1 }], 'loja-x', ir)).toEqual([]);
});
