import { C, sty } from "../../styles/theme";
import { fmtCOP } from "../../utils/helpers";
import { Card, StatusBadge } from "../ui";

export function Dashboard({ clientes, prestamos, cuotas, alertas }) {
  const prestamosActivos = prestamos.filter(p => {
    const cuotasP = cuotas.filter(c => c.prestamoId === p.prestamoId);
    return cuotasP.some(c => c.estado !== "pagado");
  });

  const totalCap = prestamosActivos.reduce((a, b) => a + b.importe, 0);
  const totalInt = prestamosActivos.reduce((a, b) => a + (b.totalAPagar - b.importe), 0);
  const recupCap = cuotas.filter(c => c.estado === "pagado").reduce((a, b) => a + b.importeCuota, 0);
  const m = cuotas.filter(c => c.estado === "mora");

  const Stat = ({ label, val, color }) => (
    <Card compact style={{ borderLeft: `6px solid ${color}`, minWidth: 220 }}>
      <div style={{ color: C.muted, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: C.primary }}>{val}</div>
    </Card>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <header>
        <h1 style={sty.pageTitle}>Dashboard Operativo</h1>
        <p style={{ color: C.muted, marginTop: -20, fontWeight: 500 }}>Control de cartera activa y alertas de cobro</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
        <Stat label="Capital Prestado (Activo)" val={fmtCOP(totalCap)} color={C.accent} />
        <Stat label="Intereses por Cobrar" val={fmtCOP(totalInt)} color={C.secondary} />
        <Stat label="Total Cartera Activa" val={fmtCOP(totalCap + totalInt)} color={C.primary} />
        <Stat label="Capital Recuperado" val={fmtCOP(recupCap)} color={C.green} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 30 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center" }}>
            <h3 style={{ margin: 0, fontWeight: 800 }}>⚡ Recordatorios de Hoy</h3>
            <span style={{ fontSize: 12, background: C.bg, padding: "5px 12px", borderRadius: 20, fontWeight: 700 }}>{alertas.length} cuotas</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {alertas.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: C.muted, fontWeight: 600 }}>No hay cobros pendientes para hoy</div>
            ) : alertas.map(a => {
              const cli = clientes.find(c => c.clienteId === a.clienteId);
              return (
                <div key={a.cuotaId} style={{ display: "flex", justifyContent: "space-between", padding: 16, background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{cli?.nombre} {cli?.apellido}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>Ref: {a.cuotaId} · Cuota {a.numeroCuota}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 900, fontSize: 15, color: C.primary }}>{fmtCOP(a.importeCuota)}</div>
                    <StatusBadge val="Hoy" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center" }}>
            <h3 style={{ margin: 0, fontWeight: 800 }}>🚨 Carteras en Mora</h3>
            <span style={{ fontSize: 12, background: C.redBg, color: C.red, padding: "5px 12px", borderRadius: 20, fontWeight: 700 }}>{m.length} cuotas</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {m.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: C.muted, fontWeight: 600 }}>Cartera 100% al día</div>
            ) : m.slice(0, 5).map(a => {
              const cli = clientes.find(c => c.clienteId === a.clienteId);
              return (
                <div key={a.cuotaId} style={{ display: "flex", justifyContent: "space-between", padding: 16, border: `1px solid ${C.redBorder}`, background: "#fff5f5", borderRadius: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: C.red }}>{cli?.nombre} {cli?.surname}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>Venció: {a.fechaVencimiento}</div>
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 900, color: C.red }}>{fmtCOP(a.importeCuota)}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
