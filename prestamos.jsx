"use client";
import { useState, useEffect, useRef } from "react";
import { toast } from 'react-toastify';

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

const appLayoutStyles = {
  root: { display: "flex", height: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: C.bg, overflow: "hidden" },
  sidebar: { width: 240, background: C.sidebar, color: "white", display: "flex", flexDirection: "column", flexShrink: 0, transition: "0.25s" },
  logo: { padding: "24px 22px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid rgba(255,255,255,0.08)" },
  logoIcon: { fontSize: 32 },
  logoTitle: { fontWeight: 900, fontSize: 18 },
  logoSub: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  nav: { flex: 1, padding: "18px 12px", display: "flex", flexDirection: "column", gap: 4 },
  navBtn: {
    display: "flex", alignItems: "center", gap: 10, padding: "12px 15px",
    border: "none", background: "none", color: "rgba(255,255,255,0.6)",
    borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700,
    textAlign: "left", width: "100%", position: "relative",
  },
  navBtnActive: { background: "rgba(255,255,255,0.12)", color: "white", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" },
  badge: { background: C.accent, color: "white", borderRadius: 99, fontSize: 10, fontWeight: 900, padding: "2px 8px", position: "absolute", right: 10 },
  sidebarFooter: { padding: "18px 22px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "rgba(255,255,255,0.4)" },
  statsRow: { display: "flex", justifyContent: "space-between", marginBottom: 6 },
  main: { flex: 1, overflow: "auto", padding: "36px 48px" },
};

export default function App() {
  const [tab, setTab] = useState("dashboard");

  const [clientes, saveCliente, delCliente, loadedC, refreshClientes] = useSupabaseStore("clientes", {
    clienteId: "cliente_id", cc: "cc", nombre: "nombre", apellido: "apellido", telefono: "telefono", domicilio: "domicilio"
  });
  const [prestamos, savePrestamo, delPrestamo, loadedP, refreshPrestamos] = useSupabaseStore("prestamos", {
    prestamoId: "prestamo_id", cliente_id: "cliente_id", importe: "importe", modalidad: "modalidad",
    numeroCuotas: "numero_cuotas", importeCuota: "importe_cuota", totalAPagar: "total_a_pagar", fechaInicio: "fecha_inicio"
  });
  const [cuotas, saveCuota, delCuota, loadedCu, refreshCuotas] = useSupabaseStore("cuotas", {
    cuotaId: "cuota_id", prestamoId: "prestamo_id", clienteId: "cliente_id", numeroCuota: "numero_cuota",
    fechaVencimiento: "fecha_vencimiento", importeCuota: "importe_cuota", estado: "estado", fechaPago: "fecha_pago"
  });

  const [configs, saveConfig, , loadedK] = useSupabaseStore("config", { id: "id", value: "value", id_num: "id" });
  
  const capitalInicial = configs.find(x => x.id === "capital_inicial")?.value || 0;

  const handleSetCapital = async val => {
    await saveConfig({ id: "capital_inicial", value: val });
  };

  const handleEliminarPrestamo = async (idField, pid) => {
    if (!window.confirm("¿Confirma que desea eliminar este préstamo y todas sus cuotas?")) return;
    await supabase.from("cuotas").delete().eq("prestamo_id", pid);
    await delPrestamo(idField, pid);
    refreshCuotas();
    refreshPrestamos();
  };

  const prevAlertsCount = useRef(0);
  const alertasNuevas = cuotas.filter(c => getAlertType(c) !== null);

  useEffect(() => {
    if (alertasNuevas.length > prevAlertsCount.current) {
      toast.warn(`💰 ¡Alerta! Tienes cuotas pendientes.`, { position: "top-right", theme: "light" });
      playAlertSound();
    }
    prevAlertsCount.current = alertasNuevas.length;
  }, [alertasNuevas.length]);

  if (!loadedC || !loadedP || !loadedCu || !loadedK) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "monospace", color: C.muted, flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 32 }}>💰</div>
        <div>Cargando datos...</div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", icon: "📈", label: "Dashboard" },
    { id: "capital", icon: "💼", label: "Capital Propio" },
    { id: "clientes", icon: "👥", label: "Clientes" },
    { id: "nuevo", icon: "➕", label: "Nuevo Préstamo" },
    { id: "estados", icon: "📑", label: "Estado de Cuentas" },
  ];

  return (
    <div style={appLayoutStyles.root} className="app-root">
      <style>{appStyles}</style>
      
      <aside style={appLayoutStyles.sidebar} className="app-sidebar">
        <div style={appLayoutStyles.logo} className="app-logo">
          <span style={appLayoutStyles.logoIcon}>💰</span>
          <div>
            <div style={appLayoutStyles.logoTitle}>Préstamos Pro</div>
            <div style={appLayoutStyles.logoSub}>Gestión de créditos</div>
          </div>
        </div>
        
        <nav style={appLayoutStyles.nav} className="app-nav">
          {tabs.map(t => (
            <button key={t.id} style={{ ...appLayoutStyles.navBtn, ...(tab === t.id ? appLayoutStyles.navBtnActive : {}) }} onClick={() => setTab(t.id)} className="app-nav-btn">
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              <span>{t.label}</span>
              {t.id === "estados" && alertasNuevas.length > 0 && <span style={appLayoutStyles.badge}>{alertasNuevas.length}</span>}
            </button>
          ))}
        </nav>
        
        <div style={appLayoutStyles.sidebarFooter} className="app-sidebar-footer">
          <div style={appLayoutStyles.statsRow}><span>Clientes</span><strong style={{ color: "rgba(255,255,255,0.8)" }}>{clientes.length}</strong></div>
          <div style={appLayoutStyles.statsRow}><span>Préstamos</span><strong style={{ color: "rgba(255,255,255,0.8)" }}>{prestamos.length}</strong></div>
          <div style={appLayoutStyles.statsRow}><span>Cuotas</span><strong style={{ color: "rgba(255,255,255,0.8)" }}>{cuotas.length}</strong></div>
          
          <button 
            onClick={() => supabase.auth.signOut()} 
            style={{ 
              marginTop: 15, width: "100%", padding: "10px", 
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", 
              borderRadius: 8, color: "rgba(255,255,255,0.6)", cursor: "pointer", 
              fontSize: 12, fontWeight: 600, transition: "0.2s" 
            }}
            onMouseOver={(e) => e.target.style.background = "rgba(255, 50, 50, 0.1)"}
            onMouseOut={(e) => e.target.style.background = "rgba(255,255,255,0.05)"}
          >
            Cerrar Sesión 🚪
          </button>
        </div>
      </aside>
      
      <main style={appLayoutStyles.main} className="app-main">
        {tab === "dashboard" && <Dashboard clientes={clientes} prestamos={prestamos} cuotas={cuotas} alertas={alertasNuevas} />}
        {tab === "capital"   && <CapitalPropio prestamos={prestamos} cuotas={cuotas} capitalInicial={capitalInicial} setCapitalInicial={handleSetCapital} deletePrestamo={handleEliminarPrestamo} />}
        {tab === "clientes"  && <Clientes clientes={clientes} saveCliente={saveCliente} delCliente={delCliente} />}
        {tab === "nuevo"     && <NuevoPrestamo clientes={clientes} prestamos={prestamos} savePrestamo={savePrestamo} cuotas={cuotas} saveCuota={saveCuota} />}
        {tab === "estados"   && <Estados clientes={clientes} prestamos={prestamos} cuotas={cuotas} saveCuota={saveCuota} deletePrestamo={handleEliminarPrestamo} />}
      </main>
    </div>
  );
}
