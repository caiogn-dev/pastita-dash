import React, { useEffect, useState } from 'react';
import logger from './services/logger';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout';
import { FullPageLoading } from './components/common';
import { useAuthStore } from './stores/authStore';
import { useAccountStore } from './stores/accountStore';
import { whatsappService, initializeWebSockets, disconnectWebSockets } from './services';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { AccountsPage } from './pages/accounts/AccountsPage';
import { AccountFormPage } from './pages/accounts/AccountFormPage';
import { AccountDetailPage } from './pages/accounts/AccountDetailPage';
import { MessagesPage } from './pages/messages/MessagesPage';
import { ConversationsPage } from './pages/conversations/ConversationsPage';
import { OrdersPage } from './pages/orders/OrdersPage';
import { OrderDetailPageNew as OrderDetailPage } from './pages/orders/OrderDetailPageNew';
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { LangflowPage } from './pages/langflow/LangflowPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// E-commerce Pages
import { CouponsPage } from './pages/coupons';
import { DeliveryZonesPage } from './pages/delivery';
import { ProductsPage } from './pages/products';

// Automation Pages
import {
  CompanyProfilesPage,
  CompanyProfileDetailPage,
  AutoMessagesPage,
  CustomerSessionsPage,
  AutomationLogsPage,
  ScheduledMessagesPage,
  ReportsPage,
} from './pages/automation';

// Pastita Pages
import { PastitaProductsPage, PastitaOrdersPage, PastitaSettingsPage } from './pages/pastita';

// Analytics/Reports Pages
import { AnalyticsPage } from './pages/reports';

// Stores Pages
import { StoresPage, StoreDetailPage } from './pages/stores';

// Marketing Pages
import { MarketingPage, SubscribersPage } from './pages/marketing';
import { NewCampaignPage } from './pages/marketing/email';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  const { isAuthenticated, token } = useAuthStore();
  const { setAccounts } = useAccountStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      if (isAuthenticated && token) {
        try {
          const response = await whatsappService.getAccounts();
          setAccounts(response.results);
          
          // Initialize WebSocket connections
          initializeWebSockets(token);
        } catch (error) {
          logger.error('Error loading accounts:', error);
        }
      } else {
        // Disconnect WebSockets when not authenticated
        disconnectWebSockets();
      }
      setIsInitializing(false);
    };

    initialize();
    
    return () => {
      disconnectWebSockets();
    };
  }, [isAuthenticated, token]);

  if (isInitializing) {
    return <FullPageLoading />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
      } />

      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="accounts/new" element={<AccountFormPage />} />
        <Route path="accounts/:id" element={<AccountDetailPage />} />
        <Route path="accounts/:id/edit" element={<AccountFormPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        
        {/* E-commerce Routes */}
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="delivery-zones" element={<DeliveryZonesPage />} />
        <Route path="products" element={<ProductsPage />} />
        
        <Route path="langflow" element={<LangflowPage />} />
        <Route path="settings" element={<SettingsPage />} />
        
        {/* Automation Routes */}
        <Route path="automation/companies" element={<CompanyProfilesPage />} />
        <Route path="automation/companies/new" element={<CompanyProfileDetailPage />} />
        <Route path="automation/companies/:id" element={<CompanyProfileDetailPage />} />
        <Route path="automation/companies/:companyId/messages" element={<AutoMessagesPage />} />
        <Route path="automation/sessions" element={<CustomerSessionsPage />} />
        <Route path="automation/logs" element={<AutomationLogsPage />} />
        <Route path="automation/scheduled" element={<ScheduledMessagesPage />} />
        <Route path="automation/reports" element={<ReportsPage />} />
        
        {/* Pastita Routes */}
        <Route path="pastita/products" element={<PastitaProductsPage />} />
        <Route path="pastita/orders" element={<PastitaOrdersPage />} />
        <Route path="pastita/settings" element={<PastitaSettingsPage />} />
        
        {/* Analytics/Reports Routes */}
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="reports" element={<AnalyticsPage />} />
        
        {/* Stores Routes */}
        <Route path="stores" element={<StoresPage />} />
        <Route path="stores/:storeId" element={<StoreDetailPage />} />
        <Route path="stores/:storeId/products" element={<ProductsPage />} />
        <Route path="stores/:storeId/orders" element={<OrdersPage />} />
        <Route path="stores/:storeId/coupons" element={<CouponsPage />} />
        <Route path="stores/:storeId/delivery" element={<DeliveryZonesPage />} />
        <Route path="stores/:storeId/analytics" element={<AnalyticsPage />} />
        
        {/* Marketing Routes */}
        <Route path="marketing" element={<MarketingPage />} />
        <Route path="marketing/subscribers" element={<SubscribersPage />} />
        <Route path="marketing/email" element={<MarketingPage />} />
        <Route path="marketing/email/new" element={<NewCampaignPage />} />
        <Route path="marketing/email/templates" element={<MarketingPage />} />
        <Route path="marketing/whatsapp" element={<MarketingPage />} />
        <Route path="marketing/whatsapp/new" element={<MarketingPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
