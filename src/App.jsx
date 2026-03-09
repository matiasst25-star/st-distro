import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages for Code Splitting
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const VentaAlToque = React.lazy(() => import('./pages/VentaAlToque'));
const Productos = React.lazy(() => import('./pages/Productos'));
const Clientes = React.lazy(() => import('./pages/Clientes'));
const ClienteDetalle = React.lazy(() => import('./pages/ClienteDetalle'));
const HistorialVentas = React.lazy(() => import('./pages/HistorialVentas'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const PaginaEspera = React.lazy(() => import('./pages/PaginaEspera'));
const MiEquipo = React.lazy(() => import('./pages/MiEquipo'));
const Reportes = React.lazy(() => import('./pages/Reportes'));

// Super-admin email (plataforma SaaS level)
const SUPER_ADMIN_EMAIL = 'matiasst25@gmail.com';

// React Query config — aggressive caching for SPA feel
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 10,  // 10 min — no re-fetch innecesario
            gcTime: 1000 * 60 * 60,     // 1 hora en memoria tras desmontar
            refetchOnWindowFocus: false, // evita spam al hacer alt+tab
            retry: 1,
        },
    },
});

const LoadingScreen = () => (
    <div className="flex items-center justify-center h-screen bg-background w-full">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-sky-400 flex items-center justify-center text-white font-black text-sm shadow-glow animate-float">
                ST
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Cargando ST / DISTRO...</span>
            </div>
        </div>
    </div>
);

// Guard: requires login + active tenant
function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <LoadingScreen />;
    if (!user) return <Navigate to="/login" replace />;

    const estado = user.tenantEstado || 'activo';
    const blocked = estado === 'pendiente' || estado === 'vencido';
    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
    if (blocked && !isSuperAdmin) return <Navigate to="/espera" replace />;

    return children;
}

// Guard: only the super-admin email (platform-level admin)
function SuperAdminRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <LoadingScreen />;
    if (!user) return <Navigate to="/login" replace />;
    if (user.email !== SUPER_ADMIN_EMAIL) return <Navigate to="/" replace />;

    return children;
}

// Guard: only company-level admins (rol === 'admin') can access
function AdminOnlyRoute({ children }) {
    const { user, loading, isAdmin } = useAuth();

    if (loading) return <LoadingScreen />;
    if (!user) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/venta" replace />;

    return children;
}

// Guard: prevents active users from seeing the wait page
function EsperaRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <LoadingScreen />;
    if (!user) return <Navigate to="/login" replace />;

    const estado = user.tenantEstado || 'activo';
    if (estado !== 'pendiente' && estado !== 'vencido') {
        return <Navigate to="/" replace />;
    }

    return children;
}

function AppRoutes() {
    const { user, loading } = useAuth();

    if (loading) return null;

    return (
        <Routes>
            <Route
                path="/login"
                element={user ? <Navigate to="/" replace /> : <Suspense fallback={<LoadingScreen />}><Login /></Suspense>}
            />
            {/* Waiting room for pending/vencido tenants */}
            <Route
                path="/espera"
                element={
                    <EsperaRoute>
                        <Suspense fallback={<LoadingScreen />}><PaginaEspera /></Suspense>
                    </EsperaRoute>
                }
            />
            {/* Super-admin panel (plataforma) */}
            <Route
                path="/admin/dashboard"
                element={
                    <SuperAdminRoute>
                        <Suspense fallback={<LoadingScreen />}><AdminDashboard /></Suspense>
                    </SuperAdminRoute>
                }
            />
            {/* Main app (tenant gated) */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<ErrorBoundary><Suspense fallback={<LoadingScreen />}><Dashboard /></Suspense></ErrorBoundary>} />
                <Route path="venta" element={<ErrorBoundary><Suspense fallback={<LoadingScreen />}><VentaAlToque /></Suspense></ErrorBoundary>} />
                <Route path="productos" element={<ErrorBoundary><Suspense fallback={<LoadingScreen />}><Productos /></Suspense></ErrorBoundary>} />
                <Route path="clientes" element={<ErrorBoundary><Suspense fallback={<LoadingScreen />}><Clientes /></Suspense></ErrorBoundary>} />
                <Route path="clientes/:id" element={<ErrorBoundary><Suspense fallback={<LoadingScreen />}><ClienteDetalle /></Suspense></ErrorBoundary>} />
                {/* Historial only for admins */}
                <Route
                    path="historial"
                    element={
                        <AdminOnlyRoute>
                            <ErrorBoundary><Suspense fallback={<LoadingScreen />}><HistorialVentas /></Suspense></ErrorBoundary>
                        </AdminOnlyRoute>
                    }
                />
                {/* Mi Equipo only for company admins */}
                <Route
                    path="equipo"
                    element={
                        <AdminOnlyRoute>
                            <ErrorBoundary><Suspense fallback={<LoadingScreen />}><MiEquipo /></Suspense></ErrorBoundary>
                        </AdminOnlyRoute>
                    }
                />
                <Route
                    path="reportes"
                    element={
                        <AdminOnlyRoute>
                            <ErrorBoundary><Suspense fallback={<LoadingScreen />}><Reportes /></Suspense></ErrorBoundary>
                        </AdminOnlyRoute>
                    }
                />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <BrowserRouter>
                    <Suspense fallback={<LoadingScreen />}>
                        <AuthProvider>
                            <AppRoutes />
                        </AuthProvider>
                    </Suspense>
                </BrowserRouter>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
