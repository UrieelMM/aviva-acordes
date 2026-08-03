"use client";

import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
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
    let unsubscribe: () => void = () => undefined;

    void setPersistence(auth, browserLocalPersistence)
      .catch(() => undefined)
      .finally(() => {
        if (!active) return;
        unsubscribe = onAuthStateChanged(auth, (nextUser) => {
          setUser(nextUser);
          setLoading(false);
        });
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
      await updateProfile(credential.user, { displayName: name.trim() });
      await credential.user.reload();
      return auth.currentUser ?? credential.user;
    },
    async signInWithGoogle() {
      const auth = requireAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      return (await signInWithPopup(auth, provider)).user;
    },
    async resetPassword(email) {
      await sendPasswordResetEmail(requireAuth(), email.trim());
    },
    async logout() {
      await signOut(requireAuth());
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
  };
  return messages[code] ?? (error instanceof Error ? error.message : "No se pudo completar la autenticación.");
}

function requireAuth() {
  if (!firebaseAuth) throw new Error("Firebase no está configurado. Completa las variables de .env.local.");
  return firebaseAuth;
}
