import React, { useCallback, useEffect, useState } from 'react';
import {
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  UserIcon,
  ComputerDesktopIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Input, Badge, Modal, Loading } from '../../components/common';
import { auditService, AuditLog, DataExportLog } from '../../services/audit';
import { getErrorMessage } from '../../services';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'gray' | 'primary' | 'purple' | 'orange' | 'teal' | 'indigo';

const ACTION_COLORS: Record<string, BadgeVariant> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  login: 'purple',
  logout: 'gray',
  view: 'warning',
  export: 'teal',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  login: 'Login',
  logout: 'Logout',
  view: 'Visualização',
  export: 'Exportação',
};

const EXPORT_STATUS_COLORS: Record<string, BadgeVariant> = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
};

const EXPORT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  completed: 'Concluído',
  failed: 'Falhou',
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const AuditPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'logs' | 'exports'>('logs');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [exports, setExports] = useState<DataExportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [moduleFilter, setModuleFilter] = useState<string>('');

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportForm, setExportForm] = useState({
    export_type: 'orders' as 'messages' | 'orders' | 'conversations' | 'payments',
    export_format: 'csv' as 'csv' | 'excel',
  });
  const [exporting, setExporting] = useState(false);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (actionFilter) params.action = actionFilter;
      if (moduleFilter) params.module = moduleFilter;

      const data = await auditService.getAuditLogs(params);
      setLogs(data.results);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter, moduleFilter]);

  const loadExports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await auditService.getExports();
      setExports(data.results);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    } else {
      loadExports();
    }
  }, [activeTab, loadLogs, loadExports]);

  const handleViewDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await auditService.exportData({
        export_type: exportForm.export_type,
        export_format: exportForm.export_format,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${exportForm.export_type}_${new Date().toISOString().split('T')[0]}.${exportForm.export_format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Exportação concluída!');
      setIsExportModalOpen(false);
      loadExports();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  if (loading && logs.length === 0 && exports.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoria</h1>
          <p className="text-gray-500">Histórico de atividades e exportações de dados</p>
        </div>
        <Button onClick={() => setIsExportModalOpen(true)}>
          <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
          Exportar Dados
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'logs'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ClockIcon className="w-5 h-5 inline-block mr-2" />
            Logs de Atividade
          </button>
          <button
            onClick={() => setActiveTab('exports')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'exports'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DocumentArrowDownIcon className="w-5 h-5 inline-block mr-2" />
            Exportações
          </button>
        </nav>
      </div>

      {activeTab === 'logs' && (
        <>
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar por usuário ou descrição..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Todas as ações</option>
                <option value="create">Criação</option>
                <option value="update">Atualização</option>
                <option value="delete">Exclusão</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
              </select>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Todos os módulos</option>
                <option value="orders">Pedidos</option>
                <option value="products">Produtos</option>
                <option value="users">Usuários</option>
                <option value="payments">Pagamentos</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          </Card>

          {/* Logs Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Módulo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        Nenhum log encontrado
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <UserIcon className="w-5 h-5 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{log.user_email || 'Sistema'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={ACTION_COLORS[log.action] || 'gray'}>
                            {ACTION_LABELS[log.action] || log.action}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700 truncate max-w-xs block">
                            {log.action_description || log.object_repr}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{log.module || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-gray-500">
                            <ComputerDesktopIcon className="w-4 h-4 mr-1" />
                            {log.user_ip || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleViewDetail(log)}
                            className="p-1 text-gray-400 hover:text-primary-600"
                            title="Ver detalhes"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {activeTab === 'exports' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Formato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registros
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tamanho
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Nenhuma exportação encontrada
                    </td>
                  </tr>
                ) : (
                  exports.map((exp) => (
                    <tr key={exp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(exp.created_at)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 capitalize">{exp.export_type}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 uppercase">{exp.export_format}</td>
                      <td className="px-6 py-4">
                        <Badge variant={EXPORT_STATUS_COLORS[exp.status] || 'gray'}>
                          {EXPORT_STATUS_LABELS[exp.status] || exp.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{exp.total_records}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatFileSize(exp.file_size)}</td>
                      <td className="px-6 py-4 text-right">
                        {exp.status === 'completed' && exp.download_url && (
                          <a
                            href={exp.download_url}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                            download
                          >
                            Download
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detalhes do Log"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Data/Hora</label>
                <p className="text-gray-900">{formatDate(selectedLog.created_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Usuário</label>
                <p className="text-gray-900">{selectedLog.user_email || 'Sistema'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Ação</label>
                <Badge variant={ACTION_COLORS[selectedLog.action] || 'gray'}>
                  {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                </Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Módulo</label>
                <p className="text-gray-900">{selectedLog.module || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">IP</label>
                <p className="text-gray-900">{selectedLog.user_ip || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Método</label>
                <p className="text-gray-900">{selectedLog.request_method || '-'}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Descrição</label>
              <p className="text-gray-900">{selectedLog.action_description || selectedLog.object_repr}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Caminho</label>
              <p className="text-gray-900 font-mono text-sm">{selectedLog.request_path || '-'}</p>
            </div>

            {Object.keys(selectedLog.changes || {}).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Alterações</label>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  {Object.entries(selectedLog.changes).map(([field, change]) => (
                    <div key={field} className="text-sm">
                      <span className="font-medium text-gray-700">{field}:</span>
                      <span className="text-red-600 line-through ml-2">{String(change.old)}</span>
                      <span className="text-gray-400 mx-2">→</span>
                      <span className="text-green-600">{String(change.new)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Exportar Dados"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Dados</label>
            <select
              value={exportForm.export_type}
              onChange={(e) =>
                setExportForm({
                  ...exportForm,
                  export_type: e.target.value as typeof exportForm.export_type,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="orders">Pedidos</option>
              <option value="messages">Mensagens</option>
              <option value="conversations">Conversas</option>
              <option value="payments">Pagamentos</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Formato</label>
            <select
              value={exportForm.export_format}
              onChange={(e) =>
                setExportForm({
                  ...exportForm,
                  export_format: e.target.value as typeof exportForm.export_format,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsExportModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exportando...' : 'Exportar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AuditPage;
