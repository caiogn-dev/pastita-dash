/**
 * O painel é um app de página única: a versão nova só entra quando a pessoa
 * recarrega. O dono publicou, abriu a mesma aba e "não apareceu". Este hook
 * compara, a cada minuto, o bundle do index.html com o que está rodando e
 * avisa quando mudou.
 */
import { useEffect, useState } from 'react';

export const hashDoBundle = (html: string): string | null => {
  const m = html.match(/assets\/index-([A-Za-z0-9_-]+)\.js/);
  return m ? m[1] : null;
};

export const hashRodando = (): string | null => {
  const script = Array.from(document.scripts).find((s) => /assets\/index-[A-Za-z0-9_-]+\.js/.test(s.src));
  return script ? hashDoBundle(script.src) : null;
};

export const useNovaVersao = (intervaloMs = 60_000): boolean => {
  const [temNova, setTemNova] = useState(false);
  useEffect(() => {
    const atual = hashRodando();
    if (!atual) return undefined;
    let vivo = true;
    const checar = async () => {
      try {
        const r = await fetch(`/index.html?v=${Date.now()}`, { cache: 'no-store' });
        const novo = hashDoBundle(await r.text());
        if (vivo && novo && novo !== atual) setTemNova(true);
      } catch { /* sem rede: tenta no próximo ciclo */ }
    };
    const t = setInterval(checar, intervaloMs);
    const aoVoltar = () => { if (document.visibilityState === 'visible') checar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => { vivo = false; clearInterval(t); document.removeEventListener('visibilitychange', aoVoltar); };
  }, [intervaloMs]);
  return temNova;
};
