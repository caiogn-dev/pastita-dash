// Regrava a linha de base da catraca de campo/rótulo à mão (src/styles/__tests__/camposCrus.test.ts).
// Rode DEPOIS de migrar uma tela para o kit — a base só pode cair.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
const CAMPO = /<(input|select|textarea)\b/g;
const ROTULO = /<label\b[^>]*className=/g;
function walk(d, acc = []) { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (n === '__tests__' || n === 'node_modules' || p === join('src', 'components', 'ui')) continue; walk(p, acc); } else if (/\.tsx$/.test(n)) acc.push(p); } return acc; }
const out = {}; for (const f of walk('src')) { const s = readFileSync(f, 'utf8'); const n = (s.match(CAMPO) || []).length + (s.match(ROTULO) || []).length; if (n > 0) out[f.replace(/^src\//, '')] = n; }
writeFileSync('src/styles/__tests__/camposCrus.baseline.json', JSON.stringify(out, null, 2) + '\n');
console.log('arquivos:', Object.keys(out).length, 'campos/rótulos à mão:', Object.values(out).reduce((a, b) => a + b, 0));
