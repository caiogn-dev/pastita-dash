/**
 * O link de avaliação do Google morava em Configurações → Geral → Avaliações
 * (26/10): longe da tela de avaliações, onde o dono pensa nele.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-hot-toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../../../services/logger', () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock('../../../services/storesApi', () => ({ getStore: jest.fn(), updateStore: jest.fn() }));
import * as api from '../../../services/storesApi';
import { LinkDoGoogle } from '../LinkDoGoogle';

beforeEach(() => {
  jest.clearAllMocks();
  (api.getStore as jest.Mock).mockResolvedValue({ metadata: { pausas: [1], google_review_url: 'https://g.page/r/velho/review' } });
  (api.updateStore as jest.Mock).mockResolvedValue({});
});

it('grava o link sem apagar o resto do metadata', async () => {
  const onSalvo = jest.fn();
  render(<LinkDoGoogle loja="ce" onSalvo={onSalvo} />);
  const campo = await screen.findByLabelText('Link de avaliação do Google');
  expect(campo).toHaveValue('https://g.page/r/velho/review');
  fireEvent.change(campo, { target: { value: ' https://g.page/r/novo/review ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(api.updateStore).toHaveBeenCalledWith('ce', {
    metadata: { pausas: [1], google_review_url: 'https://g.page/r/novo/review' },
  }));
  expect(onSalvo).toHaveBeenCalled();
});
