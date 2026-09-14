import { buildStorefrontUrl } from '../storefrontUrl';

/**
 * PR #176: a URL pública vinda de `metadata` (site_url/website/etc.) entrava
 * crua na composição do link, sem forçar `https://` como o ramo de
 * `custom_domain` já fazia. Se o dono digitasse o domínio sem esquema
 * ("meusite.com.br"), o link resultante virava relativo e quebrava em
 * StorefrontPage/PaymentsPage.
 */
describe('buildStorefrontUrl — URL de metadata força https', () => {
  it('adiciona https:// quando o metadata não tem esquema nenhum', () => {
    const url = buildStorefrontUrl({ metadata: { site_url: 'meusite.com.br' } });
    expect(url).toBe('https://meusite.com.br');
  });

  it('troca http:// por https:// quando o metadata veio inseguro', () => {
    const url = buildStorefrontUrl({ metadata: { website: 'http://meusite.com.br' } });
    expect(url).toBe('https://meusite.com.br');
  });

  it('mantém https:// quando o metadata já veio correto', () => {
    const url = buildStorefrontUrl({ metadata: { storefront_url: 'https://meusite.com.br' } });
    expect(url).toBe('https://meusite.com.br');
  });
});
