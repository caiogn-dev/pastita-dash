/**
 * ConnectionsPage - Conexões de mensagens (sem Chakra UI)
 */
import React, { useState, useEffect } from 'react';
import {
  PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon,
  CheckCircleIcon, XCircleIcon, ChatBubbleLeftIcon,
  LinkIcon, QrCodeIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Badge } from '../../components/common';
import * as whatsappService from '../../services/whatsapp';
import { messengerService } from '../../services/messenger';

// ─── Platform config ──────────────────────────────────────────────────────────

interface PlatformField { name: string; label: string; type: string; required: boolean; placeholder: string; }
interface PlatformConfig { name: string; icon: string; description: string; fields: PlatformField[]; disabled?: boolean; }

const PLATFORMS: Record<string, PlatformConfig> = {
  whatsapp: {
    name: 'WhatsApp', icon: '📱',
    description: 'Conecte sua conta WhatsApp Business',
    fields: [
      { name: 'name', label: 'Nome da Conexão', type: 'text', required: true, placeholder: 'Ex: Pastita Principal' },
      { name: 'phone_number', label: 'Número de Telefone', type: 'tel', required: true, placeholder: 'Ex: +55 63 99138-6719' },
      { name: 'phone_number_id', label: 'Phone Number ID (Meta)', type: 'text', required: true, placeholder: 'Ex: 123456789012345' },
      { name: 'waba_id', label: 'WABA ID (opcional)', type: 'text', required: false, placeholder: 'Ex: 987654321098765' },
      { name: 'access_token', label: 'Access Token', type: 'password', required: true, placeholder: 'Token de acesso da API do WhatsApp' },
      { name: 'webhook_verify_token', label: 'Webhook Verify Token (opcional)', type: 'password', required: false, placeholder: 'Token para verificação do webhook' },
    ],
  },
  messenger: {
    name: 'Messenger', icon: '💬',
    description: 'Conecte sua página do Facebook Messenger',
    fields: [
      { name: 'name', label: 'Nome da Conexão', type: 'text', required: true, placeholder: 'Ex: Página Pastita' },
      { name: 'page_id', label: 'Page ID', type: 'text', required: true, placeholder: 'Ex: 123456789012345' },
      { name: 'page_name', label: 'Nome da Página', type: 'text', required: true, placeholder: 'Ex: Pastita Oficial' },
      { name: 'page_access_token', label: 'Page Access Token', type: 'password', required: true, placeholder: 'Token de acesso da página' },
    ],
  },
  instagram: {
    name: 'Instagram', icon: '📸',
    description: 'Conecte sua conta do Instagram (em breve)',
    fields: [
      { name: 'name', label: 'Nome da Conexão', type: 'text', required: true, placeholder: 'Ex: Instagram Pastita' },
      { name: 'access_token', label: 'Access Token', type: 'password', required: true, placeholder: 'Token de acesso do Instagram' },
    ],
    disabled: true,
  },
};

interface Connection {
  id: string;
  platform: 'whatsapp' | 'messenger' | 'instagram';
  name: string;
  status: 'active' | 'inactive' | 'connecting' | 'error';
  is_active: boolean;
  webhook_verified?: boolean;
  phone_number?: string;
  page_name?: string;
  page_id?: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusVariant = (status: string, isActive: boolean) => {
  if (!isActive) return 'gray';
  if (status === 'active' || status === 'connected') return 'success';
  if (status === 'connecting') return 'warning';
  if (status === 'error') return 'danger';
  return 'gray';
};

const getStatusLabel = (status: string, isActive: boolean) => {
  if (!isActive) return 'Desativado';
  if (status === 'active' || status === 'connected') return 'Conectado';
  if (status === 'connecting') return 'Conectando...';
  if (status === 'error') return 'Erro';
  return 'Inativo';
};

const initials = (name: string) => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

// ─── Modal ────────────────────────────────────────────────────────────────────

const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; maxW?: string }> =
  ({ open, onClose, title, children, footer, maxW = 'max-w-md' }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className={`relative bg-bg-card border border-border-primary rounded-xl shadow-2xl w-full ${maxW} max-h-[90vh] overflow-y-auto`}>
          <div className="flex items-center justify-between p-5 border-b border-border-primary">
            <h2 className="text-lg font-semibold text-fg-primary">{title}</h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-bg-hover"><XMarkIcon className="w-5 h-5 text-fg-muted" /></button>
          </div>
          <div className="p-5">{children}</div>
          {footer && <div className="flex justify-end gap-3 p-5 border-t border-border-primary">{footer}</div>}
        </div>
      </div>
    );
  };

