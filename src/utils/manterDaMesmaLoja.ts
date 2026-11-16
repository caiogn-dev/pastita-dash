import type { Query } from '@tanstack/react-query';

/**
 * `placeholderData` para listas paginadas: mantém a tabela anterior ao trocar
 * de página/filtro (sem piscar), mas SÓ dentro da mesma loja.
 *
 * `keepPreviousData` puro empresta o resultado da chave anterior sem olhar de
 * quem ele é: ao trocar de loja, o lojista via os clientes/pedidos da loja A
 * sob o nome da loja B até a resposta chegar — e podia agir sobre eles.
 *
 * @param lojaAtual   loja da consulta que está carregando
 * @param lojaDaChave extrai a loja da chave da consulta anterior
 */
export function manterDaMesmaLoja<T>(
  lojaAtual: unknown,
  lojaDaChave: (chave: readonly unknown[]) => unknown,
) {
  return (anterior: T | undefined, consultaAnterior?: Query<T, Error, T>) =>
    consultaAnterior && lojaDaChave(consultaAnterior.queryKey) === lojaAtual
      ? anterior
      : undefined;
}
