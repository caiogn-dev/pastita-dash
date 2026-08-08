/**
 * Como as duas colunas de CRM se escrevem na tela.
 *
 * Separado do componente porque é REGRA, não layout: "null vira Nunca comprou"
 * e "31 dias vira atenção" são decisões de produto que precisam de teste, e um
 * `.tsx` de 700 linhas esconde regra dentro de JSX.
 *
 * As réguas repetem os cortes do backend (`StoreCustomerViewSet.DIAS_ATIVO` /
 * `DIAS_RISCO`). Duplicação consciente: o backend decide QUEM está em risco
 * para o agregado; aqui é só a cor da célula. Se divergirem, o pior caso é uma
 * célula amarela um dia antes — não um número errado.
 */
export type TomDeCrm = 'neutro' | 'atencao' | 'perigo';

/** Mesmo corte do backend: um mês sem aparecer já é sinal num delivery. */
const DIAS_ATENCAO = 30;
/** Passado isso, quem sumiu raramente volta sozinho — vira campanha. */
const DIAS_PERIGO = 45;

export function rotuloDeDias(dias: number | null | undefined): {
  texto: string;
  tom: TomDeCrm;
} {
  // `null` é "nunca comprou", não "comprou hoje". A diferença decide se a
  // pessoa recebe "sentimos sua falta" ou "cupom de primeira compra".
  if (dias === null || dias === undefined) {
    return { texto: 'Nunca comprou', tom: 'neutro' };
  }
  const texto = dias === 0 ? 'Hoje' : dias === 1 ? 'Ontem' : `${dias} dias`;
  const tom: TomDeCrm =
    dias > DIAS_PERIGO ? 'perigo' : dias > DIAS_ATENCAO ? 'atencao' : 'neutro';
  return { texto, tom };
}

export type PerfilDeCliente = 'novo' | 'ocasional' | 'vip';

const PERFIS: Record<PerfilDeCliente, { texto: string; definicao: string }> = {
  novo: { texto: 'Novo', definicao: 'até 1 pedido (primeira compra)' },
  ocasional: { texto: 'Ocasional', definicao: 'de 2 a 4 pedidos' },
  vip: { texto: 'VIP', definicao: '5 pedidos ou mais' },
};

export function rotuloDePerfil(perfil: PerfilDeCliente | null | undefined): {
  texto: string;
  definicao: string;
} {
  // Backend novo com front antigo não pode quebrar a linha inteira da tabela.
  return PERFIS[perfil as PerfilDeCliente] ?? { texto: '—', definicao: '' };
}
