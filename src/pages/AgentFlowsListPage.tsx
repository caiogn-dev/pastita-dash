import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Play, Trash2, Copy } from 'lucide-react';
import { agentFlowApi, AgentFlow } from '../services/automation';

export const AgentFlowsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<AgentFlow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      const response = await agentFlowApi.list();
      setFlows(response.results || []);
    } catch (error) {
      console.error('Erro ao carregar fluxos:', error);
      setFlows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFlow = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fluxo?')) return;

    try {
      await agentFlowApi.delete(id);
      setFlows(flows.filter((f) => f.id !== id));
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const duplicateFlow = async (flow: AgentFlow) => {
    try {
      await agentFlowApi.duplicate(flow.id);
      fetchFlows();
    } catch (error) {
      console.error('Erro ao duplicar:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fluxos de Atendimento</h1>
          <p className="text-gray-500 mt-1">
            Gerencie seus fluxos de conversação visual
          </p>
        </div>
        <button
          onClick={() => navigate('/agents/flows/new')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Fluxo
        </button>
      </div>

      {flows.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="text-6xl mb-4">🔄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum fluxo criado
          </h3>
          <p className="text-gray-500 mb-4">
            Crie seu primeiro fluxo de atendimento automatizado
          </p>
          <button
            onClick={() => navigate('/agents/flows/new')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
          >
            Criar Fluxo
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {flows.map((flow) => (
            <div
              key={flow.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {flow.name}
                    </h3>
                    {flow.is_default && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Ativo
                      </span>
                    )}
                    {!flow.is_active && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">
                    {flow.description || 'Sem descrição'}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{flow.total_executions} execuções</span>
                    <span>•</span>
                    <span>
                      Criado em{' '}
                      {new Date(flow.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/agents/flows/${flow.id}`)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => duplicateFlow(flow)}
                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Duplicar"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  {!flow.is_default && (
                    <button
                      onClick={() => deleteFlow(flow.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
