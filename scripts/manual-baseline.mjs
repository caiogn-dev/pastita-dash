// Regrava a linha de base da catraca "sem manual na tela" (src/styles/__tests__/semManual.test.ts).
// Rode DEPOIS de limpar uma página — a base só pode cair.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
const PARAGRAFO = /<p([^>]*)>([\s\S]*?)<\/p>/g;
const DESCRICAO = /\b(descricao|hint|helperText)=\{?["'`]([^"'`]{60,})["'`]/g;
function contar(codigo) {
  let n = 0;
  for (const m of codigo.matchAll(PARAGRAFO)) {
    const texto = m[2].replace(/<[^>]+>|\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim();
    if (!/text-fg-muted-token/.test(m[1]) || /role="alert"/.test(m[1])) continue;
    if (/\{/.test(m[2])) continue;                       // dado vivo (valor, nome) não é manual
    if (texto.length >= 60 && /[.,]/.test(texto) && !/^(Não foi possível|Tem certeza|Nenhum|Nenhuma)/.test(texto)) n += 1;
  }
  for (const m of codigo.matchAll(DESCRICAO)) {
    const t = m[2];
    if (/\$\{/.test(t)) continue;                                                     // dado vivo
    if (/(falhou|não p[uô]de|não puderam|Não há|Tente (de novo|novamente)|aparece[m]? aqui|Conecte )/.test(t)) continue; // erro, vazio, bloqueio
    n += 1;
  }
  return n;
}
function walk(d, acc = []) { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (n === '__tests__' || n === 'node_modules') continue; walk(p, acc); } else if (/\.tsx$/.test(n)) acc.push(p); } return acc; }
const out = {}; for (const f of walk('src/pages')) { const n = contar(readFileSync(f, 'utf8')); if (n > 0) out[f.replace(/^src\//, '')] = n; }
writeFileSync('src/styles/__tests__/semManual.baseline.json', JSON.stringify(out, null, 2) + '\n');
console.log('arquivos:', Object.keys(out).length, 'parágrafos explicativos:', Object.values(out).reduce((a, b) => a + b, 0));
