import { buildNavSections } from '../navSections';

const storeHref = (p: string) => `/stores/loja-x/${p}`;
const secoes = (automationEnabled = true) => buildNavSections({ storeHref, automationEnabled });
const acha = (label: string, automationEnabled = true) =>
  secoes(automationEnabled).find((s) => s.label === label)!;
const todosItens = (automationEnabled = true) =>
  secoes(automationEnabled).flatMap((s) => s.items);

it('o menu é dividido em blocos nomeados, não numa lista corrida', () => {
  // Onze seções soltas obrigam a ler tudo para achar uma. Os blocos respondem
  // "isso é coisa de hoje, de catálogo, de crescer ou de ajuste?" antes.
  const grupos = [...new Set(secoes().map((s) => s.grupo))];
  expect(grupos).toEqual(['Operação', 'Catálogo', 'Crescimento', 'Ajustes']);
});

it('toda seção pertence a um bloco', () => {
  for (const s of secoes()) expect(s.grupo).toBeTruthy();
});

it('cada seção tem ícone próprio — ícone repetido faz tudo parecer igual', () => {
  const icones = secoes().map((s) => s.icon);
  expect(new Set(icones).size).toBe(icones.length);
});

it('itens da mesma seção não repetem ícone entre si', () => {
  for (const s of secoes()) {
    const icones = s.items.map((i) => i.icon);
    expect(new Set(icones).size).toBe(icones.length);
  }
});

describe('agrupamento que o dono pediu', () => {
  it('TACO, Etiquetas e Impressoras moram juntas — é a mesma bancada', () => {
    const bancada = acha('Etiquetas');
    expect(bancada.items.map((i) => i.href)).toEqual([
      '/stores/loja-x/ingredientes',
      '/stores/loja-x/etiquetas',
      '/stores/loja-x/printing',
    ]);
  });

  it('o PDV volta a ser só a venda no balcão', () => {
    const pdv = acha('Balcão');
    const nomes = pdv.items.map((i) => i.name);
    expect(nomes).not.toContain('Etiquetas');
    expect(nomes).not.toContain('Impressão');
    expect(pdv.items.map((i) => i.href)).toEqual([
      '/stores/loja-x/pdv',
      '/stores/loja-x/cash',
      '/payments/link',
      '/stores/loja-x/kds',
    ]);
  });
});

describe('páginas recuperadas — existiam no código e não tinham caminho nenhum', () => {
  const alcancavel = (href: string) =>
    todosItens().some((i) => i.href === href) || secoes().some((s) => s.href === href);

  it.each([
    ['/marketing/automations', 'e-mails automáticos por evento'],
    // '/marketing/subscribers' e '/automation/flows' foram REMOVIDOS desta
    // lista em 19/08. Eles entraram aqui por um critério de superfície ("a
    // página existe e não tem caminho no menu"), que estava certo na época.
    // O critério novo é de conteúdo: medido contra o banco de produção, os
    // dois nunca tiveram um registro sequer. Dar caminho de menu para tela
    // que só sabe mostrar vazio é pior do que não ter caminho.
    // Ver 'menu não promete tela que nunca teve dado', no fim do arquivo.
    ['/whatsapp/diagnostics', 'diagnóstico do webhook'],
    ['/whatsapp/debug', 'diagnóstico do chat'],
  ])('%s (%s) tem caminho no menu', (href) => {
    expect(alcancavel(href)).toBe(true);
  });
});

describe('atendimento deixa de ser um item solto', () => {
  it('junta conversas, fila humana, sessões e insights', () => {
    const at = acha('Atendimento');
    expect(at.items.map((i) => i.href)).toEqual([
      '/inbox/whatsapp',
      '/whatsapp/handover',
      '/automation/sessions',
      '/automation/conversation-insights',
    ]);
  });

  it('o badge de não lidas fica no Atendimento', () => {
    const at = buildNavSections({ storeHref, automationEnabled: true, unreadBadge: '3' })
      .find((s) => s.label === 'Atendimento')!;
    expect(at.badge).toBe('3');
  });
});

it('sem automação habilitada, Marketing e Automação somem — o resto fica', () => {
  const labels = secoes(false).map((s) => s.label);
  expect(labels).not.toContain('Marketing');
  expect(labels).not.toContain('Automação');
  expect(labels).toEqual(expect.arrayContaining(['Início', 'Pedidos', 'Atendimento', 'Balcão', 'Cardápio']));
});

it('Configurações mantém Geral/Entrega/Storefront/Pagamentos e ganha Diagnóstico', () => {
  const cfg = acha('Configurações');
  expect(cfg.items.map((i) => i.name)).toEqual([
    'Geral', 'Entrega', 'Storefront', 'Pagamentos', 'Diagnóstico do WhatsApp', 'Diagnóstico do chat',
  ]);
  expect(cfg.items[0].href).toBe('/stores/loja-x/settings');
});

it('nenhum link de conta no menu — eles vivem no menu do avatar', () => {
  const hrefs = secoes().flatMap((s) => [s.href, ...s.items.map((i) => i.href)]).filter(Boolean);
  for (const conta of ['/stores', '/accounts', '/connections', '/settings', '/plano']) {
    expect(hrefs).not.toContain(conta);
  }
});

it('não existe href duplicado — dois caminhos para a mesma tela ensinam duas vezes', () => {
  const hrefs = secoes().flatMap((s) => [s.href, ...s.items.map((i) => i.href)]).filter(Boolean);
  expect(new Set(hrefs).size).toBe(hrefs.length);
});

describe('menu não promete tela que nunca teve dado', () => {
  /**
   * Levantamento de 19/08, cruzando as 77 rotas com o banco de produção:
   * AgentFlow 0, FlowSession 0, FlowExecutionLog 0, ScheduledMessage 0,
   * Subscriber 0. O agente de IA nunca rodou em produção (as 14
   * AgentConversation têm 0 mensagens cada), e "Assinantes" lista um modelo
   * paralelo que nada alimenta — o dado real de campanha vive em
   * EmailRecipient (136) e StoreCustomer (100).
   *
   * As ROTAS continuam de pé (link antigo não quebra); só saem do menu, para
   * o painel parar de oferecer o que não entrega. Mesmo tratamento que
   * /automation/logs já recebeu.
   */
  const semDado = ['/automation/flows', '/automation/scheduled', '/marketing/subscribers'];

  it.each(semDado)('%s não aparece no menu', (href) => {
    const todos = secoes().flatMap((s) => s.items.map((i) => i.href));
    expect(todos).not.toContain(href);
  });

  it('Modelos de mensagem CONTINUA no menu — resolve o erro 131047 da janela de 24h', () => {
    const todos = secoes().flatMap((s) => s.items.map((i) => i.href));
    expect(todos).toContain('/marketing/whatsapp/templates');
  });
});
