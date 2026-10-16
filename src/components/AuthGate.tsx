import React, { useEffect, useState } from "react";
import { getRedirectResult, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase";
import { DivergencyLogo } from "./DivergencyLogo";
import {
  authErrorMessage,
  isEmailAllowed,
  logout,
  needsEmailVerification,
  refreshUser,
  registerWithEmail,
  resendVerification,
  signInWithEmail,
  signInWithGoogle,
} from "../controllers/authController";

type Mode = "login" | "register";

const INPUT_CLASS =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900";

const Screen: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
    <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 p-8 flex flex-col items-center text-center gap-5">
      <DivergencyLogo />
      {children}
    </div>
  </div>
);

const Alert: React.FC<{ tone?: "error" | "info"; children: React.ReactNode }> = ({ tone = "error", children }) => (
  <div
    className={`w-full text-xs font-semibold rounded-2xl px-4 py-3 border ${
      tone === "error" ? "text-red-700 bg-red-50 border-red-200" : "text-emerald-800 bg-emerald-50 border-emerald-200"
    }`}
  >
    {children}
  </div>
);

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [redirectSettled, setRedirectSettled] = useState(false);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let active = true;
    getRedirectResult(auth)
      .catch(() => undefined)
      .finally(() => {
        if (active) setRedirectSettled(true);
      });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && !isEmailAllowed(firebaseUser.email ?? "")) {
        setDeniedEmail(firebaseUser.email);
        logout();
        setUser(null);
        return;
      }
      setDeniedEmail(null);
      setUser(firebaseUser);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = () =>
    run(async () => {
      await signInWithGoogle();
    });

  const handleEmailSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Escribe tu correo y tu contraseña.");
      return;
    }
    if (mode === "register" && !isEmailAllowed(email)) {
      setError("Ese correo no tiene acceso a esta aplicación.");
      return;
    }
    run(async () => {
      if (mode === "register") {
        await registerWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    });
  };

  if (user === undefined || !redirectSettled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="animate-pulse text-slate-400 text-sm font-semibold">Cargando...</div>
      </div>
    );
  }

  // Cuenta de correo y contraseña sin verificar: no puede entrar a los datos todavía.
  if (user && needsEmailVerification(user)) {
    return (
      <Screen>
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Verifica tu correo</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enviamos un enlace de verificación a <span className="font-bold text-slate-800">{user.email}</span>. Ábrelo y luego vuelve aquí.
          </p>
        </div>
        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="info">{notice}</Alert>}
        <button
          onClick={() =>
            run(async () => {
              const refreshed = await refreshUser();
              if (refreshed && !needsEmailVerification(refreshed)) {
                // El objeto de usuario es el mismo, así que se fuerza el re-render con una copia de estado.
                setUser(null);
                setUser(refreshed);
              } else {
                setNotice("Aún no aparece verificado. Revisa tu correo (y la carpeta de spam).");
              }
            })
          }
          disabled={busy}
          className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-sm px-4 py-3 rounded-2xl transition-colors cursor-pointer"
        >
          Ya verifiqué mi correo
        </button>
        <button
          onClick={() =>
            run(async () => {
              await resendVerification();
              setNotice("Te enviamos el enlace de nuevo.");
            })
          }
          disabled={busy}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          Reenviar correo
        </button>
        <button onClick={() => logout()} className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer">
          Usar otra cuenta
        </button>
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Leads Centralizados</h1>
          <p className="text-sm text-slate-500 mt-1">Acceso restringido al equipo de Divergency AI.</p>
        </div>

        {deniedEmail && (
          <Alert>
            La cuenta <span className="font-bold">{deniedEmail}</span> no tiene acceso a esta aplicación.
          </Alert>
        )}
        {error && <Alert>{error}</Alert>}

        <form onSubmit={handleEmailSubmit} className="w-full flex flex-col gap-3 text-left">
          <input
            type="email"
            autoComplete="username"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
          />
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_CLASS}
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-sm px-4 py-3 rounded-2xl transition-colors cursor-pointer"
          >
            {busy ? "Conectando..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            {mode === "login" ? "¿No tienes cuenta? Crear cuenta" : "¿Ya tienes cuenta? Iniciar sesión"}
          </button>
        </form>

        <div className="w-full flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase">
          <span className="flex-1 h-px bg-slate-200" />
          <span>o</span>
          <span className="flex-1 h-px bg-slate-200" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-60 text-slate-800 font-bold text-sm px-4 py-3 rounded-2xl transition-colors cursor-pointer"
        >
          Continuar con Google
        </button>
      </Screen>
    );
  }

  return <>{children}</>;
};
