import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCardIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { Card, Button, Input } from '../../components/ui';
import { paymentsService } from '../../services/payments';
import logger from '../../services/logger';

interface Bandeira {
  value: string;
  label: string;
}

interface GatewayDeVale {
  id: string;
  gateway_type: string;
  /** Ausente em linha antiga; `!== false` trata isso como ligado. */
  is_enabled?: boolean;
  public_key?: string;
  configuration?: { voucher_brands?: string[] };
}

// NAO existe lista de bandeiras neste arquivo. Ela vem de
// `paymentsService.getVoucherBrands()`, que lê o catálogo do backend. Repetir
// os valores aqui criaria a terceira cópia da mesma verdade — e quando a
// Alelo voltar, ou entrar uma bandeira nova, seriam três deploys em vez de um.
const ehTeste = (chave: string) => chave.includes('_test_');

interface VoucherSectionProps {
  storeId: string;
}

/**
 * Onde a loja diz em qual conta do Pagar.me cai o dinheiro dos pedidos pagos
 * com vale-refeição/vale-alimentação, e quais bandeiras aceita.
 *
 * As duas chaves (secreta e pública) têm campo desde o início — do lado do
 * Mercado Pago a pública nunca entrou no painel manual, e isso já quebrou o
 * cartão em produção (token de uma conta, cobrança tentada em outra).
 */
export const VoucherSection: React.FC<VoucherSectionProps> = ({ storeId }) => {
  const [gatewayId, setGatewayId] = useState<string | null>(null);
  const [secreta, setSecreta] = useState('');
  const [publica, setPublica] = useState('');
  const [catalogo, setCatalogo] = useState<Bandeira[]>([]);
  const [marcadas, setMarcadas] = useState<string[]>([]);
  // Liga/desliga o recebimento por vale SEM perder a configuracao. O lojista
  // que para de aceitar hoje precisa poder voltar amanha sem recadastrar.
  const [aceitaVale, setAceitaVale] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // O catálogo é a fonte única; o painel só desenha o que o backend conhece.
  useEffect(() => {
    let vivo = true;
    paymentsService.getVoucherBrands()
      .then((r) => { if (vivo) setCatalogo(r?.brands || []); })
      .catch((erroCatalogo) => {
        logger.error('Erro ao carregar catálogo de bandeiras de vale:', erroCatalogo);
      });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!storeId) return;
    let vivo = true;
    paymentsService.getGateways({ store: storeId }).then((pagina) => {
      if (!vivo) return;
      const linhas = (pagina?.results ?? []) as unknown as GatewayDeVale[];
      const pagarme = linhas.find((g) => g.gateway_type === 'pagarme');
      if (!pagarme) return;
      setGatewayId(pagarme.id);
      setPublica(pagarme.public_key || '');
      setMarcadas(pagarme.configuration?.voucher_brands || []);
      setAceitaVale(pagarme.is_enabled !== false);
    }).catch((erroGateway) => {
      // lista vazia é estado válido: loja ainda não configurou vale
      logger.error('Erro ao carregar gateway de vale da loja:', erroGateway);
    });
    return () => { vivo = false; };
  }, [storeId]);

  // Chave de teste com chave de produção tokeniza numa conta e cobra na
  // outra: o pagamento falha de um jeito que não dá para diagnosticar de fora.
  const ambientesDivergem = useMemo(
    () => Boolean(secreta && publica && ehTeste(secreta) !== ehTeste(publica)),
    [secreta, publica],
  );

  const alternar = useCallback((valor: string) => {
    setMarcadas((atuais) =>
      (atuais.includes(valor) ? atuais.filter((x) => x !== valor) : [...atuais, valor]));
  }, []);

  const salvar = useCallback(async () => {
    setErro('');
    // Desligando, a bandeira nao importa — a exigencia existe para nao ligar o
    // vale no cardapio sem nada para o cliente escolher.
    if (aceitaVale && marcadas.length === 0) {
      setErro('Marque ao menos uma bandeira para começar a receber com vale.');
      return;
    }
    // Ordem do catálogo do backend, não a ordem de clique do lojista.
    const ordenadas = catalogo
      .map((b) => b.value)
      .filter((v) => marcadas.includes(v));

    setSalvando(true);
    try {
      const corpo = {
        store: storeId,
        name: 'Pagar.me (vale)',
        gateway_type: 'pagarme',
        api_key: secreta,
        public_key: publica,
        is_enabled: aceitaVale,
        is_sandbox: ehTeste(secreta),
        configuration: { voucher_brands: ordenadas },
      };
      if (gatewayId) {
        await paymentsService.updateGateway(gatewayId, corpo as never);
      } else {
        const criado = await paymentsService.createGateway(corpo);
        setGatewayId(criado.id);
      }
    } catch (erroSalvar) {
      logger.error('Erro ao salvar gateway de vale:', erroSalvar);
      setErro('Não consegui salvar. Confira as chaves e tente de novo.');
    } finally {
      setSalvando(false);
    }
  }, [aceitaVale, catalogo, gatewayId, marcadas, publica, secreta, storeId]);

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <CreditCardIcon className="w-6 h-6 text-fg-muted-token shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg font-medium text-fg-token">
            Vale-refeição e vale-alimentação
          </h3>
          <p className="text-sm text-fg-muted-token">
            Em qual conta do Pagar.me cai o dinheiro dos pedidos pagos com vale
            nesta loja. As bandeiras marcadas aqui são as que aparecem no
            cardápio.
          </p>
        </div>
      </div>

      <label
        htmlFor="pagarme-vale-aceita"
        className="flex items-center gap-2 py-1 text-sm text-fg-token"
      >
        <input
          id="pagarme-vale-aceita"
          type="checkbox"
          className="h-4 w-4 accent-[var(--color-brand)]"
          checked={aceitaVale}
          onChange={() => setAceitaVale((v) => !v)}
        />
        <span>Aceitar vale nesta loja</span>
      </label>
      {!aceitaVale && (
        <p role="status" className="text-sm text-fg-muted-token">
          O vale deixa de aparecer no cardápio. As chaves e as bandeiras ficam
          guardadas — é só marcar de novo para voltar a aceitar.
        </p>
      )}

      <div className="space-y-4">
        <Input
          id="pagarme-vale-sk"
          label="Chave secreta"
          type="password"
          autoComplete="off"
          value={secreta}
          onChange={(e) => setSecreta(e.target.value)}
        />

        <Input
          id="pagarme-vale-pk"
          label="Chave pública"
          value={publica}
          onChange={(e) => setPublica(e.target.value)}
        />

        {ambientesDivergem && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded bg-amber-50 dark:bg-amber-900/20">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              As duas chaves parecem ser de ambientes diferentes (uma de teste e
              outra de produção). Assim o cartão é lido numa conta e a
              cobrança tentada em outra, e o pagamento falha.
            </p>
          </div>
        )}

        <fieldset>
          <legend className="text-sm font-medium text-fg-token mb-2">
            Bandeiras aceitas
          </legend>
          <div className="space-y-2">
            {catalogo.map(({ value, label }) => (
              <label
                key={value}
                htmlFor={`bandeira-vale-${value}`}
                className="flex items-center gap-2 text-sm text-fg-token"
              >
                <input
                  id={`bandeira-vale-${value}`}
                  type="checkbox"
                  checked={marcadas.includes(value)}
                  onChange={() => alternar(value)}
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {erro && (
          <p role="alert" className="text-sm text-danger-500">
            {erro}
          </p>
        )}

        <Button onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </Card>
  );
};

export default VoucherSection;
