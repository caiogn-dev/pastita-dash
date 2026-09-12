import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const listar = jest.fn();
const criar = jest.fn();
const atualizar = jest.fn();

// `payments.ts` NAO tem export default — e um export nomeado `paymentsService`,
// e `getGateways` devolve PaginatedResponse (`.results`), nao um array.
const catalogo = jest.fn();

jest.mock('../../../services/payments', () => ({
  paymentsService: {
    getGateways: (...a: unknown[]) => listar(...a),
    createGateway: (...a: unknown[]) => criar(...a),
    updateGateway: (...a: unknown[]) => atualizar(...a),
    getVoucherBrands: (...a: unknown[]) => catalogo(...a),
  },
}));

import VoucherSection from '../VoucherSection';

beforeEach(() => {
  jest.clearAllMocks();
  listar.mockResolvedValue({ results: [] });
  criar.mockResolvedValue({ id: 'g1' });
  atualizar.mockResolvedValue({ id: 'g1' });
  // O catalogo vem do backend. O painel nao tem lista propria de bandeiras.
  catalogo.mockResolvedValue({
    brands: [
      { value: 'vr', label: 'VR Benefícios' },
      { value: 'sodexo', label: 'Sodexo' },
      { value: 'ticket', label: 'Ticket' },
    ],
  });
});

describe('VoucherSection', () => {
  it('tem campo para as DUAS chaves', async () => {
    render(<VoucherSection storeId="s1" />);
    expect(await screen.findByLabelText(/chave secreta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/chave p[úu]blica/i)).toBeInTheDocument();
  });

  it('monta os toggles a partir do catálogo do backend', async () => {
    render(<VoucherSection storeId="s1" />);
    expect(await screen.findByLabelText('VR Benefícios')).toBeInTheDocument();
    expect(screen.getByLabelText('Sodexo')).toBeInTheDocument();
    expect(screen.getByLabelText('Ticket')).toBeInTheDocument();
    expect(catalogo).toHaveBeenCalledTimes(1);
  });

  it('bandeira que o backend NAO manda simplesmente nao aparece', async () => {
    // Alelo esta fora do catalogo. O painel nao precisa saber o porque, e nao
    // pode ter um `if` sobre ela — basta nao receber.
    render(<VoucherSection storeId="s1" />);
    await screen.findByLabelText('VR Benefícios');
    expect(screen.queryByLabelText(/alelo/i)).not.toBeInTheDocument();
  });

  it('se o backend mandar uma bandeira nova, ela aparece sem deploy do painel', async () => {
    catalogo.mockResolvedValue({
      brands: [{ value: 'caju', label: 'Caju' }],
    });
    render(<VoucherSection storeId="s1" />);
    expect(await screen.findByLabelText('Caju')).toBeInTheDocument();
  });

  it('salva as chaves e as bandeiras marcadas', async () => {
    render(<VoucherSection storeId="s1" />);
    fireEvent.change(await screen.findByLabelText(/chave secreta/i),
      { target: { value: 'sk_test_x' } });
    fireEvent.change(screen.getByLabelText(/chave p[úu]blica/i),
      { target: { value: 'pk_test_y' } });
    fireEvent.click(screen.getByLabelText('VR Benefícios'));
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(criar).toHaveBeenCalledTimes(1));
    expect(criar.mock.calls[0][0]).toMatchObject({
      gateway_type: 'pagarme',
      api_key: 'sk_test_x',
      public_key: 'pk_test_y',
      configuration: { voucher_brands: ['vr'] },
    });
  });

  it('avisa quando as chaves são de ambientes diferentes', async () => {
    render(<VoucherSection storeId="s1" />);
    fireEvent.change(await screen.findByLabelText(/chave secreta/i),
      { target: { value: 'sk_test_x' } });
    fireEvent.change(screen.getByLabelText(/chave p[úu]blica/i),
      { target: { value: 'pk_producao' } });

    expect(await screen.findByText(/ambientes diferentes/i)).toBeInTheDocument();
  });

  it('não salva sem nenhuma bandeira marcada', async () => {
    render(<VoucherSection storeId="s1" />);
    fireEvent.change(await screen.findByLabelText(/chave secreta/i),
      { target: { value: 'sk_test_x' } });
    fireEvent.change(screen.getByLabelText(/chave p[úu]blica/i),
      { target: { value: 'pk_test_y' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() =>
      expect(screen.getByText(/ao menos uma bandeira/i)).toBeInTheDocument());
    expect(criar).not.toHaveBeenCalled();
  });
});

describe('VoucherSection — desligar o vale', () => {
  const GATEWAY_LIGADO = {
    id: 'g1', gateway_type: 'pagarme', is_enabled: true,
    public_key: 'pk_x', configuration: { voucher_brands: ['vr'] },
  };

  it('quando o vale já está ligado, existe um jeito de desligar', async () => {
    listar.mockResolvedValue({ results: [GATEWAY_LIGADO] });
    render(<VoucherSection storeId="s1" />);
    expect(await screen.findByLabelText(/aceitar vale nesta loja/i)).toBeChecked();
  });

  it('desmarcar e salvar desliga o gateway em vez de apagar a configuração', async () => {
    listar.mockResolvedValue({ results: [GATEWAY_LIGADO] });
    render(<VoucherSection storeId="s1" />);

    fireEvent.click(await screen.findByLabelText(/aceitar vale nesta loja/i));
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(atualizar).toHaveBeenCalled());
    expect(atualizar.mock.calls[0][1]).toMatchObject({ is_enabled: false });
    // As bandeiras continuam gravadas: religar nao pode exigir remarcar tudo.
    expect(atualizar.mock.calls[0][1].configuration).toMatchObject({ voucher_brands: ['vr'] });
  });

  it('desligando, não exige bandeira marcada', async () => {
    listar.mockResolvedValue({
      results: [{ ...GATEWAY_LIGADO, configuration: { voucher_brands: [] } }],
    });
    render(<VoucherSection storeId="s1" />);

    fireEvent.click(await screen.findByLabelText(/aceitar vale nesta loja/i));
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(atualizar).toHaveBeenCalled());
    expect(screen.queryByText(/ao menos uma bandeira/i)).not.toBeInTheDocument();
  });

  it('ligado, continua exigindo bandeira', async () => {
    listar.mockResolvedValue({
      results: [{ ...GATEWAY_LIGADO, configuration: { voucher_brands: [] } }],
    });
    render(<VoucherSection storeId="s1" />);
    await screen.findByLabelText(/aceitar vale nesta loja/i);
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() =>
      expect(screen.getByText(/ao menos uma bandeira/i)).toBeInTheDocument());
    expect(atualizar).not.toHaveBeenCalled();
  });
});

