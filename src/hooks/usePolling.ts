/**
 * Atualização periódica que respeita a aba. Três telas (expedição, impressão,
 * fila humana) repetiam `setInterval(carregar, N)` e seguiam batendo na API com
 * a aba escondida — o lojista deixa o painel aberto o dia inteiro, então eram
 * milhares de chamadas que ninguém via. Aqui o relógio só vale com a aba
 * visível; ao voltar, atualiza na hora se passou do intervalo.
 *
 * Não faz a busca inicial: quem usa continua chamando a função uma vez no mount.
 */
import { useEffect, useRef } from 'react';

export const usePolling = (tarefa: () => unknown, intervaloMs: number): void => {
  const ref = useRef(tarefa);
  ref.current = tarefa;

  useEffect(() => {
    let ultimo = Date.now();
    const rodar = () => {
      ultimo = Date.now();
      void ref.current();
    };
    const visivel = () => document.visibilityState !== 'hidden';
    const t = setInterval(() => { if (visivel()) rodar(); }, intervaloMs);
    const aoVoltar = () => {
      if (visivel() && Date.now() - ultimo >= intervaloMs) rodar();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [intervaloMs]);
};
