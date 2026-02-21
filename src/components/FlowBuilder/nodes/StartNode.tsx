import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface StartNodeData {
  label?: string;
}

export const StartNode: React.FC<NodeProps<StartNodeData>> = ({ data }) => {
  return (
    <div className="bg-green-500 text-white rounded-full shadow-lg min-w-[120px] text-center">
      <Handle type="source" position={Position.Bottom} className="!bg-green-600" />
      
      <div className="px-4 py-2 font-medium text-sm">
        🚀 {data.label || 'Início'}
      </div>
    </div>
  );
};
