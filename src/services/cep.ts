/**
 * Busca de endereço por CEP (ViaCEP).
 *
 * Sete campos de endereço eram digitados na mão no cadastro de cliente. O
 * ViaCEP é público, sem chave, e responde em ~200ms: quatro deles deixam de
 * ser digitação e passam a ser conferência.
 *
 * Nunca levanta: CEP errado, ViaCEP fora do ar e rede caída caem todos no
 * mesmo `null`, e quem chama volta a aceitar o preenchimento manual. Um
 * cadastro de cliente não pode parar porque um serviço de terceiro parou.
 */
export interface EnderecoDoCep {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export async function buscarCep(cep: string): Promise<EnderecoDoCep | null> {
  const digits = (cep || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!resposta.ok) return null;
    const dado = await resposta.json();
    // O ViaCEP responde 200 com `{ erro: true }` para CEP inexistente.
    if (!dado || dado.erro) return null;
    return {
      street: dado.logradouro || '',
      neighborhood: dado.bairro || '',
      city: dado.localidade || '',
      state: dado.uf || '',
    };
  } catch {
    return null;
  }
}
