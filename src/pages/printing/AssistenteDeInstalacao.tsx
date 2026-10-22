/**
 * Assistente "Instalar impressora": baixar, gerar a chave, instalar e ver o
 * computador conectar. Para o lojista, não para o técnico — a chave é a única
 * coisa técnica e só aparece para copiar.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  KeyIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Aviso, Button, Input, Modal, ModalBody, ModalFooter, ModalHeader, Select } from '../../components/ui';
import { URL_DO_INSTALADOR } from '../../components/printing/instalador';
import { agenteConectado } from '../../components/printing/situacaoDaImpressora';
import {
  PrintAgent,
  createPrintAgent,
  imprimirTesteDaComanda,
  listPrintAgents,
  rotatePrintAgentKey,
} from '../../services/printing';
import { copyToClipboard } from '../../utils/clipboard';

const INTERVALO_MS = 3000;
const ETAPAS = ['Baixar', 'Chave', 'Instalar', 'Conectar'];

const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'computador';

const listaDe = (res: { data: unknown }): PrintAgent[] => {
  const d = res.data as { results?: PrintAgent[] } | PrintAgent[];
  const lista = Array.isArray(d) ? d : d?.results;
  return Array.isArray(lista) ? lista : [];
};

interface Props {
  aberto: boolean;
  onClose: () => void;
  /** Slug da loja (rotas). */
  storeSlug: string;
  /** UUID da loja (FK do cadastro). */
  storeUuid?: string;
  /** Avisa a tela que a lista de computadores mudou. */
  onMudou?: () => void;
}

