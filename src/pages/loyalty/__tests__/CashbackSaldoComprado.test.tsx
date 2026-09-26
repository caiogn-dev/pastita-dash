/**
 * A aba de clientes do cashback mostra quem COMPROU saldo, mais novo primeiro.
 *
 * 26/09: a fila é ordenada por vencimento (certo para "a quem eu falo hoje");
 * a compra da Flaviane, com 30 dias de validade, caiu na página 2 de 69 e o
 * dono não a encontrou em lugar nenhum do painel.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../services/cashback', () => ({
  cashbackService: { get: jest.fn(), ajustar: jest.fn() },
}));

import { cashbackService } from '../../../services/cashback';
import { CashbackSection } from '../CashbackSection';

const linha = (phone: string, nome: string, carteira: string) => ({
  phone, nome, saldo: carteira, saldo_carteira: carteira, cupons_entrega: 0,
  vence_em: '2026-10-26', dias_para_vencer: 30,
});

const props = {
  dados: { enabled: true, percent: '2', referral_percent: '5', expiry_days: 30, count: 1,
           resumo: {} as never, results: [linha('5563900000001', 'Antiga', '5.00')] },
  carregando: false, percent: '2', referralPercent: '5', expiryDays: '30',
  onPercent: jest.fn(), onReferralPercent: jest.fn(), onExpiryDays: jest.fn(), onSalvar: jest.fn(),
  salvando: false, ligado: true, onLigado: jest.fn(), storeSlug: 'ce-saladas',
};

describe('Saldo comprado (carteira)', () => {
  it('busca o recorte prepaid mais recente e mostra quem comprou', async () => {
    (cashbackService.get as jest.Mock).mockResolvedValue({ results: [linha('5511976457452', 'Flaviane Paes', '152.00')] });
    render(<MemoryRouter><CashbackSection {...(props as never)} parte="clientes" /></MemoryRouter>);

    expect(await screen.findByText('Saldo comprado (carteira)')).toBeInTheDocument();
    expect(screen.getByText('Flaviane Paes')).toBeInTheDocument();
    expect(cashbackService.get).toHaveBeenCalledWith('ce-saladas', 1, { origem: 'prepaid', ordem: 'recente' });
  });

  it('sem compra o cartão não aparece', async () => {
    (cashbackService.get as jest.Mock).mockResolvedValue({ results: [] });
    render(<MemoryRouter><CashbackSection {...(props as never)} parte="clientes" /></MemoryRouter>);
    expect(await screen.findByText('Quem perde saldo primeiro')).toBeInTheDocument();
    expect(screen.queryByText('Saldo comprado (carteira)')).toBeNull();
  });
});
