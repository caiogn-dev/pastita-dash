/**
 * Delivery e pagamento na aba Integrações: 99Food, iFood e Mercado Pago, lidos
 * de GET /stores/integracoes/?store=<loja>.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CanaisDaLoja } from '../CanaisDaLoja';

const get = jest.fn();
const post = jest.fn();
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}));

jest.mock('../LojaNoIfood', () => ({
  __esModule: true,
  LojaNoIfood: ({ storeId }: { storeId: string }) => <div data-testid="loja-no-ifood">{storeId}</div>,
}));

let loja: { storeId: string | null; storeSlug: string | null } = { storeId: 'id-1', storeSlug: 'ce' };
jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => loja,
}));

const ifoodBase = (over: Record<string, unknown> = {}) => ({
  disponivel: false,
  entregas_disponivel: false,
  merchant_id: '',
  conectado: false,
  loja: '',
  erro: '',
  frete_pelo_ifood: false,
  acrescimo_frete: '0.00',
  chamar_entregador: 'manual',
  tempo_preparo_min: 20,
  ...over,
});

const estado = (over: Record<string, unknown> = {}) => ({
  '99food': { ativo: false, ultimo_pedido_em: null, pedidos_30_dias: 0 },
  ifood: ifoodBase(),
  mercado_pago: { conectado: false },
  ...over,
});

const renderizar = () => render(<MemoryRouter><CanaisDaLoja /></MemoryRouter>);
const cartao = (nome: string) => screen.getByRole('heading', { name: nome }).closest('section') as HTMLElement;
const gaveta = () => screen.getByRole('dialog', { name: 'iFood' });
/** A configuração do iFood mora numa gaveta (20/11): abre pelo botão do cartão. */
const abrirGavetaDoIfood = () => {
  fireEvent.click(within(cartao('iFood')).getByRole('button', { name: /Configurar|Conectar/ }));
  return gaveta();
};

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  loja = { storeId: 'id-1', storeSlug: 'ce' };
});

it('pede o estado da loja selecionada', async () => {
  get.mockResolvedValue({ data: estado() });
  renderizar();
  await screen.findByRole('heading', { name: '99Food' });
  expect(get).toHaveBeenCalledWith('/stores/integracoes/', { params: { store: 'id-1' } });
});

it('99Food recebendo mostra os pedidos do mês e leva ao histórico filtrado', async () => {
  get.mockResolvedValue({ data: estado({ '99food': { ativo: true, ultimo_pedido_em: '2026-11-18T12:00:00Z', pedidos_30_dias: 42 } }) });
  renderizar();
  const c = await screen.findByRole('heading', { name: '99Food' }).then(() => cartao('99Food'));
  expect(within(c).getByText('Recebendo pedidos')).toBeInTheDocument();
  expect(within(c).getByText(/42 pedidos em 30 dias/)).toBeInTheDocument();
  expect(within(c).getByRole('link', { name: 'Ver pedidos' })).toHaveAttribute('href', '/stores/ce/orders/historico?canal=99food');
});

it('iFood sem app da plataforma aparece como em breve, sem botão', async () => {
  get.mockResolvedValue({ data: estado() });
  renderizar();
  await screen.findByRole('heading', { name: 'iFood' });
  const c = cartao('iFood');
  expect(within(c).getByText('Em breve')).toBeInTheDocument();
  expect(within(c).queryByRole('button')).toBeNull();
});

it('iFood conectado mostra o nome da loja no iFood', async () => {
  get.mockResolvedValue({ data: estado({ ifood: ifoodBase({ disponivel: true, merchant_id: 'abc', conectado: true, loja: 'Cê Saladas Palmas' }) }) });
  renderizar();
  await screen.findByRole('heading', { name: 'iFood' });
  expect(within(cartao('iFood')).getByText('Cê Saladas Palmas')).toBeInTheDocument();
  expect(within(cartao('iFood')).getByText('Conectado')).toBeInTheDocument();
});

it('Mercado Pago sem conta leva para conectar em Pagamentos', async () => {
  get.mockResolvedValue({ data: estado() });
  renderizar();
  await screen.findByRole('heading', { name: 'Mercado Pago' });
  expect(within(cartao('Mercado Pago')).getByRole('link', { name: 'Conectar' })).toHaveAttribute('href', '/stores/ce/payments');
});

it('Mercado Pago conectado vira "Gerenciar"', async () => {
  get.mockResolvedValue({ data: estado({ mercado_pago: { conectado: true } }) });
  renderizar();
  await screen.findByRole('heading', { name: 'Mercado Pago' });
  const c = cartao('Mercado Pago');
  expect(within(c).getByText('Recebendo na sua conta')).toBeInTheDocument();
  expect(within(c).getByRole('link', { name: 'Gerenciar' })).toBeInTheDocument();
});

