import React, { useCallback, useEffect, useState } from 'react';
import { DocumentTextIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button } from '../../components/ui';
import { getConfigFiscal, updateConfigFiscal, type ConfigFiscal } from '../../services/storesApi';
import logger from '../../services/logger';
import { useParteDoSalvar } from './salvarJunto';

interface NotaFiscalSectionProps {
  storeId: string;
}

const CAMPO =
  'w-full mt-1 px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:outline-none focus:ring-2 focus:ring-brand';

const VAZIO: ConfigFiscal = {
  habilitado: false,
  provider: 'focus',
  ambiente: 'homologacao',
  cnpj: '',
  inscricao_estadual: '',
  uf: '',
  serie: '1',
  csosn: '102',
  ncm_padrao: '',
  cfop_padrao: '',
  csc_id: '',
  focus_token_configurado: false,
  csc_configurado: false,
  cert_password_configurado: false,
};

/** O que esta tela edita — o resto da config (flags de "configurado") só se lê. */
const EDITAVEIS = [
  'habilitado', 'provider', 'ambiente', 'cnpj', 'inscricao_estadual', 'uf',
  'serie', 'csosn', 'ncm_padrao', 'cfop_padrao', 'csc_id',
] as const;

/** CNPJ legível enquanto digita; o backend guarda só os dígitos. */
const mascararCnpj = (valor: string) =>
  valor
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');

/**
 * Emissão de NFC-e da loja — opt-in, uma loja por vez.
 *
 * Emitir nota não é só ligar uma chave: exige CNPJ, inscrição estadual,
 * credenciamento de NFC-e na SEFAZ do estado, certificado A1 e conta no
 * provedor. Por isso a tela mostra o que falta em vez de aceitar uma config
 * pela metade — loja meio configurada só descobre o problema no primeiro
 * pedido, com o cliente esperando o cupom no balcão.
 */
