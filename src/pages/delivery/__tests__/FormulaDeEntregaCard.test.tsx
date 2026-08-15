/**
 * A tela do preço da entrega.
 *
 * Dois riscos que os testes travam:
 *
 * 1. **Salvar apagando o resto.** `metadata` guarda também rastreamento do
 *    Meta, Clarity e config fiscal. Um PATCH com metadata parcial apaga tudo
 *    isso — já aconteceu neste repo, e por isso a página reenvia o objeto
 *    inteiro.
 * 2. **Editar um preço que não vale.** Enquanto houver faixa manual ativa, ela
 *    tem precedência sobre a fórmula. Sem dizer isso na tela, o dono ajusta o
 *    número, salva, e o cliente continua pagando outra coisa — foi assim que
 *    duas telas ficaram discordando sobre o mesmo preço.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { FormulaDeEntregaCard, lerFormula, gravarFormula } from '../FormulaDeEntregaCard';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const METADATA = {
  delivery_base_fee: 7,
  delivery_flat_km: 2,
  delivery_fee_per_km: 1,
  delivery_far_km: 12,
  delivery_fee_per_km_far: 2,
  delivery_max_distance: 17,
  // Vizinhos que não podem sumir no salvamento.
  meta_pixel_id: '123456',
  clarity_id: 'abc',
};

const montar = (props: Partial<React.ComponentProps<typeof FormulaDeEntregaCard>> = {}) => {
  const onSalvar = props.onSalvar ?? jest.fn().mockResolvedValue(undefined);
  render(
    <FormulaDeEntregaCard
      metadataAtual={METADATA}
      onSalvar={onSalvar}
      faixasAtivas={0}
      {...props}
    />,
  );
  return { onSalvar };
};

describe('prévia — o dono vê o preço, não o coeficiente', () => {
  it('mostra o valor para as distâncias de referência', () => {
    montar();
    const previa = screen.getByTestId('previa-de-precos');

    expect(within(previa).getByText('2 km')).toBeInTheDocument();
    expect(within(previa).getByText('R$ 7,00')).toBeInTheDocument();
    expect(within(previa).getByText('R$ 10,00')).toBeInTheDocument();  // 5 km
    expect(within(previa).getByText('R$ 15,00')).toBeInTheDocument();  // 10 km
    expect(within(previa).getByText('R$ 23,00')).toBeInTheDocument();  // 15 km
  });

  it('a prévia acompanha a digitação, sem precisar salvar', async () => {
    montar();
    const base = screen.getByLabelText(/taxa base/i);

    await userEvent.clear(base);
    await userEvent.type(base, '10');

    const previa = screen.getByTestId('previa-de-precos');
    await waitFor(() => expect(within(previa).getByText('R$ 10,00')).toBeInTheDocument());
  });

  it('distância acima do raio máximo aparece como "Não entrega"', async () => {
    montar();
    const maximo = screen.getByLabelText(/raio máximo/i);

    await userEvent.clear(maximo);
    await userEvent.type(maximo, '8');

    const previa = screen.getByTestId('previa-de-precos');
    await waitFor(() => expect(within(previa).getAllByText('Não entrega').length).toBeGreaterThan(0));
  });
});

describe('salvar preserva o resto do metadata', () => {
  it('reenvia pixel e clarity intactos', async () => {
    const { onSalvar } = montar();

    await userEvent.click(screen.getByRole('button', { name: /salvar preço/i }));

    await waitFor(() => expect(onSalvar).toHaveBeenCalled());
    const enviado = onSalvar.mock.calls[0][0];
    expect(enviado.meta_pixel_id).toBe('123456');
    expect(enviado.clarity_id).toBe('abc');
  });

  it('grava nas chaves que o backend lê', async () => {
    const { onSalvar } = montar();
    const porKm = screen.getByLabelText(/por km adicional/i);

    await userEvent.clear(porKm);
    await userEvent.type(porKm, '2');
    await userEvent.click(screen.getByRole('button', { name: /salvar preço/i }));

    await waitFor(() => expect(onSalvar).toHaveBeenCalled());
    expect(onSalvar.mock.calls[0][0].delivery_fee_per_km).toBe(2);
  });
});

describe('fórmula incoerente não é salva', () => {
  it('avisa e bloqueia quando o raio plano passa do máximo', async () => {
    const { onSalvar } = montar();
    const plano = screen.getByLabelText(/raio plano/i);

    await userEvent.clear(plano);
    await userEvent.type(plano, '30');

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/raio plano é maior/i));
    expect(screen.getByRole('button', { name: /salvar preço/i })).toBeDisabled();
    expect(onSalvar).not.toHaveBeenCalled();
  });
});

describe('precedência das faixas manuais', () => {
  it('avisa que a fórmula não vale enquanto houver faixa ativa', () => {
    montar({ faixasAtivas: 16 });

    expect(screen.getByRole('alert')).toHaveTextContent(/16 faixas manuais ativas/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/prioridade/i);
  });

  it('sem faixas, nenhum aviso', () => {
    montar({ faixasAtivas: 0 });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('lerFormula / gravarFormula', () => {
  it('aceita o nome legado do raio plano', () => {
    expect(lerFormula({ delivery_free_km: 3 }).raioPlanoKm).toBe(3);
  });

  it('opcional vazio sai do metadata em vez de virar zero', () => {
    // `delivery_far_km: 0` significaria "encarece a partir de zero km".
    const saida = gravarFormula({}, {
      taxaBase: 7, raioPlanoKm: 2, porKm: 1, raioMaximoKm: 16,
      encareceEmKm: null, porKmLonge: null, taxaMaxima: null,
    });
    expect(saida.delivery_far_km).toBeUndefined();
    expect(saida.delivery_max_fee).toBeUndefined();
  });
});
