/**
 * copyToClipboard — cópia resiliente para a área de transferência.
 *
 * Motivação: havia ~9 chamadas espalhadas usando `navigator.clipboard.writeText`
 * direto. Em contextos inseguros (HTTP sem TLS), navegadores antigos ou quando a
 * permissão é negada, a API ou está ausente (lança TypeError) ou rejeita a promise.
 * O padrão antigo mostrava "copiado!" mesmo quando nada era copiado.
 *
 * Esta função:
 *  - tenta a Async Clipboard API quando disponível e aguarda o resultado;
 *  - cai para um fallback `document.execCommand('copy')` via <textarea> temporário
 *    (cobre contextos inseguros e navegadores legados);
 *  - retorna `true`/`false` para que o chamador mostre o feedback correto.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permissão negada ou contexto inseguro — tenta o fallback abaixo.
    }
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    // Mantém fora da viewport e sem rolar a página ao focar.
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export default copyToClipboard;
