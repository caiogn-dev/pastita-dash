/**
 * Catraca "sem manual na tela" (regra do dono, 28/09/2026): "algo que é bom
 * não precisa de descrição". Um parágrafo apagado (text-fg-muted-token) com
 * 60+ caracteres e pontuação de frase é texto ensinando a usar a tela. A dica
 * curta mora no `title` do ícone; o botão diz o que faz.
 *
 * Regra: nenhum arquivo pode ter MAIS parágrafos explicativos do que na linha
 * de base. Arquivo novo nasce com zero. Limpou uma página? `npm run manual:baseline`.
 * Mensagens de erro e de vazio ("Nenhum pedido ainda") ficam de fora: o padrão
 * ignora parágrafos com role="alert" e os que começam com "Não foi possível".
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

const SRC = join(__dirname, '..', '..');
const PARAGRAFO = /<p([^>]*)>([\s\S]*?)<\/p>/g;
const DESCRICAO = /\b(descricao|hint|helperText)=\{?["'`]([^"'`]{60,})["'`]/g;

function arquivos(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      if (nome === '__tests__' || nome === 'node_modules') continue;
      arquivos(caminho, acc);
    } else if (/\.tsx$/.test(nome)) acc.push(caminho);
  }
  return acc;
}

export function contarManual(codigo: string): number {
  let n = 0;
  for (const m of codigo.matchAll(PARAGRAFO)) {
    const attrs = m[1]; const texto = m[2].replace(/<[^>]+>|\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim();
    if (!/text-fg-muted-token/.test(attrs) || /role="(alert|status)"/.test(attrs)) continue;
    if (/\{/.test(m[2])) continue;                       // dado vivo (valor, nome) não é manual
    if (texto.length >= 60 && /[.,]/.test(texto) && !/^(Não foi possível|Tem certeza|Nenhum|Nenhuma)/.test(texto)) n += 1;
  }
  for (const m of codigo.matchAll(DESCRICAO)) {
    const t = m[2];
    if (/\$\{/.test(t)) continue;                                                     // dado vivo
    if (/(falhou|não p[uô]de|não puderam|Não há|Houve um erro|Não foi possível|Tente (de novo|novamente)|aparece[m]? aqui|Conecte )/.test(t)) continue; // erro, vazio, bloqueio
    n += 1;
  }
  return n;
}

export function contarManualNoRepo(): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const arq of arquivos(join(SRC, 'pages'))) {
    const n = contarManual(readFileSync(arq, 'utf8'));
    if (n > 0) contagem[arq.split('/src/')[1]] = n;
  }
  return contagem;
}

describe('sem manual na tela', () => {
  it('nenhuma página ganha parágrafo explicativo além da linha de base', () => {
    const atual = contarManualNoRepo();
    const base = JSON.parse(readFileSync(join(__dirname, 'semManual.baseline.json'), 'utf8')) as Record<string, number>;
    const pioraram = Object.entries(atual)
      .filter(([arq, n]) => n > (base[arq] ?? 0))
      .map(([arq, n]) => `${arq}: ${n} (base ${base[arq] ?? 0})`);
    expect(pioraram).toEqual([]);
  });

  it('a contagem reconhece manual e poupa erro e vazio', () => {
    expect(contarManual('<p className="text-xs text-fg-muted-token">Arraste para mover, puxe as alças para esticar. Setas movem 0,5 mm e Ctrl+Z desfaz.</p>')).toBe(1);
    expect(contarManual('<p className="text-xs text-fg-muted-token">107 mm · 3 × 33</p>')).toBe(0);
    expect(contarManual('<p role="alert" className="text-sm text-fg-muted-token">Não foi possível carregar os pedidos deste período. Verifique a conexão e tente novamente.</p>')).toBe(0);
    expect(contarManual('<p className="text-sm text-fg-muted-token">Não foi possível carregar os pedidos deste período. Verifique a conexão e tente novamente.</p>')).toBe(0);
  });
});
