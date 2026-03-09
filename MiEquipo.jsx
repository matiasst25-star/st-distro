import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
    UsersRound,
    UserPlus,
    Trash2,
    ShieldAlert,
    Loader2,
    CheckCircle2,
    Clock,
    Mail,
    User,
    Copy,
    Check
} from 'lucide-react';

export default function MiEquipo() {
    const { isAdmin, user } = useAuth();
    const queryClient = useQueryClient();
    const [email, setEmail] = useState('');
    const [nombre, setNombre] = useState('');
    const [toast, setToast] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // --- Queries ---
    const { data: members = [], isLoading } = useQuery({
        queryKey: ['team-members'],
        queryFn: api.getTeamMembers,
        enabled: isAdmin,
    });

    // --- Mutations ---
    const inviteMutation = useMutation({
        mutationFn: (data) => api.inviteVendedor(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-members'] });
            setEmail('');
            setNombre('');
            showToast('¡Invitación enviada! El vendedor puede registrarse con ese email.');
        },
        onError: (err) => showToast(err.message || 'Error al invitar', 'error'),
    });

    const removeMutation = useMutation({
        mutationFn: (id) => api.removeTeamMember(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-members'] });
            showToast('Miembro eliminado del equipo.');
        },
        onError: (err) => showToast(err.message || 'Error al eliminar', 'error'),
    });

    const handleInvite = (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        inviteMutation.mutate({ email: email.trim(), nombre: nombre.trim() || undefined });
    };

    const handleRemove = (member) => {
        if (!window.confirm(`¿Eliminar a ${member.nombre || member.email} del equipo?`)) return;
        removeMutation.mutate(member.id);
    };

    const copyEmail = (email, id) => {
        navigator.clipboard.writeText(email);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
                <div className="p-5 rounded-2xl bg-destructive/10">
                    <ShieldAlert className="w-12 h-12 text-destructive" />
                </div>
                <h2 className="text-2xl font-extrabold text-foreground">Acceso Denegado</h2>
                <p className="text-muted-foreground max-w-sm">
                    Solo los administradores pueden gestionar el equipo.
                </p>
            </div>
        );
    }

    const admins = members.filter(m => m.rol === 'admin');
    const vendedores = members.filter(m => m.rol === 'vendedor');

    return (
        <div className="page-container space-y-8">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl font-semibold text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${toast.type === 'error'
                        ? 'bg-destructive text-white'
                        : 'bg-emerald-500 text-white'
                    }`}>
                    {toast.type === 'error' ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <header className="page-header shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <UsersRound className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1>Mi Equipo</h1>
                        <p>Gestiona los colaboradores de tu empresa</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-primary/10 text-primary border border-primary/20">
                    <UsersRound className="w-4 h-4" />
                    {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Invite Form */}
                <div className="lg:col-span-1">
                    <div className="card p-6 space-y-6 sticky top-8">
                        <div>
                            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-primary" />
                                Invitar Vendedor
                            </h2>
                            <p className="text-xs text-muted-foreground mt-1">
                                El vendedor recibirá acceso con el email que ingreses.
                            </p>
                        </div>

                        <form onSubmit={handleInvite} className="space-y-4">
                            <div className="space-y-2">
                                <label className="form-label">Email del vendedor *</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="email"
                                        className="input pl-10"
                                        placeholder="vendedor@ejemplo.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="form-label">Nombre (opcional)</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        className="input pl-10"
                                        placeholder="Juan García"
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary w-full font-bold"
                                disabled={inviteMutation.isPending}
                            >
                                {inviteMutation.isPending ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Enviando...
                                    </span>
                                ) : (
                                    <>
                                        <UserPlus className="w-4 h-4" />
                                        Agregar al Equipo
                                    </>
                                )}
                            </button>
                        </form>

                        {/* How it works */}
                        <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 space-y-2">
                            <p className="text-xs font-bold text-primary uppercase tracking-wider">¿Cómo funciona?</p>
                            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                                <li>Ingresás el email del vendedor aquí.</li>
                                <li>El vendedor se registra en SmartDistro con ese email.</li>
                                <li>El sistema lo vincula automáticamente a tu empresa con rol <strong>Vendedor</strong>.</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* Members List */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Admins */}
                    {admins.length > 0 && (
                        <div className="card overflow-hidden">
                            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">Administradores</h3>
                                <span className="ml-auto badge badge-primary">{admins.length}</span>
                            </div>
                            <div className="divide-y divide-border">
                                {admins.map((member) => (
                                    <MemberRow
                                        key={member.id}
                                        member={member}
                                        currentUserId={user?.id}
                                        onRemove={handleRemove}
                                        onCopy={copyEmail}
                                        copiedId={copiedId}
                                        removePending={removeMutation.isPending}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Vendors */}
                    <div className="card overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">Vendedores</h3>
                            <span className="ml-auto badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>{vendedores.length}</span>
                        </div>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-sm font-medium">Cargando equipo...</span>
                            </div>
                        ) : vendedores.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                                <div className="p-4 rounded-2xl bg-muted">
                                    <UsersRound className="w-8 h-8 text-muted-foreground/40" />
                                </div>
                                <p className="font-semibold text-muted-foreground">Sin vendedores aún</p>
                                <p className="text-xs text-muted-foreground/60">Invitá el primer colaborador desde el formulario.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {vendedores.map((member) => (
                                    <MemberRow
                                        key={member.id}
                                        member={member}
                                        currentUserId={user?.id}
                                        onRemove={handleRemove}
                                        onCopy={copyEmail}
                                        copiedId={copiedId}
                                        removePending={removeMutation.isPending}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MemberRow({ member, currentUserId, onRemove, onCopy, copiedId, removePending }) {
    const isMe = member.id === currentUserId;
    const isVendedor = member.rol === 'vendedor';

    return (
        <div className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors group">
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${isVendedor
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-primary/10 text-primary'
                }`}>
                {(member.nombre || member.email).charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm truncate">
                        {member.nombre || '—'}
                        {isMe && <span className="text-[10px] font-bold text-primary ml-1">(tú)</span>}
                    </span>
                    <span className={`badge text-[10px] py-0.5 ${isVendedor
                            ? 'text-amber-600 bg-amber-500/10 border-amber-500/20'
                            : 'badge-primary'
                        }`}>
                        {isVendedor ? '🛒 Vendedor' : '⚡ Admin'}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground truncate">{member.email}</span>
                    <button
                        onClick={() => onCopy(member.email, member.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-primary"
                        title="Copiar email"
                    >
                        {copiedId === member.id
                            ? <Check className="w-3 h-3 text-emerald-500" />
                            : <Copy className="w-3 h-3" />
                        }
                    </button>
                </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${member.activado
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                    {member.activado
                        ? <><CheckCircle2 className="w-3 h-3" /> Activo</>
                        : <><Clock className="w-3 h-3" /> Pendiente</>
                    }
                </div>
            </div>

            {/* Actions */}
            {!isMe && isVendedor && (
                <button
                    onClick={() => onRemove(member)}
                    disabled={removePending}
                    className="opacity-0 group-hover:opacity-100 transition-all p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground disabled:opacity-50"
                    title="Eliminar del equipo"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
