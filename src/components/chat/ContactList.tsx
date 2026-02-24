/**
 * ContactList - Lista de contatos com Chakra UI
 */
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  VStack,
  HStack,
  Box,
  Text,
  Avatar,
  Badge,
  useColorModeValue,
  Spinner,
  Flex,
  Tooltip,
} from '@chakra-ui/react';

export interface Contact {
  id: string;
  phoneNumber: string;
  contactName: string;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  status?: string;
  mode?: 'auto' | 'human' | 'hybrid';
  isTyping?: boolean;
  isOnline?: boolean;
  profilePictureUrl?: string;
}

export interface ContactListProps {
  contacts: Contact[];
  selectedId?: string;
  onSelect: (contact: Contact) => void;
  loading?: boolean;
  typingContacts?: Set<string>;
}

const ModeBadge: React.FC<{ mode?: string }> = ({ mode }) => {
  const configs: Record<string, { label: string; color: string }> = {
    auto: { label: '🤖', color: 'green' },
    human: { label: '👤', color: 'blue' },
    hybrid: { label: '⚡', color: 'purple' },
  };
  
  const config = configs[mode || 'auto'];
  
  return (
    <Tooltip label={`Modo: ${mode || 'auto'}`}>
      <Badge colorScheme={config.color} variant="subtle" fontSize="xs">
        {config.label}
      </Badge>
    </Tooltip>
  );
};

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  selectedId,
  onSelect,
  loading,
  typingContacts,
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  const selectedBg = useColorModeValue('green.50', 'green.900');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  if (loading) {
    return (
      <Flex justify="center" align="center" py={8}>
        <Spinner size="lg" color="green.500" />
      </Flex>
    );
  }

  if (contacts.length === 0) {
    return (
      <VStack py={8} spacing={4} align="center">
        <Text fontSize="4xl">💬</Text>
        <Text color="gray.500" textAlign="center">
          Nenhuma conversa ainda
        </Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={0} align="stretch">
      {contacts.map((contact) => {
        const isSelected = contact.id === selectedId;
        const isTyping = typingContacts?.has(contact.phoneNumber);
        const displayName = contact.contactName || contact.phoneNumber;
        
        return (
          <Box
            key={contact.id}
            as="button"
            onClick={() => onSelect(contact)}
            w="full"
            p={3}
            bg={isSelected ? selectedBg : bgColor}
            _hover={{ bg: isSelected ? selectedBg : hoverBg }}
            borderBottom="1px"
            borderColor={borderColor}
            transition="all 0.2s"
            textAlign="left"
          >
            <HStack spacing={3} align="start">
              <Avatar
                size="md"
                name={displayName}
                src={contact.profilePictureUrl}
                bg={isSelected ? 'green.500' : 'gray.400'}
              />
              
              <VStack spacing={1} align="start" flex={1} minW={0}>
                <HStack w="full" justify="space-between">
                  <Text 
                    fontWeight={contact.unreadCount ? 'bold' : 'semibold'}
                    fontSize="sm"
                    noOfLines={1}
                    flex={1}
                  >
                    {displayName}
                  </Text>
                  
                  {contact.lastMessageAt && (
                    <Text fontSize="xs" color="gray.500">
                      {formatDistanceToNow(new Date(contact.lastMessageAt), { 
                        addSuffix: true,
                        locale: ptBR 
                      })}
                    </Text>
                  )}
                </HStack>
                
                <HStack w="full" justify="space-between" align="center">
                  <Text 
                    fontSize="sm" 
                    color={isTyping ? 'green.500' : 'gray.500'}
                    noOfLines={1}
                    flex={1}
                  >
                    {isTyping ? 'digitando...' : contact.lastMessagePreview}
                  </Text>
                  
                  <HStack spacing={1}>
                    <ModeBadge mode={contact.mode} />
                    
                    {!!contact.unreadCount && (
                      <Badge 
                        colorScheme="green" 
                        variant="solid" 
                        borderRadius="full"
                        fontSize="xs"
                        minW="20px"
                        textAlign="center"
                      >
                        {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                      </Badge>
                    )}
                  </HStack>
                </HStack>
              </VStack>
            </HStack>
          </Box>
        );
      })}
    </VStack>
  );
};

export default ContactList;
