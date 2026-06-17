/**
 * SignupWizard — Onboarding self-service do dono.
 * Rota pública /signup. Passos: 1) Conta+Loja  2) Marca  3) Pronto.
 * Passo 1 cria dono+loja em trial (POST /public/signup/) e já loga.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button, Input } from '../../components/common';
import { getErrorMessage, setAuthToken } from '../../services';
import { useAuthStore } from '../../stores/authStore';
import { signupOwner, saveStoreBranding, SignupResult } from '../../services/onboarding';

const BRAND = '#C7492E';
const BRAND_2 = '#E08A3A';

const TEMPLATES = [
  { value: 'fresh', label: 'Fresh' },
  { value: 'bold', label: 'Bold' },
  { value: 'classic', label: 'Classic' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'dark', label: 'Dark' },
];

const Stepper: React.FC<{ step: number }> = ({ step }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {[1, 2, 3].map((n) => (
      <React.Fragment key={n}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
          style={{
            background: n <= step ? BRAND : '#e5e7eb',
            color: n <= step ? '#fff' : '#9ca3af',
          }}
        >
          {n}
        </div>
        {n < 3 && (
          <div className="w-10 h-1 rounded" style={{ background: n < step ? BRAND : '#e5e7eb' }} />
        )}
      </React.Fragment>
    ))}
  </div>
);

export const SignupWizard: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SignupResult | null>(null);

  // Passo 1
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');

  // Passo 2
  const [primaryColor, setPrimaryColor] = useState('#2D6A4F');
  const [secondaryColor, setSecondaryColor] = useState('#52B788');
  const [logoUrl, setLogoUrl] = useState('');
  const [template, setTemplate] = useState('fresh');

  const submitStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Informe seu nome');
    if (!storeName.trim()) return toast.error('Informe o nome da loja');
    if (!email.trim() && !phone.trim()) return toast.error('Informe email ou celular');
    if (password.length < 8) return toast.error('A senha precisa de pelo menos 8 caracteres');

    setLoading(true);
    try {
      const res = await signupOwner({
        name: name.trim(),
        password,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        store_name: storeName.trim(),
        whatsapp: phone.trim() || undefined,
      });
      setResult(res);
      // loga o dono recém-criado
      setAuth(res.token, { id: String(res.user.id), email: res.user.email });
      setAuthToken(res.token);
      toast.success('Loja criada! Vamos personalizar.');
      setStep(2);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitStep2 = async (skip = false) => {
    if (!result) return;
    setLoading(true);
    try {
      await saveStoreBranding(result.store.id, {
        primary_color: skip ? undefined : primaryColor,
        secondary_color: skip ? undefined : secondaryColor,
        logo_url: skip ? undefined : (logoUrl.trim() || undefined),
        template: skip ? undefined : template,
        onboarding_completed: true,
      });
      setStep(3);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const trialDays = result?.store.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(result.store.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 14;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#FFF5E8' }}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/brand/logo.png" alt="Cardapidex" className="h-12 mb-1" />
          <p className="text-sm" style={{ color: BRAND_2 }}>
            Crie sua loja em minutos · 14 dias grátis
          </p>
        </div>

        <Stepper step={step} />

        {step === 1 && (
          <form onSubmit={submitStep1} className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Sua conta e sua loja</h2>
            <Input label="Seu nome *" value={name} onChange={(e) => setName(e.target.value)} placeholder="João da Silva" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Celular / WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 63 9 9999-0000" />
              <Input label="Email (opcional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            </div>
            <Input label="Senha *" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 8 caracteres" />
            <Input label="Nome da loja *" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Salada do João" />
            <Button type="submit" disabled={loading} className="w-full" style={{ background: BRAND }}>
              {loading ? 'Criando...' : 'Criar minha loja'}
            </Button>
            <p className="text-center text-sm text-gray-500">
              Já tem conta?{' '}
              <button type="button" className="font-medium" style={{ color: BRAND }} onClick={() => navigate('/login')}>
                Entrar
              </button>
            </p>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">A cara da sua loja</h2>
            <p className="text-sm text-gray-500">Você pode mudar tudo isso depois no painel.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor primária</label>
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full h-10 rounded-md border border-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor secundária</label>
                <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-full h-10 rounded-md border border-gray-300" />
              </div>
            </div>
            <Input label="URL do logo (opcional)" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
              <select value={template} onChange={(e) => setTemplate(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                {TEMPLATES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" disabled={loading} className="flex-1" style={{ background: BRAND }} onClick={() => submitStep2(false)}>
                {loading ? 'Salvando...' : 'Salvar e continuar'}
              </Button>
              <Button type="button" variant="secondary" disabled={loading} onClick={() => submitStep2(true)}>
                Pular
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-4 py-4">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-bold text-gray-900">Sua loja está no ar!</h2>
            <p className="text-gray-600">
              Você tem <strong style={{ color: BRAND }}>{trialDays} dias grátis</strong>. Agora cadastre seu
              cardápio, configure entrega e conecte o WhatsApp pelo painel.
            </p>
            <Button type="button" className="w-full" style={{ background: BRAND }} onClick={() => navigate('/')}>
              Ir para o painel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignupWizard;
