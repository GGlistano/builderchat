import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';
import FunnelList from './pages/admin/FunnelList';
import FunnelEditor from './pages/admin/FunnelEditor';
import FunnelSettings from './pages/admin/FunnelSettings';
import ConversationsInbox from './pages/admin/ConversationsInbox';
import ConversationDetail from './pages/admin/ConversationDetail';
import FunnelAnalytics from './pages/admin/FunnelAnalytics';
import ChatInterface from './pages/chat/ChatInterface';
import Login from './pages/auth/Login';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<FunnelList />} />
            <Route path="funnel/:funnelId" element={<FunnelEditor />} />
            <Route path="funnel/:id/settings" element={<FunnelSettings />} />
            <Route path="funnel/:funnelId/conversations" element={<ConversationsInbox />} />
            <Route path="funnel/:funnelId/conversation/:conversationId" element={<ConversationDetail />} />
            <Route path="funnel/:funnelId/analytics" element={<FunnelAnalytics />} />
          </Route>

          <Route path="/chat/:slug" element={<ChatInterface />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
