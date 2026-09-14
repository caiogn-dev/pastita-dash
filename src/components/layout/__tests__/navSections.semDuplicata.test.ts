import { buildNavSections } from '../navSections';

/**
 * A coluna lateral mostrava "Venda no balcão" e "Caixa" DUAS vezes no grupo
 * Balcão — e o primeiro par apontava para `/stores` (a lista de lojas), não
 * para o PDV e o caixa. Pior: como `/stores` é prefixo da rota atual, os dois
 * fantasmas ainda apareciam destacados como se fossem a página aberta.
 */
const montar = (comLoja = true) =>
  buildNavSections({
    storeHref: (p: string) => (comLoja ? `/stores/minha-loja/${p}` : '/stores'),
    unreadBadge: undefined,
    automationEnabled: true,
  });

describe('árvore de navegação', () => {
  it('não repete o nome de um item dentro do mesmo grupo', () => {
    const repetidos: string[] = [];
    for (const secao of montar()) {
      const vistos = new Set<string>();
      for (const item of secao.items) {
        if (vistos.has(item.name)) repetidos.push(`${secao.label} → ${item.name}`);
        vistos.add(item.name);
      }
    }
    expect(repetidos).toEqual([]);
  });

  it('nenhum destino cai na lista de lojas quando há loja escolhida', () => {
    const orfaos = montar()
      .flatMap((s) => s.items.map((i) => ({ secao: s.label, ...i })))
      .filter((i) => i.href === '/stores');
    expect(orfaos).toEqual([]);
  });

  it('não repete o mesmo destino em dois itens', () => {
    const porHref = new Map<string, string[]>();
    for (const secao of montar()) {
      for (const item of secao.items) {
        porHref.set(item.href, [...(porHref.get(item.href) ?? []), `${secao.label}/${item.name}`]);
      }
    }
    const duplicados = [...porHref.entries()].filter(([, usos]) => usos.length > 1);
    expect(duplicados).toEqual([]);
  });

  /**
   * A CAUSA REAL do "Venda no balcão" e "Caixa" duas vezes: nenhum teste
   * acima roda com `comLoja = false` — o exato estado (nenhuma loja
   * selecionada ainda, ou navegando antes de `useStore()` resolver) em que
   * `storeHref` cai no fallback `'/stores'`. Nesse instante, "Venda no
   * balcão", "Caixa", "Cozinha (KDS)" e outros DEZ itens de grupos
   * diferentes compartilham literalmente o MESMO href.
   *
   * Isso quebra em dois lugares que usam `item.href` como identidade:
   *   1. `key={item.href}` na Sidebar/Navbar — React vê filhos com chave
   *      repetida; quando o href de verdade chega (loja resolvida), a
   *      reconciliação embaralha os nós em vez de trocar cada um no lugar,
   *      e por um frame o item antigo e o novo coexistem — o "duas vezes".
   *   2. `ativo()`/`NavLink` casando por PREFIXO: com href `/stores`,
   *      QUALQUER página de loja (`/stores/x/pdv`, `/stores/x/orders`…)
   *      vira "ativa" para TODOS esses itens ao mesmo tempo — o "primeiro
   *      par destacado como se fosse a página aberta" do relato original.
   *
   * A correção mora em Sidebar.tsx (`ativo()` exige match exato para
   * `/stores`, e a key virou `item.name`) e no mesmo par em Navbar.tsx
   * (`end={item.href === '/stores'}`, key também por nome). Este teste trava
   * o CENÁRIO que os três de cima nunca cobriram.
   */
  it('sem loja, vários itens caem no mesmo /stores — e por isso a key não pode ser o href', () => {
    const semLoja = montar(false);
    const porHref = new Map<string, string[]>();
    for (const secao of semLoja) {
      for (const item of secao.items) {
        porHref.set(item.href, [...(porHref.get(item.href) ?? []), `${secao.label}/${item.name}`]);
      }
    }
    const colapsados = porHref.get('/stores') ?? [];
    // Balcão é o grupo do relato original: os dois itens que "duplicavam".
    expect(colapsados).toEqual(
      expect.arrayContaining(['Balcão/Venda no balcão', 'Balcão/Caixa'])
    );
    expect(colapsados.length).toBeGreaterThan(2);

    // O nome continua único dentro do grupo mesmo sem loja — é a chave segura.
    for (const secao of semLoja) {
      const nomes = secao.items.map((i) => i.name);
      expect(new Set(nomes).size).toBe(nomes.length);
    }
  });
});
