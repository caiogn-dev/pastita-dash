/**
 * `buildStorefrontUrl` monta o endereço público da loja usado em dois lugares
 * que precisam de URL absoluta e clicável:
 *   - StorefrontPage: `<a href={urlPublica}>` ("Abrir cardápio") e o `<code>`
 *     que imprime o endereço para o dono copiar;
 *   - PaymentsPage: o link de pagamento enviado ao CLIENTE
 *     (`${storefrontUrl}/pendente?token=...`).
 *
 * O ramo de `custom_domain` já força `https://`. O ramo que vem de `metadata`
 * (website/site_url/public_url/...) usava o valor CRU — e dono costuma digitar
 * o site sem esquema ("cesaladas.com.br"). Sem protocolo, o navegador trata
 * como caminho relativo: "Abrir cardápio" vira `https://<painel>/cesaladas.com.br`
 * e o link de pagamento do cliente quebra. Estes testes travam a simetria:
 * todo endereço devolvido é absoluto (`https://`).
 */
import { buildStorefrontUrl } from '../storefrontUrl';

describe('buildStorefrontUrl', () => {
  it('força https em URL de metadata digitada sem protocolo', () => {
    const url = buildStorefrontUrl({
      metadata: { website: 'cesaladas.com.br' },
    } as never);
    expect(url).toBe('https://cesaladas.com.br');
  });

  it('mantém uma URL de metadata que já veio com https', () => {
    const url = buildStorefrontUrl({
      metadata: { storefront_url: 'https://outro.com/loja' },
    } as never);
    expect(url).toBe('https://outro.com/loja');
  });

  it('normaliza http:// de metadata para https://', () => {
    const url = buildStorefrontUrl({
      metadata: { site_url: 'http://legado.com.br' },
    } as never);
    expect(url).toBe('https://legado.com.br');
  });

  it('remove barra final da URL de metadata', () => {
    const url = buildStorefrontUrl({
      metadata: { public_url: 'https://loja.com.br/' },
    } as never);
    expect(url).toBe('https://loja.com.br');
  });

  it('sempre devolve endereço absoluto (nunca caminho relativo)', () => {
    const url = buildStorefrontUrl({
      metadata: { website: 'cesaladas.com.br' },
    } as never);
    // Um href relativo (sem esquema) é o defeito que estamos travando.
    expect(url).toMatch(/^https:\/\//);
  });

  it('custom_domain continua forçando https', () => {
    expect(buildStorefrontUrl({ custom_domain: 'loja.com.br' } as never)).toBe(
      'https://loja.com.br',
    );
  });

  it('slug cai no domínio padrão', () => {
    expect(buildStorefrontUrl({ slug: 'ce-saladas' } as never)).toBe(
      'https://cardapidex.com.br/ce-saladas',
    );
  });

  it('anexa o path preservando a base de metadata', () => {
    const url = buildStorefrontUrl(
      { metadata: { website: 'cesaladas.com.br' } } as never,
      '/pendente',
    );
    expect(url).toBe('https://cesaladas.com.br/pendente');
  });

  it('sem domínio/metadata/slug não inventa endereço', () => {
    expect(buildStorefrontUrl(null)).toBeNull();
    expect(buildStorefrontUrl({} as never)).toBeNull();
  });
});
