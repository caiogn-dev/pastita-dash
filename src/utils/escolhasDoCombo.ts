// Escolhas de um combo (sabores, saladas, pratos) do jeito que a cozinha lê:
// um sabor por linha, repetidos somados ("2x Assadinho"), na ordem do cliente.
//
// Fonte: display_data.groups (snapshot do checkout); pedidos antigos só têm
// selected_variants_data, com o grupo em cada item. Mesma regra da comanda
// térmica (server2 print_service._escolhas_do_combo) — se mudar lá, mude aqui.

interface EscolhaBruta {
  group_name?: string;
  product_name?: string;
  variant_name?: string;
  quantity?: number;
}

interface ComboComEscolhas {
  selected_variants_data?: EscolhaBruta[];
  display_data?: { groups?: Array<{ group_name?: string; items?: EscolhaBruta[] }> } | Record<string, unknown>;
}

export interface GrupoDeEscolhas {
  grupo: string;
  escolhas: Array<{ quantidade: number; nome: string }>;
}

const somar = (itens: EscolhaBruta[]): GrupoDeEscolhas['escolhas'] => {
  const somados = new Map<string, number>();
  itens.forEach((it) => {
    const nome = (it.product_name || it.variant_name || '').trim();
    if (!nome) return;
    const qtd = Math.max(Number(it.quantity) || 1, 1);
    somados.set(nome, (somados.get(nome) || 0) + qtd);
  });
  return Array.from(somados, ([nome, quantidade]) => ({ quantidade, nome }));
};

const limparGrupo = (nome?: string) => (nome || '').trim().replace(/:+$/, '');

export function escolhasDoCombo(combo: ComboComEscolhas | undefined | null): GrupoDeEscolhas[] {
  if (!combo) return [];
  const groups = (combo.display_data as { groups?: Array<{ group_name?: string; items?: EscolhaBruta[] }> } | undefined)?.groups;
  if (Array.isArray(groups) && groups.length) {
    return groups
      .map((g) => ({ grupo: limparGrupo(g.group_name), escolhas: somar(g.items || []) }))
      .filter((g) => g.escolhas.length);
  }
  // Pedido antigo: agrupa pelo group_name de cada item, na ordem em que aparece.
  const porGrupo = new Map<string, EscolhaBruta[]>();
  (combo.selected_variants_data || []).forEach((it) => {
    const g = limparGrupo(it.group_name);
    porGrupo.set(g, [...(porGrupo.get(g) || []), it]);
  });
  return Array.from(porGrupo, ([grupo, itens]) => ({ grupo, escolhas: somar(itens) }))
    .filter((g) => g.escolhas.length);
}

/** Linhas de texto: "1x Picadinho". Com mais de um grupo, o nome do grupo
 *  vira cabeçalho ("Escolha seu suco:") e as escolhas recuam. */
export function linhasDasEscolhas(combo: ComboComEscolhas | undefined | null): string[] {
  const grupos = escolhasDoCombo(combo);
  const comCabecalho = grupos.length > 1;
  return grupos.flatMap((g) => [
    ...(comCabecalho && g.grupo ? [`${g.grupo}:`] : []),
    ...g.escolhas.map((e) => `${comCabecalho && g.grupo ? '  ' : ''}${e.quantidade}x ${e.nome}`),
  ]);
}
