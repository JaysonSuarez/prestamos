import { useState } from "react";
import { C, sty } from "../../styles/theme";
import { fmtCOP } from "../../utils/helpers";
import { Card, Inp } from "../ui";

export function CapitalPropio({ prestamos, cuotas, capitalInicial, setCapitalInicial }) {
  const [editCap, setEditCap] = useState(false);
  const [tempCap, setTempCap] = useState(capitalInicial.toString());

  const prestamosActivos = prestamos.filter(p => {
    const cuotasP = cuotas.filter(c => c.prestamoId === p.prestamoId);
    return cuotasP.some(c => c.estado !== "pagado");
  });

  const capitalInvertidoActivo = prestamosActivos.reduce((acc, p) => {
    const pagadoP = cuotas.filter(c => c.prestamoId === p.prestamoId && c.estado === "pagado")
                          .reduce((sum, c) => sum + c.importeCuota, 0);
    // Rough estimate of principal recovered: if we assume interest is 10% total, 
    // principal part of payment is approx original_principal / total_to_pay?
    // Actually, user's definition: "Monto original - recuperado". 
    // Let's assume all payments subtract from total first? No, let's just use the current formula for "Dinero Afuera" but label it "Capital Invertido".
    return acc + (p.importe - (pagadoP * (p.importe / p.totalAPagar)));
  }, 0);

  const interesesActivos = prestamosActivos.reduce((acc, p) => {
    const pagadoP = cuotas.filter(c => c.prestamoId === p.prestamoId && c.estado === "pagado")
                          .reduce((sum, c) => sum + c.importeCuota, 0);
    const intTotal = p.totalAPagar - p.importe;
    return acc + (intTotal - (pagadoP * (intTotal / p.totalAPagar)));
  }, 0);

  const capitalRecuperadoTotal = cuotas.filter(c => c.estado === "pagado").reduce((acc, c) => acc + c.importeCuota, 0);
  const dineroEnCaja = capitalInicial - prestamos.reduce((a,b)=>a+b.importe,0) + capitalRecuperadoTotal;
  
  const saldoNeto = (dineroEnCaja + capitalInvertidoActivo + interesesActivos) - capitalInicial;
  
  const estaEnGanancia = saldoNeto >= 0;
  const porcentajeGanancia = capitalInicial > 0 ? (saldoNeto / capitalInicial) * 100 : 0;
  const liquidezBaja = dineroEnCaja < (capitalInicial * 0.15);

  const StatBox = ({ title, value, sub, color, border }) => (
    <Card style={{ borderLeft: `5px solid ${border}`, background: "white" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: color }}>{value}</div>
      <div style={{ fontSize: 12, color: C.secondary, marginTop: 4, fontWeight: 600 }}>{sub}</div>
    </Card>
  );

  return (
    <div>
      <h1 style={sty.pageTitle}>Gestión de Capital Propio</h1>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 32 }}>
        <StatBox title="Capital Inicial (Inversión)" value={fmtCOP(capitalInicial)} sub="Base de inversión" color={C.primary} border={C.secondary} />
        <StatBox title="Dinero en Caja" value={fmtCOP(dineroEnCaja)} sub="Liquidez disponible" color={dineroEnCaja < 0 ? C.red : C.green} border={dineroEnCaja < 0 ? C.red : C.green} />
        <StatBox title="Capital Invertido (Fuera)" value={fmtCOP(capitalInvertidoActivo)} sub="Principal por recuperar" color={C.accent} border={C.accent} />
        <StatBox title="Intereses por Cobrar" value={fmtCOP(interesesActivos)} sub="Ganancia proyectada activa" color={C.secondary} border={C.secondary} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {!editCap ? (
          <Card compact style={{ height: "fit-content" }}>
            <h3 style={{ margin: "0 0 16px", fontWeight: 800 }}>⚙️ Ajustar Capital Inicial</h3>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>Cambia tu capital base si has inyectado más dinero al negocio.</p>
            <button style={sty.btnOutline} onClick={() => { setTempCap(capitalInicial.toString()); setEditCap(true); }}>Modificar Capital</button>
          </Card>
        ) : (
          <Card compact style={{ height: "fit-content", border: `2px solid ${C.accent}` }}>
            <h3 style={{ margin: "0 0 16px", fontWeight: 800 }}>Configurar Capital Base</h3>
            <div style={{ display: "flex", gap: 12 }}>
              <Inp 
                style={{ ...sty.input, marginBottom: 0 }} 
                type="number" 
                value={tempCap} 
                onChange={e => setTempCap(e.target.value)} 
                placeholder="Ej: 5000000"
              />
              <button style={{ ...sty.btnPrimary, background: "#7c3aed" }} onClick={() => { setCapitalInicial(parseFloat(tempCap) || 0); setEditCap(false); }}>
                Guardar
              </button>
              <button style={sty.btnOutline} onClick={() => setEditCap(false)}>Cancelar</button>
            </div>
            {tempCap && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{fmtCOP(parseFloat(tempCap) || 0)}</div>}
          </Card>
        )}

        <Card style={{ 
          background: estaEnGanancia ? "#f0fdf4" : "#fef2f2", 
          border: `2px solid ${estaEnGanancia ? "#bbf7d0" : "#fecaca"}`,
          display: "flex", alignItems: "center", gap: 20,
          padding: 20
        }}>
          <div style={{ fontSize: 48 }}>{estaEnGanancia ? "🚀" : "🛑"}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 6px", fontWeight: 900, fontSize: 18, color: estaEnGanancia ? "#15803d" : "#b91c1c" }}>
              {estaEnGanancia ? (saldoNeto === 0 ? "PUNTO DE EQUILIBRIO" : `ESTÁS EN GANANCIA: +${fmtCOP(saldoNeto)}`) : `ESTÁS EN PÉRDIDA: ${fmtCOP(saldoNeto)}`}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: estaEnGanancia ? "#166534" : "#991b1b", fontWeight: 700 }}>
              {estaEnGanancia 
                ? `Tu margen de rentabilidad es del ${porcentajeGanancia.toFixed(1)}%. Tu capital está creciendo.`
                : `Has perdido un ${Math.abs(porcentajeGanancia).toFixed(1)}% del capital inicial. Revisa tus cobranzas.`}
            </p>
            
            <div style={{ 
              marginTop: 12, 
              padding: "8px 12px", 
              borderRadius: 8, 
              background: liquidezBaja ? "#fef3c7" : "#dcfce7",
              color: liquidezBaja ? "#92400e" : "#166534",
              fontSize: 12.5,
              fontWeight: 800,
              display: "inline-block",
              border: `1.5px solid ${liquidezBaja ? "#fcd34d" : "#86efac"}`
            }}>
              {liquidezBaja 
                ? "⚠️ LIQUIDEZ BAJA: Tienes poco dinero en caja, espera a cobrar antes de nuevos préstamos." 
                : "✅ BUENA LIQUIDEZ: Tienes capital suficiente para invertir en nuevos préstamos."}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
