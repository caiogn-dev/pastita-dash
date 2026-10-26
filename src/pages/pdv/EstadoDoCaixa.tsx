/**
 * Se o caixa está aberto, no cabeçalho do PDV (26/10).
 *
 * Venda em dinheiro com o caixa fechado não entra no "esperado" de fechamento
 * nenhum, e o operador só descobria na hora de contar. 404 do servidor =
 * nenhum caixa aberto; outra falha não vira "fechado" (seria um alarme falso).
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentCashSession } from '../../services/cash';

type Estado = 'aberto' | 'fechado' | null;

export const EstadoDoCaixa: React.FC<{ loja: string }> = ({ loja }) => {
  const [estado, setEstado] = useState<Estado>(null);

  useEffect(() => {
    let vivo = true;
    getCurrentCashSession(loja)
      .then(() => { if (vivo) setEstado('aberto'); })
      .catch((e: { response?: { status?: number } }) => {
        if (vivo && e?.response?.status === 404) setEstado('fechado');
      });
    return () => { vivo = false; };
  }, [loja]);

  if (estado === 'aberto') return <span>· Caixa aberto</span>;
  if (estado === 'fechado') {
    return (
      <span className="inline-flex items-center gap-2 font-medium text-[var(--warning)]">
        · Caixa fechado
        <Link to={`/stores/${loja}/cash`} className="text-brand underline">Abrir caixa</Link>
      </span>
    );
  }
  return null;
};
