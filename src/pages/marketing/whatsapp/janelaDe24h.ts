/**
 * O que a tela diz sobre a janela de 24h ao escolher o horário do disparo.
 *
 * A regra é da Meta: dentro de 24 horas contadas da última mensagem que a
 * CLIENTE mandou, a loja responde texto livre de graça. Fora disso só template
 * aprovado, cobrado por conversa.
 *
 * Sem este número o dono agenda no escuro — "manda às 20h" pode significar 10
 * pessoas ou 2, e ele só descobre depois que a campanha rodou. E a janela
 * encolhe com o tempo, então a conta é sempre para o HORÁRIO DO DISPARO.
 */

export interface ResumoDaJanela {
  dentro: number;
  fora: number;
}

/**
 * O aviso mostra os DOIS números.
 *
 * Só "10 recebem" esconde que 90 pessoas não vão saber da promoção — e é
 * justamente essa comparação que decide entre mandar de graça agora e pagar
 * template para alcançar todo mundo.
 */
export function avisoDaJanela(resumo: ResumoDaJanela | null | undefined): string {
  if (!resumo) return '';

  const { dentro, fora } = resumo;
  if (dentro === 0) {
    return `Ninguém está na janela de 24h neste horário — ${fora} ficariam de fora. `
      + 'Neste caso só um template pago alcança a base.';
  }

  const pessoas = dentro === 1 ? '1 cliente' : `${dentro} clientes`;
  const recebe = dentro === 1 ? 'recebe' : 'recebem';
  return `${pessoas} ${recebe} de graça neste horário; ${fora} ficam de fora `
    + '(fora da janela de 24h, só com template pago).';
}

/**
 * O horário do campo vira ISO para a consulta.
 *
 * `datetime-local` entrega "2026-09-05T20:00", sem fuso. Mandar essa string
 * crua faz o backend ler como UTC e a conta sai três horas deslocada —
 * exatamente no horário que mais importa, o da noite.
 *
 * Vazio devolve `undefined`, e aí a pergunta é "quantos estão dentro AGORA",
 * que é a resposta certa enquanto ninguém escolheu horário.
 */
export function horarioParaConsulta(valorDoCampo: string): string | undefined {
  const bruto = (valorDoCampo || '').trim();
  if (!bruto) return undefined;

  // Exige a forma do campo antes de converter: `new Date('2026-09-')` não
  // devolve data inválida em JS, ele ADIVINHA — e uma data pela metade,
  // enquanto a pessoa ainda digita, viraria uma consulta para um horário que
  // ela não escolheu.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(bruto)) return undefined;

  const quando = new Date(bruto);
  return Number.isNaN(quando.getTime()) ? undefined : quando.toISOString();
}
