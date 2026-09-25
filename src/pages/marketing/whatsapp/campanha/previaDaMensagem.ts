/**
 * O que o CLIENTE vai ler — calculado do formulário, sem React.
 *
 * ESPECIFICAÇÃO em `../__tests__/previaDaMensagem.test.ts`.
 *
 * A prévia usa os mesmos valores que o envio manda: `nome_cliente` do primeiro
 * destinatário (ou "Cliente", que é o que o envio põe quando falta nome) e as
 * variáveis da oferta. Mostrar um exemplo diferente do que sai seria a prévia
 * mentir — e o dono confiar nela justamente quando ela erra.
 */
import type { MessageTemplate } from '../../../../types';
import type { TipoDeMensagem } from './passosDaCampanha';

const VARIAVEL = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

/** Nome de exemplo enquanto a lista ainda está vazia. */
export const NOME_DE_EXEMPLO = 'Maria';

/** O que o envio põe em `nome_cliente` quando o contato não tem nome. */
export const NOME_QUANDO_FALTA = 'Cliente';

export interface TextoPreenchido {
  texto: string;
  /** Variáveis que ficaram como `{{assim}}` — sem valor para trocar. */
  semValor: string[];
}

export const preencherVariaveis = (
  texto: string,
  valores: Record<string, string | undefined>,
): TextoPreenchido => {
  const semValor = new Set<string>();
  const preenchido = texto.replace(VARIAVEL, (original, nome: string) => {
    const valor = valores[nome];
    if (valor) return valor;
    semValor.add(nome);
    return original;
  });
  return { texto: preenchido, semValor: Array.from(semValor) };
};

export const exemploDeCliente = (contatos: Array<{ name?: string }>): string => {
  if (contatos.length === 0) return NOME_DE_EXEMPLO;
  return contatos[0].name?.trim() || NOME_QUANDO_FALTA;
};

export interface PreviaDaMensagem {
  cabecalho?: string;
  /** O template pede imagem no cabeçalho — o balão reserva o espaço. */
  cabecalhoDeImagem: boolean;
  corpo: string;
  rodape?: string;
  botoes: string[];
  semValor: string[];
}

/** Como a Meta descreve um componente de template. Sem tipo nosso na API. */
type ComponenteDaMeta = {
  type?: string;
  format?: string;
  text?: string;
  buttons?: Array<{ text?: string }>;
};

interface EntradaDaPrevia {
  tipo: TipoDeMensagem;
  /** Texto livre digitado (ignorado no modo template). */
  texto: string;
  template?: MessageTemplate;
  /** `nome_cliente`, `produto_1`, `preco_1`… */
  valores: Record<string, string | undefined>;
}

export const previaDaMensagem = ({ tipo, texto, template, valores }: EntradaDaPrevia): PreviaDaMensagem => {
  if (tipo === 'text') {
    // O texto livre anuncia `{{nome}}` na tela; `nome_cliente` vale também,
    // porque é o nome que o dono vê nos templates.
    const { texto: corpo, semValor } = preencherVariaveis(texto, {
      ...valores,
      nome: valores.nome ?? valores.nome_cliente,
    });
    return { cabecalhoDeImagem: false, corpo, botoes: [], semValor };
  }

  const componentes = (template?.components ?? []) as ComponenteDaMeta[];
  const doTipo = (t: string) => componentes.find((c) => String(c?.type ?? '').toUpperCase() === t);

  const cabecalho = doTipo('HEADER');
  const corpo = doTipo('BODY');
  const rodape = doTipo('FOOTER');
  const botoes = doTipo('BUTTONS');

  const semValor = new Set<string>();
  const preencher = (t?: string) => {
    if (!t) return undefined;
    const r = preencherVariaveis(t, valores);
    r.semValor.forEach((v) => semValor.add(v));
    return r.texto;
  };

  const formato = String(cabecalho?.format ?? '').toUpperCase();

  return {
    cabecalho: formato === 'TEXT' || (!formato && cabecalho?.text) ? preencher(cabecalho?.text) : undefined,
    cabecalhoDeImagem: formato === 'IMAGE',
    corpo: preencher(corpo?.text) ?? '',
    rodape: rodape?.text || undefined,
    botoes: (botoes?.buttons ?? []).map((b) => b?.text ?? '').filter(Boolean),
    semValor: Array.from(semValor),
  };
};

const numero = (n: number) => n.toLocaleString('pt-BR');

export const clientes = (n: number) => `${numero(n)} ${n === 1 ? 'cliente' : 'clientes'}`;

/**
 * O botão final diz o que faz. "Enviar agora" não conta para quantos — e é a
 * única pergunta que importa antes de um disparo pago.
 */
export const rotuloDoEnvio = (quantidade: number): string =>
  quantidade > 0 ? `Enviar para ${clientes(quantidade)}` : 'Enviar';

/** Quanto o disparo leva, na velocidade escolhida. */
export const tempoDeEnvio = (quantidade: number, porMinuto: number): string => {
  if (quantidade <= 0 || porMinuto <= 0) return '';
  const minutos = Math.ceil(quantidade / porMinuto);
  return quantidade < porMinuto ? 'menos de 1 min' : `cerca de ${minutos} min`;
};
