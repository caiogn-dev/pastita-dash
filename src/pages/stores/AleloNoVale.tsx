import React, { useEffect, useState } from 'react';

import { Button, Input, Recolhivel, SeloDeEstado } from '../../components/ui';
import { paymentsService, type BandeiraDeVale, type DadosDoGateway } from '../../services/payments';
import logger from '../../services/logger';
import { useParteDoSalvar } from './salvarJunto';

interface GatewayDaCielo {
  id: string;
  gateway_type: string;
  is_enabled?: boolean;
  is_sandbox?: boolean;
  tem_credencial?: boolean;
  public_key?: string;
  configuration?: { voucher_brands?: string[]; sop_client_id?: string };
}

// Merchant ID e Client ID são GUIDs. Um ponto final colado na cópia (30/09)
// fez a Cielo responder 500 no checkout sem dizer por quê.
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MERCHANT_KEY = /^[A-Za-z0-9]{40}$/;

/** Primeira mensagem de campo que o backend devolveu, se houver. */
function erroDoServidor(falha: unknown): string {
  const dados = (falha as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!dados || typeof dados !== 'object') return '';
  const primeiro = Object.values(dados)[0];
  const texto = Array.isArray(primeiro) ? primeiro[0] : primeiro;
  return typeof texto === 'string' ? texto : '';
}

interface AleloNoValeProps {
  storeId: string;
  /** As bandeiras que o backend diz que a Cielo cobra — hoje, só a Alelo. */
  bandeiras: BandeiraDeVale[];
  /** Avisa o vale se a Alelo está marcada (basta ela para o vale ter bandeira). */
  onAceitaMudar?: (aceita: boolean) => void;
}

interface Gravado {
  merchantId: string;
  clientId: string;
  aceita: boolean;
  teste: boolean;
}

const VAZIO: Gravado = { merchantId: '', clientId: '', aceita: false, teste: false };

/**
 * A Alelo dentro do vale, como mais uma bandeira. Ela é cobrada pela Cielo,
 * não pelo Pagar.me, então tem as chaves dela — com os nomes que o site da
 * Cielo usa, para o lojista copiar sem traduzir — atrás de "Chaves da Cielo",
 * que só existe com a Alelo marcada.
 *
 * Entra no Salvar da página (26/11); sozinha, desenha "Salvar Alelo".
 */
