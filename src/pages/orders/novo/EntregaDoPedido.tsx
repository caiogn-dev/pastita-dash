/**
 * Onde e quando: entrega ou retirada, endereço com o frete ao lado, e horário
 * (agora ou agendado). Cabe numa faixa do topo — no assistente do celular isso
 * era um passo inteiro de campos empilhados.
 */
import React from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { Button, Input, Segmentado } from '../../../components/ui';
import { SeletorDeFaixa } from '../../../components/orders/agendamento/SeletorDeFaixa';
import { cn } from '../../../utils/cn';
import { formatCurrency } from '../../../utils/formatters';
import { rotuloDoEndereco } from '../../../components/orders/newOrder/enderecoDoPedido';
import type { NewOrderWizard } from '../../../components/orders/newOrder/useNewOrderWizard';

export function EntregaDoPedido({ wiz }: { wiz: NewOrderWizard }) {
  const enderecos = wiz.customer?.addresses ?? [];
  const entrega = wiz.deliveryMethod === 'delivery';

  const calcular = () => {
    const texto = wiz.freeAddressText.trim();
    if (texto && !wiz.calculatingRoute) void wiz.handleCalculateRoute(texto);
  };

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
      <div className="min-w-0 space-y-3">
        <Segmentado
          rotulo="Entrega ou retirada"
          valor={wiz.deliveryMethod}
          onChange={wiz.setDeliveryMethod}
          opcoes={[{ valor: 'delivery', rotulo: 'Entrega' }, { valor: 'pickup', rotulo: 'Retirada' }]}
        />

        {entrega && (
          <>
            {enderecos.length > 0 && (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Endereços do cliente">
                {enderecos.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    aria-pressed={wiz.selectedAddress?.id === e.id}
                    onClick={() => {
                      wiz.escolherEnderecoSalvo(e);
                      const coords = e.lat != null && e.lng != null ? { lat: e.lat, lng: e.lng } : null;
                      void wiz.handleCalculateRoute(rotuloDoEndereco(e), coords);
                    }}
                    className={cn(
                      'max-w-full truncate rounded-full border px-3 py-1 text-xs transition-colors',
                      wiz.selectedAddress?.id === e.id
                        ? 'border-brand bg-brand-soft font-semibold text-brand-ink'
                        : 'border-border-token text-fg-token hover:bg-surface-2',
                    )}
                  >
                    {e.label ? `${e.label} · ` : ''}{rotuloDoEndereco(e)}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <Input
                className="flex-1"
                label="Endereço"
                placeholder="Rua, número, bairro — ou o link do Maps"
                value={wiz.freeAddressText}
                onChange={(e) => wiz.setFreeAddressText(e.target.value)}
                onBlur={() => { if (!wiz.routeQuote) calcular(); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); calcular(); } }}
              />
              {wiz.customerHasPhone && (
                <Button
                  variant="outline"
                  aria-label="Usar localização enviada no WhatsApp"
                  title="Localização enviada no WhatsApp"
                  disabled={wiz.calculatingRoute}
                  onClick={() => void wiz.handleUseSharedLocation()}
                >
                  <MapPinIcon className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                disabled={!wiz.freeAddressText.trim() || wiz.calculatingRoute}
                isLoading={wiz.calculatingRoute}
                onClick={calcular}
              >
                Calcular frete
              </Button>
            </div>

            <p className="text-sm" data-testid="frete-do-pedido">
              {wiz.routeQuote ? (
                <span className="text-fg-token">
                  Frete <strong className="tabular-nums">{formatCurrency(wiz.routeQuote.fee)}</strong>
                  {wiz.routeQuote.distance_km != null && (
                    <span className="text-fg-muted-token"> · {Number(wiz.routeQuote.distance_km).toFixed(1)} km</span>
                  )}
                </span>
              ) : (
                <span className="text-fg-muted-token">Frete ainda não calculado</span>
              )}
            </p>
          </>
        )}
      </div>

      <div className="min-w-0 space-y-3">
        <Segmentado
          rotulo="Quando"
          valor={wiz.enableScheduling ? 'agendar' : 'agora'}
          onChange={(v) => wiz.setEnableScheduling(v === 'agendar')}
          opcoes={[{ valor: 'agora', rotulo: 'Agora' }, { valor: 'agendar', rotulo: 'Agendar' }]}
        />
        {wiz.enableScheduling && (
          <SeletorDeFaixa
            storeSlug={wiz.storeSlug}
            data={wiz.scheduledDate}
            onData={wiz.setScheduledDate}
            faixa={wiz.scheduledTime}
            onFaixa={wiz.setScheduledTime}
          />
        )}
      </div>
    </div>
  );
}
