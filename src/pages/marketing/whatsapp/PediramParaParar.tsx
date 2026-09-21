/**
 * Quem pediu para parar de receber campanhas — o número real e a lista.
 *
 * O card somava `messages_opted_out` por campanha e mostrava 0 com 11
 * pessoas fora da lista (os pedidos importados do histórico e os feitos fora
 * de uma campanha não entravam no contador). A fonte é o próprio pedido de
 * saída (`/campaigns/saidas/`). Só leitura: sair foi escolha do cliente.
 */
import React, { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui';
import { campaignsService, type SaidasDaConta, type SaidaDeCampanha } from '../../../services/campaigns';

const ORIGEM: Record<SaidaDeCampanha['origem'], string> = {
  button: 'apertou "Parar promoções"',
  text: 'escreveu pedindo para sair',
  manual: 'marcado pela loja',
};

export const PediramParaParar: React.FC<{ accountId?: string }> = ({ accountId }) => {
  const [dados, setDados] = useState<SaidasDaConta | null>(null);
  const [erro, setErro] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    let vivo = true;
    campaignsService
      .getSaidas(accountId)
      .then((d) => { if (vivo) { setDados(d); setErro(false); } })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [accountId]);

  return (
    <div className="superficie px-5 py-4 flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-[200px]">
        <p className="overline">Pediram para parar</p>
        <p className={`text-2xl font-bold ${dados && dados.total > 0 ? 'text-danger-token' : 'text-fg-token'}`}>
          {erro ? '—' : dados ? dados.total : '…'}
        </p>
        <p className="text-xs text-fg-muted-token mt-0.5">
          Não recebem mais campanha, mas continuam recebendo aviso de pedido.
        </p>
      </div>
      {dados && dados.total > 0 && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold border border-border-token text-fg-token hover:bg-surface-2"
        >
          Ver quem
        </button>
      )}
      <Modal open={aberto} onClose={() => setAberto(false)} title="Quem pediu para parar" size="md">
        <ul className="divide-y divide-border-token">
          {dados?.pessoas.map((p) => (
            <li key={p.telefone} className="py-3">
              <p className="text-sm font-semibold text-fg-token">{p.nome || p.telefone}</p>
              <p className="text-xs text-fg-muted-token">
                {p.nome && `${p.telefone} · `}{ORIGEM[p.origem] ?? p.origem} em{' '}
                {new Date(p.quando).toLocaleDateString('pt-BR')}
              </p>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
};

export default PediramParaParar;
