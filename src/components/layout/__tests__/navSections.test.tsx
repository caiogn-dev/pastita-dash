import { buildNavSections } from '../navSections';

const storeHref = (p: string) => `/stores/loja-x/${p}`;

it('main bar has the expected top-level labels (no Marketing, no Loja)', () => {
  const labels = buildNavSections({ storeHref, automationEnabled: false }).map((s) => s.label);
  expect(labels).toEqual([
    'Início', 'Pedidos', 'Chat', 'PDV', 'Clientes',
    'Cardápio', 'Relatórios', 'Campanhas', 'Configurações',
  ]);
  expect(labels).not.toContain('Marketing');
  expect(labels).not.toContain('Loja');
});

it('omits Automação when automationEnabled is false', () => {
  const labels = buildNavSections({ storeHref, automationEnabled: false }).map((s) => s.label);
  expect(labels).not.toContain('Automação');
});

it('inserts Automação (before Configurações) when automationEnabled is true', () => {
  const labels = buildNavSections({ storeHref, automationEnabled: true }).map((s) => s.label);
  expect(labels).toContain('Automação');
  expect(labels.indexOf('Automação')).toBe(labels.indexOf('Configurações') - 1);
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

it('Campanhas holds the three campaign links', () => {
  const camp = buildNavSections({ storeHref, automationEnabled: false }).find((s) => s.label === 'Campanhas')!;
  expect(camp.items.map((i) => i.href)).toEqual([
    '/marketing/whatsapp', '/marketing/whatsapp/templates', '/marketing/email/campaigns',
  ]);
});

it('passes the unread badge through to Chat', () => {
  const chat = buildNavSections({ storeHref, automationEnabled: false, unreadBadge: '3' }).find((s) => s.label === 'Chat')!;
  expect(chat.badge).toBe('3');
});
