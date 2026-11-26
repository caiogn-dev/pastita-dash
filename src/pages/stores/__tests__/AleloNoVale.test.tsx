import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const listar = jest.fn();
const criar = jest.fn();
const atualizar = jest.fn();
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

const COM_ALELO = {
  brands: [
    { value: 'vr', label: 'VR Benefícios', gateway: 'pagarme' },
    { value: 'ticket', label: 'Ticket', gateway: 'pagarme' },
    { value: 'alelo', label: 'Alelo', gateway: 'cielo' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  listar.mockResolvedValue({ results: [] });
  criar.mockResolvedValue({ id: 'c1' });
  atualizar.mockResolvedValue({ id: 'c1' });
  catalogo.mockResolvedValue(COM_ALELO);
});

/** Marca a Alelo (se preciso) e abre "Chaves da Cielo". */
const blocoAlelo = async () => {
  const bloco = within(await screen.findByRole('region', { name: 'Alelo' }));
  const caixa = bloco.getByRole('checkbox', { name: 'Alelo' });
  if (!(caixa as HTMLInputElement).checked) fireEvent.click(caixa);
  const botao = bloco.getByRole('button', { name: /chaves da cielo/i });
  if (botao.getAttribute('aria-expanded') !== 'true') fireEvent.click(botao);
  return bloco;
};

const preencher = (bloco: ReturnType<typeof within>) => {
  fireEvent.change(bloco.getByLabelText(/Merchant ID/), { target: { value: ' d55454c7-f324-4fcd-a618-4f61c92013d8 ' } });
  fireEvent.change(bloco.getByLabelText(/Merchant Key/), { target: { value: 'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK' } });
  fireEvent.change(bloco.getByLabelText(/client id/i), { target: { value: '1da50a26-af11-45e2-a8f8-7e41410b65e9' } });
  fireEvent.change(bloco.getByLabelText(/client secret/i), { target: { value: 'csecret' } });
};

describe('Alelo no mesmo cartão do vale', () => {
  it('aparece no mesmo cartão, em bloco próprio', async () => {
    render(<VoucherSection storeId="s1" />);
    const bloco = await blocoAlelo();
    expect(bloco.getByLabelText(/Merchant ID/)).toBeInTheDocument();
    expect(screen.getByText(/vale-refeição e vale-alimentação/i)).toBeInTheDocument();
  });

  it('Alelo é bandeira da Cielo, fora das caixas do Pagar.me', async () => {
    render(<VoucherSection storeId="s1" />);
    const bloco = within(await screen.findByRole('region', { name: 'Alelo' }));
    expect(bloco.getByRole('checkbox', { name: 'Alelo' })).toBeInTheDocument();
    expect(bloco.queryByRole('checkbox', { name: 'Ticket' })).not.toBeInTheDocument();
  });

  it('sem conexão gravada, a Alelo nasce desmarcada e sem chaves na tela', async () => {
    render(<VoucherSection storeId="s1" />);
    const bloco = within(await screen.findByRole('region', { name: 'Alelo' }));
    expect(bloco.getByRole('checkbox', { name: 'Alelo' })).not.toBeChecked();
    expect(bloco.queryByRole('button', { name: /chaves da cielo/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Merchant ID/)).not.toBeInTheDocument();
  });

  it('marcada, as chaves continuam fechadas até abrir', async () => {
    render(<VoucherSection storeId="s1" />);
    const bloco = within(await screen.findByRole('region', { name: 'Alelo' }));
    fireEvent.click(bloco.getByRole('checkbox', { name: 'Alelo' }));
    const botao = bloco.getByRole('button', { name: /chaves da cielo/i });
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    expect(botao).toHaveTextContent(/falta configurar/i);
    expect(bloco.queryByLabelText(/Merchant Key/)).not.toBeInTheDocument();
    fireEvent.click(botao);
    expect(bloco.getByLabelText(/Merchant Key/)).toBeInTheDocument();
  });

  it('no salvar único não tem botão próprio: entra na barra da página', async () => {
    const Pagina = () => {
      const juntas = useSalvarJunto();
      return (
        <SalvarJunto registro={juntas.registro}>
          <VoucherSection storeId="s1" />
          <span data-testid="mudancas">{juntas.mudancas}</span>
          <button type="button" onClick={() => { if (!juntas.validar()) void juntas.salvar(); }}>Salvar tudo</button>
        </SalvarJunto>
      );
    };
    render(<Pagina />);
    const bloco = await blocoAlelo();
    expect(bloco.queryByRole('button', { name: /salvar alelo/i })).not.toBeInTheDocument();
    preencher(bloco);
    expect(Number(screen.getByTestId('mudancas').textContent)).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar tudo' }));
    await waitFor(() => expect(criar).toHaveBeenCalledTimes(1));
    expect(criar.mock.calls[0][0]).toMatchObject({ gateway_type: 'cielo', is_enabled: true });
  });

  it('erro de chave com o bloco fechado abre as chaves para mostrar onde', async () => {
    render(<VoucherSection storeId="s1" />);
    const bloco = await blocoAlelo();
    fireEvent.click(bloco.getByRole('button', { name: /chaves da cielo/i }));
    expect(bloco.queryByLabelText(/Merchant ID/)).not.toBeInTheDocument();
    fireEvent.click(bloco.getByRole('button', { name: /salvar alelo/i }));
    expect(await bloco.findByRole('alert')).toHaveTextContent(/quatro chaves/i);
    expect(bloco.getByLabelText(/Merchant ID/)).toBeInTheDocument();
  });

  it('sem bandeira da Cielo no catálogo, o bloco não existe', async () => {
    catalogo.mockResolvedValue({ brands: [{ value: 'vr', label: 'VR Benefícios' }] });
    render(<VoucherSection storeId="s1" />);
    await screen.findByLabelText('VR Benefícios');
    expect(screen.queryByRole('region', { name: 'Alelo' })).not.toBeInTheDocument();
  });

  it('cria a conexão da Cielo com as quatro chaves e a bandeira do catálogo', async () => {
    render(<VoucherSection storeId="s1" />);
    const bloco = await blocoAlelo();
    preencher(bloco);
    fireEvent.click(bloco.getByRole('button', { name: /salvar alelo/i }));

    await waitFor(() => expect(criar).toHaveBeenCalledTimes(1));
    expect(criar).toHaveBeenCalledWith({
      store: 's1', name: 'Cielo (Alelo)', gateway_type: 'cielo',
      public_key: 'd55454c7-f324-4fcd-a618-4f61c92013d8', api_key: 'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK', api_secret: 'csecret',
      is_enabled: true, is_sandbox: false,
      configuration: { voucher_brands: ['alelo'], sop_client_id: '1da50a26-af11-45e2-a8f8-7e41410b65e9' },
    });
  });

  it('faltando chave, avisa e não salva', async () => {
    render(<VoucherSection storeId="s1" />);
    const bloco = await blocoAlelo();
    fireEvent.change(bloco.getByLabelText(/Merchant ID/), { target: { value: 'd55454c7-f324-4fcd-a618-4f61c92013d8' } });
    fireEvent.click(bloco.getByRole('button', { name: /salvar alelo/i }));
    expect(await bloco.findByRole('alert')).toHaveTextContent(/quatro chaves/i);
    expect(criar).not.toHaveBeenCalled();
  });

  it('editando sem redigitar os segredos, não os manda em branco', async () => {
    listar.mockResolvedValue({ results: [{
      id: 'c9', gateway_type: 'cielo', public_key: 'd55454c7-f324-4fcd-a618-4f61c92013d8', is_enabled: true,
      is_sandbox: true, tem_credencial: true,
      configuration: { voucher_brands: ['alelo'], sop_client_id: '1da50a26-af11-45e2-a8f8-7e41410b65e9' },
    }] });
    render(<VoucherSection storeId="s1" />);
    const bloco = await blocoAlelo();
    await waitFor(() => expect(bloco.getByLabelText(/Merchant ID/)).toHaveValue('d55454c7-f324-4fcd-a618-4f61c92013d8'));
    expect(bloco.getByLabelText(/conta de teste/i)).toBeChecked();

    fireEvent.click(bloco.getByRole('button', { name: /salvar alelo/i }));
    await waitFor(() => expect(atualizar).toHaveBeenCalledTimes(1));
    const [id, corpo] = atualizar.mock.calls[0];
    expect(id).toBe('c9');
    expect(corpo).not.toHaveProperty('api_key');
    expect(corpo).not.toHaveProperty('api_secret');
    expect(corpo.is_sandbox).toBe(true);
    expect(corpo.configuration).toEqual({ voucher_brands: ['alelo'], sop_client_id: '1da50a26-af11-45e2-a8f8-7e41410b65e9' });
  });

  it('salvar o Pagar.me não manda Alelo nas bandeiras dele', async () => {
    render(<VoucherSection storeId="s1" />);
    fireEvent.click(await screen.findByLabelText('VR Benefícios'));
    fireEvent.click(screen.getByRole('button', { name: /chaves do pagar\.me/i }));
    fireEvent.change(screen.getByLabelText(/chave secreta/i), { target: { value: 'sk_test_x' } });
    fireEvent.change(screen.getByLabelText(/chave p[úu]blica/i), { target: { value: 'pk_test_y' } });
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));
    await waitFor(() => expect(criar).toHaveBeenCalledTimes(1));
    expect(criar.mock.calls[0][0].configuration.voucher_brands).toEqual(['vr']);
    expect(criar.mock.calls[0][0].gateway_type).toBe('pagarme');
  });

  describe('formato das chaves', () => {
    it('Merchant ID com ponto no fim é recusado antes de salvar', async () => {
      render(<VoucherSection storeId="s1" />);
      const bloco = await blocoAlelo();
      preencher(bloco);
      fireEvent.change(bloco.getByLabelText(/Merchant ID/),
        { target: { value: 'd55454c7-f324-4fcd-a618-4f61c92013d8.' } });
      fireEvent.click(bloco.getByRole('button', { name: /salvar alelo/i }));
      expect(await bloco.findByRole('alert')).toHaveTextContent(/merchant id/i);
      expect(criar).not.toHaveBeenCalled();
    });

    it('Merchant Key fora de 40 caracteres é recusada', async () => {
      render(<VoucherSection storeId="s1" />);
      const bloco = await blocoAlelo();
      preencher(bloco);
      fireEvent.change(bloco.getByLabelText(/Merchant ID/),
        { target: { value: 'd55454c7-f324-4fcd-a618-4f61c92013d8' } });
      fireEvent.change(bloco.getByLabelText(/client id/i),
        { target: { value: '1da50a26-af11-45e2-a8f8-7e41410b65e9' } });
      fireEvent.change(bloco.getByLabelText(/Merchant Key/), { target: { value: 'curta' } });
      fireEvent.click(bloco.getByRole('button', { name: /salvar alelo/i }));
      expect(await bloco.findByRole('alert')).toHaveTextContent(/merchant key/i);
      expect(criar).not.toHaveBeenCalled();
    });

    it('chaves certas, com espaço em volta, são limpas e salvas', async () => {
      render(<VoucherSection storeId="s1" />);
      const bloco = await blocoAlelo();
      fireEvent.change(bloco.getByLabelText(/Merchant ID/),
        { target: { value: ' d55454c7-f324-4fcd-a618-4f61c92013d8 ' } });
      fireEvent.change(bloco.getByLabelText(/Merchant Key/), { target: { value: ` ${'K'.repeat(40)} ` } });
      fireEvent.change(bloco.getByLabelText(/client id/i),
        { target: { value: '1da50a26-af11-45e2-a8f8-7e41410b65e9' } });
      fireEvent.change(bloco.getByLabelText(/client secret/i), { target: { value: 'segredo=' } });
      fireEvent.click(bloco.getByRole('button', { name: /salvar alelo/i }));
      await waitFor(() => expect(criar).toHaveBeenCalledTimes(1));
      const corpo = criar.mock.calls[0][0];
      expect(corpo.public_key).toBe('d55454c7-f324-4fcd-a618-4f61c92013d8');
      expect(corpo.api_key).toBe('K'.repeat(40));
    });

    it('erro do servidor no campo aparece em vez da mensagem genérica', async () => {
      criar.mockRejectedValue({ response: { data: { public_key: ['Merchant ID inválido: são 36 caracteres.'] } } });
      render(<VoucherSection storeId="s1" />);
      const bloco = await blocoAlelo();
      fireEvent.change(bloco.getByLabelText(/Merchant ID/),
        { target: { value: 'd55454c7-f324-4fcd-a618-4f61c92013d8' } });
      fireEvent.change(bloco.getByLabelText(/Merchant Key/), { target: { value: 'K'.repeat(40) } });
      fireEvent.change(bloco.getByLabelText(/client id/i),
        { target: { value: '1da50a26-af11-45e2-a8f8-7e41410b65e9' } });
      fireEvent.change(bloco.getByLabelText(/client secret/i), { target: { value: 'segredo=' } });
      fireEvent.click(bloco.getByRole('button', { name: /salvar alelo/i }));
      expect(await bloco.findByRole('alert')).toHaveTextContent(/36 caracteres/);
    });
  });
});
