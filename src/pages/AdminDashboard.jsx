import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import {
    Building2, CheckCircle, XCircle, Clock, ShieldAlert,
    Users, ShoppingBag, Calendar, Zap, Crown, LogOut, RefreshCw, Trash2
} from 'lucide-react';

function formatDate(date) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function EstadoBadge({ estado }) {
    const config = {
        activo: { color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', icon: CheckCircle, label: 'Activo' },
        pendiente: { color: 'bg-amber-500/15 text-amber-500 border-amber-500/30', icon: Clock, label: 'Pendiente' },
        vencido: { color: 'bg-red-500/15 text-red-500 border-red-500/30', icon: XCircle, label: 'Vencido' },
    };
    const { color, icon: Icon, label } = config[estado] || config.pendiente;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${color}`}>
            <Icon className="w-3 h-3" /> {label}
        </span>
    );
}

function ApproveModal({ tenant, onClose, onApprove }) {
    const [planTipo, setPlanTipo] = useState('crecimiento');
    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="card p-6 w-full max-w-sm space-y-5" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground">
                            {tenant.fecha_vencimiento ? 'Renovar suscripción' : 'Aprobar empresa'}
                        </h3>
                        <p className="text-xs text-muted-foreground">{tenant.nombre}</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="form-label">Plan</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['crecimiento', 'corporativo'].map(plan => (
                            <button
                                key={plan}
                                type="button"
                                onClick={() => setPlanTipo(plan)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${planTipo === plan ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/40'}`}
                            >
                                {plan === 'crecimiento' ? <Zap className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
                                <span className="text-xs font-bold capitalize">{plan}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                    {tenant.fecha_vencimiento ? (
                        <>Se añadirán <strong>+30 días</strong> a su fecha de vencimiento actual.</>
                    ) : (
                        <>Se establecerá fecha de vencimiento a <strong>+30 días</strong> desde hoy.</>
                    )}
                </p>
                <div className="flex gap-2">
                    <button onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
                    <button onClick={() => onApprove(tenant.id, planTipo)} className="btn btn-primary flex-1">
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [approving, setApproving] = useState(null); // tenant being approved
    const [filter, setFilter] = useState('all');

    const { data: tenants = [], isLoading, refetch } = useQuery({
        queryKey: ['admin-tenants'],
        queryFn: api.getTenantsAdmin,
        refetchInterval: 60000, // re-check every minute
    });

    const approveMutation = useMutation({
        mutationFn: ({ id, plan_tipo }) => api.approveTenant(id, { plan_tipo }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
            setApproving(null);
        },
    });

    const blockMutation = useMutation({
        mutationFn: (id) => api.blockTenant(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tenants'] }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.deleteTenant(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tenants'] }),
    });

    const filtered = useMemo(() => {
        if (filter === 'all') return tenants;
        return tenants.filter(t => t.estado === filter);
    }, [tenants, filter]);

    const stats = useMemo(() => ({
        total: tenants.length,
        activos: tenants.filter(t => t.estado === 'activo').length,
        pendientes: tenants.filter(t => t.estado === 'pendiente').length,
        vencidos: tenants.filter(t => t.estado === 'vencido').length,
    }), [tenants]);

    const handleBlock = (id, nombre) => {
        if (window.confirm(`¿Seguro que querés suspender el acceso a "${nombre}"?`)) {
            blockMutation.mutate(id);
        }
    };

    const handleDelete = (id, nombre) => {
        if (window.confirm(`⚠️ ADVERTENCIA: ¿Estás seguro de ELIMINAR COMPLETAMENTE a la empresa "${nombre}"?\n\nEsta acción es IRREVERSIBLE y borrará de inmediato TODOS sus productos, clientes, usuarios y el historial de ventas completo.`)) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Top Bar */}
            <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-sky-400 flex items-center justify-center text-white font-black text-[9px] shadow-glow">
                            ST
                        </div>
                        <div>
                            <span className="font-bold text-foreground text-sm">ST / DISTRO</span>
                            <span className="ml-2 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Admin</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => refetch()} className="btn btn-secondary text-xs gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
                        </button>
                        <button onClick={() => { logout(); navigate('/login'); }} className="btn btn-secondary text-xs gap-1.5">
                            <LogOut className="w-3.5 h-3.5" /> Salir
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Title */}
                <div>
                    <h1 className="text-2xl font-extrabold text-foreground">Panel de Administración</h1>
                    <p className="text-muted-foreground text-sm mt-1">Gestioná todos los tenants de ST / DISTRO</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total empresas', value: stats.total, icon: Building2, color: 'text-primary bg-primary/10' },
                        { label: 'Activas', value: stats.activos, icon: CheckCircle, color: 'text-emerald-500 bg-emerald-500/10' },
                        { label: 'Pendientes', value: stats.pendientes, icon: Clock, color: 'text-amber-500 bg-amber-500/10' },
                        { label: 'Vencidas', value: stats.vencidos, icon: XCircle, color: 'text-red-500 bg-red-500/10' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="card p-5 flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                                <p className="text-2xl font-extrabold text-foreground tabular-nums">{value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filter & Table */}
                <div className="card overflow-hidden">
                    <div className="flex items-center gap-2 p-4 border-b border-border flex-wrap">
                        {['all', 'pendiente', 'activo', 'vencido'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
                            >
                                {f === 'all' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead>
                                <tr>
                                    <th className="pl-6 py-4">Empresa</th>
                                    <th className="py-4">Estado</th>
                                    <th className="py-4">Plan</th>
                                    <th className="py-4">Vencimiento</th>
                                    <th className="py-4 text-center">Usuarios / Ventas</th>
                                    <th className="py-4 pr-6 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan="6" className="text-center py-20 text-muted-foreground">Cargando...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-20 text-muted-foreground">No hay empresas en esta categoría</td></tr>
                                ) : filtered.map(t => (
                                    <tr key={t.id} className="group hover:bg-primary/[0.02]">
                                        <td className="py-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-sky-500/20 flex items-center justify-center font-bold text-primary text-sm">
                                                    {t.nombre.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-foreground text-sm">{t.nombre}</p>
                                                    <p className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4"><EstadoBadge estado={t.estado} /></td>
                                        <td className="py-4">
                                            {t.plan_tipo ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold">
                                                    {t.plan_tipo === 'corporativo' ? <Crown className="w-3 h-3 text-amber-500" /> : <Zap className="w-3 h-3 text-primary" />}
                                                    <span className="capitalize">{t.plan_tipo}</span>
                                                </span>
                                            ) : <span className="text-xs text-muted-foreground">—</span>}
                                        </td>
                                        <td className="py-4">
                                            <span className={`text-xs font-medium ${t.fecha_vencimiento && new Date(t.fecha_vencimiento) < new Date() ? 'text-red-500' : 'text-foreground'}`}>
                                                {formatDate(t.fecha_vencimiento)}
                                            </span>
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className="inline-flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{t._count.usuarios}</span>
                                                <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" />{t._count.ventas}</span>
                                            </span>
                                        </td>
                                        <td className="py-4 pr-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setApproving(t)}
                                                    disabled={approveMutation.isPending}
                                                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5" /> {t.fecha_vencimiento ? 'Renovar' : 'Aprobar'}
                                                </button>
                                                {t.estado === 'activo' && (
                                                    <button
                                                        onClick={() => handleBlock(t.id, t.nombre)}
                                                        disabled={blockMutation.isPending}
                                                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                                                    >
                                                        <Clock className="w-3.5 h-3.5" /> Suspender
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(t.id, t.nombre)}
                                                    disabled={deleteMutation.isPending}
                                                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center gap-1"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Borrar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {approving && (
                <ApproveModal
                    tenant={approving}
                    onClose={() => setApproving(null)}
                    onApprove={(id, plan_tipo) => approveMutation.mutate({ id, plan_tipo })}
                />
            )}
        </div>
    );
}
