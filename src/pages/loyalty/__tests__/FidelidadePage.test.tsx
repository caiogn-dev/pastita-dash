import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('../../../services/storesApi', () => ({
  getStores: jest.fn(),
  updateStore: jest.fn(),
  getCategories: jest.fn(),
}));
jest.mock('../../../services/loyalty', () => ({
  loyaltyService: { getAccounts: jest.fn() },
}));
jest.mock('../../../services/coupons', () => ({
  couponsService: { createCoupon: jest.fn() },
}));
jest.mock('../../../services/cashback', () => ({
  cashbackService: {
    get: jest.fn(),
    // A aba de cashback carrega as indicações junto. Sem o mock a página
    // estoura no render e leva a suíte inteira, escondendo o que se testa aqui.
    indicacoes: jest.fn().mockResolvedValue({
      indicacoes: [], por_indicador: [], referral_percent: '5',
    }),
  },
}));

import { cashbackService } from '../../../services/cashback';
import { couponsService } from '../../../services/coupons';
import { loyaltyService } from '../../../services/loyalty';
import { getStores, updateStore, getCategories } from '../../../services/storesApi';
import FidelidadePage from '../FidelidadePage';

const store = {
  id: 'uuid-1', slug: 'ce-saladas', name: 'Cê Saladas',
  metadata: { loyalty_enabled: true, loyalty_salads_required: 10 },
};
const page = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results });

const categoriesFixture = [
  { id: 'cat-1', store: 'uuid-1', name: 'Saladas Clássicas', slug: 'classicas', description: '', children: [], sort_order: 0, is_active: true, products_count: 3 },
  { id: 'cat-2', store: 'uuid-1', name: 'Saladas Especiais', slug: 'especiais', description: '', children: [], sort_order: 1, is_active: true, products_count: 2 },
];

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/stores/ce-saladas/fidelidade']}>
      <Routes>
        <Route path="/stores/:storeId/fidelidade" element={<FidelidadePage />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  (getStores as jest.Mock).mockResolvedValue(page([store]));
  (getCategories as jest.Mock).mockResolvedValue(page(categoriesFixture));
  (loyaltyService.getAccounts as jest.Mock).mockResolvedValue({
    count: 1,
    results: [{ user_id: 'u1', display_name: 'Ana', email: 'a@x.com', qualified_count: 7, redeemed_count: 0, progress: 7, available_rewards: 0, updated_at: '2026-07-28T00:00:00Z' }],
  });
  // Loja sem cashback ligado: a página abre no cartão de carimbo, que é o
  // que o resto deste arquivo exercita.
  (cashbackService.get as jest.Mock).mockResolvedValue({
    enabled: false,
    percent: '3',
    referral_percent: '5',
    expiry_days: 60,
    resumo: {
      saldo_em_circulacao: '0.00',
      ja_resgatado: '0.00',
      clientes_com_saldo: 0,
      saldo_de_indicacao: '0.00',
      vence_em_7_dias: '0.00',
    },
    count: 0,
    results: [],
  });
});

