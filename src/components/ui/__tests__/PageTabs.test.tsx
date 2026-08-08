/**
 * PageTabs — corta a página vertical em seções nomeadas.
 *
 * Configurações da Loja tinha sete cartões empilhados em 760 linhas: dados,
 * localização, entrega, horários, Meta Pixel, Clarity, avaliações do Google.
 * Nada errado em nenhum deles isoladamente; o problema é o conjunto. Para
 * mexer no horário de sábado você rolava por Pixel e Clarity, e no caminho
 * passava por seis campos que não queria tocar — o risco de mexer no errado é
 * proporcional a quantos campos você atravessa.
 *
 * Abas não são só estética: elas dão NOME às partes. "Onde configuro o
 * pixel?" passa a ter resposta antes de rolar.
 *
 * A aba escolhida vai para a URL. Sem isso, salvar e recarregar joga você de
 * volta na primeira aba, e não dá para mandar o link "está em Rastreamento"
 * para ninguém.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, useSearchParams } from 'react-router-dom';

import { PageTabs } from '../PageTabs';

const ABAS = [
  { id: 'loja', rotulo: 'Loja' },
  { id: 'entrega', rotulo: 'Entrega' },
  { id: 'rastreamento', rotulo: 'Rastreamento' },
];

function Sonda() {
  const [p] = useSearchParams();
  return <span data-testid="url-aba">{p.get('aba') ?? '(nenhuma)'}</span>;
}

function montar(inicial = '/config') {
  return render(
    <MemoryRouter initialEntries={[inicial]}>
      <Sonda />
      <PageTabs abas={ABAS} ariaLabel="Seções das configurações">
        {(ativa) => <div data-testid="conteudo">{ativa}</div>}
      </PageTabs>
    </MemoryRouter>
  );
}

describe('PageTabs', () => {
  it('abre na primeira aba quando a URL não diz nada', () => {
    montar();
    expect(screen.getByTestId('conteudo')).toHaveTextContent('loja');
    expect(screen.getByRole('tab', { name: 'Loja' })).toHaveAttribute('aria-selected', 'true');
  });

  it('a URL manda: link direto abre na aba certa', () => {
    montar('/config?aba=rastreamento');
    expect(screen.getByTestId('conteudo')).toHaveTextContent('rastreamento');
  });

  it('trocar de aba escreve na URL', () => {
    // Salvar recarrega a página em vários fluxos. Sem a aba na URL, você volta
    // para a primeira e perde o lugar.
    montar();
    fireEvent.click(screen.getByRole('tab', { name: 'Entrega' }));

    expect(screen.getByTestId('conteudo')).toHaveTextContent('entrega');
    expect(screen.getByTestId('url-aba')).toHaveTextContent('entrega');
  });

  it('aba inexistente na URL cai na primeira em vez de mostrar vazio', () => {
    // Link antigo com aba renomeada não pode resultar em tela branca.
    montar('/config?aba=aba-que-nao-existe');
    expect(screen.getByTestId('conteudo')).toHaveTextContent('loja');
  });

  it('as setas do teclado percorrem as abas', () => {
    // Padrão de tablist: seta move, e circula nas pontas. Sem isso quem navega
    // por teclado precisa dar Tab por dentro de cada painel para chegar na
    // próxima aba.
    montar();
    const primeira = screen.getByRole('tab', { name: 'Loja' });
    primeira.focus();

    fireEvent.keyDown(primeira, { key: 'ArrowRight' });
    expect(screen.getByTestId('conteudo')).toHaveTextContent('entrega');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Entrega' }), { key: 'ArrowLeft' });
    expect(screen.getByTestId('conteudo')).toHaveTextContent('loja');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Loja' }), { key: 'ArrowLeft' });
    expect(screen.getByTestId('conteudo')).toHaveTextContent('rastreamento');
  });

  it('só a aba ativa é alcançável por Tab', () => {
    // Num tablist, Tab entra no grupo e vai direto para a aba ativa; as outras
    // se alcançam com as setas. Deixar todas com tabIndex 0 obriga a passar
    // por cada uma para chegar ao conteúdo.
    montar();
    expect(screen.getByRole('tab', { name: 'Loja' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Entrega' })).toHaveAttribute('tabindex', '-1');
  });

  it('o painel é anunciado como pertencente à aba', () => {
    montar();
    const painel = screen.getByRole('tabpanel');
    expect(painel).toHaveAttribute('aria-labelledby', screen.getByRole('tab', { name: 'Loja' }).id);
  });
});
