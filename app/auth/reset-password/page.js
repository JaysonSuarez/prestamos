"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const glassStyle = {
  background: "rgba(255, 255, 255, 0.03)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "24px",
  padding: "40px",
  width: "100%",
  maxWidth: "420px",
  color: "#fff",
  fontFamily: "'Inter', sans-serif",
};

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("¡Contraseña actualizada! Serás redirigido...");
      setTimeout(() => window.location.href = "/", 2000);
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
    }}>
      <ToastContainer />
      <div style={glassStyle}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "15px" }}>🔒</div>
          <h2 style={{ fontSize: "24px", fontWeight: "800" }}>Nueva Contraseña</h2>
          <p style={{ opacity: 0.6 }}>Ingresa tu nueva clave de acceso</p>
        </div>
        <form onSubmit={handleUpdate}>
          <input 
            type="password" 
            placeholder="Nueva contraseña (mínimo 6 chars)" 
            style={{
              width: "100%", padding: "14px", background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px",
              color: "#fff", marginBottom: "20px"
            }}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button 
            type="submit" 
            style={{
              width: "100%", padding: "15px", borderRadius: "12px",
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              color: "white", border: "none", fontWeight: "bold", cursor: "pointer"
            }}
            disabled={loading}
          >
            {loading ? "Actualizando..." : "Actualizar Contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
