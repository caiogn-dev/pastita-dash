/**
 * Cancelar pedido pedindo o motivo — o mesmo modal na lista e no detalhe.
 *
 * 19/09: 0 dos 37 cancelados em 30 dias tinham motivo. O backend sempre
 * soube gravar (`cancel_reason`), mas as duas telas cancelavam com um "tem
 * certeza?" e nada mais. Os motivos prontos são os que acontecem numa
 * operação de delivery; "Outro" pede o texto.
 *
 * Pedido que veio do iFood cancela NO iFood, com um dos motivos que o próprio
 * iFood devolve para aquele pedido (critério de homologação): o modal busca a
 * lista, envia e devolve o controle por `onCancelado`. Quem cancela é o iFood:
 * o pedido só vira cancelado quando chega o evento CAN (CARF = negado).
 */
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button, Modal } from '../common';
import { Input } from '../ui/input';
import { getErrorMessage } from '../../services';
import { ifoodPedidoService, type MotivoDeCancelamentoIfood } from '../../services/ifoodPedido';

export const MOTIVOS_DE_CANCELAMENTO = [
  'Cliente desistiu',
  'Acabou o produto',
  'Pagamento não foi confirmado',
  'Fora da área de entrega',
  'Pedido duplicado',
  'Loja sem condição de atender agora',
] as const;

const OUTRO = 'Outro';

interface Props {
  open: boolean;
  orderNumber: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  /** Necessário para o fluxo do iFood. */
  pedidoId?: string;
  /** `order.source`; `'ifood'` cancela no iFood. */
  origem?: string | null;
  /** Cancelado no iFood (o servidor já gravou o status). */
  onCancelado?: () => void;
}

const opcao = (marcada: boolean) =>
  `flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
    marcada ? 'border-brand bg-brand-soft text-fg-token' : 'border-border-token text-fg-token hover:bg-surface-2'
  }`;


const CancelarNoIfood: React.FC<Omit<Props, 'onConfirm' | 'loading' | 'origem'> & { pedidoId: string }> = ({
  open, orderNumber, onClose, pedidoId, onCancelado,
}) => {
  const [motivos, setMotivos] = useState<MotivoDeCancelamentoIfood[] | null>(null);
  const [codigo, setCodigo] = useState('');
  const [detalhe, setDetalhe] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let vivo = true;
    setMotivos(null);
    setCodigo('');
    setDetalhe('');
    ifoodPedidoService.motivosDeCancelamento(pedidoId)
      .then((m) => { if (vivo) setMotivos(m); })
      .catch((e) => { if (vivo) { setMotivos([]); toast.error(getErrorMessage(e)); } });
    return () => { vivo = false; };
  }, [open, pedidoId]);

  const confirmar = async () => {
    if (!codigo || enviando) return;
    setEnviando(true);
    try {
      await ifoodPedidoService.cancelar(pedidoId, codigo, detalhe.trim() || undefined);
      toast.success('Cancelamento enviado ao iFood');
      onCancelado?.();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Cancelar pedido no iFood">
      <div className="space-y-4">
        <p className="text-fg-muted-token">
          Pedido <strong className="text-fg-token">#{orderNumber}</strong>
        </p>
        {motivos === null ? (
          <p role="status" className="text-sm text-fg-muted-token">Carregando motivos…</p>
        ) : (
          <div role="radiogroup" aria-label="Motivo do cancelamento" className="grid gap-2 sm:grid-cols-2">
            {motivos.map((m) => (
              <label key={m.codigo} className={opcao(codigo === m.codigo)}>
                <input
                  type="radio"
                  name="motivo-cancelamento-ifood"
                  value={m.codigo}
                  checked={codigo === m.codigo}
                  onChange={() => setCodigo(m.codigo)}
                  className="accent-[var(--brand)]"
                />
                {m.descricao}
              </label>
            ))}
          </div>
        )}
        <Input label="Detalhe" type="text" value={detalhe} maxLength={140} onChange={(e) => setDetalhe(e.target.value)} />
        <p className="text-sm text-danger-token">O cancelamento não pode ser desfeito.</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Voltar</Button>
          <Button variant="danger" disabled={!codigo || enviando} isLoading={enviando} onClick={confirmar}>
            Confirmar cancelamento
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export const CancelarPedidoModal: React.FC<Props> = (props) =>
  props.origem === 'ifood' && props.pedidoId
    ? <CancelarNoIfood {...props} pedidoId={props.pedidoId} />
    : <CancelarDaLoja {...props} />;

const CancelarDaLoja: React.FC<Props> = ({ open, orderNumber, loading, onClose, onConfirm }) => {
  const [escolha, setEscolha] = useState('');
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (open) { setEscolha(''); setTexto(''); }
  }, [open]);

  const motivo = escolha === OUTRO ? texto.trim() : escolha;

  return (
    <Modal isOpen={open} onClose={onClose} title="Cancelar pedido">
      <div className="space-y-4">
        <p className="text-fg-muted-token">
          Por que o pedido <strong className="text-fg-token">#{orderNumber}</strong> está sendo cancelado?
        </p>
        <div role="radiogroup" aria-label="Motivo do cancelamento" className="grid gap-2 sm:grid-cols-2">
          {[...MOTIVOS_DE_CANCELAMENTO, OUTRO].map((m) => (
            <label key={m} className={opcao(escolha === m)}>
              <input
                type="radio"
                name="motivo-cancelamento"
                value={m}
                checked={escolha === m}
                onChange={() => setEscolha(m)}
                className="accent-[var(--brand)]"
              />
              {m}
            </label>
          ))}
        </div>
        {escolha === OUTRO && (
          <Input
            label="Qual o motivo?"
            type="text"
            value={texto}
            maxLength={140}
            onChange={(e) => setTexto(e.target.value)}
            autoFocus
          />
        )}
        <p className="text-sm text-danger-token">O cancelamento não pode ser desfeito.</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Voltar</Button>
          <Button variant="danger" disabled={!motivo} isLoading={loading} onClick={() => onConfirm(motivo)}>
            Confirmar cancelamento
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelarPedidoModal;
