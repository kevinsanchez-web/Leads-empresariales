import React from "react";

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("Error inesperado en la app:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 p-8 flex flex-col items-center text-center gap-4">
            <h1 className="text-lg font-extrabold text-slate-900">Algo salió mal</h1>
            <p className="text-sm text-slate-500">
              Ocurrió un error inesperado. Intenta recargar la página; si persiste, avisa al equipo técnico.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-4 py-3 rounded-2xl transition-colors cursor-pointer"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
