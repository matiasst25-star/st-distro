import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, Mail, RefreshCw, LogOut } from 'lucide-react';

export default function PaginaEspera() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isPending = user?.tenantEstado === 'pendiente';

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md text-center space-y-6 animate-in fade-in duration-500">
                {/* Logo */}
                <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-sky-400 flex items-center justify-center text-white font-black text-2xl shadow-glow">
                        SD
                    </div>
                </div>

                {/* Icon */}
                <div className={`flex justify-center`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isPending ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                        <Clock className={`w-10 h-10 ${isPending ? 'text-amber-500' : 'text-red-500'}`} />
                    </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-extrabold text-foreground">
                        {isPending ? 'Cuenta pendiente de aprobación' : 'Cuenta suspendida'}
                    </h1>
                    <p className="text-muted-foreground leading-relaxed">
                        {isPending
                            ? 'Tu registro fue recibido. Nuestro equipo revisará tu cuenta y te dará acceso en breve.'
                            : 'Tu acceso ha vencido o fue suspendido por el administrador.'}
                    </p>
                </div>

                {/* Status Badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border ${isPending ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'}`}>
                    <span className={`w-2 h-2 rounded-full animate-pulse ${isPending ? 'bg-amber-500' : 'bg-red-500'}`} />
                    Estado: {isPending ? 'Pendiente' : 'Vencido / Bloqueado'}
                </div>

                {/* Support */}
                <div className="card p-5 text-left space-y-3">
                    <p className="text-sm font-semibold text-foreground">¿Necesitás ayuda?</p>
                    <a
                        href="mailto:matiasst25@gmail.com"
                        className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors group"
                    >
                        <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                            <Mail className="w-4 h-4" />
                        </div>
                        <span>matiasst25@gmail.com</span>
                    </a>
                    <p className="text-xs text-muted-foreground">
                        Contactá a soporte indicando el nombre de tu empresa y el correo con el que te registraste.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="btn btn-secondary flex-1 gap-2"
                    >
                        <RefreshCw className="w-4 h-4" /> Verificar estado
                    </button>
                    <button
                        onClick={handleLogout}
                        className="btn btn-secondary flex-1 gap-2"
                    >
                        <LogOut className="w-4 h-4" /> Cerrar sesión
                    </button>
                </div>
            </div>
        </div>
    );
}
