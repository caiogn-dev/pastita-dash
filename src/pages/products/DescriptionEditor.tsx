/**
 * Editor de descrição com toolbar de formatação + preview ao vivo.
 * A sintaxe é a mesma do cardápio e do WhatsApp (*negrito*, _itálico_,
 * ~riscado~, "- item", "Rótulo:"). O preview renderiza por segmentos React
 * (sem HTML injetado) — o que o lojista vê aqui é o que sai no cardápio.
 */
import { Fragment, useRef, useState, type ReactNode } from 'react';
import { parseDescriptionBlocks, parseInline } from './productDescription';

interface DescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((seg, i) => {
        if (seg.style === 'bold') return <strong key={i}>{seg.text}</strong>;
        if (seg.style === 'italic') return <em key={i}>{seg.text}</em>;
        if (seg.style === 'strike') return <s key={i}>{seg.text}</s>;
        return <Fragment key={i}>{seg.text}</Fragment>;
      })}
    </>
  );
}

export function DescriptionPreview({ text }: { text: string }) {
  const blocks = parseDescriptionBlocks(text);
  if (!blocks.length) {
    return <p className="text-sm text-fg-muted-token italic">O preview aparece aqui conforme você escreve…</p>;
  }
  return (
    <div className="space-y-2 text-sm text-fg-token">
      {blocks.map((block, i) =>
        block.type === 'ul' ? (
          <ul key={i} className="list-disc pl-5 space-y-0.5">
            {block.items.map((item, j) => (
              <li key={j}><InlineText text={item} /></li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            {block.label && <strong>{block.label}: </strong>}
            <InlineText text={block.text} />
          </p>
        )
      )}
    </div>
  );
}

const MARKS: Array<{ id: string; label: ReactNode; title: string; mark: string }> = [
  { id: 'bold', label: <strong>B</strong>, title: 'Negrito (*texto*)', mark: '*' },
  { id: 'italic', label: <em>I</em>, title: 'Itálico (_texto_)', mark: '_' },
  { id: 'strike', label: <s>S</s>, title: 'Riscado (~texto~)', mark: '~' },
];

export default function DescriptionEditor({ value, onChange, rows = 5, placeholder }: DescriptionEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(true);

  const applyMark = (mark: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}${mark}${selected || 'texto'}${mark}${value.slice(end)}`;
    onChange(next);
    // Reposiciona o cursor: seleção formatada fica selecionada; sem seleção,
    // o "texto" placeholder fica selecionado pra digitar por cima.
    requestAnimationFrame(() => {
      el.focus();
      const innerStart = start + mark.length;
      el.setSelectionRange(innerStart, innerStart + (selected || 'texto').length);
    });
  };

  const insertList = () => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: start } = el;
    const prefix = start === 0 || value[start - 1] === '\n' ? '- ' : '\n- ';
    const next = `${value.slice(0, start)}${prefix}${value.slice(start)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  };

  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5">
        {MARKS.map((m) => (
          <button
            key={m.id}
            type="button"
            title={m.title}
            onClick={() => applyMark(m.mark)}
            className="w-8 h-8 flex items-center justify-center rounded border border-border-token bg-surface text-fg-token hover:bg-surface-2 text-sm"
          >
            {m.label}
          </button>
        ))}
        <button
          type="button"
          title="Lista (- item)"
          onClick={insertList}
          className="w-8 h-8 flex items-center justify-center rounded border border-border-token bg-surface text-fg-token hover:bg-surface-2 text-sm"
        >
          ≔
        </button>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="ml-auto text-xs text-fg-muted-token hover:text-fg-token underline"
        >
          {showPreview ? 'Ocultar preview' : 'Mostrar preview'}
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
        placeholder={placeholder}
      />

      {showPreview && (
        <div className="mt-2 rounded border border-border-token bg-surface-2 p-3">
          <p className="overline mb-1.5">
            Preview do cardápio
          </p>
          <DescriptionPreview text={value} />
        </div>
      )}
    </div>
  );
}
