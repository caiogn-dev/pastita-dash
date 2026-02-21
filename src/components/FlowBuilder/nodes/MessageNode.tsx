import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface MessageNodeData {
  content?: string;
  buttons?: Array<{ id: string; title: string }>;
}

export const MessageNode: React.FC<NodeProps<MessageNodeData>> = ({ data, selected }) => {
  return (
    <div 
      className={`bg-white rounded-lg shadow-lg min-w-[250px] max-w-[300px] transition-all ${
        selected ? 'ring-2 ring-blue-500 shadow-xl' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      
      <div className="bg-blue-500 text-white px-3 py-2 rounded-t-lg font-medium text-sm flex items-center gap-2">
        <span>💬</span>
        <span>Mensagem</span>
      </div>
      
      <div className="p-3">
        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
          {data.content || 'Clique para editar a mensagem...'}
        </p>
        
        {data.buttons && data.buttons.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {data.buttons.map((btn) => (
              <span
                key={btn.id}
                className="text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200"
              >
                {btn.title}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
};
