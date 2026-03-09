import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

// Helper: read user from localStorage synchronously (prevents role flash on reload)
function getStoredUser() {
    try {
        const stored = localStorage.getItem('st_distro_user');
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    // Initialize synchronously from localStorage — no flash
    const [user, setUser] = useState(getStoredUser);
    const [loading, setLoading] = useState(true);

    const applyTenantTheme = (config) => {
        if (!config) return;
        if (config.primary_color) {
            document.documentElement.style.setProperty('--primary-color', config.primary_color);
            document.documentElement.style.setProperty('--primary-hover', config.primary_color + 'E6');
        }
        if (config.secondary_color) {
            document.documentElement.style.setProperty('--sidebar-bg', config.secondary_color);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('st_distro_token');

        if (token) {
            // Validate token with server, refresh user data
            api.me().then(res => {
                setUser(res);
                localStorage.setItem('st_distro_user', JSON.stringify(res));
                applyTenantTheme(res.tenantConfig);
            }).catch(() => {
                logout();
            }).finally(() => {
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, []);

    const register = async (empresa, nombre, email, password) => {
        const result = await api.register(empresa, nombre, email, password);
        return result;
    };

    const login = async (email, password) => {
        const result = await api.login(email, password);
        localStorage.setItem('st_distro_token', result.token);
        const userWithEstado = { ...result.usuario, tenantEstado: result.usuario.tenantEstado || 'activo' };
        localStorage.setItem('st_distro_user', JSON.stringify(userWithEstado));
        setUser(userWithEstado);
        applyTenantTheme(result.tenantConfig);
        return result;
    };

    const logout = () => {
        localStorage.removeItem('st_distro_token');
        localStorage.removeItem('st_distro_user');
        setUser(null);
        document.documentElement.style.removeProperty('--primary-color');
        document.documentElement.style.removeProperty('--primary-hover');
        document.documentElement.style.removeProperty('--sidebar-bg');
    };

    // Derived role helpers — available everywhere in the app
    const rol = user?.rol || null;
    const isAdmin = rol === 'admin';
    const isVendedor = rol === 'vendedor';

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, rol, isAdmin, isVendedor }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return context;
}
