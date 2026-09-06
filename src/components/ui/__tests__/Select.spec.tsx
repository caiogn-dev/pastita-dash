/**
 * ESPECIFICAÇÃO — o campo de escolha do painel.
 *
 * Sessenta e dois `<select>` crus, com cerca de trinta strings de classe
 * diferentes. O que isso produziu, medido no fonte:
 *
 *  - `focus:ring-indigo-500` e `focus:ring-primary-500` — o anel de foco em
 *    duas cores que NÃO são a marca, na mesma tela em que o resto usa
 *    `focus:ring-brand`. Quem navega por teclado vê o foco mudar de cor ao
 *    passar de um campo para o outro.
 *  - `bg-transparent` em nove deles: o campo herda o fundo de onde estiver, e
 *    a lista nativa de opções fica sem contraste garantido.
 *  - `border-gray-300 dark:border-border-token`: metade em cor crua, metade em
 *    token — o modo escuro conserta, o claro não.
 *  - Nenhuma rotulagem obrigatória. Um `<select>` sem `<label>` associado nem
 *    `aria-label` é anunciado como "combo box" e nada mais.
 *
 * Esta spec fixa o contrato. `Select` é o `<select>` nativo por dentro —
 * teclado, busca por digitação e o seletor de roda do celular são melhores que
 * qualquer reimplementação — com a casca do painel por fora.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { Select } from '../Select';

const OPCOES = [
  { valor: 'pendente', rotulo: 'Pendente' },
  { valor: 'pago', rotulo: 'Pago' },
];

describe('spec: campo de escolha', () => {
  describe('nome acessível', () => {
    it('com `rotulo`, o campo é encontrável pelo nome', () => {
      render(<Select rotulo="Status" valor="pago" onMudar={jest.fn()} opcoes={OPCOES} />);

      expect(screen.getByLabelText('Status')).toBeInTheDocument();
    });

    it('o rótulo é um `<label>` ligado ao campo, não um texto solto acima', () => {
      // Texto solto não move o foco ao ser clicado e não é anunciado junto.
      render(<Select rotulo="Status" valor="pago" onMudar={jest.fn()} opcoes={OPCOES} />);

      const campo = screen.getByLabelText('Status');
      const label = document.querySelector(`label[for="${campo.id}"]`);
      expect(label).toHaveTextContent('Status');
    });

    it('sem rótulo visível, `rotuloOculto` nomeia o campo mesmo assim', () => {
      // Numa barra de filtros o rótulo às vezes é redundante para quem enxerga
      // — nunca para quem ouve.
      render(
        <Select rotuloOculto="Filtrar por status" valor="pago" onMudar={jest.fn()} opcoes={OPCOES} />,
      );

      expect(screen.getByLabelText('Filtrar por status')).toBeInTheDocument();
    });

    it('sem nome nenhum, falha alto em desenvolvimento', () => {
      // Deixar passar é como o painel juntou dezenas de combos anônimos.
      const erro = jest.spyOn(console, 'error').mockImplementation(() => {});
      render(<Select valor="pago" onMudar={jest.fn()} opcoes={OPCOES} />);

      expect(erro).toHaveBeenCalledWith(expect.stringContaining('Select'));
      erro.mockRestore();
    });
  });

  describe('valor', () => {
    it('é controlado: o valor é o de quem chama', () => {
      render(<Select rotuloOculto="Status" valor="pago" onMudar={jest.fn()} opcoes={OPCOES} />);

      expect(screen.getByLabelText('Status')).toHaveValue('pago');
    });

    it('avisa a mudança com o VALOR, não com o evento', () => {
      // `e.target.value` em cada chamador é ruído repetido dezenas de vezes.
      const onMudar = jest.fn();
      render(<Select rotuloOculto="Status" valor="pago" onMudar={onMudar} opcoes={OPCOES} />);

      fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'pendente' } });

      expect(onMudar).toHaveBeenCalledWith('pendente');
    });
  });

  describe('opção vazia', () => {
    it('`vazio` vira a primeira opção, com valor vazio', () => {
      // "Todos os status" é filtro, não um status. Cada tela escrevia esse
      // `<option value="">` à mão, com um texto diferente.
      render(
        <Select
          rotuloOculto="Status"
          valor=""
          onMudar={jest.fn()}
          opcoes={OPCOES}
          vazio="Todos os status"
        />,
      );

      const opcoes = screen.getAllByRole('option');
      expect(opcoes[0]).toHaveTextContent('Todos os status');
      expect(opcoes[0]).toHaveValue('');
    });

    it('sem `vazio`, não inventa opção nenhuma', () => {
      render(<Select rotuloOculto="Status" valor="pago" onMudar={jest.fn()} opcoes={OPCOES} />);

      expect(screen.getAllByRole('option')).toHaveLength(2);
    });
  });

  describe('aparência', () => {
    it('pinta fundo próprio — `bg-transparent` deixa a lista sem contraste', () => {
      render(<Select rotuloOculto="Status" valor="pago" onMudar={jest.fn()} opcoes={OPCOES} />);

      const classes = screen.getByLabelText('Status').className.split(/\s+/);
      expect(classes).toContain('bg-surface');
      expect(classes).not.toContain('bg-transparent');
    });

    it('o anel de foco é o da MARCA, não indigo nem primary', () => {
      render(<Select rotuloOculto="Status" valor="pago" onMudar={jest.fn()} opcoes={OPCOES} />);

      const classes = screen.getByLabelText('Status').className;
      expect(classes).toMatch(/focus:ring-brand/);
      expect(classes).not.toMatch(/indigo|primary-500/);
    });
  });
});
