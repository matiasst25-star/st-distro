import { useState, memo, useCallback } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Users,
    FileClock,
    Sun,
    Moon,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Sparkles,
    ShieldCheck,
    UsersRound,
    FileBarChart2
} from 'lucide-react';

// ─── Prefetch map: route key → React Query prefetch config ───────────────────
function usePrefetch() {
    const queryClient = useQueryClient();

    return useCallback((routeKey) => {
        switch (routeKey) {
            case 'dashboard':
                queryClient.prefetchQuery({ queryKey: ['dashboard'], queryFn: api.getDashboard });
                break;
            case 'productos':
                queryClient.prefetchQuery({
                    queryKey: ['productos', 'activos'],
                    queryFn: () => api.getProductos({ activo: 'true' }),
                });
                break;
            case 'clientes':
                queryClient.prefetchQuery({
                    queryKey: ['clientes', 'activos'],
                    queryFn: () => api.getClientes({ activo: 'true' }),
                });
                break;
            case 'historial':
                queryClient.prefetchQuery({
                    queryKey: ['cierres'],
                    queryFn: () => api.getCierres({}),
                });
                break;
            default:
                break;
        }
    }, [queryClient]);
}

// ─── Memoized Sidebar — no re-renderiza al cambiar de ruta ──────────────────
const Sidebar = memo(function Sidebar({ navItems, user, isAdmin, mobileOpen, onClose, theme, toggleTheme }) {
    const prefetch = usePrefetch();

    const initials = user?.nombre
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    return (
        <aside className={`
            fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col
            bg-sidebar text-sidebar-foreground
            border-r border-white/[0.06]
            transition-transform duration-300 ease-out
            lg:translate-x-0
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
            {/* Logo */}
            <div className="h-20 px-6 flex items-center gap-3 border-b border-white/[0.06]">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-sky-400 shadow-glow text-white flex items-center justify-center font-black text-xs">
                    ST
                </div>
                <div className="flex-1">
                    <h1 className="text-base font-extrabold text-white tracking-tight leading-none">ST / DISTRO</h1>
                    <div className="flex items-center gap-1 mt-0.5">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">ERP Pro</span>
                    </div>
                </div>
                {/* Mobile close */}
                <button
                    className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-sidebar-foreground transition-colors"
                    onClick={onClose}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                <p className="px-4 mb-3 text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-[0.2em]">
                    Navegación
                </p>
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={onClose}
                        onMouseEnter={() => item.prefetchKey && prefetch(item.prefetchKey)}
                        className={({ isActive }) =>
                            `group relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive
                                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                : 'text-sidebar-foreground/70 hover:bg-white/[0.06] hover:text-white'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : ''}`} />
                                <span className="flex-1">{item.label}</span>
                                {isActive && (
                                    <ChevronRight className="w-4 h-4 opacity-60" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}

                {/* Admin Panel Link — only for super-admin */}
                {user?.email === 'matiasst25@gmail.com' && (
                    <>
                        <p className="px-4 mt-6 mb-3 text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-[0.2em]">
                            Administración
                        </p>
                        <NavLink
                            to="/admin/dashboard"
                            onClick={onClose}
                            className={({ isActive }) =>
                                `group relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                                    : 'text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-400 border border-transparent hover:border-amber-500/20'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <ShieldCheck className={`w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : ''}`} />
                                    <span className="flex-1">Panel Admin</span>
                                    {isActive && <ChevronRight className="w-4 h-4 opacity-60" />}
                                </>
                            )}
                        </NavLink>
                    </>
                )}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 space-y-3 border-t border-white/[0.06]">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium
                               text-sidebar-foreground/70 hover:bg-white/[0.06] hover:text-white transition-all group"
                >
                    <div className="p-1.5 rounded-lg bg-white/[0.06] group-hover:bg-primary/20 transition-colors">
                        {theme === 'dark'
                            ? <Sun className="w-4 h-4 text-amber-400 theme-toggle-icon" />
                            : <Moon className="w-4 h-4 text-primary theme-toggle-icon" />
                        }
                    </div>
                    <span className="flex-1 text-left">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
                    <div className={`w-9 h-5 rounded-full relative transition-colors duration-300 ${theme === 'dark' ? 'bg-primary' : 'bg-white/20'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                </button>

                {/* User Card */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-sky-400 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-primary/20">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{user?.nombre}</div>
                        <div className={`text-[10px] font-bold uppercase tracking-[0.15em] truncate ${isAdmin ? 'text-primary' : 'text-amber-400'}`}>
                            {isAdmin ? '⚡ Admin' : '🛒 Vendedor'}
                        </div>
                    </div>
                </div>

                {/* Logout */}
                <LogoutButton />
            </div>
        </aside>
    );
});

// Separado para evitar que logout re-renderice el sidebar completo
const LogoutButton = memo(function LogoutButton() {
    const { logout } = useAuth();
    return (
        <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
                       text-red-400/80 hover:text-red-400 hover:bg-red-500/10
                       transition-all active:scale-[0.97] border border-transparent hover:border-red-500/20"
        >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
        </button>
    );
});

// ─── Main Layout ─────────────────────────────────────────────────────────────
export default function Layout() {
    const { user, isAdmin } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    const baseNavItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true, prefetchKey: 'dashboard' },
        { to: '/venta', icon: ShoppingCart, label: 'Venta al Toque', prefetchKey: 'productos' },
        { to: '/productos', icon: Package, label: 'Productos', prefetchKey: 'productos' },
        { to: '/clientes', icon: Users, label: 'Clientes', prefetchKey: 'clientes' },
    ];

    const adminNavItems = [
        { to: '/historial', icon: FileClock, label: 'Historial', prefetchKey: 'historial' },
        { to: '/equipo', icon: UsersRound, label: 'Mi Equipo' },
        { to: '/reportes', icon: FileBarChart2, label: 'Reportes' },
    ];

    const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;

    return (
        <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar — memoizado, no re-renderiza al cambiar de ruta */}
            <Sidebar
                navItems={navItems}
                user={user}
                isAdmin={isAdmin}
                mobileOpen={mobileOpen}
                onClose={() => setMobileOpen(false)}
                theme={theme}
                toggleTheme={toggleTheme}
            />

            {/* Main Content */}
            <div className="flex-1 lg:ml-72 min-h-screen flex flex-col">
                {/* Mobile Top Bar */}
                <header className="lg:hidden sticky top-0 z-30 h-16 px-4 flex items-center gap-3 bg-background/80 backdrop-blur-xl border-b border-border">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="p-2 rounded-xl hover:bg-muted text-foreground transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-sky-400 text-white flex items-center justify-center font-black text-[9px]">
                            ST
                        </div>
                        <span className="font-bold text-foreground tracking-tight">ST / DISTRO</span>
                    </div>
                </header>

                {/* Page Content — key={pathname} dispara animación al cambiar ruta */}
                <main className="flex-1 bg-background">
                    <div
                        key={location.pathname}
                        className="p-6 sm:p-8 lg:p-10 max-w-[1600px] mx-auto page-transition"
                    >
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
