/**
 * "Prévia ao lado com números" (direção aprovada pelo dono em 25/09).
 *
 * A tela antiga era um assistente numa faixa estreita: o dono escrevia a
 * mensagem sem ver como ela chegava e só descobria quantas pessoas recebiam
 * na última tela. Aqui a prévia acompanha o formulário em tempo real, com as
 * variáveis já trocadas por um cliente de verdade da lista, e o botão final
 * diz exatamente o que faz.
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
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
  getTemplates: jest.fn(),
  syncTemplates: jest.fn().mockResolvedValue({}),
};
jest.mock('../../../../services/whatsapp', () => ({
  __esModule: true,
  get default() {
    return whatsapp;
  },
}));

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
    createCampaign: jest.fn(),
    startCampaign: jest.fn(),
    scheduleCampaign: jest.fn(),
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

const avancar = () => fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
const previa = () => screen.getByRole('figure', { name: /prévia da mensagem/i });
const resumo = () => screen.getByRole('region', { name: /resumo do envio/i });

const adicionarContato = async (telefone: string, nome = '') => {
  fireEvent.change(await screen.findByPlaceholderText(/5511999999999/i), {
    target: { value: telefone },
  });
  fireEvent.change(screen.getByPlaceholderText(/nome \(opcional\)/i), { target: { value: nome } });
  fireEvent.click(screen.getByRole('button', { name: /adicionar contato/i }));
};

describe('campanha de WhatsApp — prévia ao lado com números', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    whatsapp.getAccounts.mockResolvedValue({
      data: { results: [{ id: 'acc-1', name: 'Conta 1', status: 'active', display_phone_number: '+55 11 90000-0000' }] },
    });
    whatsapp.getTemplates.mockResolvedValue({ data: { results: [] } });
  });

  it('a prévia existe desde o primeiro passo e diz o que fazer quando vazia', async () => {
    abrir();
    await screen.findByRole('button', { name: /^conta 1/i });
    // Enquanto os templates carregam, o balão mostra o esqueleto; depois, o vazio.
    expect(await within(previa()).findByText(/aparece aqui/i)).toBeInTheDocument();
  });

  it('reflete o texto digitado, com {{nome}} trocado pelo primeiro cliente da lista', async () => {
    abrir();
    await screen.findByRole('button', { name: /^conta 1/i });
    avancar();
    await adicionarContato('11999998888', 'Ana Souza');
    avancar();

    fireEvent.click(await screen.findByRole('radio', { name: /texto livre/i }));
    fireEvent.change(screen.getByPlaceholderText(/digite sua mensagem/i), {
      target: { value: 'Oi, {{nome}}! *Promoção* de hoje' },
    });

    const balao = within(previa());
    expect(balao.getByText(/Oi, Ana Souza!/)).toBeInTheDocument();
    expect(balao.getByText('Promoção').tagName).toBe('STRONG');
    expect(balao.queryByText(/{{nome}}/)).not.toBeInTheDocument();

    // Mudou o texto, mudou a prévia — sem botão de "atualizar".
    fireEvent.change(screen.getByPlaceholderText(/digite sua mensagem/i), {
      target: { value: 'Até amanhã, {{nome}}' },
    });
    expect(balao.getByText('Até amanhã, Ana Souza')).toBeInTheDocument();
  });

  it('template: troca {{nome_cliente}} no corpo do template escolhido', async () => {
    whatsapp.getTemplates.mockResolvedValue({
      data: {
        results: [{
          id: 't1', name: 'boas_vindas', language: 'pt_BR', category: 'MARKETING',
          status: 'approved', account: 'acc-1',
          components: [{ type: 'BODY', text: 'Olá, {{nome_cliente}}, sentimos sua falta.' }],
        }],
      },
    });
    abrir();
    await screen.findByRole('button', { name: /^conta 1/i });
    avancar();
    await adicionarContato('11999998888', 'Bruno');
    avancar();

    fireEvent.click(await screen.findByRole('radio', { name: /boas_vindas/i }));
    expect(within(previa()).getByText('Olá, Bruno, sentimos sua falta.')).toBeInTheDocument();
  });

  it('o botão final diz para quantos clientes envia', async () => {
    abrir();
    await screen.findByRole('button', { name: /^conta 1/i });
    avancar();
    await adicionarContato('11999998888', 'Ana');
    await adicionarContato('11977776666', 'Bia');
    avancar();
    fireEvent.click(await screen.findByRole('radio', { name: /texto livre/i }));
    fireEvent.change(screen.getByPlaceholderText(/digite sua mensagem/i), {
      target: { value: 'Oi' },
    });
    avancar();

    const enviar = await screen.findByRole('button', { name: 'Enviar para 2 clientes' });
    expect(enviar).toBeEnabled();
    expect(screen.queryByRole('button', { name: /enviar agora/i })).not.toBeInTheDocument();
  });

  it('o resumo ao lado mostra quantos recebem e por qual conta', async () => {
    abrir();
    await screen.findByRole('button', { name: /^conta 1/i });
    avancar();
    await adicionarContato('11999998888', 'Ana');

    const r = within(resumo());
    expect(r.getByText('1 cliente')).toBeInTheDocument();
    expect(r.getByText(/Conta 1/)).toBeInTheDocument();
  });
});
