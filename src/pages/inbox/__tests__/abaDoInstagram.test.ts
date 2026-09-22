/**
 * A aba do Instagram só existe para quem conectou o Instagram.
 *
 * Ela foi retirada do produto em agosto porque aparecia para todo mundo e
 * abria vazia. Agora a loja vende promoção por comentário: quem responde vai
 * parar no direct, e o direct precisa ter onde ser lido — mas só quando existe.
 */
import { montarAbas, resolveInboxTab, rolagemDaAba } from '../inboxTabs';

it('loja sem Instagram não vê a aba', () => {
  expect(montarAbas({ temInstagram: false }).map((t) => t.id)).toEqual(['whatsapp', 'conversas']);
});

it('loja com Instagram ganha a aba do direct', () => {
  expect(montarAbas({ temInstagram: true }).map((t) => t.id))
    .toEqual(['whatsapp', 'instagram', 'conversas']);
});

it('endereço /inbox/instagram só abre a aba quando a conta existe', () => {
  expect(resolveInboxTab('instagram', { temInstagram: true })).toBe('instagram');
  expect(resolveInboxTab('instagram', { temInstagram: false })).toBe('whatsapp');
  expect(resolveInboxTab('instagram')).toBe('whatsapp');
});

it('a aba do direct cuida da própria rolagem, como a do WhatsApp', () => {
  expect(rolagemDaAba('instagram')).toBe('propria');
});
