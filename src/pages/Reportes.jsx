import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
    FileText,
    FileSpreadsheet,
    BarChart3,
    Package,
    Users,
    Calendar,
    ChevronDown,
    Loader2,
    AlertTriangle,
    TrendingDown,
    Banknote,
    Download,
} from 'lucide-react';
import { exportVentasPDF, exportStockCriticoPDF, exportCuentasCorrientesPDF } from '../utils/exportPDF';
import { exportVentasExcel, exportStockCriticoExcel, exportCuentasCorrientesExcel } from '../utils/exportExcel';

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function getTodayISO() {
    return new Date().toISOString().slice(0, 10);
}

function getStartOfWeekISO() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().slice(0, 10);
}

function getStartOfMonthISO() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

const DATE_PRESETS = [
    { label: 'Hoy', from: getTodayISO, to: getTodayISO },
    { label: 'Esta Semana', from: getStartOfWeekISO, to: getTodayISO },
    { label: 'Este Mes', from: getStartOfMonthISO, to: getTodayISO },
    { label: 'Personalizado', from: null, to: null },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExportButton({ onClick, loading, icon: Icon, label, variant = 'primary' }) {
    const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.97]';
    const styles = variant === 'primary'
        ? 'bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20'
        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20';

    return (
        <button onClick={onClick} disabled={loading} className={`${base} ${styles}`}>
            {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Icon className="w-4 h-4" />
            }
            {loading ? 'Generando...' : label}
        </button>
    );
}

function StatBadge({ label, value, color = 'primary' }) {
    const colors = {
        primary: 'bg-primary/10 text-primary',
        red: 'bg-red-500/10 text-red-500',
        amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    };
    return (
        <div className={`inline-flex flex-col items-center px-4 py-2 rounded-xl ${colors[color]}`}>
            <span className="text-xs font-semibold opacity-70">{label}</span>
            <span className="text-sm font-extrabold">{value}</span>
        </div>
    );
}

// ─── Report Card Wrapper ──────────────────────────────────────────────────────

function ReportCard({ icon: Icon, title, description, children, accent = 'primary' }) {
    const accents = {
        primary: 'from-primary/10 to-sky-400/10 border-primary/20',
        red: 'from-red-500/10 to-orange-400/10 border-red-500/20',
        amber: 'from-amber-500/10 to-yellow-400/10 border-amber-500/20',
    };
    const iconColors = { primary: 'bg-primary/15 text-primary', red: 'bg-red-500/15 text-red-500', amber: 'bg-amber-500/15 text-amber-600' };

    return (
        <div className={`card bg-gradient-to-br ${accents[accent]} border overflow-hidden`}>
            <div className="p-6 border-b border-border/50">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${iconColors[accent]}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-foreground">{title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                </div>
            </div>
            <div className="p-6 space-y-4">{children}</div>
        </div>
    );
}

// ─── Ventas Report Section ────────────────────────────────────────────────────

