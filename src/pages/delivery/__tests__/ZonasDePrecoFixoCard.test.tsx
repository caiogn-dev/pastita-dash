/**
 * Regiões fora da cidade (06/10, Agrião): o lojista liga, na própria zona,
 * as categorias que viajam, entrega no dia seguinte (domingo não sai) e
 * pagamento só antecipado. Sem tela, o recurso fica só no banco — como as
 * zonas ficaram até 08/ago.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { ZonasDePrecoFixoCard } from '../ZonasDePrecoFixoCard';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const CATEGORIAS = [
  { id: 'cat-cong', name: 'Congelados' },
  { id: 'cat-sal', name: 'Saladas' },
];

const montar = (zonas: unknown[]) => {
  const onSalvar = jest.fn().mockResolvedValue(undefined);
  render(
    <ZonasDePrecoFixoCard
      metadataAtual={{ fixed_price_zones: zonas }}
      categorias={CATEGORIAS}
      onSalvar={onSalvar}
    />
  );
  return onSalvar;
};

describe('ZonasDePrecoFixoCard — regras da região', () => {
  it('liga categorias, dia seguinte sem domingo e pagamento antecipado', async () => {
    const onSalvar = montar([{ name: 'Paraíso do Tocantins', fee: 30 }]);
    const user = userEvent.setup();

    await user.click(screen.getByRole('checkbox', { name: 'Congelados' }));
    await user.click(screen.getByRole('checkbox', { name: /dia seguinte/i }));
    await user.click(screen.getByRole('checkbox', { name: 'Dom' }));
    await user.click(screen.getByRole('checkbox', { name: /antecipado/i }));
    await user.click(screen.getByRole('button', { name: /salvar zonas/i }));

    await waitFor(() => expect(onSalvar).toHaveBeenCalled());
    expect(onSalvar.mock.calls[0][0][0]).toMatchObject({
      name: 'Paraíso do Tocantins', fee: 30, categorias: ['cat-cong'],
      entrega_dia_seguinte: true, dias_sem_entrega: [6], so_pagamento_antecipado: true,
    });
  });

  it('regras salvas aparecem marcadas', () => {
    montar([{ name: 'Porto Nacional', fee: 25, categorias: ['cat-sal'], so_pagamento_antecipado: true }]);
    expect(screen.getByRole('checkbox', { name: 'Saladas' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Congelados' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /antecipado/i })).toBeChecked();
  });

  it('dias sem entrega só aparecem com a entrega no dia seguinte ligada', () => {
    montar([{ name: 'Porto Nacional', fee: 25 }]);
    expect(screen.queryByRole('checkbox', { name: 'Dom' })).not.toBeInTheDocument();
  });

  it('zona de acréscimo não mostra regras de região', async () => {
    montar([{ name: 'Alphaville', surcharge_on_km: true, surcharge: 5 }]);
    expect(screen.queryByRole('checkbox', { name: /antecipado/i })).not.toBeInTheDocument();
  });
});
