/**
 * BalaoDeWhatsApp — a mensagem como o cliente vê, dentro de uma conversa.
 *
 * `PhonePreview` é iframe de URL (a vitrine pública). Uma mensagem de
 * campanha não tem URL: é texto, imagem, rodapé e botões de template. Este
 * componente desenha só isso — cabeçalho da conversa com o remetente, o balão
 * e os botões embaixo dele.
 *
 * DECISÕES
 *
 * - O balão é o de mensagem RECEBIDA. Do lado do cliente, a campanha chega;
 *   não é ele quem envia. De quebra, o balão recebido é neutro (superfície),
 *   e o verde do WhatsApp não briga com o dourado do painel.
 * - Formatação do WhatsApp (`*negrito*`, `_itálico_`, `~riscado~`) vira
 *   marcação de verdade. Sem isso a prévia mostra asteriscos que o cliente
 *   nunca vê.
 * - Variável que sobrou (`{{1}}`) vira `<mark>`: é o sinal de que algo vai
 *   sair em branco. Escondê-la deixaria a prévia bonita e o envio quebrado.
 * - Sem `aria-live`: a prévia muda a cada tecla, e anunciar cada tecla ao
 *   leitor de tela seria ruído. O campo de texto já é a fonte.
 *
 * Tudo em tokens (`bg-surface`, `bg-surface-2`, `text-fg-token`…): o balão
 * vive nos dois temas sem nenhuma variante escrita à mão para o escuro.
 */
import React, { Fragment } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';

import { cn } from '../../utils/cn';

export interface BalaoDeWhatsAppProps {
  /** Nome que aparece no topo da conversa — a conta ou a loja. */
  remetente: string;
  /** Linha sob o remetente (o número, por exemplo). */
  detalheDoRemetente?: string;
  /** Texto final, já com as variáveis trocadas. Aceita a formatação do WhatsApp. */
  texto: string;
  /** Título de template (cabeçalho de texto). */
  cabecalho?: string;
  /** O template pede imagem no cabeçalho; sem `imagemUrl`, reserva o espaço. */
  cabecalhoDeImagem?: boolean;
  imagemUrl?: string;
  rodape?: string;
  /** Rótulos dos botões de resposta/link do template. */
  botoes?: string[];
  /** Hora exibida no balão. Padrão: a hora atual. */
  horario?: string;
  /** O que dizer quando ainda não há texto nem imagem. */
  textoVazio?: string;
  carregando?: boolean;
  /** Legenda sob a conversa (de quem é o exemplo, por exemplo). */
  legenda?: React.ReactNode;
  className?: string;
}

const horaAgora = () =>
  new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** `*negrito*`, `_itálico_`, `~riscado~` e `{{variável}}` sobrando. */
const MARCAS = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|{{\s*[a-zA-Z0-9_]+\s*}})/g;

function formatarComoWhatsApp(texto: string): React.ReactNode[] {
  return texto.split(MARCAS).map((parte, i) => {
    if (!parte) return null;
    const miolo = parte.slice(1, -1);
    if (parte.startsWith('{{')) {
      return (
        <mark
          key={i}
          title="Sem valor de exemplo para esta variável"
          className="rounded-sm bg-warning-soft px-0.5 text-warning-token"
        >
          {parte}
        </mark>
      );
    }
    if (parte.length > 2 && parte.startsWith('*') && parte.endsWith('*')) return <strong key={i}>{miolo}</strong>;
    if (parte.length > 2 && parte.startsWith('_') && parte.endsWith('_')) return <em key={i}>{miolo}</em>;
    if (parte.length > 2 && parte.startsWith('~') && parte.endsWith('~')) return <s key={i}>{miolo}</s>;
    return <Fragment key={i}>{parte}</Fragment>;
  });
}

