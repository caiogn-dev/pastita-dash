import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';

interface NodeConfigPanelProps {
  node: Node;
  onChange: (data: any) => void;
  onClose: () => void;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  node,
  onChange,
  onClose,
}) => {
  const [formData, setFormData] = useState(node.data);

  useEffect(() => {
    setFormData(node.data);
  }, [node]);

  const handleSave = () => {
    onChange(formData);
    onClose();
  };

  const handleAddButton = () => {
    const newButton = {
      id: `btn_${Date.now()}`,
      title: 'Novo Botão',
    };
    setFormData({
      ...formData,
      buttons: [...(formData.buttons || []), newButton],
    });
  };

  const handleRemoveButton = (index: number) => {
    const newButtons = [...(formData.buttons || [])];
    newButtons.splice(index, 1);
    setFormData({ ...formData, buttons: newButtons });
  };

  const handleUpdateButton = (index: number, field: string, value: string) => {
    const newButtons = [...(formData.buttons || [])];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setFormData({ ...formData, buttons: newButtons });
  };

  const renderFields = () => {
    switch (node.type) {
      case 'start':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={formData.label || ''}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Início"
              />
            </div>
          </div>
        );

      case 'message':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensagem
              </label>
              <textarea
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                placeholder="Digite a mensagem aqui..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Botões
                </label>
                <button
                  onClick={handleAddButton}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  + Adicionar
                </button>
              </div>
              
              <div className="space-y-2">
                {(formData.buttons || []).map((button: any, index: number) => (
                  <div key={button.id} className="flex gap-2">
                    <input
                      type="text"
                      value={button.title}
                      onChange={(e) => handleUpdateButton(index, 'title', e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border rounded"
                      placeholder="Título do botão"
                    />
                    <button
                      onClick={() => handleRemoveButton(index)}
                      className="text-red-500 hover:text-red-700 px-2"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'end':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensagem Final
              </label>
              <textarea
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 h-24 resize-none"
                placeholder="Obrigado pelo contato!"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-gray-500 text-sm">
            Configuração não disponível para este tipo de nó.
          </div>
        );
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Configurar Nó
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="mb-4">
        <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
          Tipo: {node.type}
        </span>
        <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 ml-2">
          ID: {node.id}
        </span>
      </div>

      {renderFields()}

      <div className="mt-6 flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 font-medium"
        >
          💾 Salvar
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};
