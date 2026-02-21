import React from 'react';

interface NodeItemProps {
  type: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const NodeItem: React.FC<NodeItemProps> = ({ type, label, icon, color, description }) => {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={`p-3 mb-3 rounded-lg border-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-all bg-white ${color}`}
      draggable
      onDragStart={onDragStart}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="font-medium text-sm">{label}</span>
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
};

export const NodePalette: React.FC = () => {
  const nodes = [
    {
      type: 'start',
      label: 'Início',
      icon: '🚀',
      color: 'border-green-400 hover:border-green-500',
      description: 'Ponto de início do fluxo',
    },
    {
      type: 'message',
      label: 'Mensagem',
      icon: '💬',
      color: 'border-blue-400 hover:border-blue-500',
      description: 'Envia mensagem com texto e botões',
    },
    {
      type: 'input',
      label: 'Input',
      icon: '⌨️',
      color: 'border-yellow-400 hover:border-yellow-500',
      description: 'Aguarda resposta do usuário',
    },
    {
      type: 'condition',
      label: 'Condição',
      icon: '🔀',
      color: 'border-purple-400 hover:border-purple-500',
      description: 'Ramifica o fluxo (if/else)',
    },
    {
      type: 'action',
      label: 'Ação',
      icon: '⚡',
      color: 'border-orange-400 hover:border-orange-500',
      description: 'Executa ação no sistema',
    },
    {
      type: 'end',
      label: 'Fim',
      icon: '🏁',
      color: 'border-red-400 hover:border-red-500',
      description: 'Finaliza o fluxo',
    },
  ];

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
        Componentes
      </h3>
      
      <div className="space-y-2">
        {nodes.map((node) => (
          <NodeItem key={node.type} {...node} />
        ))}
      </div>
      
      <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-xs text-blue-700">
          <strong>Dica:</strong> Arraste os componentes para o canvas para construir seu fluxo.
        </p>
      </div>
    </div>
  );
};
