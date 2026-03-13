import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, Phone, MapPin, CreditCard, Wallet, FileText, ShoppingCart, Loader2, Edit2, X } from 'lucide-react';

function formatCurrency(value) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function ClienteDetalle() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: cliente, isLoading: loading } = useQuery({
        queryKey: ['cliente', id],
        queryFn: () => api.getCliente(parseInt(id)),
    });

    const [showEdit, setShowEdit] = useState(false);
    const [editData, setEditData] = useState({
        nombre: '',
        telefono: '',
        direccion: '',
        limite_credito: '',
        activo: true
    });
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (cliente) {
            setEditData({
                nombre: cliente.nombre || '',
                telefono: cliente.telefono || '',
                direccion: cliente.direccion || '',
                limite_credito: cliente.limite_credito || '',
                activo: cliente.activo
            });
        }
    }, [cliente]);

    const updateClienteMutation = useMutation({
        mutationFn: (data) => api.updateCliente(parseInt(id), data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cliente', id] });
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            setShowEdit(false);
            setMessage({ type: 'success', text: 'Cliente actualizado exitosamente' });
            setTimeout(() => setMessage(null), 3000);
        },
        onError: (err) => {
            setMessage({ type: 'error', text: err.message });
            setTimeout(() => setMessage(null), 3000);
        }
    });

    const handleEdit = (e) => {
        e.preventDefault();
        updateClienteMutation.mutate({
            nombre: editData.nombre,
            telefono: editData.telefono || null,
            direccion: editData.direccion || null,
            limite_credito: parseFloat(editData.limite_credito) || 0,
            activo: editData.activo
        });
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="font-medium">Cargando cliente...</span>
                </div>
            </div>
        );
    }

    if (!cliente) {
        return (
            <div className="flex flex-col h-64 items-center justify-center text-center">
                <h3 className="text-xl font-bold text-foreground mb-4">Cliente no encontrado</h3>
                <button className="btn btn-outline" onClick={() => navigate('/clientes')}>
                    Volver a clientes
                </button>
            </div>
        );
    }

    const infoCards = [
        {
            label: 'Teléfono',
            value: cliente.telefono || '—',
            icon: Phone,
            color: 'text-primary',
            bg: 'bg-primary/10',
        },
        {
            label: 'Dirección',
            value: cliente.direccion || '—',
            icon: MapPin,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
        },
        {
            label: 'Límite de Crédito',
            value: formatCurrency(parseFloat(cliente.limite_credito)),
            icon: CreditCard,
            color: 'text-sky-500',
            bg: 'bg-sky-500/10',
            large: true,
        },
    ];

    const hasSaldo = parseFloat(cliente.saldo_actual) > 0;

    return (
        <div className="page-container space-y-8">
            {/* Header */}
            <header className="page-header">
                <div className="flex items-center gap-4">
                    <button
                        className="btn-icon bg-muted text-foreground hover:bg-muted/80 rounded-xl"
                        onClick={() => navigate('/clientes')}
                        title="Volver"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1>{cliente.nombre}</h1>
                        <p>Detalle y estado de cuenta del cliente</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap mt-3 sm:mt-0">
                    <span className={`badge ${cliente.activo ? 'badge-success' : 'badge-danger'}`}>
                        {cliente.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <button className="btn btn-outline bg-card text-foreground border-border hover:bg-muted h-9 px-3 text-sm gap-2 touch-target" onClick={() => setShowEdit(true)}>
                        <Edit2 size={16} /> Editar
                    </button>
                </div>
            </header>

            {/* Toast */}
            {message && (
                <div className={`toast animate-in fade-in-down duration-300 ${message.type === 'error' ? 'toast-error' : 'toast-success'}`}>
                    {message.text}
                </div>
            )}

            {/* ═══ Edit Client Modal ═══ */}
            {showEdit && (
                <div className="modal-overlay animate-in fade-in duration-200" onClick={() => setShowEdit(false)}>
                    <div className="modal-content max-w-md animate-in scale-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="font-bold text-lg text-foreground">Editar Cliente</h3>
                            <button className="btn-icon hover:bg-muted text-muted-foreground" onClick={() => setShowEdit(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleEdit}>
                            <div className="modal-body space-y-4">
                                <div className="space-y-2">
                                    <label className="form-label">Nombre</label>
                                    <input
                                        className="input input-lg"
                                        value={editData.nombre}
                                        onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                                        placeholder="Ej: Kiosco Don Pedro"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="form-label">Teléfono</label>
                                        <input
                                            className="input"
                                            value={editData.telefono}
                                            onChange={(e) => setEditData({ ...editData, telefono: e.target.value })}
                                            placeholder="Ej: 1155443322"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="form-label">Límite de Crédito</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={editData.limite_credito}
                                            onChange={(e) => setEditData({ ...editData, limite_credito: e.target.value })}
                                            placeholder="0"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="form-label">Dirección</label>
                                    <input
                                        className="input"
                                        value={editData.direccion}
                                        onChange={(e) => setEditData({ ...editData, direccion: e.target.value })}
                                        placeholder="Ej: Av. San Martín 1234"
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border mt-2">
                                    <label className="font-semibold text-sm cursor-pointer select-none">Estado del cliente</label>
                                    <button
                                        type="button"
                                        className={`badge ${editData.activo ? 'badge-success hover:bg-red-100 hover:text-red-700' : 'badge-danger hover:bg-emerald-100 hover:text-emerald-700'} transition-colors cursor-pointer`}
                                        onClick={() => setEditData({ ...editData, activo: !editData.activo })}
                                    >
                                        {editData.activo ? 'Activo (click para pausar)' : 'Pausado (click para activar)'}
                                    </button>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowEdit(false)} disabled={updateClienteMutation.isPending}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary font-bold" disabled={updateClienteMutation.isPending}>
                                    {updateClienteMutation.isPending ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                                    ) : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══ Info Cards ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
                {infoCards.map((card, i) => (
                    <div key={i} className="metric-card">
                        <div className="relative flex items-start justify-between mb-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{card.label}</p>
                            <div className={`p-2 rounded-xl ${card.bg} ${card.color}`}>
                                <card.icon className="w-4 h-4" />
                            </div>
                        </div>
                        <div className={`${card.large ? 'text-2xl' : 'text-lg'} font-bold text-foreground truncate`}>
                            {card.value}
                        </div>
                    </div>
                ))}

                {/* Saldo Card (special) */}
                <div className={`metric-card border-l-4 ${hasSaldo ? 'border-destructive' : 'border-emerald-500'}`}>
                    <div className="relative flex items-start justify-between mb-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo Actual</p>
                        <div className={`p-2 rounded-xl ${hasSaldo ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            <Wallet className="w-4 h-4" />
                        </div>
                    </div>
                    <div className={`text-2xl font-extrabold ${hasSaldo ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatCurrency(parseFloat(cliente.saldo_actual))}
                    </div>
                </div>
            </div>

            {/* ═══ Purchase History ═══ */}
            <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                        <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground">Historial de Compras</h3>
                </div>
                {cliente.ventas.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="p-4 rounded-2xl bg-muted mb-3">
                            <ShoppingCart className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                        <h3 className="text-base font-bold text-foreground mb-1">Sin compras registradas</h3>
                        <p className="text-sm text-muted-foreground">Las compras de este cliente aparecerán aquí</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="pl-6">ID</th>
                                    <th>Fecha</th>
                                    <th>Vendedor</th>
                                    <th className="w-1/3">Productos</th>
                                    <th>Estado</th>
                                    <th className="text-right pr-6">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cliente.ventas.map((v) => (
                                    <tr key={v.id} className="group">
                                        <td className="pl-6 text-muted-foreground font-medium">#{v.id}</td>
                                        <td className="text-foreground">{formatDate(v.fecha)}</td>
                                        <td className="text-foreground">{v.usuario?.nombre}</td>
                                        <td>
                                            <div className="flex flex-wrap gap-1.5">
                                                {v.items.map((item, i) => (
                                                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                                                        <strong className="mr-1 text-foreground">{item.cantidad}x</strong> {item.producto?.nombre}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${v.estado === 'pagado' ? 'badge-success' : 'badge-warning'}`}>
                                                {v.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="text-right pr-6 font-bold text-foreground tabular-nums group-hover:text-primary transition-colors">
                                            {formatCurrency(parseFloat(v.total))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
