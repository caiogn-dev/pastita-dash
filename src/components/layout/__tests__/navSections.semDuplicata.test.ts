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
});
