/**
 * Orders Kanban Board
 * 
 * Drag-and-drop Kanban board for managing orders.
 * Features optimistic updates for smooth UX.
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ClockIcon,
  CheckCircleIcon,
  FireIcon,
  TruckIcon,
  HomeIcon,
  XCircleIcon,
  UserIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { UnifiedOrder } from '../../services/unifiedApi';

// Order status configuration
export const ORDER_STATUSES = [
  { 
    id: 'pending', 
    label: 'Pendente', 
    color: 'bg-yellow-50 border-yellow-200',
    headerColor: 'bg-yellow-500',
    icon: ClockIcon,
    aliases: ['pendente', 'awaiting_payment']
  },
  { 
    id: 'confirmed', 
    label: 'Confirmado', 
    color: 'bg-blue-50 border-blue-200',
    headerColor: 'bg-blue-500',
    icon: CheckCircleIcon,
    aliases: ['confirmado', 'aprovado', 'paid']
  },
  { 
    id: 'preparing', 
    label: 'Preparando', 
    color: 'bg-orange-50 border-orange-200',
    headerColor: 'bg-orange-500',
    icon: FireIcon,
    aliases: ['preparando', 'processing']
  },
  { 
    id: 'ready', 
    label: 'Pronto', 
    color: 'bg-purple-50 border-purple-200',
    headerColor: 'bg-purple-500',
    icon: CheckCircleIcon,
    aliases: ['pronto', 'ready_for_pickup', 'ready_for_delivery']
  },
  { 
    id: 'out_for_delivery', 
    label: 'Em Entrega', 
    color: 'bg-indigo-50 border-indigo-200',
    headerColor: 'bg-indigo-500',
    icon: TruckIcon,
    aliases: ['shipped', 'enviado', 'em_entrega', 'delivering']
  },
  { 
    id: 'delivered', 
    label: 'Entregue', 
    color: 'bg-green-50 border-green-200',
    headerColor: 'bg-green-500',
    icon: HomeIcon,
    aliases: ['entregue', 'completed']
  },
  { 
    id: 'cancelled', 
    label: 'Cancelado', 
    color: 'bg-red-50 border-red-200',
    headerColor: 'bg-red-500',
    icon: XCircleIcon,
    aliases: ['cancelado', 'refunded']
  },
];

// Helper to normalize status
const normalizeStatus = (status: string): string => {
  const normalized = status.toLowerCase();
  for (const s of ORDER_STATUSES) {
    if (s.id === normalized || s.aliases.includes(normalized)) {
      return s.id;
    }
  }
  return 'pending';
};

// Get status config
const getStatusConfig = (status: string) => {
  const normalized = normalizeStatus(status);
  return ORDER_STATUSES.find(s => s.id === normalized) || ORDER_STATUSES[0];
};

interface OrderCardProps {
  order: UnifiedOrder;
  onClick?: (order: UnifiedOrder) => void;
  isDragging?: boolean;
  isUpdating?: boolean;
}

// Sortable Order Card
const SortableOrderCard: React.FC<OrderCardProps> = ({ order, onClick, isUpdating }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <OrderCard order={order} onClick={onClick} isDragging={isDragging} isUpdating={isUpdating} />
    </div>
  );
};

// Order Card Component
const OrderCard: React.FC<OrderCardProps> = ({ order, onClick, isDragging, isUpdating }) => {
  return (
    <div
      className={`
        bg-white rounded-lg shadow-sm border-2 p-3 mb-2 cursor-pointer
        transition-all duration-200 hover:shadow-md hover:border-primary-300
        ${isDragging ? 'shadow-lg ring-2 ring-primary-500' : ''}
        ${isUpdating ? 'opacity-70' : ''}
      `}
      onClick={() => !isUpdating && onClick?.(order)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-gray-900 text-sm">
          #{order.order_number}
        </span>
        <div className="flex items-center gap-2">
          {isUpdating && (
            <ArrowPathIcon className="w-4 h-4 text-primary-500 animate-spin" />
          )}
          <span className="text-xs text-gray-500">
            {format(new Date(order.created_at), 'HH:mm', { locale: ptBR })}
          </span>
        </div>
      </div>

      {/* Customer */}
      <div className="flex items-center gap-1.5 mb-2">
        <UserIcon className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-sm text-gray-700 truncate">
          {order.customer_name || 'Cliente'}
        </span>
      </div>

      {/* Phone */}
      {order.customer_phone && (
        <div className="flex items-center gap-1.5 mb-2">
          <PhoneIcon className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500">{order.customer_phone}</span>
        </div>
      )}

      {/* Delivery Address */}
      {order.delivery_address && (
        <div className="flex items-start gap-1.5 mb-2">
          <MapPinIcon className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
          <span className="text-xs text-gray-500 line-clamp-2">
            {typeof order.delivery_address === 'string' 
              ? order.delivery_address 
              : order.delivery_address.street || 'Endereço não informado'}
          </span>
        </div>
      )}

      {/* Items count */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          {order.items_count || 0} item(ns)
        </span>
        <div className="flex items-center gap-1">
          <CurrencyDollarIcon className="w-4 h-4 text-green-600" />
          <span className="font-bold text-green-600">
            R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Store badge */}
      {order.store_name && (
        <div className="mt-2">
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
            {order.store_name}
          </span>
        </div>
      )}
    </div>
  );
};

