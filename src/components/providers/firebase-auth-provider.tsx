"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  firebaseAuth,
  isFirebaseConfigured,
  missingFirebaseEnvKeys,
} from "@/lib/firebase/client";
import { requestGoogleAccessToken } from "@/lib/google-identity";

type FirebaseAuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  missingKeys: string[];
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (name: string, email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | null>(null);

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(firebaseAuth?.currentUser ?? null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!firebaseAuth) return;

    const auth = firebaseAuth;
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!active) return;
      if (nextUser) {
        try { localStorage.setItem("acorde-last-session", nextUser.uid); } catch { /* Firebase aún puede usar su persistencia disponible. */ }
        window.dispatchEvent(new Event("acorde-auth-session"));
      }
      setUser(nextUser);
      setLoading(false);
    }, () => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<FirebaseAuthContextValue>(() => ({
    configured: isFirebaseConfigured,
    loading,
    user,
    missingKeys: missingFirebaseEnvKeys,
    async signIn(email, password) {
      const auth = requireAuth();
      return (await signInWithEmailAndPassword(auth, email.trim(), password)).user;
    },
    async signUp(name, email, password) {
      const auth = requireAuth();
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      try {
        await updateProfile(credential.user, { displayName: name.trim() });
      } catch {
        // La cuenta ya existe: un fallo al guardar el nombre no debe pedir crearla de nuevo.
      }
      return auth.currentUser ?? credential.user;
    },
    async signInWithGoogle() {
      const auth = requireAuth();
      // El token llega a esta página directamente: no depende del sessionStorage
      // del helper de Firebase, que Safari puede aislar en otra ventana.
      const accessToken = await requestGoogleAccessToken();
      return (await signInWithCredential(auth, GoogleAuthProvider.credential(null, accessToken))).user;
    },
    async resetPassword(email) {
      await sendPasswordResetEmail(requireAuth(), email.trim());
    },
    async logout() {
      await signOut(requireAuth());
      try { localStorage.removeItem("acorde-last-session"); } catch { /* Sin almacenamiento local. */ }
      window.dispatchEvent(new Event("acorde-auth-session"));
      setUser(null);
    },
  }), [loading, user]);

  return <FirebaseAuthContext.Provider value={value}>{children}</FirebaseAuthContext.Provider>;
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (!context) throw new Error("useFirebaseAuth debe usarse dentro de FirebaseAuthProvider.");
  return context;
}

export function getFirebaseAuthErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "El correo o la contraseña no son correctos.",
    "auth/invalid-email": "Escribe un correo electrónico válido.",
    "auth/email-already-in-use": "Ya existe una cuenta con este correo.",
    "auth/weak-password": "La contraseña es demasiado débil.",
    "auth/user-disabled": "Esta cuenta fue deshabilitada.",
    "auth/too-many-requests": "Hubo demasiados intentos. Espera un momento e inténtalo de nuevo.",
    "auth/network-request-failed": "No se pudo conectar. Revisa tu conexión a internet.",
    "auth/popup-closed-by-user": "Se cerró la ventana de Google antes de terminar.",
    "auth/cancelled-popup-request": "Ya hay una ventana de acceso abierta.",
    "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permítela e inténtalo otra vez.",
    "auth/account-exists-with-different-credential": "Ese correo ya usa otro método de acceso.",
    "auth/operation-not-allowed": "Este método de acceso aún no está habilitado en Firebase.",
    "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase Authentication.",
    "auth/invalid-continue-uri": "Revisa el dominio y la URI de redirección autorizados para Google en Firebase.",
    "auth/redirect-cancelled-by-user": "Se canceló el acceso con Google.",
    "auth/missing-initial-state": "Safari perdió el estado de acceso de Google. Reabre WorshipNotes e inténtalo de nuevo.",
  };
  return messages[code] ?? (error instanceof Error ? error.message : "No se pudo completar la autenticación.");
}

function requireAuth() {
  if (!firebaseAuth) throw new Error("Firebase no está configurado. Completa las variables de .env.local.");
  return firebaseAuth;
}
