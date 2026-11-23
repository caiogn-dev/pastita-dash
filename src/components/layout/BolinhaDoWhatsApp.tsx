/**
 * Bolinha do WhatsApp: responder o cliente sem sair da tela em que se está —
 * o mesmo gesto da bolinha do iFood, para o WhatsApp da loja.
 *
 * Não é um chat novo: usa o mesmo store (`chatStore`), o mesmo WebSocket, os
 * mesmos balões e o mesmo envio do Inbox. O que muda é só a navegação: lista →
 * conversa → responder, numa janela no canto. Para o resto (pedido, bot,
 * respostas rápidas) há "Abrir no Inbox".
 *
 * Fica fora do Inbox (lá seria a mesma tela duas vezes) e do celular (lá o
 * Inbox já é uma aba).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { conversationsService } from '../../services/conversations';
import * as whatsappService from '../../services/whatsapp';
import { getErrorMessage } from '../../services';
import { useWhatsAppWsContext } from '../../context/WhatsAppWsContext';
import { useChatStore } from '../../stores/chatStore';
import { useStore } from '../../hooks/useStore';
import { useIsMobileViewport } from '../../mobile/useIsMobileViewport';
import { MessageBubble } from '../chat/MessageBubble';
import { messageToBubbleProps } from '../chat/messageToBubbleProps';
import { formatConversationTime } from '../../utils/chatTime';
import { formatPhone } from '../../utils/formatters';
import type { Conversation, Message } from '../../types';

const QUANTAS = 30;
const SEM_MENSAGENS: Message[] = [];

const nomeDe = (c: Conversation) => c.contact_name || formatPhone(c.phone_number);

export const BolinhaDoWhatsApp: React.FC = () => {
  const { pathname } = useLocation();
  const isMobile = useIsMobileViewport();
  const noInbox = pathname.startsWith('/inbox');
  if (noInbox || isMobile) return null;
  return <Bolinha />;
};

const Bolinha: React.FC = () => {
  const navigate = useNavigate();
  const { storeSlug } = useStore();
  const ws = useWhatsAppWsContext();
  const conversas = useChatStore((s) => s.conversations);
  const [aberta, setAberta] = useState(false);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const mensagens = useChatStore((s) => (conversaId ? s.messagesCache[conversaId] : undefined)) ?? SEM_MENSAGENS;
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  const naoLidas = conversas.reduce((t, c) => t + (c.unread_count || 0), 0);
  const conversa = conversas.find((c) => c.id === conversaId) ?? null;

  // Lista da loja: carrega ao entrar e a cada 60 s (o WebSocket cuida do resto).
  useEffect(() => {
    if (!storeSlug) return;
    let vivo = true;
    const carregar = () => conversationsService
      .getConversations({ store: storeSlug, page: 1, page_size: QUANTAS })
      .then((r) => { if (vivo) useChatStore.getState().setConversations(r?.results ?? []); })
      .catch(() => { /* bolinha sem lista: segue o painel */ });
    void carregar();
    const t = setInterval(() => { if (!document.hidden) void carregar(); }, 60_000);
    return () => { vivo = false; clearInterval(t); };
  }, [storeSlug]);

  // Conversa aberta: assina o canal e segura a seleção (WS não conta como não lida).
  useEffect(() => {
    if (!conversaId) return;
    useChatStore.getState().setSelectedConversation(conversaId);
    ws.subscribeToConversation(conversaId);
    return () => {
      ws.unsubscribeFromConversation(conversaId);
      if (useChatStore.getState().selectedConversationId === conversaId) {
        useChatStore.getState().setSelectedConversation(null);
      }
    };
  }, [conversaId, ws]);

  useEffect(() => {
    fimRef.current?.scrollIntoView?.({ block: 'end' });
  }, [mensagens.length, conversaId]);

  const fechar = useCallback(() => { setAberta(false); setConversaId(null); setTexto(''); }, []);

  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberta, fechar]);

  const entrar = async (c: Conversation) => {
    setConversaId(c.id);
    setTexto('');
    useChatStore.getState().markConversationAsRead(c.id);
    if (c.unread_count) conversationsService.markAsRead(c.id).catch(() => {});
    try {
      const { results } = await conversationsService.getMessages(c.id);
      useChatStore.getState().setMessages(c.id, results);
    } catch {
      toast.error('Erro ao carregar mensagens');
    }
  };

  const enviar = async () => {
    const corpo = texto.trim();
    if (!conversa || !corpo || enviando) return;
    setEnviando(true);
    try {
      await whatsappService.sendMessage({
        account_id: conversa.account,
        to: conversa.phone_number,
        text: corpo,
        metadata: { client_request_id: crypto.randomUUID(), source: 'bolinha_do_whatsapp' },
      });
      setTexto('');
      const { results } = await conversationsService.getMessages(conversa.id);
      useChatStore.getState().setMessages(conversa.id, results);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || 'Erro ao enviar mensagem');
    } finally {
      setEnviando(false);
    }
  };

  const abrirNoInbox = () => {
    const id = conversaId;
    fechar();
    navigate(id ? `/inbox/whatsapp?conversation=${id}` : '/inbox/whatsapp');
  };

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
      {aberta && (
        <section
          aria-label="WhatsApp"
          className="flex h-[min(600px,calc(100vh-7rem))] w-[380px] flex-col overflow-hidden rounded-2xl border border-border-token bg-surface shadow-2xl"
        >
          <header className="flex items-center gap-2 border-b border-border-token px-3 py-2.5">
            {conversa ? (
              <button type="button" aria-label="Voltar" onClick={() => setConversaId(null)} className="rounded-lg p-1.5 text-fg-muted-token hover:bg-chrome-hover">
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
            ) : (
              <ChatBubbleLeftRightIcon className="ml-1 h-5 w-5 text-[#25D366]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-fg-token">{conversa ? nomeDe(conversa) : 'WhatsApp'}</p>
              {conversa?.contact_name && <p className="truncate text-xs text-fg-muted-token">{formatPhone(conversa.phone_number)}</p>}
            </div>
            <button type="button" aria-label="Abrir no Inbox" title="Abrir no Inbox" onClick={abrirNoInbox} className="rounded-lg p-1.5 text-fg-muted-token hover:bg-chrome-hover">
              <ArrowTopRightOnSquareIcon className="h-5 w-5" />
            </button>
            <button type="button" aria-label="Fechar" onClick={fechar} className="rounded-lg p-1.5 text-fg-muted-token hover:bg-chrome-hover">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </header>

          {conversa ? (
            <>
              <div className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
                {mensagens.map((m) => <MessageBubble key={m.id} {...messageToBubbleProps(m)} />)}
                <div ref={fimRef} />
              </div>
              <form
                className="flex items-end gap-2 border-t border-border-token p-2"
                onSubmit={(e) => { e.preventDefault(); void enviar(); }}
              >
                <textarea
                  aria-label="Mensagem"
                  rows={1}
                  value={texto}
                  autoFocus
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar(); }
                  }}
                  className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-border-token bg-transparent px-3 py-2 text-sm text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <button
                  type="submit"
                  aria-label="Enviar"
                  disabled={!texto.trim() || enviando}
                  className="rounded-xl bg-[#25D366] p-2.5 text-white disabled:opacity-40"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </form>
            </>
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {conversas.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-label={nomeDe(c)}
                    onClick={() => void entrar(c)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-chrome-hover"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#25D366]/15 text-sm font-bold text-[#128C7E]">
                      {nomeDe(c).charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-sm text-fg-token ${c.unread_count ? 'font-bold' : 'font-medium'}`}>{nomeDe(c)}</span>
                        <span className="shrink-0 text-[11px] text-fg-muted-token">{formatConversationTime(c.last_message_at)}</span>
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-fg-muted-token">{c.last_message_preview}</span>
                        {!!c.unread_count && (
                          <span className="shrink-0 rounded-full bg-[#25D366] px-1.5 text-[11px] font-bold text-white">{c.unread_count}</span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <button
        type="button"
        aria-label={naoLidas ? `WhatsApp, ${naoLidas} não lidas` : 'WhatsApp'}
        aria-expanded={aberta}
        onClick={() => (aberta ? fechar() : setAberta(true))}
        className="relative grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {aberta ? <XMarkIcon className="h-6 w-6" /> : <ChatBubbleLeftRightIcon className="h-7 w-7" />}
        {!aberta && naoLidas > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[22px] rounded-full bg-red-600 px-1.5 text-center text-xs font-bold leading-[22px]">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>
    </div>
  );
};

export default BolinhaDoWhatsApp;
