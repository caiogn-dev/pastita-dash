/**
 * Exibição do cardápio (13/10, refeita no mesmo dia).
 *
 * A primeira versão era uma parede de cartões de texto ("Direita — Lista
 * estilo iFood") e só mudava a prévia DEPOIS de salvar. O dono: "a intenção
 * ficou boa, o resultado ficou podre… mostrar o que irá mudar realmente".
 *
 * Agora: cada opção é um desenho com o produto e o logo de verdade da loja,
 * as opções vêm separadas pela parte da vitrine que mudam (cartão, topo,
 * estoque, pedido feito), e cada mudança acende essa parte na prévia. A seção
 * é controlada — quem grava é a página, com uma barra de salvar só.
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../../services/api', () => ({ __esModule: true, default: {} }));

import ExibicaoDoCardapioSection from '../ExibicaoDoCardapioSection';
import { EXIBICAO_PADRAO, type ExibicaoDoCardapio } from '../../../services/exibicaoDoCardapio';

const AMOSTRA = {
  nome: 'Queridinha + Suco + Sobremesa',
  descricao: '1x Queridinha 1x Suco da sua escolha 1x Sobremesa do dia, montada na hora com folhas frescas',
  foto: 'https://m/combo.webp',
  preco: 54.99,
};

function montar(valor: Partial<ExibicaoDoCardapio> = {}, gravado: Partial<ExibicaoDoCardapio> = {}) {
  const onMudar = jest.fn();
  const onFocar = jest.fn();
  const props = {
    valor: { ...EXIBICAO_PADRAO, ...valor },
    gravado: { ...EXIBICAO_PADRAO, ...gravado },
    onMudar,
    onFocar,
    amostra: AMOSTRA,
    logoUrl: 'https://m/logo.jpg',
    nomeDaLoja: 'Cê Saladas',
  };
  const r = render(<ExibicaoDoCardapioSection {...props} />);
  return { ...r, onMudar, onFocar, props };
}

it('abre no cartão do produto, com a foto real da loja nos desenhos', () => {
  montar();
  expect(screen.getByRole('button', { name: /cartão/i })).toHaveAttribute('aria-pressed', 'true');
  const grupo = screen.getByRole('radiogroup', { name: /posição da foto/i });
  expect(within(grupo).getAllByRole('radio')).toHaveLength(4);
  expect(grupo.querySelector('img[src="https://m/combo.webp"]')).toBeInTheDocument();
});

it('escolher muda o rascunho e acende o cartão na prévia', () => {
  const { onMudar, onFocar } = montar();
  fireEvent.click(screen.getByRole('radio', { name: /à direita/i }));
  expect(onMudar).toHaveBeenCalledWith({ foto_posicao: 'direita' });
  expect(onFocar).toHaveBeenCalledWith('cartao');

  fireEvent.click(screen.getByRole('radio', { name: /inteira/i }));
  expect(onMudar).toHaveBeenCalledWith({ foto_encaixe: 'inteira' });
});

it('o "ver mais" mostra a descrição de verdade cortada em cada tamanho', () => {
  const { onMudar } = montar({ descricao_limite: 20 });
  const grupo = screen.getByRole('radiogroup', { name: /descrição/i });
  // Valor fora das opções prontas vira uma opção própria, marcada.
  expect(within(grupo).getByRole('radio', { name: /20 letras/i })).toHaveAttribute('aria-checked', 'true');
  expect(grupo).toHaveTextContent('1x Queridinha 1x…');
  fireEvent.click(within(grupo).getByRole('radio', { name: /média/i }));
  expect(onMudar).toHaveBeenCalledWith({ descricao_limite: 120 });
  // Número exato continua disponível.
  expect(screen.getByLabelText(/ver mais a partir de/i)).toHaveValue(20);
});

it('o que mudou e não foi salvo ganha um ponto', () => {
  montar({ foto_posicao: 'direita' }, { foto_posicao: 'padrao' });
  const grupo = screen.getByRole('radiogroup', { name: /posição da foto/i }).closest('fieldset') as HTMLElement;
  expect(within(grupo).getByLabelText(/não salvo/i)).toBeInTheDocument();
});

it('topo: logo de verdade, e a prévia sobe para o topo', () => {
  const { onMudar, onFocar } = montar();
  fireEvent.click(screen.getByRole('button', { name: /topo/i }));
  expect(onFocar).toHaveBeenCalledWith('topo');
  const grupo = screen.getByRole('radiogroup', { name: /formato do logo/i });
  expect(grupo.querySelector('img[src="https://m/logo.jpg"]')).toBeInTheDocument();
  fireEvent.click(within(grupo).getByRole('radio', { name: /redondo/i }));
  expect(onMudar).toHaveBeenCalledWith({ logo_formato: 'redondo' });
});

it('estoque: interruptores refletem e mudam o rascunho', () => {
  const { onMudar, onFocar } = montar({ mostrar_esgotados: false });
  fireEvent.click(screen.getByRole('button', { name: /estoque/i }));
  expect(onFocar).toHaveBeenCalledWith('estoque');
  const esgotados = screen.getByRole('switch', { name: /mostrar esgotados/i });
  expect(esgotados).toHaveAttribute('aria-checked', 'false');
  fireEvent.click(esgotados);
  expect(onMudar).toHaveBeenCalledWith({ mostrar_esgotados: true });
});

it('pedido feito: a tela de agradecimento aparece com o texto digitado', () => {
  const { onMudar, rerender, props } = montar();
  fireEvent.click(screen.getByRole('button', { name: /pedido feito/i }));
  // Sem texto: mostra o padrão da vitrine.
  expect(screen.getByText('Pedido confirmado!')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/^título/i), { target: { value: 'Valeu demais!' } });
  expect(onMudar).toHaveBeenCalledWith({ agradecimento_titulo: 'Valeu demais!' });
  rerender(<ExibicaoDoCardapioSection {...props} valor={{ ...props.valor, agradecimento_titulo: 'Valeu demais!' }} />);
  expect(screen.getByText('Valeu demais!')).toBeInTheDocument();
});

it('sem produto com foto, os desenhos não quebram', () => {
  render(
    <ExibicaoDoCardapioSection
      valor={EXIBICAO_PADRAO}
      gravado={EXIBICAO_PADRAO}
      onMudar={() => {}}
      amostra={null}
    />,
  );
  expect(screen.getByRole('radiogroup', { name: /posição da foto/i })).toBeInTheDocument();
});
