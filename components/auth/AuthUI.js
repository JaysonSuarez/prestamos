"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "react-toastify";

const glassStyle = {
  background: "rgba(255, 255, 255, 0.03)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "24px",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  padding: "40px",
  width: "100%",
  maxWidth: "420px",
  color: "#fff",
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
};

const inputStyle = {
  width: "100%",
  padding: "14px 18px",
  margin: "10px 0",
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "12px",
  color: "#fff",
  fontSize: "15px",
  outline: "none",
  transition: "all 0.2s",
};

const btnStyle = {
  width: "100%",
  padding: "15px",
  marginTop: "20px",
  background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
  border: "none",
  borderRadius: "12px",
  color: "#fff",
  fontWeight: "600",
  fontSize: "16px",
  cursor: "pointer",
  transition: "all 0.3s",
  boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
};

export default function AuthUI() {
  const [mode, setMode] = useState("login"); // login, register, recover
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegisterDisabled, setIsRegisterDisabled] = useState(false);

  useEffect(() => {
    checkUserCount();
  }, []);

  const checkUserCount = async () => {
    try {
      const { data, error } = await supabase.rpc("get_user_count");
      if (error) {
         // Fallback: search in profiles table
         const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
         if (count > 0) setIsRegisterDisabled(true);
      } else {
        if (data > 0) setIsRegisterDisabled(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "register") {
        if (isRegisterDisabled) throw new Error("Registro bloqueado: solo se permite un usuario.");
        const { error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: { full_name: "Administrador" }
            }
        });
        if (error) throw error;
        toast.success("¡Registro exitoso! Revisa tu email para confirmar.");
        setMode("login");
      } else if (mode === "recover") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/auth/reset-password',
        });
        if (error) throw error;
        toast.info("Si el correo existe, recibirás un enlace para restablecer tu contraseña.");
        setMode("login");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#080808 linear-gradient(135deg, #0f172a 0%, #020617 100%)",
      padding: "20px",
    }}>
      <div style={glassStyle}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "15px" }}>💰</div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: "#6366f1" }}>
            Préstamos Pro
          </h1>
          <p style={{ margin: "5px 0 0", fontSize: "14px", opacity: 0.5 }}>
            {mode === "login" ? "Bienvenido de vuelta" : 
             mode === "register" ? "Crea tu cuenta única" : 
             "Recupera tu acceso"}
          </p>
        </div>

        <form onSubmit={handleAuth}>
          {mode !== "recover" && (
            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", opacity: 0.6, textTransform: "uppercase", letterSpacing: "1px" }}>
                Email
              </label>
              <input 
                type="email" 
                placeholder="tu@email.com" 
                style={inputStyle} 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
          )}

          {mode === "recover" && (
            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", opacity: 0.6, textTransform: "uppercase", letterSpacing: "1px" }}>
                Email de recuperación
              </label>
              <input 
                type="email" 
                placeholder="tu@email.com" 
                style={inputStyle} 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
          )}

          {mode !== "recover" && (
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", opacity: 0.6, textTransform: "uppercase", letterSpacing: "1px" }}>
                Contraseña
              </label>
              <input 
                type="password" 
                placeholder="••••••••" 
                style={inputStyle} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>
          )}

          <button type="submit" style={btnStyle} disabled={loading}>
            {loading ? "Cargando..." : 
             mode === "login" ? "Iniciar Sesión" : 
             mode === "register" ? "Registrarse" : 
             "Enviar Enlace"}
          </button>
        </form>

        <div style={{ marginTop: "25px", fontSize: "14px", textAlign: "center", display: "flex", flexDirection: "column", gap: "12px" }}>
          {mode === "login" && (
            <>
              {!isRegisterDisabled ? (
                <span style={{ opacity: 0.7 }}>
                   ¿No tienes cuenta? {" "}
                   <button onClick={() => setMode("register")} style={{ background: "none", border: "none", color: "#818cf8", cursor: "pointer", padding: 0, fontWeight: "600" }}>Registrate aqui</button>
                </span>
              ) : (
                <span style={{ opacity: 0.4, fontSize: "12px" }}>
                   (Registro cerrado debido a configuración de usuario único)
                </span>
              )}
              <button 
                onClick={() => setMode("recover")} 
                style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: "13px", opacity: 0.8 }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </>
          )}

          {(mode === "register" || mode === "recover") && (
            <button 
                onClick={() => setMode("login")} 
                style={{ background: "none", border: "none", color: "#818cf8", cursor: "pointer", fontWeight: "600" }}
            >
              ← Volver al Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
