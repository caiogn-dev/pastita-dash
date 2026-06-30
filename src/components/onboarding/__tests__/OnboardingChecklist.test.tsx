import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react';
import OnboardingChecklist from '../OnboardingChecklist';
import * as onboarding from '../../../services/onboarding';

jest.mock('../../../services/onboarding', () => ({ getChecklist: jest.fn() }));
jest.mock('../../../hooks/useStore', () => ({ useStore: () => ({ store: { slug: 'loja' }, storeId: 'loja' }) }));

const mockGet = onboarding.getChecklist as jest.Mock;

function renderCard() {
  return render(<MemoryRouter><OnboardingChecklist /></MemoryRouter>);
}

describe('OnboardingChecklist (redesign)', () => {
  it('mostra o anel de progresso e um passo pendente com link', async () => {
    mockGet.mockResolvedValue({
      steps: [
        { key: 'account', label: 'Conta criada', done: true },
        { key: 'product', label: 'Cadastrar 1º produto', done: false },
      ],
      completed: 1, total: 6, all_done: false,
    });
    await act(async () => { renderCard(); });
    expect(await screen.findByText('1/6')).toBeTruthy();
    const link = screen.getByRole('link', { name: /cadastrar 1º produto/i });
    expect(link.getAttribute('href')).toBe('/stores/loja/products');
  });

  it('não renderiza quando all_done', async () => {
    mockGet.mockResolvedValue({ steps: [], completed: 6, total: 6, all_done: true });
    let c: { container: HTMLElement };
    await act(async () => { c = renderCard(); });
    expect(c!.container.textContent).not.toMatch(/primeiros passos/i);
  });

  it('não renderiza quando o fetch falha', async () => {
    mockGet.mockRejectedValue(new Error('net'));
    let c: { container: HTMLElement };
    await act(async () => { c = renderCard(); });
    expect(c!.container.textContent).not.toMatch(/primeiros passos/i);
  });
});
