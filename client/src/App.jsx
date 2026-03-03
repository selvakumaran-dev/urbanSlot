import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';

import Navbar from './components/Navbar';
import useAuthStore from './store/authStore';
import Logo from './components/Logo';

// Lazy-loaded pages
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const HostDashboard = lazy(() => import('./pages/HostDashboard'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AddSpotPage = lazy(() => import('./pages/AddSpotPage'));
const SpotDetailsPage = lazy(() => import('./pages/SpotDetailsPage'));
const ManageSpotPage = lazy(() => import('./pages/ManageSpotPage'));

// ── Route guard ──
const ProtectedRoute = ({ children, requireHost = false }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requireHost && !user?.isHost) return <Navigate to="/" replace />;
  return children;
};

// ── Page-level suspense loader ──
const PageLoader = () => (
  <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <Logo size={44} />
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--blue-600)', borderTopColor: 'transparent', animation: 'spin 0.75s linear infinite' }} />
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      {/* ── Professional Toast Notifications ── */}
      <Toaster
        position="top-right"
        gutter={10}
        containerStyle={{ top: 72 }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid rgba(15,23,42,0.08)',
            borderRadius: '12px',
            fontSize: '13.5px',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            padding: '12px 16px',
            boxShadow: '0 4px 24px rgba(15,23,42,0.10), 0 1px 4px rgba(15,23,42,0.06)',
            maxWidth: 360,
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#ffffff' },
            style: { borderLeft: '3px solid #10b981' },
          },
          error: {
            iconTheme: { primary: '#f43f5e', secondary: '#ffffff' },
            style: { borderLeft: '3px solid #f43f5e' },
          },
          loading: {
            iconTheme: { primary: '#2563eb', secondary: '#ffffff' },
            style: { borderLeft: '3px solid #2563eb' },
          },
        }}
      />

      <Navbar />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/spots/:id" element={<SpotDetailsPage />} />

          {/* Protected */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/dashboard"
            element={
              <ProtectedRoute requireHost>
                <HostDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/spots/new"
            element={
              <ProtectedRoute requireHost>
                <AddSpotPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/host/spots/:id"
            element={
              <ProtectedRoute requireHost>
                <ManageSpotPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
