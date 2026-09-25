/**
 * A prévia é a resposta a "como o cliente vê isto?". Ela só serve se
 * acompanhar o formulário ao vivo — uma prévia que mostra 10 quando o dono
 * digitou 8 ensina errado.
 */
import { render, screen } from '@testing-library/react';

import { CartaoDeFidelidadePreview } from '../CartaoDeFidelidadePreview';

const carimbos = () => document.querySelectorAll('[data-carimbo]');
const preenchidos = () => document.querySelectorAll('[data-carimbo="cheio"]');

describe('CartaoDeFidelidadePreview — cartão de carimbo', () => {
  it('desenha um círculo por item e preenche o exemplo de 7 de 10', () => {
    render(<CartaoDeFidelidadePreview tipo="carimbo" itensParaGanhar={10} />);
    expect(screen.getByText('Junte 10, ganhe 1 grátis')).toBeInTheDocument();
    expect(carimbos()).toHaveLength(10);
    expect(preenchidos()).toHaveLength(7);
    expect(screen.getByRole('img', { name: '7 de 10 carimbos' })).toBeInTheDocument();
    expect(screen.getByText('Faltam 3 para o seu grátis')).toBeInTheDocument();
  });

  it('acompanha o número digitado', () => {
    const { rerender } = render(<CartaoDeFidelidadePreview tipo="carimbo" itensParaGanhar="8" />);
    expect(screen.getByText('Junte 8, ganhe 1 grátis')).toBeInTheDocument();
    expect(carimbos()).toHaveLength(8);
    rerender(<CartaoDeFidelidadePreview tipo="carimbo" itensParaGanhar="5" />);
    expect(screen.getByText('Junte 5, ganhe 1 grátis')).toBeInTheDocument();
    expect(carimbos()).toHaveLength(5);
  });

  it('nunca mostra o cartão já cheio no exemplo', () => {
    render(<CartaoDeFidelidadePreview tipo="carimbo" itensParaGanhar={2} />);
    expect(preenchidos()).toHaveLength(1);
    expect(screen.getByText('Falta 1 para o seu grátis')).toBeInTheDocument();
  });

  it('com número inválido, pede o número em vez de desenhar zero círculos', () => {
    render(<CartaoDeFidelidadePreview tipo="carimbo" itensParaGanhar="" />);
    expect(carimbos()).toHaveLength(0);
    expect(screen.getByText(/diga quantos itens valem 1 grátis/i)).toBeInTheDocument();
  });

  it('com muitos itens, troca os círculos por uma barra', () => {
    render(<CartaoDeFidelidadePreview tipo="carimbo" itensParaGanhar={40} />);
    expect(carimbos()).toHaveLength(0);
    expect(screen.getByRole('progressbar', { name: '28 de 40 itens' })).toBeInTheDocument();
    expect(screen.getByText('Junte 40, ganhe 1 grátis')).toBeInTheDocument();
  });

  it('desligado, avisa que o cliente não vê o cartão', () => {
    render(<CartaoDeFidelidadePreview tipo="carimbo" itensParaGanhar={10} ligado={false} />);
    expect(screen.getByText(/desligado: o cliente não vê este cartão/i)).toBeInTheDocument();
  });

  it('usa o nome da loja no cabeçalho do cartão', () => {
    render(<CartaoDeFidelidadePreview tipo="carimbo" itensParaGanhar={10} nomeDaLoja="Cê Saladas" />);
    expect(screen.getByText('Cê Saladas')).toBeInTheDocument();
  });
});

describe('CartaoDeFidelidadePreview — cashback', () => {
  it('mostra a porcentagem e o saldo de exemplo', () => {
    render(<CartaoDeFidelidadePreview tipo="cashback" percentual="3" validadeDias="60" />);
    expect(screen.getByText('3% de volta em cada pedido')).toBeInTheDocument();
    // 3 pedidos de R$ 72,00 a 3% = R$ 6,48.
    expect(screen.getByText(/R\$\s*6,48/)).toBeInTheDocument();
    expect(screen.getByText(/vale por 60 dias/i)).toBeInTheDocument();
  });

  it('acompanha a porcentagem digitada, com vírgula', () => {
    const { rerender } = render(<CartaoDeFidelidadePreview tipo="cashback" percentual="5" />);
    expect(screen.getByText('5% de volta em cada pedido')).toBeInTheDocument();
    rerender(<CartaoDeFidelidadePreview tipo="cashback" percentual="2.5" />);
    expect(screen.getByText('2,5% de volta em cada pedido')).toBeInTheDocument();
  });

  it('sem porcentagem, pede o número', () => {
    render(<CartaoDeFidelidadePreview tipo="cashback" percentual="" />);
    expect(screen.getByText(/diga quanto volta em cada pedido/i)).toBeInTheDocument();
  });

  it('acima de 100%, mostra o teto de 100%', () => {
    render(<CartaoDeFidelidadePreview tipo="cashback" percentual="150" />);
    expect(screen.getByText('100% de volta em cada pedido')).toBeInTheDocument();
  });
});
