/**
 * AccountsPage - Página de contas WhatsApp com Chakra UI v3
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Flex,
  Heading,
  Text,
  Stack,
  Table,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Skeleton,
  useDisclosure,
} from '@chakra-ui/react';
import {
  PlusIcon,
  ArrowPathIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  PowerIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button } from '../../components/common';
import { whatsappService, getErrorMessage } from '../../services';
import { useAccountStore } from '../../stores/accountStore';
import { WhatsAppAccount } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const { accounts, setAccounts, setLoading, isLoading, updateAccount, removeAccount } = useAccountStore();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedAccount, setSelectedAccount] = useState<WhatsAppAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await whatsappService.getAccounts();
      setAccounts(response.results);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (account: WhatsAppAccount) => {
    try {
      const updated = account.status === 'active'
        ? await whatsappService.deactivateAccount(account.id)
        : await whatsappService.activateAccount(account.id);
      updateAccount(updated);
      toast.success(`Conta ${updated.status === 'active' ? 'ativada' : 'desativada'} com sucesso!`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleSyncTemplates = async (account: WhatsAppAccount) => {
    try {
      const result = await whatsappService.syncTemplates(account.id);
      toast.success(result.message);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;
    setIsDeleting(true);
    try {
      await whatsappService.deleteAccount(selectedAccount.id);
      removeAccount(selectedAccount.id);
      toast.success('Conta removida com sucesso!');
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'gray';
      case 'pending': return 'warning';
      case 'error': return 'danger';
      default: return 'gray';
    }
  };

  return (
    <Box p={6}>
      <Stack gap={6}>
        {/* Header */}
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <Stack gap={1}>
            <Heading size="lg" color="fg.primary">Contas WhatsApp</Heading>
            <Text color="fg.muted">{accounts.length} conta(s) cadastrada(s)</Text>
          </Stack>
          
          <Button
            leftIcon={<PlusIcon className="w-5 h-5" />}
            onClick={() => navigate('/accounts/new')}
          >
            Nova Conta
          </Button>
        </Flex>

        {/* Table */}
        <Card noPadding>
          {isLoading ? (
            <Stack p={4} gap={3}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height="60px" />
              ))}
            </Stack>
          ) : accounts.length === 0 ? (
            <Box p={8} textAlign="center">
              <Text color="fg.muted">Nenhuma conta cadastrada</Text>
              <Button 
                mt={4} 
                onClick={() => navigate('/accounts/new')}
                leftIcon={<PlusIcon className="w-4 h-4" />}
              >
                Adicionar Conta
              </Button>
            </Box>
          ) : (
            <Box overflowX="auto">
              <Table.Root variant="line">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Nome</Table.ColumnHeader>
                    <Table.ColumnHeader>Phone ID</Table.ColumnHeader>
                    <Table.ColumnHeader>Status</Table.ColumnHeader>
                    <Table.ColumnHeader>Auto Resposta</Table.ColumnHeader>
                    <Table.ColumnHeader>Criado em</Table.ColumnHeader>
                    <Table.ColumnHeader width="100px">Ações</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {accounts.map((account) => (
                    <Table.Row 
                      key={account.id}
                      cursor="pointer"
                      onClick={() => navigate(`/accounts/${account.id}`)}
                      _hover={{ bg: 'bg.hover' }}
                    >
                      <Table.Cell>
                        <Stack gap={0.5}>
                          <Text fontWeight="medium" color="fg.primary">
                            {account.name}
                          </Text>
                          <Text fontSize="sm" color="fg.muted">
                            {account.display_phone_number || account.phone_number}
                          </Text>
                        </Stack>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontFamily="mono" fontSize="sm" color="fg.muted">
                          {account.phone_number_id}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={getStatusColor(account.status)}>
                          {account.status}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text 
                          fontSize="sm" 
                          color={account.auto_response_enabled ? 'success.500' : 'fg.muted'}
                        >
                          {account.auto_response_enabled ? 'Ativada' : 'Desativada'}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" color="fg.muted">
                          {format(new Date(account.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </Text>
                      </Table.Cell>
                      <Table.Cell onClick={(e) => e.stopPropagation()}>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            variant="ghost"
                            size="sm"
                            icon={<EllipsisVerticalIcon className="w-5 h-5" />}
                          />
                          <MenuList>
                            <MenuItem
                              icon={<PowerIcon className="w-4 h-4" />}
                              onClick={() => handleToggleStatus(account)}
                            >
                              {account.status === 'active' ? 'Desativar' : 'Ativar'}
                            </MenuItem>
                            <MenuItem
                              icon={<ArrowPathIcon className="w-4 h-4" />}
                              onClick={() => handleSyncTemplates(account)}
                            >
                              Sincronizar Templates
                            </MenuItem>
                            <MenuItem
                              icon={<ChartBarIcon className="w-4 h-4" />}
                              onClick={() => navigate(`/accounts/${account.id}`)}
                            >
                              Ver Detalhes
                            </MenuItem>
                            <MenuItem
                              icon={<TrashIcon className="w-4 h-4" />}
                              color="danger.500"
                              onClick={() => {
                                setSelectedAccount(account);
                                onOpen();
                              }}
                            >
                              Excluir
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}
        </Card>
      </Stack>

      {/* Delete Modal */}
      <Card
        title="Excluir Conta"
        isOpen={isOpen}
        onClose={onClose}
      >
        <Stack p={4} gap={4}>
          <Text>
            Tem certeza que deseja excluir a conta "{selectedAccount?.name}"? 
            Esta ação não pode ser desfeita.
          </Text>
          <Flex justify="flex-end" gap={3}>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              colorPalette="danger" 
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Excluir
            </Button>
          </Flex>
        </Stack>
      </Card>
    </Box>
  );
};

export default AccountsPage;