function VentasReport() {
    const [activePreset, setActivePreset] = useState(2); // Este Mes
    const [customFrom, setCustomFrom] = useState(getStartOfMonthISO());
    const [customTo, setCustomTo] = useState(getTodayISO());
    const [loadingPDF, setLoadingPDF] = useState(false);
    const [loadingExcel, setLoadingExcel] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);

    const getRange = () => {
        const preset = DATE_PRESETS[activePreset];
        if (preset.from) {
            return { dateFrom: preset.from(), dateTo: preset.to() };
        }
        return { dateFrom: customFrom, dateTo: customTo };
    };

    const fetchData = async () => {
        setError('');
        const range = getRange();
        const result = await api.getReporteVentas(range);
        return { data: result.data, meta: result.meta, range };
    };

    const handlePDF = async () => {
        setLoadingPDF(true);
        try {
            const { data, range } = await fetchData();
            exportVentasPDF(data, range);
            setPreview({ count: data.length });
        } catch (e) {
            setError('Error al generar el PDF. Verificá que el backend esté activo.');
        } finally {
            setLoadingPDF(false);
        }
    };

    const handleExcel = async () => {
        setLoadingExcel(true);
        try {
            const { data, range } = await fetchData();
            exportVentasExcel(data, range);
        } catch (e) {
            setError('Error al generar el Excel.');
        } finally {
            setLoadingExcel(false);
        }
    };

    return (
        <ReportCard
            icon={BarChart3}
            title="Historial de Ventas"
            description="Filtrá por período y exportá con totales incluidos"
            accent="primary"
        >
            {/* Preset buttons */}
            <div className="flex flex-wrap gap-2">
                {DATE_PRESETS.map((p, i) => (
                    <button
                        key={i}
                        onClick={() => setActivePreset(i)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activePreset === i
                            ? 'bg-primary text-white shadow-md shadow-primary/25'
                            : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                            }`}
                    >
                        <Calendar className="w-3 h-3" />
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Custom date pickers */}
            {activePreset === 3 && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in-down duration-200">
                    <div className="space-y-1">
                        <label className="form-label text-xs">DESDE</label>
                        <div className="relative cursor-pointer group">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                            <input
                                type="date"
                                className="input pl-9 text-sm py-2 cursor-pointer w-full relative z-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="form-label text-xs">HASTA</label>
                        <div className="relative cursor-pointer group">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                            <input
                                type="date"
                                className="input pl-9 text-sm py-2 cursor-pointer w-full relative z-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Preview badge */}
            {preview && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl">
                    <Download className="w-3.5 h-3.5" />
                    <span className="font-bold">¡Descargado! {preview.count} ventas exportadas.</span>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-xl">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
                <ExportButton
                    onClick={handlePDF}
                    loading={loadingPDF}
                    icon={FileText}
                    label="Exportar PDF"
                    variant="primary"
                />
                <ExportButton
                    onClick={handleExcel}
                    loading={loadingExcel}
                    icon={FileSpreadsheet}
                    label="Exportar Excel"
                    variant="excel"
                />
            </div>
        </ReportCard>
    );
}

// ─── Stock Crítico Report Section ──────────────────────────────────────────────

function StockCriticoReport() {
    const [loadingPDF, setLoadingPDF] = useState(false);
    const [loadingExcel, setLoadingExcel] = useState(false);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState('');

    const fetchData = async () => {
        const result = await api.getReporteStockCritico();
        return result;
    };

    const handlePDF = async () => {
        setLoadingPDF(true);
        setError('');
        try {
            const { data } = await fetchData();
            if (data.length === 0) {
                setPreview({ empty: true });
                return;
            }
            exportStockCriticoPDF(data);
            setPreview({ count: data.length });
        } catch {
            setError('Error al generar el PDF.');
        } finally {
            setLoadingPDF(false);
        }
    };

    const handleExcel = async () => {
        setLoadingExcel(true);
        setError('');
        try {
            const { data } = await fetchData();
            if (data.length === 0) {
                setPreview({ empty: true });
                return;
            }
            exportStockCriticoExcel(data);
        } catch {
            setError('Error al generar el Excel.');
        } finally {
            setLoadingExcel(false);
        }
    };

    return (
        <ReportCard
            icon={Package}
            title="Stock Crítico"
            description="Productos con stock_actual ≤ stock_mínimo — snapshot instantáneo"
            accent="red"
        >
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/60 rounded-xl p-3">
                <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>Lista todos los productos que requieren reposición urgente, ordenados por déficit.</span>
            </div>

            {preview?.empty && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl font-medium">
                    ✅ ¡Excelente! No hay productos con stock crítico en este momento.
                </div>
            )}
            {preview?.count && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl">
                    <Download className="w-3.5 h-3.5" />
                    <span className="font-bold">¡Descargado! {preview.count} productos exportados.</span>
                </div>
            )}
            {error && (
                <div className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-xl">{error}</div>
            )}

            <div className="flex flex-wrap gap-3">
                <ExportButton onClick={handlePDF} loading={loadingPDF} icon={FileText} label="Exportar PDF" variant="primary" />
                <ExportButton onClick={handleExcel} loading={loadingExcel} icon={FileSpreadsheet} label="Exportar Excel" variant="excel" />
            </div>
        </ReportCard>
    );
}

// ─── Cuentas Corrientes Report Section ───────────────────────────────────────

function CuentasCorrientesReport() {
    const [loadingPDF, setLoadingPDF] = useState(false);
    const [loadingExcel, setLoadingExcel] = useState(false);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState('');

    const fetchData = async () => {
        const result = await api.getReporteCuentasCorrientes();
        return result;
    };

    const handlePDF = async () => {
        setLoadingPDF(true);
        setError('');
        try {
            const { data, meta } = await fetchData();
            if (data.length === 0) {
                setPreview({ empty: true });
                return;
            }
            exportCuentasCorrientesPDF(data, meta.totalDeuda);
            setPreview({ count: data.length, total: meta.totalDeuda });
        } catch {
            setError('Error al generar el PDF.');
        } finally {
            setLoadingPDF(false);
        }
    };

    const handleExcel = async () => {
        setLoadingExcel(true);
        setError('');
        try {
            const { data, meta } = await fetchData();
            if (data.length === 0) {
                setPreview({ empty: true });
                return;
            }
            exportCuentasCorrientesExcel(data, meta.totalDeuda);
        } catch {
            setError('Error al generar el Excel.');
        } finally {
            setLoadingExcel(false);
        }
    };

    return (
        <ReportCard
            icon={Users}
            title="Cuentas Corrientes"
            description="Clientes con saldo pendiente de cobro"
            accent="amber"
        >
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/60 rounded-xl p-3">
                <Banknote className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Incluye monto adeudado, límite de crédito y fecha del último movimiento.</span>
            </div>

            {preview?.empty && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl font-medium">
                    ✅ No hay clientes con deuda pendiente.
                </div>
            )}
            {preview?.count && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl">
                    <Download className="w-3.5 h-3.5" />
                    <span className="font-bold">
                        ¡Descargado! {preview.count} clientes — Total deuda: ${Number(preview.total).toLocaleString('es-AR')}
                    </span>
                </div>
            )}
            {error && (
                <div className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-xl">{error}</div>
            )}

            <div className="flex flex-wrap gap-3">
                <ExportButton onClick={handlePDF} loading={loadingPDF} icon={FileText} label="Exportar PDF" variant="primary" />
                <ExportButton onClick={handleExcel} loading={loadingExcel} icon={FileSpreadsheet} label="Exportar Excel" variant="excel" />
            </div>
        </ReportCard>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Reportes() {
    const { user } = useAuth();

    return (
        <div className="page-container space-y-8">
            {/* Header */}
            <header className="page-header">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1>Centro de Reportes</h1>
                        <p>Exportá datos en PDF y Excel con formato profesional</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 border border-primary/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-primary">Admin — {user?.nombre}</span>
                </div>
            </header>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-sky-400/5 border border-primary/15">
                <Download className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                    <p className="text-sm font-bold text-foreground">Reportes en tiempo real</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Los datos se obtienen directamente de la base de datos. Los PDFs incluyen el encabezado
                        <strong className="text-primary"> ST / DISTRO</strong> y la fecha de generación automáticamente.
                    </p>
                </div>
            </div>

            {/* Report Cards */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <VentasReport />
                <StockCriticoReport />
                <CuentasCorrientesReport />
            </div>

            {/* Format guide */}
            <div className="card p-6">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <ChevronDown className="w-4 h-4 text-primary" />
                    Guía de Formatos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <FileText className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground">PDF</p>
                            <p className="text-xs text-muted-foreground">
                                Encabezado con logo ST / DISTRO, filas alternas de color, total al pie y numeración de páginas.
                                Ideal para imprimir o compartir.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground">Excel (.xlsx)</p>
                            <p className="text-xs text-muted-foreground">
                                Cabeceras en negrita y celeste, columnas de precio en formato ARS, filas listas para filtrar.
                                Ideal para análisis.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
