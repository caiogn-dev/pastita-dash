/**
 * Contagem regressiva até um instante (prazo de resposta do iFood).
 * "m:ss" abaixo de uma hora, "h:mm:ss" acima; passado o prazo, "0:00".
 */
import React, { useEffect, useState } from 'react';

interface Props {
  /** ISO 8601. */
  ate: string;
  /** Nome acessível do timer. */
  rotulo?: string;
  className?: string;
}

export const ContagemRegressiva: React.FC<Props> = ({ ate, rotulo = 'Tempo para responder', className }) => {
  const alvo = new Date(ate).getTime();
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const resto = Number.isNaN(alvo) ? 0 : Math.max(0, Math.floor((alvo - agora) / 1000));
  const h = Math.floor(resto / 3600);
  const m = Math.floor((resto % 3600) / 60);
  const s = String(resto % 60).padStart(2, '0');
  const texto = h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;

  return (
    <span role="timer" aria-label={rotulo} className={className ?? 'font-mono text-lg font-bold tabular-nums'}>
      {texto}
    </span>
  );
};

export default ContagemRegressiva;
