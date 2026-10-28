/**
 * Onde e quando: entrega ou retirada, endereço com o frete, e horário (agora
 * ou agendado). Uma coluna, três seções com o mesmo título e o mesmo respiro —
 * a versão em duas colunas desalinhava e deixava buracos (dono, 28/10).
 */
import React from 'react';
import { BuildingStorefrontIcon, MapPinIcon, TruckIcon } from '@heroicons/react/24/outline';
import { Button, Input, Segmentado } from '../../../components/ui';
import { SeletorDeFaixa } from '../../../components/orders/agendamento/SeletorDeFaixa';
import { cn } from '../../../utils/cn';
import { formatCurrency } from '../../../utils/formatters';
import { rotuloDoEndereco } from '../../../components/orders/newOrder/enderecoDoPedido';
import type { NewOrderWizard } from '../../../components/orders/newOrder/useNewOrderWizard';

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section aria-label={titulo} className="space-y-3">
      <h3 className="text-sm font-medium text-fg-token">{titulo}</h3>
      {children}
    </section>
  );
}

export function EntregaDoPedido({ wiz }: { wiz: NewOrderWizard }) {
  const enderecos = wiz.customer?.addresses ?? [];
  const entrega = wiz.deliveryMethod === 'delivery';

  const calcular = () => {
    const texto = wiz.freeAddressText.trim();
    if (texto && !wiz.calculatingRoute) void wiz.handleCalculateRoute(texto);
  };

  return (
    <div className="space-y-6">
      <Segmentado
        rotulo="Entrega ou retirada"
        valor={wiz.deliveryMethod}
        onChange={wiz.setDeliveryMethod}
        className="max-w-md"
        opcoes={[
          { valor: 'delivery', rotulo: 'Entrega', icone: <TruckIcon className="h-4 w-4" /> },
          { valor: 'pickup', rotulo: 'Retirada', icone: <BuildingStorefrontIcon className="h-4 w-4" /> },
        ]}
      />

      {entrega && (
        <Secao titulo="Endereço">
          {enderecos.length > 0 && (
            <div className="grid gap-2 md:grid-cols-2" role="group" aria-label="Endereços do cliente">
              {enderecos.map((e) => {
                const escolhido = wiz.selectedAddress?.id === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    aria-pressed={escolhido}
                    onClick={() => {
                      wiz.escolherEnderecoSalvo(e);
                      const coords = e.lat != null && e.lng != null ? { lat: e.lat, lng: e.lng } : null;
                      void wiz.handleCalculateRoute(rotuloDoEndereco(e), coords);
                    }}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                      escolhido ? 'border-brand bg-brand-soft' : 'border-border-token bg-surface hover:border-brand',
                    )}
                  >
                    <MapPinIcon className={cn('mt-0.5 h-4 w-4 shrink-0', escolhido ? 'text-brand-ink' : 'text-fg-muted-token')} />
                    <span className="min-w-0">
                      {e.label && <span className="block text-sm font-semibold text-fg-token">{e.label}</span>}
                      <span className="line-clamp-2 text-sm text-fg-muted-token">{rotuloDoEndereco(e)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input
                label={enderecos.length > 0 ? 'Outro endereço' : 'Endereço de entrega'}
                placeholder="Rua, número, bairro — ou o link do Maps"
                value={wiz.freeAddressText}
                onChange={(e) => wiz.setFreeAddressText(e.target.value)}
                onBlur={() => { if (!wiz.routeQuote) calcular(); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); calcular(); } }}
              />
            </div>
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

          <div
            data-testid="frete-do-pedido"
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm',
              wiz.routeQuote ? 'bg-success-soft' : 'bg-surface-2',
            )}
          >
            <span className={wiz.routeQuote ? 'font-medium text-fg-token' : 'text-fg-muted-token'}>
              {wiz.routeQuote ? 'Frete' : 'Frete ainda não calculado'}
              {wiz.routeQuote?.distance_km != null && (
                <span className="font-normal text-fg-muted-token"> · {Number(wiz.routeQuote.distance_km).toFixed(1)} km</span>
              )}
            </span>
            {wiz.routeQuote && (
              <strong className="text-base tabular-nums text-fg-token">{formatCurrency(wiz.routeQuote.fee)}</strong>
            )}
          </div>
        </Secao>
      )}

      <Secao titulo="Quando">
        <Segmentado
          rotulo="Quando"
          valor={wiz.enableScheduling ? 'agendar' : 'agora'}
          onChange={(v) => wiz.setEnableScheduling(v === 'agendar')}
          className="max-w-md"
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
      </Secao>
    </div>
  );
}
