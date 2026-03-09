import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    ArrowRight,
    Lock,
    Mail,
    Building2,
    User,
    CheckCircle2,
    ShieldCheck,
    Zap,
    BarChart3,
    Sun,
    Moon,
    Sparkles,
    Eye,
    EyeOff
} from 'lucide-react';

export default function Login() {
    const { login, register } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [empresa, setEmpresa] = useState('');
    const [nombre, setNombre] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (mode === 'login') {
                await login(email, password);
            } else {
                await register(empresa, nombre, email, password);
                setSuccessMsg('¡Distribuidora registrada con éxito! Por favor, espera a que un administrador apruebe tu cuenta para poder ingresar.');
                setMode('login');
                setPassword('');
            }
        } catch (err) {
            setError(err.message || 'Error en la autenticación. Revisa tus datos.');
        } finally {
            setLoading(false);
        }
    };

    const features = [
        { icon: ShieldCheck, title: 'Seguridad SaaS', desc: 'Multi-tenant aislado' },
        { icon: Zap, title: 'Venta Instantánea', desc: 'TPV optimizado' },
        { icon: BarChart3, title: 'Analytics Pro', desc: 'Métricas en tiempo real' },
    ];

    return (
        <div className="min-h-screen flex bg-background transition-colors duration-300">
            {/* ═══ Left Panel — Brand & Features ═══ */}
            <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-sky-600" />

                {/* Decorative elements */}
                <div className="absolute inset-0">
                    <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-sky-400/15 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-white/5 rounded-full blur-2xl" />

                    {/* Grid pattern overlay */}
                    <div className="absolute inset-0 opacity-[0.04]"
                        style={{
                            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                            backgroundSize: '30px 30px',
                        }}
                    />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-xl shadow-black/10">
                            <div className="text-primary font-black text-xs">ST</div>
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white tracking-tight">ST / DISTRO</h1>
                            <div className="flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-white/60" />
                                <span className="text-[10px] font-bold text-white/60 uppercase tracking-[0.2em]">ERP Pro</span>
                            </div>
                        </div>
                    </div>

                    {/* Hero Text */}
                    <div className="space-y-8 max-w-lg">
                        <div className="space-y-4">
                            <h2 className="text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
                                Tu distribución,{' '}
                                <span className="text-white/80">inteligente.</span>
                            </h2>
                            <p className="text-white/70 text-lg leading-relaxed max-w-md">
                                Plataforma integral para gestionar stock, ventas y cuentas corrientes con la potencia de la nube.
                            </p>
                        </div>

                        {/* Feature list */}
                        <div className="space-y-4">
                            {features.map((f, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.08] border border-white/[0.08] backdrop-blur-sm
                                               hover:bg-white/[0.12] transition-all duration-300 group"
                                >
                                    <div className="p-2.5 rounded-xl bg-white/10 group-hover:bg-white/20 transition-colors">
                                        <f.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">{f.title}</div>
                                        <div className="text-xs text-white/50">{f.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* ═══ Right Panel — Auth Form ═══ */}
            <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-6 sm:p-10 xl:p-16 bg-background relative overflow-y-auto">
                {/* Theme toggle (top right) */}
                <button
                    onClick={toggleTheme}
                    className="absolute top-6 right-6 p-2.5 rounded-xl border border-border bg-card hover:bg-muted transition-all shadow-sm group"
                    title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                >
                    {theme === 'dark'
                        ? <Sun className="w-4 h-4 text-amber-400 theme-toggle-icon" />
                        : <Moon className="w-4 h-4 text-primary theme-toggle-icon" />
                    }
                </button>

                <div className="max-w-[420px] w-full animate-in fade-in-up duration-500">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-2.5 mb-10">
                        <div className="w-9 h-9 bg-gradient-to-br from-primary to-sky-400 rounded-xl flex items-center justify-center shadow-glow">
                            <span className="text-white font-black text-xs">ST</span>
                        </div>
                        <span className="font-extrabold text-xl tracking-tight text-foreground">ST / DISTRO</span>
                    </div>

                    {/* Header */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-extrabold text-foreground tracking-tight mb-1.5">
                            {mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
                        </h2>
                        <p className="text-muted-foreground text-base">
                            {mode === 'login' ? 'Accede a tu panel de control central' : 'Comienza a gestionar tu distribuidora hoy'}
                        </p>
                    </div>

                    {/* Alert Messages */}
                    {error && (
                        <div className="toast toast-error mb-6 animate-in fade-in-down duration-300 flex items-start gap-3" role="alert">
                            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-red-500 text-xs font-bold">!</span>
                            </div>
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    {successMsg && (
                        <div className="toast toast-success mb-6 animate-in fade-in-down duration-300 flex items-center gap-3" role="alert">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                            <span className="font-medium">{successMsg}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {mode === 'register' && (
                            <div className="space-y-5 animate-in fade-in-down duration-300">
                                <div className="space-y-2">
                                    <label className="form-label" htmlFor="empresa">Nombre Comercial</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
                                        <input
                                            id="empresa"
                                            type="text"
                                            required
                                            className="input input-lg pl-12"
                                            placeholder="Distribuidora Mayorista"
                                            value={empresa}
                                            onChange={(e) => setEmpresa(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="form-label" htmlFor="nombre">Tu Nombre Completo</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
                                        <input
                                            id="nombre"
                                            type="text"
                                            required
                                            className="input input-lg pl-12"
                                            placeholder="Nombre y Apellido"
                                            value={nombre}
                                            onChange={(e) => setNombre(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="form-label" htmlFor="email">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    className="input input-lg pl-12"
                                    placeholder="correo@ejemplo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="form-label" htmlFor="password">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="input input-lg pl-12 pr-12"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-1">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary w-full h-12 text-base font-bold shadow-lg shadow-primary/25 group"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2.5">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Procesando...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Divider + Toggle */}
                        <div className="relative pt-6">
                            <div className="absolute left-0 right-0 top-6 border-t border-border" />
                            <div className="relative flex justify-center">
                                <span className="bg-background px-4 text-xs text-muted-foreground font-medium">
                                    {mode === 'login' ? '¿Aún no eres parte?' : '¿Ya tienes una cuenta?'}
                                </span>
                            </div>
                        </div>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode(mode === 'login' ? 'register' : 'login');
                                    setError('');
                                    setSuccessMsg('');
                                }}
                                className="text-sm font-bold text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-all"
                            >
                                {mode === 'login' ? 'Crear cuenta gratis' : 'Volver al ingreso'}
                            </button>
                        </div>
                    </form>

                    {/* Footer */}
                    <footer className="mt-12 text-center text-[11px] text-muted-foreground/40 font-medium">
                        &copy; 2026 ST / DISTRO &bull; Todos los derechos reservados
                    </footer>
                </div>
            </div>
        </div>
    );
}
