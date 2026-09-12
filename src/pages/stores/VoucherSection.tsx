import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCardIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { Card, Button, Input } from '../../components/ui';
import { paymentsService, type DadosDoGateway } from '../../services/payments';
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
  is_sandbox?: boolean;
  /** O segredo nunca volta. Este booleano é como a tela sabe que ele existe. */
  tem_credencial?: boolean;
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
  // O segredo NUNCA volta do backend — e está certo. Mas um campo em branco faz
  // o lojista achar que a configuração se perdeu. Guardamos só o ESTADO dele.
  const [jaTemSegredo, setJaTemSegredo] = useState(false);
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
      setJaTemSegredo(Boolean(pagarme.tem_credencial));
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
      // 🚨 `is_sandbox` só entra quando o segredo foi REDIGITADO.
      //
      // Antes ele era recalculado sempre a partir do campo — que nasce vazio,
      // porque o segredo não volta do backend. Resultado: quem abria a tela só
      // para marcar uma bandeira e salvava convertia uma conta de TESTE em
      // conta de PRODUÇÃO sem pedir nada a ninguém.
      //
      // Mesma lógica do backend, que descarta segredo em branco: campo vazio
      // significa "não mexi nisso", não "apague".
      const corpo: DadosDoGateway = {
        store: storeId,
        name: 'Pagar.me (vale)',
        gateway_type: 'pagarme',
        public_key: publica,
        is_enabled: aceitaVale,
        configuration: { voucher_brands: ordenadas },
      };
      if (secreta) {
        corpo.api_key = secreta;
        corpo.is_sandbox = ehTeste(secreta);
      }
      if (gatewayId) {
        await paymentsService.updateGateway(gatewayId, corpo);
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

      {/* O credenciamento e o passo que ninguem lembra e que quebra tudo: as
          chaves passam na validacao, o vale aparece no cardapio, e so o
          cliente descobre que nao funciona — ja com o cartao digitado. Nao da
          para verificar isso por API, entao avisamos ANTES de configurar. */}
      <div
        role="note"
        className="rounded-lg border border-warning-300 bg-warning-50 p-3 text-sm text-fg-token dark:border-warning-700 dark:bg-warning-900/25"
      >
        <strong className="block font-medium">
          Antes de ligar: sua conta precisa estar habilitada em cada bandeira.
        </strong>
        <span className="text-fg-muted-token">
          O credenciamento para venda pela internet é pedido a cada operadora
          (VR, Pluxee, Ticket), com o CNPJ da loja. Sem ele, o vale aparece no
          cardápio normalmente e a cobrança é recusada na hora do pagamento —
          com o cliente já tendo digitado o cartão.
        </span>
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
          placeholder={jaTemSegredo ? 'Deixe em branco para manter a atual' : undefined}
          value={secreta}
          onChange={(e) => setSecreta(e.target.value)}
        />
        {jaTemSegredo && !secreta && (
          <p role="status" className="-mt-2 text-sm text-fg-muted-token">
            Chave secreta já configurada. Ela não aparece aqui por segurança —
            preencha só se for trocar a conta.
          </p>
        )}

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
