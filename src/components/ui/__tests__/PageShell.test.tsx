/**
 * PageShell — o cabeçalho de página é UM componente, não 40 cópias.
 *
 * Antes, cada página do painel montava seu próprio topo: título com tamanho
 * diferente, subtítulo às vezes ausente, botões ora à direita ora embaixo, e
 * nenhuma tinha trilha de navegação. Mudar o padrão significava caçar arquivo
 * por arquivo — foi exatamente a dor dos "119 lugares".
 *
 * Estes testes travam o CONTRATO, não a aparência: quem consome pede
 * `titulo`/`descricao`/`trilha`/`acoes`/`filtros` e recebe sempre a mesma
 * estrutura, com landmark e hierarquia de heading corretos.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { PageShell } from '../PageShell';

function renderizar(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('PageShell', () => {
  it('o título da página é o único h1', () => {
    // Leitor de tela navega por heading. Duas páginas com h1 diferente e uma
    // sem nenhum é o que temos hoje.
    renderizar(<PageShell titulo="Relatórios">conteúdo</PageShell>);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Relatórios');
  });

  it('a descrição fica associada ao título', () => {
    renderizar(
      <PageShell titulo="Cupons" descricao="Gerencie campanhas e regras de uso.">
        x
      </PageShell>
    );
    expect(screen.getByText('Gerencie campanhas e regras de uso.')).toBeInTheDocument();
  });

  it('a trilha é navegação de verdade, com o item atual não-clicável', () => {
    // O último elo é onde você ESTÁ. Link para a própria página é ruído.
    renderizar(
      <PageShell
        trilha={[
          { rotulo: 'Cardápio', href: '/produtos' },
          { rotulo: 'Cupons' },
        ]}
        titulo="Cupons"
      >
        x
      </PageShell>
    );
    const nav = screen.getByRole('navigation', { name: /trilha/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cardápio' })).toHaveAttribute('href', '/produtos');
    expect(screen.queryByRole('link', { name: 'Cupons' })).not.toBeInTheDocument();
  });

  it('sem trilha não renderiza navegação vazia', () => {
    renderizar(<PageShell titulo="Início">x</PageShell>);
    expect(screen.queryByRole('navigation', { name: /trilha/i })).not.toBeInTheDocument();
  });

  it('ações e filtros aparecem, e o conteúdo vem depois deles', () => {
    renderizar(
      <PageShell
        titulo="Pedidos"
        acoes={<button type="button">Exportar</button>}
        filtros={<div data-testid="filtros">chips</div>}
      >
        <div data-testid="conteudo">tabela</div>
      </PageShell>
    );
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument();

    const filtros = screen.getByTestId('filtros');
    const conteudo = screen.getByTestId('conteudo');
    // compareDocumentPosition: 4 = conteudo vem DEPOIS de filtros no documento.
    expect(filtros.compareDocumentPosition(conteudo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
