const API_BASE = '/api';

async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('st_distro_token');

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
        ...options,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (response.status === 401) {
        localStorage.removeItem('st_distro_token');
        localStorage.removeItem('st_distro_user');
        window.location.href = '/login';
        throw new Error('Sesión expirada');
    }

    // Parseo seguro: evita "Unexpected end of JSON input" cuando el backend
    // devuelve body vacío (Render sleeping, errores de proxy, etc.)
    const contentType = response.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
        const text = await response.text();
        if (text.trim().length > 0) {
            data = JSON.parse(text);
        }
    }

    if (!response.ok) {
        throw new Error(data?.error || `Error del servidor (${response.status})`);
    }

    return data;
}

export const api = {
    // Auth
    register: (empresa, nombre, email, password) =>
        apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ empresa, nombre, email, password }),
        }),
    login: (email, password) =>
        apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),
    me: () => apiFetch('/auth/me'),

    // Dashboard
    getDashboard: () => apiFetch('/dashboard'),

    // Productos
    getProductos: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const res = await apiFetch(`/productos${query ? `?${query}` : ''}`);
        return res.data || res;
    },
    getProducto: (id) => apiFetch(`/productos/${id}`),
    createProducto: (data) =>
        apiFetch('/productos', { method: 'POST', body: JSON.stringify(data) }),
    updateProducto: (id, data) =>
        apiFetch(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProducto: (id) =>
        apiFetch(`/productos/${id}`, { method: 'DELETE' }),

    // Clientes
    getClientes: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const res = await apiFetch(`/clientes${query ? `?${query}` : ''}`);
        return res.data || res;
    },
    getCliente: (id) => apiFetch(`/clientes/${id}`),
    createCliente: (data) =>
        apiFetch('/clientes', { method: 'POST', body: JSON.stringify(data) }),
    updateCliente: (id, data) =>
        apiFetch(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    // Ventas
    getVentas: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const res = await apiFetch(`/ventas${query ? `?${query}` : ''}`);
        return res.data || res;
    },
    createVenta: (data) =>
        apiFetch('/ventas', { method: 'POST', body: JSON.stringify(data) }),

    // Cierres
    getCierres: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const res = await apiFetch(`/cierres${query ? `?${query}` : ''}`);
        return res.data || res;
    },
    cerrarCaja: (data) => apiFetch('/cierres/cerrar', { method: 'POST', body: JSON.stringify(data) }),

    // Admin (super-admin plataforma)
    getTenantsAdmin: () => apiFetch('/admin/tenants'),
    approveTenant: (id, data) => apiFetch(`/admin/tenants/${id}/approve`, { method: 'PUT', body: JSON.stringify(data) }),
    blockTenant: (id) => apiFetch(`/admin/tenants/${id}/block`, { method: 'PUT' }),
    deleteTenant: (id) => apiFetch(`/admin/tenants/${id}`, { method: 'DELETE' }),

    // Team Management (admin de empresa)
    getTeamMembers: () => apiFetch('/team/members'),
    inviteVendedor: (data) => apiFetch('/team/invite', { method: 'POST', body: JSON.stringify(data) }),
    removeTeamMember: (id) => apiFetch(`/team/members/${id}`, { method: 'DELETE' }),

    // Reportes (admin only)
    getReporteVentas: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiFetch(`/reportes/ventas${query ? `?${query}` : ''}`);
    },
    getReporteStockCritico: () => apiFetch('/reportes/stock-critico'),
    getReporteCuentasCorrientes: () => apiFetch('/reportes/cuentas-corrientes'),
};
