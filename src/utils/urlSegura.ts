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

/**
 * Para redirecionar a janela inteira (`window.location.href = ...`): ali um
 * `javascript:` EXECUTA no painel, com o token do lojista à mão. Quem chama
 * está num `try`, então o erro cai no aviso que a tela já mostra quando a
 * API falha — o lojista vê "não consegui abrir", não uma tela morta.
 */
export function exigirUrlSegura(valor: string | null | undefined): string {
  const url = urlSegura(valor);
  if (!url) throw new Error('URL de redirecionamento inválida');
  return url;
}
