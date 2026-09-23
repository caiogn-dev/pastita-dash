/**
 * Qual tela o cardápio deve mostrar agora.
 *
 * A regra é a mesma de toda lista do painel e mora em `utils/estadoDaLista`.
 * Aqui fica só o nome que esta tela usa — a decisão não se duplica.
 */
import { estadoDaLista, type EstadoDaLista, type EntradaDaLista } from '../../utils/estadoDaLista';

export type EstadoDoCardapio = EstadoDaLista;

export function estadoDoCardapio(entrada: EntradaDaLista): EstadoDoCardapio {
  return estadoDaLista(entrada);
}
