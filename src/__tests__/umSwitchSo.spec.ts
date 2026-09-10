/**
 * ESPECIFICAÇÃO — ligar e desligar é UM controle.
 *
 * O painel tinha SEIS grafias de "ligado/desligado": o `Switch` comum, o
 * `Toggle` do messaging, um pino à mão nas notificações, outro no montador,
 * outro no cadastro do agente e os cartões de entrega/retirada. Três
 * geometrias (h-4/h-5/h-6), quatro cores de desligado (`gray-300`,
 * `border-token`, `surface-2`, `zinc-300`) e três de ligado — verde, ouro e a
 * cor da MARCA DA LOJA, que num painel escuro pinta tudo de vermelho.
 *
 * O custo não é estético. O pino do agente não tinha `role` nem nome: quem usa
 * leitor de tela ouve "botão" e não sabe nem o que é nem se está ligado. E o
 * mesmo gesto com três aparências ensina o operador três vezes.
 *
 * Este teste conta quem ainda desenha o próprio. É a mesma trava do spinner
 * (`semSpinnerArtesanal`) e da tabela.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..');
const O_COMPONENTE = path.join('common', 'Switch.tsx');

/** Quantos arquivos ainda montam o próprio interruptor. */
const TETO = 0;

const arquivos = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : arquivos(p);
    return /\.tsx$/.test(e.name) ? [p] : [];
  });

const semComentarios = (f: string) =>
  fs
    .readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const candidatos = () => arquivos(SRC).filter((f) => !f.endsWith(O_COMPONENTE));

describe('spec: um interruptor só', () => {
  it('nenhuma tela declara o próprio role="switch"', () => {
    const artesanais = candidatos().filter((f) => /role="switch"/.test(semComentarios(f)));
    expect(artesanais.map((f) => path.relative(SRC, f))).toHaveLength(TETO);
  });

  it('nem o pino sem papel — que é o mesmo controle, mudo', () => {
    // O pino: uma trilha `rounded-full` e um miolo que anda com `translate-x`.
    // É esta combinação que se repetia, com ou sem `role`.
    const artesanais = candidatos().filter((f) => {
      const fonte = semComentarios(f);
      // `translate-x-1/2` é o selo de contagem que centra sobre o sino, não
      // um pino: a fração fica de fora.
      return (
        /rounded-full/.test(fonte) &&
        /translate-x-\d+(?!\/)/.test(fonte) &&
        /transition-transform|transition-colors/.test(fonte)
      );
    });
    expect(artesanais.map((f) => path.relative(SRC, f))).toHaveLength(TETO);
  });
});
