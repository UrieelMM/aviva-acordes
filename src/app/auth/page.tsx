import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth/auth-screen";

export const metadata: Metadata = {
  title: "Acceso",
  description: "Inicia sesión o crea tu cuenta para entrar al espacio compartido de WorshipNotes.",
};

export default function AuthPage() {
  return <AuthScreen />;
}
