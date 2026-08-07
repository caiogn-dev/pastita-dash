/**
 * InsightList — o painel opina, não só reporta.
 *
 * "4 cupons expirando em breve" sem dizer o que fazer é ruído. O padrão que
 * funciona tem quatro partes fixas: DIREÇÃO (subiu/caiu/estável), AFIRMAÇÃO,
 * NÚMERO em destaque e RECOMENDAÇÃO em texto simples.
 *
 * A direção não pode ser transmitida só por cor: daltônico não distingue
 * verde de vermelho, e leitor de tela não lê cor nenhuma. Por isso cada linha
 * carrega um rótulo textual da direção.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { InsightList } from '../InsightList';

const INSIGHTS = [
  {
    direcao: 'alta' as const,
    titulo: 'Melhor cupom: GRUPOVIP',
    valor: '4 pedidos no período',
    recomendacao: 'duplicar campanha com novo período',
  },
  {
    direcao: 'baixa' as const,
    titulo: 'Custo da campanha sobre a receita',
    valor: '4.8%',
    recomendacao: 'custo controlado para o retorno',
  },
];

describe('InsightList', () => {
  it('mostra afirmação, número e recomendação de cada linha', () => {
    render(<InsightList titulo="Destaques e recomendações" itens={INSIGHTS} />);
    expect(screen.getByText('Melhor cupom: GRUPOVIP')).toBeInTheDocument();
    expect(screen.getByText('4 pedidos no período')).toBeInTheDocument();
    expect(screen.getByText('duplicar campanha com novo período')).toBeInTheDocument();
  });

  it('a direção tem rótulo textual, não só cor', () => {
    render(<InsightList titulo="Destaques" itens={INSIGHTS} />);
    // A seta é decorativa; o significado vive no texto acessível.
    expect(screen.getByText(/em alta/i)).toBeInTheDocument();
    expect(screen.getByText(/em queda/i)).toBeInTheDocument();
  });

  it('lista vazia não renderiza a seção', () => {
    // Um cabeçalho "Alertas" sobre o nada é pior que ausência.
    const { container } = render(<InsightList titulo="Alertas" itens={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('tom de alerta muda a moldura mas mantém a mesma estrutura', () => {
    render(<InsightList titulo="Alertas rápidos" tom="alerta" itens={INSIGHTS} />);
    expect(screen.getByText('Alertas rápidos')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
