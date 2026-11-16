/**
 * Link vindo da API só vira `href`/`src` se for http(s) ou caminho relativo.
 * `javascript:`, `data:` e afins devolvem `undefined`: o link fica inerte
 * em vez de executar script no painel do lojista.
 */
export function urlSegura(valor: string | null | undefined): string | undefined {
  if (typeof valor !== 'string') return undefined;
  const url = valor.trim();
  if (!url) return undefined;
  // O navegador ignora tab/quebra de linha dentro do esquema ("java\tscript:").
  const limpa = Array.from(url).filter((c) => c.charCodeAt(0) > 32).join('');
  if (/^(https?:)?\/\//i.test(limpa)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(limpa)) return undefined;
  return url;
}
