/**
 * TimeSeriesChart — gráfico de série temporal reutilizável (base de Relatórios).
 *
 * Uma única série (magnitude ao longo do tempo): sem legenda, o título nomeia a
 * série. Eixos e grade são "recessivos" e seguem o tema por `currentColor` — a
 * cor do texto vem do container, então funciona em claro e escuro sem hardcode.
 * A cor da série é parâmetro (default = ouro da marca, `var(--brand)`).
 *
 * ── POR QUE É SVG PRÓPRIO E NÃO RECHARTS ────────────────────────────────────
 * O recharts custava 110 kB comprimidos — o maior peso do painel — para DOIS
 * componentes. O que se usa dele aqui é área, barra, dois eixos, grade e
 * tooltip: nada que o SVG não faça em algumas dezenas de linhas.
 *
 * As props continuam EXATAMENTE as mesmas: os seis chamadores não mudaram uma
 * linha. `TimeSeriesChart.contrato.test.tsx` guarda isso.
 *
 * O desenho é feito num `viewBox` fixo com `preserveAspectRatio="none"`, então
 * ele acompanha a largura do pai sem medir nada em JavaScript — era o
 * `ResponsiveContainer` do recharts que exigia medição, e é por isso que o
 * gráfico antigo não renderizava em teste nenhum.
 */
import React, { useId, useMemo, useState } from 'react';
import { useTracoQueDesenha } from '../../hooks/useTracoQueDesenha';

export interface TimeSeriesChartProps {
  // Aceita qualquer linha de dados com as chaves x/y.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  /** chave do eixo X (categoria/tempo). */
  xKey: string;
  /** chave numérica do eixo Y. */
  yKey: string;
  /** nome da série (tooltip + aria). */
  label: string;
  /** cor da série. Default: cor da marca. */
  color?: string;
  type?: 'area' | 'bar';
  height?: number;
  /** formata o valor no tooltip (detalhe completo). */
  valueFormat?: (v: number) => string;
  /** formata o tick do eixo Y (compacto). Default: = valueFormat. */
  yTickFormat?: (v: number) => string;
  /** formata o rótulo do eixo X (tick). */
  xTickFormat?: (v: string) => string;
  /** formata o rótulo (data) no cabeçalho do tooltip. */
  tooltipLabelFormat?: (v: string) => string;
}

const defaultValueFormat = (v: number) => new Intl.NumberFormat('pt-BR').format(v);

// Coordenadas internas. O viewBox é fixo; o CSS estica.
const L = 640;   // largura
const A = 320;   // altura
const M = { topo: 12, dir: 12, baixo: 26, esq: 56 };
const AREA_L = L - M.esq - M.dir;
const AREA_A = A - M.topo - M.baixo;

/** Três marcas no eixo vertical: piso, meio e teto. Mais que isso vira grade. */
const marcasDoEixoY = (max: number) => [0, max / 2, max];

/**
 * Quantos rótulos o eixo X aguenta sem virar ruído.
 *
 * 01/set/2026: com 28 dias o eixo da home mostrava `0… 0… 0… 1… 1… 2… 3…`.
 * Cada rótulo recebia 21px e "04/08" precisa de 32px, então `.truncate` cortava
 * tudo no primeiro dígito — e como todo dia do mês começa com 0, 1, 2 ou 3, o
 * eixo inteiro virou uma fileira de zeros.
 *
 * O número é fixo de propósito: este componente não mede nada em JavaScript
 * (foi medir que impedia o gráfico antigo de renderizar em teste), então o
 * limite precisa caber também na largura do celular, não só na do desktop.
 */
const MAX_ROTULOS_X = 7;

/**
 * Índices dos pontos que ganham rótulo — sempre com o PRIMEIRO e o ÚLTIMO.
 *
 * São as pontas que dizem o período do gráfico; sem elas o eixo não situa
 * ninguém. O miolo é distribuído por igual entre as duas.
 */
