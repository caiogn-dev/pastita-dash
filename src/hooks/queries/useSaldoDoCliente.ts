/**
 * O saldo de cashback de um cliente, para a ficha dele.
 *
 * O dono pediu o cashback na ficha (04/09): a informação existia só na tela de
 * Fidelidade, e para saber quanto uma pessoa tem ele precisava sair da ficha,
 * abrir outra página e procurar o telefone dela na lista.
 *
 * Usa o endpoint do PAINEL com filtro por telefone, não o público: o público
 * esconde a parte comprada de quem não comprovou o número — regra certa para a
 * cliente, errada para o dono, que precisa ver o que ela tem.
 */
import { useQuery } from '@tanstack/react-query';

import { cashbackService } from '../../services/cashback';

export function useSaldoDoCliente(
  storeSlug: string | undefined | null,
  phone: string | undefined | null,
) {
  return useQuery({
    queryKey: ['cashback', storeSlug, 'cliente', phone],
    queryFn: () => cashbackService.saldoDoCliente(storeSlug as string, phone as string),
    enabled: !!storeSlug && !!phone,
    // Saldo não muda enquanto a ficha está aberta; refazer a cada foco só
    // gasta requisição numa tela que o dono abre e fecha o tempo todo.
    staleTime: 60_000,
  });
}
