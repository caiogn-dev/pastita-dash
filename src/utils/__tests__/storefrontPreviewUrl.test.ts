/**
 * A pré-visualização aponta para `/preview/{slug}`, nunca para a loja.
 *
 * O painel embute o cardápio num iframe. A loja de verdade (`/{slug}`) manda
 * `X-Frame-Options: SAMEORIGIN` e continua mandando de propósito: dela se chega
 * ao checkout, e enquadrar tela com ação é o que abre clickjacking. Apontar o
 * iframe para lá daria "conexão recusada" — o erro que o dono lê como "minha
 * loja caiu".
 */
import { buildStorefrontPreviewUrl, buildStorefrontUrl } from '../storefrontUrl';

describe('buildStorefrontPreviewUrl', () => {
  it('usa a rota de preview, e não a raiz da loja', () => {
    const url = buildStorefrontPreviewUrl({ slug: 'ce-saladas' } as never);
    expect(url).toMatch(/\/preview\/ce-saladas$/);
    expect(url).not.toEqual(buildStorefrontUrl({ slug: 'ce-saladas' } as never));
  });

  it('domínio próprio não tem preview embutível', () => {
    // Quem configurou domínio customizado publicou a loja na raiz dele — não
    // existe /preview lá, e mandar o iframe para uma 404 é pior que não ter
    // preview. Devolvendo null o componente explica em vez de errar.
    expect(
      buildStorefrontPreviewUrl({ slug: 'x', custom_domain: 'loja.com.br' } as never)
    ).toBeNull();
  });

  it('URL vinda de metadata também desliga o preview', () => {
    expect(
      buildStorefrontPreviewUrl({
        slug: 'x',
        metadata: { storefront_url: 'https://outro.com' },
      } as never)
    ).toBeNull();
  });

  it('sem slug não inventa endereço', () => {
    expect(buildStorefrontPreviewUrl(null)).toBeNull();
    expect(buildStorefrontPreviewUrl({} as never)).toBeNull();
  });
});
