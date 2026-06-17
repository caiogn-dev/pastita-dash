/**
 * SignupWizard — Onboarding self-service do dono.
 * Rota pública /cadastro. Passos: 1) Conta+Loja  2) Marca  3) Pronto.
 * Passo 1 cria dono+loja em trial (POST /public/signup/) e já loga.
 *
 * Robustez:
 * - Validação client-side por campo (trim, email, telefone BR, senha >= 8).
 * - Erros de validação do backend ({campo: [msg]}) mapeados para os campos.
 * - Anti-duplo-submit: botão disabled + guarda de `loading`.
 * - Se o passo 1 já criou a loja, retentar o passo 2 NÃO recria a loja.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button, Input } from '../../components/common';
import { setAuthToken } from '../../services';
import { useAuthStore } from '../../stores/authStore';
import {
  signupOwner,
  saveStoreBranding,
  SignupResult,
  SignupValidationError,
  type FieldErrors,
} from '../../services/onboarding';

const BRAND = '#C7492E';
const BRAND_2 = '#E08A3A';

const TEMPLATES = [
  { value: 'fresh', label: 'Fresh' },
  { value: 'bold', label: 'Bold' },
  { value: 'classic', label: 'Classic' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'dark', label: 'Dark' },
];

// Mapeia nomes de campo do backend -> chave do formulário, p/ exibir o erro no input certo.
const API_FIELD_MAP: Record<string, string> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  whatsapp: 'phone',
  password: 'password',
  store_name: 'storeName',
  store_slug: 'storeName',
  logo_url: 'logoUrl',
  primary_color: 'primaryColor',
  secondary_color: 'secondaryColor',
  template: 'template',
};

// Validação básica de email.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Telefone BR: 10 ou 11 dígitos (DDD + número), ignorando máscara. Aceita +55 opcional. */
function isValidBrPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '').replace(/^55/, '');
  return digits.length === 10 || digits.length === 11;
}

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
  const [errors, setErrors] = useState<FieldErrors>({});

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

  const nameRef = useRef<HTMLInputElement>(null);

  // Foco no primeiro campo ao montar / voltar ao passo 1.
  useEffect(() => {
    if (step === 1) nameRef.current?.focus();
  }, [step]);

  // Limpa o erro de um campo assim que o usuário começa a corrigi-lo.
  const clearFieldError = (field: string) =>
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  // Aplica os erros vindos da API nos campos certos; mensagens órfãs viram toast.
  const applyApiErrors = (err: unknown) => {
    if (err instanceof SignupValidationError) {
      const mapped: FieldErrors = {};
      let general = err.fieldErrors._general;
      for (const [apiKey, msg] of Object.entries(err.fieldErrors)) {
        if (apiKey === '_general') continue;
        const formKey = API_FIELD_MAP[apiKey];
        if (formKey) mapped[formKey] = msg;
        else general = general ? `${general} ${msg}` : msg;
      }
      setErrors(mapped);
      if (general) toast.error(general);
      else if (Object.keys(mapped).length === 0) {
        toast.error('Não foi possível concluir o cadastro.');
      }
      return;
    }
    toast.error('Erro inesperado. Tente novamente.');
  };

  const validateStep1 = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!name.trim()) e.name = 'Informe seu nome.';
    if (!storeName.trim()) e.storeName = 'Informe o nome da loja.';

    const hasEmail = !!email.trim();
    const hasPhone = !!phone.trim();
    if (!hasEmail && !hasPhone) {
      e.phone = 'Informe email ou celular.';
    }
    if (hasEmail && !EMAIL_RE.test(email.trim())) {
      e.email = 'Email inválido.';
    }
    if (hasPhone && !isValidBrPhone(phone)) {
      e.phone = 'Celular inválido. Use DDD + número, ex: (63) 99999-0000.';
    }
    if (password.length < 8) {
      e.password = 'A senha precisa de pelo menos 8 caracteres.';
    }
    return e;
  };

  const submitStep1 = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (loading) return; // anti-duplo-submit

    const validation = validateStep1();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setErrors({});

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
      applyApiErrors(err);
    } finally {
      setLoading(false);
    }
  };

  const submitStep2 = async (skip = false) => {
    if (loading) return; // anti-duplo-submit
    if (!result) return; // sem loja criada não há o que personalizar
    setErrors({});
    setLoading(true);
    try {
      // A loja já foi criada no passo 1 (`result`). Aqui só atualizamos o branding,
      // então retentar após falha NUNCA recria a loja.
      if (!skip) {
        await saveStoreBranding(result.store.id, {
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          logo_url: logoUrl.trim() || undefined,
          template,
        });
      }
      setStep(3);
    } catch (err) {
      applyApiErrors(err);
    } finally {
      setLoading(false);
    }
  };

  const trialDays = result?.store.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(result.store.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 14;

  // Força de senha simples (feedback claro ao usuário).
  const pwStrength = password.length === 0 ? null : password.length < 8 ? 'weak' : 'ok';

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
          <form onSubmit={submitStep1} className="space-y-4" noValidate>
            <h2 className="text-lg font-semibold text-gray-900">Sua conta e sua loja</h2>
            <Input
              ref={nameRef}
              label="Seu nome *"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError('name');
              }}
              placeholder="João da Silva"
              autoComplete="name"
              error={errors.name}
              disabled={loading}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Celular / WhatsApp"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearFieldError('phone');
                }}
                placeholder="(63) 99999-0000"
                autoComplete="tel"
                error={errors.phone}
                disabled={loading}
              />
              <Input
                label="Email (opcional)"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError('email');
                }}
                placeholder="voce@email.com"
                autoComplete="email"
                error={errors.email}
                disabled={loading}
              />
            </div>
            <Input
              label="Senha *"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError('password');
              }}
              placeholder="mínimo 8 caracteres"
              autoComplete="new-password"
              error={errors.password}
              helperText={
                !errors.password && pwStrength === 'ok'
                  ? 'Senha boa.'
                  : !errors.password && pwStrength === 'weak'
                  ? `Faltam ${8 - password.length} caractere(s).`
                  : undefined
              }
              disabled={loading}
            />
            <Input
              label="Nome da loja *"
              value={storeName}
              onChange={(e) => {
                setStoreName(e.target.value);
                clearFieldError('storeName');
              }}
              placeholder="Salada do João"
              autoComplete="organization"
              error={errors.storeName}
              disabled={loading}
            />
            <Button type="submit" disabled={loading} className="w-full" style={{ background: BRAND }}>
              {loading ? 'Criando...' : 'Criar minha loja'}
            </Button>
            <p className="text-center text-sm text-gray-500">
              Já tem conta?{' '}
              <button
                type="button"
                className="font-medium"
                style={{ color: BRAND }}
                onClick={() => navigate('/login')}
                disabled={loading}
              >
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
                <label htmlFor="signup-primary-color" className="block text-sm font-medium text-gray-700 mb-1">
                  Cor primária
                </label>
                <input
                  id="signup-primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="signup-secondary-color" className="block text-sm font-medium text-gray-700 mb-1">
                  Cor secundária
                </label>
                <input
                  id="signup-secondary-color"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300"
                  disabled={loading}
                />
              </div>
            </div>
            <Input
              label="URL do logo (opcional)"
              type="url"
              inputMode="url"
              value={logoUrl}
              onChange={(e) => {
                setLogoUrl(e.target.value);
                clearFieldError('logoUrl');
              }}
              placeholder="https://..."
              autoComplete="off"
              error={errors.logoUrl}
              disabled={loading}
            />
            <div>
              <label htmlFor="signup-template" className="block text-sm font-medium text-gray-700 mb-1">
                Template
              </label>
              <select
                id="signup-template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                disabled={loading}
              >
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
