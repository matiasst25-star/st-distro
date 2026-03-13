import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Plus, Save, X, Check, Package, Barcode, TrendingUp, AlertCircle, Edit2, Search, Loader2, ShieldAlert } from 'lucide-react';
import { z } from 'zod';

const productoSchema = z.object({
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    sku: z.string().min(1, 'El SKU es obligatorio'),
    precio_venta: z.number({ invalid_type_error: 'Precio inválido' }).min(0, 'El precio de venta no puede ser negativo'),
    precio_costo: z.number({ invalid_type_error: 'Costo inválido' }).min(0, 'El precio de costo no puede ser negativo'),
    stock_actual: z.number().min(0, 'El stock no puede ser negativo').optional(),
    stock_minimo: z.number().min(0, 'El stock mínimo no puede ser negativo').optional(),
});

function formatCurrency(value) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export default function Productos() {
    const queryClient = useQueryClient();
    const { isAdmin } = useAuth();
    const { data: productos = [], isLoading: loading } = useQuery({
        queryKey: ['productos'],
        queryFn: api.getProductos,
    });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [showNew, setShowNew] = useState(false);
    const [search, setSearch] = useState('');
    const [newProduct, setNewProduct] = useState({
        nombre: '',
        sku: '',
        precio_venta: '',
        precio_costo: '',
        stock_actual: '',
        stock_minimo: '5',
    });
    const [message, setMessage] = useState(null);

    /* Custom Hooks */
    const updateProductoMutation = useMutation({
        mutationFn: ({ id, data }) => api.updateProducto(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productos'] });
            setEditingId(null);
            setEditData({});
            showMsg('success', 'Producto actualizado con éxito');
        },
        onError: (err) => showMsg('error', err.message),
    });

    const createProductoMutation = useMutation({
        mutationFn: (data) => api.createProducto(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productos'] });
            setShowNew(false);
            setNewProduct({ nombre: '', sku: '', precio_venta: '', precio_costo: '', stock_actual: '', stock_minimo: '5' });
            showMsg('success', 'Producto incorporado al inventario');
        },
        onError: (err) => showMsg('error', err.message),
    });

    const startEdit = (producto) => {
        setEditingId(producto.id);
        setEditData({
            nombre: producto.nombre,
            sku: producto.sku,
            precio_venta: parseFloat(producto.precio_venta),
            precio_costo: parseFloat(producto.precio_costo),
            stock_actual: producto.stock_actual,
            stock_minimo: producto.stock_minimo,
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    const saveEdit = (id) => {
        try {
            const data = productoSchema.parse(editData);
            updateProductoMutation.mutate({ id, data });
        } catch (err) {
            if (err.errors) showMsg('error', err.errors[0].message);
        }
    };

    const handleCreate = (e) => {
        e.preventDefault();
        try {
            const data = productoSchema.parse({
                nombre: newProduct.nombre,
                sku: newProduct.sku,
                precio_venta: parseFloat(newProduct.precio_venta),
                precio_costo: parseFloat(newProduct.precio_costo),
                stock_actual: parseInt(newProduct.stock_actual) || 0,
                stock_minimo: parseInt(newProduct.stock_minimo) || 5,
            });
            createProductoMutation.mutate(data);
        } catch (err) {
            if (err.errors) showMsg('error', err.errors[0].message);
        }
    };

    const toggleActive = (producto) => {
        updateProductoMutation.mutate({ id: producto.id, data: { activo: !producto.activo } });
    };

    const showMsg = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    const filteredProducts = useMemo(() => {
        if (!search) return productos;
        const s = search.toLowerCase();
        return productos.filter((p) => p.nombre.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s));
    }, [productos, search]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="font-medium">Cargando productos...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container space-y-6">
            {/* Header */}
            <header className="page-header shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1>Gestión de Productos</h1>
                        <p>Control de inventario y optimización de precios</p>
                    </div>
                </div>
                {isAdmin && (
                    <button className="btn btn-primary" onClick={() => setShowNew(true)}>
                        <Plus size={18} /> Nuevo Producto
                    </button>
                )}
            </header>

            {/* Toast */}
            {message && (
                <div className={`toast animate-in fade-in-down duration-300 ${message.type === 'error' ? 'toast-error' : 'toast-success'}`}>
                    {message.text}
                </div>
            )
            }

            {/* Search */}
            <div className="max-w-md relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                    className="input pl-11"
                    placeholder="Buscar por nombre o SKU..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* ═══ New Product Modal ═══ */}
            {
                showNew && (
                    <div className="modal-overlay animate-in fade-in duration-200" onClick={() => setShowNew(false)}>
                        <div className="modal-content max-w-lg animate-in scale-in duration-200" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="font-bold text-xl text-foreground">Añadir al Inventario</h3>
                                <button className="btn-icon hover:bg-muted text-muted-foreground" onClick={() => setShowNew(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreate}>
                                <div className="modal-body space-y-5">
                                    <div className="space-y-2">
                                        <label className="form-label">Nombre del Producto</label>
                                        <input
                                            className="input input-lg"
                                            value={newProduct.nombre}
                                            onChange={(e) => setNewProduct({ ...newProduct, nombre: e.target.value })}
                                            placeholder="Ej: Termo Stanley Classic 1L"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="form-label">SKU / Código de Barras</label>
                                        <div className="relative">
                                            <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                className="input input-lg pl-11"
                                                value={newProduct.sku}
                                                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                                                placeholder="TS100L"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="form-label">Precio de Venta</label>
                                            <div className="relative">
                                                <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                                <input
                                                    type="number"
                                                    className="input input-lg pl-10 font-bold"
                                                    value={newProduct.precio_venta}
                                                    onChange={(e) => setNewProduct({ ...newProduct, precio_venta: e.target.value })}
                                                    placeholder="0"
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="form-label">Precio de Costo</label>
                                            <input
                                                type="number"
                                                className="input input-lg"
                                                value={newProduct.precio_costo}
                                                onChange={(e) => setNewProduct({ ...newProduct, precio_costo: e.target.value })}
                                                placeholder="0"
                                                required
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="form-label">Stock Inicial</label>
                                            <input
                                                type="number"
                                                className="input input-lg"
                                                value={newProduct.stock_actual}
                                                onChange={(e) => setNewProduct({ ...newProduct, stock_actual: e.target.value })}
                                                placeholder="0"
                                                min="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="form-label">Aviso Stock Mínimo</label>
                                            <div className="relative">
                                                <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                                                <input
                                                    type="number"
                                                    className="input input-lg pl-10"
                                                    value={newProduct.stock_minimo}
                                                    onChange={(e) => setNewProduct({ ...newProduct, stock_minimo: e.target.value })}
                                                    placeholder="5"
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowNew(false)}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary font-bold">
                                        Confirmar Alta
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* ═══ Products Table ═══ */}
            <div className="card overflow-hidden">

                {/* ─── MOBILE: Producto Cards ─── */}
                <div className="md:hidden">
                    {filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center text-muted-foreground/40 py-14">
                            <Package className="w-12 h-12 mb-3" />
                            <p className="font-medium text-base">No se encontraron productos</p>
                        </div>
                    ) : (
                        <div className="space-y-3 p-4">
                            {filteredProducts.map((p) => (
                                editingId === p.id ? (
                                    <div key={p.id} className="sale-card bg-primary/5 border-primary/20 space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">Nombre del producto</label>
                                            <input
                                                className="input h-10 text-sm font-bold"
                                                value={editData.nombre}
                                                onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">SKU</label>
                                                <input
                                                    className="input h-10 text-xs font-mono"
                                                    value={editData.sku}
                                                    onChange={(e) => setEditData({ ...editData, sku: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase pl-1">Precio Venta</label>
                                                <input
                                                    type="number"
                                                    className="input h-10 text-sm font-bold text-emerald-600"
                                                    value={editData.precio_venta}
                                                    onChange={(e) => setEditData({ ...editData, precio_venta: parseFloat(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {isAdmin && (
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">Costo</label>
                                                    <input
                                                        type="number"
                                                        className="input h-10 text-xs"
                                                        value={editData.precio_costo || 0}
                                                        onChange={(e) => setEditData({ ...editData, precio_costo: parseFloat(e.target.value) })}
                                                    />
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">Stock Act.</label>
                                                <input
                                                    type="number"
                                                    className="input h-10 text-xs font-bold"
                                                    value={editData.stock_actual}
                                                    onChange={(e) => setEditData({ ...editData, stock_actual: parseInt(e.target.value) })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">Stock Mín.</label>
                                                <input
                                                    type="number"
                                                    className="input h-10 text-xs"
                                                    value={editData.stock_minimo}
                                                    onChange={(e) => setEditData({ ...editData, stock_minimo: parseInt(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <button
                                                className={`w-full py-2.5 rounded-lg text-xs font-bold border transition-all active:scale-95 cursor-pointer ${p.activo
                                                    ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                                                    : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                                onClick={() => toggleActive(p)}
                                            >
                                                {p.activo ? 'Pausar Publicación (Ocultar)' : 'Activar Publicación'}
                                            </button>
                                        </div>
                                        <div className="flex gap-2 pt-2 border-t border-border mt-2">
                                            <button className="flex-1 btn btn-ghost h-10 border border-border" onClick={() => setEditingId(null)}>
                                                Cancelar
                                            </button>
                                            <button className="flex-1 btn btn-primary h-10 font-bold shadow-md shadow-primary/20" onClick={() => saveEdit(p.id)}>
                                                Guardar Cambios
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div key={p.id} className="sale-card">
                                        {/* Fila superior: nombre + badge estado */}
                                        <div className="sale-card-row">
                                            <span className="sale-card-amount line-clamp-1">{p.nombre}</span>
                                            {isAdmin ? (
                                                <button
                                                    className={`badge border-transparent transition-all active:scale-90 cursor-pointer ${p.activo
                                                        ? 'badge-success hover:bg-red-100 hover:text-red-700'
                                                        : 'badge-danger hover:bg-emerald-100 hover:text-emerald-700'}`}
                                                    onClick={() => toggleActive(p)}
                                                >
                                                    {p.activo ? 'Activo' : 'Inactivo'}
                                                </button>
                                            ) : (
                                                <span className={`badge ${p.activo ? 'badge-success' : 'badge-danger'}`}>
                                                    {p.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            )}
                                        </div>
                                        {/* SKU */}
                                        <div className="flex items-center gap-2">
                                            <code className="bg-muted px-2 py-0.5 rounded-md text-xs font-mono text-muted-foreground">{p.sku}</code>
                                        </div>
                                        {/* Precios y stock */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                {formatCurrency(parseFloat(p.precio_venta))}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${p.stock_actual <= p.stock_minimo
                                                ? 'bg-destructive/10 text-destructive'
                                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                                Stock: {p.stock_actual}
                                            </span>
                                        </div>
                                        {/* Editar (solo admin) */}
                                        {isAdmin && (
                                            <button
                                                className="w-full mt-1 btn btn-ghost text-xs h-8 gap-1.5 border border-border"
                                                onClick={() => startEdit(p)}
                                            >
                                                <Edit2 size={12} /> Editar producto
                                            </button>
                                        )}
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── DESKTOP: Tabla original ─── */}
                <div className="hidden md:block table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th className="pl-6 text-left w-1/3">Producto</th>
                                <th className="text-center w-24">SKU</th>
                                <th className="text-center w-24">Venta</th>
                                {isAdmin && <th className="text-center w-24">Costo</th>}
                                <th className="text-center w-24">Stock</th>
                                <th className="text-center w-24">Min.</th>
                                <th className={isAdmin ? "text-center w-24" : "text-center pr-6 w-24"}>Estado</th>
                                {isAdmin && <th className="text-center pr-6 w-24">Opciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((p) => (
                                <tr key={p.id} className={`group ${editingId === p.id ? 'bg-primary/[0.03]' : ''}`}>
                                    {editingId === p.id ? (
                                        <>
                                            <td className="px-2 py-3 min-w-[180px]">
                                                <input
                                                    className="input h-9 px-3 text-sm font-bold min-w-full"
                                                    value={editData.nombre}
                                                    onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                                                />
                                            </td>
                                            <td className="px-2 py-3">
                                                <input
                                                    className="input h-9 px-2 text-xs font-mono text-center min-w-[80px]"
                                                    value={editData.sku}
                                                    onChange={(e) => setEditData({ ...editData, sku: e.target.value })}
                                                />
                                            </td>
                                            <td className="px-2 py-3">
                                                <input
                                                    type="number"
                                                    className="input h-9 px-2 text-right text-sm font-bold text-emerald-600 min-w-[80px]"
                                                    value={editData.precio_venta}
                                                    onChange={(e) => setEditData({ ...editData, precio_venta: parseFloat(e.target.value) })}
                                                />
                                            </td>
                                            <td className="px-2 py-3">
                                                <input
                                                    type="number"
                                                    className="input h-9 px-2 text-right text-sm min-w-[80px]"
                                                    value={editData.precio_costo}
                                                    onChange={(e) => setEditData({ ...editData, precio_costo: parseFloat(e.target.value) })}
                                                />
                                            </td>
                                            <td className="px-2 py-3">
                                                <input
                                                    type="number"
                                                    className="input h-9 px-2 text-right text-sm font-bold min-w-[70px]"
                                                    value={editData.stock_actual}
                                                    onChange={(e) => setEditData({ ...editData, stock_actual: parseInt(e.target.value) })}
                                                />
                                            </td>
                                            <td className="px-2 py-3">
                                                <input
                                                    type="number"
                                                    className="input h-9 px-2 text-right text-sm min-w-[70px]"
                                                    value={editData.stock_minimo}
                                                    onChange={(e) => setEditData({ ...editData, stock_minimo: parseInt(e.target.value) })}
                                                />
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge ${p.activo ? 'badge-success' : 'badge-danger'}`}>
                                                    {p.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        className="btn-icon bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                                                        onClick={() => saveEdit(p.id)}
                                                        title="Guardar"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        className="btn-icon bg-muted text-foreground hover:bg-muted/80 transition-all"
                                                        onClick={cancelEdit}
                                                        title="Cancelar"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="pl-6 font-semibold text-foreground">
                                                {p.nombre}
                                            </td>
                                            <td className="text-center">
                                                <code className="bg-muted px-2 py-0.5 rounded-md text-xs font-mono text-muted-foreground">{p.sku}</code>
                                            </td>
                                            <td className="text-center font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                {formatCurrency(parseFloat(p.precio_venta))}
                                            </td>
                                            {isAdmin && (
                                                <td className="text-center text-muted-foreground tabular-nums text-xs">
                                                    {formatCurrency(parseFloat(p.precio_costo))}
                                                </td>
                                            )}
                                            <td className="text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-sm tabular-nums ${p.stock_actual <= p.stock_minimo
                                                    ? 'bg-destructive/10 text-destructive'
                                                    : 'text-foreground'
                                                    }`}>
                                                    {p.stock_actual}
                                                </span>
                                            </td>
                                            <td className="text-center text-muted-foreground/50 tabular-nums text-xs">
                                                {p.stock_minimo}
                                            </td>
                                            <td className={isAdmin ? "text-center" : "text-center pr-6"}>
                                                {isAdmin ? (
                                                    <button
                                                        className={`badge border-transparent transition-all active:scale-90 cursor-pointer ${p.activo
                                                            ? 'badge-success hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400'
                                                            : 'badge-danger hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400'
                                                            }`}
                                                        onClick={() => toggleActive(p)}
                                                        title={p.activo ? "Click para desactivar" : "Click para activar"}
                                                    >
                                                        {p.activo ? 'Activo' : 'Inactivo'}
                                                    </button>
                                                ) : (
                                                    <span className={`badge ${p.activo ? 'badge-success' : 'badge-danger'}`}>
                                                        {p.activo ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                )}
                                            </td>
                                            {isAdmin && (
                                                <td className="text-center pr-6">
                                                    <button
                                                        className="btn-icon text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all"
                                                        onClick={() => startEdit(p)}
                                                        title="Editar producto"
                                                    >
                                                        <Edit2 size={15} />
                                                    </button>
                                                </td>
                                            )}
                                        </>
                                    )}
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={isAdmin ? 8 : 6} className="text-center py-16">
                                        <div className="flex flex-col items-center text-muted-foreground/40">
                                            <Package className="w-12 h-12 mb-3" />
                                            <p className="font-medium text-base">No se encontraron productos</p>
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

