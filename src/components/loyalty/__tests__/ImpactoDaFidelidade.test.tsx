/**
 * "Quanto custa e está valendo a pena" — respondido sem sair da tela.
 *
 * O formulário dizia "10 itens = 1 grátis" e nada sobre o custo. Aqui o texto
 * acompanha o que o dono digita, a recompra aparece como UM número, e quem
 * está a um item do brinde vira um botão que leva para a campanha.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { ImpactoDaFidelidade } from '../ImpactoDaFidelidade';
import type { LoyaltyImpacto } from '../../../services/loyaltyImpacto';

const base: LoyaltyImpacto = {
  janela_dias: 90,
  pedidos_pagos: 180,
  ticket_medio: 48.5,
  pedidos_por_mes: 60,
  receita_paga_mes: 18400,
  amostra_suficiente: true,
  pedidos_faltando: 0,
  participantes: 122,
  taxa_recompra_participantes: 0.48,
  taxa_recompra_nao_participantes: 0.22,
  itens_para_ganhar: 10,
  carimbos_por_mes: 90,
  brindes_por_mes_projetados: 9,
  custo_por_brinde: 27,
  custo_por_brinde_origem: 'resgates',
  custo_projetado_mes: 243,
  cashback_percentual: 3,
  saldo_gerado_mes: 552,
  a_um_item_total: 2,
  a_um_item: [
    { id: '1', nome: 'Nair', telefone: '55*******1111', faltam: 1 },
    { id: '2', nome: 'Rui', telefone: '55*******2222', faltam: 1 },
  ],
};

const Onde = () => {
  const loc = useLocation();
  return <p data-testid="onde">{loc.pathname + loc.search}</p>;
};

const renderiza = (props: Partial<React.ComponentProps<typeof ImpactoDaFidelidade>> = {}) =>
  render(
    <MemoryRouter initialEntries={['/fidelidade']}>
      <Routes>
        <Route
          path="/fidelidade"
          element={<ImpactoDaFidelidade tipo="carimbo" dados={base} itensParaGanhar="10" percentual="3" {...props} />}
        />
        <Route path="/marketing/whatsapp/new" element={<Onde />} />
      </Routes>
    </MemoryRouter>,
  );

// Intl põe espaço não separável depois do "R$".
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ');
const texto = () => norm(screen.getByTestId('simulador').textContent);

describe('simulador de custo', () => {
  it('carimbo: custo por cartão, brindes por mês e custo por mês', () => {
    renderiza();
    expect(texto()).toContain('cada cartão fechado custa cerca de R$ 27,00');
    expect(texto()).toContain('~9 brindes/mês');
    expect(texto()).toContain('≈ R$ 243,00/mês');
  });

  it('recalcula ao mudar os itens para ganhar (ritmo de carimbos ÷ itens)', () => {
    renderiza({ itensParaGanhar: '5' });
    // 90 carimbos/mês ÷ 5 = 18 brindes × R$ 27
    expect(texto()).toContain('~18 brindes/mês');
    expect(texto()).toContain('≈ R$ 486,00/mês');
  });

  it('cashback: percentual da receita paga mensal, ao vivo', () => {
    renderiza({ tipo: 'cashback', percentual: '5' });
    expect(texto()).toContain('5% de R$ 18.400,00/mês em pedidos');
    expect(texto()).toContain('≈ R$ 920,00/mês em saldo');
  });

  it('sem endpoint (backend antigo) diz "sem dados ainda", nunca zero', () => {
    renderiza({ dados: null });
    expect(texto()).toMatch(/sem dados ainda/i);
    expect(texto()).not.toContain('R$ 0,00');
  });

  it('avisa quando o custo do brinde é estimado pelo ticket médio', () => {
    renderiza({ dados: { ...base, custo_por_brinde_origem: 'ticket_medio' } });
    expect(screen.getByText(/estimado pelo ticket médio/i)).toBeInTheDocument();
  });
});

describe('está funcionando?', () => {
  it('mostra a recompra de participantes × não participantes', () => {
    renderiza();
    const bloco = screen.getByTestId('recompra');
    expect(norm(bloco.textContent)).toContain('48%');
    expect(norm(bloco.textContent)).toContain('22%');
  });

  it('com amostra pequena diz que é cedo e quantos pedidos faltam', () => {
    renderiza({ dados: { ...base, amostra_suficiente: false, pedidos_faltando: 12 } });
    expect(screen.getByTestId('recompra')).toHaveTextContent(/cedo para medir: faltam 12 pedidos/i);
    expect(screen.getByTestId('recompra')).not.toHaveTextContent('48%');
  });

  it('sem dados diz "sem dados ainda"', () => {
    renderiza({ dados: null });
    expect(screen.getByTestId('recompra')).toHaveTextContent(/sem dados ainda/i);
  });
});

describe('ação sobre quem está a um item', () => {
  it('mostra quantos estão a um item e o botão leva para a campanha de fidelidade', async () => {
    renderiza();
    expect(screen.getByText(/2 clientes a um item do brinde/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /avisar pelo whatsapp/i }));
    expect(screen.getByTestId('onde')).toHaveTextContent('/marketing/whatsapp/new?objetivo=fidelidade');
  });

  it('singular com 1 cliente', () => {
    renderiza({ dados: { ...base, a_um_item_total: 1, a_um_item: [base.a_um_item[0]] } });
    expect(screen.getByText(/1 cliente a um item do brinde/i)).toBeInTheDocument();
  });

  it('sem ninguém a um item não mostra o botão', () => {
    renderiza({ dados: { ...base, a_um_item_total: 0, a_um_item: [] } });
    expect(screen.queryByRole('button', { name: /avisar pelo whatsapp/i })).not.toBeInTheDocument();
  });

  it('no cashback a ação do cartão não aparece', () => {
    renderiza({ tipo: 'cashback' });
    expect(screen.queryByRole('button', { name: /avisar pelo whatsapp/i })).not.toBeInTheDocument();
  });
});
