import type { WizardStepDef } from './useOnboardingWizard';
import StepLogo from './steps/StepLogo';
import StepProduct from './steps/StepProduct';
import StepDelivery from './steps/StepDelivery';
import StepHours from './steps/StepHours';
import StepWhatsApp from './steps/StepWhatsApp';

export function buildWizardSteps(storeId: string): WizardStepDef[] {
  return [
    { key: 'logo', title: 'Adicione a logo da sua loja', render: ({ onSaved }) => <StepLogo storeId={storeId} onSaved={onSaved} /> },
    { key: 'product', title: 'Cadastre seu 1º produto', render: ({ onSaved }) => <StepProduct storeId={storeId} onSaved={onSaved} /> },
    { key: 'delivery', title: 'Configure a entrega', render: ({ onSaved }) => <StepDelivery storeId={storeId} onSaved={onSaved} /> },
    { key: 'hours', title: 'Defina o horário', render: ({ onSaved }) => <StepHours storeId={storeId} onSaved={onSaved} /> },
    { key: 'whatsapp', title: 'Informe seu WhatsApp', render: ({ onSaved }) => <StepWhatsApp storeId={storeId} onSaved={onSaved} /> },
  ];
}
