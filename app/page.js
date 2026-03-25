"use client";
import dynamic from 'next/dynamic'
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import AuthUI from "@/components/auth/AuthUI";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Usamos importación dinámica con ssr: false para evitar errores de hidratación
const App = dynamic(() => import('../prestamos.jsx'), { 
  ssr: false,
  loading: () => (
    <div style={{ 
      display: "flex", alignItems: "center", justifyContent: "center", 
      height: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "sans-serif" 
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💰</div>
        <p style={{ opacity: 0.6 }}>Iniciando sesión segura...</p>
      </div>
    </div>
  )
})

export default function Page() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ 
      display: "flex", alignItems: "center", justifyContent: "center", 
      height: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "sans-serif" 
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💰</div>
        <p style={{ opacity: 0.6 }}>Cargando...</p>
      </div>
    </div>
  );

  return (
    <>
      <ToastContainer pauseOnFocusLoss={false} autoClose={3000} />
      {session ? <App user={session.user} /> : <AuthUI />}
    </>
  );
}


