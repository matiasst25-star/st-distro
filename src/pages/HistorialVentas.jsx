import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import {
    Lock,
    Calendar,
    FileText,
    TrendingUp,
    ArrowRight,
    Filter,
    Clock,
    Loader2
} from 'lucide-react';

function formatCurrency(value) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export default function HistorialVentas() {
    const queryClient = useQueryClient();
    const dateFromRef = useRef(null);
    const dateToRef = useRef(null);

    const [dateFrom, setDateFrom] = useState(() => {
        const saved = localStorage.getItem('st_distro_historial_from');
        if (saved) return saved;
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = useState(() => {
        const saved = localStorage.getItem('st_distro_historial_to');
        if (saved) return saved;
        const d = new Date();
        return d.toISOString().split('T')[0];
    });

    const { data: cierres = [], isLoading: loading, error } = useQuery({
        queryKey: ['cierres', dateFrom, dateTo],
        queryFn: () => api.getCierres({ dateFrom, dateTo }),
    });

    const cerrarCajaMutation = useMutation({
        mutationFn: () => api.cerrarCaja(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cierres'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            window.alert('Caja cerrada con éxito');
        },
        onError: (err) => window.alert(err.message || 'Error al cerrar caja')
    });

    const handleSearch = (e) => {
        e.preventDefault();
        localStorage.setItem('st_distro_historial_from', dateFrom);
        localStorage.setItem('st_distro_historial_to', dateTo);
        // The useQuery will auto-refetch when dateFrom or dateTo changes, but triggering invalidate ensures fresh data
        queryClient.invalidateQueries({ queryKey: ['cierres', dateFrom, dateTo] });
    };

    const handleCerrarCaja = () => {
        if (!window.confirm('¿Estás seguro de cerrar la caja para las ventas pendientes?')) return;
        cerrarCajaMutation.mutate();
    };

    const totalAcumulado = cierres.reduce((sum, c) => sum + Number(c.total_vendido), 0);

    return (
        <div className="page-container space-y-8">
            {/* Header */}
            <header className="page-header shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1>Historial de Ganancias</h1>
                        <p>Registro histórico de cierres y facturación</p>
                    </div>
                </div>
                <button
                    className="btn btn-primary font-bold"
                    onClick={handleCerrarCaja}
                    disabled={cerrarCajaMutation.isPending}
                >
                    {cerrarCajaMutation.isPending ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Procesando...
                        </span>
                    ) : (
                        <>
                            <Lock size={16} />
                            Cerrar Caja de Hoy
                        </>
                    )}
                </button>
            </header>

            <div className="space-y-6">

                {/* Error Toast */}
                {error && (
                    <div className="toast toast-error animate-in fade-in-down duration-300">
                        {error.message || 'Error al cargar el historial'}
                    </div>
                )}

                {/* ═══ Filters & Summary ═══ */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Filters Card */}
                    <div className="card lg:col-span-3 p-6">
                        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="space-y-2">
                                <label className="form-label">Desde</label>
                                <div
                                    className="relative cursor-pointer group"
                                >
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary group-hover:scale-110 transition-transform pointer-events-none" />
                                    <input
                                        ref={dateFromRef}
                                        type="date"
                                        className="input pl-11 cursor-pointer w-full relative z-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="form-label">Hasta</label>
                                <div
                                    className="relative cursor-pointer group"
                                >
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary group-hover:scale-110 transition-transform pointer-events-none" />
                                    <input
                                        ref={dateToRef}
                                        type="date"
                                        className="input pl-11 cursor-pointer w-full relative z-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button type="submit" className="btn btn-secondary w-full h-10 font-bold group">
                                    <Filter size={15} className="group-hover:rotate-180 transition-transform duration-300" />
                                    Actualizar Vista
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Summary Card */}
                    <div className="card bg-gradient-to-br from-primary to-sky-500 border-0 p-6 flex flex-col justify-between overflow-hidden relative shadow-glow">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                        <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-white/5 rounded-full blur-xl" />
                        <div className="relative">
                            <p className="text-white/60 text-xs font-bold uppercase tracking-[0.15em] mb-1">Total del Período</p>
                            <h2 className="text-3xl font-extrabold text-white tracking-tight tabular-nums leading-none">
                                {formatCurrency(totalAcumulado)}
                            </h2>
                        </div>
                        <div className="relative mt-4 flex items-center gap-2 text-white/70 text-xs font-bold bg-white/10 py-1.5 px-3 rounded-full w-fit">
                            <TrendingUp className="w-3 h-3" />
                            Ganancia neta estimada
                        </div>
                    </div>
                </div>

                {/* ═══ Closures Table ═══ */}
                <div className="card overflow-hidden">
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="pl-6 py-4">Fecha / Hora de Cierre</th>
                                    <th className="py-4 text-right">Total Facturado</th>
                                    <th className="py-4 px-6 text-center">Detalle de Movimientos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="3" className="text-center py-20">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                <p className="text-muted-foreground font-medium">Sincronizando historial...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : cierres.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="text-center py-20">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                                                <Clock className="w-16 h-16 mb-3" />
                                                <p className="text-lg font-bold">No hay registros para este rango</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    cierres.map((c) => (
                                        <tr key={c.id} className="group hover:bg-primary/[0.02]">
                                            <td className="py-5 pl-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                        <Calendar className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-foreground">
                                                            {new Date(c.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                                                            Registrado a las {new Date(c.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 text-right">
                                                <div className="flex flex-col items-end">
                                                    <div className="text-xl font-extrabold text-foreground tabular-nums tracking-tight group-hover:scale-105 transition-transform origin-right">
                                                        {formatCurrency(Number(c.total_vendido))}
                                                    </div>
                                                    <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase mt-1">
                                                        Operación cerrada
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex flex-wrap justify-center gap-1.5">
                                                    {c.productos_vendidos?.length > 0 ? (
                                                        c.productos_vendidos.map((p, idx) => (
                                                            <div key={idx} className="flex items-center bg-background border border-border rounded-lg px-2.5 py-1 gap-2 hover:border-primary/30 transition-colors">
                                                                <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">{p.nombre}</span>
                                                                <span className="text-[10px] font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5 tabular-nums">
                                                                    {p.cantidad}
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                            <ArrowRight className="w-3 h-3" /> Sin desglose disponible
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
