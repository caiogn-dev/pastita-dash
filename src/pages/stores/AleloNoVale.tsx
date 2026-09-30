import React, { useCallback, useEffect, useState } from 'react';

import { Button, Input } from '../../components/ui';
import { paymentsService, type BandeiraDeVale, type DadosDoGateway } from '../../services/payments';
import logger from '../../services/logger';

interface GatewayDaCielo {
  id: string;
  gateway_type: string;
  is_enabled?: boolean;
  is_sandbox?: boolean;
  tem_credencial?: boolean;
  public_key?: string;
  configuration?: { voucher_brands?: string[]; sop_client_id?: string };
}

interface AleloNoValeProps {
  storeId: string;
  /** As bandeiras que o backend diz que a Cielo cobra — hoje, só a Alelo. */
  bandeiras: BandeiraDeVale[];
}

/**
 * A Alelo dentro do mesmo cartão do vale. Ela é cobrada pela Cielo, não pelo
 * Pagar.me, então tem as chaves dela — com os nomes que o site da Cielo usa,
 * para o lojista copiar sem traduzir.
 */
export const AleloNoVale: React.FC<AleloNoValeProps> = ({ storeId, bandeiras }) => {
  const [gatewayId, setGatewayId] = useState<string | null>(null);
  const [jaTemSegredo, setJaTemSegredo] = useState(false);
  const [merchantId, setMerchantId] = useState('');
  const [merchantKey, setMerchantKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [aceita, setAceita] = useState(true);
  const [teste, setTeste] = useState(false);
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    let vivo = true;
    paymentsService.getGateways({ store: storeId }).then((pagina) => {
      if (!vivo) return;
      const linhas = (pagina?.results ?? []) as unknown as GatewayDaCielo[];
      const cielo = linhas.find((g) => g.gateway_type === 'cielo');
      if (!cielo) return;
      setGatewayId(cielo.id);
      setMerchantId(cielo.public_key || '');
      setClientId(cielo.configuration?.sop_client_id || '');
      setAceita(cielo.is_enabled !== false);
      setTeste(Boolean(cielo.is_sandbox));
      setJaTemSegredo(Boolean(cielo.tem_credencial));
    }).catch((erroGateway) => {
      logger.error('Erro ao carregar a conexão da Cielo:', erroGateway);
    });
    return () => { vivo = false; };
  }, [storeId]);

  const salvar = useCallback(async () => {
    setErro('');
    setSalvo(false);
    const faltaSegredo = !jaTemSegredo && (!merchantKey || !clientSecret);
    if (aceita && (!merchantId.trim() || !clientId.trim() || faltaSegredo)) {
      setErro('Preencha as quatro chaves da Cielo para receber com Alelo.');
      return;
    }

    setSalvando(true);
    try {
      const corpo: DadosDoGateway = {
        store: storeId,
        name: 'Cielo (Alelo)',
        gateway_type: 'cielo',
        public_key: merchantId.trim(),
        is_enabled: aceita,
        is_sandbox: teste,
        configuration: {
          voucher_brands: bandeiras.map((b) => b.value),
          sop_client_id: clientId.trim(),
        },
      };
      // Segredo em branco = "não mexi nisso". O backend mantém o que já tem.
      if (merchantKey) corpo.api_key = merchantKey;
      if (clientSecret) corpo.api_secret = clientSecret;

      if (gatewayId) {
        await paymentsService.updateGateway(gatewayId, corpo);
      } else {
        const criado = await paymentsService.createGateway(corpo);
        setGatewayId(criado.id);
      }
      setJaTemSegredo(true);
      setMerchantKey('');
      setClientSecret('');
      setSalvo(true);
    } catch (erroSalvar) {
      logger.error('Erro ao salvar a conexão da Cielo:', erroSalvar);
      setErro('Não consegui salvar. Confira as chaves e tente de novo.');
    } finally {
      setSalvando(false);
    }
  }, [aceita, bandeiras, clientId, clientSecret, gatewayId, jaTemSegredo, merchantId, merchantKey, storeId, teste]);

  const manter = jaTemSegredo ? 'Deixe em branco para manter a atual' : undefined;
  const nomes = bandeiras.map((b) => b.label).join(', ');

  return (
    <section aria-label={nomes} className="mt-6 border-t border-border-token pt-6">
      <h4 className="text-base font-medium text-fg-token">{nomes}</h4>
      <p className="text-sm text-fg-muted-token">Cobrada pela Cielo</p>

      <label htmlFor="cielo-alelo-aceita" className="mt-3 flex items-center gap-2 py-1 text-sm text-fg-token">
        <input
          id="cielo-alelo-aceita"
          type="checkbox"
          className="h-4 w-4 accent-[var(--color-brand)]"
          checked={aceita}
          onChange={() => setAceita((v) => !v)}
        />
        <span>Aceitar {nomes} nesta loja</span>
      </label>

      <div className="mt-2 space-y-4">
        <Input
          id="cielo-merchant-id"
          label="Merchant ID"
          autoComplete="off"
          value={merchantId}
          onChange={(e) => setMerchantId(e.target.value)}
        />
        <Input
          id="cielo-merchant-key"
          label="Merchant Key"
          type="password"
          autoComplete="off"
          placeholder={manter}
          value={merchantKey}
          onChange={(e) => setMerchantKey(e.target.value)}
        />
        <Input
          id="cielo-sop-client-id"
          label="Client ID (Silent Order Post)"
          autoComplete="off"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        />
        <Input
          id="cielo-sop-client-secret"
          label="Client Secret (Silent Order Post)"
          type="password"
          autoComplete="off"
          placeholder={manter}
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
        />

        <label htmlFor="cielo-alelo-teste" className="flex items-center gap-2 text-sm text-fg-token">
          <input
            id="cielo-alelo-teste"
            type="checkbox"
            className="h-4 w-4 accent-[var(--color-brand)]"
            checked={teste}
            onChange={() => setTeste((v) => !v)}
          />
          <span>Conta de teste</span>
        </label>

        {erro && <p role="alert" className="text-sm text-danger-500">{erro}</p>}
        {salvo && <p role="status" className="text-sm text-fg-muted-token">Salvo.</p>}

        <Button onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : `Salvar ${nomes}`}
        </Button>
      </div>
    </section>
  );
};

export default AleloNoVale;
