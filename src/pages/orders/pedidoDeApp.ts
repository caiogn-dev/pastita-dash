/** Pedido que entrou por app de entrega (99Food, iFood). O número curto é o
 * que o entregador e o app mostram, então é ele que vai no cartão. O backend
 * grava em `metadata[<source>]` com as mesmas chaves para qualquer app. */
export type AppDeEntrega = '99food' | 'ifood';

export const APPS: Record<AppDeEntrega, { nome: string; prefixo: string }> = {
  '99food': { nome: '99Food', prefixo: '99' },
  ifood: { nome: 'iFood', prefixo: 'iFood' },
};

type PedidoComOrigem = { source?: string | null; metadata?: Record<string, unknown> | null };

type MetadataDoApp = {
  numero?: number | string | null;
  quem_entrega?: string;
  codigo_entrega?: string;
  codigo_retirada?: string;
  ultimo_erro?: string;
};

export type DadosDoApp = {
  app: AppDeEntrega;
  nome: string;
  numero: number | null;
  rotulo: string;
  quemEntrega: string;
  codigoEntrega: string;
  codigoRetirada: string;
  erro: string;
};

export function ehApp(source?: string | null): source is AppDeEntrega {
  return !!source && source in APPS;
}

export function dadosDoApp(pedido: PedidoComOrigem): DadosDoApp | null {
  const app = pedido.source;
  if (!ehApp(app)) return null;
  const { nome, prefixo } = APPS[app];
  const m = (pedido.metadata?.[app] ?? {}) as MetadataDoApp;
  const n = Number(String(m.numero ?? '').replace('#', ''));
  const numero = Number.isFinite(n) && n > 0 ? n : null;
  return {
    app,
    nome,
    numero,
    rotulo: numero ? `${prefixo} #${numero}` : nome,
    quemEntrega: m.quem_entrega ?? '',
    codigoEntrega: m.codigo_entrega ?? '',
    codigoRetirada: m.codigo_retirada ?? '',
    erro: m.ultimo_erro ?? '',
  };
}