export const indicesDeRotulo = (total: number, maximo = MAX_ROTULOS_X): number[] => {
  if (total <= 0) return [];
  if (total <= maximo) return Array.from({ length: total }, (_, i) => i);
  const quantidade = Math.max(2, maximo);
  const passo = (total - 1) / (quantidade - 1);
  const escolhidos = new Set<number>();
  for (let i = 0; i < quantidade; i += 1) {
    escolhidos.add(Math.round(i * passo));
  }
  return [...escolhidos].sort((a, b) => a - b);
};

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  xKey,
  yKey,
  label,
  color = 'var(--brand)',
  type = 'area',
  height = 320,
  valueFormat = defaultValueFormat,
  yTickFormat,
  xTickFormat,
  tooltipLabelFormat,
}) => {
  const gradienteId = useId().replace(/:/g, '');
  const [ativo, setAtivo] = useState<number | null>(null);
  const formatarEixo = yTickFormat ?? valueFormat;
  const indicesVisiveis = useMemo(
    () => new Set(indicesDeRotulo(data.length)),
    [data.length],
  );

  const pontos = useMemo(() => {
    const valores = data.map((d) => Number(d?.[yKey]) || 0);
    // Série toda em zero existe (loja sem venda no período) e não pode dividir
    // por zero nem colar tudo no topo.
    const max = Math.max(...valores, 0) || 1;
    const passo = data.length > 1 ? AREA_L / (data.length - 1) : 0;

    return data.map((linha, i) => {
      const valor = Number(linha?.[yKey]) || 0;
      return {
        i,
        valor,
        rotulo: String(linha?.[xKey] ?? ''),
        x: M.esq + (data.length > 1 ? i * passo : AREA_L / 2),
        y: M.topo + AREA_A - (valor / max) * AREA_A,
        max,
      };
    });
  }, [data, xKey, yKey]);

  const max = pontos[0]?.max ?? 1;

  const linha = useMemo(
    () => pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' '),
    [pontos],
  );
  const area = useMemo(() => {
    if (!pontos.length) return '';
    const base = M.topo + AREA_A;
    return `${linha} L${pontos[pontos.length - 1].x} ${base} L${pontos[0].x} ${base} Z`;
  }, [linha, pontos]);

  const refDaLinha = useTracoQueDesenha<SVGPathElement>([linha]);

  // Um gráfico vazio que finge ser gráfico é pior que nada: quem olha conclui
  // que vendeu zero, quando na verdade não há dado.
  if (!data.length) return null;

  const larguraDaBarra = Math.min(44, (AREA_L / data.length) * 0.6);
  const pontoAtivo = ativo != null ? pontos[ativo] : null;

  // A descrição textual é o gráfico para quem usa leitor de tela.
  const descricao = `${label}: ${pontos
    .map((p) => `${p.rotulo} ${valueFormat(p.valor)}`)
    .join(', ')}`;

  return (
    <div className="relative text-fg-muted-token" style={{ height: `${height}px` }}>
      <svg
        viewBox={`0 0 ${L} ${A}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={descricao}
        className="h-full w-full"
        style={{ color }}
      >
        <defs>
          <linearGradient id={gradienteId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="currentColor" stopOpacity={0.28} />
            <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grade horizontal — recessiva, só para dar altura ao olho. */}
        {marcasDoEixoY(max).map((v) => {
          const y = M.topo + AREA_A - (v / max) * AREA_A;
          return (
            <line
              key={v}
              x1={M.esq} y1={y} x2={L - M.dir} y2={y}
              stroke="currentColor" strokeOpacity={0.12} strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        {type === 'bar' ? (
          pontos.map((p) => {
            const alturaBarra = Math.max(0, M.topo + AREA_A - p.y);
            return (
              <rect
                key={p.i}
                data-barra
                data-ponto
                x={p.x - larguraDaBarra / 2}
                y={p.y}
                width={larguraDaBarra}
                height={alturaBarra}
                rx={4}
                fill="currentColor"
                opacity={ativo == null || ativo === p.i ? 1 : 0.45}
              />
            );
          })
        ) : (
          <>
            <path d={area} fill={`url(#${gradienteId})`} />
            <path
              ref={refDaLinha}
              data-linha
              d={linha}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {pontos.map((p) => (
              <circle
                key={p.i}
                data-ponto
                cx={p.x} cy={p.y}
                r={ativo === p.i ? 4 : 0}
                fill="currentColor"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </>
        )}

        {/* Régua vertical do ponto lido. */}
        {pontoAtivo && (
          <line
            x1={pontoAtivo.x} y1={M.topo} x2={pontoAtivo.x} y2={M.topo + AREA_A}
            stroke="currentColor" strokeOpacity={0.3} vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Alvos de leitura: faixas invisíveis, uma por ponto. O gráfico inteiro
            fica "tocável" mesmo onde a linha não passa. */}
        {pontos.map((p) => (
          <rect
            key={p.i}
            data-alvo
            x={p.x - AREA_L / Math.max(1, data.length) / 2}
            y={M.topo}
            width={AREA_L / Math.max(1, data.length)}
            height={AREA_A}
            fill="transparent"
            onMouseEnter={() => setAtivo(p.i)}
            onMouseLeave={() => setAtivo(null)}
          />
        ))}
      </svg>

      {/* Eixos em HTML, não em SVG: com `preserveAspectRatio="none"` o texto
          dentro do SVG esticaria junto com o desenho e ficaria deformado. */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-0 flex flex-col justify-between text-overline text-fg-muted-token"
          style={{
            top: `${(M.topo / A) * 100}%`,
            height: `${(AREA_A / A) * 100}%`,
            width: `${(M.esq / L) * 100}%`,
          }}
        >
          {[...marcasDoEixoY(max)].reverse().map((v) => (
            <span key={v} className="pr-2 text-right tabular-nums">{formatarEixo(v)}</span>
          ))}
        </div>

        {/* Rótulo ancorado no x do PRÓPRIO ponto, não distribuído por
            `justify-between`: com itens de larguras diferentes o do meio não
            ficava embaixo da sua barra — as pontas alinhavam e o miolo
            escorregava. */}
        <div className="absolute bottom-0 left-0 right-0 h-4">
          {pontos
            .filter((p) => indicesVisiveis.has(p.i))
            .map((p) => (
              <span
                key={p.i}
                data-tick-x
                className="absolute -translate-x-1/2 whitespace-nowrap text-overline text-fg-muted-token"
                style={{ left: `${(p.x / L) * 100}%` }}
              >
                {xTickFormat ? xTickFormat(p.rotulo) : p.rotulo}
              </span>
            ))}
        </div>
      </div>

      {pontoAtivo && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border-token bg-surface-token px-2.5 py-1.5 text-xs shadow-[var(--elev-flutuante)]"
          style={{
            left: `${(pontoAtivo.x / L) * 100}%`,
            top: `${(pontoAtivo.y / A) * 100}%`,
          }}
        >
          <div className="text-fg-muted-token">
            {tooltipLabelFormat ? tooltipLabelFormat(pontoAtivo.rotulo) : pontoAtivo.rotulo}
          </div>
          <div className="font-semibold tabular-nums text-fg-token">
            {valueFormat(pontoAtivo.valor)}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSeriesChart;