// Kanban Column
interface KanbanColumnProps {
  status: typeof ORDER_STATUSES[0];
  orders: UnifiedOrder[];
  onOrderClick?: (order: UnifiedOrder) => void;
  updatingOrders?: Set<string>;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, orders, onOrderClick, updatingOrders }) => {
  const Icon = status.icon;
  
  return (
    <div className={`flex flex-col min-w-[280px] max-w-[320px] rounded-lg border ${status.color}`}>
      {/* Column Header */}
      <div className={`${status.headerColor} text-white px-3 py-2 rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span className="font-semibold text-sm">{status.label}</span>
          </div>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
            {orders.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 p-2 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[200px]">
        <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Nenhum pedido
            </div>
          ) : (
            orders.map((order) => (
              <SortableOrderCard
                key={order.id}
                order={order}
                onClick={onOrderClick}
                isUpdating={updatingOrders?.has(order.id)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};

// Main Kanban Component
interface OrdersKanbanProps {
  orders: UnifiedOrder[];
  onOrderClick?: (order: UnifiedOrder) => void;
  onStatusChange?: (orderId: string, newStatus: string) => Promise<void>;
  visibleStatuses?: string[];
}

export const OrdersKanban: React.FC<OrdersKanbanProps> = ({
  orders: externalOrders,
  onOrderClick,
  onStatusChange,
  visibleStatuses,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localOrders, setLocalOrders] = useState<UnifiedOrder[]>(externalOrders);
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());

  // Sync local orders with external orders (but preserve optimistic updates)
  useEffect(() => {
    setLocalOrders(prev => {
      // Keep optimistic updates for orders that are still being updated
      const updatingIds = Array.from(updatingOrders);
      if (updatingIds.length === 0) {
        return externalOrders;
      }
      
      // Merge: use external data but keep local status for updating orders
      return externalOrders.map(order => {
        if (updatingOrders.has(order.id)) {
          const localOrder = prev.find(o => o.id === order.id);
          return localOrder || order;
        }
        return order;
      });
    });
  }, [externalOrders, updatingOrders]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group orders by status
  const ordersByStatus = useMemo(() => {
    const grouped: Record<string, UnifiedOrder[]> = {};
    
    ORDER_STATUSES.forEach(status => {
      grouped[status.id] = [];
    });

    localOrders.forEach(order => {
      const normalizedStatus = normalizeStatus(order.status);
      if (grouped[normalizedStatus]) {
        grouped[normalizedStatus].push(order);
      } else {
        grouped['pending'].push(order);
      }
    });

    // Sort by created_at within each column
    Object.keys(grouped).forEach(status => {
      grouped[status].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return grouped;
  }, [localOrders]);

  // Filter visible statuses
  const displayStatuses = useMemo(() => {
    if (!visibleStatuses || visibleStatuses.length === 0) {
      return ORDER_STATUSES.filter(s => !['cancelled', 'delivered'].includes(s.id));
    }
    return ORDER_STATUSES.filter(s => visibleStatuses.includes(s.id));
  }, [visibleStatuses]);

  // Get active order for drag overlay
  const activeOrder = useMemo(() => {
    if (!activeId) return null;
    return localOrders.find(o => o.id === activeId) || null;
  }, [activeId, localOrders]);

  // Find which column an order is in
  const findColumn = (orderId: string): string | null => {
    for (const [status, statusOrders] of Object.entries(ordersByStatus)) {
      if (statusOrders.some(o => o.id === orderId)) {
        return status;
      }
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeOrderId = active.id as string;
    const overId = over.id as string;

    const sourceColumn = findColumn(activeOrderId);
    
    let destColumn: string | null = null;
    if (ORDER_STATUSES.some(s => s.id === overId)) {
      destColumn = overId;
    } else {
      destColumn = findColumn(overId);
    }

    if (!sourceColumn || !destColumn || sourceColumn === destColumn) return;

    // OPTIMISTIC UPDATE: Update local state immediately
    setLocalOrders(prev => 
      prev.map(order => 
        order.id === activeOrderId 
          ? { ...order, status: destColumn as string }
          : order
      )
    );

    // Mark order as updating (shows spinner)
    setUpdatingOrders(prev => new Set(prev).add(activeOrderId));

    // Call API in background
    if (onStatusChange) {
      try {
        await onStatusChange(activeOrderId, destColumn);
      } catch (error) {
        // ROLLBACK: Revert to original status on error
        setLocalOrders(prev => 
          prev.map(order => 
            order.id === activeOrderId 
              ? { ...order, status: sourceColumn as string }
              : order
          )
        );
        console.error('Failed to update order status:', error);
      }
    }

    // Remove from updating set
    setUpdatingOrders(prev => {
      const next = new Set(prev);
      next.delete(activeOrderId);
      return next;
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 px-1">
        {displayStatuses.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            orders={ordersByStatus[status.id] || []}
            onOrderClick={onOrderClick}
            updatingOrders={updatingOrders}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeOrder ? (
          <div className="rotate-3 scale-105">
            <OrderCard order={activeOrder} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default OrdersKanban;
