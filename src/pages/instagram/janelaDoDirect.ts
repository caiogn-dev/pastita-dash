/**
 * A janela de resposta do direct.
 *
 * A Meta deixa a loja responder uma DM em até 24 h da última mensagem do
 * cliente. Depois disso o envio é recusado — e o atendente, que não vê regra
 * nenhuma na tela, acha que o painel quebrou.
 */
const VINTE_E_QUATRO_HORAS = 24 * 60 * 60 * 1000;
const AVISAR_A_PARTIR_DE = 2 * 60 * 60 * 1000;

export interface EstadoDaJanela {
  podeResponder: boolean;
  aviso: string;
  horasRestantes: number;
}

export function estadoDaJanela(
  ultimaDoCliente: string | null | undefined,
  agora: string | Date = new Date(),
): EstadoDaJanela {
  if (!ultimaDoCliente) {
    return { podeResponder: false, aviso: '', horasRestantes: 0 };
  }
  const fim = new Date(ultimaDoCliente).getTime() + VINTE_E_QUATRO_HORAS;
  const falta = fim - new Date(agora).getTime();

  if (falta <= 0) {
    return {
      podeResponder: false,
      horasRestantes: 0,
      aviso: 'A janela de 24 h fechou. Só dá para responder se a pessoa escrever de novo.',
    };
  }

  const horas = Math.max(1, Math.round(falta / (60 * 60 * 1000)));
  return {
    podeResponder: true,
    horasRestantes: horas,
    aviso: falta <= AVISAR_A_PARTIR_DE
      ? `${horas === 1 ? 'Falta 1 h' : `Faltam ${horas} h`} para a janela de resposta fechar.`
      : '',
  };
}
