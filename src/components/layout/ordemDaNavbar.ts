/**
 * Como a barra do topo se organiza — e por quê.
 *
 * A barra tinha o logo da loja na ponta esquerda e o nome da MESMA loja
 * ("Cê Saladas") na ponta direita, separados por 800px de vazio. A mesma
 * informação duas vezes, e nenhum dos lados com significado próprio: o
 * operador precisava varrer a barra inteira para achar qualquer coisa.
 *
 * A regra que organiza tudo é DE QUEM É CADA COISA:
 *
 *   ESQUERDA  o contexto da LOJA — qual loja, se está no ar, sua central
 *   DIREITA   as ferramentas da PESSOA — busca, tema, avisos, conta
 *
 * Com a divisão, "estou na loja certa?" se responde olhando para um canto e
 * "onde mexo no meu perfil?" para o outro. É a mesma lógica do painel do
 * Prefiro, onde a barra do topo é a identidade da loja e suas ações, com a
 * navegação inteira na coluna lateral.
 *
 * Este arquivo existe separado do componente porque é DECISÃO, não layout: a
 * ordem sobrevive a qualquer redesenho e precisa de teste. Dentro de um JSX de
 * 600 linhas, ela viraria acidente de quem editou por último.
 */
export type ElementoDaNavbar =
  | 'loja'
  | 'central'
  | 'busca'
  | 'contas'
  | 'tema'
  | 'avisos'
  | 'conta';

export const GRUPOS_DA_NAVBAR: Record<ElementoDaNavbar, { dono: 'loja' | 'pessoa'; porque: string }> = {
  loja: {
    dono: 'loja',
    porque: 'define o significado de todo número da tela — faturamento sem saber de qual loja não vale nada',
  },
  central: {
    dono: 'loja',
    porque: 'é ação DA LOJA: abre a operação ao vivo em aba própria, uma vez por expediente',
  },
  busca: {
    dono: 'pessoa',
    porque: 'atalho de quem navega o dia inteiro; nada tem a ver com a loja escolhida',
  },
  contas: {
    dono: 'pessoa',
    porque: 'filtro de qual número de WhatsApp esta pessoa está acompanhando',
  },
  tema: {
    dono: 'pessoa',
    porque: 'preferência de quem olha a tela, não configuração da loja',
  },
  avisos: {
    dono: 'pessoa',
    porque: 'notificações dirigidas a este usuário',
  },
  conta: {
    dono: 'pessoa',
    porque: 'perfil e sair — a ponta direita é onde toda web coloca isso',
  },
};

export function ordemDaNavbar(): {
  esquerda: ElementoDaNavbar[];
  direita: ElementoDaNavbar[];
} {
  return {
    // A loja primeiro: é o que dá contexto ao resto. A Central logo em
    // seguida, porque é ação dela — no meio dos ícones utilitários viraria
    // mais um botãozinho.
    esquerda: ['loja', 'central'],
    // Da ferramenta mais usada para a menos usada, com a conta na ponta:
    // convenção que não vale a pena quebrar.
    direita: ['busca', 'contas', 'tema', 'avisos', 'conta'],
  };
}
