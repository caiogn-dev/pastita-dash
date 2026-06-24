import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ordersService } from '../../services/orders';
import { TIME_SLOTS } from '../../utils/schedulingSlots';
import type { Order } from '../../types';

interface Props {
  order: Order;
  onClose: () => void;
  onSaved: () => void;
}

export function EditOrderDrawer({ order, onClose, onSaved }: Props) {
  const [name, setName] = useState(order.customer_name ?? '');
  const [phone, setPhone] = useState(order.customer_phone ?? '');
  const [notes, setNotes] = useState(order.customer_notes ?? '');
  const [enableScheduling, setEnableScheduling] = useState(Boolean(order.scheduled_date));
  const [scheduledDate, setScheduledDate] = useState(order.scheduled_date ?? '');
  const [scheduledTime, setScheduledTime] = useState(order.scheduled_time ?? '');
  const [saving, setSaving] = useState(false);

  const buildPatch = (): Record<string, unknown> => {
    const patch: Record<string, unknown> = {};
    if (name !== (order.customer_name ?? '')) patch.customer_name = name;
    if (phone !== (order.customer_phone ?? '')) patch.customer_phone = phone;
    if (notes !== (order.customer_notes ?? '')) patch.customer_notes = notes;
    if (enableScheduling) {
      if (scheduledDate !== (order.scheduled_date ?? '')) patch.scheduled_date = scheduledDate;
      if (scheduledTime !== (order.scheduled_time ?? '')) patch.scheduled_time = scheduledTime;
    } else if (order.scheduled_date) {
      patch.scheduled_date = null;
      patch.scheduled_time = '';
    }
    return patch;
  };

  const handleSave = async () => {
    if (saving) return;
    const patch = buildPatch();
    if (Object.keys(patch).length === 0) { onClose(); return; }
    setSaving(true);
    try {
      await ordersService.updateOrder(order.id, patch);
      toast.success('Pedido atualizado');
      onSaved();
    } catch {
      toast.error('Erro ao salvar pedido');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-border-token bg-surface text-sm text-fg-token focus:outline-none focus:border-brand';

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-[9999] w-full max-w-lg bg-surface border-l border-border-token shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-token">
          <p className="font-bold text-fg-token">Editar pedido</p>
          <button
            onClick={onClose}
            className="p-2 rounded text-fg-muted-token hover:text-fg-token hover:bg-surface-2"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label
              htmlFor="edit-name"
              className="block text-xs font-bold text-fg-muted-token uppercase tracking-widest mb-2"
            >
              Nome do cliente
            </label>
            <input
              id="edit-name"
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="edit-phone"
              className="block text-xs font-bold text-fg-muted-token uppercase tracking-widest mb-2"
            >
              Telefone
            </label>
            <input
              id="edit-phone"
              className={inputCls}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="edit-notes"
              className="block text-xs font-bold text-fg-muted-token uppercase tracking-widest mb-2"
            >
              Observações
            </label>
            <textarea
              id="edit-notes"
              className={inputCls}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Scheduling */}
          <div className="rounded-xl border border-border-token p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableScheduling}
                onChange={(e) => setEnableScheduling(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-semibold text-fg-token">Agendado</span>
            </label>
            {enableScheduling && (
              <>
                <input
                  type="date"
                  className={inputCls}
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
                <div className="flex flex-wrap gap-1.5">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setScheduledTime(slot)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        scheduledTime === slot
                          ? 'bg-brand border-brand text-white'
                          : 'border-border-token text-fg-token hover:bg-surface-2'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-token flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-border-token text-sm font-semibold text-fg-token hover:bg-surface-2"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </>
  );
}