describe('VoucherSection — aviso de credenciamento', () => {
  it('avisa que a conta precisa estar habilitada nas bandeiras', async () => {
    render(<VoucherSection storeId="s1" />);
    expect(await screen.findByText(/habilitad/i)).toBeInTheDocument();
  });

  it('diz o que acontece se o lojista pular esse passo', async () => {
    render(<VoucherSection storeId="s1" />);
    // O perigo nao e "nao funciona" — e aparecer no cardapio e falhar no clique.
    expect(await screen.findByText(/aparece no card[áa]pio/i)).toBeInTheDocument();
    expect(screen.getByText(/recusad|falha/i)).toBeInTheDocument();
  });

  it('o aviso aparece mesmo antes de colar qualquer chave', async () => {
    listar.mockResolvedValue({ results: [] });
    render(<VoucherSection storeId="s1" />);
    // Avisar so depois de configurar seria avisar tarde demais.
    expect(await screen.findByText(/habilitad/i)).toBeInTheDocument();
  });
});

describe('VoucherSection — estado do que já está configurado', () => {
  const JA_CONFIGURADO = {
    id: 'g1',
    gateway_type: 'pagarme',
    is_enabled: true,
    is_sandbox: true,
    tem_credencial: true,
    public_key: 'pk_test_publica',
    configuration: { voucher_brands: ['vr', 'ticket'] },
  };

  beforeEach(() => {
    listar.mockResolvedValue({ results: [JA_CONFIGURADO] });
  });

  it('marca as bandeiras que a loja já tinha', async () => {
    render(<VoucherSection storeId="s1" />);
    await waitFor(() => expect(screen.getByLabelText('VR Benefícios')).toBeChecked());
    expect(screen.getByLabelText('Ticket')).toBeChecked();
    expect(screen.getByLabelText('Sodexo')).not.toBeChecked();
  });

  it('mostra a chave pública que está salva', async () => {
    render(<VoucherSection storeId="s1" />);
    await waitFor(() => expect(screen.getByLabelText(/chave pública/i))
      .toHaveValue('pk_test_publica'));
  });

  it('diz que a chave secreta JÁ existe, em vez de campo vazio mudo', async () => {
    // O segredo nunca volta — e está certo. Mas campo em branco faz o lojista
    // achar que perdeu a configuração e digitar de novo (ou pior: achar que
    // nunca salvou).
    render(<VoucherSection storeId="s1" />);
    expect(await screen.findByText(/chave secreta j[áa] (est[áa] )?(salva|configurada|guardada)/i))
      .toBeInTheDocument();
  });

  it('salvar sem retocar o segredo NÃO troca o ambiente da conta', async () => {
    // `is_sandbox` era recalculado a partir do campo em branco e virava false:
    // uma conta de teste passava a produção sozinha, sem ninguém pedir.
    render(<VoucherSection storeId="s1" />);
    await waitFor(() => expect(screen.getByLabelText('VR Benefícios')).toBeChecked());
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(atualizar).toHaveBeenCalled());
    const [, corpo] = atualizar.mock.calls[0];
    expect(corpo).not.toHaveProperty('is_sandbox');
    expect(corpo).not.toHaveProperty('api_key');
  });

  it('digitando um segredo novo, o ambiente volta a ser recalculado', async () => {
    render(<VoucherSection storeId="s1" />);
    await waitFor(() => expect(screen.getByLabelText('VR Benefícios')).toBeChecked());
    fireEvent.change(screen.getByLabelText(/chave secreta/i),
      { target: { value: 'sk_live_nova' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(atualizar).toHaveBeenCalled());
    const [, corpo] = atualizar.mock.calls[0];
    expect(corpo.api_key).toBe('sk_live_nova');
    expect(corpo.is_sandbox).toBe(false);
  });

  it('loja sem gateway nenhum continua com a tela em branco, que é a verdade', async () => {
    listar.mockResolvedValue({ results: [] });
    render(<VoucherSection storeId="s1" />);
    await waitFor(() => expect(screen.getByLabelText('VR Benefícios')).not.toBeChecked());
    expect(screen.queryByText(/chave secreta j[áa]/i)).not.toBeInTheDocument();
  });
});
