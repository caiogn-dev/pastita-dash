/**
 * Manda o erro do navegador do operador para o servidor, que registra no GlitchTip.
 *
 * Antes de 06/10 o erro de tela morria no console do computador da loja.
 * Regras: o mesmo erro vai uma vez só, no máximo 10 por página (loop de render
 * não inunda nada), ruído que já tem dono fica de fora, e reportar nunca pode
 * virar outro erro.
 */
import { buildAuthHeader } from './tokenStorage';

export type OrigemDoErro = 'render' | 'janela' | 'promessa';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/+$/, '');
const LIMITE_POR_PAGINA = 10;

let enviados = new Set<string>();

/** Só para teste. */
export function _zerarReportes(): void {
  enviados = new Set();
}

function textoDe(erro: unknown): { mensagem: string; pilha: string; nome: string } {
  if (erro instanceof Error) {
    return { mensagem: erro.message || erro.name, pilha: erro.stack || '', nome: erro.name };
  }
  if (typeof erro === 'string') return { mensagem: erro, pilha: '', nome: '' };
  try {
    return { mensagem: JSON.stringify(erro), pilha: '', nome: '' };
  } catch {
    return { mensagem: String(erro), pilha: '', nome: '' };
  }
}

function ehRuido(erro: unknown, mensagem: string, pilha: string, nome: string): boolean {
  // HTTP/rede: o servidor já registra o que respondeu; falha de rede é do Wi-Fi da loja.
  if ((erro as { isAxiosError?: boolean } | null)?.isAxiosError) return true;
  if (nome === 'AbortError') return true;
  // Chunk de build antigo: o main.tsx já recarrega a página sozinho.
  if (/dynamically imported module|Loading chunk|Importing a module script failed/i.test(mensagem)) return true;
  if (/ResizeObserver loop/i.test(mensagem)) return true;
  // Extensão do navegador não é código nosso.
  if (/(chrome|moz|safari)-extension:\/\//.test(pilha)) return true;
  return false;
}

function versaoDoBuild(): string {
  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  return script?.src.split('/').pop()?.replace(/\.js$/, '') || '';
}

export function reportarErro(erro: unknown, origem: OrigemDoErro, pilhaDeComponentes = ''): void {
  try {
    const { mensagem, pilha, nome } = textoDe(erro);
    if (!mensagem.trim() || ehRuido(erro, mensagem, pilha, nome)) return;
    if (enviados.has(mensagem) || enviados.size >= LIMITE_POR_PAGINA) return;
    enviados.add(mensagem);

    const autorizacao = buildAuthHeader();
    void fetch(`${API_BASE_URL}/core/erros-do-painel/`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(autorizacao ? { Authorization: autorizacao } : {}),
      },
      body: JSON.stringify({
        mensagem: mensagem.slice(0, 300),
        rota: window.location.pathname,
        origem,
        pilha: `${pilha}\n${pilhaDeComponentes}`.trim().slice(0, 4000),
        versao: versaoDoBuild(),
      }),
    }).catch(() => undefined);
  } catch {
    // Reportar não pode quebrar a tela que já está quebrada.
  }
}

/** Erros fora do React: script solto e promise rejeitada sem catch. */
export function vigiarErrosDaJanela(): void {
  window.addEventListener('error', (evento) => {
    reportarErro(evento.error ?? evento.message, 'janela');
  });
  window.addEventListener('unhandledrejection', (evento) => {
    reportarErro(evento.reason, 'promessa');
  });
}
