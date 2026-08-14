/**
 * Atalhos "/" do inbox — espelho do interpretador do backend.
 *
 * Existe porque consertar o pedido errado da Yeda custou à dona 5 minutos e
 * uma troca de tela, com a cliente esperando: cancelar no painel, refazer o
 * valor, copiar link do Mercado Pago, colar no chat.
 *
 * O perigo desta superfície não é o comando falhar — é ele NÃO ser reconhecido
 * e virar mensagem enviada. A dona digita `/pixx`, o sistema não entende, e a
 * cliente recebe "/pixx". Por isso qualquer texto que comece com barra é
 * tratado como tentativa de comando e nunca é enviado como conversa.
 *
 * ⚠️ Este catálogo espelha `apps/whatsapp/services/comandos.py`. Divergência
 * entre as duas pontas foi o que quebrou o bypass do modo humano e o remetente
 * de e-mail nesta mesma semana — se mexer aqui, mexa lá.
 */

export interface MetaComando {
  nome: string;
  descricao: string;
  confirmar: boolean;
  exemplo?: string;
}

export const COMANDOS: MetaComando[] = [
  { nome: 'pedido', descricao: 'Resumo do pedido atual do cliente', confirmar: false },
  { nome: 'pix', descricao: 'Gera e envia o PIX do pedido atual', confirmar: false },
  { nome: 'status', descricao: 'Em que etapa o pedido está', confirmar: false },
  { nome: 'entregue', descricao: 'Marca como entregue e avisa o cliente', confirmar: true },
  { nome: 'cancelar', descricao: 'Cancela o pedido atual', confirmar: true },
  { nome: 'cupom', descricao: 'Aplica um cupom ao pedido', confirmar: false, exemplo: '/cupom BEMVINDO10' },
  { nome: 'nota', descricao: 'Recado interno, o cliente não vê', confirmar: false, exemplo: '/nota cliente pediu sem cebola' },
  { nome: 'bot', descricao: 'Liga ou desliga o bot nesta conversa', confirmar: false, exemplo: '/bot off' },
  // Entrou depois do resto: o dono digitou /cardapio esperando que existisse.
  // Atalho que a pessoa tenta sozinha é atalho que faltava.
  { nome: 'cardapio', descricao: 'Envia o link do cardápio para a cliente', confirmar: false },
];

export interface Comando {
  nome: string;
  argumento: string;
  conhecido: boolean;
  precisaConfirmar: boolean;
  sugestao?: string;
  /** Sempre false. Comando é instrução, nunca texto para o cliente. */
  enviarAoCliente: false;
}

/** Devolve o comando, ou null quando a mensagem é conversa normal. */
export function interpretar(texto: string): Comando | null {
  if (!texto) return null;
  const limpo = texto.trim();
  // Só barra no INÍCIO: "5/5 estrelas" e "meio/meio" são texto de gente, e o
  // operador digita no mesmo campo em que fala com o cliente.
  if (!limpo.startsWith('/')) return null;

  const corpo = limpo.slice(1).trim();
  if (!corpo) return null;

  const espaco = corpo.search(/\s/);
  const nome = (espaco === -1 ? corpo : corpo.slice(0, espaco)).toLowerCase();
  const argumento = espaco === -1 ? '' : corpo.slice(espaco).trim();

  const meta = COMANDOS.find(c => c.nome === nome);
  if (!meta) {
    return {
      nome, argumento, conhecido: false, precisaConfirmar: false,
      sugestao: parecido(nome), enviarAoCliente: false,
    };
  }
  return {
    nome, argumento, conhecido: true,
    precisaConfirmar: meta.confirmar, enviarAoCliente: false,
  };
}

/** Comandos que combinam com o que está sendo digitado, para a paleta. */
export function sugestoes(texto: string): MetaComando[] {
  const limpo = (texto || '').trim();
  if (!limpo.startsWith('/')) return [];
  const prefixo = limpo.slice(1).split(/\s/)[0].toLowerCase();
  if (!prefixo) return COMANDOS;
  return COMANDOS.filter(c => c.nome.startsWith(prefixo));
}

function parecido(nome: string): string | undefined {
  // Distância crua: erro de digitação em atalho é quase sempre uma letra a
  // mais, a menos ou trocada. Não vale uma biblioteca.
  let melhor: string | undefined;
  let menor = Infinity;
  for (const c of COMANDOS) {
    const d = distancia(nome, c.nome);
    if (d < menor) { menor = d; melhor = c.nome; }
  }
  return menor <= 2 ? melhor : undefined;
}

function distancia(a: string, b: string): number {
  const m: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = Math.min(
        m[i - 1][j] + 1,
        m[i][j - 1] + 1,
        m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return m[a.length][b.length];
}
