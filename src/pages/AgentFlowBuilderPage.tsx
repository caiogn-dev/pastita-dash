import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FlowCanvas } from '../../components/FlowBuilder/index';
import { ArrowLeft, Plus } from 'lucide-react';

export const AgentFlowBuilderPage: React.FC = () => {
  const { flowId } = useParams<{ flowId?: string }>();
  const navigate = useNavigate();
  const [storeId, setStoreId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Pega store_id do usuário logado ou da URL
    const fetchStore = async () => {
      try {
        const response = await fetch('/api/v1/stores/my-store/');
        if (response.ok) {
          const data = await response.json();
          setStoreId(data.id);
        }
      } catch (error) {
        console.error('Erro ao carregar loja:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStore();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/agents')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {flowId ? 'Editar Fluxo' : 'Novo Fluxo'}
              </h1>
              <p className="text-sm text-gray-500">
                Construa seu fluxo de atendimento visualmente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/agents/flows"
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Meus Fluxos
            </a>
            <button
              onClick={() => navigate('/agents/flows/new')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Fluxo
            </button>
          </div>
        </div>
      </header>

      {/* Flow Canvas */}
      <div className="flex-1 overflow-hidden">
        {storeId ? (
          <FlowCanvas flowId={flowId} storeId={storeId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600 mb-2">Loja não configurada</p>
              <button
                onClick={() => navigate('/settings/store')}
                className="text-blue-500 hover:underline"
              >
                Configurar loja
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
