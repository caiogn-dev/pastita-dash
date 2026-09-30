/**
 * Notas fiscais — a lista e a emissão manual.
 *
 * O que quebrou (30/set): NF-e de um pedido de RETIRADA para uma empresa. A
 * nota pedia número e bairro do destinatário e não existia tela onde digitar:
 * o único campo era o CNPJ, no detalhe do pedido. Aqui o operador escolhe o
 * pedido, informa para quem a nota sai e emite.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import NotasFiscaisPage from '../NotasFiscaisPage';
import { fiscalService } from '../../../services/fiscal';

jest.mock('../../../services/fiscal', () => ({
  fiscalService: {
    listarNotas: jest.fn(),
    listarPedidos: jest.fn(),
    listarDestinatarios: jest.fn(),
    consultarCnpj: jest.fn(),
    emitir: jest.fn(),
    cancelar: jest.fn(),
    enviarEmail: jest.fn(),
  },
}));

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: {},
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

jest.mock('../../../hooks/useStore', () => ({
  useStore: () => ({ storeId: 'id-loja', storeSlug: 'loja', storeName: 'Loja' }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const mocked = fiscalService as jest.Mocked<typeof fiscalService>;

const RESUMO = { autorizadas_no_mes: 1, valor_no_mes: '1015.00', nao_sairam: 0, processando: 0 };

const NOTA = {
  id: 'n1', status: 'authorized', modelo: '55', ambiente: 'producao', numero: '2', serie: '1',
  chave_acesso: '1'.repeat(44), created_at: '2026-09-19T12:21:55Z',
  danfe_url: 'https://api.focusnfe.com.br/danfe.pdf', xml_url: 'https://api.focusnfe.com.br/nota.xml',
  error_message: '',
  pedido: { id: 'p1', order_number: 'IVO2609177724', customer_name: 'Pulveriza', total: '1015.00' },
  destinatario: { documento: '51162926000203', nome: 'PULVERIZA DRONES LTDA' },
};

const PEDIDO = {
  id: 'p2', order_number: 'IVO2609293699', customer_name: 'Sindicato da PF', total: '760.00',
  created_at: '2026-09-29T15:00:00Z', delivery_method: 'pickup', notas: [],
  sugestao: {
    documento: '11222333000181', nome: 'Sindicato da PF', inscricao_estadual: '',
    endereco: {
      street: 'Q. 112 Sul, Rua SR 01', number: '', complement: '', neighborhood: '',
      city: 'Palmas', state: 'TO', zip_code: '77020170',
    },
  },
};

const renderizar = (caminho = '/stores/loja/notas-fiscais') =>
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <NotasFiscaisPage />
    </MemoryRouter>,
  );

describe('NotasFiscaisPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.listarNotas.mockResolvedValue({
      habilitado: true, ambiente: 'producao', resumo: RESUMO, notas: [NOTA],
    } as never);
    mocked.listarPedidos.mockResolvedValue([PEDIDO] as never);
    mocked.listarDestinatarios.mockResolvedValue([] as never);
  });

  it('lista a nota com destinatário, pedido e valor', async () => {
    renderizar();
    expect((await screen.findAllByText('PULVERIZA DRONES LTDA')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/IVO2609177724/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/51\.162\.926\/0002-03/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1\.015,00/).length).toBeGreaterThan(0);
  });

  it('a loja é a da URL, não a selecionada no topo', async () => {
    render(
      <MemoryRouter initialEntries={['/stores/ivoneth/notas-fiscais']}>
        <Routes>
          <Route path="/stores/:storeId/notas-fiscais" element={<NotasFiscaisPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(mocked.listarNotas).toHaveBeenCalled());
    expect(mocked.listarNotas.mock.calls[0][0]).toBe('ivoneth');
  });

  it('consulta que falha avisa — não vira "nenhuma nota emitida"', async () => {
    mocked.listarNotas.mockRejectedValue(new Error('500'));
    renderizar();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível carregar/);
    expect(screen.queryByText(/Nenhuma nota/)).not.toBeInTheDocument();
  });

  it('loja que não emite é levada para a configuração', async () => {
    mocked.listarNotas.mockResolvedValue({
      habilitado: false, ambiente: 'homologacao', resumo: { ...RESUMO, autorizadas_no_mes: 0 }, notas: [],
    } as never);
    renderizar();
    const atalho = await screen.findByRole('link', { name: /Configurar emissão/ });
    expect(atalho).toHaveAttribute('href', '/stores/loja/settings?aba=fiscal');
  });

  it('homologação fica marcada na tela — nota de teste não é nota', async () => {
    mocked.listarNotas.mockResolvedValue({
      habilitado: true, ambiente: 'homologacao', resumo: RESUMO, notas: [NOTA],
    } as never);
    renderizar();
    expect(await screen.findByText('Homologação')).toBeInTheDocument();
  });

  it('nota autorizada vai por e-mail pela lista, com o endereço do cadastro preenchido', async () => {
    mocked.listarNotas.mockResolvedValue({
      habilitado: true, ambiente: 'producao', resumo: RESUMO,
      notas: [{ ...NOTA, email_sugerido: 'financeiro@pulveriza.com', email_enviado_para: '' }],
    } as never);
    mocked.enviarEmail.mockResolvedValue({ ...NOTA, email_enviado_para: 'financeiro@pulveriza.com' } as never);
    renderizar();
    fireEvent.click((await screen.findAllByRole('button', { name: /Ações da nota do pedido IVO2609177724/ }))[0]);
    fireEvent.click(await screen.findByRole('menuitem', { name: /Enviar por e-mail/ }));

    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByLabelText('E-mail')).toHaveValue('financeiro@pulveriza.com');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Enviar nota' }));
    await waitFor(() =>
      expect(mocked.enviarEmail).toHaveBeenCalledWith('loja', 'n1', 'financeiro@pulveriza.com'));
  });

  it('mostra para quem a nota já foi enviada', async () => {
    mocked.listarNotas.mockResolvedValue({
      habilitado: true, ambiente: 'producao', resumo: RESUMO,
      notas: [{ ...NOTA, email_enviado_para: 'financeiro@pulveriza.com', email_enviado_em: '2026-09-30T15:00:00Z' }],
    } as never);
    renderizar();
    expect((await screen.findAllByText(/financeiro@pulveriza\.com/)).length).toBeGreaterThan(0);
  });

  describe('emitir', () => {
    const abrir = async () => {
      renderizar();
      fireEvent.click(await screen.findByRole('button', { name: /Emitir nota/ }));
      const dialogo = await screen.findByRole('dialog');
      fireEvent.click(await within(dialogo).findByRole('button', { name: /IVO2609293699/ }));
      return dialogo;
    };

    it('o que o pedido já sabe vem preenchido', async () => {
      const dialogo = await abrir();
      expect(within(dialogo).getByLabelText('CPF ou CNPJ')).toHaveValue('11.222.333/0001-81');
      expect(within(dialogo).getByLabelText('CEP')).toHaveValue('77020-170');
      expect(within(dialogo).getByLabelText('Bairro')).toHaveValue('');
    });

    it('NF-e sem número e bairro marca os campos e não chama o servidor', async () => {
      const dialogo = await abrir();
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Emitir NF-e' }));
      expect(within(dialogo).getByLabelText('Número')).toHaveAttribute('aria-invalid', 'true');
      expect(within(dialogo).getByLabelText('Bairro')).toHaveAttribute('aria-invalid', 'true');
      expect(mocked.emitir).not.toHaveBeenCalled();
    });

    it('buscar o CNPJ preenche razão social e endereço', async () => {
      mocked.consultarCnpj.mockResolvedValue({
        documento: '11222333000181', nome: 'SINDICATO DOS SERVIDORES',
        endereco: {
          street: 'Quadra 103 Sul, Avenida LO 1', number: 'SN', complement: 'Sala 03',
          neighborhood: 'Plano Diretor Sul', city: 'Palmas', state: 'TO', zip_code: '77015028',
        },
      } as never);
      const dialogo = await abrir();
      fireEvent.click(within(dialogo).getByRole('button', { name: /Buscar CNPJ/ }));
      await waitFor(() =>
        expect(within(dialogo).getByLabelText('Bairro')).toHaveValue('Plano Diretor Sul'));
      expect(within(dialogo).getByLabelText('Nome ou razão social')).toHaveValue('SINDICATO DOS SERVIDORES');
      expect(mocked.consultarCnpj).toHaveBeenCalledWith('loja', '11222333000181');
    });

    it('emite a NF-e com o destinatário digitado e recarrega a lista', async () => {
      mocked.emitir.mockResolvedValue({ ...NOTA, id: 'n2' } as never);
      const dialogo = await abrir();
      fireEvent.change(within(dialogo).getByLabelText('Número'), { target: { value: '2' } });
      fireEvent.change(within(dialogo).getByLabelText('Bairro'), { target: { value: 'Plano Diretor Sul' } });
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Emitir NF-e' }));

      await waitFor(() => expect(mocked.emitir).toHaveBeenCalledTimes(1));
      expect(mocked.emitir).toHaveBeenCalledWith('loja', {
        order_id: 'p2',
        modelo: '55',
        destinatario: {
          documento: '11222333000181',
          nome: 'Sindicato da PF',
          inscricao_estadual: '',
          endereco: {
            street: 'Q. 112 Sul, Rua SR 01', number: '2', complement: '',
            neighborhood: 'Plano Diretor Sul', city: 'Palmas', state: 'TO', zip_code: '77020170',
          },
        },
      });
      await waitFor(() => expect(mocked.listarNotas).toHaveBeenCalledTimes(2));
    });

    it('rejeição da SEFAZ fica na tela, com o formulário aberto para corrigir', async () => {
      mocked.emitir.mockResolvedValue({
        ...NOTA, id: 'n3', status: 'rejected', error_message: 'Rejeição: IE do destinatário não informada',
      } as never);
      const dialogo = await abrir();
      fireEvent.change(within(dialogo).getByLabelText('Número'), { target: { value: '2' } });
      fireEvent.change(within(dialogo).getByLabelText('Bairro'), { target: { value: 'Plano Diretor Sul' } });
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Emitir NF-e' }));
      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(/IE do destinatário/);
    });

    it('com e-mail preenchido, a nota autorizada já sai para o destinatário', async () => {
      mocked.emitir.mockResolvedValue({
        ...NOTA, id: 'n5', email_enviado_para: 'sinpefto@gmail.com', email_enviado_em: '2026-09-30T15:00:00Z', email_erro: '',
      } as never);
      const dialogo = await abrir();
      fireEvent.change(within(dialogo).getByLabelText('Número'), { target: { value: '2' } });
      fireEvent.change(within(dialogo).getByLabelText('Bairro'), { target: { value: 'Plano Diretor Sul' } });
      fireEvent.change(within(dialogo).getByLabelText('E-mail'), { target: { value: ' Sinpefto@gmail.com ' } });
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Emitir NF-e' }));

      await waitFor(() => expect(mocked.emitir).toHaveBeenCalledTimes(1));
      const enviado = mocked.emitir.mock.calls[0][1];
      expect(enviado.enviar_email).toBe(true);
      expect(enviado.destinatario?.email).toBe('sinpefto@gmail.com');
    });

    it('desligar o envio emite a nota sem mandar e-mail', async () => {
      mocked.emitir.mockResolvedValue({ ...NOTA, id: 'n6' } as never);
      const dialogo = await abrir();
      fireEvent.change(within(dialogo).getByLabelText('Número'), { target: { value: '2' } });
      fireEvent.change(within(dialogo).getByLabelText('Bairro'), { target: { value: 'Plano Diretor Sul' } });
      fireEvent.change(within(dialogo).getByLabelText('E-mail'), { target: { value: 'sinpefto@gmail.com' } });
      fireEvent.click(within(dialogo).getByRole('switch', { name: 'Enviar a nota por e-mail' }));
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Emitir NF-e' }));

      await waitFor(() => expect(mocked.emitir).toHaveBeenCalledTimes(1));
      expect(mocked.emitir.mock.calls[0][1].enviar_email).toBeUndefined();
    });

    it('e-mail mal digitado marca o campo e não emite', async () => {
      const dialogo = await abrir();
      fireEvent.change(within(dialogo).getByLabelText('Número'), { target: { value: '2' } });
      fireEvent.change(within(dialogo).getByLabelText('Bairro'), { target: { value: 'Plano Diretor Sul' } });
      fireEvent.change(within(dialogo).getByLabelText('E-mail'), { target: { value: 'sem-arroba' } });
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Emitir NF-e' }));
      expect(within(dialogo).getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
      expect(mocked.emitir).not.toHaveBeenCalled();
    });

    it('nome com mais de 60 letras é barrado antes da SEFAZ recusar', async () => {
      const dialogo = await abrir();
      fireEvent.change(within(dialogo).getByLabelText('Número'), { target: { value: '2' } });
      fireEvent.change(within(dialogo).getByLabelText('Bairro'), { target: { value: 'Plano Diretor Sul' } });
      fireEvent.change(within(dialogo).getByLabelText('Nome ou razão social'), {
        target: { value: 'Sindicato dos Servidores da Polícia Federal no Estado do Tocantins' },
      });
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Emitir NF-e' }));
      expect(within(dialogo).getByLabelText('Nome ou razão social')).toHaveAttribute('aria-invalid', 'true');
      expect(within(dialogo).getByText(/Máx\. 60/)).toBeInTheDocument();
      expect(mocked.emitir).not.toHaveBeenCalled();
    });

    it('NFC-e sai sem destinatário', async () => {
      mocked.emitir.mockResolvedValue({ ...NOTA, id: 'n4', modelo: '65' } as never);
      const dialogo = await abrir();
      fireEvent.click(within(dialogo).getByRole('radio', { name: /NFC-e/ }));
      fireEvent.change(within(dialogo).getByLabelText('CPF ou CNPJ'), { target: { value: '' } });
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Emitir NFC-e' }));
      await waitFor(() =>
        expect(mocked.emitir).toHaveBeenCalledWith('loja', { order_id: 'p2', modelo: '65' }));
    });

    it('?pedido= abre a emissão já com o pedido escolhido', async () => {
      renderizar('/stores/loja/notas-fiscais?pedido=p2&documento=11222333000181');
      const dialogo = await screen.findByRole('dialog');
      await waitFor(() => expect(mocked.listarPedidos).toHaveBeenCalledWith('loja', { id: 'p2' }));
      expect(await within(dialogo).findByLabelText('CPF ou CNPJ')).toHaveValue('11.222.333/0001-81');
    });
  });
});
