import React, { useEffect, useState } from 'react';

import { Button, ChoiceCards, Input, NumberField, Secao, Switch } from '../../components/ui';
import logger from '../../services/logger';
import {
  EXIBICAO_PADRAO,
  diferencas,
  exibicaoDoCardapioService,
  type EncaixeDaFoto,
  type ExibicaoDoCardapio,
  type FormatoDaFoto,
  type PosicaoDaFoto,
  type FormatoDoLogo,
  type AlinhamentoDoLogo,
} from '../../services/exibicaoDoCardapio';

interface Props {
  /** slug ou id da loja */
  loja: string;
  /** Depois de salvar — a página recarrega a prévia. */
  onSalvo?: (exibicao: ExibicaoDoCardapio) => void;
}

const POSICOES: { valor: PosicaoDaFoto; titulo: string; descricao: string }[] = [
  { valor: 'padrao', titulo: 'Do template', descricao: 'Como o template desenha' },
  { valor: 'topo', titulo: 'Em cima', descricao: 'Foto grande, texto embaixo' },
  { valor: 'esquerda', titulo: 'Esquerda', descricao: 'Lista com foto ao lado' },
  { valor: 'direita', titulo: 'Direita', descricao: 'Lista estilo iFood' },
];
const ENCAIXES: { valor: EncaixeDaFoto; titulo: string; descricao: string }[] = [
  { valor: 'cortar', titulo: 'Cortar', descricao: 'Preenche o quadro, apara as bordas' },
  { valor: 'inteira', titulo: 'Inteira', descricao: 'Mostra a foto toda, sem cortar' },
];
const FORMATOS: { valor: FormatoDaFoto; titulo: string; descricao: string }[] = [
  { valor: 'padrao', titulo: 'Do template', descricao: 'Como o template desenha' },
  { valor: 'quadrada', titulo: 'Quadrada', descricao: '1:1' },
  { valor: 'retangular', titulo: 'Retangular', descricao: '4:3' },
  { valor: 'paisagem', titulo: 'Paisagem', descricao: '16:9' },
];

const FORMATOS_DO_LOGO: { valor: FormatoDoLogo; titulo: string; descricao: string }[] = [
  { valor: 'padrao', titulo: 'Do template', descricao: 'Como o template desenha' },
  { valor: 'redondo', titulo: 'Redondo', descricao: 'Círculo' },
  { valor: 'quadrado', titulo: 'Quadrado', descricao: 'Cantos levemente arredondados' },
];
const ALINHAMENTOS_DO_LOGO: { valor: AlinhamentoDoLogo; titulo: string; descricao: string }[] = [
  { valor: 'padrao', titulo: 'Do template', descricao: 'Como o template desenha' },
  { valor: 'esquerda', titulo: 'À esquerda', descricao: 'Logo ao lado do nome' },
  { valor: 'centro', titulo: 'Centralizado', descricao: 'Logo em cima do nome' },
];

const mensagemDoErro = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error
  || 'Não consegui salvar. Nada foi alterado.';

/**
 * Exibição do cardápio — como o produto aparece na vitrine. Grava pelo próprio
 * endpoint (PATCH parcial), nunca pelo metadata inteiro da loja.
 */
