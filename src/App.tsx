import React, { useEffect, useState, Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import logger from './services/logger';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout';
import { FullPageLoading } from './components/common';
import { PageBoundary } from './components/ErrorBoundary';
import { useAuthStore } from './stores/authStore';
import { useAccountStore } from './stores/accountStore';
import { setAuthToken } from './services';
import api from './services/api';
import { WebSocketProvider } from './context/WebSocketContext';
import { WhatsAppWsProvider } from './context/WhatsAppWsContext';
import { useBootstrapStores } from './mobile/useBootstrapStores';
import './App.css';

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupWizard = lazy(() => import('./pages/signup/SignupWizard').then(m => ({ default: m.SignupWizard })));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AccountsPage = lazy(() => import('./pages/accounts/AccountsPage').then(m => ({ default: m.AccountsPage })));
const AccountFormPage = lazy(() => import('./pages/accounts/AccountFormPage').then(m => ({ default: m.AccountFormPage })));
const AccountDetailPage = lazy(() => import('./pages/accounts/AccountDetailPage').then(m => ({ default: m.AccountDetailPage })));
const InboxPage = lazy(() => import('./pages/inbox/InboxPage'));
const OrdersPage = lazy(() => import('./pages/orders/OrdersPage').then(m => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import('./pages/orders/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })));
const OrderNewPage = lazy(() => import('./pages/orders/OrderNewPage').then(m => ({ default: m.OrderNewPage })));
const PaymentsPage = lazy(() => import('./pages/payments/PaymentsPage').then(m => ({ default: m.PaymentsPage })));
const PaymentLinkPage = lazy(() => import('./pages/payments/PaymentLinkPage').then(m => ({ default: m.PaymentLinkPage })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const PlanoPage = lazy(() => import('./pages/plano/PlanoPage').then(m => ({ default: m.PlanoPage })));
const SubscriptionManagementPage = lazy(() => import('./pages/plano/SubscriptionManagementPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Agents Pages (Langchain AI)
const AgentsPage = lazy(() => import('./pages/agents').then(m => ({ default: m.AgentsPage })));
const AgentDetailPage = lazy(() => import('./pages/agents').then(m => ({ default: m.AgentDetailPage })));
const AgentCreatePage = lazy(() => import('./pages/agents').then(m => ({ default: m.AgentCreatePage })));
const AgentTestPage = lazy(() => import('./pages/agents').then(m => ({ default: m.AgentTestPage })));

// E-commerce Pages
const CouponsPage = lazy(() => import('./pages/coupons').then(m => ({ default: m.CouponsPage })));
const ProductsPage = lazy(() => import('./pages/products').then(m => ({ default: m.ProductsPage })));
const ComboListPage = lazy(() => import('./pages/stores/combos').then(m => ({ default: m.ComboListPage })));
const ComboFormPage = lazy(() => import('./pages/stores/combos').then(m => ({ default: m.ComboFormPage })));
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage').then(m => ({ default: m.CustomersPage })));

// Automation Pages
const CompanyProfilesPage = lazy(() => import('./pages/automation').then(m => ({ default: m.CompanyProfilesPage })));
const CompanyProfileDetailPage = lazy(() => import('./pages/automation').then(m => ({ default: m.CompanyProfileDetailPage })));
const AutoMessagesPage = lazy(() => import('./pages/automation').then(m => ({ default: m.AutoMessagesPage })));
const CustomerSessionsPage = lazy(() => import('./pages/automation').then(m => ({ default: m.CustomerSessionsPage })));
const AutomationLogsPage = lazy(() => import('./pages/automation').then(m => ({ default: m.AutomationLogsPage })));
const ScheduledMessagesPage = lazy(() => import('./pages/automation').then(m => ({ default: m.ScheduledMessagesPage })));
const ConversationInsightsPage = lazy(() => import('./pages/automation').then(m => ({ default: m.ConversationInsightsPage })));

// Intent Detection Pages (Novo Sistema)
const IntentStatsPage = lazy(() => import('./pages/automation').then(m => ({ default: m.IntentStatsPage })));

// Analytics/Reports Pages
const AnalyticsPage = lazy(() => import('./pages/reports').then(m => ({ default: m.AnalyticsPage })));

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

// Delivery Pages
const DeliveryZonesPage = lazy(() => import('./pages/delivery/DeliveryZonesPage').then(m => ({ default: m.default || m.DeliveryZonesPage })));
const PrintSettingsPage = lazy(() => import('./pages/printing/PrintSettingsPage'));
const CashPage = lazy(() => import('./pages/cash/CashPage'));
const KdsPage = lazy(() => import('./pages/kds/KdsPage'));



// Unified Messaging Connections Page
const ConnectionsPage = lazy(() => import('./pages/messaging/ConnectionsPage').then(m => ({ default: m.default })));

// WhatsApp Pages
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
  useBootstrapStores();

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
          <Suspense fallback={<FullPageLoading />}>
            <LoginPage />
          </Suspense>
        )
      } />
      {/* Onboarding self-service. /cadastro é o que a landing (cardapidex.com.br) linka; /signup é alias. */}
      <Route path="/cadastro" element={
        <Suspense fallback={<FullPageLoading />}>
          <SignupWizard />
        </Suspense>
      } />
      <Route path="/signup" element={<Navigate to="/cadastro" replace />} />

      {/* KDS fullscreen — sem sidebar, para a tela da cozinha */}
      <Route path="/stores/:storeId/kds" element={
        <ProtectedRoute>
          <PageBoundary><KdsPage /></PageBoundary>
        </ProtectedRoute>
      } />

      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<PageBoundary><DashboardPage /></PageBoundary>} />
        <Route path="accounts" element={<PageBoundary><AccountsPage /></PageBoundary>} />
        <Route path="accounts/new" element={<PageBoundary><AccountFormPage /></PageBoundary>} />
        <Route path="accounts/:id" element={<PageBoundary><AccountDetailPage /></PageBoundary>} />
        <Route path="accounts/:id/edit" element={<PageBoundary><AccountFormPage /></PageBoundary>} />
        {/* Inbox unificado — rotas antigas redirecionam para a aba correspondente */}
        <Route path="inbox" element={<PageBoundary><InboxPage /></PageBoundary>} />
        <Route path="inbox/:tab" element={<PageBoundary><InboxPage /></PageBoundary>} />
        <Route path="messages" element={<Navigate to="/inbox/conversas" replace />} />
        <Route path="conversations" element={<Navigate to="/inbox/conversas" replace />} />
        
        {/* AI Agents Routes (Langchain) */}
        <Route path="agents" element={<PageBoundary><AgentsPage /></PageBoundary>} />
        <Route path="agents/new" element={<PageBoundary><AgentCreatePage /></PageBoundary>} />
        <Route path="agents/:id" element={<PageBoundary><AgentDetailPage /></PageBoundary>} />
        <Route path="agents/:id/test" element={<PageBoundary><AgentTestPage /></PageBoundary>} />
        <Route path="agents/:id/conversations" element={<PageBoundary><AgentDetailPage /></PageBoundary>} />
        
        {/* Settings */}
        <Route path="settings" element={<PageBoundary><SettingsPage /></PageBoundary>} />

        {/* Planos / assinatura */}
        <Route path="plano" element={<PageBoundary><PlanoPage /></PageBoundary>} />
        <Route path="assinatura" element={<PageBoundary><SubscriptionManagementPage /></PageBoundary>} />

        {/* Link de pagamento avulso (Fase 3) */}
        <Route path="payments/link" element={<PageBoundary><PaymentLinkPage /></PageBoundary>} />
        
        {/* Automation Routes */}
        <Route path="automation/companies" element={<PageBoundary><CompanyProfilesPage /></PageBoundary>} />
        <Route path="automation/companies/new" element={<PageBoundary><CompanyProfileDetailPage /></PageBoundary>} />
        <Route path="automation/companies/:id" element={<PageBoundary><CompanyProfileDetailPage /></PageBoundary>} />
        <Route path="automation/messages" element={<PageBoundary><AutoMessagesPage /></PageBoundary>} />
        <Route path="automation/companies/:companyId/messages" element={<PageBoundary><AutoMessagesPage /></PageBoundary>} />
        <Route path="automation/sessions" element={<PageBoundary><CustomerSessionsPage /></PageBoundary>} />
        <Route path="automation/logs" element={<PageBoundary><AutomationLogsPage /></PageBoundary>} />
        <Route path="automation/scheduled" element={<PageBoundary><ScheduledMessagesPage /></PageBoundary>} />
        <Route path="automation/conversation-insights" element={<PageBoundary><ConversationInsightsPage /></PageBoundary>} />

        {/* Intent Detection Routes */}
        <Route path="automation/intents" element={<Navigate to="/automation/intents/stats" replace />} />
        <Route path="automation/intents/stats" element={<PageBoundary><IntentStatsPage /></PageBoundary>} />
        
        {/* Analytics/Reports Routes */}
        <Route path="analytics" element={<PageBoundary><AnalyticsPage /></PageBoundary>} />
        <Route path="reports" element={<Navigate to="/analytics" replace />} />
        
        {/* Stores Routes */}
        <Route path="stores" element={<PageBoundary><StoresPage /></PageBoundary>} />
        <Route path="stores/:storeId" element={<PageBoundary><StoreDetailPage /></PageBoundary>} />
        <Route path="stores/:storeId/products" element={<PageBoundary><ProductsPage /></PageBoundary>} />
        <Route path="stores/:storeId/combos" element={<PageBoundary><ComboListPage /></PageBoundary>} />
        <Route path="stores/:storeId/combos/new" element={<PageBoundary><ComboFormPage /></PageBoundary>} />
        <Route path="stores/:storeId/combos/:comboId/edit" element={<PageBoundary><ComboFormPage /></PageBoundary>} />
        <Route path="stores/:storeId/orders" element={<PageBoundary><OrdersPage /></PageBoundary>} />
        <Route path="stores/:storeId/customers" element={<PageBoundary><CustomersPage /></PageBoundary>} />
        <Route path="stores/:storeId/orders/new" element={<PageBoundary><OrderNewPage /></PageBoundary>} />
        <Route path="stores/:storeId/orders/:id" element={<PageBoundary><OrderDetailPage /></PageBoundary>} />
        <Route path="stores/:storeId/coupons" element={<PageBoundary><CouponsPage /></PageBoundary>} />
        <Route path="stores/:storeId/payments" element={<PageBoundary><PaymentsPage /></PageBoundary>} />
        <Route path="stores/:storeId/settings" element={<PageBoundary><StoreSettingsPage /></PageBoundary>} />
        <Route path="stores/:storeId/storefront" element={<PageBoundary><StorefrontPage /></PageBoundary>} />
        <Route path="stores/:storeId/delivery" element={<PageBoundary><DeliveryZonesPage /></PageBoundary>} />
        <Route path="stores/:storeId/printing" element={<PageBoundary><PrintSettingsPage /></PageBoundary>} />
        <Route path="stores/:storeId/cash" element={<PageBoundary><CashPage /></PageBoundary>} />
        
        {/* Marketing Routes */}
        <Route path="marketing" element={<PageBoundary><MarketingPage /></PageBoundary>} />
        <Route path="marketing/subscribers" element={<PageBoundary><SubscribersPage /></PageBoundary>} />
        <Route path="marketing/email" element={<Navigate to="/marketing/email/campaigns" replace />} />
        <Route path="marketing/email/campaigns" element={<PageBoundary><CampaignsListPage /></PageBoundary>} />
        <Route path="marketing/email/new" element={<PageBoundary><NewCampaignPage /></PageBoundary>} />
        <Route path="marketing/whatsapp" element={<PageBoundary><WhatsAppCampaignsPage /></PageBoundary>} />
        <Route path="marketing/whatsapp/new" element={<PageBoundary><NewWhatsAppCampaignPage /></PageBoundary>} />
        <Route path="marketing/whatsapp/templates" element={<PageBoundary><WhatsAppTemplatesPage /></PageBoundary>} />
        
        
        {/* WhatsApp Routes */}
        <Route path="connections" element={<PageBoundary><ConnectionsPage /></PageBoundary>} />
        
        {/* Legacy Routes (mantidas para compatibilidade) */}
        
        {/* WhatsApp Routes */}
        <Route path="whatsapp" element={<Navigate to="/inbox/whatsapp" replace />} />
        <Route path="whatsapp/inbox" element={<Navigate to="/inbox/whatsapp" replace />} />
        <Route path="whatsapp/chat" element={<Navigate to="/inbox/whatsapp" replace />} />
        <Route path="whatsapp/handover" element={<PageBoundary><HandoverRequestsPage /></PageBoundary>} />
      </Route>

      {/* Catch all — 404 real (não redireciona mais silenciosamente para "/") */}
      <Route path="*" element={
        <Suspense fallback={<FullPageLoading />}>
          <NotFoundPage />
        </Suspense>
      } />
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
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};

export default App;
