/**
 * Formas de pagamento no cardápio, com interruptor (25/11, Ivoneth).
 * Só aparecem as que a loja PODE oferecer (gateway conectado); cada uma liga
 * e desliga na hora.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const buscar = jest.fn();
const salvar = jest.fn();
jest.mock('../../../services/storesApi', () => ({
  getFormasDePagamento: (...a: unknown[]) => buscar(...a),
  updateFormasDePagamento: (...a: unknown[]) => salvar(...a),
}));

import FormasNoCardapioSection, { type InterruptorDaForma } from '../FormasNoCardapioSection';
import { SalvarJunto, useSalvarJunto } from '../salvarJunto';

const FORMAS = [
  { metodo: 'pix', rotulo: 'PIX', disponivel: true, ligada: true },
  { metodo: 'credit_card', rotulo: 'Cartão online', disponivel: false, ligada: true },
  { metodo: 'cash', rotulo: 'Dinheiro na entrega ou retirada', disponivel: true, ligada: false },
  { metodo: 'card_on_delivery', rotulo: 'Maquininha na entrega ou retirada', disponivel: true, ligada: true },
];

beforeEach(() => {
  jest.clearAllMocks();
  buscar.mockResolvedValue({ formas: FORMAS });
});

describe('FormasNoCardapioSection', () => {
  it('enquanto carrega, mostra o esqueleto; se falhar, oferece tentar de novo', async () => {
    buscar.mockRejectedValueOnce(new Error('502'));
    render(<FormasNoCardapioSection storeId="s1" />);
    expect(screen.getByLabelText(/carregando formas/i)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /tentar de novo/i }));
    expect(await screen.findByRole('switch', { name: 'PIX' })).toBeInTheDocument();
  });

  it('lista só as disponíveis, cada uma com o estado atual', async () => {
    render(<FormasNoCardapioSection storeId="s1" />);
    expect(await screen.findByRole('switch', { name: 'PIX' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /dinheiro/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByRole('switch', { name: /cartão online/i })).toBeNull();
  });

  it('desligar grava a lista completa de desligadas', async () => {
    salvar.mockResolvedValue({ formas: FORMAS.map((f) => (f.metodo === 'pix' ? { ...f, ligada: false } : f)) });
    render(<FormasNoCardapioSection storeId="s1" />);
    fireEvent.click(await screen.findByRole('switch', { name: 'PIX' }));
    await waitFor(() => expect(salvar).toHaveBeenCalledWith('s1', ['pix', 'cash']));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'PIX' })).toHaveAttribute('aria-checked', 'false'));
  });

  it('não deixa desligar a última forma ligada', async () => {
    buscar.mockResolvedValue({ formas: [
      { metodo: 'pix', rotulo: 'PIX', disponivel: true, ligada: true },
      { metodo: 'cash', rotulo: 'Dinheiro', disponivel: true, ligada: false },
    ] });
    render(<FormasNoCardapioSection storeId="s1" />);
    expect(await screen.findByRole('switch', { name: 'PIX' })).toBeDisabled();
  });

  it('falha ao salvar volta o interruptor', async () => {
    salvar.mockRejectedValue(new Error('x'));
    render(<FormasNoCardapioSection storeId="s1" />);
    fireEvent.click(await screen.findByRole('switch', { name: 'PIX' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'PIX' })).toHaveAttribute('aria-checked', 'true'));
  });
});

describe('FormasNoCardapioSection — configuração aninhada na forma', () => {
  const COM_VALE = [
    { metodo: 'pix', rotulo: 'PIX', disponivel: true, ligada: true },
    { metodo: 'voucher', rotulo: 'Vale-refeição no cardápio', disponivel: false, ligada: true },
  ];
  const configDoVale = jest.fn((i: InterruptorDaForma) => (i.ligada ? <p>Bandeiras do vale</p> : null));

  const Pagina: React.FC = () => {
    const juntas = useSalvarJunto();
    return (
      <SalvarJunto registro={juntas.registro}>
        <FormasNoCardapioSection storeId="s1" detalhes={{ voucher: configDoVale }} />
        <span data-testid="mudancas">{juntas.mudancas}</span>
        <button type="button" onClick={() => void juntas.salvar()}>Salvar tudo</button>
        <button type="button" onClick={() => juntas.descartar()}>Descartar tudo</button>
      </SalvarJunto>
    );
  };

  beforeEach(() => { buscar.mockResolvedValue({ formas: COM_VALE }); });

  it('forma com configuração aparece mesmo indisponível: é ali que ela fica disponível', async () => {
    render(<Pagina />);
    expect(await screen.findByRole('switch', { name: /vale-refeição/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('desligada, a configuração do vale não é desenhada; ligada, aparece debaixo da linha', async () => {
    render(<Pagina />);
    const vale = await screen.findByRole('switch', { name: /vale-refeição/i });
    expect(screen.queryByText('Bandeiras do vale')).not.toBeInTheDocument();
    fireEvent.click(vale);
    expect(screen.getByText('Bandeiras do vale')).toBeInTheDocument();
    expect(configDoVale).toHaveBeenLastCalledWith({ ligada: true, toques: 1 });
  });

  it('no salvar único, o interruptor não grava no ato: entra na barra', async () => {
    buscar.mockResolvedValue({ formas: FORMAS });
    salvar.mockResolvedValue({ formas: FORMAS });
    render(<Pagina />);
    fireEvent.click(await screen.findByRole('switch', { name: 'PIX' }));
    expect(salvar).not.toHaveBeenCalled();
    expect(screen.getByTestId('mudancas')).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar tudo' }));
    await waitFor(() => expect(salvar).toHaveBeenCalledWith('s1', ['pix', 'cash']));
  });

  it('descartar volta o interruptor', async () => {
    buscar.mockResolvedValue({ formas: FORMAS });
    render(<Pagina />);
    const pix = await screen.findByRole('switch', { name: 'PIX' });
    fireEvent.click(pix);
    fireEvent.click(screen.getByRole('button', { name: 'Descartar tudo' }));
    expect(pix).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('mudancas')).toHaveTextContent('0');
  });
});

describe('FormasNoCardapioSection — vale ainda indisponível', () => {
  it('ligar conta na barra e o Descartar volta o interruptor', async () => {
    buscar.mockResolvedValue({ formas: [
      { metodo: 'pix', rotulo: 'PIX', disponivel: true, ligada: true },
      { metodo: 'voucher', rotulo: 'Vale-refeição no cardápio', disponivel: false, ligada: true },
    ] });
    const Pagina: React.FC = () => {
      const juntas = useSalvarJunto();
      return (
        <SalvarJunto registro={juntas.registro}>
          <FormasNoCardapioSection storeId="s1" detalhes={{ voucher: () => null }} />
          <span data-testid="mudancas">{juntas.mudancas}</span>
          <button type="button" onClick={() => juntas.descartar()}>Descartar tudo</button>
        </SalvarJunto>
      );
    };
    render(<Pagina />);
    const vale = await screen.findByRole('switch', { name: /vale-refeição/i });
    fireEvent.click(vale);
    expect(screen.getByTestId('mudancas')).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('button', { name: 'Descartar tudo' }));
    expect(vale).toHaveAttribute('aria-checked', 'false');
  });
});