// ─── Toggle ───────────────────────────────────────────────────────────────────

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
  >
    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
  </button>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => { loadConnections(); }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const [whatsappRes, messengerRes] = await Promise.allSettled([
        whatsappService.getAccounts(),
        messengerService.getAccounts(),
      ]);
      const all: Connection[] = [];
      if (whatsappRes.status === 'fulfilled') {
        const d = whatsappRes.value.data as any;
        (d?.results || d || []).forEach((acc: any) => all.push({ ...acc, platform: 'whatsapp', phone_number: acc.phone_number || acc.display_phone_number }));
      }
      if (messengerRes.status === 'fulfilled') {
        const d = messengerRes.value.data as any;
        (d?.results || d || []).forEach((acc: any) => all.push({ ...acc, platform: 'messenger' }));
      }
      setConnections(all);
      setError(null);
    } catch { setError('Erro ao carregar conexões'); }
    finally { setLoading(false); }
  };

  const openDialog = (platform?: string, conn?: Connection) => {
    setEditingConnection(conn || null);
    setSelectedPlatform(platform || conn?.platform || null);
    setFormData(conn ? { name: conn.name || '', ...(conn.phone_number && { phone_number: conn.phone_number }), ...(conn.page_id && { page_id: conn.page_id }), ...(conn.page_name && { page_name: conn.page_name }) } : {});
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditingConnection(null); setSelectedPlatform(null); setFormData({}); };

  const handleSubmit = async () => {
    if (!selectedPlatform) return;
    const cfg = PLATFORMS[selectedPlatform];
    for (const f of cfg.fields.filter(f => f.required)) {
      if (!formData[f.name]) { toast.error(`Campo obrigatório: ${f.label}`); return; }
    }
    try {
      setSubmitting(true);
      if (editingConnection) {
        if (selectedPlatform === 'whatsapp') await whatsappService.updateAccount(editingConnection.id, formData as any);
        else if (selectedPlatform === 'messenger') await messengerService.updateAccount(editingConnection.id, formData as any);
        toast.success('Conexão atualizada!');
      } else {
        if (selectedPlatform === 'whatsapp') await whatsappService.createAccount(formData as any);
        else if (selectedPlatform === 'messenger') await messengerService.createAccount(formData as any);
        toast.success('Conexão criada!');
      }
      closeDialog();
      loadConnections();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Erro ao salvar conexão');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (conn: Connection) => {
    if (!confirm(`Excluir conexão "${conn.name}"?`)) return;
    try {
      if (conn.platform === 'whatsapp') await whatsappService.deleteAccount(conn.id);
      else if (conn.platform === 'messenger') await messengerService.deleteAccount(conn.id);
      toast.success('Conexão excluída!');
      loadConnections();
    } catch { toast.error('Erro ao excluir conexão'); }
  };

  const handleToggleActive = async (conn: Connection) => {
    try {
      const newStatus = !conn.is_active;
      if (conn.platform === 'whatsapp') {
        if (newStatus) await whatsappService.activateAccount(conn.id);
        else await whatsappService.deactivateAccount(conn.id);
      } else if (conn.platform === 'messenger') {
        await messengerService.updateAccount(conn.id, { is_active: newStatus });
      }
      toast.success(`Conexão ${newStatus ? 'ativada' : 'desativada'}!`);
      loadConnections();
    } catch { toast.error('Erro ao alterar status'); }
  };

  const handleShowQR = async (conn: Connection) => {
    setQrCode(null);
    setQrDialogOpen(true);
    try {
      const res = await whatsappService.getQRCode(conn.id);
      setQrCode(res.data.qr_code || res.data.qr);
    } catch { toast.error('Erro ao carregar QR Code'); }
  };

  const handleVerifyWebhook = async (conn: Connection) => {
    try {
      await messengerService.verifyWebhook(conn.id);
      toast.success('Webhook verificado!');
      loadConnections();
    } catch { toast.error('Erro ao verificar webhook'); }
  };

  const filtered = connections.filter((c) => {
    if (activeTab !== 'all' && c.platform !== activeTab) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.phone_number?.toLowerCase().includes(q) || c.page_name?.toLowerCase().includes(q) || c.page_id?.toLowerCase().includes(q);
  });

  const TABS = [
    { value: 'all', label: `Todas (${connections.length})` },
    { value: 'whatsapp', label: `📱 WhatsApp (${connections.filter(c => c.platform === 'whatsapp').length})` },
    { value: 'messenger', label: `💬 Messenger (${connections.filter(c => c.platform === 'messenger').length})` },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-fg-primary">Conexões de Mensagens</h1>
          <p className="text-fg-muted mt-1">Gerencie todas as suas conexões em um só lugar</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
            <input
              className="pl-9 pr-3 py-2 text-sm border border-border-primary rounded-lg bg-bg-card text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-500 w-64"
              placeholder="Buscar conexões..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => openDialog()} leftIcon={<PlusIcon className="w-5 h-5" />}>Nova Conexão</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: '📱', label: 'WhatsApp', count: connections.filter(c => c.platform === 'whatsapp').length },
          { icon: '💬', label: 'Messenger', count: connections.filter(c => c.platform === 'messenger').length },
          { icon: <CheckCircleIcon className="w-6 h-6" />, label: 'Ativas', count: connections.filter(c => c.is_active).length, iconClass: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
          { icon: <XCircleIcon className="w-6 h-6" />, label: 'Inativas', count: connections.filter(c => !c.is_active).length, iconClass: 'text-gray-500 bg-gray-100 dark:bg-gray-700' },
        ].map((s, i) => (
          <div key={i} className="bg-bg-card border border-border-primary rounded-xl p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl text-2xl ${(s as any).iconClass || 'bg-bg-secondary'}`}>
              {typeof s.icon === 'string' ? s.icon : s.icon}
            </div>
            <div>
              <p className="text-sm text-fg-muted">{s.label}</p>
              <p className="text-2xl font-bold text-fg-primary">{s.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-primary mb-6">
        {TABS.map(t => (
          <button key={t.value} onClick={() => setActiveTab(t.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t.value ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-fg-muted hover:text-fg-primary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-fg-muted">Carregando conexões...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-bg-card border border-border-primary rounded-xl p-16 text-center">
          <ChatBubbleLeftIcon className="w-16 h-16 text-fg-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-fg-muted mb-2">
            {searchQuery ? 'Nenhuma conexão encontrada' : 'Nenhuma conexão configurada'}
          </h3>
          <p className="text-sm text-fg-muted mb-6 max-w-md mx-auto">
            {searchQuery ? 'Tente ajustar sua busca ou filtros' : 'Adicione uma conexão de WhatsApp ou Messenger para começar'}
          </p>
          {!searchQuery && <Button onClick={() => openDialog()} leftIcon={<PlusIcon className="w-4 h-4" />}>Adicionar Conexão</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((conn) => (
            <div key={conn.id} className="bg-bg-card border border-border-primary rounded-xl p-5 hover:shadow-lg transition-shadow">
              {/* Card header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${conn.platform === 'whatsapp' ? 'bg-green-500' : 'bg-blue-500'}`}>
                    {initials(conn.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-fg-primary truncate max-w-[140px]">{conn.name}</p>
                    <p className="text-xs text-fg-muted">{PLATFORMS[conn.platform].icon} {PLATFORMS[conn.platform].name}</p>
                  </div>
                </div>
                <Toggle checked={conn.is_active} onChange={() => handleToggleActive(conn)} />
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant={getStatusVariant(conn.status, conn.is_active) as any}>{getStatusLabel(conn.status, conn.is_active)}</Badge>
                {conn.webhook_verified !== undefined && (
                  <Badge variant={conn.webhook_verified ? 'success' : 'warning'}>{conn.webhook_verified ? 'Webhook OK' : 'Webhook Pendente'}</Badge>
                )}
              </div>

              {/* Info */}
              <div className="text-sm text-fg-muted mb-4 flex flex-col gap-0.5">
                {conn.phone_number && <span>📞 {conn.phone_number}</span>}
                {conn.page_name && <span>📄 {conn.page_name}</span>}
                {conn.page_id && <span className="text-xs">ID: {conn.page_id}</span>}
              </div>

              {/* Actions */}
              <div className="border-t border-border-primary pt-3 flex justify-end gap-1">
                {conn.platform === 'whatsapp' && !conn.is_active && (
                  <button onClick={() => handleShowQR(conn)} title="Conectar via QR Code" className="p-1.5 rounded hover:bg-bg-hover text-green-600 transition-colors">
                    <QrCodeIcon className="w-4 h-4" />
                  </button>
                )}
                {conn.platform === 'messenger' && !conn.webhook_verified && (
                  <button onClick={() => handleVerifyWebhook(conn)} title="Verificar Webhook" className="p-1.5 rounded hover:bg-bg-hover text-blue-600 transition-colors">
                    <LinkIcon className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => openDialog(conn.platform, conn)} title="Editar" className="p-1.5 rounded hover:bg-bg-hover text-fg-muted transition-colors">
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(conn)} title="Excluir" className="p-1.5 rounded hover:bg-bg-hover text-red-500 transition-colors">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Platform selection */}
      <Modal open={dialogOpen && !selectedPlatform} onClose={closeDialog} title="Escolher Plataforma" maxW="max-w-lg">
        <p className="text-fg-muted mb-4">Selecione a plataforma de mensagens que deseja conectar:</p>
        <div className="flex flex-col gap-3">
          {Object.entries(PLATFORMS).map(([key, p]) => (
            <button
              key={key}
              disabled={p.disabled}
              onClick={() => !p.disabled && setSelectedPlatform(key)}
              className={`flex items-center gap-4 p-4 border-2 rounded-xl text-left transition-colors ${p.disabled ? 'opacity-50 cursor-not-allowed border-border-primary' : 'border-border-primary hover:border-brand-500 cursor-pointer'}`}
            >
              <span className="text-4xl">{p.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-fg-primary">{p.name}</span>
                  {p.disabled && <Badge variant="gray" size="sm">Em breve</Badge>}
                </div>
                <p className="text-sm text-fg-muted">{p.description}</p>
              </div>
              <PlusIcon className="w-5 h-5 text-fg-muted" />
            </button>
          ))}
        </div>
      </Modal>

      {/* Modal: Form */}
      <Modal
        open={dialogOpen && !!selectedPlatform}
        onClose={closeDialog}
        title={editingConnection ? 'Editar Conexão' : `Nova Conexão ${PLATFORMS[selectedPlatform as keyof typeof PLATFORMS]?.name || ''}`}
        footer={<>
          <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} isLoading={submitting}>{editingConnection ? 'Salvar Alterações' : 'Criar Conexão'}</Button>
        </>}
      >
        {selectedPlatform && (
          <div className="flex flex-col gap-4">
            {PLATFORMS[selectedPlatform as keyof typeof PLATFORMS].fields.map((f) => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-fg-secondary mb-1">
                  {f.label}{f.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type={f.type}
                  value={formData[f.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                  placeholder={f.placeholder}
                  disabled={!!(editingConnection && f.name === 'page_id')}
                  className="w-full px-3 py-2 text-sm border border-border-primary rounded-lg bg-bg-card text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                />
                {f.name.includes('token') && <p className="text-xs text-fg-muted mt-1">O token não será exibido novamente por segurança</p>}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Modal: QR Code */}
      <Modal
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        title="Conectar WhatsApp"
        maxW="max-w-sm"
        footer={<Button variant="outline" onClick={() => setQrDialogOpen(false)}>Fechar</Button>}
      >
        <div className="flex flex-col items-center gap-4 py-2">
          <p className="text-center text-fg-muted text-sm">Escaneie o QR Code com seu WhatsApp para conectar</p>
          {qrCode ? (
            <div className="p-4 bg-white rounded-xl" dangerouslySetInnerHTML={{ __html: qrCode }} />
          ) : (
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          )}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
            <span>Abra o WhatsApp → Configurações → Dispositivos Conectados → Conectar um dispositivo</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