export const ExibicaoDoCardapioSection: React.FC<Props> = ({ loja, onSalvo }) => {
  const [gravado, setGravado] = useState<ExibicaoDoCardapio>(EXIBICAO_PADRAO);
  const [rascunho, setRascunho] = useState<ExibicaoDoCardapio>(EXIBICAO_PADRAO);
  const [carregado, setCarregado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    let vivo = true;
    exibicaoDoCardapioService.ler(loja)
      .then((e) => { if (vivo) { setGravado(e); setRascunho(e); } })
      .catch((e) => logger.error('Erro ao ler exibição do cardápio:', e))
      .finally(() => { if (vivo) setCarregado(true); });
    return () => { vivo = false; };
  }, [loja]);

  const mudar = (parcial: Partial<ExibicaoDoCardapio>) => {
    setRascunho((r) => ({ ...r, ...parcial }));
    setErro('');
    setSalvo(false);
  };

  const mudou = diferencas(gravado, rascunho);
  const temMudanca = Object.keys(mudou).length > 0;

  const salvar = async () => {
    setSalvando(true);
    setErro('');
    try {
      const novo = await exibicaoDoCardapioService.salvar(loja, mudou);
      setGravado(novo);
      setRascunho(novo);
      setSalvo(true);
      onSalvo?.(novo);
    } catch (e) {
      logger.error('Erro ao salvar exibição do cardápio:', e);
      setErro(mensagemDoErro(e));
    } finally {
      setSalvando(false);
    }
  };

  if (!carregado) return null;

  return (
    <Secao titulo="Exibição do cardápio">
      <div className="flex flex-col gap-6">
        <NumberField
          rotulo="Ver mais a partir de"
          valor={rascunho.descricao_limite}
          onMudar={(n) => mudar({ descricao_limite: n })}
          min={0}
          max={500}
          sufixo={rascunho.descricao_limite === 0 ? 'automático' : 'caracteres'}
        />

        <ChoiceCards rotulo="Foto do produto" opcoes={POSICOES} valor={rascunho.foto_posicao}
          onChange={(v) => mudar({ foto_posicao: v })} />
        <ChoiceCards rotulo="Encaixe da foto" opcoes={ENCAIXES} valor={rascunho.foto_encaixe}
          onChange={(v) => mudar({ foto_encaixe: v })} />
        <ChoiceCards rotulo="Formato da foto" opcoes={FORMATOS} valor={rascunho.foto_proporcao}
          onChange={(v) => mudar({ foto_proporcao: v })} />

        <ChoiceCards rotulo="Formato do logo" opcoes={FORMATOS_DO_LOGO} valor={rascunho.logo_formato}
          onChange={(v) => mudar({ logo_formato: v })} />
        <ChoiceCards rotulo="Alinhamento do topo" opcoes={ALINHAMENTOS_DO_LOGO} valor={rascunho.logo_alinhamento}
          onChange={(v) => mudar({ logo_alinhamento: v })} />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-body text-fg-token">Avisar estoque baixo</span>
            <Switch ligado={rascunho.mostrar_estoque_baixo} rotulo="Avisar estoque baixo"
              onMudar={(v) => mudar({ mostrar_estoque_baixo: v })} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-body text-fg-token">Mostrar esgotados</span>
            <Switch ligado={rascunho.mostrar_esgotados} rotulo="Mostrar esgotados"
              onMudar={(v) => mudar({ mostrar_esgotados: v })} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-body text-fg-token">Peça novamente</span>
            <Switch ligado={rascunho.mostrar_peca_novamente} rotulo="Peça novamente"
              onMudar={(v) => mudar({ mostrar_peca_novamente: v })} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label={`Título do agradecimento (${rascunho.agradecimento_titulo.length}/60)`}
            value={rascunho.agradecimento_titulo}
            maxLength={60}
            placeholder="Pedido confirmado!"
            onChange={(e) => mudar({ agradecimento_titulo: e.target.value })}
          />
          <Input
            label={`Subtítulo do agradecimento (${rascunho.agradecimento_subtitulo.length}/160)`}
            value={rascunho.agradecimento_subtitulo}
            maxLength={160}
            placeholder="Seu pedido foi processado com sucesso."
            onChange={(e) => mudar({ agradecimento_subtitulo: e.target.value })}
          />
        </div>

        {erro && <p role="alert" className="text-sm text-danger-token">{erro}</p>}
        {salvo && !erro && <p className="text-sm text-success-token">Exibição salva.</p>}
        <div>
          <Button onClick={() => void salvar()} disabled={salvando || !temMudanca} isLoading={salvando}>
            Salvar exibição
          </Button>
        </div>
      </div>
    </Secao>
  );
};

export default ExibicaoDoCardapioSection;
