import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Plus, X, Eye, Search, Users, Loader2 } from 'lucide-react';

function formatCurrency(value) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export default function Clientes() {
    const queryClient = useQueryClient();
    const { data: clientes = [], isLoading: loading } = useQuery({
        queryKey: ['clientes'],
        queryFn: api.getClientes,
    });
    const [showNew, setShowNew] = useState(false);
    const [search, setSearch] = useState('');
    const [newCliente, setNewCliente] = useState({
        nombre: '',
        telefono: '',
        direccion: '',
        limite_credito: '',
    });
    const [message, setMessage] = useState(null);
    const navigate = useNavigate();

    const createClienteMutation = useMutation({
        mutationFn: (data) => api.createCliente(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            setShowNew(false);
            setNewCliente({ nombre: '', telefono: '', direccion: '', limite_credito: '' });
            setMessage({ type: 'success', text: 'Cliente creado exitosamente' });
            setTimeout(() => setMessage(null), 3000);
        },
        onError: (err) => {
            setMessage({ type: 'error', text: err.message });
        }
    });

    const handleCreate = (e) => {
        e.preventDefault();
        createClienteMutation.mutate({
            nombre: newCliente.nombre,
            telefono: newCliente.telefono || null,
            direccion: newCliente.direccion || null,
            limite_credito: parseFloat(newCliente.limite_credito) || 0,
        });
    };

    const filteredClientes = useMemo(() => {
        if (!search) return clientes;
        const s = search.toLowerCase();
        return clientes.filter((c) =>
            c.nombre.toLowerCase().includes(s) || (c.telefono && c.telefono.includes(s))
        );
    }, [clientes, search]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="font-medium">Cargando clientes...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container space-y-6">
            {/* Header */}
            <header className="page-header">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1>Clientes</h1>
                        <p>Gestión de clientes y cuentas corrientes</p>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={() => setShowNew(true)}>
                    <Plus size={18} /> Nuevo Cliente
                </button>
            </header>

            {/* Toast */}
            {message && (
                <div className={`toast animate-in fade-in-down duration-300 ${message.type === 'error' ? 'toast-error' : 'toast-success'}`}>
                    {message.text}
                </div>
            )}

            {/* ═══ New Client Modal ═══ */}
            {showNew && (
                <div className="modal-overlay animate-in fade-in duration-200" onClick={() => setShowNew(false)}>
                    <div className="modal-content max-w-md animate-in scale-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="font-bold text-lg text-foreground">Nuevo Cliente</h3>
                            <button className="btn-icon hover:bg-muted text-muted-foreground" onClick={() => setShowNew(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body space-y-4">
                                <div className="space-y-2">
                                    <label className="form-label">Nombre</label>
                                    <input
                                        className="input input-lg"
                                        value={newCliente.nombre}
                                        onChange={(e) => setNewCliente({ ...newCliente, nombre: e.target.value })}
                                        placeholder="Ej: Kiosco Don Pedro"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="form-label">Teléfono</label>
                                        <input
                                            className="input"
                                            value={newCliente.telefono}
                                            onChange={(e) => setNewCliente({ ...newCliente, telefono: e.target.value })}
                                            placeholder="Ej: 1155443322"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="form-label">Límite de Crédito</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={newCliente.limite_credito}
                                            onChange={(e) => setNewCliente({ ...newCliente, limite_credito: e.target.value })}
                                            placeholder="0"
                                            min="0"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="form-label">Dirección</label>
                                    <input
                                        className="input"
                                        value={newCliente.direccion}
                                        onChange={(e) => setNewCliente({ ...newCliente, direccion: e.target.value })}
                                        placeholder="Ej: Av. San Martín 1234"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowNew(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary font-bold">
                                    Crear Cliente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="max-w-md relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                    className="input pl-11"
                    placeholder="Buscar por nombre o teléfono..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* ═══ Clients Table ═══ */}
            <div className="card overflow-hidden">
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th className="pl-6">Nombre</th>
                                <th>Teléfono</th>
                                <th>Dirección</th>
                                <th className="text-right">Límite Crédito</th>
                                <th className="text-right">Saldo Actual</th>
                                <th>Estado</th>
                                <th className="text-center pr-6">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClientes.map((c) => (
                                <tr key={c.id} className="group">
                                    <td className="pl-6 font-semibold text-foreground">{c.nombre}</td>
                                    <td className="text-muted-foreground">{c.telefono || '—'}</td>
                                    <td className="text-muted-foreground truncate max-w-[200px]">
                                        {c.direccion || '—'}
                                    </td>
                                    <td className="text-right tabular-nums">
                                        {formatCurrency(parseFloat(c.limite_credito))}
                                    </td>
                                    <td className={`text-right font-semibold tabular-nums ${parseFloat(c.saldo_actual) > 0 ? 'text-destructive' : 'text-foreground'}`}>
                                        {formatCurrency(parseFloat(c.saldo_actual))}
                                    </td>
                                    <td>
                                        <span className={`badge ${c.activo ? 'badge-success' : 'badge-danger'}`}>
                                            {c.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="text-center pr-6">
                                        <button
                                            className="btn btn-outline h-8 px-3 text-xs gap-1.5"
                                            onClick={() => navigate(`/clientes/${c.id}`)}
                                        >
                                            <Eye size={13} /> Ver
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredClientes.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="text-center py-16">
                                        <div className="flex flex-col items-center text-muted-foreground/40">
                                            <Users className="w-12 h-12 mb-3" />
                                            <p className="font-medium">No se encontraron clientes</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
