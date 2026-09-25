import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { Input, Select } from '../../../../../components/ui';
import { tempoDeEnvio } from '../previaDaMensagem';

/** O recorte do formulário que a revisão mostra e deixa mexer. */
interface DadosEditaveis {
  name: string;
  description: string;
  messageType: 'template' | 'text';
  textContent: string;
  scheduledAt: string;
  messagesPerMinute: number;
  mediaUrl?: string;
}

interface Props {
  formData: DadosEditaveis;
  /** Só os campos que ESTA tela edita — nome e velocidade. */
  setFormData: React.Dispatch<React.SetStateAction<DadosEditaveis>>;
  recipientCount: number;
}

const VELOCIDADES = [
  { valor: '30', rotulo: '30 por minuto — mais cuidadoso' },
  { valor: '60', rotulo: '60 por minuto — recomendado' },
  { valor: '120', rotulo: '120 por minuto — mais rápido' },
];

/**
 * Último passo: a conferência antes de gastar.
 *
 * O QUE sai, PARA QUANTOS e POR ONDE agora ficam na coluna ao lado (prévia +
 * resumo), visíveis em todos os passos. Aqui sobra só o que se decide no fim:
 * o nome para achar a campanha depois e a velocidade do disparo. E o aviso de
 * consentimento — depois do clique a mensagem é paga e não volta atrás.
 */
export const PassoDaRevisao: React.FC<Props> = ({ formData, setFormData, recipientCount }) => {
  const tempo = tempoDeEnvio(recipientCount, formData.messagesPerMinute);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h2 className="text-lg font-semibold text-fg-token">Confira e envie</h2>
        <p className="mt-1 text-body text-fg-muted-token">
          Veja a prévia ao lado. Depois do envio, a mensagem não volta atrás.
        </p>
      </header>

      <Input
        label="Nome da campanha"
        value={formData.name}
        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
        placeholder="Ex.: Promoção de janeiro"
        helperText="Só você vê. Ajuda a achar a campanha depois."
      />

      <div className="flex flex-col gap-1">
        <Select
          rotulo="Velocidade de envio"
          opcoes={VELOCIDADES}
          valor={String(formData.messagesPerMinute)}
          onMudar={(v) => setFormData((prev) => ({ ...prev, messagesPerMinute: Number(v) }))}
        />
        <p className="text-caption text-fg-muted-token">
          {tempo
            ? `O disparo leva ${tempo}. Mais devagar reduz o risco de bloqueio pela Meta.`
            : 'Mais devagar reduz o risco de bloqueio pela Meta.'}
        </p>
      </div>

      {/* O aviso que evita bloqueio da conta. Tokens de alerta, que viram de
          tom sozinhos no escuro. */}
      <div
        role="note"
        className="flex items-start gap-2.5 rounded-lg bg-warning-soft p-3"
      >
        <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-warning-token" aria-hidden />
        <p className="text-body text-warning-token">
          Envie só para quem aceitou receber mensagens da loja. Mensagem não pedida pode
          bloquear o número na Meta.
        </p>
      </div>
    </div>
  );
};
