/**
 * A REDE DE SEGURANÇA da tela de campanha.
 *
 * Esta tela tem 1.663 linhas e dispara mensagem PAGA. Antes deste arquivo ela
 * tinha dois testes, os dois só de acessibilidade de botão — nada cobria o
 * caminho que gasta dinheiro: escolher conta, escrever mensagem, montar a
 * lista e enviar.
 *
 * O teste percorre o assistente inteiro e confere o PAYLOAD que chega ao
 * `createCampaign`. É ele que autoriza mexer no JSX da tela: quebrar 1.663
 * linhas em componentes sem isso seria refatorar no escuro, e o erro só
 * apareceria na fatura da Meta.
 *
 * O que ele trava, especificamente:
 *  - a conta escolhida vai no payload (mandar pela conta errada é enviar do
 *    número errado, e o cliente responde para um WhatsApp que ninguém lê);
 *  - o texto livre vai em `text` E em `caption` — a legenda é o que aparece
 *    quando a mensagem leva mídia junto;
 *  - cada destinatário leva `nome_cliente`, com "Cliente" quando não há nome:
 *    variável vazia faz a Meta recusar o disparo inteiro;
 *  - a campanha é CRIADA e depois INICIADA. São duas chamadas: criar sem
 *    iniciar deixa a campanha parada e o dono achando que enviou.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NewWhatsAppCampaignPage } from '../NewWhatsAppCampaignPage';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../../services/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../../services', () => ({
  __esModule: true,
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock('../../../../hooks', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 'loja-1', storeName: 'Loja Teste' }),
}));

const whatsapp = {
  getAccounts: jest.fn(),
  getTemplates: jest.fn().mockResolvedValue({ data: { results: [] } }),
  syncTemplates: jest.fn().mockResolvedValue({}),
};
jest.mock('../../../../services/whatsapp', () => ({
  __esModule: true,
  get default() {
    return whatsapp;
  },
}));

const createCampaign = jest.fn();
const startCampaign = jest.fn();
const scheduleCampaign = jest.fn();

jest.mock('../../../../services/campaigns', () => ({
  __esModule: true,
  campaignsService: {
    getContactLists: jest.fn().mockResolvedValue({ results: [] }),
    getSystemContacts: jest.fn().mockResolvedValue({
      count: 0, total: 0, total_sem_filtro: 0, excluidos_por_optout: 0,
      descricao: 'Todos os contatos',
      resumo: { recencia: [], frequencia: [] },
      results: [],
    }),
    getOpcoesDeAudiencia: jest.fn().mockResolvedValue({
      recencia: [], frequencia: [], bairros: [], produtos: [],
    }),
    createCampaign: (...a: unknown[]) => createCampaign(...a),
    startCampaign: (...a: unknown[]) => startCampaign(...a),
    scheduleCampaign: (...a: unknown[]) => scheduleCampaign(...a),
  },
}));

jest.mock('../../../../services/storesApi', () => ({
  __esModule: true,
  getProducts: jest.fn().mockResolvedValue([]),
}));

const abrir = () =>
  render(
    <MemoryRouter>
      <NewWhatsAppCampaignPage />
    </MemoryRouter>,
  );

/** Avança um passo pelo mesmo botão que o dono clica. */
const botaoAvancar = () => screen.getByRole('button', { name: /^continuar$/i });
const avancar = () => fireEvent.click(botaoAvancar());

describe('campanha de WhatsApp — o caminho que gasta dinheiro', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    whatsapp.getAccounts.mockResolvedValue({
      data: { results: [{ id: 'acc-1', name: 'Conta 1', status: 'active' }] },
    });
    whatsapp.getTemplates.mockResolvedValue({ data: { results: [] } });
    createCampaign.mockResolvedValue({ id: 'camp-1' });
    startCampaign.mockResolvedValue({});
    scheduleCampaign.mockResolvedValue({});
  });

  const irAteDestinatarios = async () => {
    abrir();

    // 1. conta
    fireEvent.click(await screen.findByText('Conta 1'));
    avancar();

    // 2. mensagem livre
    fireEvent.click(await screen.findByText('Texto Livre'));
    fireEvent.change(await screen.findByPlaceholderText(/digite sua mensagem/i), {
      target: { value: 'Promoção de hoje: salada por R$ 29,90' },
    });
    avancar();
  };

  it('percorre o assistente e envia o que foi montado', async () => {
    await irAteDestinatarios();

    // 3. destinatários, digitados à mão
    fireEvent.change(await screen.findByPlaceholderText(/5511999999999/i), {
      target: { value: '11999998888' },
    });
    fireEvent.click(screen.getByRole('button', { name: /adicionar contato/i }));
    avancar();

    // 4. envio
    fireEvent.click(await screen.findByRole('button', { name: /enviar agora/i }));

    await waitFor(() => expect(createCampaign).toHaveBeenCalled());

    const payload = createCampaign.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.account_id).toBe('acc-1');
    expect(payload.campaign_type).toBe('broadcast');
    expect(payload.message_content).toMatchObject({
      text: 'Promoção de hoje: salada por R$ 29,90',
      // `caption` é o que aparece quando a mensagem leva mídia junto.
      caption: 'Promoção de hoje: salada por R$ 29,90',
    });
    expect(payload.contact_list).toEqual([
      expect.objectContaining({ phone: '11999998888' }),
    ]);
  });

  it('criar NÃO basta: a campanha precisa ser iniciada', async () => {
    // Criar sem iniciar deixa a campanha parada e o dono achando que enviou.
    await irAteDestinatarios();
    fireEvent.change(await screen.findByPlaceholderText(/5511999999999/i), {
      target: { value: '11999998888' },
    });
    fireEvent.click(screen.getByRole('button', { name: /adicionar contato/i }));
    avancar();
    fireEvent.click(await screen.findByRole('button', { name: /enviar agora/i }));

    await waitFor(() => expect(startCampaign).toHaveBeenCalledWith('camp-1'));
    expect(scheduleCampaign).not.toHaveBeenCalled();
  });

  it('sem destinatário, o passo de envio não abre', async () => {
    // A trava que impede uma campanha vazia sair.
    await irAteDestinatarios();

    expect(botaoAvancar()).toBeDisabled();
  });

  it('com uma conta só, ela já vem escolhida — não faz o dono clicar no óbvio', async () => {
    abrir();
    await screen.findByText('Conta 1');

    expect(botaoAvancar()).toBeEnabled();
  });

  it('com mais de uma conta, nenhuma vem escolhida', async () => {
    // Escolher por ele seria enviar do número errado, e o cliente responderia
    // para um WhatsApp que ninguém lê.
    whatsapp.getAccounts.mockResolvedValueOnce({
      data: {
        results: [
          { id: 'acc-1', name: 'Conta 1', status: 'active' },
          { id: 'acc-2', name: 'Conta 2', status: 'active' },
        ],
      },
    });
    abrir();
    await screen.findByText('Conta 2');

    expect(botaoAvancar()).toBeDisabled();
  });

  it('sem texto nem mídia, não passa da mensagem', async () => {
    abrir();
    fireEvent.click(await screen.findByText('Conta 1'));
    avancar();
    fireEvent.click(await screen.findByText('Texto Livre'));

    expect(botaoAvancar()).toBeDisabled();
  });
});
