"use client";
import dynamic from 'next/dynamic'
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import AuthUI from "@/components/auth/AuthUI";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function LoadingScreen() {
  return <div className="app-loading" role="status"><span className="loading-spinner"/><p>Cargando tu espacio de trabajo...</p></div>;
}

// Usamos importación dinámica con ssr: false para evitar errores de hidratación
const App = dynamic(() => import('../prestamos.jsx'), { 
  ssr: false,
  loading: LoadingScreen
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

  if (loading) return <LoadingScreen/>;

  return (
    <>
      <ToastContainer pauseOnFocusLoss={false} autoClose={3000} />
      {session ? <App user={session.user} /> : <AuthUI />}
    </>
  );
}


