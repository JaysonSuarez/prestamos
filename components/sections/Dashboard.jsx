import { C, sty } from "../../styles/theme";
import { fmtCOP, calcDiasMora, calcDiasHasta, getAlertType, getEstado, calcMoraAcum } from "../../utils/helpers";
import { Card } from "../ui";

export function Dashboard({ clientes, prestamos, cuotas, alertas }) {
  // --- NEW LOGIC (KEEP): Filter only active loans (non-fully paid) ---
  const prestamosActivos = prestamos.filter(p => {
    const cuotasP = cuotas.filter(c => c.prestamoId === p.prestamoId);
    return cuotasP.some(c => c.estado !== "pagado");
  });

  const totalPrestadoActivo = prestamosActivos.reduce((s, p) => s + p.importe, 0);
  const totalACobrarActivo = prestamosActivos.reduce((s, p) => s + p.totalAPagar, 0);
  
  const cobrado = cuotas
    .filter(c => c.estado === "pagado")
    .reduce((s, c) => s + c.importeCuota, 0);
    
  const pendienteActivo = cuotas
    .filter(c => {
       const p = prestamosActivos.find(px => px.prestamoId === c.prestamoId);
       return p && c.estado !== "pagado";
    })
    .reduce((s, c) => s + c.importeCuota, 0);

  const cuotasMora = cuotas.filter(c => getEstado(c) === "mora");
  const totalMora = cuotasMora.reduce((s, c) => {
    const p = prestamos.find(px => px.prestamoId === c.prestamoId);
    return s + calcMoraAcum(c.importeCuota, p?.modalidad, c.fechaVencimiento, c.estado);
  }, 0);

  // --- OLD LOOK (REVERT): Stats icons and labels ---
  const stats = [
    { icon: "👥", label: "Clientes",          value: clientes.length,  raw: true,  color: C.blue },
    { icon: "💼", label: "Capital Prestado",  value: totalPrestadoActivo,          color: C.text },
    { icon: "📈", label: "Total a Cobrar",    value: totalACobrarActivo,           color: C.blue },
    { icon: "✅", label: "Cobrado",           value: cobrado,                      color: C.green },
    { icon: "⏳", label: "Por Cobrar",        value: pendienteActivo,              color: C.yellow },
    { icon: "🚨", label: "Interés Mora",      value: totalMora,                    color: C.red },
  ];

  const alertCfg = {
    proximo:       { icon: "🔔", label: "Vence pronto",     bg: C.yellowBg, color: C.yellow },
    hoy:           { icon: "⚠️", label: "Vence HOY",        bg: "#fef3c7",  color: "#92400e" },
    "mora-reciente": { icon: "🚨", label: "Mora reciente",  bg: C.redBg,    color: C.red },
    mora:          { icon: "🚨", label: "En mora",          bg: C.redBg,    color: C.red },
  };

  return (
    <div>
      <h1 style={sty.pageTitle}>Dashboard</h1>

      {/* Stats grid (Old Design) */}
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: s.color, marginTop: 4 }}>
              {s.raw ? s.value : fmtCOP(s.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Alertas (Old Design) */}
      {alertas.length > 0 && (
        <Card>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, color: C.text }}>
            🔔 Alertas activas
            <span style={{ background: C.red, color: "#fff", borderRadius: 99, fontSize: 11, padding: "2px 9px", marginLeft: 10 }}>{alertas.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alertas.map(c => {
              const tipo = getAlertType(c);
              const al = alertCfg[tipo] || alertCfg.mora;
              const dm = calcDiasMora(c.fechaVencimiento);
              const dh = calcDiasHasta(c.fechaVencimiento);
              return (
                <div key={c.cuotaId} style={{ display: "flex", gap: 12, alignItems: "center", background: al.bg, borderRadius: 8, padding: "10px 14px" }}>
                  <span style={{ fontSize: 20 }}>{al.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: al.color }}>{al.label}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {c.cuotaId} · Cuota #{c.numeroCuota} · {fmtCOP(c.importeCuota)} · Vence: {c.fechaVencimiento}
                      {dm > 0 && <strong style={{ color: C.red }}> · {dm} día{dm !== 1 ? "s" : ""} de mora</strong>}
                      {dh >= 0 && dh <= 3 && dm === 0 && ` · en ${dh} día${dh !== 1 ? "s" : ""}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {alertas.length === 0 && (
        <div style={{ textAlign: "center", color: C.muted, padding: "40px 0", fontSize: 14 }}>
          ✅ Sin alertas activas por ahora
        </div>
      )}
    </div>
  );
}
