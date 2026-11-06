import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImportarExtrato99 } from '../ImportarExtrato99';
import { importarExtrato99 } from '../../../../services/reports';

const invalidar = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidar }),
}));
jest.mock('../../../../services/reports', () => ({
  importarExtrato99: jest.fn(),
}));

const mocked = importarExtrato99 as jest.Mock;

// Exatamente como o dono copiou do 99store em 06/11.
const COLADO = '#6\n06 de nov. 11:18\nR$44,99\nR$29,05\nConcluído\n#5\n06 de nov. 11:19\nR$39,99\nR$17,62\nConcluído';

const PREVIA = {
  conciliados: 6, sem_pedido: 0, divergentes: 0, venda: '258.76', recebido: '158.42', gravado: false,
  linhas: [{ pedido: '6', data: '2026-11-06', venda: '44.99', recebido: '29.05', situacao: 'conciliado', numero_do_pedido: 'CE-1' }],
};

describe('ImportarExtrato99', () => {
  beforeEach(() => {
    mocked.mockReset();
    invalidar.mockReset();
  });

  it('cola o texto, mostra a prévia e só grava ao confirmar', async () => {
    mocked.mockResolvedValueOnce(PREVIA).mockResolvedValueOnce({ ...PREVIA, gravado: true });
    render(<ImportarExtrato99 />);

    fireEvent.click(screen.getByRole('button', { name: /importar extrato da 99/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: COLADO } });
    fireEvent.click(screen.getByRole('button', { name: /ver prévia/i }));

    await screen.findByText(/R\$\s?158,42/);
    expect(mocked).toHaveBeenCalledWith({ texto: COLADO, arquivo: null, gravar: false });
    expect(screen.getByText(/R\$\s?258,76/)).toBeInTheDocument();
    expect(screen.getByText('Conciliados').nextSibling).toHaveTextContent('6');
    expect(screen.getByText('Sem pedido')).toBeInTheDocument();
    expect(screen.getByText('Divergentes')).toBeInTheDocument();
    expect(invalidar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    await waitFor(() => expect(mocked).toHaveBeenLastCalledWith({ texto: COLADO, arquivo: null, gravar: true }));
    await waitFor(() => expect(invalidar).toHaveBeenCalledWith({ queryKey: ['reports'] }));
  });

  it('sem pedido conciliado não deixa confirmar', async () => {
    mocked.mockResolvedValueOnce({ ...PREVIA, conciliados: 0, sem_pedido: 2, venda: '0.00', recebido: '0.00', linhas: [] });
    render(<ImportarExtrato99 />);
    fireEvent.click(screen.getByRole('button', { name: /importar extrato da 99/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: COLADO } });
    fireEvent.click(screen.getByRole('button', { name: /ver prévia/i }));
    await screen.findByText('Sem pedido');
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeDisabled();
  });

  it('erro do servidor aparece e não grava', async () => {
    mocked.mockRejectedValueOnce({ response: { data: { error: 'Não achei pedidos nesse extrato.' } } });
    render(<ImportarExtrato99 />);
    fireEvent.click(screen.getByRole('button', { name: /importar extrato da 99/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'oi' } });
    fireEvent.click(screen.getByRole('button', { name: /ver prévia/i }));
    expect(await screen.findByText('Não achei pedidos nesse extrato.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirmar/i })).not.toBeInTheDocument();
  });
});
