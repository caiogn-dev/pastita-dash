import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Header } from '../../components/layout';
import { Card, Button, Input } from '../../components/common';
import { authService, getErrorMessage } from '../../services';
import { useAuthStore } from '../../stores/authStore';

export const SettingsPage: React.FC = () => {
  const { user, setAuth } = useAuthStore();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('A nova senha deve ter pelo menos 8 caracteres');
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await authService.changePassword(
        passwordForm.oldPassword,
        passwordForm.newPassword
      );
      setAuth(result.token, user!);
      toast.success('Senha alterada com sucesso!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div>
      <Header title="Configurações" subtitle="Gerencie suas preferências e segurança" />

      <div className="p-6 space-y-6">
        {/* User Info */}
        <Card title="Informações do Usuário">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Usuário</label>
              <p className="text-gray-900">{user?.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{user?.email || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Nome</label>
              <p className="text-gray-900">{user?.first_name || '-'} {user?.last_name || ''}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Tipo</label>
              <p className="text-gray-900">
                {user?.is_superuser ? 'Superusuário' : user?.is_staff ? 'Staff' : 'Usuário'}
              </p>
            </div>
          </div>
        </Card>

        {/* Change Password */}
        <Card title="Alterar Senha">
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <Input
              label="Senha Atual"
              type="password"
              required
              value={passwordForm.oldPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
            />
            <Input
              label="Nova Senha"
              type="password"
              required
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              helperText="Mínimo de 8 caracteres"
            />
            <Input
              label="Confirmar Nova Senha"
              type="password"
              required
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            />
            <Button type="submit" isLoading={isChangingPassword}>
              Alterar Senha
            </Button>
          </form>
        </Card>

        {/* API Info */}
        <Card title="Informações da API">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Base URL</label>
              <p className="text-gray-900 font-mono text-sm">
                {import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Documentação</label>
              <div className="flex gap-4 mt-1">
                <a
                  href={`${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'}/api/docs/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700"
                >
                  Swagger UI
                </a>
                <a
                  href={`${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'}/api/redoc/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700"
                >
                  ReDoc
                </a>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
