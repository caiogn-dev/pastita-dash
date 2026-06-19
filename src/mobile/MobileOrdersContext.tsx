// src/mobile/MobileOrdersContext.tsx
import React, { createContext, useContext } from 'react';
import { useStoreOrdersFeed, type StoreOrdersFeed } from './useStoreOrdersFeed';

const Ctx = createContext<StoreOrdersFeed | null>(null);

export const MobileOrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const feed = useStoreOrdersFeed();
  return <Ctx.Provider value={feed}>{children}</Ctx.Provider>;
};

export function useMobileOrders(): StoreOrdersFeed {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMobileOrders must be used within MobileOrdersProvider');
  return ctx;
}
