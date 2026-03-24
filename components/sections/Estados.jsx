import { useState } from "react";
import { C, sty } from "../../styles/theme";
import { fmtCOP, fmtDate, calcMoraAcum, getEstado, todayStr } from "../../utils/helpers";
import { exportToPDF } from "../../services/pdfExport";
import { Card, StatusBadge } from "../ui";

export function Estados({ clientes, prestamos, cuotas, saveCuota, deletePrestamo }) {
  const [filtroEstado, setFiltroEstado]     = useState("pendiente");
  const [filtroCliente, setFiltroCliente]   = useState("");
  const [filtroPrestamo, setFiltroPrestamo] = useState("");
  const [confirmId, setConfirmId]           = useState(null);

  const displayItems = [];

  if (filtroEstado === "pagado") {
    prestamos.forEach(p => {
      const cuotasP = cuotas.filter(x => x.prestamoId === p.prestamoId);
      const cli = clientes.find(c => c.clienteId === p.cliente_id);
      const estaSaldado = cuotasP.length > 0 && cuotasP.every(x => x.estado === "pagado");
      
      if (estaSaldado) {
        if (filtroCliente && p.cliente_id !== filtroCliente) return;
        if (filtroPrestamo && p.prestamoId !== filtroPrestamo) return;
        
        displayItems.push({
          type: "prestamo",
          prestamoId: p.prestamoId,
          cliente: `${cli?.nombre} ${cli?.apellido}`,
          detalle: `CRÉDITO LIQUIDADO (${p.numeroCuotas} cuotas)`,
          vencimiento: "FIN",
          importe: p.totalAPagar,
          estado: "pagado",
          raw: p
        });
      }
    });
  } else {
    cuotas.forEach(c => {
      const e = getEstado(c);
      const cuotasPrestamo = cuotas.filter(x => x.prestamoId === c.prestamoId);
      const estaSaldado = cuotasPrestamo.every(x => x.estado === "pagado");
      
      if (estaSaldado) return;
      if (filtroEstado !== "todos" && e !== filtroEstado) return;
      if (filtroCliente && c.clienteId !== filtroCliente) return;
      if (filtroPrestamo && c.prestamoId !== filtroPrestamo) return;

      const cli = clientes.find(x => x.clienteId === c.clienteId);
      const p = prestamos.find(x => x.prestamoId === c.prestamoId);
      
      const esSiguiente = cuotasPrestamo
        .filter(x => x.estado === "pendiente")
        .sort((a,b) => a.numeroCuota - b.numeroCuota)[0]?.cuotaId === c.cuotaId;

      if (filtroEstado === "todos" && (e === "pendiente" && !esSiguiente)) return;

      displayItems.push({
        type: "cuota",
        cuotaId: c.cuotaId,
        cliente: `${cli?.nombre} ${cli?.apellido}`,
        detalle: `CUOTA ${c.numeroCuota} de ${p?.numeroCuotas}`,
        vencimiento: c.fechaVencimiento,
        importe: c.importeCuota,
        estado: e,
        rawCuota: c,
        rawPrestamo: p,
        rawCliente: cli
      });
    });
  }

  displayItems.sort((a, b) => {
    if (a.estado === "pagado" && b.estado !== "pagado") return 1;
    if (b.estado === "pagado" && a.estado !== "pagado") return -1;
    if (a.estado === "mora" && b.estado !== "mora") return -1;
    if (b.estado === "mora" && a.estado !== "mora") return 1;
    return a.vencimiento.localeCompare(b.vencimiento);
  });

  const registrarPago = async id => {
    const c = cuotas.find(x => x.cuotaId === id);
    if (!c) return;
    await saveCuota({ ...c, estado: "pagado", fechaPago: todayStr() });
    setConfirmId(null);
  };

  const handleEliminar = (pid) => {
    if (window.confirm(`¿Estás seguro de eliminar el préstamo ${pid}? Esta acción no se puede deshacer.`)) {
      deletePrestamo("prestamoId", pid);
    }
  };

  return (
    <div>
      <h1 style={sty.pageTitle}>Estado de Cuentas</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        {["todos", "pendiente", "mora", "pagado"].map(e => (
          <button key={e} style={{ 
            ...sty.btnOutline, 
            background: filtroEstado === e ? C.primary : "transparent",
            color: filtroEstado === e ? "white" : C.primary,
            textTransform: "capitalize",
          }} onClick={() => setFiltroEstado(e)}>
            {e === "todos" ? "Todos" : e === "mora" ? "🚨 Mora" : e === "pendiente" ? "⏳ Pendiente" : "✓ Pagado"}
          </button>
        ))}
        <select style={{ ...sty.input, flex: 1, minWidth: 220 }} value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
          <option value="">— Todos los clientes —</option>
          {clientes.map(c => <option key={c.clienteId} value={c.clienteId}>{c.clienteId} — {c.nombre} {c.apellido}</option>)}
        </select>
        <select style={{ ...sty.input, flex: 1, minWidth: 180 }} value={filtroPrestamo} onChange={e => setFiltroPrestamo(e.target.value)}>
          <option value="">— Todos los préstamos —</option>
          {prestamos.map(p => <option key={p.prestamoId} value={p.prestamoId}>{p.prestamoId}</option>)}
        </select>
      </div>

      <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{displayItems.length} cuota(s) · ordenadas por mora → fecha</div>

      {confirmId && (() => {
        const c = cuotas.find(x => x.cuotaId === confirmId);
        const p = prestamos.find(x => x.prestamoId === c?.prestamoId);
        const mora = calcMoraAcum(c.importeCuota, p?.modalidad, c.fechaVencimiento, c.estado);
        const total = c.importeCuota + mora;
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
            <div style={{ background: "white", borderRadius: 16, padding: 32, maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <div style={{ fontSize: 40, textAlign: "center", marginBottom: 16 }}>💰</div>
              <h3 style={{ textAlign: "center", margin: "0 0 20px", fontWeight: 800 }}>Confirmar pago</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                <div style={sty.rowInfo}><span>Cuota</span><strong>{c.numeroCuota}</strong></div>
                <div style={sty.rowInfo}><span>Importe cuota</span><strong>{fmtCOP(c.importeCuota)}</strong></div>
                {mora > 0 && <div style={{ ...sty.rowInfo, color: C.red }}><span>Mora acumulada</span><strong style={{ color: C.red }}>+ {fmtCOP(mora)}</strong></div>}
                <div style={{ ...sty.rowInfo, borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
                  <span style={{ fontWeight: 800 }}>TOTAL A COBRAR</span>
                  <strong style={{ fontSize: 20, color: C.green }}>{fmtCOP(total)}</strong>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button style={{ ...sty.btnPrimary, flex: 1 }} onClick={() => registrarPago(confirmId)}>Sí, pagado</button>
                <button style={{ ...sty.btnOutline, flex: 1 }} onClick={() => setConfirmId(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {displayItems.length === 0 ? <p style={{ textAlign: "center", padding: 60, color: C.muted, fontWeight: 600 }}>No hay cobros que mostrar con este filtro.</p> : displayItems.map(item => (
          <Card key={item.cuotaId || item.prestamoId} compact style={{ padding: "16px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  <strong style={{ fontSize: 16 }}>{item.cliente}</strong>
                  <StatusBadge val={item.estado} />
                </div>
                <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{item.detalle}</div>
              </div>

              <div style={{ textAlign: "center", minWidth: 120 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>Vencimiento</div>
                <div style={{ fontWeight: 800, color: item.estado === "mora" ? C.red : C.primary }}>{item.vencimiento === "FIN" ? "PAGADO" : fmtDate(item.vencimiento)}</div>
              </div>

              <div style={{ textAlign: "right", minWidth: 140 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>Importe</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: item.estado === "mora" ? C.red : C.primary }}>{fmtCOP(item.importe)}</div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                {item.type === "cuota" && item.estado !== "pagado" && (
                  <button style={{ ...sty.btnPrimary, padding: "10px 18px", fontSize: 13 }} onClick={() => setConfirmId(item.cuotaId)}>Cobrar</button>
                )}
                <button 
                  style={{ ...sty.btnOutline, padding: "10px 18px", fontSize: 13 }} 
                  onClick={() => {
                    const p = item.type === "cuota" ? item.rawPrestamo : item.raw;
                    const cli = item.type === "cuota" ? item.rawCliente : clientes.find(c => c.clienteId === p.cliente_id);
                    exportToPDF(cli, p, cuotas);
                  }}
                >📄 PDF</button>
                <button style={{ ...sty.btnOutline, padding: "10px 18px", fontSize: 13, border: `1.5px solid ${C.redBorder}`, color: C.red }} onClick={() => handleEliminar(item.prestamoId || item.rawCuota.prestamoId)}>🗑</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
