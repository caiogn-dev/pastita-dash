import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react';
import OnboardingChecklist from '../OnboardingChecklist';
import * as onboarding from '../../../services/onboarding';

// Mock com factory explícita: services/onboarding.ts importa services/api.ts,
// que lê import.meta.env — não suportado pelo transform do ts-jest fora de
// src/mobile/. Uma factory evita que jest precise carregar o módulo real
// (automock via jest.mock(path) sem factory ainda carregaria api.ts).
jest.mock('../../../services/onboarding', () => ({
  getChecklist: jest.fn(),
}));
jest.mock('../../../hooks/useStore', () => ({ useStore: () => ({ store: { slug: 'loja' } }) }));

const mockGet = onboarding.getChecklist as jest.Mock;

function renderCard() {
  return render(<MemoryRouter><OnboardingChecklist /></MemoryRouter>);
}

describe('OnboardingChecklist', () => {
  beforeEach(() => { localStorage.clear(); });

  it('mostra progresso e um passo pendente com link', async () => {
    mockGet.mockResolvedValue({
      steps: [
        { key: 'account', label: 'Conta criada', done: true },
        { key: 'product', label: 'Cadastrar 1º produto', done: false },
      ],
      completed: 1, total: 6, all_done: false,
    });
    await act(async () => { renderCard(); });
    expect(await screen.findByText(/cadastrar 1º produto/i)).toBeTruthy();
    expect(screen.getByText(/1\/6|1 de 6/i)).toBeTruthy();
  });

  it('não renderiza quando all_done', async () => {
    mockGet.mockResolvedValue({ steps: [], completed: 6, total: 6, all_done: true });
    let c: { container: HTMLElement };
    await act(async () => { c = renderCard(); });
    expect(c!.container.textContent).not.toMatch(/primeiros passos/i);
  });

  it('não renderiza quando dispensado no localStorage', async () => {
    localStorage.setItem('onboarding_dismissed_loja', '1');
    mockGet.mockResolvedValue({ steps: [{ key: 'logo', label: 'Adicionar logo', done: false }],
                                completed: 1, total: 6, all_done: false });
    let c: { container: HTMLElement };
    await act(async () => { c = renderCard(); });
    expect(c!.container.textContent).not.toMatch(/primeiros passos/i);
  });
});
