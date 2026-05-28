import React, { useEffect, useState, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import logger from './services/logger';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout';
import { FullPageLoading } from './components/common';
import { PageWrapper } from './components/ErrorBoundary';
import { useAuthStore } from './stores/authStore';
import { useAccountStore } from './stores/accountStore';
import { setAuthToken } from './services';
import api from './services/api';
import { WebSocketProvider } from './context/WebSocketContext';
import { WhatsAppWsProvider } from './context/WhatsAppWsContext';
import './App.css';

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const CadastroPage = lazy(() => import('./pages/auth/CadastroPage').then(m => ({ default: m.CadastroPage })));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AccountsPage = lazy(() => import('./pages/accounts/AccountsPage').then(m => ({ default: m.AccountsPage })));
const AccountFormPage = lazy(() => import('./pages/accounts/AccountFormPage').then(m => ({ default: m.AccountFormPage })));
const AccountDetailPage = lazy(() => import('./pages/accounts/AccountDetailPage').then(m => ({ default: m.AccountDetailPage })));
const MessagesPage = lazy(() => import('./pages/messages/MessagesPage').then(m => ({ default: m.MessagesPage })));
const ConversationsPage = lazy(() => import('./pages/conversations/ConversationsPage').then(m => ({ default: m.ConversationsPage })));
const OrdersPage = lazy(() => import('./pages/orders/OrdersPage').then(m => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import('./pages/orders/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })));
const OrderNewPage = lazy(() => import('./pages/orders/OrderNewPage').then(m => ({ default: m.OrderNewPage })));
const PaymentsPage = lazy(() => import('./pages/payments/PaymentsPage').then(m => ({ default: m.PaymentsPage })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));

// Agents Pages (Langchain AI)
const AgentsPage = lazy(() => import('./pages/agents').then(m => ({ default: m.AgentsPage })));
const AgentDetailPage = lazy(() => import('./pages/agents').then(m => ({ default: m.AgentDetailPage })));
const AgentCreatePage = lazy(() => import('./pages/agents').then(m => ({ default: m.AgentCreatePage })));
const AgentTestPage = lazy(() => import('./pages/agents').then(m => ({ default: m.AgentTestPage })));
const UnifiedOrchestratorTest = lazy(() => import('./pages/agents').then(m => ({ default: m.UnifiedOrchestratorTest })));

// E-commerce Pages
const CouponsPage = lazy(() => import('./pages/coupons').then(m => ({ default: m.CouponsPage })));
const ProductsPage = lazy(() => import('./pages/products/ProductsPageNew').then(m => ({ default: m.ProductsPageNew })));
const CombosPage = lazy(() => import('./pages/products/CombosPage').then(m => ({ default: m.CombosPage })));
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage').then(m => ({ default: m.CustomersPage })));

// Automation Pages
const CompanyProfilesPage = lazy(() => import('./pages/automation').then(m => ({ default: m.CompanyProfilesPage })));
const CompanyProfileDetailPage = lazy(() => import('./pages/automation').then(m => ({ default: m.CompanyProfileDetailPage })));
const AutoMessagesPage = lazy(() => import('./pages/automation').then(m => ({ default: m.AutoMessagesPage })));
const CustomerSessionsPage = lazy(() => import('./pages/automation').then(m => ({ default: m.CustomerSessionsPage })));
const AutomationLogsPage = lazy(() => import('./pages/automation').then(m => ({ default: m.AutomationLogsPage })));
const ScheduledMessagesPage = lazy(() => import('./pages/automation').then(m => ({ default: m.ScheduledMessagesPage })));
const ReportsPage = lazy(() => import('./pages/automation').then(m => ({ default: m.ReportsPage })));
const AgentFlowsPage = lazy(() => import('./pages/automation/AgentFlowsPage').then(m => ({ default: m.AgentFlowsPage })));

// Intent Detection Pages (Novo Sistema)
const IntentStatsPage = lazy(() => import('./pages/automation').then(m => ({ default: m.IntentStatsPage })));
const IntentLogsPage = lazy(() => import('./pages/automation').then(m => ({ default: m.IntentLogsPage })));

// Analytics/Reports Pages
const AnalyticsPage = lazy(() => import('./pages/reports').then(m => ({ default: m.AnalyticsPage })));
const SaladasDashboardPage = lazy(() => import('./pages/reports').then(m => ({ default: m.SaladasDashboardPage })));

// Stores Pages
const StoresPage = lazy(() => import('./pages/stores').then(m => ({ default: m.StoresPage })));
const StoreDetailPage = lazy(() => import('./pages/stores').then(m => ({ default: m.StoreDetailPage })));
const StoreSettingsPage = lazy(() => import('./pages/stores').then(m => ({ default: m.StoreSettingsPage })));
const StorefrontPage = lazy(() => import('./pages/stores').then(m => ({ default: m.StorefrontPage })));

// Marketing Pages
const MarketingPage = lazy(() => import('./pages/marketing').then(m => ({ default: m.MarketingPage })));
const SubscribersPage = lazy(() => import('./pages/marketing').then(m => ({ default: m.SubscribersPage })));
const NewCampaignPage = lazy(() => import('./pages/marketing/email').then(m => ({ default: m.NewCampaignPage })));
const CampaignsListPage = lazy(() => import('./pages/marketing/email').then(m => ({ default: m.CampaignsListPage })));
const NewWhatsAppCampaignPage = lazy(() => import('./pages/marketing/whatsapp').then(m => ({ default: m.NewWhatsAppCampaignPage })));
const WhatsAppCampaignsPage = lazy(() => import('./pages/marketing/whatsapp').then(m => ({ default: m.WhatsAppCampaignsPage })));
const WhatsAppTemplatesPage = lazy(() => import('./pages/marketing/whatsapp/WhatsAppTemplatesPage').then(m => ({ default: m.default })));
const AutomationsPage = lazy(() => import('./pages/marketing/AutomationsPage').then(m => ({ default: m.default })));

// Delivery Pages
const DeliveryZonesPage = lazy(() => import('./pages/delivery/DeliveryZonesPage').then(m => ({ default: m.default || m.DeliveryZonesPage })));

// Instagram Pages
const InstagramAccountsPage = lazy(() => import('./pages/instagram').then(m => ({ default: m.InstagramAccountsPage })));
const InstagramDashboardPage = lazy(() => import('./pages/instagram').then(m => ({ default: m.InstagramDashboardPage })));
const InstagramInbox = lazy(() => import('./pages/instagram').then(m => ({ default: m.InstagramInbox })));
const InstagramCallbackPage = lazy(() => import('./pages/instagram/InstagramCallbackPage'));

// Messenger Pages
const MessengerInbox = lazy(() => import('./pages/messenger').then(m => ({ default: m.MessengerInbox })));
const MessengerAccounts = lazy(() => import('./pages/messenger').then(m => ({ default: m.MessengerAccounts })));

// Unified Messaging Connections Page
const ConnectionsPage = lazy(() => import('./pages/messaging/ConnectionsPage').then(m => ({ default: m.default })));

// WhatsApp Pages
const WebhookDiagnosticsPage = lazy(() => import('./pages/whatsapp').then(m => ({ default: m.WebhookDiagnosticsPage })));
const WhatsAppChatPage = lazy(() => import('./pages/whatsapp').then(m => ({ default: m.WhatsAppChatPage })));
const WhatsAppInboxPage = lazy(() => import('./pages/whatsapp').then(m => ({ default: m.WhatsAppInboxPage })));
const DebugDashboardPage = lazy(() => import('./pages/whatsapp').then(m => ({ default: m.DebugDashboardPage })));
const HandoverRequestsPage = lazy(() => import('./pages/whatsapp').then(m => ({ default: m.HandoverRequestsPage })));

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
      if (token) {
        setAuthToken(token as string);
      }

      if (isAuthenticated && token) {
        try {
          // skipAutoLogout: a 401 here does NOT mean the token is invalid —
          // the user just logged in. Without this flag the interceptor would
          // call logout() and send the user back to /login in a loop.
          const response = await api.get('/whatsapp/accounts/', { skipAutoLogout: true });
          setAccounts(response.data?.results || []);
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
        isAuthenticated ? <Navigate to="/" replace /> : (
          <PageWrapper>
            <LoginPage />
          </PageWrapper>
        )
      } />
      <Route path="/cadastro" element={
        <PageWrapper>
          <CadastroPage />
        </PageWrapper>
      } />

      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<PageWrapper><DashboardPage /></PageWrapper>} />
        <Route path="accounts" element={<PageWrapper><AccountsPage /></PageWrapper>} />
        <Route path="accounts/new" element={<PageWrapper><AccountFormPage /></PageWrapper>} />
        <Route path="accounts/:id" element={<PageWrapper><AccountDetailPage /></PageWrapper>} />
        <Route path="accounts/:id/edit" element={<PageWrapper><AccountFormPage /></PageWrapper>} />
        <Route path="messages" element={<PageWrapper><MessagesPage /></PageWrapper>} />
        <Route path="conversations" element={<PageWrapper><ConversationsPage /></PageWrapper>} />
        
        {/* AI Agents Routes (Langchain) */}
        <Route path="agents" element={<PageWrapper><AgentsPage /></PageWrapper>} />
        <Route path="agents/new" element={<PageWrapper><AgentCreatePage /></PageWrapper>} />
        <Route path="agents/:id" element={<PageWrapper><AgentDetailPage /></PageWrapper>} />
        <Route path="agents/:id/test" element={<PageWrapper><AgentTestPage /></PageWrapper>} />
        <Route path="agents/:id/conversations" element={<PageWrapper><AgentDetailPage /></PageWrapper>} />
        <Route path="agents/test/orchestrator" element={<PageWrapper><UnifiedOrchestratorTest /></PageWrapper>} />
        
        {/* Settings */}
        <Route path="settings" element={<PageWrapper><SettingsPage /></PageWrapper>} />
        
        {/* Automation Routes */}
        <Route path="automation/companies" element={<PageWrapper><CompanyProfilesPage /></PageWrapper>} />
        <Route path="automation/companies/new" element={<PageWrapper><CompanyProfileDetailPage /></PageWrapper>} />
        <Route path="automation/companies/:id" element={<PageWrapper><CompanyProfileDetailPage /></PageWrapper>} />
        <Route path="automation/messages" element={<PageWrapper><AutoMessagesPage /></PageWrapper>} />
        <Route path="automation/companies/:companyId/messages" element={<PageWrapper><AutoMessagesPage /></PageWrapper>} />
        <Route path="automation/sessions" element={<PageWrapper><CustomerSessionsPage /></PageWrapper>} />
        <Route path="automation/logs" element={<PageWrapper><AutomationLogsPage /></PageWrapper>} />
        <Route path="automation/scheduled" element={<PageWrapper><ScheduledMessagesPage /></PageWrapper>} />
        <Route path="automation/reports" element={<PageWrapper><ReportsPage /></PageWrapper>} />
        <Route path="automation/flows" element={<PageWrapper><AgentFlowsPage /></PageWrapper>} />

        {/* Intent Detection Routes */}
        <Route path="automation/intents" element={<Navigate to="/automation/intents/stats" replace />} />
        <Route path="automation/intents/stats" element={<PageWrapper><IntentStatsPage /></PageWrapper>} />
        <Route path="automation/intents/logs" element={<PageWrapper><IntentLogsPage /></PageWrapper>} />
        
        {/* Analytics/Reports Routes */}
        <Route path="analytics" element={<PageWrapper><AnalyticsPage /></PageWrapper>} />
        <Route path="analytics/saladas" element={<PageWrapper><SaladasDashboardPage /></PageWrapper>} />
        <Route path="reports" element={<Navigate to="/analytics" replace />} />
        
        {/* Stores Routes */}
        <Route path="stores" element={<PageWrapper><StoresPage /></PageWrapper>} />
        <Route path="stores/:storeId" element={<PageWrapper><StoreDetailPage /></PageWrapper>} />
        <Route path="stores/:storeId/products" element={<PageWrapper><ProductsPage /></PageWrapper>} />
        <Route path="stores/:storeId/combos" element={<PageWrapper><CombosPage /></PageWrapper>} />
        <Route path="stores/:storeId/orders" element={<PageWrapper><OrdersPage /></PageWrapper>} />
        <Route path="stores/:storeId/customers" element={<PageWrapper><CustomersPage /></PageWrapper>} />
        <Route path="stores/:storeId/orders/new" element={<PageWrapper><OrderNewPage /></PageWrapper>} />
        <Route path="stores/:storeId/orders/:id" element={<PageWrapper><OrderDetailPage /></PageWrapper>} />
        <Route path="stores/:storeId/coupons" element={<PageWrapper><CouponsPage /></PageWrapper>} />
        <Route path="stores/:storeId/analytics" element={<PageWrapper><AnalyticsPage /></PageWrapper>} />
        <Route path="stores/:storeId/payments" element={<PageWrapper><PaymentsPage /></PageWrapper>} />
        <Route path="stores/:storeId/settings" element={<PageWrapper><StoreSettingsPage /></PageWrapper>} />
        <Route path="stores/:storeId/storefront" element={<PageWrapper><StorefrontPage /></PageWrapper>} />
        <Route path="stores/:storeId/delivery" element={<PageWrapper><DeliveryZonesPage /></PageWrapper>} />
        
        {/* Marketing Routes */}
        <Route path="marketing" element={<PageWrapper><MarketingPage /></PageWrapper>} />
        <Route path="marketing/subscribers" element={<PageWrapper><SubscribersPage /></PageWrapper>} />
        <Route path="marketing/automations" element={<PageWrapper><AutomationsPage /></PageWrapper>} />
        <Route path="marketing/email" element={<Navigate to="/marketing/email/campaigns" replace />} />
        <Route path="marketing/email/campaigns" element={<PageWrapper><CampaignsListPage /></PageWrapper>} />
        <Route path="marketing/email/new" element={<PageWrapper><NewCampaignPage /></PageWrapper>} />
        <Route path="marketing/email/templates" element={<PageWrapper><MarketingPage /></PageWrapper>} />
        <Route path="marketing/whatsapp" element={<PageWrapper><WhatsAppCampaignsPage /></PageWrapper>} />
        <Route path="marketing/whatsapp/new" element={<PageWrapper><NewWhatsAppCampaignPage /></PageWrapper>} />
        <Route path="marketing/whatsapp/templates" element={<PageWrapper><WhatsAppTemplatesPage /></PageWrapper>} />
        
        {/* Instagram Routes */}
        <Route path="instagram" element={<Navigate to="/instagram/accounts" replace />} />
        <Route path="instagram/accounts" element={<PageWrapper><InstagramAccountsPage /></PageWrapper>} />
        <Route path="instagram/callback" element={<PageWrapper><InstagramCallbackPage /></PageWrapper>} />
        <Route path="instagram/:accountId" element={<PageWrapper><InstagramDashboardPage /></PageWrapper>} />
        <Route path="instagram/inbox" element={<PageWrapper><InstagramInbox /></PageWrapper>} />
        
        {/* Messenger Routes */}
        {/* Messenger/WhatsApp Routes - NOVA PÁGINA UNIFICADA */}
        <Route path="connections" element={<PageWrapper><ConnectionsPage /></PageWrapper>} />
        
        {/* Legacy Routes (mantidas para compatibilidade) */}
        <Route path="messenger" element={<PageWrapper><MessengerInbox /></PageWrapper>} />
        <Route path="messenger/inbox" element={<PageWrapper><MessengerInbox /></PageWrapper>} />
        <Route path="messenger/accounts" element={<PageWrapper><MessengerAccounts /></PageWrapper>} />
        
        {/* WhatsApp Routes */}
        <Route path="whatsapp" element={<PageWrapper><WhatsAppInboxPage /></PageWrapper>} />
        <Route path="whatsapp/inbox" element={<PageWrapper><WhatsAppInboxPage /></PageWrapper>} />
        <Route path="whatsapp/chat" element={<PageWrapper><WhatsAppChatPage /></PageWrapper>} />
        <Route path="whatsapp/handover" element={<PageWrapper><HandoverRequestsPage /></PageWrapper>} />
        <Route path="whatsapp/debug" element={<PageWrapper><DebugDashboardPage /></PageWrapper>} />
        <Route path="whatsapp/diagnostics" element={<PageWrapper><WebhookDiagnosticsPage /></PageWrapper>} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Main App with WebSocket Providers
const App: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  
  const appContent = !isAuthenticated ? <AppContent /> : (
    <WebSocketProvider>
      <WhatsAppWsProvider dashboardMode={true}>
        <AppContent />
      </WhatsAppWsProvider>
    </WebSocketProvider>
  );
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="app">
        {appContent}
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;
