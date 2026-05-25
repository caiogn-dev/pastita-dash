import React, { useState } from 'react';
import axios from 'axios';

const BUSINESS_TYPES = [
  'Restaurante / Marmitaria',
  'Hamburgueria',
  'Pizzaria',
  'Açaí / Sorvetes',
  'Salgados / Lanches',
  'Saudável / Saladas',
  'Confeitaria / Bolos',
  'Bar / Petiscos',
  'Outro',
];

const API_URL = import.meta.env.VITE_API_URL || 'https://backend.pastita.com.br/api/v1';

export const CadastroPage: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    business_type: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Nome e WhatsApp são obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/public/leads/`, form);
      setDone(true);
    } catch {
      setError('Não foi possível enviar. Tente novamente ou entre em contato via WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Cadastro recebido!</h2>
          <p className="text-gray-600">
            Recebemos seu interesse no Cardapidex. Nossa equipe entrará em contato pelo WhatsApp em breve.
          </p>
          <p className="text-sm text-gray-400">Tempo médio de resposta: até 24 horas úteis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <img src="/cardapidex-logo.svg" alt="Cardapidex" className="w-9 h-9 rounded-xl shadow-sm" />
          <span className="font-bold text-gray-900 text-xl font-brand">Cardapidex</span>
        </div>
        <a href="/login" className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">
          Já tenho conta →
        </a>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">

          <div className="space-y-8">
            <div className="space-y-4">
              <span className="inline-block text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">
                Plataforma de delivery
              </span>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight font-brand">
                Venda mais pelo<br />
                <span className="text-emerald-600">WhatsApp</span> com<br />
                automação IA
              </h1>
              <p className="text-lg text-gray-600">
                Cardápio digital, bot de atendimento, pedidos, pagamentos e relatórios — tudo em um lugar.
              </p>
            </div>

            <ul className="space-y-3">
              {[
                'Cardápio online bonito e rápido',
                'Bot IA no WhatsApp que tira pedidos',
                'Pedidos e pagamentos automáticos',
                'Dashboard com relatórios em tempo real',
                'Sem taxa por pedido',
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-gray-700">
                  <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <p className="text-sm text-gray-400">Mais de 5 restaurantes já usam a plataforma.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 font-brand">Quero conhecer o Cardapidex</h2>
              <p className="text-sm text-gray-500 mt-1">Preencha e entraremos em contato pelo WhatsApp.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="João Silva"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="(11) 99999-9999"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="joao@restaurante.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={set('city')}
                    placeholder="São Paulo"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de negócio</label>
                  <select
                    value={form.business_type}
                    onChange={set('business_type')}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                  >
                    <option value="">Selecione</option>
                    {BUSINESS_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem (opcional)</label>
                <textarea
                  value={form.message}
                  onChange={set('message')}
                  placeholder="Conte um pouco sobre seu negócio..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm"
              >
                {loading ? 'Enviando...' : 'Quero conhecer o Cardapidex'}
              </button>

              <p className="text-center text-xs text-gray-400">
                Sem spam. Entraremos em contato somente pelo WhatsApp informado.
              </p>
            </form>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-100">
        © {new Date().getFullYear()} Cardapidex · Plataforma de delivery com IA
      </footer>
    </div>
  );
};

export default CadastroPage;
