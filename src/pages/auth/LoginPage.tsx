/**
 * LoginPage - Página de login moderna com Chakra UI v3
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Flex,
  Heading,
  Text,
  Stack,
  Image,
  Card,
} from '@chakra-ui/react';
import toast from 'react-hot-toast';
import { Button, Input } from '../../components/common';
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
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bg="bg.secondary"
      p={4}
    >
      <Stack gap={8} maxW="md" w="full">
        {/* Logo e Título */}
        <Stack align="center" gap={4}>
          <Image
            src="/pastita-logo.svg"
            alt="Pastita"
            boxSize="96px"
          />
          <Stack gap={1} textAlign="center">
            <Heading size="2xl" color="fg.primary">Pastita</Heading>
            <Text color="fg.muted">Dashboard de Gerenciamento</Text>
          </Stack>
        </Stack>

        {/* Formulário */}
        <Card variant="default" size="lg">
          <form onSubmit={handleSubmit}>
            <Stack gap={6}>
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

              <Button 
                type="submit" 
                width="full" 
                isLoading={isLoading}
                size="lg"
              >
                Entrar
              </Button>
            </Stack>
          </form>
        </Card>

        {/* Footer */}
        <Text textAlign="center" fontSize="sm" color="fg.muted">
          Plataforma de gestão para restaurantes
        </Text>
      </Stack>
    </Flex>
  );
};

export default LoginPage;
