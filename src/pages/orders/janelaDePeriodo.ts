/**
 * Traduz o chip de período ("7 dias") para o par de datas da API.
 *
 * Isolado do componente porque é a conta mais perigosa da tela: um erro de um
 * dia aqui aparece como faturamento errado, e ninguém desconfia de um filtro —
 * a suspeita cai sobre o caixa.
 *
 * TODA conta é feita em data LOCAL, montada campo a campo. `toISOString()`
 * converte para UTC e, em Brasília, devolve o dia SEGUINTE a partir das 21h —
 * exatamente o horário de pico do delivery. Foi essa a origem do bug do card
 * "Receita hoje" em 06/ago, que zerava o faturamento toda noite.
 */
export type ChaveDePeriodo =
  | 'hoje'
  | 'ontem'
  | '7d'
  | '30d'
  | 'mes'
  | 'mes_passado'
  | 'personalizado';

export interface JanelaDeDatas {
  date_from?: string;
  date_to?: string;
}

/** ISO local (YYYY-MM-DD) sem passar por UTC. */
function iso(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function somarDias(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function janelaDePeriodo(
  chave: ChaveDePeriodo,
  agora: Date = new Date()
): JanelaDeDatas | null {
  // O período personalizado é do operador: devolver janela aqui apagaria as
  // datas que ele acabou de digitar.
  if (chave === 'personalizado') return null;

  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

  switch (chave) {
    case 'hoje':
      return { date_from: iso(hoje), date_to: iso(hoje) };

    case 'ontem': {
      const d = somarDias(hoje, -1);
      return { date_from: iso(d), date_to: iso(d) };
    }

    // `-6` e não `-7`: hoje é um dos sete. Contar sete dias para trás A PARTIR
    // de hoje daria oito dias e inflaria a semana em 14%.
    case '7d':
      return { date_from: iso(somarDias(hoje, -6)), date_to: iso(hoje) };

    case '30d':
      return { date_from: iso(somarDias(hoje, -29)), date_to: iso(hoje) };

    case 'mes':
      return {
        date_from: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
        date_to: iso(hoje),
      };

    case 'mes_passado': {
      // Dia 0 do mês corrente = último dia do anterior. Vira o ano sozinho.
      const primeiro = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const ultimo = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return { date_from: iso(primeiro), date_to: iso(ultimo) };
    }

    default:
      return null;
  }
}

const brasileiro = (isoStr: string): string => {
  const [a, m, d] = isoStr.split('-');
  return `${d}/${m}/${a}`;
};

/**
 * O intervalo por extenso.
 *
 * O chip diz "7 dias" e não responde "de quando até quando" — que é o que o
 * dono precisa saber antes de comparar com o extrato do banco.
 */
export function rotuloDaJanela(j: JanelaDeDatas): string {
  if (!j.date_from && !j.date_to) return 'todo o período';
  if (j.date_from && j.date_to) {
    return j.date_from === j.date_to
      ? brasileiro(j.date_from)
      : `${brasileiro(j.date_from)} a ${brasileiro(j.date_to)}`;
  }
  if (j.date_from) return `de ${brasileiro(j.date_from)}`;
  return `até ${brasileiro(j.date_to as string)}`;
}

export const PERIODOS_DE_HISTORICO = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ontem', label: 'Ontem' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'mes', label: 'Este mês' },
  { value: 'mes_passado', label: 'Mês passado' },
  { value: 'personalizado', label: 'Escolher datas' },
] as const;
