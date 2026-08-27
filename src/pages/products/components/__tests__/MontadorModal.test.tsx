import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MontadorModal } from '../MontadorModal';
import type { StoreCategory } from '../../../../services/storesApi';

// Até 27/ago/2026 os passos do montador ("monte o seu") viviam cravados no
// código do storefront: os quatro da Cê Saladas, com rótulo, máximo e
// obrigatoriedade fixos. Agora moram na categoria — mas sem esta tela o
// lojista dependeria de alguém abrir um shell para configurar.

const categoria = (over: Partial<StoreCategory> = {}): StoreCategory => ({
  id: 'cat-1',
  store: 'loja-1',
  name: 'Proteínas',
  slug: 'proteina',
  description: '',
  children: [],
  sort_order: 5,
  is_active: true,
  products_count: 6,
  created_at: '',
  updated_at: '',
  builder_step_order: null,
  builder_max_selections: 1,
  builder_required: false,
  builder_included: false,
  builder_expand_variants: false,
  ...over,
});

const renderModal = (over: Partial<StoreCategory> = {}, onSave = jest.fn()) => {
  const utils = render(
    <MontadorModal isOpen category={categoria(over)} onClose={jest.fn()} onSave={onSave} />,
  );
  return { ...utils, onSave };
};

describe('participação no montador', () => {
  it('começa desligado quando a categoria não é passo', () => {
    renderModal();
    expect(screen.getByRole('switch', { name: /usar no montador/i }))
      .toHaveAttribute('aria-checked', 'false');
  });

  it('esconde a configuração enquanto estiver desligado — nada a decidir ainda', () => {
    renderModal();
    expect(screen.queryByLabelText(/quantos itens/i)).not.toBeInTheDocument();
  });

  it('revela a configuração ao ligar', async () => {
    renderModal();
    await userEvent.click(screen.getByRole('switch', { name: /usar no montador/i }));
    expect(screen.getByLabelText(/quantos itens/i)).toBeInTheDocument();
  });

  it('já vem ligado e preenchido quando a categoria é passo', () => {
    renderModal({ builder_step_order: 1, builder_max_selections: 3 });
    expect(screen.getByRole('switch', { name: /usar no montador/i }))
      .toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText(/quantos itens/i)).toHaveValue(3);
  });
});

describe('o que é salvo', () => {
  it('desligado, limpa a ordem — é isso que tira a categoria do montador', async () => {
    const { onSave } = renderModal({ builder_step_order: 2, builder_max_selections: 5 });
    await userEvent.click(screen.getByRole('switch', { name: /usar no montador/i }));
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ builder_step_order: null }),
    ));
  });

  it('envia a configuração completa', async () => {
    const { onSave } = renderModal({ builder_step_order: 3 });
    const maximo = screen.getByLabelText(/quantos itens/i);
    fireEvent.change(maximo, { target: { value: '4' } });
    await userEvent.click(screen.getByRole('checkbox', { name: /obrigat/i }));
    await userEvent.click(screen.getByRole('checkbox', { name: /já incluso/i }));
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      builder_step_order: 3,
      builder_max_selections: 4,
      builder_required: true,
      builder_included: true,
      builder_expand_variants: false,
    }));
  });

  it('não deixa salvar com máximo zero — passo que não deixa escolher não é passo', async () => {
    const { onSave } = renderModal({ builder_step_order: 0 });
    fireEvent.change(screen.getByLabelText(/quantos itens/i), { target: { value: '0' } });
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/pelo menos 1/i);
  });
});

describe('avisos que evitam configuração quebrada', () => {
  it('avisa quando não há passo inicial — sem ele a loja não tem montador', () => {
    // Regra espelhada do backend (migration 0073) e do storefront.
    renderModal({ builder_step_order: 3 });
    expect(screen.getByRole('status')).toHaveTextContent(/primeiro passo/i);
  });

  it('não avisa quando esta é a categoria do primeiro passo', () => {
    renderModal({ builder_step_order: 0 });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('identidade visual', () => {
  it('usa os tokens do painel, não cinza cravado do Tailwind', () => {
    const { container } = renderModal();
    const cru = container.innerHTML.match(/bg-white|bg-gray-\d|text-gray-\d|border-gray-\d/g);
    // Cinza cravado ignora o tema: no escuro vira caixa branca sobre o carvão.
    expect(cru).toBeNull();
  });
});

describe('posição já ocupada', () => {
  // O backend tem constraint de posição única por loja (migration 0071). Sem
  // saber das outras categorias, o modal deixava salvar e o lojista recebia só
  // "Não foi possível salvar" — o erro certo, na hora errada, sem o motivo.
  const OUTRAS = [
    categoria({ id: 'cat-base', name: 'Base', slug: 'base', builder_step_order: 0 }),
    categoria({ id: 'cat-mol', name: 'Molhos', slug: 'molhos', builder_step_order: 3 }),
  ];

  const abrirCom = (over: Partial<StoreCategory>, onSave = jest.fn()) => {
    render(
      <MontadorModal
        isOpen
        category={categoria(over)}
        outrasCategorias={OUTRAS}
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );
    return onSave;
  };

  it('avisa qual categoria já está naquela posição', () => {
    abrirCom({ builder_step_order: 0 });
    expect(screen.getByRole('alert')).toHaveTextContent(/Base/);
  });

  it('não deixa salvar em cima de outra', () => {
    const onSave = abrirCom({ builder_step_order: 0 });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('posição livre salva normalmente', async () => {
    const onSave = abrirCom({ builder_step_order: 1 });
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });

  it('a própria categoria não conta como conflito consigo mesma', async () => {
    const onSave = jest.fn();
    render(
      <MontadorModal
        isOpen
        category={categoria({ id: 'cat-base', name: 'Base', builder_step_order: 0 })}
        outrasCategorias={OUTRAS}
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });
});
