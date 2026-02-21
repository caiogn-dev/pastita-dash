import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  MiniMap,
  Node,
  useEdgesState,
  useNodesState,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { StartNode, MessageNode, EndNode } from './nodes';
import { NodePalette } from './NodePalette';
import { NodeConfigPanel } from './NodeConfigPanel';

const nodeTypes: Record<string, React.FC<import('reactflow').NodeProps>> = {
  start: StartNode,
  message: MessageNode,
  end: EndNode,
};

// Dados iniciais do fluxo (exemplo)
const defaultNodes: Node[] = [
  {
    id: 'node_start',
    type: 'start',
    position: { x: 250, y: 50 },
    data: { label: 'Início' },
  },
  {
    id: 'node_greeting',
    type: 'message',
    position: { x: 250, y: 150 },
    data: {
      content: 'Oi! 👋 Bem-vindo à Pastita!\n\nO que você quer hoje?',
      buttons: [
        { id: 'btn_menu', title: '📋 Cardápio' },
        { id: 'btn_order', title: '⚡ Pedido' },
      ],
    },
  },
  {
    id: 'node_menu',
    type: 'message',
    position: { x: 100, y: 300 },
    data: {
      content: '📋 Nosso Cardápio:\n\n• Rondelli de Frango\n• Rondelli de Presunto\n• Rondelli 4 Queijos\n\nQuantos você quer?',
      buttons: [],
    },
  },
  {
    id: 'node_end',
    type: 'end',
    position: { x: 250, y: 450 },
    data: { content: 'Obrigado! Seu pedido foi enviado. 🙏' },
  },
];

const defaultEdges: Edge[] = [
  { id: 'e1', source: 'node_start', target: 'node_greeting' },
  { id: 'e2', source: 'node_greeting', target: 'node_menu', label: 'Cardápio' },
  { id: 'e3', source: 'node_menu', target: 'node_end' },
];

interface FlowCanvasProps {
  flowId?: string;
  storeId: string;
}

const FlowCanvasInner: React.FC<FlowCanvasProps> = ({ flowId, storeId }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [flowName, setFlowName] = useState('Fluxo de Atendimento - Pastita');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Carrega fluxo existente se tiver flowId
  useEffect(() => {
    if (flowId) {
      loadFlow(flowId);
    }
  }, [flowId]);

  const loadFlow = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/automation/flows/${id}/`);
      if (response.ok) {
        const data = await response.json();
        setFlowName(data.name);
        if (data.flow_json) {
          setNodes(data.flow_json.nodes || defaultNodes);
          setEdges(data.flow_json.edges || defaultEdges);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar fluxo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFlow = async () => {
    setIsSaving(true);
    
    const flowData = {
      name: flowName,
      store: storeId,
      flow_json: {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
        })),
      },
    };

    try {
      const url = flowId 
        ? `/api/v1/automation/flows/${flowId}/` 
        : '/api/v1/automation/flows/';
      const method = flowId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify(flowData),
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`✅ Fluxo ${flowId ? 'atualizado' : 'criado'} com sucesso!`);
        if (!flowId && result.id) {
          // Redireciona para URL com o novo ID
          window.location.href = `/agents/flows/${result.id}`;
        }
      } else {
        const error = await response.json();
        alert(`❌ Erro: ${error.detail || 'Erro ao salvar'}`);
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro de conexão ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const testFlow = async () => {
    if (!flowId) {
      alert('Salve o fluxo primeiro!');
      return;
    }
    
    const message = prompt('Mensagem de teste:', 'Oi');
    if (!message) return;
    
    try {
      const response = await fetch(`/api/v1/automation/flows/${flowId}/test/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({ message }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert(`🤖 Resposta do bot:\n\n${result.content || 'Sem resposta'}`);
      } else {
        alert(`❌ Erro: ${result.error || 'Erro no teste'}`);
      }
    } catch (error) {
      alert('❌ Erro de conexão no teste');
    }
  };

  const activateFlow = async () => {
    if (!flowId) {
      alert('Salve o fluxo primeiro!');
      return;
    }
    
    if (!confirm('Ativar este fluxo para atendimento? O fluxo atual será substituído.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/v1/automation/flows/${flowId}/activate/`, {
        method: 'POST',
        headers: { 
          'X-CSRFToken': getCsrfToken(),
        },
      });
      
      if (response.ok) {
        alert('✅ Fluxo ativado com sucesso!');
      } else {
        alert('❌ Erro ao ativar fluxo');
      }
    } catch (error) {
      alert('❌ Erro de conexão');
    }
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      // Calcula posição relativa ao canvas
      const bounds = (event.target as HTMLElement).getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 100,
        y: event.clientY - bounds.top - 25,
      };

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type,
        position,
        data: getDefaultNodeData(type),
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const getDefaultNodeData = (type: string) => {
    switch (type) {
      case 'start':
        return { label: 'Início' };
      case 'message':
        return { content: 'Digite sua mensagem aqui...', buttons: [] };
      case 'end':
        return { content: 'Obrigado pelo contato! 🙏' };
      default:
        return {};
    }
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: newData } : n
      )
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando fluxo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="px-4 py-2 text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[300px]"
            placeholder="Nome do Fluxo"
          />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded">
              {nodes.length} nós
            </span>
            <span className="bg-gray-100 px-2 py-1 rounded">
              {edges.length} conexões
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={testFlow}
            disabled={!flowId}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center gap-2 transition-colors"
          >
            🧪 Testar
          </button>
          <button
            onClick={activateFlow}
            disabled={!flowId}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center gap-2 transition-colors"
          >
            🚀 Ativar
          </button>
          <button
            onClick={saveFlow}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 font-medium flex items-center gap-2 transition-colors"
          >
            {isSaving ? '💾 Salvando...' : '💾 Salvar'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <NodePalette />

        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={(_, node) => setSelectedNode(node)}
            onPaneClick={() => setSelectedNode(null)}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-right"
          >
            <Background color="#cbd5e1" gap={16} size={1} />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="bg-white rounded-lg shadow-lg"
            />
            <Controls className="bg-white rounded-lg shadow-lg" />
          </ReactFlow>
        </div>

        {/* Config Panel */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onChange={(data) => updateNodeData(selectedNode.id, data)}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
};

// Helper para pegar CSRF token
function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

// Wrapper com Provider
export const FlowCanvas: React.FC<FlowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