export const AleloNoVale: React.FC<AleloNoValeProps> = ({ storeId, bandeiras, onAceitaMudar }) => {
  const [gatewayId, setGatewayId] = useState<string | null>(null);
  const [jaTemSegredo, setJaTemSegredo] = useState(false);
  const [merchantId, setMerchantId] = useState('');
  const [merchantKey, setMerchantKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  // Sem conexão gravada, a Alelo nasce desmarcada: marcada seria mentira.
  const [aceita, setAceita] = useState(false);
  const [teste, setTeste] = useState(false);
  const [base, setBase] = useState<Gravado>(VAZIO);
  const [aberto, setAberto] = useState(false);
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
      const gravado: Gravado = {
        merchantId: cielo.public_key || '',
        clientId: cielo.configuration?.sop_client_id || '',
        aceita: cielo.is_enabled !== false,
        teste: Boolean(cielo.is_sandbox),
      };
      setGatewayId(cielo.id);
      setMerchantId(gravado.merchantId);
      setClientId(gravado.clientId);
      setAceita(gravado.aceita);
      setTeste(gravado.teste);
      setBase(gravado);
      setJaTemSegredo(Boolean(cielo.tem_credencial));
    }).catch((erroGateway) => {
      logger.error('Erro ao carregar a conexão da Cielo:', erroGateway);
    });
    return () => { vivo = false; };
  }, [storeId]);

  useEffect(() => { onAceitaMudar?.(aceita); }, [aceita]); // eslint-disable-line react-hooks/exhaustive-deps

  const nomes = bandeiras.map((b) => b.label).join(', ');

  /** O problema que impede salvar, ou null. Abre as chaves para mostrar onde. */
  const validar = (): string | null => {
    const mid = merchantId.trim();
    const cid = clientId.trim();
    const chave = merchantKey.trim();
    const faltaSegredo = !jaTemSegredo && (!chave || !clientSecret.trim());
    let problema: string | null = null;
    if (aceita && (!mid || !cid || faltaSegredo)) {
      problema = `Preencha as quatro chaves da Cielo para receber com ${nomes}.`;
    } else if (mid && !GUID.test(mid)) {
      problema = 'Merchant ID inválido: são 36 caracteres no formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.';
    } else if (chave && !MERCHANT_KEY.test(chave)) {
      problema = 'Merchant Key inválida: são 40 letras e números.';
    } else if (cid && !GUID.test(cid)) {
      problema = 'Client ID inválido: são 36 caracteres no formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.';
    }
    setErro(problema || '');
    if (problema) setAberto(true);
    return problema;
  };

  const gravar = async () => {
    // Desmarcada e nunca conectada: não há o que gravar.
    if (!gatewayId && !aceita) return;
    const mid = merchantId.trim();
    const cid = clientId.trim();
    const chave = merchantKey.trim();
    try {
      const corpo: DadosDoGateway = {
        store: storeId,
        name: 'Cielo (Alelo)',
        gateway_type: 'cielo',
        public_key: mid,
        is_enabled: aceita,
        is_sandbox: teste,
        configuration: {
          voucher_brands: bandeiras.map((b) => b.value),
          sop_client_id: cid,
        },
      };
      // Segredo em branco = "não mexi nisso". O backend mantém o que já tem.
      if (chave) corpo.api_key = chave;
      if (clientSecret.trim()) corpo.api_secret = clientSecret.trim();

      if (gatewayId) {
        await paymentsService.updateGateway(gatewayId, corpo);
      } else {
        const criado = await paymentsService.createGateway(corpo);
        setGatewayId(criado.id);
      }
      setJaTemSegredo(true);
      setMerchantKey('');
      setClientSecret('');
      setMerchantId(mid);
      setClientId(cid);
      setBase({ merchantId: mid, clientId: cid, aceita, teste });
    } catch (erroSalvar) {
      logger.error('Erro ao salvar a conexão da Cielo:', erroSalvar);
      setErro(erroDoServidor(erroSalvar) || 'Não consegui salvar. Confira as chaves e tente de novo.');
      setAberto(true);
      throw erroSalvar;
    }
  };

  const noSalvarUnico = useParteDoSalvar('vale-cielo', {
    mudancas: [
      merchantId !== base.merchantId,
      clientId !== base.clientId,
      aceita !== base.aceita,
      teste !== base.teste,
      Boolean(merchantKey),
      Boolean(clientSecret),
    ].filter(Boolean).length,
    validar,
    salvar: async () => { setSalvo(false); await gravar(); },
    descartar: () => {
      setMerchantId(base.merchantId);
      setClientId(base.clientId);
      setAceita(base.aceita);
      setTeste(base.teste);
      setMerchantKey('');
      setClientSecret('');
      setErro('');
    },
  });

  // Só fora do salvar único (bloco usado sozinho).
  const salvar = async () => {
    setSalvo(false);
    if (validar()) return;
    setSalvando(true);
    try {
      await gravar();
      setSalvo(true);
    } catch {
      // motivo já está na tela
    } finally {
      setSalvando(false);
    }
  };

  const manter = jaTemSegredo ? 'Já salva. Preencha só para trocar.' : undefined;
  const configurado = jaTemSegredo && Boolean(merchantId.trim()) && Boolean(clientId.trim());

  return (
    <section aria-label={nomes} className="space-y-3">
      <label htmlFor="cielo-alelo-aceita" className="flex min-h-[2.25rem] items-center gap-2 text-sm text-fg-token">
        <input
          id="cielo-alelo-aceita"
          type="checkbox"
          className="h-4 w-4 accent-[var(--color-brand)]"
          checked={aceita}
          onChange={() => { setAceita((v) => !v); setErro(''); }}
        />
        <span>{nomes}</span>
      </label>

      {aceita && (
        <Recolhivel
          titulo="Chaves da Cielo"
          aberto={aberto}
          onAbertoMudar={setAberto}
          selo={configurado
            ? <SeloDeEstado tone="success" ponto>Configurado</SeloDeEstado>
            : <SeloDeEstado tone="warning" ponto>Falta configurar</SeloDeEstado>}
        >
          <Input
            id="cielo-merchant-id"
            label="Código do estabelecimento (Merchant ID)"
            autoComplete="off"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
          />
          <Input
            id="cielo-merchant-key"
            label="Chave do estabelecimento (Merchant Key)"
            type="password"
            autoComplete="off"
            placeholder={manter}
            value={merchantKey}
            onChange={(e) => setMerchantKey(e.target.value)}
          />
          <Input
            id="cielo-sop-client-id"
            label="Código do cartão (Client ID)"
            autoComplete="off"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
          <Input
            id="cielo-sop-client-secret"
            label="Senha do cartão (Client Secret)"
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
        </Recolhivel>
      )}

      {erro && <p role="alert" className="text-sm text-danger-token">{erro}</p>}
      {salvo && !erro && <p role="status" className="text-sm text-fg-muted-token">Salvo.</p>}

      {!noSalvarUnico && (
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : `Salvar ${nomes}`}
        </Button>
      )}
    </section>
  );
};

export default AleloNoVale;