describe('FidelidadePage', () => {
  it('carrega config e lista clientes', async () => {
    renderPage();
    expect(await screen.findByDisplayValue('10')).toBeInTheDocument();
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText(/7\/10/)).toBeInTheDocument();
  });

  it('salva threshold com merge de metadata', async () => {
    (updateStore as jest.Mock).mockResolvedValue(store);
    renderPage();
    const input = await screen.findByLabelText(/itens para ganhar/i);
    await userEvent.clear(input);
    await userEvent.type(input, '8');
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(updateStore).toHaveBeenCalledWith('uuid-1', {
      metadata: expect.objectContaining({ loyalty_enabled: true, loyalty_salads_required: 8 }),
    }));
  });

  it('assume programa ativo quando loyalty_enabled está ausente do metadata', async () => {
    (getStores as jest.Mock).mockResolvedValue(
      page([{ id: 'uuid-1', slug: 'ce-saladas', name: 'Cê Saladas', metadata: { loyalty_salads_required: 10 } }])
    );
    renderPage();
    await screen.findByText('Ana');
    expect(screen.getByRole('checkbox', { name: /programa ativo/i })).toBeChecked();
  });

  it('marca uma categoria e salva com o ID no metadata', async () => {
    (updateStore as jest.Mock).mockResolvedValue(store);
    renderPage();
    const checkbox = await screen.findByRole('checkbox', { name: 'Saladas Especiais' });
    await userEvent.click(checkbox);
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(updateStore).toHaveBeenCalledWith('uuid-1', {
      metadata: expect.objectContaining({ loyalty_qualifying_categories: ['cat-2'] }),
    }));
  });

  it('salva array vazio quando nenhuma categoria está marcada', async () => {
    (updateStore as jest.Mock).mockResolvedValue(store);
    renderPage();
    await screen.findByRole('checkbox', { name: 'Saladas Especiais' });
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(updateStore).toHaveBeenCalledWith('uuid-1', {
      metadata: expect.objectContaining({ loyalty_qualifying_categories: [] }),
    }));
  });

  it('cria cupom de boas-vindas em 1 clique', async () => {
    (couponsService.createCoupon as jest.Mock).mockResolvedValue({ id: 'c1', code: 'BEMVINDO10' });
    renderPage();
    await screen.findByText('Ana');
    await userEvent.click(screen.getByRole('button', { name: /criar cupom de boas-vindas/i }));
    await waitFor(() => expect(couponsService.createCoupon).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'BEMVINDO10', first_order_only: true, is_featured: true, discount_type: 'percentage' })
    ));
  });
});

/**
 * Um programa OU outro.
 *
 * Cartão de carimbo e cashback ligados ao mesmo tempo empilham desconto sobre
 * desconto sem ninguém decidir isso, e viram duas promessas diferentes para
 * explicar ao mesmo cliente no WhatsApp.
 */
describe('FidelidadePage — escolha do programa', () => {
  // Cashback é o programa da loja: o cartão de carimbo está desligado. Os dois
  // ligados ao mesmo tempo não são um estado válido — é o bug que esta suíte
  // trava mais abaixo.
  const lojaComCashback = { ...store, metadata: { ...store.metadata, loyalty_enabled: false } };

  it('abre no cashback quando é ele que está ligado', async () => {
    (getStores as jest.Mock).mockResolvedValue(page([lojaComCashback]));
    (cashbackService.get as jest.Mock).mockResolvedValue({
      enabled: true,
      percent: '3',
      referral_percent: '5',
      expiry_days: 60,
      resumo: {
        saldo_em_circulacao: '340.00',
        ja_resgatado: '58.20',
        clientes_com_saldo: 12,
        saldo_de_indicacao: '25.00',
        vence_em_7_dias: '90.00',
      },
      count: 1,
      results: [
        { phone: '5563999547790', saldo: '12.50', vence_em: '2026-09-05T00:00:00Z', dias_para_vencer: 3 },
      ],
    });
    renderPage();
    // Dois nós legítimos dizem "Cashback ativo": o selo do cabeçalho e o
    // rótulo do interruptor da seção.
    expect((await screen.findAllByText('Cashback ativo')).length).toBeGreaterThan(0);
    expect(await screen.findByRole('radio', { name: /Cashback/i })).toBeChecked();
    // O número com prazo é o que manda agir — precisa estar na tela.
    expect(await screen.findByText(/R\$\s*90,00/)).toBeInTheDocument();
  });

  it('mostra o telefone legível na fila de quem vence primeiro', async () => {
    (getStores as jest.Mock).mockResolvedValue(page([lojaComCashback]));
    (cashbackService.get as jest.Mock).mockResolvedValue({
      enabled: true,
      percent: '3',
      referral_percent: '5',
      expiry_days: 60,
      resumo: {
        saldo_em_circulacao: '12.50', ja_resgatado: '0.00', clientes_com_saldo: 1,
        saldo_de_indicacao: '0.00', vence_em_7_dias: '12.50',
      },
      count: 1,
      results: [
        { phone: '5563999547790', saldo: '12.50', vence_em: '2026-09-05T00:00:00Z', dias_para_vencer: 3 },
      ],
    });
    renderPage();
    expect(await screen.findByText('(63) 99954-7790')).toBeInTheDocument();
    expect(screen.getByText('vence em 3 dias')).toBeInTheDocument();
  });

  it('ligar o cashback desliga o cartão de carimbo no mesmo salvar', async () => {
    (cashbackService.get as jest.Mock).mockResolvedValue({
      enabled: false, percent: '3', referral_percent: '5', expiry_days: 60,
      resumo: {
        saldo_em_circulacao: '0.00', ja_resgatado: '0.00', clientes_com_saldo: 0,
        saldo_de_indicacao: '0.00', vence_em_7_dias: '0.00',
      },
      count: 0, results: [],
    });
    (updateStore as jest.Mock).mockResolvedValue(store);
    renderPage();

    await userEvent.click(await screen.findByRole('radio', { name: /Cashback/i }));
    await userEvent.click(await screen.findByRole('checkbox', { name: /Cashback ativo/i }));
    await userEvent.click(screen.getByRole('button', { name: /Salvar cashback/i }));

    await waitFor(() => expect(updateStore).toHaveBeenCalled());
    const [, payload] = (updateStore as jest.Mock).mock.calls.at(-1)!;
    expect(payload.metadata.cashback_enabled).toBe(true);
    expect(payload.metadata.cashback_percent).toBe(3);
    expect(payload.metadata.cashback_referral_percent).toBe(5);
    expect(payload.metadata.loyalty_enabled).toBe(false);
  });
});

