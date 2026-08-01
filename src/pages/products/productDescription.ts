/**
 * Parser da formatação de descrição de produto — MESMAS regras do
 * cardapidex-web (src/utils/productDescription.js). Sintaxe estilo WhatsApp:
 * *negrito*, _itálico_, ~riscado~; linhas com "-" viram lista; "Rótulo:" no
 * início da linha sai em destaque. Render é 100% por segmentos React —
 * nunca dangerouslySetInnerHTML.
 */

export interface InlineSegment {
  style: 'text' | 'bold' | 'italic' | 'strike';
  text: string;
}

export type DescriptionBlock =
  | { type: 'p'; label?: string; text: string }
  | { type: 'ul'; items: string[] };

// "Rótulo: resto" — rótulo curto no início da linha. Limite de 32 chars
// evita capturar frases com ":".
const LABEL_RE = /^([A-Za-zÀ-ÿ0-9][^:\n]{1,31}):\s*(.*)$/;

export function parseDescriptionBlocks(text: string): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  let list: string[] | null = null;

  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) {
      list = null;
      continue;
    }
    if (/^[-•*]\s+/.test(line)) {
      if (!list) {
        list = [];
        blocks.push({ type: 'ul', items: list });
      }
      list.push(line.replace(/^[-•*]\s+/, ''));
      continue;
    }
    list = null;
    const labelMatch = line.match(LABEL_RE);
    if (labelMatch) {
      blocks.push({ type: 'p', label: labelMatch[1], text: labelMatch[2] });
    } else {
      blocks.push({ type: 'p', text: line });
    }
  }
  return blocks;
}

// Sem quebra de linha dentro do marcador — evita que um * solto engula o resto.
const INLINE_RE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;

export function parseInline(text: string): InlineSegment[] {
  const raw = String(text || '');
  const out: InlineSegment[] = [];
  let last = 0;
  for (const match of raw.matchAll(INLINE_RE)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ style: 'text', text: raw.slice(last, index) });
    const token = match[0];
    if (token.startsWith('**')) out.push({ style: 'bold', text: token.slice(2, -2) });
    else if (token.startsWith('*')) out.push({ style: 'bold', text: token.slice(1, -1) });
    else if (token.startsWith('_')) out.push({ style: 'italic', text: token.slice(1, -1) });
    else out.push({ style: 'strike', text: token.slice(1, -1) });
    last = index + token.length;
  }
  if (last < raw.length) out.push({ style: 'text', text: raw.slice(last) });
  return out;
}
