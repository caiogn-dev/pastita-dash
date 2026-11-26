import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Aviso, Button, Card, Input, Recolhivel, SeloDeEstado } from '../../components/ui';
import { paymentsService, type BandeiraDeVale, type DadosDoGateway } from '../../services/payments';
import AleloNoVale from './AleloNoVale';
import logger from '../../services/logger';
import { useParteDoSalvar } from './salvarJunto';
import type { InterruptorDaForma } from './FormasNoCardapioSection';

type Bandeira = BandeiraDeVale;

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

const MARQUE_UMA = 'Marque ao menos uma bandeira de vale.';
const FALTA_PUBLICA = 'Preencha a chave pública do Pagar.me.';

interface VoucherSectionProps {
  storeId: string;
  /**
   * O interruptor "Vale-refeição" de Como o cliente paga. Com ele, a seção é
   * a configuração aninhada na linha: some com o vale desligado e liga o
   * Pagar.me quando o lojista liga o vale. Sem ele (uso isolado), é um cartão
   * próprio.
   */
  interruptor?: InterruptorDaForma;
}

/**
 * Vale-refeição: bandeiras aceitas e, atrás de um clique, as chaves de quem
 * cobra cada uma — Pagar.me (VR, Pluxee, Ticket…) e Cielo (Alelo).
 *
 * As duas chaves do Pagar.me (secreta e pública) têm campo desde o início —
 * do lado do Mercado Pago a pública nunca entrou no painel manual, e isso já
 * quebrou o cartão em produção (token de uma conta, cobrança em outra).
 *
 * Ligar/desligar o vale é UM interruptor, o da linha (26/11). Antes havia um
 * segundo, "Aceitar vale nesta loja", que mexia no `is_enabled` do gateway: o
 * mesmo conceito controlado em dois lugares. Agora desligar tira o vale do
 * cardápio (formas desligadas) e guarda chaves e bandeiras; ligar reativa o
 * gateway se ele estava desligado.
 */
