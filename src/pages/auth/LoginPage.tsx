/**
 * LoginPage - Entrada premium dark luxe (carvão + ouro)
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button, Input, Card } from '../../components/common';
import { authService, getErrorMessage, setAuthToken } from '../../services';
import { useAuthStore } from '../../stores/authStore';

const EASE = [0.22, 1, 0.36, 1] as const;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authService.login(formData.email, formData.password);
      setAuth(response.token, {
        id: response.user_id,
        email: response.email,
        first_name: response.first_name,
        last_name: response.last_name,
      });
      setAuthToken(response.token);
      await new Promise((res) => setTimeout(res, 100));
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // `dark` força os tokens dark luxe nesta tela — entrada é um momento de marca.
    <div
      className="dark relative min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 50% 26%, #1A1613 0%, #0F0D0B 58%, #070504 100%)',
      }}
    >
      {/* Halo dourado ambiente atrás da logo */}
      <div
        aria-hidden
        className="cdx-halo pointer-events-none absolute left-1/2 top-[26%] h-[440px] w-[440px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(222,190,121,0.18) 0%, rgba(222,190,121,0.06) 42%, transparent 70%)',
        }}
      />
      {/* Vinheta sutil nas bordas */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 40%, transparent 55%, rgba(0,0,0,0.45) 100%)' }}
      />

      <div className="relative flex w-full max-w-md flex-col gap-8">
        {/* Logo + wordmark */}
        <div className="flex flex-col items-center">
          <motion.img
            src="/brand/symbol-256.png"
            alt="Cardapidex"
            className="h-24 w-24 object-contain drop-shadow-[0_6px_24px_rgba(222,190,121,0.28)]"
            initial={{ opacity: 0, scale: 0.82, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
          />
          <motion.span
            className="cdx-gold-shimmer mt-5 font-brand text-3xl uppercase tracking-[0.32em]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.18 }}
          >
            Cardapidex
          </motion.span>
          <motion.p
            className="mt-3 text-sm text-fg-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.34 }}
          >
            Faça login para continuar
          </motion.p>
        </div>

        {/* Formulário */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.42 }}
        >
          <Card variant="default" size="lg" className="border border-[var(--brand)]/15 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                <Input
                  label="Usuário"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Digite seu e-mail"
                  autoComplete="email"
                />

                <Input
                  label="Senha"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                />

                <Button type="submit" width="full" isLoading={isLoading} size="lg">
                  Entrar
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-center text-sm text-fg-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          Plataforma de gestão para restaurantes
        </motion.p>
      </div>
    </div>
  );
};

export default LoginPage;
