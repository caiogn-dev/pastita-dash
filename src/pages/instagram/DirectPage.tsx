/**
 * Direct do Instagram dentro do inbox.
 *
 * A loja vende promoção por comentário; quem responde cai aqui. Sem esta aba,
 * a conversa que a promoção começou terminava no aplicativo do celular do
 * dono — fora do painel, fora do histórico, sem ninguém do time vendo.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { channelsApi } from '../../features/channels';
import type { ChannelConversation, ChannelMessage } from '../../features/channels/types';
import { InstagramIcon } from '../../components/brand/BrandIcons';
import { estadoDaJanela } from './janelaDoDirect';

const hora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

const ConversaNaLista: React.FC<{
  conversa: ChannelConversation;
  ativa: boolean;
  onClick: () => void;
}> = ({ conversa, ativa, onClick }) => (
  <li>
    <button
      type="button"
      onClick={onClick}
      aria-current={ativa}
      className={`flex w-full items-start gap-3 border-b border-border-token px-4 py-3 text-left transition-colors ${
        ativa ? 'bg-brand/10' : 'hover:bg-surface-muted-token'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold text-fg-token">{conversa.participantName}</span>
          <span className="shrink-0 text-xs text-fg-muted-token">{hora(conversa.lastMessageAt)}</span>
        </div>
        <p className="truncate text-sm text-fg-muted-token">{conversa.lastMessagePreview || 'Sem mensagens'}</p>
      </div>
      {conversa.unreadCount > 0 && (
        <span className="mt-1 shrink-0 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-on-brand">
          {conversa.unreadCount}
        </span>
      )}
    </button>
  </li>
);

const Balao: React.FC<{ mensagem: ChannelMessage }> = ({ mensagem }) => {
  const daLoja = mensagem.direction === 'outbound';
  return (
    <li className={`flex ${daLoja ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          daLoja ? 'bg-brand text-on-brand' : 'bg-surface-muted-token text-fg-token'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm">{mensagem.text || '(mídia)'}</p>
        <span className={`mt-1 block text-right text-[0.7rem] ${daLoja ? 'text-on-brand/70' : 'text-fg-muted-token'}`}>
          {hora(mensagem.createdAt)}
        </span>
      </div>
    </li>
  );
};

export const DirectPage: React.FC = () => {
  const [conversas, setConversas] = useState<ChannelConversation[]>([]);
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<ChannelMessage[]>([]);
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const fim = useRef<HTMLDivElement | null>(null);

  const aberta = useMemo(
    () => conversas.find((c) => c.id === abertaId) ?? null,
    [conversas, abertaId],
  );

  const carregarConversas = useCallback(async () => {
    setCarregando(true);
    try {
      const lista = await channelsApi.listConversations('instagram');
      setConversas(lista);
      setAbertaId((atual) => atual ?? lista[0]?.id ?? null);
    } catch {
      toast.error('Não foi possível carregar o direct agora.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregarConversas(); }, [carregarConversas]);

  useEffect(() => {
    if (!abertaId) return;
    let vivo = true;
    channelsApi.listMessages('instagram', abertaId)
      .then((lista) => { if (vivo) setMensagens(lista); })
      .catch(() => { if (vivo) toast.error('Não deu para abrir a conversa.'); });
    void channelsApi.markRead('instagram', abertaId).catch(() => { /* ler é secundário */ });
    return () => { vivo = false; };
  }, [abertaId]);

  useEffect(() => { fim.current?.scrollIntoView?.({ block: "end" }); }, [mensagens]);

  // A janela conta da última mensagem DO CLIENTE — resposta da loja não reabre.
  const ultimaDoCliente = useMemo(() => {
    const entrada = [...mensagens].reverse().find((m) => m.direction === 'inbound');
    return entrada?.createdAt ?? (aberta?.lastMessageAt ?? null);
  }, [mensagens, aberta]);

  const janela = estadoDaJanela(ultimaDoCliente);

  const enviar = async () => {
    if (!abertaId || !texto.trim() || !janela.podeResponder) return;
    setEnviando(true);
    try {
      const nova = await channelsApi.sendMessage('instagram', abertaId, { text: texto.trim() });
      setMensagens((atuais) => [...atuais, nova]);
      setTexto('');
    } catch {
      toast.error('A Meta recusou o envio. A janela de resposta pode ter fechado.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-72 shrink-0 flex-col border-r border-border-token bg-surface-token">
        <header className="flex items-center gap-2 border-b border-border-token px-4 py-3">
          <InstagramIcon className="h-5 w-5" aria-hidden />
          <h2 className="text-sm font-semibold text-fg-token">Direct</h2>
        </header>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {conversas.map((c) => (
            <ConversaNaLista
              key={c.id}
              conversa={c}
              ativa={c.id === abertaId}
              onClick={() => setAbertaId(c.id)}
            />
          ))}
        </ul>
      </aside>

      <section className="flex min-h-0 flex-1 flex-col bg-surface-muted-token">
        {!carregando && !conversas.length ? (
          <div className="m-auto max-w-sm p-8 text-center">
            <p className="text-base font-semibold text-fg-token">Nenhuma conversa no direct</p>
            <p className="mt-1 text-sm text-fg-muted-token">
              Quando alguém mandar mensagem para o Instagram da loja — ou responder a uma promoção
              de comentário — a conversa aparece aqui.
            </p>
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between border-b border-border-token bg-surface-token px-5 py-3">
              <div>
                <p className="font-semibold text-fg-token">{aberta?.participantName}</p>
                {aberta?.participantHandle && (
                  <p className="text-xs text-fg-muted-token">@{aberta.participantHandle}</p>
                )}
              </div>
            </header>

            <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-5">
              {mensagens.map((m) => <Balao key={m.id} mensagem={m} />)}
              <div ref={fim} />
            </ul>

            <footer className="border-t border-border-token bg-surface-token p-4">
              {janela.aviso && (
                <p
                  className={`mb-2 text-sm ${janela.podeResponder ? 'text-fg-muted-token' : 'text-danger-token'}`}
                  role={janela.podeResponder ? undefined : 'status'}
                >
                  {janela.aviso}
                </p>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  aria-label={`Mensagem para ${aberta?.participantName ?? 'o cliente'}`}
                  className="min-h-11 flex-1 resize-none superficie px-3 py-2 text-sm text-fg-token focus:border-brand focus:outline-none disabled:opacity-60"
                  placeholder={janela.podeResponder ? 'Escreva uma resposta' : 'Fora da janela de resposta'}
                  value={texto}
                  disabled={!janela.podeResponder}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar(); }
                  }}
                />
                <button
                  type="button"
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-50"
                  disabled={!janela.podeResponder || enviando || !texto.trim()}
                  onClick={() => void enviar()}
                >
                  Enviar
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
};

export default DirectPage;
