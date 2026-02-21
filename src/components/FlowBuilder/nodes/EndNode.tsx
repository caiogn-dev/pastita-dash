import React from 'react';
import { Handle, Position } from 'reactflow';

interface EndNodeProps {
  data: {
    content?: string;
  };
}

export const EndNode: React.FC<EndNodeProps> = ({ data }) => {
  return (
    <div className="bg-red-500 text-white rounded-full shadow-lg min-w-[120px] text-center">
      <Handle type="target" position={Position.Top} className="!bg-red-600" />
      
      <div className="px-4 py-2 font-medium text-sm">
        🏁 {data.content || 'Fim'}
      </div>
    </div>
  );
};
