/**
 * Os toques do painel, sintetizados (sem arquivo de áudio para baixar).
 *
 * Sino: duas batidas de campainha de balcão. Metal soa com parciais
 * inarmônicas que somem em tempos diferentes — por isso parece sino e não
 * o "bip" de onda pura de antes, que se perdia no barulho da cozinha.
 * PIX: dois toques curtos subindo, "plim-plim" de caixa — dinheiro entrou.
 */

// Razões das parciais de uma campainha de mesa (fundamental, e as que dão o brilho).
const PARCIAIS = [
  { razao: 1, ganho: 1, queda: 1.6 },
  { razao: 2.76, ganho: 0.45, queda: 0.9 },
  { razao: 5.4, ganho: 0.22, queda: 0.5 },
  { razao: 8.93, ganho: 0.1, queda: 0.3 },
];
const FUNDAMENTAL = 1320;

function batida(ctx: AudioContext, inicio: number, volume: number, fundamental = FUNDAMENTAL) {
  const saida = ctx.createGain();
  saida.gain.value = volume * 0.5;
  saida.connect(ctx.destination);
  for (const p of PARCIAIS) {
    // Duas cópias levemente desafinadas: o "batimento" do metal vibrando.
    for (const desvio of [0, 1.8]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * p.razao + desvio, inicio);
      g.gain.setValueAtTime(0, inicio);
      g.gain.linearRampToValueAtTime(p.ganho / 2, inicio + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, inicio + p.queda);
      osc.connect(g);
      g.connect(saida);
      osc.start(inicio);
      osc.stop(inicio + p.queda + 0.05);
    }
  }
}

export function tocarSino(ctx: AudioContext, volume: number) {
  const agora = ctx.currentTime;
  batida(ctx, agora, volume);
  batida(ctx, agora + 0.32, volume * 0.85);
}

export function tocarPix(ctx: AudioContext, volume: number) {
  const agora = ctx.currentTime;
  [[988, 0], [1480, 0.11]].forEach(([freq, atraso]) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, agora + atraso);
    g.gain.setValueAtTime(0, agora + atraso);
    g.gain.linearRampToValueAtTime(volume * 0.45, agora + atraso + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, agora + atraso + 0.45);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(agora + atraso);
    osc.stop(agora + atraso + 0.5);
  });
}
