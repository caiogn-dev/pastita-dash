export interface ContatoDaCampanha {
  phone: string;
  name?: string;
}

export interface LeituraDoCsv {
  /** Os contatos novos, sem repetição — nem entre si, nem com os já escolhidos. */
  contatos: ContatoDaCampanha[];
  /** Quantas linhas caíram por já estarem na lista ou repetirem outra linha. */
  repetidos: number;
  /** Quantas linhas caíram por não ter telefone utilizável. */
  invalidos: number;
}

/** Menos que isto não é telefone brasileiro nem com DDD de fixo. */
const MINIMO_DE_DIGITOS = 10;

const ehCabecalho = (linha: string) =>
  linha.toLowerCase().includes('phone') || linha.toLowerCase().includes('telefone');

/**
 * A lista colada vira destinatários.
 * ESPECIFICAÇÃO em `__tests__/contatosDoCsv.spec.ts`.
 *
 * A dedupla é contra as DUAS coisas: a lista já escolhida e o próprio arquivo.
 * A segunda faltava, e export de sistema de pedido traz o cliente uma vez por
 * compra — a pessoa recebia a promoção repetida e o dono pagava repetido.
 */
export const contatosDoCsv = (
  texto: string,
  jaEscolhidos: ContatoDaCampanha[],
): LeituraDoCsv => {
  const vistos = new Set(jaEscolhidos.map((c) => c.phone));
  const contatos: ContatoDaCampanha[] = [];
  let repetidos = 0;
  let invalidos = 0;

  texto
    .trim()
    .split('\n')
    .forEach((bruta, i) => {
      const linha = bruta.trim();
      if (!linha) return;
      if (i === 0 && ehCabecalho(linha)) return;

      const [primeira, segunda] = linha.split(/[,;\t]/);
      const phone = (primeira ?? '').replace(/\D/g, '');

      if (!phone || phone.length < MINIMO_DE_DIGITOS) {
        invalidos += 1;
        return;
      }
      if (vistos.has(phone)) {
        repetidos += 1;
        return;
      }

      vistos.add(phone);
      contatos.push({ phone, name: (segunda ?? '').trim() });
    });

  return { contatos, repetidos, invalidos };
};
