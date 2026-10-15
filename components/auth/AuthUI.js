"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "react-toastify";
import { AuthFrame } from "./AuthFrame";

export default function AuthUI() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationAllowed, setRegistrationAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkUserCount() {
      try {
        const { data, error } = await supabase.rpc("get_user_count");
        if (error) {
          const result = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true });
          if (active && !result.error && result.count === 0)
            setRegistrationAllowed(true);
        } else if (active && data === 0) setRegistrationAllowed(true);
      } catch {
        /* Keep registration closed when account state cannot be checked. */
      }
    }
    checkUserCount();
    return () => {
      active = false;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (mode === "register") {
        if (!registrationAllowed)
          throw new Error("El registro de nuevas cuentas está cerrado.");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: "Administrador" } },
        });
        if (error) throw error;
        toast.success("Registro exitoso. Revisa tu correo para confirmar.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/auth/reset-password",
        });
        if (error) throw error;
        toast.info(
          "Si el correo existe, recibirás un enlace para restablecer tu contraseña.",
        );
        setMode("login");
      }
    } catch (error) {
      toast.error(error.message || "No se pudo completar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame>
      <span className="eyebrow">BIENVENIDO A TU ESPACIO</span>
      <h1>
        {mode === "login"
          ? "Bienvenido de vuelta"
          : mode === "register"
            ? "Crea tu cuenta única"
            : "Recupera tu acceso"}
      </h1>
      <p className="muted">
        {mode === "recover"
          ? "Recibe un enlace para restablecer tu contraseña."
          : "Gestiona tu cartera con una visión clara de cada crédito."}
      </p>
      <form onSubmit={submit}>
        <label className="field-label">
          {mode === "recover" ? "Email de recuperación" : "Email"}
          <input
            type="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode !== "recover" && (
          <label className="field-label">
            Contraseña
            <input
              type="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              required
              minLength={mode === "register" ? 6 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
            />
          </label>
        )}
        <button
          className="button primary full"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Procesando..."
            : mode === "login"
              ? "Iniciar sesión"
              : mode === "register"
                ? "Registrarse"
                : "Enviar enlace"}
          <ArrowRight size={17} />
        </button>
      </form>
      <button
        className="button text full"
        disabled={loading}
        onClick={() => setMode(mode === "login" ? "recover" : "login")}
      >
        {mode !== "login" && <ArrowLeft size={16} />}
        {mode === "login"
          ? "¿Olvidaste tu contraseña?"
          : "Volver al inicio de sesión"}
      </button>
      {mode === "login" && registrationAllowed && (
        <button
          className="button text full"
          onClick={() => setMode("register")}
        >
          Crear cuenta administradora
        </button>
      )}
    </AuthFrame>
  );
}
