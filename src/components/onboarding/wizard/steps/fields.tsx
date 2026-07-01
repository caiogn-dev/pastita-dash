/**
 * Campos compartilhados dos steps do wizard — visual dark-luxe consistente.
 * MoneyInput (prefixo R$ + máscara BRL), LogoDropzone (arraste/preview),
 * formatBRPhone (máscara de telefone). Mantêm os aria-label esperados.
 */
import { useCallback, useRef, useState, type FC, type ReactNode } from 'react';
import { Image as ImageIcon, UploadCloud, X } from 'lucide-react';

/** Wrapper de campo: rótulo em cima, controle embaixo. */
export const Field: FC<{ label: string; children: ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-fg-token">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-fg-muted-token">{hint}</span>}
  </label>
);

const INPUT_CLS =
  'w-full rounded-lg border border-border-token bg-surface-muted-token px-3 py-2.5 text-fg-token ' +
  'placeholder:text-fg-muted-token/60 outline-none transition-shadow ' +
  'focus:border-brand focus:ring-2 focus:ring-brand/30';

/** Input de texto padronizado. */
export const TextInput: FC<{
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  placeholder?: string;
  type?: string;
}> = ({ value, onChange, ariaLabel, placeholder, type = 'text' }) => (
  <input
    aria-label={ariaLabel}
    type={type}
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    className={INPUT_CLS}
  />
);

/**
 * Input de moeda: mostra prefixo "R$", aceita só dígitos e vírgula/ponto,
 * e reporta o valor cru (string) pro pai converter com Number().
 */
export const MoneyInput: FC<{
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  placeholder?: string;
}> = ({ value, onChange, ariaLabel, placeholder = '0,00' }) => {
  function handle(raw: string) {
    // mantém dígitos, vírgula e ponto; normaliza vírgula -> ponto pro Number()
    const cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.');
    // no máximo um ponto decimal
    const parts = cleaned.split('.');
    const norm = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    onChange(norm);
  }
  return (
    <div className="flex items-center rounded-lg border border-border-token bg-surface-muted-token transition-shadow focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
      <span className="select-none pl-3 pr-2 text-sm font-medium text-fg-muted-token">R$</span>
      <input
        aria-label={ariaLabel}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => handle(e.target.value)}
        className="w-full rounded-r-lg bg-transparent py-2.5 pr-3 text-fg-token outline-none placeholder:text-fg-muted-token/60"
      />
    </div>
  );
};

/** (63) 99999-8888 — máscara progressiva de celular BR. */
export function formatBRPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Dropzone da logo: área tracejada clicável + drag-and-drop + preview.
 * Reporta o File selecionado; o pai faz o upload.
 */
export const LogoDropzone: FC<{ file: File | null; onFile: (f: File | null) => void }> = ({ file, onFile }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const pick = useCallback((f: File | null) => {
    onFile(f);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
  }, [onFile]);

  if (file && preview) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-border-token bg-surface-muted-token p-3">
        <img src={preview} alt="Prévia da logo" className="h-16 w-16 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-fg-token">{file.name}</p>
          <p className="text-xs text-fg-muted-token">{(file.size / 1024).toFixed(0)} KB</p>
        </div>
        <button
          type="button"
          aria-label="Remover logo"
          onClick={() => pick(null)}
          className="rounded-lg p-2 text-fg-muted-token transition-colors hover:bg-surface-token hover:text-fg-token"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0] ?? null); }}
      className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
        drag ? 'border-brand bg-brand/5' : 'border-border-token bg-surface-muted-token hover:border-brand/60'
      }`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-token text-brand">
        {drag ? <UploadCloud className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
      </span>
      <span className="text-sm font-medium text-fg-token">Clique ou arraste sua logo</span>
      <span className="text-xs text-fg-muted-token">PNG, JPG ou WebP</span>
      <input
        ref={inputRef}
        aria-label="Logo"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
    </button>
  );
};
