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
import { SalvarJunto, useSalvarJunto } from '../salvarJunto';

/** As chaves ficam atrás de "Chaves do Pagar.me", que só existe com bandeira marcada. */
const abrirChaves = async (bandeira = 'VR Benefícios') => {
  const caixa = await screen.findByLabelText(bandeira);
  if (!(caixa as HTMLInputElement).checked) fireEvent.click(caixa);
  const botao = screen.getByRole('button', { name: /chaves do pagar\.me/i });
  if (botao.getAttribute('aria-expanded') !== 'true') fireEvent.click(botao);
};

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
    await abrirChaves();
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
    await abrirChaves();
    fireEvent.change(await screen.findByLabelText(/chave secreta/i),
      { target: { value: 'sk_test_x' } });
    fireEvent.change(screen.getByLabelText(/chave p[úu]blica/i),
      { target: { value: 'pk_test_y' } });
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
    await abrirChaves();
    fireEvent.change(await screen.findByLabelText(/chave secreta/i),
      { target: { value: 'sk_test_x' } });
    fireEvent.change(screen.getByLabelText(/chave p[úu]blica/i),
      { target: { value: 'pk_producao' } });

    expect(await screen.findByText(/ambientes diferentes/i)).toBeInTheDocument();
  });

  it('não salva sem nenhuma bandeira marcada', async () => {
    render(<VoucherSection storeId="s1" />);
    await abrirChaves();
    fireEvent.change(await screen.findByLabelText(/chave secreta/i),
      { target: { value: 'sk_test_x' } });
    fireEvent.change(screen.getByLabelText(/chave p[úu]blica/i),
      { target: { value: 'pk_test_y' } });
    fireEvent.click(screen.getByLabelText('VR Benefícios'));
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() =>
      expect(screen.getByText(/ao menos uma bandeira/i)).toBeInTheDocument());
    expect(criar).not.toHaveBeenCalled();
  });
});

describe('VoucherSection — aninhada no interruptor do vale', () => {
  const GATEWAY_LIGADO = {
    id: 'g1', gateway_type: 'pagarme', is_enabled: true, tem_credencial: true,
    public_key: 'pk_x', configuration: { voucher_brands: ['vr'] },
  };

  /** A seção como a página monta: dentro do salvar único, seguindo a linha. */
  const Pagina: React.FC<{ ligada: boolean; toques: number }> = ({ ligada, toques }) => {
    const juntas = useSalvarJunto();
    return (
      <SalvarJunto registro={juntas.registro}>
        <VoucherSection storeId="s1" interruptor={{ ligada, toques }} />
        <span data-testid="mudancas">{juntas.mudancas}</span>
        <button type="button" onClick={() => void juntas.salvar()}>Salvar tudo</button>
      </SalvarJunto>
    );
  };

  it('não existe mais um segundo "Aceitar vale" — liga e desliga é a linha', async () => {
    listar.mockResolvedValue({ results: [GATEWAY_LIGADO] });
    render(<Pagina ligada toques={0} />);
    await screen.findByLabelText('VR Benefícios');
    expect(screen.queryByLabelText(/aceitar vale/i)).not.toBeInTheDocument();
  });

  it('com o vale desligado, a configuração não é desenhada', async () => {
    listar.mockResolvedValue({ results: [GATEWAY_LIGADO] });
    render(<Pagina ligada={false} toques={0} />);
    await waitFor(() => expect(listar).toHaveBeenCalled());
    expect(screen.queryByText('Bandeiras')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('VR Benefícios')).not.toBeInTheDocument();
  });

  it('as chaves ficam escondidas até abrir "Chaves do Pagar.me"', async () => {
    listar.mockResolvedValue({ results: [GATEWAY_LIGADO] });
    render(<Pagina ligada toques={0} />);
    const botao = await screen.findByRole('button', { name: /chaves do pagar\.me/i });
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText(/chave secreta/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/chave p[úu]blica/i)).not.toBeInTheDocument();
    expect(botao).toHaveTextContent(/configurado/i);

    fireEvent.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText(/chave secreta/i)).toBeInTheDocument();
  });

  it('sem bandeira do Pagar.me marcada, nem o botão das chaves aparece', async () => {
    render(<Pagina ligada toques={0} />);
    await screen.findByLabelText('VR Benefícios');
    expect(screen.queryByRole('button', { name: /chaves do pagar\.me/i })).not.toBeInTheDocument();
  });

  it('recarga da página não inventa alteração', async () => {
    listar.mockResolvedValue({ results: [{ ...GATEWAY_LIGADO, is_enabled: false }] });
    const { rerender } = render(<Pagina ligada={false} toques={0} />);
    await waitFor(() => expect(listar).toHaveBeenCalled());
    rerender(<Pagina ligada toques={0} />);
    await screen.findByLabelText('VR Benefícios');
    expect(screen.getByTestId('mudancas')).toHaveTextContent('0');
  });

  it('ligar o vale reativa o gateway desligado, sem recadastrar', async () => {
    listar.mockResolvedValue({ results: [{ ...GATEWAY_LIGADO, is_enabled: false }] });
    const { rerender } = render(<Pagina ligada={false} toques={0} />);
    await waitFor(() => expect(listar).toHaveBeenCalled());
    rerender(<Pagina ligada toques={1} />);
    await waitFor(() => expect(screen.getByTestId('mudancas')).toHaveTextContent('1'));

    fireEvent.click(screen.getByRole('button', { name: 'Salvar tudo' }));
    await waitFor(() => expect(atualizar).toHaveBeenCalled());
    expect(atualizar.mock.calls[0][1]).toMatchObject({
      is_enabled: true,
      configuration: { voucher_brands: ['vr'] },
    });
    expect(atualizar.mock.calls[0][1]).not.toHaveProperty('api_key');
  });

  it('desligar não mexe no gateway: o cardápio esconde pelo interruptor e as chaves ficam', async () => {
    listar.mockResolvedValue({ results: [GATEWAY_LIGADO] });
    const { rerender } = render(<Pagina ligada toques={0} />);
    await screen.findByLabelText('VR Benefícios');
    rerender(<Pagina ligada={false} toques={1} />);
    expect(screen.getByTestId('mudancas')).toHaveTextContent('0');
    expect(atualizar).not.toHaveBeenCalled();
  });

  it('ligar numa loja sem nada configurado pede uma bandeira antes de salvar', async () => {
    const { rerender } = render(<Pagina ligada={false} toques={0} />);
    rerender(<Pagina ligada toques={1} />);
    await screen.findByLabelText('VR Benefícios');
    await waitFor(() => expect(screen.getByTestId('mudancas')).toHaveTextContent('1'));
  });

  it('bandeira marcada sem chave pública: avisa e abre as chaves', async () => {
    render(<VoucherSection storeId="s1" />);
    fireEvent.click(await screen.findByLabelText('VR Benefícios'));
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));
    expect(await screen.findByText(/chave pública do pagar\.me/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/chave p[úu]blica/i)).toBeInTheDocument();
    expect(criar).not.toHaveBeenCalled();
  });

  it('com o gateway gravado, continua exigindo bandeira', async () => {
    listar.mockResolvedValue({
      results: [{ ...GATEWAY_LIGADO, configuration: { voucher_brands: [] } }],
    });
    render(<VoucherSection storeId="s1" />);
    await screen.findByLabelText('VR Benefícios');
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() =>
      expect(screen.getByText(/ao menos uma bandeira/i)).toBeInTheDocument());
    expect(atualizar).not.toHaveBeenCalled();
  });
});

