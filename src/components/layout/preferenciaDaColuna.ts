/**
 * A largura da coluna é uma PREFERÊNCIA, e preferência que morre no reload não
 * é preferência — é um gesto que o operador refaz toda manhã.
 *
 * Fica em localStorage e não no servidor de propósito: é uma escolha de tela,
 * não da conta. O mesmo dono num monitor grande e num notebook quer larguras
 * diferentes, e sincronizar isso entre os dois seria pior que não guardar.
 *
 * Todo acesso é embrulhado: em aba anônima, com dados do site bloqueados ou
 * dentro de captura de miniatura, o próprio ACESSO ao localStorage lança — e
 * uma exceção aqui derrubaria a navegação inteira do painel por causa de uma
 * conveniência.
 */
export const CHAVE_COLUNA = 'cardapidex:coluna';

const RECOLHIDA = 'recolhida';
const ABERTA = 'aberta';

/** Sem preferência gravada a coluna nasce ABERTA: quem chega precisa ver os nomes. */
export function lerPreferencia(): boolean {
  try {
    return localStorage.getItem(CHAVE_COLUNA) === RECOLHIDA;
  } catch {
    return false;
  }
}

export function gravarPreferencia(recolhida: boolean): void {
  try {
    localStorage.setItem(CHAVE_COLUNA, recolhida ? RECOLHIDA : ABERTA);
  } catch {
    /* Preferência é conveniência: não poder gravar não pode quebrar a tela. */
  }
}
