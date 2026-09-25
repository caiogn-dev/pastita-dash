// Regrava a linha de base da catraca de cor crua (src/styles/__tests__/coresCruas.test.ts).
// Rode DEPOIS de migrar uma página — a base só pode cair.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
const RE = /\b(bg|text|border|ring|from|to|via)-(gray|slate|zinc|neutral|stone|blue|green|red|yellow|purple|indigo|pink|amber|emerald|orange|teal|rose|violet|cyan|sky|lime|fuchsia)-(50|100|200|300|400|500|600|700|800|900|950)\b/g;
function walk(d, acc = []) { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (n === '__tests__' || n === 'node_modules') continue; walk(p, acc); } else if (/\.tsx$/.test(n)) acc.push(p); } return acc; }
const out = {}; for (const f of walk('src')) { const n = (readFileSync(f, 'utf8').match(RE) || []).length; if (n > 0) out[f.replace(/^src\//, '')] = n; }
writeFileSync('src/styles/__tests__/coresCruas.baseline.json', JSON.stringify(out, null, 2) + '\n');
console.log('arquivos:', Object.keys(out).length, 'cores cruas:', Object.values(out).reduce((a, b) => a + b, 0));
