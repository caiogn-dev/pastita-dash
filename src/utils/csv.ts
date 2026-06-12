// CSV pt-BR: separador ';' e vírgula decimal — abre direto no Excel brasileiro.

export interface CsvColumn {
  key: string;
  label: string;
}

const escapeCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  let str: string;
  if (typeof value === 'number') {
    str = String(value).replace('.', ',');
  } else {
    str = String(value);
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
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
