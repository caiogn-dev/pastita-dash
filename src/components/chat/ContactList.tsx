// ContactList - Versão simplificada
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './ContactList.css';

export interface Contact {
  id: string;
  phoneNumber: string;
  contactName: string;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  status?: string;
  mode?: 'auto' | 'human' | 'hybrid';
}

export interface ContactListProps {
  contacts: Contact[];
  selectedId?: string;
  onSelect: (contact: Contact) => void;
  loading?: boolean;
  typingContacts?: Set<string>;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  selectedId,
  onSelect,
  loading,
  typingContacts,
}) => {
  if (loading) {
    return <div className="contacts-loading">Carregando...</div>;
  }

  if (contacts.length === 0) {
    return <div className="contacts-empty">Nenhuma conversa</div>;
  }

  return (
    <div className="contact-list">
      {contacts.map((contact) => {
        const isSelected = contact.id === selectedId;
        const isTyping = typingContacts?.has(contact.phoneNumber);
        const displayName = contact.contactName || contact.phoneNumber;
        
        return (
          <div
            key={contact.id}
            className={`contact-row ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(contact)}
          >
            <div className="contact-avatar">{displayName[0] || '📱'}</div>
            
            <div className="contact-details">
              <div className="contact-header">
                <span className="contact-name">{displayName}</span>
                {contact.lastMessageAt && (
                  <span className="contact-time">
                    {formatDistanceToNow(new Date(contact.lastMessageAt), { addSuffix: true, locale: ptBR })}
                  </span>
                )}
              </div>
              
              <div className="contact-footer">
                <span className={`contact-preview ${isTyping ? 'typing' : ''}`}>
                  {isTyping ? 'digitando...' : contact.lastMessagePreview}
                </span>
                
                <div className="contact-badges">
                  <span className={`mode-badge ${contact.mode || 'auto'}`}>
                    {contact.mode === 'human' ? '👤' : contact.mode === 'hybrid' ? '⚡' : '🤖'}
                  </span>
                  {!!contact.unreadCount && (
                    <span className="unread-count">{contact.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ContactList;
