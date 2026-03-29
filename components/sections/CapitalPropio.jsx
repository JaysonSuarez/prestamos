import { useState } from "react";
import { C, sty } from "../../styles/theme";
import { fmtCOP, getEstado, calcMoraAcum } from "../../utils/helpers";
import { Card } from "../ui";

export function CapitalPropio({ prestamos, cuotas, capitalInicial, setCapitalInicial, deletePrestamo }) {
  const [editCap, setEditCap] = useState(false);
  const [tempCap, setTempCap] = useState(capitalInicial.toString());

  // --- BUSINESS LOGIC (REFINED): Filtering active metrics only ---
  const prestamosActivos = prestamos.filter(p => {
    const cuotasP = cuotas.filter(c => c.prestamoId === p.prestamoId);
    return cuotasP.some(c => c.estado !== "pagado");
  });

  const capitalInvertidoActivo = prestamosActivos.reduce((acc, p) => {
    const pagadoP = cuotas.filter(c => c.prestamoId === p.prestamoId && c.estado === "pagado")
                          .reduce((sum, c) => sum + c.importeCuota, 0);
    // Rough estimate of principal recovered: original_principal - (payment * principal_ratio)
    const ratio = p.totalAPagar > 0 ? (p.importe / p.totalAPagar) : 0;
    return acc + (p.importe - (pagadoP * ratio));
  }, 0);

  const interesesActivos = cuotas
    .filter(c => {
       const p = prestamosActivos.find(px => px.prestamoId === c.prestamoId);
       return p && c.estado !== "pagado";
    })
    .reduce((acc, c) => {
       const p = prestamosActivos.find(px => px.prestamoId === c.prestamoId);
       const mora = calcMoraAcum(p?.importe, p?.modalidad, c.fechaVencimiento, c.estado);
       const ratio = p.totalAPagar > 0 ? ((p.totalAPagar - p.importe) / p.totalAPagar) : 0;
       return acc + (c.importeCuota * ratio) + mora;
    }, 0);

  const capitalRecuperadoTotal = cuotas.filter(c => c.estado === "pagado").reduce((acc, c) => acc + c.importeCuota, 0);
  const totalOriginalPrestado = prestamos.reduce((a,b)=>a+b.importe,0);
  const dineroEnCaja = capitalInicial - totalOriginalPrestado + capitalRecuperadoTotal;
  
  const pendientesTotal = capitalInvertidoActivo + interesesActivos;
  const saldoNeto = (dineroEnCaja + pendientesTotal) - (capitalInicial || 0);
  
  const estaEnGanancia = saldoNeto >= 0;
  const porcentajeGanancia = capitalInicial > 0 ? (saldoNeto / capitalInicial) * 100 : 0;
  const liquidezBaja = dineroEnCaja < (capitalInicial * 0.15);

  // --- NEW LOGIC: Historical and Expected totals ---
  const gananciaEsperadaTotal = prestamos.reduce((acc, p) => acc + (p.totalAPagar - p.importe), 0);
  const historicoCartera = prestamos.reduce((acc, p) => acc + p.totalAPagar, 0);

  // --- VISUAL DESIGN (REVERT TO 8c249fe) ---
  const metrics = [
    {
      icon: "🏪", label: "MI CAPITAL TOTAL", value: capitalInicial || 0,
      color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd",
      tip: "Capital total destinado al negocio",
    },
    {
      icon: "💼", label: "CAPITAL INVERTIDO (OUT)", value: capitalInvertidoActivo,
      color: C.blue, bg: C.blueBg, border: "#93c5fd",
      tip: "Principal que está en manos de clientes",
    },
    {
      icon: "🏠", label: "DINERO EN CAJA", value: dineroEnCaja,
      color: C.green, bg: C.greenBg, border: C.greenBorder,
      tip: "Liquidez disponible para nuevos préstamos",
    },
    {
      icon: "📉", label: "INTERESES POR COBRAR", value: interesesActivos,
      color: "#d97706", bg: "#fffbeb", border: "#fcd34d",
      tip: "Ganancia proyectada activa",
    },
    {
      icon: "💰", label: "GANANCIA ESPERADA", value: gananciaEsperadaTotal,
      color: "#059669", bg: "#ecfdf5", border: "#6ee7b7",
      tip: "Total de intereses proyectados de todos los tiempos",
    },
    {
       icon: "📊", label: "HISTÓRICO CARTERA", value: historicoCartera,
       color: "#475569", bg: "#f1f5f9", border: "#cbd5e1",
       tip: "Suma bruta total (Capital + Interés) prestada",
    }
  ];

  return (
    <div>
      <div style={sty.pageHeader}>
        <h1 style={sty.pageTitle}>💼 Gestión de Capital</h1>
        <button style={sty.btnPrimary} onClick={() => { setTempCap(capitalInicial.toString()); setEditCap(true); }}>
          📝 Actualizar Capital
        </button>
      </div>

      {editCap && (
        <Card style={{ marginBottom: 24, borderLeft: `4px solid #7c3aed` }}>
          <h3 style={sty.sectionTitle}>💰 Capital para Préstamos</h3>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Ingresa el total de dinero propio para el negocio.</p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              style={{ ...sty.input, maxWidth: 280 }}
              type="number" value={tempCap}
              onChange={e => setTempCap(e.target.value)}
              placeholder="Ej: 5000000"
            />
            <button style={{ ...sty.btnPrimary, background: "#7c3aed" }} onClick={() => { setCapitalInicial(parseFloat(tempCap) || 0); setEditCap(false); }}>
              Guardar
            </button>
            <button style={sty.btnOutline} onClick={() => setEditCap(false)}>Cancelar</button>
          </div>
        </Card>
      )}

      {/* SALUD FINANCIERA (Old Design) */}
      <Card style={{ 
        marginBottom: 24, 
        background: estaEnGanancia ? "#f0fdf4" : "#fef2f2", 
        border: `2px solid ${estaEnGanancia ? "#bbf7d0" : "#fecaca"}`,
        display: "flex", alignItems: "center", gap: 20, padding: 20
      }}>
        <div style={{ fontSize: 48 }}>{estaEnGanancia ? "🚀" : "🛑"}</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: "0 0 6px", fontWeight: 900, fontSize: 18, color: estaEnGanancia ? "#15803d" : "#b91c1c" }}>
            {estaEnGanancia ? (saldoNeto === 0 ? "PUNTO DE EQUILIBRIO" : `ESTÁS EN GANANCIA: +${fmtCOP(saldoNeto)}`) : `ESTÁS EN PÉRDIDA: ${fmtCOP(saldoNeto)}`}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: estaEnGanancia ? "#166534" : "#991b1b", fontWeight: 700 }}>
             Rentabilidad actual: {porcentajeGanancia.toFixed(1)}%. {estaEnGanancia ? "Tu dinero está creciendo." : "Cuidado, estás por debajo de tu inversión inicial."}
          </p>
          <div style={{ 
            marginTop: 12, padding: "8px 12px", borderRadius: 8, 
            background: liquidezBaja ? "#fef3c7" : "#dcfce7",
            color: liquidezBaja ? "#92400e" : "#166534",
            fontSize: 12.5, fontWeight: 800, display: "inline-block",
            border: `1.5px solid ${liquidezBaja ? "#fcd34d" : "#86efac"}`
          }}>
            {liquidezBaja ? "⚠️ ALERTA: Liquidez baja. No prestes más hasta recuperar capital." : "✅ CAJA SANA: Tienes liquidez suficiente para operar."}
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16, marginBottom: 32 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ background: m.bg, border: `1.5px solid ${m.border}`, borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{m.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: m.color, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: m.color }}>{fmtCOP(m.value)}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{m.tip}</div>
          </div>
        ))}
      </div>
      
      {/* Resumen por Préstamo */}
      <Card style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px", fontWeight: 800, fontSize: 15, color: C.text, borderBottom: `1px solid ${C.border}` }}>
          📋 Resumen por Préstamo
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={sty.table}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Préstamo", "Cliente", "Capital Prestado", "Interés", "Cobrado", "Estado"].map(h => (
                  <th key={h} style={sty.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prestamos.map(p => {
                const cuotasP = cuotas.filter(c => c.prestamoId === p.prestamoId);
                const cobradoP = cuotasP.filter(c => c.estado === "pagado").reduce((s, c) => s + c.importeCuota, 0);
                const completo = cuotasP.every(c => c.estado === "pagado");
                return (
                  <tr key={p.prestamoId} style={{ borderTop: `1px solid ${C.border}`, background: completo ? C.greenBg : "white" }}>
                    <td style={sty.td}><span style={{ fontFamily: "monospace", fontWeight: 800, color: C.blue, fontSize: 12 }}>{p.prestamoId}</span></td>
                    <td style={sty.td}><span style={{ fontSize: 12 }}>{p.cliente_id}</span></td>
                    <td style={{ ...sty.td, fontWeight: 700 }}>{fmtCOP(p.importe)}</td>
                    <td style={{ ...sty.td, color: C.blue }}>{fmtCOP(p.totalAPagar - p.importe)}</td>
                    <td style={{ ...sty.td, color: C.green }}>{fmtCOP(cobradoP)}</td>
                    <td style={sty.td}>
                       {completo ? "✅ Saldado" : "⏳ Activo"}
                       <button style={{ ...sty.btnSm, color: C.red, marginLeft: 10 }} onClick={() => deletePrestamo("prestamoId", p.prestamoId)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
