/**
 * LoginPage - Página de login
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button, Input, Card } from '../../components/common';
import { authService, getErrorMessage, setAuthToken } from '../../services';
import { useAuthStore } from '../../stores/authStore';

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
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary p-4">
      <div className="flex flex-col gap-8 w-full max-w-md">
        {/* Logo e Título */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/cardapidex-logo.svg"
            alt="Cardapidex"
            className="w-14 h-14 rounded-2xl shadow-lg mb-4"
          />
          <h1 className="text-3xl font-bold text-fg-primary font-brand">Cardapidex</h1>
          <p className="text-sm text-fg-secondary mt-1">Faça login para continuar</p>
        </div>

        {/* Formulário */}
        <Card variant="default" size="lg">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <Input
                label="Usuário"
                type="email"
                isRequired
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Digite seu e-mail"
                autoComplete="email"
              />

              <Input
                label="Senha"
                type="password"
                isRequired
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Digite sua senha"
                autoComplete="current-password"
              />

              <Button
                type="submit"
                width="full"
                isLoading={isLoading}
                size="lg"
              >
                Entrar
              </Button>
            </div>
          </form>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-fg-muted">
          Plataforma de gestão para restaurantes
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
