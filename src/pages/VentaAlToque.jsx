import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import {
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    Search,
    X,
    User,
    CreditCard,
    Banknote,
    Zap,
    PackageSearch,
    Clock,
    Loader2,
    WifiOff,
    Lock
} from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

function formatCurrency(value) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export default function VentaAlToque() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState([]);
    const [clienteId, setClienteId] = useState('');
    const [estado, setEstado] = useState('pagado');
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [message, setMessage] = useState(null);
    const [cierreModalOpen, setCierreModalOpen] = useState(false);
    const [montoDeclarado, setMontoDeclarado] = useState('');
    const searchRef = useRef(null);
    const { isOnline } = useNetworkStatus();

    const { data: productosResponse = [] } = useQuery({
        queryKey: ['productos', 'activos'],
        queryFn: () => api.getProductos({ activo: 'true' }),
    });

    const productos = Array.isArray(productosResponse) ? productosResponse : (productosResponse.data || []);

    const { data: clientesResponse = [] } = useQuery({
        queryKey: ['clientes', 'activos'],
        queryFn: () => api.getClientes({ activo: 'true' }),
    });

    const clientes = Array.isArray(clientesResponse) ? clientesResponse : (clientesResponse?.data || []);

    useEffect(() => {
        setTimeout(() => searchRef.current?.focus(), 100);
    }, []);

    const filteredProducts = useMemo(() => {
        if (!search) return productos;
        const s = search.toLowerCase();
        return productos.filter((p) => p.nombre?.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s));
    }, [productos, search]);

    const addToCart = (producto) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.productoId === producto.id);
            if (existing) {
                if (existing.cantidad >= producto.stock_actual) return prev;
                return prev.map((item) =>
                    item.productoId === producto.id
                        ? { ...item, cantidad: item.cantidad + 1 }
                        : item
                );
            }
            if (producto.stock_actual < 1) return prev;
            return [
                ...prev,
                {
                    productoId: producto.id,
                    nombre: producto.nombre,
                    precio: parseFloat(producto.precio_venta),
                    cantidad: 1,
                    stock: producto.stock_actual,
                },
            ];
        });
    };

    const updateQty = (productoId, delta) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.productoId !== productoId) return item;
                    const newQty = item.cantidad + delta;
                    if (newQty < 1) return null;
                    if (newQty > item.stock) return item;
                    return { ...item, cantidad: newQty };
                })
                .filter(Boolean)
        );
    };

    const handleQtyChange = (productoId, value) => {
        if (value === '') {
            setCart(prev => prev.map(item => item.productoId === productoId ? { ...item, cantidad: '' } : item));
            return;
        }

        const newQty = parseInt(value);
        if (isNaN(newQty)) return;

        setCart((prev) =>
            prev.map((item) => {
                if (item.productoId !== productoId) return item;
                const cappedQty = Math.max(0, Math.min(item.stock, newQty));
                return { ...item, cantidad: cappedQty };
            })
        );
    };

    const handleQtyBlur = (productoId, value) => {
        const qty = parseInt(value) || 1;
        setCart(prev => prev.map(item =>
            item.productoId === productoId
                ? { ...item, cantidad: Math.max(1, qty) }
                : item
        ));
    };

    const removeFromCart = (productoId) => {
        setCart((prev) => prev.filter((item) => item.productoId !== productoId));
    };

    const clearCart = () => {
        setCart([]);
        setClienteId('');
        setEstado('pagado');
        setMetodoPago('efectivo');
        setSearch('');
        searchRef.current?.focus();
    };

    const total = cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

    const ventaMutation = useMutation({
        mutationFn: (ventaData) => api.createVenta(ventaData),
        onMutate: async (newVenta) => {
            await queryClient.cancelQueries({ queryKey: ['productos'] });

            const previousProducts = queryClient.getQueryData(['productos', 'activos']);

            // Optimistic Update: reduce stock instantly on frontend side
            if (previousProducts) {
                queryClient.setQueryData(['productos', 'activos'], old => {
                    return old.map(p => {
                        const cartItem = newVenta.items.find(i => i.productoId === p.id);
                        if (cartItem) {
                            return { ...p, stock_actual: p.stock_actual - cartItem.cantidad };
                        }
                        return p;
                    });
                });
            }
            return { previousProducts };
        },
        onError: (err, newVenta, context) => {
            if (context?.previousProducts) {
                queryClient.setQueryData(['productos', 'activos'], context.previousProducts);
            }
            setMessage({ type: 'error', text: err.message });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['productos'] });
            queryClient.invalidateQueries({ queryKey: ['ventas'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
        onSuccess: () => {
            setMessage({ type: 'success', text: '¡Venta registrada con éxito!' });
            clearCart();
            setTimeout(() => setMessage(null), 3000);
        }
    });

    const cerrarCajaMutation = useMutation({
        mutationFn: (monto_declarado) => api.cerrarCaja({ monto_declarado }),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['cierres'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            setCierreModalOpen(false);
            setMontoDeclarado('');
            setMessage({ type: 'success', text: `Caja cerrada. ${res.cuadre ? `Diferencia: ${formatCurrency(res.cuadre.diferencia)}` : ''}` });
        },
        onError: (err) => {
            setMessage({ type: 'error', text: err.message || 'Error al cerrar caja' });
        }
    });

    const handleConfirmarCierre = () => {
        if (!montoDeclarado) return;
        cerrarCajaMutation.mutate(Number(montoDeclarado));
    };

    const handleCobrar = () => {
        if (!isOnline) {
            setMessage({ type: 'error', text: 'No hay conexión a internet. Espera a que vuelva la red.' });
            return;
        }
        if (cart.length === 0) return;
        // Anti double-click: bloquea si ya hay una mutación en vuelo
        if (ventaMutation.isPending) return;
        if (estado === 'pendiente' && !clienteId) {
            setMessage({ type: 'error', text: 'Selecciona un cliente para ventas a crédito' });
            return;
        }

        setMessage(null);

        ventaMutation.mutate({
            clienteId: clienteId ? parseInt(clienteId) : null,
            estado,
            metodo_pago: metodoPago,
            items: cart.map((item) => ({
                productoId: item.productoId,
                cantidad: item.cantidad,
            })),
        });
    };


    return (
        <div className="page-container flex flex-col gap-6">
            {/* Header */}
            <header className="page-header shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1>Venta al Toque</h1>
                        <p>TPV optimizado para velocidad</p>
                    </div>
                </div>
                
                {/* Botón de Cierre de Caja del Vendedor */}
                <button
                    className="btn bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors font-bold shadow-sm px-4 mr-2"
                    onClick={() => setCierreModalOpen(true)}
                    disabled={ventaMutation.isPending || !isOnline}
                >
                    <Lock size={16} />
                    Cerrar Turno (Caja)
                </button>
            </header>

            {/* Toast */}
            {message && (
                <div className={`toast animate-in fade-in-down duration-300 ${message.type === 'error' ? 'toast-error' : 'toast-success'}`}>
                    {message.text}
                </div>
            )}

            {/* Offline Warning */}
            {!isOnline && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl flex items-center justify-center gap-2 mb-2 animate-in fade-in">
                    <WifiOff className="w-5 h-5" />
                    <span className="font-semibold text-sm">Sin conexión a internet. Las ventas están deshabilitadas hasta que te reconectes.</span>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-3rem)] items-stretch">
                {/* ═══ Left Panel: Product Selection ═══ */}
                <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-3rem)]">
                    {/* Search */}
                    <div className="mb-4 relative shrink-0 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors w-5 h-5" />
                        <input
                            ref={searchRef}
                            type="text"
                            className="input input-lg pl-12 pr-12 shadow-sm"
                            placeholder="Buscar por nombre, código o SKU..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Products Table */}
                    <div className="flex-1 overflow-y-auto card relative">
                        <div className="table-responsive h-full">
                            <table className="table">
                                <thead className="sticky top-0 bg-card z-10 shadow-sm">
                                    <tr>
                                        <th className="pl-6 text-left w-1/2">Producto</th>
                                        <th className="text-center w-24">SKU</th>
                                        <th className="text-center w-24">Stock</th>
                                        <th className="text-center w-32">Precio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((p) => {
                                        const inCart = cart.find((c) => c.productoId === p.id);
                                        const stockAvailable = p.stock_actual - (inCart?.cantidad || 0);

                                        return (
                                            <tr
                                                key={p.id}
                                                className={`group cursor-pointer transition-all ${stockAvailable < 1 ? 'opacity-40 grayscale' : 'hover:bg-primary/[0.04]'}`}
                                                onClick={() => stockAvailable > 0 && addToCart(p)}
                                            >
                                                <td className="pl-6">
                                                    <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{p.nombre}</div>
                                                    {inCart && (
                                                        <div className="text-[10px] font-bold text-primary tracking-wider mt-0.5">
                                                            {inCart.cantidad} en carrito
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <code className="bg-muted px-2 py-0.5 rounded-md text-xs font-mono text-muted-foreground">{p.sku}</code>
                                                </td>
                                                <td className="text-center">
                                                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold whitespace-nowrap ${p.stock_actual <= p.stock_minimo
                                                        ? 'bg-destructive/10 text-destructive'
                                                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                        }`}>
                                                        {p.stock_actual} disp.
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <span className="font-bold text-foreground tabular-nums">
                                                        {formatCurrency(parseFloat(p.precio_venta))}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredProducts.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-center py-20">
                                                <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                                                    <PackageSearch className="w-14 h-14 mb-3" />
                                                    <p className="text-base font-medium">No encontramos productos</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* ═══ Right Panel: Cart ═══ */}
                <div className="w-[400px] max-w-full shrink-0 flex flex-col card overflow-hidden h-[calc(100vh-3rem)] lg:sticky lg:top-4">
                    {/* Cart Header */}
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="relative">
                                <ShoppingCart className="w-5 h-5 text-foreground" />
                                {cart.length > 0 && (
                                    <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center border-2 border-card">
                                        {cart.reduce((s, i) => s + i.cantidad, 0)}
                                    </span>
                                )}
                            </div>
                            <h3 className="font-bold text-base">Resumen de Venta</h3>
                        </div>
                        {cart.length > 0 && (
                            <button className="text-xs font-bold text-destructive hover:bg-destructive/10 px-2.5 py-1 rounded-lg transition-colors" onClick={clearCart}>
                                Borrar
                            </button>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-0 relative">
                        {cart.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/25 px-6 text-center pointer-events-none">
                                <div className="p-5 bg-muted/50 rounded-2xl mb-3">
                                    <Banknote className="w-12 h-12" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground/50">
                                    Selecciona productos de la lista para facturar
                                </p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.productoId} className="group p-4 rounded-xl bg-background border border-border hover:border-primary/30 transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-sm text-foreground truncate">{item.nombre}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {formatCurrency(item.precio)} /u
                                            </div>
                                        </div>
                                        <button
                                            className="p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                                            onClick={() => removeFromCart(item.productoId)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg">
                                            <button
                                                onClick={() => updateQty(item.productoId, -1)}
                                                className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-card rounded-md transition-all active:scale-90"
                                            >
                                                <Minus size={13} />
                                            </button>
                                            <input
                                                type="number"
                                                value={item.cantidad}
                                                onChange={(e) => handleQtyChange(item.productoId, e.target.value)}
                                                onBlur={(e) => handleQtyBlur(item.productoId, e.target.value)}
                                                className="w-10 bg-transparent text-sm font-bold text-center tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-0"
                                                min="1"
                                                max={item.stock}
                                            />
                                            <button
                                                onClick={() => updateQty(item.productoId, 1)}
                                                disabled={item.cantidad >= item.stock}
                                                className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-card disabled:opacity-30 rounded-md transition-all active:scale-90"
                                            >
                                                <Plus size={13} />
                                            </button>
                                        </div>
                                        <div className="text-base font-bold text-foreground tabular-nums">
                                            {formatCurrency(item.precio * item.cantidad)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Cart Footer */}
                    <div className="p-5 border-t border-border space-y-4 shrink-0 bg-card z-10 w-full relative">
                        {/* Client selector */}
                        <div>
                            <label className="flex items-center gap-1.5 form-label mb-2">
                                <User className="w-3 h-3" /> Cliente
                            </label>
                            <select
                                className="input"
                                value={clienteId}
                                onChange={(e) => setClienteId(e.target.value)}
                            >
                                <option className="bg-background text-foreground" value="">Consumidor Final</option>
                                {clientes.map((c) => (
                                    <option className="bg-background text-foreground" key={c.id} value={c.id}>
                                        {c.nombre} {parseFloat(c.saldo_actual) > 0 ? `(Saldo: -${formatCurrency(c.saldo_actual)})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Condición de Venta / Payment State */}
                        <div>
                            <label className="flex items-center gap-1.5 form-label mb-2">
                                <CreditCard className="w-3 h-3" /> Condición de Venta
                            </label>
                            <div className="grid grid-cols-2 gap-1.5 mb-4">
                                <button
                                    type="button"
                                    onClick={() => setEstado('pagado')}
                                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all text-xs ${estado === 'pagado'
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                                        }`}
                                >
                                    <Banknote className="w-4 h-4" />
                                    <span className="text-[10px] font-bold tracking-wider">PAGADO</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEstado('pendiente')}
                                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all text-xs ${estado === 'pendiente'
                                        ? 'border-orange-500 bg-orange-500/5 text-orange-500'
                                        : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                                        }`}
                                >
                                    <Clock className="w-4 h-4" />
                                    <span className="text-[10px] font-bold tracking-wider">A CRÉDITO</span>
                                </button>
                            </div>

                            {/* Método de Pago (solo si es pagado) */}
                            {estado === 'pagado' && (
                                <div>
                                    <label className="flex items-center gap-1.5 form-label mb-2">
                                        <Banknote className="w-3 h-3" /> Medio de Pago
                                    </label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setMetodoPago('efectivo')}
                                            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all text-xs ${metodoPago === 'efectivo'
                                                ? 'border-emerald-500 bg-emerald-500/5 text-emerald-500'
                                                : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                                                }`}
                                        >
                                            <span className="text-[10px] font-bold tracking-wider">EFECTIVO</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMetodoPago('transferencia')}
                                            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all text-xs ${metodoPago === 'transferencia'
                                                ? 'border-indigo-500 bg-indigo-500/5 text-indigo-500'
                                                : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                                                }`}
                                        >
                                            <span className="text-[10px] font-bold tracking-wider">APPS / TRANSF</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Total & Checkout */}
                        <div className="pt-3 border-t border-border">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-muted-foreground uppercase">TOTAL</span>
                                <span className="text-xl font-extrabold text-foreground tabular-nums tracking-tight">{formatCurrency(total)}</span>
                            </div>

                            {/* Actions */}
                            <button
                                className="btn btn-primary w-full h-14 text-lg font-black shadow-lg shadow-primary/20 flex items-center justify-center gap-3 shrink-0"
                                onClick={handleCobrar}
                                disabled={cart.length === 0 || ventaMutation.isPending || !isOnline}
                            >
                                {ventaMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                                        <span className="truncate">Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        {estado === 'pagado' ? <Banknote className="w-5 h-5 shrink-0" /> : <Clock className="w-5 h-5 shrink-0" />}
                                        <span className="truncate">{estado === 'pagado' ? 'Cobrar Venta' : 'Registrar Venta a Crédito'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Cierre de Caja a Ciegas */}
            {cierreModalOpen && (
                <div 
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" 
                    style={{ zIndex: 9999 }} 
                    onClick={() => !cerrarCajaMutation.isPending && setCierreModalOpen(false)}
                >
                    <div
                        className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-border flex items-center gap-3 bg-muted/30">
                            <div className="p-2.5 bg-destructive/10 text-destructive rounded-xl shrink-0">
                                <Lock className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight">Cerrar Turno (A Ciegas)</h3>
                                <p className="text-sm text-muted-foreground">Declara el efectivo físico que tenés en caja.</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="form-label mb-2 block">
                                    Monto Efectivo en Caja Físico ($)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
                                    <input
                                        type="number"
                                        autoFocus
                                        className="input pl-8 text-lg font-bold w-full"
                                        placeholder="0.00"
                                        value={montoDeclarado}
                                        onChange={(e) => setMontoDeclarado(e.target.value)}
                                        disabled={cerrarCajaMutation.isPending}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleConfirmarCierre();
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                                    Ingresá solo el dinero en <b>efectivo</b> (billetes/monedas) con el que estás entregando el turno. El sistema verificará si hay diferencias contra las ventas registradas.
                                </p>
                            </div>

                            {cerrarCajaMutation.isError && (
                                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl font-medium">
                                    {cerrarCajaMutation.error?.message || 'Error al procesar el cierre'}
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-border bg-muted/20 flex justify-end gap-3">
                            <button
                                className="btn border border-border bg-card text-foreground hover:bg-muted"
                                onClick={() => setCierreModalOpen(false)}
                                disabled={cerrarCajaMutation.isPending}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold shadow-lg shadow-destructive/20 min-w-[140px]"
                                onClick={handleConfirmarCierre}
                                disabled={!montoDeclarado || cerrarCajaMutation.isPending}
                            >
                                {cerrarCajaMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Cerrando...
                                    </>
                                ) : (
                                    'Confirmar Cierre'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