describe('VoucherSection — aviso de credenciamento', () => {
  it('avisa, em uma linha, que cada operadora precisa credenciar o CNPJ', async () => {
    render(<VoucherSection storeId="s1" />);
    expect(await screen.findByText(/credencie o cnpj/i)).toBeInTheDocument();
    // O perigo nao e "nao funciona" — e falhar no pagamento.
    expect(screen.getByText(/recusad/i)).toBeInTheDocument();
  });

  it('com a conta já configurada, o aviso sai da frente', async () => {
    listar.mockResolvedValue({ results: [{
      id: 'g1', gateway_type: 'pagarme', is_enabled: true, tem_credencial: true,
      public_key: 'pk_x', configuration: { voucher_brands: ['vr'] },
    }] });
    render(<VoucherSection storeId="s1" />);
    await waitFor(() => expect(screen.getByLabelText('VR Benefícios')).toBeChecked());
    expect(screen.queryByText(/credencie o cnpj/i)).not.toBeInTheDocument();
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
    await abrirChaves();
    await waitFor(() => expect(screen.getByLabelText(/chave pública/i))
      .toHaveValue('pk_test_publica'));
  });

  it('diz que a chave secreta JÁ existe, em vez de campo vazio mudo', async () => {
    // O segredo nunca volta — e está certo. Mas campo em branco faz o lojista
    // achar que perdeu a configuração e digitar de novo (ou pior: achar que
    // nunca salvou).
    render(<VoucherSection storeId="s1" />);
    await waitFor(() => expect(screen.getByLabelText('VR Benefícios')).toBeChecked());
    expect(screen.getByRole('button', { name: /chaves do pagar\.me/i })).toHaveTextContent(/configurado/i);
    await abrirChaves();
    expect(screen.getByLabelText(/chave secreta/i)).toHaveAttribute('placeholder', expect.stringMatching(/j[áa] salva/i));
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
    await abrirChaves();
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
