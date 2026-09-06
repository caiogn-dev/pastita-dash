/**
 * Um selo ao lado do título: "Ativo", "Rascunho", "Suspensa".
 *
 * Detalhe de agente, detalhe de loja e assinatura mostram todos o MESMO tipo
 * de informação — o estado daquilo que a página descreve — e cada um a
 * desenhava do seu jeito, dentro do cabeçalho artesanal. Ao converter para o
 * chassi, o estado não tinha onde morar: ou virava a primeira linha do corpo
 * (longe do título, que é onde se procura) ou ia para o canto das ações
 * (misturando o que a página É com o que dá para FAZER nela).
 *
 * `selo` é esse lugar. Fica na mesma linha do título, herdando a quebra de
 * linha do cabeçalho no celular.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { PageShell } from '../PageShell';

const montar = (props: Partial<React.ComponentProps<typeof PageShell>> = {}) =>
  render(
    <MemoryRouter>
      <PageShell titulo="Caio (bot)" {...props}>
        <div>corpo</div>
      </PageShell>
    </MemoryRouter>,
  );

describe('selo de estado no chassi', () => {
  it('aparece junto do título, não perdido no corpo', () => {
    montar({ selo: <span>Ativo</span> });

    const titulo = screen.getByRole('heading', { name: 'Caio (bot)' });
    // Mesmo container: é isso que faz o olho ler "Caio (bot) — Ativo".
    expect(titulo.parentElement).toContainElement(screen.getByText('Ativo'));
  });

  it('sem selo, o título continua sozinho e nada de vazio é desenhado', () => {
    montar();

    const titulo = screen.getByRole('heading', { name: 'Caio (bot)' });
    expect(titulo.parentElement?.querySelectorAll('span')).toHaveLength(0);
  });

  it('a descrição continua abaixo, não some por causa do selo', () => {
    montar({ selo: <span>Ativo</span>, descricao: 'Como o robô fala com o cliente.' });

    expect(screen.getByText('Como o robô fala com o cliente.')).toBeInTheDocument();
  });

  it('no quadro o selo também vale — é o estado da operação', () => {
    montar({ variante: 'quadro', selo: <span>Caixa aberto</span> });

    expect(screen.getByText('Caixa aberto')).toBeInTheDocument();
  });
});
