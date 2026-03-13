import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign,
    ShoppingBag,
    AlertTriangle,
    CreditCard,
    TrendingUp,
    Clock,
    CheckCircle2,
    Activity,
    Plus,
    Banknote,
    Smartphone,
    ArrowDownRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function formatCurrency(value) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function SkeletonCard() {
    return (
        <div className="card p-6 space-y-3">
            <div className="flex justify-between items-center">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-10 w-10 rounded-xl" />
            </div>
            <div className="skeleton h-8 w-32" />
        </div>
    );
}

function SkeletonTable({ rows = 4 }) {
    return (
        <div className="space-y-3 p-6">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                    <div className="skeleton h-4 flex-1" />
                    <div className="skeleton h-4 w-20" />
                </div>
            ))}
        </div>
    );
}

export default function Dashboard() {
    const { isAdmin, user } = useAuth();
    const navigate = useNavigate();

    const { data, isLoading: loading } = useQuery({
        queryKey: ['dashboard'],
        queryFn: api.getDashboard,
    });

    if (loading) {
        return (
            <div className="page-container space-y-8">
                <header className="page-header">
                    <div>
                        <div className="skeleton h-8 w-48 mb-2" />
                        <div className="skeleton h-4 w-64" />
                    </div>
                </header>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="card lg:col-span-2"><SkeletonTable rows={3} /></div>
                    <div className="card lg:col-span-3"><SkeletonTable rows={4} /></div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col h-64 items-center justify-center text-center">
                <div className="p-4 rounded-2xl bg-destructive/10 mb-4">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Error de conexión</h3>
                <p className="text-muted-foreground text-sm mb-4">No pudimos cargar los datos. Revisa tu conexión.</p>
                <button onClick={() => window.location.reload()} className="btn btn-primary">
                    Reintentar
                </button>
            </div>
        );
    }

    // Metrics visible to all
    const baseMetrics = [
        {
            label: 'Pedidos del día',
            value: data.cantidadPedidosDia,
            icon: ShoppingBag,
            color: 'text-sky-600 dark:text-sky-400',
            bg: 'bg-sky-500/10',
            accent: 'border-sky-500/20',
        },
        {
            label: 'Alertas de Stock',
            value: data.productosStockBajo.length,
            icon: AlertTriangle,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-500/10',
            accent: 'border-amber-500/20',
        },
    ];

    const adminMetrics = [
        ...baseMetrics,
        {
            label: 'Gastos Registrados',
            value: formatCurrency(data.gastosHoy),
            icon: ArrowDownRight,
            color: 'text-red-500 dark:text-red-400',
            bg: 'bg-red-500/10',
            accent: 'border-red-500/30',
        },
        {
            label: 'Deuda Pendiente',
            value: formatCurrency(data.saldoPendienteTotal),
            icon: CreditCard,
            color: 'text-orange-500 dark:text-orange-400',
            bg: 'bg-orange-500/10',
            accent: 'border-orange-500/20',
        },
    ];

    const metrics = isAdmin ? adminMetrics : baseMetrics;

    return (
        <div className="page-container space-y-8">
            {/* Header */}
            <header className="page-header">
                <div>
                    <h1>Panel de Control</h1>
                    <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {!isAdmin && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Hola, {user?.nombre?.split(' ')[0]} 👋
                        </div>
                    )}
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                                    bg-primary/10 text-primary border border-primary/20">
                        <div className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                        </div>
                        En tiempo real
                    </div>
                    <button
                        onClick={() => navigate('/venta')}
                        className="touch-target btn bg-blue-400 hover:bg-blue-500 text-slate-900 border-none shadow-md shadow-blue-400/20 px-5 gap-2 font-bold"
                    >
                        <Plus className="w-5 h-5" />
                        Nueva Venta
                    </button>
                </div>
            </header>

                    {/* ═══ Financial Overview (Admin Only) ═══ */}
            {isAdmin && (
                <div className="card-glass border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
                    <div className="p-4 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
                        <div>
                            <p className="text-sm font-bold text-primary mb-1 uppercase tracking-wider">Ingresos del Día</p>
                            <h2 className="text-3xl md:text-5xl font-black text-foreground tracking-tighter">
                                {formatCurrency(data.ventaTotalDia)}
                            </h2>
                        </div>
                        {/* En mobile: columna. En desktop: fila */}
                        <div className="flex flex-col sm:flex-row gap-3 md:gap-8 bg-background/50 backdrop-blur-md p-4 rounded-2xl border border-border/50 w-full md:w-auto">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                                    <Banknote className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Efectivo Físico</p>
                                    <p className="text-xl font-bold text-foreground">{formatCurrency(data.ingresosEfectivo)}</p>
                                </div>
                            </div>
                            <div className="hidden sm:block w-px bg-border" />
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                                    <Smartphone className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Transferencias / Apps</p>
                                    <p className="text-xl font-bold text-foreground">{formatCurrency(data.ingresosTransferencia)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Metric Cards ═══ */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-5 stagger-children`}>
                {metrics.map((metric, i) => (
                    <div
                        key={i}
                        className={`metric-card border-l-4 ${metric.accent}`}
                    >
                        <div className="relative flex items-start justify-between mb-3">
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{metric.label}</p>
                                <h3 className="text-2xl font-extrabold text-foreground tracking-tight">{metric.value}</h3>
                            </div>
                            <div className={`p-2.5 rounded-xl ${metric.bg} ${metric.color}`}>
                                <metric.icon className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ═══ Weekly Trend Chart & Activity ═══ */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Trend Chart */}
                {isAdmin && (
                    <div className="card xl:col-span-2 overflow-hidden flex flex-col">
                        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                            <h3 className="font-bold text-foreground flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg bg-primary/10">
                                    <TrendingUp className="w-4 h-4 text-primary" />
                                </div>
                                Rendimiento Semanal
                            </h3>
                        </div>
                        <div className="flex-1 p-6 h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.rendimientoSemanal} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        tickFormatter={(val) => new Intl.NumberFormat('es-AR', {
                                            style: 'currency',
                                            currency: 'ARS',
                                            notation: 'compact',
                                            maximumFractionDigits: 1
                                        }).format(val)}
                                        width={80}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                        itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                                        formatter={(value) => [formatCurrency(value), 'Ingresos']}
                                        labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#60a5fa"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorTotal)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Stock Alerts (Now 1/3 width to fit next to chart) */}
                <div className={`card ${isAdmin ? 'xl:col-span-1' : 'xl:col-span-1'} overflow-hidden flex flex-col`}>
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                        <h3 className="font-bold text-foreground flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-amber-500/10">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                            </div>
                            Alertas Críticas
                        </h3>
                        {data.productosStockBajo.length > 0 && (
                            <span className="badge badge-warning">{data.productosStockBajo.length}</span>
                        )}
                    </div>
                    <div className="flex-1 min-h-0">
                        {data.productosStockBajo.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                <div className="p-3 rounded-2xl bg-emerald-500/10 mb-3">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                                <p className="font-medium text-muted-foreground">Inventario en niveles óptimos</p>
                            </div>
                        ) : (
                            <div className="table-responsive max-h-[400px]">
                                <table className="table">
                                    <thead className="sticky top-0 bg-card z-10">
                                        <tr>
                                            <th>Producto</th>
                                            <th className="text-right">Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.productosStockBajo.map((p) => (
                                            <tr key={p.id}>
                                                <td className="font-semibold text-foreground">{p.nombre}</td>
                                                <td className="text-right">
                                                    <span className="font-bold text-destructive">{p.stock_actual}</span>
                                                    <span className="text-muted-foreground text-xs ml-1">/ {p.stock_minimo}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Actividad Reciente */}
            <div className="card overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold text-foreground flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <Activity className="w-4 h-4 text-primary" />
                        </div>
                        Actividad Reciente
                    </h3>
                </div>
                <div className="flex-1 min-h-0">
                    {data.ultimasVentas.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <div className="p-3 rounded-2xl bg-muted mb-3">
                                <Clock className="w-8 h-8 text-muted-foreground/40" />
                            </div>
                            <p className="font-medium text-muted-foreground">Sin movimientos hoy aún</p>
                        </div>
                    ) : (
                        <>
                            {/* ─── MOBILE: Sale Cards (ocultas en md+) ──────────────────── */}
                            <div className="md:hidden space-y-3 p-4">
                                {data.ultimasVentas.map((v) => (
                                    <div key={v.id} className="sale-card">
                                        {/* Fila superior: monto + badge estado */}
                                        <div className="sale-card-row">
                                            <span className="sale-card-amount">
                                                {formatCurrency(parseFloat(v.total))}
                                            </span>
                                            <span className={`badge ${v.estado === 'pagado' ? 'badge-success' : 'badge-warning'}`}>
                                                {v.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                                            </span>
                                        </div>
                                        {/* Cliente en medio */}
                                        <span className="sale-card-client">
                                            {v.cliente?.nombre || 'Consumidor Final'}
                                        </span>
                                        {/* Meta: número de venta + vendedor */}
                                        <span className="sale-card-meta">
                                            #{v.id} &bull; {v.usuario?.nombre}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* ─── DESKTOP: Tabla original (oculta en mobile) ────────────── */}
                            <div className="hidden md:block table-responsive max-h-[400px]">
                                <table className="table">
                                    <thead className="sticky top-0 bg-card z-10">
                                        <tr>
                                            <th>Cliente</th>
                                            <th>Estado</th>
                                            <th className="text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.ultimasVentas.map((v) => (
                                            <tr key={v.id} className="group">
                                                <td className="py-3.5">
                                                    <div className="font-semibold text-foreground">{v.cliente?.nombre || 'Consumidor Final'}</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        #{v.id} &bull; {v.usuario?.nombre}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${v.estado === 'pagado' ? 'badge-success' : 'badge-warning'}`}>
                                                        {v.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                                                    </span>
                                                </td>
                                                <td className="text-right">
                                                    <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                                                        {formatCurrency(parseFloat(v.total))}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
