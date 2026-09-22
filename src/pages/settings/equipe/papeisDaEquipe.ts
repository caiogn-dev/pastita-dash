/**
 * O que cada papel da equipe significa, em português de gente.
 *
 * O backend guarda 'owner' | 'manager' | 'operator' | 'viewer'. Mostrar esses
 * nomes crus na tela transformaria a escolha num chute: o dono da loja não tem
 * como saber que "operator" vê pedido mas não vê faturamento.
 *
 * A descrição diz o que a pessoa VAI PODER FAZER, não o nome técnico do papel
 * — é a pergunta que o dono está realmente respondendo quando escolhe.
 */

export type Papel = 'owner' | 'manager' | 'operator' | 'viewer';

export interface DescricaoDePapel {
  valor: Papel;
  rotulo: string;
  resumo: string;
}

/** Ordem do mais poderoso ao mais restrito — é como o dono pensa a escolha. */
export const PAPEIS: DescricaoDePapel[] = [
  {
    valor: 'owner',
    rotulo: 'Dono',
    resumo: 'Controla tudo, inclusive cobrança e equipe.',
  },
  {
    valor: 'manager',
    rotulo: 'Gerente',
    resumo: 'Cuida da loja inteira e pode convidar outras pessoas.',
  },
  {
    valor: 'operator',
    rotulo: 'Operador',
    resumo: 'Atende pedidos e conversas no dia a dia.',
  },
  {
    valor: 'viewer',
    rotulo: 'Visualizador',
    resumo: 'Só olha. Não altera nada.',
  },
];

/** Papéis que o dono pode ESCOLHER ao convidar.
 *
 * 'owner' fica de fora: a loja tem um dono e ele não se define por formulário.
 * Deixá-lo na lista convidaria alguém a dar o controle da própria loja sem
 * perceber — e a remoção do dono é bloqueada pelo backend, então o estrago
 * ficaria preso.
 */
export const PAPEIS_ESCOLHIVEIS = PAPEIS.filter((p) => p.valor !== 'owner');

export function descricaoDoPapel(valor: string): DescricaoDePapel {
  return (
    PAPEIS.find((p) => p.valor === valor) ?? {
      valor: valor as Papel,
      rotulo: valor,
      resumo: '',
    }
  );
}

/** O nome que aparece no card. Nunca um e-mail de fachada. */
export function nomeDoColaborador(user: {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
}): string {
  const inteiro = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  if (inteiro) return inteiro;
  // `{telefone}@pastita.local` e `cliente_...` são identidades internas: são
  // preenchimento do sistema, não nome de pessoa, e não vão para a tela.
  const email = (user.email ?? '').trim();
  if (email && !email.endsWith('@pastita.local')) return email;
  const login = (user.username ?? '').trim();
  if (login && !login.startsWith('cliente_')) return login;
  return 'Sem nome';
}
