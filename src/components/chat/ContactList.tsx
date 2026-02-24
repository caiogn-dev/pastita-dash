/**
 * ContactList - Lista de contatos com Chakra UI v3
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
  Spinner,
  Flex,
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
    <Badge colorScheme={config.color} variant="subtle" fontSize="xs">
      {config.label}
    </Badge>
  );
};

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  selectedId,
  onSelect,
  loading,
  typingContacts,
}) => {
  if (loading) {
    return (
      <Flex justify="center" align="center" py={8}>
        <Spinner size="lg" color="green.500" />
      </Flex>
    );
  }

  if (contacts.length === 0) {
    return (
      <VStack py={8} gap={4} align="center">
        <Text fontSize="4xl">💬</Text>
        <Text color="gray.500" textAlign="center">Nenhuma conversa ainda</Text>
      </VStack>
    );
  }

  return (
    <VStack gap={0} align="stretch">
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
            bg={isSelected ? 'green.50' : 'white'}
            _hover={{ bg: isSelected ? 'green.50' : 'gray.50' }}
            borderBottom="1px"
            borderColor="gray.100"
            transition="all 0.2s"
            textAlign="left"
          >
            <HStack gap={3} align="flex-start">
              <Avatar
                size="md"
                name={displayName}
                src={contact.profilePictureUrl}
                bg={isSelected ? 'green.500' : 'gray.400'}
              />
              
              <VStack gap={1} align="flex-start" flex={1} minW={0}>
                <HStack w="full" justify="space-between">
                  <Text 
                    fontWeight={contact.unreadCount ? 'bold' : 'semibold'}
                    fontSize="sm"
                    truncate
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
                    truncate
                    flex={1}
                  >
                    {isTyping ? 'digitando...' : contact.lastMessagePreview}
                  </Text>
                  
                  <HStack gap={1}>
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
