import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button, Input } from '../../components/common';
import { authService, getErrorMessage } from '../../services';
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
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div 
            className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, #722F37 0%, #8B3A42 100%)' 
            }}
          >
            <span className="text-white font-bold text-4xl">P</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Pastita</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Dashboard de Gerenciamento</p>
        </div>

        <form className="mt-8 space-y-6 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Usuário"
              type="text"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Digite seu e-mail"
            />
            <Input
              label="Senha"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Digite sua senha"
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Entrar
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Plataforma de gestão para restaurantes
        </p>
      </div>
    </div>
  );
};
