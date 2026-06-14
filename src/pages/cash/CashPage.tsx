import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BanknotesIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, Button } from '../../components/ui';
import { Loading } from '../../components/common';
import {
  CashSession,
  getCurrentCashSession,
  openCashSession,
  addCashMovement,
  closeCashSession,
} from '../../services/cash';

const fmtMoney = (v: string | number | null | undefined) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CashPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const [session, setSession] = useState<CashSession | null>(null);
  const [closedResult, setClosedResult] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [openingAmount, setOpeningAmount] = useState('');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [countedAmount, setCountedAmount] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  const loadSession = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const res = await getCurrentCashSession(storeId);
      setSession(res.data);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { loadSession(); }, [loadSession]);

  const handleOpen = async () => {
    if (!storeId || busy) return;
    setBusy(true);
    try {
      const res = await openCashSession(storeId, openingAmount || '0');
      setSession(res.data);
      setClosedResult(null);
      setOpeningAmount('');
      toast.success('Caixa aberto!');
    } catch {
      toast.error('Erro ao abrir o caixa');
    } finally {
      setBusy(false);
    }
  };

  const handleMovement = async (kind: 'sangria' | 'reforco') => {
    if (!storeId || busy || !movementAmount) return;
    setBusy(true);
    try {
      await addCashMovement(storeId, { kind, amount: movementAmount, reason: movementReason });
      toast.success(kind === 'sangria' ? 'Sangria registrada' : 'Reforço registrado');
      setMovementAmount('');
      setMovementReason('');
      loadSession();
    } catch {
      toast.error('Erro ao registrar movimento');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    if (!storeId || busy || !countedAmount) return;
    setBusy(true);
    try {
      const res = await closeCashSession(storeId, countedAmount, closeNotes);
      setClosedResult(res.data);
      setSession(null);
      setCountedAmount('');
      setCloseNotes('');
      toast.success('Caixa fechado!');
    } catch {
      toast.error('Erro ao fechar o caixa');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-6"><Loading /></div>;

  return (
    <div className="p-6 flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-fg-token flex items-center gap-2">
          <BanknotesIcon className="w-7 h-7" />
          Caixa
        </h1>
        <p className="text-sm text-fg-muted-token mt-0.5">
          Abertura, sangria/reforço e fechamento com conferência.
        </p>
      </div>

      {/* Resultado do último fechamento */}
      {closedResult && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-fg-token mb-3">Fechamento concluído</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-fg-muted-token">Esperado</p>
              <p className="font-bold text-fg-token">{fmtMoney(closedResult.expected_amount)}</p>
            </div>
            <div>
              <p className="text-fg-muted-token">Contado</p>
              <p className="font-bold text-fg-token">{fmtMoney(closedResult.counted_amount)}</p>
            </div>
            <div>
              <p className="text-fg-muted-token">Diferença</p>
              <p className={`font-bold ${Number(closedResult.difference) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {fmtMoney(closedResult.difference)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {!session ? (
        /* Caixa fechado → abertura */
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-fg-token mb-4">Abrir caixa</h2>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="opening-amount" className="block text-sm font-medium text-fg-token mb-1">
                Fundo de troco (R$)
              </label>
              <input
                id="opening-amount"
                type="number"
                min="0"
                step="0.01"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="Ex.: 100.00"
                className="w-full text-sm border border-border-token rounded px-3 py-2 bg-surface text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <Button variant="primary" onClick={handleOpen} disabled={busy}>Abrir caixa</Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Status do caixa aberto */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-fg-muted-token">
                  {session.opened_at && !Number.isNaN(new Date(session.opened_at).getTime())
                    ? `Aberto em ${format(new Date(session.opened_at), "dd/MM 'às' HH:mm", { locale: ptBR })} · `
                    : ''}
                  fundo {fmtMoney(session.opening_amount)}
                </p>
                <p className="text-2xl font-bold text-fg-token mt-1">
                  Esperado em caixa: {fmtMoney(session.expected_cash)}
                </p>
                <p className="text-xs text-fg-muted-token mt-0.5">
                  Fundo + reforços − sangrias (vendas em dinheiro: confira no relatório de pedidos)
                </p>
              </div>
            </div>
          </Card>

          {/* Movimentos */}
          <Card className="p-4">
            <h2 className="text-lg font-semibold text-fg-token mb-4">Sangria / Reforço</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="movement-amount" className="block text-sm font-medium text-fg-token mb-1">
                  Valor do movimento (R$)
                </label>
                <input
                  id="movement-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  className="w-40 text-sm border border-border-token rounded px-3 py-2 bg-surface text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label htmlFor="movement-reason" className="block text-sm font-medium text-fg-token mb-1">
                  Motivo (opcional)
                </label>
                <input
                  id="movement-reason"
                  type="text"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="Ex.: depósito no banco"
                  className="w-full text-sm border border-border-token rounded px-3 py-2 bg-surface text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => handleMovement('sangria')}
                disabled={busy || !movementAmount}
                leftIcon={<ArrowUpTrayIcon className="w-4 h-4" />}
              >
                Sangria
              </Button>
              <Button
                variant="outline"
                onClick={() => handleMovement('reforco')}
                disabled={busy || !movementAmount}
                leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
              >
                Reforço
              </Button>
            </div>

            {session.movements.length > 0 && (
              <table className="w-full text-sm mt-4">
                <tbody>
                  {session.movements.map((mv) => (
                    <tr key={mv.id} className="border-t border-border-token">
                      <td className="py-1.5 capitalize text-fg-token">{mv.kind}</td>
                      <td className={`py-1.5 font-medium ${mv.kind === 'sangria' ? 'text-red-600' : 'text-emerald-600'}`}>
                        {mv.kind === 'sangria' ? '−' : '+'}{fmtMoney(mv.amount)}
                      </td>
                      <td className="py-1.5 text-fg-muted-token">{mv.reason || '—'}</td>
                      <td className="py-1.5 text-fg-muted-token text-right">
                        {format(new Date(mv.created_at), 'HH:mm', { locale: ptBR })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* Fechamento */}
          <Card className="p-4">
            <h2 className="text-lg font-semibold text-fg-token mb-4 flex items-center gap-2">
              <LockClosedIcon className="w-5 h-5" />
              Fechar caixa
            </h2>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="counted-amount" className="block text-sm font-medium text-fg-token mb-1">
                  Valor contado (R$)
                </label>
                <input
                  id="counted-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={countedAmount}
                  onChange={(e) => setCountedAmount(e.target.value)}
                  className="w-40 text-sm border border-border-token rounded px-3 py-2 bg-surface text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label htmlFor="close-notes" className="block text-sm font-medium text-fg-token mb-1">
                  Observações (opcional)
                </label>
                <input
                  id="close-notes"
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full text-sm border border-border-token rounded px-3 py-2 bg-surface text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <Button onClick={handleClose} disabled={busy || !countedAmount} variant="danger">
                Fechar caixa
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default CashPage;
