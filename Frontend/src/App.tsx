import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { ProjectDetail } from './pages/ProjectDetail';
import { CreateProject } from './pages/CreateProject';
import { EditProject } from './pages/EditProject';
import { ProjectMembers } from './pages/ProjectMembers';
import { CreateIssue } from './pages/CreateIssue';
import { IssueDetail } from './pages/IssueDetail';
import { EditIssue } from './pages/EditIssue';
import { LabelManagement } from './pages/LabelManagement';
import { AdminUsers } from './pages/AdminUsers';
import { AdminRoute } from './components/AdminRoute';
import { RealtimeSubscriber } from './components/RealtimeSubscriber';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // 401 에러는 재시도하지 않음 (인증 실패)
        if (error?.response?.status === 401) {
          return false;
        }
        // 다른 에러는 1번만 재시도
        return failureCount < 1;
      },
      retryDelay: 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <RealtimeSubscriber />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/new"
              element={
                <ProtectedRoute>
                  <CreateProject />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <ProjectDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id/edit"
              element={
                <ProtectedRoute>
                  <EditProject />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id/members"
              element={
                <ProtectedRoute>
                  <ProjectMembers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id/issues/new"
              element={
                <ProtectedRoute>
                  <CreateIssue />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id/issues/:issueId"
              element={
                <ProtectedRoute>
                  <IssueDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id/issues/:issueId/edit"
              element={
                <ProtectedRoute>
                  <EditIssue />
                </ProtectedRoute>
              }
            />
            <Route
              path="/labels"
              element={
                <ProtectedRoute>
                  <LabelManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminUsers />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

