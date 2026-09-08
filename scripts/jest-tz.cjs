/**
 * Executa o Jest com fuso horário fixo.
 *
 * O produto roda no fuso da loja (restaurante brasileiro, America/Sao_Paulo =
 * -03) e várias telas comparam o DIA local de um instante (quadro de pedidos,
 * relatórios, etiquetas). Sem fixar o fuso, a suíte herdava o do runner: verde
 * em dev (-03), mas VERMELHO na CI (ubuntu = UTC) e na Vercel.
 *
 * O V8/ICU lê o fuso UMA vez, no início do processo — por isso fixá-lo em um
 * setup do Jest chega tarde demais (o worker já cacheou UTC). Aqui setamos
 * `TZ` ANTES de carregar o Jest e os workers herdam esse env ao serem criados,
 * tornando as datas reprodutíveis em qualquer máquina, sem dependência nova.
 */
process.env.TZ = 'America/Sao_Paulo';
require('jest').run(process.argv.slice(2));
