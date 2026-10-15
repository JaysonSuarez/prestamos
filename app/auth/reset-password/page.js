"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast, ToastContainer } from "react-toastify";
import { AuthFrame } from "@/components/auth/AuthFrame";
import "react-toastify/dist/ReactToastify.css";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Contraseña actualizada. Volviendo al inicio...");
      setTimeout(() => window.location.assign("/"), 1500);
    } catch (error) {
      toast.error(error.message || "No se pudo actualizar la contraseña.");
      setLoading(false);
    }
  }
  return (
    <>
      <ToastContainer />
      <AuthFrame>
        <span className="eyebrow">UNA NUEVA CLAVE</span>
        <h1>Nueva contraseña</h1>
        <p className="muted">
          Elige una contraseña de al menos seis caracteres para volver a tu
          espacio.
        </p>
        <form onSubmit={submit}>
          <label className="field-label">
            Nueva contraseña
            <input
              type="password"
              minLength={6}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="button primary full"
          >
            {loading ? "Actualizando..." : "Actualizar contraseña"}
            <ArrowRight size={17} />
          </button>
        </form>
      </AuthFrame>
    </>
  );
}