export const BalaoDeWhatsApp: React.FC<BalaoDeWhatsAppProps> = ({
  remetente,
  detalheDoRemetente,
  texto,
  cabecalho,
  cabecalhoDeImagem = false,
  imagemUrl,
  rodape,
  botoes = [],
  horario,
  textoVazio = 'A mensagem aparece aqui enquanto você escreve.',
  carregando = false,
  legenda,
  className,
}) => {
  const temConteudo = Boolean(texto.trim() || imagemUrl || cabecalho || cabecalhoDeImagem);
  const inicial = remetente.trim().charAt(0).toUpperCase() || '?';

  return (
    <figure aria-label="Prévia da mensagem" className={cn('superficie overflow-hidden', className)}>
      {/* Topo da conversa: quem manda. É o que o cliente lê antes da mensagem. */}
      <div className="flex items-center gap-3 border-b border-border-token px-4 py-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-body font-semibold text-brand-ink"
        >
          {inicial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-body font-semibold text-fg-token">{remetente}</p>
          {detalheDoRemetente && (
            <p className="truncate text-caption text-fg-muted-token">{detalheDoRemetente}</p>
          )}
        </div>
      </div>

      {/* O fundo da conversa. */}
      <div className="flex min-h-[14rem] flex-col items-start gap-1 bg-surface-2 px-3 py-4">
        {carregando ? (
          <div
            role="status"
            className="w-4/5 space-y-2 rounded-lg rounded-tl-sm bg-surface p-3 shadow-repouso"
          >
            <span className="sr-only">Carregando a prévia…</span>
            <span aria-hidden className="block h-3 w-3/4 rounded bg-surface-2 motion-safe:animate-pulse" />
            <span aria-hidden className="block h-3 w-full rounded bg-surface-2 motion-safe:animate-pulse" />
            <span aria-hidden className="block h-3 w-1/2 rounded bg-surface-2 motion-safe:animate-pulse" />
          </div>
        ) : !temConteudo ? (
          <p className="m-auto max-w-[16rem] text-center text-caption text-fg-muted-token">
            {textoVazio}
          </p>
        ) : (
          <>
            <div className="w-fit min-w-[8rem] max-w-[85%] rounded-lg rounded-tl-sm bg-surface p-1 shadow-repouso">
              {imagemUrl ? (
                <img
                  src={imagemUrl}
                  alt="Imagem da mensagem"
                  className="mb-1 aspect-square w-full rounded-md object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : cabecalhoDeImagem ? (
                <div className="mb-1 flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-md bg-surface-2 text-caption text-fg-muted-token">
                  <PhotoIcon className="h-6 w-6" aria-hidden />
                  Imagem do cabeçalho
                </div>
              ) : null}

              <div className="px-2 pb-1 pt-1">
                {cabecalho && (
                  <p className="mb-1 break-words text-body font-semibold text-fg-token">
                    {formatarComoWhatsApp(cabecalho)}
                  </p>
                )}
                {texto.trim() && (
                  <p className="whitespace-pre-wrap break-words text-body text-fg-token">
                    {formatarComoWhatsApp(texto)}
                  </p>
                )}
                {rodape && (
                  <p className="mt-1 break-words text-caption text-fg-muted-token">{rodape}</p>
                )}
                <p className="mt-0.5 text-right text-badge tabular-nums text-fg-muted-token">
                  {horario ?? horaAgora()}
                </p>
              </div>
            </div>

            {/* Botões do template: no WhatsApp eles vêm soltos, sob o balão. */}
            {botoes.length > 0 && (
              <ul className="flex w-fit min-w-[8rem] max-w-[85%] flex-col gap-1">
                {botoes.map((b, i) => (
                  <li
                    key={`${b}-${i}`}
                    className="rounded-lg bg-surface px-3 py-2 text-center text-body font-medium text-brand-ink shadow-repouso"
                  >
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {legenda && (
        <figcaption className="border-t border-border-token px-4 py-2.5 text-caption text-fg-muted-token">
          {legenda}
        </figcaption>
      )}
    </figure>
  );
};

BalaoDeWhatsApp.displayName = 'BalaoDeWhatsApp';

export default BalaoDeWhatsApp;
