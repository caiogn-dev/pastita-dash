import React from 'react';
import { useUberDeliveryPolling } from '../hooks/useUberDeliveryPolling';

export const OrderDeliveryModal = ({ orderId, storeSlug, isOpen, onClose, onAccept }) => {
  const { state, cancelDelivery, retryDelivery } = useUberDeliveryPolling(orderId, storeSlug, isOpen);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Searching State */}
        {state.status === 'searching' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              animation: 'spin 1s linear infinite',
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              🔄
            </div>
            <h2 style={{ marginTop: 0 }}>Procurando Motorista</h2>
            <p style={{ color: '#666' }}>Aguarde enquanto buscamos um motorista disponível...</p>
            <p style={{ fontSize: '12px', color: '#999' }}>Tempo restante: {state.secondsRemaining}s</p>
          </div>
        )}

        {/* Driver Found State */}
        {state.status === 'driver_found' && state.driver && (
          <div>
            <h2 style={{ marginTop: 0 }}>Motorista Encontrado! 🎉</h2>
            <div style={{
              backgroundColor: '#f5f5f5',
              padding: '16px',
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <strong>Motorista:</strong> {state.driver.name}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>Telefone:</strong> {state.driver.phone}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>Veículo:</strong> {state.driver.vehicle_info}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>ETA:</strong> {state.driver.eta_minutes} minutos
              </div>
              {state.driver.pickup_instructions && (
                <div>
                  <strong>Instruções:</strong> {state.driver.pickup_instructions}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  onAccept(state.driver);
                  onClose();
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ✅ Aceitar Motorista
              </button>
              <button
                onClick={retryDelivery}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#ffc107',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🔄 Tentar Novamente
              </button>
            </div>
          </div>
        )}

        {/* No Drivers State */}
        {state.status === 'no_drivers' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <h2 style={{ marginTop: 0 }}>Nenhum Motorista Disponível</h2>
            <p style={{ color: '#666' }}>No momento, não há motoristas disponíveis em sua região.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={retryDelivery}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🔄 Tentar Novamente
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ✖️ Fechar
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {state.status === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ marginTop: 0 }}>Erro ao Procurar Motorista</h2>
            <p style={{ color: '#666' }}>{state.error || 'Algo deu errado. Tente novamente.'}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={retryDelivery}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🔄 Tentar Novamente
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ✖️ Fechar
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};
