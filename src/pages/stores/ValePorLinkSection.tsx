import React, { useCallback, useEffect, useState } from 'react';

import { Aviso, Card, Button } from '../../components/ui';
import { paymentsService } from '../../services/payments';
import { updateStore } from '../../services/storesApi';
import logger from '../../services/logger';
import { useParteDoSalvar } from './salvarJunto';
import type { InterruptorDaForma } from './FormasNoCardapioSection';

const MARQUE_UMA = 'Marque ao menos uma bandeira por QR Code.';

interface Bandeira {
  value: string;
  label: string;
  /** Chega vazia enquanto a imagem não subiu — aí a tela desenha só o nome. */
  logo?: string;
}

interface ValePorLinkSectionProps {
  storeId: string;
  /** O que a loja já aceita hoje — vem do `vale_por_link_brands` da loja. */
  ligadas?: string[];
  /** Sem WhatsApp a opção não aparece no cardápio: o backend não a oferece. */
  whatsapp?: string;
  /**
   * O interruptor "Vale-refeição por link" de Como o cliente paga. Com ele, a
   * seção é a configuração aninhada na linha e some com ele desligado (as
   * bandeiras ficam guardadas). Sem ele, é um cartão próprio.
   */
  interruptor?: InterruptorDaForma;
}

/**
 * Vale de bandeira SEM integração — hoje só a Volus.
 *
 * Fica SEPARADO do cartão do Pagar.me de propósito: aqui não existe gateway,
 * chave nem cobrança por API. A loja marca a bandeira, o pedido nasce pendente
 * e a cobrança vai por link no WhatsApp. Uma loja que nunca configurou o
 * Pagar.me pode ligar isto assim mesmo — juntar os dois num cartão só faria
 * parecer que depende do outro.
 *
 * A lista vem do backend, como todas as outras. Bandeira nova entra lá e
 * aparece aqui, sem deploy do painel.
 *
 * Fica aninhada na linha "Vale-refeição por link" de Como o cliente paga
 * (26/11): ligar e desligar é o interruptor da linha; aqui só as bandeiras.
 */
export const ValePorLinkSection: React.FC<ValePorLinkSectionProps> = ({
  storeId,
  ligadas = [],
  whatsapp = '',
  interruptor,
}) => {
  const [catalogo, setCatalogo] = useState<Bandeira[]>([]);
  const [marcadas, setMarcadas] = useState<string[]>(ligadas);
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { setMarcadas(ligadas); }, [ligadas.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let vivo = true;
    paymentsService.getVoucherBrands()
      .then((r) => { if (vivo) setCatalogo(r?.manual_brands || []); })
      .catch((e) => logger.error('Erro ao carregar bandeiras sem integração:', e));
    return () => { vivo = false; };
  }, []);

  const alternar = useCallback((valor: string) => {
    setSalvo(false);
    setMarcadas((atuais) =>
      (atuais.includes(valor) ? atuais.filter((x) => x !== valor) : [...atuais, valor]));
  }, []);

  const gravar = async () => {
    try {
      // Campo próprio, nunca o `metadata` inteiro: o painel não sabe tudo o
      // que mora lá, e mandar o dicionário completo apagaria o resto.
      const ordenadas = catalogo.map((b) => b.value).filter((v) => marcadas.includes(v));
      await updateStore(storeId, { vale_por_link_brands: ordenadas } as never);
    } catch (e) {
      logger.error('Erro ao salvar bandeiras sem integração:', e);
      setErro('Não consegui salvar. Tente de novo.');
      throw e;
    }
  };

  const mudou = marcadas.length !== ligadas.length || marcadas.some((v) => !ligadas.includes(v));
  // Ligou agora sem bandeira: o cardápio não teria o que oferecer.
  const ligouSemBandeira = Boolean(interruptor?.ligada && interruptor.toques > 0 && marcadas.length === 0);
  const validar = () => {
    const problema = ligouSemBandeira ? MARQUE_UMA : null;
    setErro(problema || '');
    return problema;
  };
  const noSalvarUnico = useParteDoSalvar('vale-por-link', {
    mudancas: mudou || ligouSemBandeira ? 1 : 0,
    validar,
    salvar: async () => { setErro(''); await gravar(); },
    descartar: () => { setMarcadas(ligadas); setErro(''); },
  });

  // Só fora do salvar único (seção usada sozinha).
  const salvar = async () => {
    setErro('');
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

  const semWhatsapp = !String(whatsapp || '').trim();

  if (interruptor && !interruptor.ligada) return null;

  const corpo = (
    <div className="space-y-3">
      {semWhatsapp && (
        <Aviso tom="atencao" titulo="Cadastre o WhatsApp da loja">
          Sem ele, o vale por QR Code não aparece no cardápio.
        </Aviso>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-fg-token">Bandeiras por QR Code</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {catalogo.map(({ value, label, logo }) => (
            <label
              key={value}
              htmlFor={`vale-link-${value}`}
              className="flex min-h-[2.25rem] items-center gap-2 text-sm text-fg-token"
            >
              <input
                id={`vale-link-${value}`}
                type="checkbox"
                checked={marcadas.includes(value)}
                onChange={() => alternar(value)}
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              {logo && <img src={logo} alt="" aria-hidden="true" className="h-5 w-auto max-w-[64px] object-contain" />}
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {erro && <p role="alert" className="text-sm text-danger-token">{erro}</p>}
      {salvo && !erro && <p role="status" className="text-sm text-fg-muted-token">Salvo.</p>}

      {!noSalvarUnico && (
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      )}
    </div>
  );

  if (interruptor) {
    return <div className="mt-3 border-l-2 border-border-token pl-4">{corpo}</div>;
  }

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-medium text-fg-token">Vale cobrado por QR Code</h3>
      {corpo}
    </Card>
  );
};

export default ValePorLinkSection;
