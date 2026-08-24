// CSV pt-BR: separador ';' e vírgula decimal — abre direto no Excel brasileiro.

export interface CsvColumn {
  key: string;
  label: string;
}

// Gatilhos de CSV/formula injection: uma célula de TEXTO que começa com um
// destes é executada como fórmula pelo Excel/LibreOffice/Sheets ao abrir o
// arquivo (ex.: =HYPERLINK/cmd exfiltram dados na máquina do lojista). Como os
// exports carregam dados controlados pelo cliente (nome, telefone, e-mail),
// prefixamos "'" para forçar interpretação como texto — OWASP CSV Injection.
// Não se aplica a números (produzidos por nós): um valor negativo precisa
// continuar numérico no Excel.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

const escapeCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  let str: string;
  if (typeof value === 'number') {
    str = String(value).replace('.', ',');
  } else {
    str = String(value);
    if (FORMULA_TRIGGER.test(str)) {
      str = `'${str}`;
    }
  }
  if (/[;"\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const toCsv = <T extends object>(rows: T[], columns: CsvColumn[]): string => {
  const header = columns.map((c) => escapeCell(c.label)).join(';');
  const lines = rows.map((row) =>
    columns.map((c) => escapeCell((row as Record<string, unknown>)[c.key])).join(';'),
  );
  return [header, ...lines].join('\n');
};

export const downloadCsv = (csv: string, filename: string): void => {
  // BOM para o Excel reconhecer UTF-8 (acentos)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
