import React, { useEffect, useState } from 'react';
import logger from './services/logger';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout';
import { FullPageLoading } from './components/common';
import { useAuthStore } from './stores/authStore';
import { useAccountStore } from './stores/accountStore';
import { whatsappService } from './services';
import { WebSocketProvider } from './context/WebSocketContext';

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
import { ProductsPageNew as ProductsPage } from './pages/products/ProductsPageNew';

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


// Analytics/Reports Pages
import { AnalyticsPage } from './pages/reports';

// Stores Pages
import { StoresPage, StoreDetailPage, StoreSettingsPage } from './pages/stores';

// Marketing Pages
import { MarketingPage, SubscribersPage } from './pages/marketing';
import { NewCampaignPage, CampaignsListPage } from './pages/marketing/email';
import { NewWhatsAppCampaignPage, WhatsAppCampaignsPage } from './pages/marketing/whatsapp';
import AutomationsPage from './pages/marketing/AutomationsPage';

// Instagram Pages
import { InstagramAccounts, InstagramInbox } from './pages/instagram';

// WhatsApp Pages
import { WebhookDiagnosticsPage } from './pages/whatsapp';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Inner app content
const AppContent: React.FC = () => {
  const { isAuthenticated, token } = useAuthStore();
  const { setAccounts } = useAccountStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      if (isAuthenticated && token) {
        try {
          const response = await whatsappService.getAccounts();
          setAccounts(response.results);
        } catch (error) {
          logger.error('Error loading accounts:', error);
        }
      }
      setIsInitializing(false);
    };
    initialize();
  }, [isAuthenticated, token, setAccounts]);

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
        {/* Store-scoped routes for orders and payments */}
        
        {/* E-commerce Routes */}

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
        
        {/* Analytics/Reports Routes */}
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="reports" element={<AnalyticsPage />} />
        
        {/* Stores Routes */}
        <Route path="stores" element={<StoresPage />} />
        <Route path="stores/:storeId" element={<StoreDetailPage />} />
        <Route path="stores/:storeId/products" element={<ProductsPage />} />
        <Route path="stores/:storeId/orders" element={<OrdersPage />} />
        <Route path="stores/:storeId/orders/:id" element={<OrderDetailPage />} />
        <Route path="stores/:storeId/coupons" element={<CouponsPage />} />
        <Route path="stores/:storeId/analytics" element={<AnalyticsPage />} />
        <Route path="stores/:storeId/payments" element={<PaymentsPage />} />
        <Route path="stores/:storeId/settings" element={<StoreSettingsPage />} />
        
        {/* Marketing Routes */}
        <Route path="marketing" element={<MarketingPage />} />
        <Route path="marketing/subscribers" element={<SubscribersPage />} />
        <Route path="marketing/automations" element={<AutomationsPage />} />
        <Route path="marketing/email" element={<CampaignsListPage />} />
        <Route path="marketing/email/campaigns" element={<CampaignsListPage />} />
        <Route path="marketing/email/new" element={<NewCampaignPage />} />
        <Route path="marketing/email/templates" element={<MarketingPage />} />
        <Route path="marketing/whatsapp" element={<WhatsAppCampaignsPage />} />
        <Route path="marketing/whatsapp/new" element={<NewWhatsAppCampaignPage />} />
        
        {/* Instagram Routes */}
        <Route path="instagram" element={<InstagramAccounts />} />
        <Route path="instagram/accounts" element={<InstagramAccounts />} />
        <Route path="instagram/inbox" element={<InstagramInbox />} />
        
        {/* WhatsApp Diagnostics */}
        <Route path="whatsapp/diagnostics" element={<WebhookDiagnosticsPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Main App with WebSocket Provider (singleton)
const App: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <AppContent />;
  }
  
  return (
    <WebSocketProvider>
      <AppContent />
    </WebSocketProvider>
  );
};

export default App;
