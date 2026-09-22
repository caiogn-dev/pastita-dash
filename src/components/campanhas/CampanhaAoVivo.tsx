/**
 * A campanha grátis enquanto ela acontece.
 *
 * Ela não sai num bloco só: cada cliente recebe no horário em que a janela de
 * 24 h dele ainda está aberta. Sem esta faixa, o dono olha "12 enviadas de 40"
 * às 11h e acha que a campanha travou.
 */
import React, { useEffect, useState } from 'react';
import { campaignsService } from '../../services/campaigns';
import { LinhaDoDia } from './LinhaDoDia';

interface Props {
  campanhaId: string;
  horarioDaCampanha?: string | null;
}

interface Estado {
  faixas: { hora: number; enviadas: number; aguardando: number }[];
  proxima_faixa: number | null;
  fora_da_janela: number;
}

export const CampanhaAoVivo: React.FC<Props> = ({ campanhaId, horarioDaCampanha }) => {
  const [dados, setDados] = useState<Estado | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    campaignsService.getFaixasDaCampanha(campanhaId)
      .then((r) => { if (vivo) { setDados(r); setErro(false); } })
      // Falha de carga não pode virar "nada saiu": o dono pausaria uma
      // campanha saudável.
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [campanhaId]);

  if (erro) {
    return <p role="alert" className="text-caption text-fg-muted-token">Não foi possível carregar o andamento agora.</p>;
  }
  if (!dados || !dados.faixas.length) return null;

  return (
    <div className="mt-3 superficie p-4">
      <LinhaDoDia aoVivo faixas={dados.faixas} horarioDaCampanha={horarioDaCampanha} />
      <p className="mt-2 text-caption text-fg-muted-token">
        {dados.proxima_faixa !== null
          ? `Próxima leva às ${dados.proxima_faixa}h.`
          : 'Todas as levas do dia já saíram.'}
        {dados.fora_da_janela > 0 && ` ${dados.fora_da_janela} ficam de fora hoje: faz mais de 24 h que não falam com a loja.`}
      </p>
    </div>
  );
};

export default CampanhaAoVivo;
