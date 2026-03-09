import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-card rounded-2xl border border-destructive/20 shadow-sm m-4">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
                        <AlertTriangle className="w-8 h-8 text-destructive" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Algo salió mal</h2>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        Ha ocurrido un error inesperado al cargar esta sección. Puedes intentar recargar la página.
                    </p>

                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            this.setState({ hasError: false });
                            window.location.reload();
                        }}
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Recargar Página
                    </button>

                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-8 p-4 bg-muted text-left rounded-lg overflow-auto w-full max-w-2xl text-xs font-mono">
                            <p className="text-destructive font-bold mb-2">{this.state.error?.toString()}</p>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
