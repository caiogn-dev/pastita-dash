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

  it('domínio próprio continua tendo pré-visualização', () => {
    // O preview vive no domínio PADRÃO, que serve a mesma loja e libera o
    // enquadramento pelo painel. Não existe /preview no domínio da loja — mas
    // a conclusão de desligar o preview estava errada: a Cê Saladas
    // (cesaladas.com.br) via "a loja ainda não tem um endereço público", o
    // oposto da verdade, justamente por TER endereço próprio.
    const url = buildStorefrontPreviewUrl({ slug: 'x', custom_domain: 'loja.com.br' } as never);
    expect(url).toMatch(/\/preview\/x$/);
    expect(url).not.toMatch(/loja\.com\.br/);
  });

  it('URL vinda de metadata também não desliga o preview', () => {
    const url = buildStorefrontPreviewUrl({
      slug: 'x',
      metadata: { storefront_url: 'https://outro.com' },
    } as never);
    expect(url).toMatch(/\/preview\/x$/);
  });

  it('sem slug não inventa endereço', () => {
    expect(buildStorefrontPreviewUrl(null)).toBeNull();
    expect(buildStorefrontPreviewUrl({} as never)).toBeNull();
  });
});
