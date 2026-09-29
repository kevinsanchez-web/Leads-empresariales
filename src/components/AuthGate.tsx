import React, { useEffect, useState } from "react";
import { GoogleAuthProvider, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, User } from "firebase/auth";
import { auth } from "../firebase";
import { isAllowedEmail } from "../allowedUsers";
import { DivergencyLogo } from "./DivergencyLogo";

function isIOSBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectSettled, setRedirectSettled] = useState(false);

  useEffect(() => {
    let active = true;
    getRedirectResult(auth)
      .catch(() => undefined)
      .finally(() => {
        if (active) setRedirectSettled(true);
      });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && !isAllowedEmail(firebaseUser.email)) {
        setDeniedEmail(firebaseUser.email);
        signOut(auth);
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

  const handleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    const provider = new GoogleAuthProvider();

    if (isIOSBrowser()) {
      try {
        await signInWithRedirect(auth, provider);
      } catch {
        setError("No se pudo iniciar sesión. Intenta de nuevo.");
        setSigningIn(false);
      }
      return;
    }

    try {
      await signInWithPopup(auth, provider);
      setSigningIn(false);
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user") {
        setSigningIn(false);
        return;
      }
      try {
        await signInWithRedirect(auth, provider);
      } catch {
        setError("No se pudo iniciar sesión. Intenta de nuevo.");
        setSigningIn(false);
      }
    }
  };

  if (user === undefined || !redirectSettled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="animate-pulse text-slate-400 text-sm font-semibold">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 p-8 flex flex-col items-center text-center gap-5">
          <DivergencyLogo />
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Leads Centralizados</h1>
            <p className="text-sm text-slate-500 mt-1">Acceso restringido al equipo de Divergency AI.</p>
          </div>

          {deniedEmail && (
            <div className="w-full text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              La cuenta <span className="font-bold">{deniedEmail}</span> no tiene acceso a esta aplicación.
            </div>
          )}
          {error && (
            <div className="w-full text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-sm px-4 py-3 rounded-2xl transition-colors cursor-pointer"
          >
            {signingIn ? "Conectando..." : "Iniciar sesión con Google"}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
