import { buildNavSections } from '../navSections';

const storeHref = (p: string) => `/stores/loja-x/${p}`;

it('main bar has the expected top-level labels (foco na operação, sem Campanhas/Automação)', () => {
  const labels = buildNavSections({ storeHref, automationEnabled: false }).map((s) => s.label);
  expect(labels).toEqual([
    'Início', 'Pedidos', 'Chat', 'PDV', 'Clientes',
    'Cardápio', 'Relatórios', 'Configurações',
  ]);
  expect(labels).not.toContain('Marketing');
  expect(labels).not.toContain('Loja');
});

it('omits Campanhas e Automação when automationEnabled is false', () => {
  const labels = buildNavSections({ storeHref, automationEnabled: false }).map((s) => s.label);
  expect(labels).not.toContain('Campanhas');
  expect(labels).not.toContain('Automação');
});

it('inserts Campanhas + Automação (before Configurações) when automationEnabled is true', () => {
  const labels = buildNavSections({ storeHref, automationEnabled: true }).map((s) => s.label);
  expect(labels).toContain('Campanhas');
  expect(labels).toContain('Automação');
  expect(labels.indexOf('Automação')).toBe(labels.indexOf('Configurações') - 1);
  expect(labels.indexOf('Campanhas')).toBe(labels.indexOf('Automação') - 1);
});

it('Configurações renames the old "Configurações" item to "Geral"', () => {
  const cfg = buildNavSections({ storeHref, automationEnabled: false }).find((s) => s.label === 'Configurações')!;
  const names = cfg.items.map((i) => i.name);
  expect(names).toEqual(['Geral', 'Entrega', 'Storefront', 'Pagamentos']);
  expect(cfg.items.find((i) => i.name === 'Geral')!.href).toBe('/stores/loja-x/settings');
});

it('does NOT contain account-level links anywhere (they live in the avatar menu)', () => {
  const allHrefs = buildNavSections({ storeHref, automationEnabled: true })
    .flatMap((s) => [s.href, ...s.items.map((i) => i.href)])
    .filter(Boolean);
  for (const accountHref of ['/stores', '/accounts', '/connections', '/settings', '/plano']) {
    expect(allHrefs).not.toContain(accountHref);
  }
});

it('Campanhas holds the three campaign links (quando habilitado)', () => {
  const camp = buildNavSections({ storeHref, automationEnabled: true }).find((s) => s.label === 'Campanhas')!;
  expect(camp.items.map((i) => i.href)).toEqual([
    '/marketing/whatsapp', '/marketing/whatsapp/templates', '/marketing/email/campaigns',
  ]);
});

it('passes the unread badge through to Chat', () => {
  const chat = buildNavSections({ storeHref, automationEnabled: false, unreadBadge: '3' }).find((s) => s.label === 'Chat')!;
  expect(chat.badge).toBe('3');
});
