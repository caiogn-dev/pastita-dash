/**
 * Reprodução em DOM do defeito relatado em 27/ago: "a coluna lateral mostra
 * 'Venda no balcão' e 'Caixa' duas vezes no grupo Balcão — e o primeiro par
 * aponta para /stores, destacado como se fosse a página aberta".
 *
 * A causa real (ver navSections.semDuplicata.test.ts para a prova ao nível
 * de dados): enquanto nenhuma loja está selecionada — ou antes de
 * `useStore()` resolver, no instante entre o login e a loja carregar —
 * `storeHref` cai no fallback `'/stores'` para TODO item de um grupo
 * store-scoped. Vários itens do MESMO grupo (Balcão, Cardápio, Etiquetas,
 * Configurações) acabam com o href idêntico.
 *
 * Isso quebrava dois comportamentos que tratam `item.href` como identidade:
 *   - a chave do React na lista do acordeão (colisão de key);
 *   - o casamento de rota por PREFIXO em `ativo()` — `/stores` "casava" com
 *     QUALQUER página de loja, destacando itens que não são a página atual.
 */
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { Sidebar } from '../Sidebar';
import { buildNavSections } from '../navSections';

// A mesma forma que `useNavSections`/`Navbar` produzem enquanto `store` ainda
// é `null` — sem loja resolvida, `storeHref` sempre devolve o fallback.
const semLojaSelecionada = buildNavSections({
  storeHref: () => '/stores',
  automationEnabled: false,
});

describe('Sidebar — sem loja selecionada (o estado do bug original)', () => {
  it('não acusa "Venda no balcão" nem "Caixa" como página atual numa rota de loja qualquer', () => {
    // Rota real de uma loja, mas nada a ver com Balcão — é o caso que a
    // versão quebrada destacava por engano, porque /stores prefixava tudo.
    render(
      <MemoryRouter initialEntries={['/stores/minha-loja/products']}>
        <Sidebar sections={semLojaSelecionada} />
      </MemoryRouter>
    );

    const nav = screen.getByRole('navigation', { name: /principal/i });
    const grupoBalcao = within(nav).getByRole('button', { name: /Balcão/ });
    // O grupo não deveria abrir sozinho: nada nele é a página atual.
    expect(grupoBalcao).toHaveAttribute('aria-expanded', 'false');
  });

  it('React não reclama de key duplicada ao trocar de /stores para o href real da loja', () => {
    const erros: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      erros.push(args);
      original(...args);
    };

    try {
      const { rerender } = render(
        <MemoryRouter initialEntries={['/stores/minha-loja/pdv']}>
          <Sidebar sections={semLojaSelecionada} />
        </MemoryRouter>
      );

      // A loja resolve: os mesmos itens agora têm hrefs distintos.
      const comLojaSelecionada = buildNavSections({
        storeHref: (p) => `/stores/minha-loja/${p}`,
        automationEnabled: false,
      });
      rerender(
        <MemoryRouter initialEntries={['/stores/minha-loja/pdv']}>
          <Sidebar sections={comLojaSelecionada} />
        </MemoryRouter>
      );
    } finally {
      console.error = original;
    }

    const avisoDeKeyDuplicada = erros.some((args) =>
      String(args[0]).includes('two children with the same key')
    );
    expect(avisoDeKeyDuplicada).toBe(false);
  });
});
