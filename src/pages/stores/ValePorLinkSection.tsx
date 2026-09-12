import React, { useCallback, useEffect, useState } from 'react';
import { LinkIcon } from '@heroicons/react/24/outline';

import { Card, Button } from '../../components/ui';
import { paymentsService } from '../../services/payments';
import { updateStore } from '../../services/storesApi';
import logger from '../../services/logger';

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
 */
export const ValePorLinkSection: React.FC<ValePorLinkSectionProps> = ({
  storeId,
  ligadas = [],
  whatsapp = '',
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

  const salvar = useCallback(async () => {
    setErro('');
    setSalvando(true);
    try {
      // Campo próprio, nunca o `metadata` inteiro: o painel não sabe tudo o
      // que mora lá, e mandar o dicionário completo apagaria o resto.
      const ordenadas = catalogo.map((b) => b.value).filter((v) => marcadas.includes(v));
      await updateStore(storeId, { vale_por_link_brands: ordenadas } as never);
      setSalvo(true);
    } catch (e) {
      logger.error('Erro ao salvar bandeiras sem integração:', e);
      setErro('Não consegui salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }, [catalogo, marcadas, storeId]);

  const semWhatsapp = !String(whatsapp || '').trim();

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <LinkIcon className="w-6 h-6 text-fg-muted-token shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg font-medium text-fg-token">Vale cobrado por link</h3>
          <p className="text-sm text-fg-muted-token">
            Bandeiras que não fecham o pagamento dentro do cardápio. O cliente
            escolhe, o pedido fica registrado como pendente e você manda o link
            de cobrança pelo WhatsApp.
          </p>
        </div>
      </div>

      {semWhatsapp && (
        <p role="alert" className="mb-4 rounded-lg border border-warning-300 bg-warning-50 p-3 text-sm text-fg-token dark:border-warning-700 dark:bg-warning-900/25">
          Esta loja não tem WhatsApp cadastrado. Sem ele a opção não aparece no
          cardápio — seria mandar o cliente para lugar nenhum.
        </p>
      )}

      <fieldset>
        <legend className="text-sm font-medium text-fg-token mb-2">
          Bandeiras aceitas por link
        </legend>
        <div className="space-y-2">
          {catalogo.map(({ value, label, logo }) => (
            <label
              key={value}
              htmlFor={`vale-link-${value}`}
              className="flex items-center gap-2 text-sm text-fg-token"
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

      {erro && <p role="alert" className="mt-3 text-sm text-danger-500">{erro}</p>}
      {salvo && !erro && (
        <p role="status" className="mt-3 text-sm text-fg-muted-token">Salvo.</p>
      )}

      <Button className="mt-4" onClick={salvar} disabled={salvando}>
        {salvando ? 'Salvando...' : 'Salvar'}
      </Button>
    </Card>
  );
};

export default ValePorLinkSection;
