"use client";
import { useState, useEffect, useMemo } from "react";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- Libs & Hooks ---
import { supabase } from "./lib/supabase";
import { useSupabaseStore } from "./hooks/useSupabaseStore";

// --- Utils & Theme ---
import { C, sty, appStyles } from "./styles/theme";
import { getAlertType, playAlertSound } from "./utils/helpers";

// --- Components ---
import { Dashboard } from "./components/sections/Dashboard";
import { Clientes } from "./components/sections/Clientes";
import { NuevoPrestamo } from "./components/sections/NuevoPrestamo";
import { CapitalPropio } from "./components/sections/CapitalPropio";
import { Estados } from "./components/sections/Estados";

// ═══════════════════════════════════════════════════════
//  APP ENTRY POINT (ORCHESTRATOR)
// ═══════════════════════════════════════════════════════

export default function App() {
  const [tab, setTab] = useState("dashboard");

  // --- Persistent Storage via Custom Hook ---
  const [clientes, saveCliente, delCliente, loadedC, refreshClientes] = useSupabaseStore("clientes", {
    clienteId: "cliente_id", cc: "cc", nombre: "nombre", apellido: "apellido", telefono: "telefono"
  });
  const [prestamos, savePrestamo, delPrestamo, loadedP, refreshPrestamos] = useSupabaseStore("prestamos", {
    prestamoId: "prestamo_id", cliente_id: "cliente_id", importe: "importe", modalidad: "modalidad",
    numeroCuotas: "numero_cuotas", importeCuota: "importe_cuota", totalAPagar: "total_a_pagar", fechaInicio: "fecha_inicio"
  });
  const [cuotas, saveCuota, delCuota, loadedCu, refreshCuotas] = useSupabaseStore("cuotas", {
    cuotaId: "cuota_id", prestamoId: "prestamo_id", clienteId: "cliente_id", numeroCuota: "numero_cuota",
    fechaVencimiento: "fecha_vencimiento", importeCuota: "importe_cuota", estado: "estado", fechaPago: "fecha_pago"
  });

  // Capital Config
  const [capitalInicial, setCapitalInicial] = useState(0);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('config').select('*').eq('id', 1).single();
      if (data) setCapitalInicial(data.capital_inicial || 0);
    })();
  }, []);

  const handleSetCapital = async val => {
    setCapitalInicial(val);
    await supabase.from('config').upsert({ id: 1, capital_inicial: val });
  };

  // Logic for individual loan deletion (cascading)
  const handleEliminarPrestamo = async (idField, pid) => {
    // Delete in order to respect constraints if any (Supabase manual cascade)
    await supabase.from('cuotas').delete().eq('prestamo_id', pid);
    await delPrestamo(idField, pid);
    refreshCuotas();
    refreshPrestamos();
  };

  // Active Alerts
  const alertas = useMemo(() => cuotas.filter(c => getAlertType(c) === "hoy"), [cuotas]);

  useEffect(() => {
    if (alertas.length > 0) playAlertSound();
  }, [alertas.length]);

  if (!loadedC || !loadedP || !loadedCu) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f7f2", color: C.accent, fontWeight: 900, fontSize: 32 }}>
        CARGANDO SISTEMA PRO...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <style>{appStyles}</style>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Sidebar Navigation */}
      <aside style={{ width: 280, background: C.primary, color: "white", padding: "40px 20px", display: "flex", flexDirection: "column", gap: 30, position: "fixed", top: 0, bottom: 0 }}>
        <div style={{ padding: "0 20px", marginBottom: 20 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-1px" }}>PRÉSTAMOS<span style={{ color: C.accent }}>PRO</span></div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: 2, marginTop: 4 }}>SISTEMA DE CRÉDITOS V3</div>
        </div>
        
        <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { id: "dashboard", label: "Dashboard", icon: "📊" },
            { id: "capital", label: "Capital Propio", icon: "💎" },
            { id: "clientes", label: "Clientes", icon: "👥" },
            { id: "nuevo", label: "Nuevo Crédito", icon: "➕" },
            { id: "estados", label: "Estado de Cuentas", icon: "📑" }
          ].map(i => (
            <button key={i.id} onClick={() => setTab(i.id)} style={{
              ...sty.navBtn,
              background: tab === i.id ? "rgba(255,255,255,0.12)" : "transparent",
              color: tab === i.id ? "white" : "rgba(255,255,255,0.6)",
              display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderRadius: 12,
              border: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === i.id ? 800 : 600,
              boxShadow: tab === i.id ? "inset 0 0 0 1px rgba(255,255,255,0.1)" : "none",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            }}>
              <span style={{ fontSize: 20, filter: tab === i.id ? "none" : "grayscale(1) opacity(0.5)" }}>{i.icon}</span>
              {i.label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: "auto", padding: "20px", background: "rgba(255,255,255,0.05)", borderRadius: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>VERSIÓN ACTUAL</div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Release 1.0.4 - Premium</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ marginLeft: 280, flex: 1, padding: "50px 60px", background: C.bg }}>
        {tab === "dashboard" && <Dashboard clientes={clientes} prestamos={prestamos} cuotas={cuotas} alertas={alertas} />}
        {tab === "capital"   && <CapitalPropio prestamos={prestamos} cuotas={cuotas} capitalInicial={capitalInicial} setCapitalInicial={handleSetCapital} />}
        {tab === "clientes"  && <Clientes clientes={clientes} saveCliente={saveCliente} delCliente={delCliente} />}
        {tab === "nuevo"     && <NuevoPrestamo clientes={clientes} prestamos={prestamos} savePrestamo={savePrestamo} cuotas={cuotas} saveCuota={saveCuota} />}
        {tab === "estados"   && <Estados clientes={clientes} prestamos={prestamos} cuotas={cuotas} saveCuota={saveCuota} deletePrestamo={handleEliminarPrestamo} />}
      </main>
    </div>
  );
}
