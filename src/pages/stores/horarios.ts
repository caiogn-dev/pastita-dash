/**
 * Horário da loja: turnos por dia e pausas programadas.
 *
 * Contrato do server2 (`horario_de_funcionamento.py`):
 *   operating_hours[dia] = { is_open, open, close, intervals? }
 *   metadata.pausas      = [{ inicio, fim, motivo }]   ISO com fuso
 *
 * Com dois turnos, `open`/`close` continuam gravados como o ENVELOPE do dia
 * (abre no primeiro, fecha no último): quem ainda lê só esses dois campos vê
 * um horário plausível em vez de nada.
 */
export interface Turno { open: string; close: string }
export interface DayHours { is_open: boolean; open: string; close: string; intervals?: Turno[] }
export type OperatingHours = Record<string, DayHours>;

export interface Pausa {
  /** `datetime-local` (AAAA-MM-DDTHH:MM), no fuso de Brasília. */
  inicio: string;
  fim: string;
  motivo: string;
}

const minutos = (hhmm: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export function turnosDoDia(dia: DayHours): Turno[] {
  if (dia.intervals && dia.intervals.length > 0) return dia.intervals.map((t) => ({ ...t }));
  return [{ open: dia.open, close: dia.close }];
}

export function comTurnos(dia: DayHours, turnos: Turno[]): DayHours {
  // Turno ainda sem hora vai para o FIM: ordenado como 00:00, o turno recém-
  // adicionado pulava para o topo e trocava de lugar com o que se editava.
  const chave = (t: Turno) => minutos(t.open) ?? Number.POSITIVE_INFINITY;
  const ordenados = [...turnos].sort((a, b) => chave(a) - chave(b));
  const { intervals: _antigos, ...resto } = dia;
  const primeiro = ordenados[0] ?? { open: dia.open, close: dia.close };
  const ultimo = ordenados[ordenados.length - 1] ?? primeiro;
  const base = { ...resto, open: primeiro.open, close: ultimo.close };
  return ordenados.length > 1 ? { ...base, intervals: ordenados } : base;
}

export function problemaDosTurnos(turnos: Turno[]): string | null {
  const faixas: Array<[number, number]> = [];
  for (const t of turnos) {
    const a = minutos(t.open);
    const f = minutos(t.close);
    if (a === null || f === null) return 'Preencha a hora de abrir e de fechar.';
    if (f <= a) return 'Um turno fecha antes de abrir.';
    faixas.push([a, f]);
  }
  faixas.sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < faixas.length; i++) {
    if (faixas[i][0] < faixas[i - 1][1]) return 'Os turnos se sobrepõem.';
  }
  return null;
}

/** Copia o horário de `origem` para os outros dias ABERTOS. Dia fechado fica fechado. */
export function copiarParaOsOutrosDias(horas: OperatingHours, origem: string): OperatingHours {
  const modelo = horas[origem];
  if (!modelo) return horas;
  const novo: OperatingHours = {};
  for (const [dia, h] of Object.entries(horas)) {
    novo[dia] = dia !== origem && h.is_open
      ? { ...modelo, intervals: modelo.intervals?.map((t) => ({ ...t })) }
      : h;
    if (novo[dia].intervals === undefined) delete novo[dia].intervals;
  }
  return novo;
}

// ── Pausas ────────────────────────────────────────────────────────────────

const FUSO = '-03:00';
const MOTIVO_MAX = 255;

/** ISO do servidor → valor do `datetime-local` (hora de Brasília). */
const paraCampo = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

export function lerPausas(metadata: Record<string, unknown> | null | undefined): Pausa[] {
  const brutas = (metadata?.pausas ?? []) as Array<Record<string, unknown>>;
  if (!Array.isArray(brutas)) return [];
  return brutas.map((p) => ({
    inicio: paraCampo(String(p?.inicio ?? '')),
    fim: paraCampo(String(p?.fim ?? '')),
    motivo: String(p?.motivo ?? ''),
  }));
}

export function pausaParaGravar(p: Pausa): Pausa {
  return { inicio: `${p.inicio}:00${FUSO}`, fim: `${p.fim}:00${FUSO}`, motivo: p.motivo.trim() };
}

/** Só as que ainda não acabaram: pausa vencida é lixo que o dono teria de limpar. */
export function pausasQueValem(pausas: Pausa[], agora: Date): Pausa[] {
  return pausas.filter((p) => {
    const fim = new Date(`${p.fim}:00${FUSO}`);
    return Number.isNaN(fim.getTime()) || fim > agora;
  });
}

export function problemaDaPausa(p: Pausa): string | null {
  if (!p.inicio || !p.fim) return 'Preencha início e fim da pausa.';
  if (new Date(`${p.fim}:00${FUSO}`) <= new Date(`${p.inicio}:00${FUSO}`)) return 'A pausa termina antes de começar.';
  if (p.motivo.trim().length > MOTIVO_MAX) return `O motivo pode ter até ${MOTIVO_MAX} letras.`;
  return null;
}