export const VoucherSection: React.FC<VoucherSectionProps> = ({ storeId, interruptor }) => {
  const embutida = interruptor !== undefined;
  const [gatewayId, setGatewayId] = useState<string | null>(null);
  // O segredo NUNCA volta do backend — e está certo. Mas um campo em branco faz
  // o lojista achar que a configuração se perdeu. Guardamos só o ESTADO dele.
  const [jaTemSegredo, setJaTemSegredo] = useState(false);
  const [secreta, setSecreta] = useState('');
  const [publica, setPublica] = useState('');
  // O catálogo inteiro vem numa resposta só; cada bandeira diz qual conexão a
  // cobra. As do Pagar.me viram caixas aqui; as da Cielo vão para o bloco dela.
  const [todas, setTodas] = useState<Bandeira[]>([]);
  const catalogo = useMemo(
    () => todas.filter((b) => !b.gateway || b.gateway === 'pagarme'),
    [todas],
  );
  const daCielo = useMemo(() => todas.filter((b) => b.gateway === 'cielo'), [todas]);
  const [marcadas, setMarcadas] = useState<string[]>([]);
  // `is_enabled` do gateway. Guardado à parte para religar sem recadastrar.
  const [aceitaVale, setAceitaVale] = useState(true);
  const [aleloLigada, setAleloLigada] = useState(false);
  const [chavesAbertas, setChavesAbertas] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  /** O que está gravado — para saber o que mudou e voltar no Descartar. */
  const [base, setBase] = useState({ publica: '', marcadas: [] as string[], aceitaVale: true });

  // O catálogo é a fonte única; o painel só desenha o que o backend conhece.
  useEffect(() => {
    let vivo = true;
    paymentsService.getVoucherBrands()
      .then((r) => { if (vivo) setTodas(r?.brands || []); })
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
      setBase({
        publica: pagarme.public_key || '',
        marcadas: pagarme.configuration?.voucher_brands || [],
        aceitaVale: pagarme.is_enabled !== false,
      });
    }).catch((erroGateway) => {
      // lista vazia é estado válido: loja ainda não configurou vale
      logger.error('Erro ao carregar gateway de vale da loja:', erroGateway);
    });
    return () => { vivo = false; };
  }, [storeId]);

  // O lojista mexeu no interruptor da linha. Só o TOQUE conta: recarga da
  // página muda `ligada` sem toque, e não pode virar alteração inventada.
  // Ligar reativa o gateway; desligar devolve ao gravado (o cardápio já
  // esconde o vale pelas formas desligadas).
  const ultimoToque = useRef(interruptor?.toques ?? 0);
  useEffect(() => {
    if (!interruptor || interruptor.toques === ultimoToque.current) return;
    ultimoToque.current = interruptor.toques;
    setAceitaVale(interruptor.ligada ? true : base.aceitaVale);
    if (!interruptor.ligada) setErro('');
  }, [interruptor?.toques]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Vale ligado sem nenhuma bandeira (nem do Pagar.me, nem da Cielo) não
  // oferece nada ao cliente. Só a Alelo marcada basta: o Pagar.me fica de fora.
  const semBandeira = aceitaVale && marcadas.length === 0 && !aleloLigada;
  // Ligou o vale agora, numa loja sem nada configurado: há o que resolver
  // antes do Salvar, e a barra precisa dizer isso.
  const ligouSemNada = Boolean(interruptor?.ligada && interruptor.toques > 0 && semBandeira);
  const temAlgo = Boolean(gatewayId || secreta || publica);

  const validar = () => {
    let problema: string | null = null;
    if (semBandeira && (temAlgo || ligouSemNada)) problema = MARQUE_UMA;
    // Sem a pública o backend não anuncia o vale: gravaria e não apareceria.
    else if (aceitaVale && marcadas.length > 0 && !publica.trim()) {
      problema = FALTA_PUBLICA;
      setChavesAbertas(true);
    }
    setErro(problema || '');
    return problema;
  };

  const gravar = async () => {
    // Nada do Pagar.me para gravar (loja só com Alelo, ou sem nada): não cria
    // conexão vazia.
    if (!gatewayId && !secreta && !publica && marcadas.length === 0) return;
    // Ordem do catálogo do backend, não a ordem de clique do lojista.
    const ordenadas = catalogo
      .map((b) => b.value)
      .filter((v) => marcadas.includes(v));
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
        // Sem bandeira do Pagar.me (só Alelo), ele não cobra nada: fica desligado.
        is_enabled: aceitaVale && ordenadas.length > 0,
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
      if (secreta) setJaTemSegredo(true);
      setSecreta('');
      setAceitaVale(corpo.is_enabled as boolean);
      setBase({ publica, marcadas: ordenadas, aceitaVale: corpo.is_enabled as boolean });
    } catch (erroSalvar) {
      logger.error('Erro ao salvar gateway de vale:', erroSalvar);
      setErro('Não consegui salvar. Confira as chaves e tente de novo.');
      throw erroSalvar;
    }
  };

  const marcadasMudaram = marcadas.length !== base.marcadas.length
    || marcadas.some((v) => !base.marcadas.includes(v));
  const noSalvarUnico = useParteDoSalvar('vale-pagarme', {
    mudancas: [
      publica !== base.publica,
      marcadasMudaram,
      // Sem conexão gravada, ligar/desligar não tem onde gravar.
      Boolean(gatewayId) && aceitaVale !== base.aceitaVale,
      Boolean(secreta),
      ligouSemNada,
    ].filter(Boolean).length,
    validar,
    salvar: gravar,
    descartar: () => {
      setPublica(base.publica);
      setMarcadas(base.marcadas);
      setAceitaVale(base.aceitaVale);
      setSecreta('');
      setErro('');
    },
  });

  // Só fora do salvar único (seção usada sozinha).
  const salvar = async () => {
    if (validar()) return;
    setSalvando(true);
    try {
      await gravar();
    } catch {
      // motivo já está na tela
    } finally {
      setSalvando(false);
    }
  };

  // Vale desligado na linha: a configuração some, mas o estado fica (a parte
  // do Salvar continua registrada e o religar não perde nada).
  if (interruptor && !interruptor.ligada) return null;

  const pagarmeConfigurado = jaTemSegredo && Boolean(publica);

  const corpo = (
    <div className="space-y-4">
      {!jaTemSegredo && (
        <Aviso tom="atencao" titulo="Credencie o CNPJ em cada operadora">
          Sem isso, o pagamento com vale é recusado.
        </Aviso>
      )}

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-medium text-fg-token">Bandeiras</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {catalogo.map(({ value, label }) => (
            <label
              key={value}
              htmlFor={`bandeira-vale-${value}`}
              className="flex min-h-[2.25rem] items-center gap-2 text-sm text-fg-token"
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

        {marcadas.length > 0 && (
          <Recolhivel
            titulo="Chaves do Pagar.me"
            aberto={chavesAbertas}
            onAbertoMudar={setChavesAbertas}
            selo={pagarmeConfigurado
              ? <SeloDeEstado tone="success" ponto>Configurado</SeloDeEstado>
              : <SeloDeEstado tone="warning" ponto>Falta configurar</SeloDeEstado>}
          >
            <Input
              id="pagarme-vale-sk"
              label="Chave secreta"
              type="password"
              autoComplete="off"
              placeholder={jaTemSegredo ? 'Já salva. Preencha só para trocar.' : undefined}
              value={secreta}
              onChange={(e) => setSecreta(e.target.value)}
            />
            <Input
              id="pagarme-vale-pk"
              label="Chave pública"
              autoComplete="off"
              value={publica}
              onChange={(e) => setPublica(e.target.value)}
            />
            {ambientesDivergem && (
              <Aviso tom="erro" titulo="Chaves de ambientes diferentes">
                Uma é de teste e a outra de produção. O pagamento vai falhar.
              </Aviso>
            )}
          </Recolhivel>
        )}

        {daCielo.length > 0 && (
          <AleloNoVale storeId={storeId} bandeiras={daCielo} onAceitaMudar={setAleloLigada} />
        )}
      </fieldset>

      {erro && <p role="alert" className="text-sm text-danger-token">{erro}</p>}

      {!noSalvarUnico && (
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      )}
    </div>
  );

  if (embutida) {
    return <div className="mt-3 border-l-2 border-border-token pl-4">{corpo}</div>;
  }

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-medium text-fg-token">Vale-refeição e vale-alimentação</h3>
      {corpo}
    </Card>
  );
};

export default VoucherSection;