export const NotaFiscalSection: React.FC<NotaFiscalSectionProps> = ({ storeId }) => {
  const [config, setConfig] = useState<ConfigFiscal>(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [token, setToken] = useState('');
  /** Como está gravada — base do "mudou" e do Descartar. */
  const [salva, setSalva] = useState<ConfigFiscal>(VAZIO);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    if (!storeId) return;
    setCarregando(true);
    try {
      const atual = await getConfigFiscal(storeId);
      setConfig(atual);
      setSalva(atual);
    } catch (erro) {
      logger.error('Erro ao carregar configuração fiscal:', erro);
    } finally {
      setCarregando(false);
    }
  }, [storeId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const gravar = async () => {
    setErro('');
    try {
      const atualizada = await updateConfigFiscal(storeId, {
        ...Object.fromEntries(EDITAVEIS.map((k) => [k, config[k]])),
        // token em branco = manter o que já está salvo (a tela nunca o exibe)
        ...(token.trim() ? { focus_token: token.trim() } : {}),
      } as Partial<ConfigFiscal>);
      setConfig(atualizada);
      setSalva(atualizada);
      setToken('');
    } catch (falha: unknown) {
      const detalhes = (falha as { response?: { data?: { error?: { details?: Record<string, string[]> } } } })
        ?.response?.data?.error?.details;
      setErro(detalhes && Object.values(detalhes)[0]?.[0] || 'Não foi possível salvar a configuração fiscal');
      logger.error('Erro ao salvar configuração fiscal:', falha);
      throw falha;
    }
  };

  const noSalvarUnico = useParteDoSalvar('nota-fiscal', {
    mudancas: EDITAVEIS.filter((k) => config[k] !== salva[k]).length + (token.trim() ? 1 : 0),
    salvar: gravar,
    descartar: () => { setConfig(salva); setToken(''); setErro(''); },
  });

  // Só fora do salvar único (seção usada sozinha).
  const salvar = async () => {
    setSalvando(true);
    try {
      await gravar();
      toast.success('Configuração fiscal salva');
    } catch {
      // motivo já está na tela
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return <Card className="p-6 text-sm text-fg-muted-token">Carregando configuração fiscal...</Card>;
  }

  const emProducao = config.ambiente === 'producao';

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <DocumentTextIcon className="w-5 h-5 text-fg-muted-token" />
        <h2 className="text-lg font-semibold text-fg-token">Nota fiscal</h2>
      </div>

      <label className="flex items-center gap-3 text-sm text-fg-token cursor-pointer mt-5">
        <input
          type="checkbox"
          checked={config.habilitado}
          onChange={e => setConfig(prev => ({ ...prev, habilitado: e.target.checked }))}
          className="h-4 w-4 accent-[var(--color-brand)]"
        />
        Emitir nota fiscal nesta loja
      </label>

      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-5 mt-5">
        <div>
          <label className="text-sm font-medium text-fg-muted-token">CNPJ do emitente</label>
          <input
            type="text"
            value={mascararCnpj(config.cnpj)}
            onChange={e => setConfig(prev => ({ ...prev, cnpj: e.target.value }))}
            placeholder="00.000.000/0000-00"
            className={CAMPO}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-fg-muted-token">Inscrição estadual</label>
          <input
            type="text"
            value={config.inscricao_estadual}
            onChange={e => setConfig(prev => ({ ...prev, inscricao_estadual: e.target.value }))}
            className={CAMPO}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-fg-muted-token">UF do emitente</label>
          <input
            type="text"
            value={config.uf}
            onChange={e =>
              setConfig(prev => ({
                ...prev,
                uf: e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2),
              }))
            }
            placeholder="TO"
            className={CAMPO}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-fg-muted-token">
            Token da Focus NFe {config.focus_token_configurado && '• configurado'}
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder={
              config.focus_token_configurado
                ? 'Deixe vazio para manter o token atual'
                : 'Token gerado no painel da Focus NFe'
            }
            className={CAMPO}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-fg-muted-token">Ambiente</label>
          <select
            value={config.ambiente}
            onChange={e =>
              setConfig(prev => ({ ...prev, ambiente: e.target.value as ConfigFiscal['ambiente'] }))
            }
            className={CAMPO}
          >
            <option value="homologacao">Homologação (teste, sem valor fiscal)</option>
            <option value="producao">Produção (nota válida de verdade)</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-fg-muted-token">Série</label>
          <input
            type="text"
            value={config.serie}
            onChange={e => setConfig(prev => ({ ...prev, serie: e.target.value.replace(/\D/g, '') }))}
            className={CAMPO}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-fg-muted-token">CSOSN</label>
          <input
            type="text"
            value={config.csosn}
            onChange={e => setConfig(prev => ({ ...prev, csosn: e.target.value.replace(/\D/g, '') }))}
            placeholder="102 (Simples Nacional)"
            className={CAMPO}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-fg-muted-token">NCM padrão</label>
          <input
            type="text"
            value={config.ncm_padrao}
            onChange={e => setConfig(prev => ({ ...prev, ncm_padrao: e.target.value.replace(/\D/g, '') }))}
            placeholder="21069090 (preparações alimentícias)"
            className={CAMPO}
          />
          <p className="text-xs text-fg-muted-token mt-1">
            Usado quando o produto não tem NCM próprio.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-fg-muted-token">CFOP padrão</label>
          <input
            type="text"
            value={config.cfop_padrao}
            onChange={e => setConfig(prev => ({ ...prev, cfop_padrao: e.target.value.replace(/\D/g, '') }))}
            placeholder="5102 (venda no estado)"
            className={CAMPO}
          />
        </div>
      </div>

      {config.habilitado && emProducao && (
        <div className="mt-5 flex gap-3 rounded border border-amber-500/40 bg-amber-500/10 p-4">
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-amber-500" />
          <p className="text-sm text-fg-token">
            Em produção as notas têm valor fiscal: entram na sua apuração e só podem ser canceladas
            em até 30 minutos. Teste em homologação antes de virar a chave.
          </p>
        </div>
      )}

      {erro && <p role="alert" className="mt-4 text-sm text-danger-token">{erro}</p>}
      {!noSalvarUnico && (
        <Button onClick={salvar} disabled={salvando} className="mt-6 w-full justify-center">
          {salvando ? 'Salvando...' : 'Salvar configuração fiscal'}
        </Button>
      )}
    </Card>
  );
};

export default NotaFiscalSection;
