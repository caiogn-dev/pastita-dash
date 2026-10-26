/**
 * Trilha que a casca (MainLayout) deriva do menu para a rota atual.
 *
 * Contexto em vez de hook direto no PageShell: o chassi é usado em teste e
 * fora da casca, onde montar o menu inteiro (loja, chat, react-query) não
 * faz sentido. Sem provedor, `null` — a página fica sem trilha automática.
 */
import { createContext } from 'react';

export interface EloDaTrilha {
  rotulo: string;
  href?: string;
}

export const TrilhaAutomatica = createContext<EloDaTrilha[] | null>(null);