const AssistenteDeInstalacao: React.FC<Props> = ({ aberto, onClose, storeSlug, storeUuid, onMudou }) => {
  const [etapa, setEtapa] = useState(0);
  const [agentes, setAgentes] = useState<PrintAgent[]>([]);
  const [modo, setModo] = useState<'novo' | 'existente'>('novo');
  const [nome, setNome] = useState('Caixa');
  const [existenteId, setExistenteId] = useState('');
  const [gerando, setGerando] = useState(false);
  const [chave, setChave] = useState<string | null>(null);
  const [alvoId, setAlvoId] = useState<string | null>(null);
  const [conectado, setConectado] = useState(false);
  const [testando, setTestando] = useState(false);

  const reiniciar = useCallback(() => {
    setEtapa(0); setModo('novo'); setNome('Caixa'); setExistenteId('');
    setChave(null); setAlvoId(null); setConectado(false); setGerando(false); setTestando(false);
  }, []);

  // Lista de computadores existentes (para reinstalar) ao abrir.
  useEffect(() => {
    if (!aberto) { reiniciar(); return; }
    let vivo = true;
    listPrintAgents(storeSlug)
      .then((res) => { if (vivo) setAgentes(listaDe(res)); })
      .catch(() => undefined);
    return () => { vivo = false; };
  }, [aberto, storeSlug, reiniciar]);

  // Etapa 4: espera o computador aparecer conectado. Para ao fechar/sair.
  useEffect(() => {
    if (!aberto || etapa !== 3 || !alvoId || conectado) return;
    let vivo = true;
    const consultar = async () => {
      try {
        const alvo = listaDe(await listPrintAgents(storeSlug)).find((a) => a.id === alvoId);
        if (vivo && alvo && agenteConectado(alvo)) { setConectado(true); onMudou?.(); }
      } catch { /* tenta de novo no próximo ciclo */ }
    };
    consultar();
    const timer = setInterval(consultar, INTERVALO_MS);
    return () => { vivo = false; clearInterval(timer); };
  }, [aberto, etapa, alvoId, conectado, storeSlug, onMudou]);

  const gerarNova = async () => {
    if (!storeUuid) { toast.error('Selecione a loja no menu superior.'); return; }
    setGerando(true);
    try {
      const slugsEmUso = agentes.map((a) => a.slug);
      let slug = slugify(nome);
      if (slugsEmUso.includes(slug)) slug = `${slug}-${Date.now().toString(36)}`;
      const res = await createPrintAgent(storeSlug, {
        store: storeUuid, name: nome.trim(), slug, printer_name: '', station: 'kitchen',
      });
      if (!res.data.api_key) throw new Error('sem chave');
      setChave(res.data.api_key); setAlvoId(res.data.id); setConectado(false); onMudou?.();
    } catch {
      toast.error('Não foi possível gerar a chave. Tente de novo.');
    } finally { setGerando(false); }
  };

  const gerarParaExistente = async () => {
    if (!existenteId) return;
    setGerando(true);
    try {
      const res = await rotatePrintAgentKey(storeSlug, existenteId);
      const nova = res.data.api_key || res.data.key;
      if (!nova) throw new Error('sem chave');
      setChave(nova); setAlvoId(existenteId); setConectado(false); onMudou?.();
    } catch {
      toast.error('Não foi possível gerar a chave. Tente de novo.');
    } finally { setGerando(false); }
  };

  const copiar = async () => {
    if (!chave) return;
    if (await copyToClipboard(chave)) toast.success('Chave copiada');
    else toast.error('Não foi possível copiar. Selecione e copie.');
  };

  const testar = async () => {
    setTestando(true);
    try { await imprimirTesteDaComanda(storeSlug); toast.success('Teste enviado.'); }
    catch { toast.error('Não foi possível enviar o teste.'); }
    finally { setTestando(false); }
  };

  const podeAvancar = etapa === 1 ? Boolean(chave) : etapa < 3;

  return (
    <Modal open={aberto} onClose={onClose} size="md" ariaLabel="Instalar impressora">
      <ModalHeader title="Instalar impressora" />
      <ModalBody>
        <ol className="mb-5 flex items-center gap-2" aria-label="Etapas">
          {ETAPAS.map((rotulo, i) => (
            <li
              key={rotulo}
              aria-current={i === etapa ? 'step' : undefined}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                i === etapa ? 'bg-brand text-white' : i < etapa ? 'bg-success-soft text-success-token' : 'bg-surface-2 text-fg-muted-token'
              }`}
              title={rotulo}
            >
              {i + 1}
            </li>
          ))}
        </ol>

        {etapa === 0 && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <PrinterIcon className="h-12 w-12 text-fg-muted-token" aria-hidden />
            <a
              href={URL_DO_INSTALADOR}
              download
              aria-label="Baixar instalador"
              role="link"
              className="inline-flex items-center gap-2 rounded bg-brand px-6 py-4 text-lg font-semibold text-white hover:opacity-90"
            >
              <ArrowDownTrayIcon className="h-6 w-6" aria-hidden /> Baixar instalador
            </a>
            <p className="text-sm text-fg-muted-token">No computador ligado à impressora (Windows).</p>
          </div>
        )}

        {etapa === 1 && (
          <div className="flex flex-col gap-4">
            {agentes.length > 0 && (
              <div className="flex gap-2">
                <Button variant={modo === 'novo' ? 'primary' : 'outline'} onClick={() => setModo('novo')} disabled={Boolean(chave)}>Computador novo</Button>
                <Button variant={modo === 'existente' ? 'primary' : 'outline'} onClick={() => setModo('existente')} disabled={Boolean(chave)}>Já tenho</Button>
              </div>
            )}
            {!chave && modo === 'novo' && (
              <>
                <Input label="Nome do computador" value={nome} onChange={(e) => setNome(e.target.value)} />
                <Button onClick={gerarNova} disabled={gerando || !nome.trim()} leftIcon={<KeyIcon className="h-4 w-4" />}>
                  {gerando ? 'Gerando…' : 'Gerar chave'}
                </Button>
              </>
            )}
            {!chave && modo === 'existente' && (
              <>
                <Select
                  rotulo="Computador"
                  vazio="Escolha…"
                  opcoes={agentes.map((a) => ({ valor: a.id, rotulo: a.name }))}
                  valor={existenteId}
                  onMudar={setExistenteId}
                />
                <Aviso tom="atencao" titulo="O computador antigo para de imprimir até receber a chave nova." />
                <Button onClick={gerarParaExistente} disabled={gerando || !existenteId} leftIcon={<KeyIcon className="h-4 w-4" />}>
                  {gerando ? 'Gerando…' : 'Gerar nova chave'}
                </Button>
              </>
            )}
            {chave && (
              <div className="flex items-center gap-2">
                <code className="flex-1 select-all break-all rounded bg-surface-2 px-4 py-3 font-mono text-base font-semibold">{chave}</code>
                <Button variant="outline" onClick={copiar} leftIcon={<ClipboardDocumentIcon className="h-4 w-4" />}>Copiar</Button>
              </div>
            )}
          </div>
        )}

        {etapa === 2 && (
          <ol className="flex flex-col gap-3">
            {[
              'Abra o arquivo baixado.',
              'Se o Windows avisar: Mais informações → Executar assim mesmo.',
              'Cole a chave e avance até concluir.',
            ].map((texto, i) => (
              <li key={texto} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{i + 1}</span>
                <span className="pt-0.5">{texto}</span>
              </li>
            ))}
          </ol>
        )}

        {etapa === 3 && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            {conectado ? (
              <>
                <CheckCircleIcon className="h-12 w-12 text-success-token" aria-hidden />
                <p className="text-lg font-semibold">Conectado</p>
                <Button onClick={testar} disabled={testando} leftIcon={<PrinterIcon className="h-4 w-4" />}>
                  {testando ? 'Enviando…' : 'Imprimir teste'}
                </Button>
              </>
            ) : (
              <>
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-border-token border-t-brand" role="status" aria-label="Carregando" />
                <p className="text-fg-muted-token">Aguardando o computador…</p>
              </>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter className="justify-between">
        <Button variant="ghost" onClick={etapa === 0 ? onClose : () => setEtapa(etapa - 1)}>
          {etapa === 0 ? 'Cancelar' : 'Voltar'}
        </Button>
        {etapa < 3 ? (
          <Button onClick={() => setEtapa(etapa + 1)} disabled={!podeAvancar}>Avançar</Button>
        ) : (
          <Button onClick={onClose} disabled={!conectado}>Concluir</Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default AssistenteDeInstalacao;