describe('FidelidadePage — um programa desliga o outro (mão dupla)', () => {
  const cashbackLigado = {
    enabled: true, percent: '3', referral_percent: '5', expiry_days: 60,
    resumo: {
      saldo_em_circulacao: '0.00', ja_resgatado: '0.00', clientes_com_saldo: 0,
      saldo_de_indicacao: '0.00', vence_em_7_dias: '0.00',
    },
    count: 0, results: [],
  };

  it('salvar o cartão de carimbo desliga o cashback no mesmo salvar', async () => {
    // Sem isto os dois ficam ligados no metadata: o cliente ganha carimbo E
    // saldo no mesmo pedido, e ao recarregar a tela volta para o cashback.
    (updateStore as jest.Mock).mockResolvedValue(store);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /^Salvar$/i }));

    await waitFor(() => expect(updateStore).toHaveBeenCalled());
    const [, payload] = (updateStore as jest.Mock).mock.calls.at(-1)!;
    expect(payload.metadata.loyalty_enabled).toBe(true);
    expect(payload.metadata.cashback_enabled).toBe(false);
  });

  it('desligar o carimbo não mexe no cashback', async () => {
    (updateStore as jest.Mock).mockResolvedValue(store);
    renderPage();

    await userEvent.click(await screen.findByRole('checkbox', { name: /Programa ativo/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Salvar$/i }));

    await waitFor(() => expect(updateStore).toHaveBeenCalled());
    const [, payload] = (updateStore as jest.Mock).mock.calls.at(-1)!;
    expect(payload.metadata.loyalty_enabled).toBe(false);
    expect(payload.metadata.cashback_enabled).toBeUndefined();
  });

  it('com os dois ligados no banco, abre no carimbo — não sequestra para o cashback', async () => {
    // Dado sujo herdado: cashback ligado E loyalty ligado. A tela abria no
    // cashback e o dono, que tinha acabado de ligar a fidelidade, via a
    // escolha dele voltar sozinha.
    const resposta = Promise.resolve(cashbackLigado);
    (cashbackService.get as jest.Mock).mockReturnValue(resposta);
    renderPage();
    await screen.findByText('Ana');
    // Garante que o efeito do cashback já resolveu antes de olhar o seletor.
    await act(async () => { await resposta; });

    expect(screen.getByRole('radio', { name: /Cartão de carimbo/i })).toBeChecked();
  });

  it('botão "Ativar programa" salva de verdade, não só marca na tela', async () => {
    (getStores as jest.Mock).mockResolvedValue(
      page([{ ...store, metadata: { ...store.metadata, loyalty_enabled: false } }])
    );
    (updateStore as jest.Mock).mockResolvedValue(store);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /Ativar programa/i }));

    await waitFor(() => expect(updateStore).toHaveBeenCalled());
    const [, payload] = (updateStore as jest.Mock).mock.calls.at(-1)!;
    expect(payload.metadata.loyalty_enabled).toBe(true);
    expect(payload.metadata.cashback_enabled).toBe(false);
  });
});
