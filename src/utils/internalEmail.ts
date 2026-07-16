/**
 * Emails sintéticos que o backend fabrica como identidade interna
 * (ex.: `{fone}@local.invalid`, `whatsapp_{fone}@whatsapp.bot`) NUNCA
 * devem ser exibidos como email real do cliente — regra do server2.
 */
const INTERNAL_EMAIL_DOMAINS = [
  'whatsapp.bot',
  'whatsapp.chat',
  'whatsapp.local',
  'pastita.local',
];

export function isInternalEmail(email?: string | null): boolean {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return INTERNAL_EMAIL_DOMAINS.includes(domain) || domain.endsWith('.invalid');
}

/** Email exibível ao usuário: o próprio, ou undefined se for interno/vazio. */
export function publicEmail(email?: string | null): string | undefined {
  if (!email || isInternalEmail(email)) return undefined;
  return email;
}