it('falha ao carregar não finge "não conectado"', async () => {
  get.mockRejectedValue(new Error('rede'));
  renderizar();
  expect(await screen.findByRole('alert')).toHaveTextContent(/delivery e pagamento/i);
  expect(screen.queryByRole('heading', { name: '99Food' })).toBeNull();
});

it('sem loja selecionada não chama a API', () => {
  loja = { storeId: null, storeSlug: null };
  renderizar();
  expect(get).not.toHaveBeenCalled();
});

describe('iFood pelo ID da loja', () => {
  const MERCHANT = '3f1c2b9a-0d4e-4c5f-9a1b-2c3d4e5f6a7b';
  const params = { params: { store: 'id-1' } };

  const abrir = async (ifood: Record<string, unknown>) => {
    get.mockResolvedValue({ data: estado({ ifood: ifoodBase(ifood) }) });
    renderizar();
    await screen.findByRole('heading', { name: 'iFood' });
    return abrirGavetaDoIfood();
  };

  it('sem ID: campo vazio e salvar envia o ID digitado (sem espaços)', async () => {
    const c = await abrir({ disponivel: true });
    const campo = within(c).getByLabelText('ID da loja no iFood') as HTMLInputElement;
    expect(campo.value).toBe('');
    expect(within(c).getByRole('button', { name: 'Salvar' })).toBeDisabled();
    post.mockResolvedValue({ data: ifoodBase({ disponivel: true, merchant_id: MERCHANT }) });
    fireEvent.change(campo, { target: { value: `  ${MERCHANT} ` } });
    fireEvent.click(within(c).getByRole('button', { name: 'Salvar' }));
    expect(await within(gaveta()).findByText('Aguardando autorização')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/stores/integracoes/ifood/', { merchant_id: MERCHANT }, params);
  });

  it('não mostra o fluxo antigo de código de autorização', async () => {
    const c = await abrir({ disponivel: true });
    expect(within(c).queryByRole('button', { name: 'Conectar iFood' })).toBeNull();
    expect(within(c).queryByLabelText('Código de autorização')).toBeNull();
  });

  it('ID inválido mostra o motivo do servidor', async () => {
    const c = await abrir({ disponivel: true });
    post.mockRejectedValue({ response: { data: { detail: 'ID da loja inválido' } } });
    fireEvent.change(within(c).getByLabelText('ID da loja no iFood'), { target: { value: 'xyz' } });
    fireEvent.click(within(c).getByRole('button', { name: 'Salvar' }));
    expect(await within(gaveta()).findByRole('alert')).toHaveTextContent('ID da loja inválido');
  });

  it('ID salvo e conectado: selo, nome da loja e desconectar', async () => {
    const c = await abrir({ disponivel: true, merchant_id: MERCHANT, conectado: true, loja: 'Cê no iFood' });
    expect(within(c).getByText('Conectado')).toBeInTheDocument();
    expect(within(c).getByText('Cê no iFood')).toBeInTheDocument();
    expect((within(c).getByLabelText('ID da loja no iFood') as HTMLInputElement).value).toBe(MERCHANT);
    post.mockResolvedValue({ data: ifoodBase({ disponivel: true }) });
    fireEvent.click(within(c).getByRole('button', { name: 'Desconectar' }));
    await waitFor(() => expect(within(gaveta()).queryByRole('button', { name: 'Desconectar' })).toBeNull());
    expect(post).toHaveBeenCalledWith('/stores/integracoes/ifood/desconectar/', null, params);
    expect((within(gaveta()).getByLabelText('ID da loja no iFood') as HTMLInputElement).value).toBe('');
  });

  it('ID salvo e não autorizado: aguardando + erro curto', async () => {
    const c = await abrir({ disponivel: true, merchant_id: MERCHANT, erro: 'App não autorizado no Portal' });
    expect(within(c).getByText('Aguardando autorização')).toBeInTheDocument();
    expect(within(c).getByText('App não autorizado no Portal')).toBeInTheDocument();
    expect(within(c).getByRole('button', { name: 'Desconectar' })).toBeInTheDocument();
  });

  it('sem app de pedidos mas com app de entregas, ainda pede o ID', async () => {
    const c = await abrir({ entregas_disponivel: true });
    expect(within(c).queryByText('Em breve')).toBeNull();
    expect(within(c).getByLabelText('ID da loja no iFood')).toBeInTheDocument();
  });
});

describe('Entregas iFood', () => {
  const params = { params: { store: 'id-1' } };
  const ligado = { disponivel: true, entregas_disponivel: true, merchant_id: 'm-1', conectado: true, loja: 'Cê' };

  const abrir = async (ifood: Record<string, unknown>) => {
    get.mockResolvedValue({ data: estado({ ifood: ifoodBase(ifood) }) });
    renderizar();
    await screen.findByRole('heading', { name: 'iFood' });
    return abrirGavetaDoIfood();
  };

  it('não aparece sem o app de entregas', async () => {
    const c = await abrir({ ...ligado, entregas_disponivel: false });
    expect(within(c).queryByText('Entregas iFood')).toBeNull();
  });

  it('não aparece sem ID da loja salvo', async () => {
    const c = await abrir({ ...ligado, merchant_id: '', conectado: false });
    expect(within(c).queryByText('Entregas iFood')).toBeNull();
  });

  it('acréscimo só com frete pelo iFood ligado; preparo só ao confirmar', async () => {
    const c = await abrir(ligado);
    expect(within(c).getByText('Entregas iFood')).toBeInTheDocument();
    expect(within(c).queryByLabelText('Acréscimo no frete (R$)')).toBeNull();
    expect(within(c).queryByLabelText('Tempo de preparo (min)')).toBeNull();
    fireEvent.click(within(c).getByRole('switch', { name: 'Frete pelo iFood' }));
    expect(within(c).getByLabelText('Acréscimo no frete (R$)')).toBeInTheDocument();
    fireEvent.change(within(c).getByLabelText('Chamar entregador'), { target: { value: 'confirmado' } });
    expect(within(c).getByLabelText('Tempo de preparo (min)')).toBeInTheDocument();
  });

  it('salva só o que mudou e mostra o que o servidor devolveu', async () => {
    const c = await abrir(ligado);
    const salvar = () => within(gaveta()).getByRole('button', { name: 'Salvar entregas' });
    expect(salvar()).toBeDisabled();
    fireEvent.click(within(c).getByRole('switch', { name: 'Frete pelo iFood' }));
    fireEvent.change(within(c).getByLabelText('Acréscimo no frete (R$)'), { target: { value: '2,50' } });
    fireEvent.change(within(c).getByLabelText('Chamar entregador'), { target: { value: 'confirmado' } });
    fireEvent.change(within(c).getByLabelText('Tempo de preparo (min)'), { target: { value: '25' } });
    post.mockResolvedValue({ data: ifoodBase({
      ...ligado, frete_pelo_ifood: true, acrescimo_frete: '2.50', chamar_entregador: 'confirmado', tempo_preparo_min: 25,
    }) });
    fireEvent.click(salvar());
    await waitFor(() => expect(salvar()).toBeDisabled());
    expect(post).toHaveBeenCalledWith('/stores/integracoes/ifood/', {
      frete_pelo_ifood: true, acrescimo_frete: '2.50', chamar_entregador: 'confirmado', tempo_preparo_min: 25,
    }, params);
    expect((within(gaveta()).getByLabelText('Acréscimo no frete (R$)') as HTMLInputElement).value).toBe('2,50');
  });

  it('erro ao salvar mostra o motivo', async () => {
    const c = await abrir(ligado);
    post.mockRejectedValue({ response: { data: { detail: 'Acréscimo inválido' } } });
    fireEvent.change(within(c).getByLabelText('Chamar entregador'), { target: { value: 'pronto' } });
    fireEvent.click(within(c).getByRole('button', { name: 'Salvar entregas' }));
    expect(await within(gaveta()).findByRole('alert')).toHaveTextContent('Acréscimo inválido');
  });
});

it('gaveta do iFood rola: horários e entregas passam da altura da tela (24/11)', async () => {
  get.mockResolvedValue({ data: estado({ ifood: ifoodBase({ disponivel: true, merchant_id: 'm-1', conectado: true }) }) });
  renderizar();
  await screen.findByRole('heading', { name: 'iFood' });
  const corpo = abrirGavetaDoIfood().firstElementChild as HTMLElement;
  expect(corpo.className).toMatch(/overflow-y-auto/);
  expect(corpo.className).toMatch(/min-h-0/);
});

describe('Loja no iFood', () => {
  const abrir = async (ifood: Record<string, unknown>) => {
    get.mockResolvedValue({ data: estado({ ifood: ifoodBase({ disponivel: true, ...ifood }) }) });
    renderizar();
    await screen.findByRole('heading', { name: 'iFood' });
    return abrirGavetaDoIfood();
  };

  it('aparece com ID salvo e conectado', async () => {
    const c = await abrir({ merchant_id: 'm-1', conectado: true });
    expect(within(c).getByTestId('loja-no-ifood')).toHaveTextContent('id-1');
  });

  it('não aparece aguardando autorização', async () => {
    const c = await abrir({ merchant_id: 'm-1', conectado: false });
    expect(within(c).queryByTestId('loja-no-ifood')).toBeNull();
  });

  it('não aparece sem ID', async () => {
    const c = await abrir({ conectado: false });
    expect(within(c).queryByTestId('loja-no-ifood')).toBeNull();
  });
});
