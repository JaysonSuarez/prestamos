import { useState } from "react";
import { C, sty } from "../../styles/theme";
import { fmtCOP, fmtDate, calcDiasMora, calcDiasHasta, getEstado, calcMoraAcum, todayStr } from "../../utils/helpers";
import { exportToPDF } from "../../services/pdfExport";
import { Card, StatusBadge } from "../ui";

export function Estados({ clientes, prestamos, cuotas, saveCuota, deletePrestamo }) {
  const [filtroEstado, setFiltroEstado]     = useState("pendiente");
  const [filtroCliente, setFiltroCliente]   = useState("");
  const [filtroPrestamo, setFiltroPrestamo] = useState("");
  const [confirmId, setConfirmId]           = useState(null);

  const displayItems = [];

  // Logic: "Si ya pagó todo no aparece en todos, solo en pagado. Y en pagado sale el total, no las cuotas."
  
  if (filtroEstado === "pagado") {
    // Show only consolidated LOANS that are fully paid
    prestamos.forEach(p => {
      const cuotasP = cuotas.filter(c => c.prestamoId === p.prestamoId);
      const cli = clientes.find(c => c.clienteId === p.cliente_id);
      const estaSaldado = cuotasP.length > 0 && cuotasP.every(c => c.estado === "pagado");
      
      if (estaSaldado) {
        if (filtroCliente && p.cliente_id !== filtroCliente) return;
        if (filtroPrestamo && p.prestamoId !== filtroPrestamo) return;
        
        displayItems.push({
          type: "prestamo",
          prestamoId: p.prestamoId,
          clienteId: p.cliente_id,
          nombre: `${cli?.nombre} ${cli?.apellido}`,
          modalidad: p.modalidad,
          numeroCuota: "TODO",
          vencimiento: "FIN",
          importe: p.totalAPagar,
          mora: 0,
          deudaTotal: 0,
          dm: 0,
          tipo: null,
          fechaPago: cuotasP[cuotasP.length - 1]?.fechaPago || "S/D",
          estado: "pagado",
          rawPrestamo: p,
          rawCliente: cli,
          rawCuotas: cuotasP
        });
      }
    });
  } else {
    // Show only the next pending installment for each loan
    prestamos.forEach(p => {
      const cuotasP = cuotas.filter(x => x.prestamoId === p.prestamoId);
      if (cuotasP.length === 0) return;
      
      const estaSaldado = cuotasP.every(x => x.estado === "pagado");
      if (estaSaldado) return; // Hide paid loans from other views

      // Find the next installment to pay (the first one not paid)
      const nextCuota = [...cuotasP]
        .filter(x => x.estado !== "pagado")
        .sort((a, b) => a.numeroCuota - b.numeroCuota)[0];

      if (!nextCuota) return;

      const e = getEstado(nextCuota);
      if (filtroEstado !== "todos" && e !== filtroEstado) return;
      if (filtroCliente && p.cliente_id !== filtroCliente) return;
      if (filtroPrestamo && p.prestamoId !== filtroPrestamo) return;

      const cli = clientes.find(x => x.clienteId === p.cliente_id);
      
      // Calculate total debt for this loan (sum of all unpaid installments + their mora)
      const unpaidCuotas = cuotasP.filter(x => x.estado !== "pagado");
      const totalMora = unpaidCuotas.reduce((sum, c) => {
        return sum + calcMoraAcum(p.importe, p?.modalidad, c.fechaVencimiento, c.estado);
      }, 0);
      const totalPendingPrincipal = unpaidCuotas.reduce((sum, c) => sum + c.importeCuota, 0);

      const dm = calcDiasMora(nextCuota.fechaVencimiento);

      displayItems.push({
        type: "cuota",
        cuotaId: nextCuota.cuotaId,
        prestamoId: nextCuota.prestamoId,
        clienteId: nextCuota.clienteId,
        nombre: `${cli?.nombre} ${cli?.apellido}`,
        modalidad: p?.modalidad,
        numeroCuota: `${nextCuota.numeroCuota} / ${cuotasP.length}`,
        vencimiento: nextCuota.fechaVencimiento,
        importe: nextCuota.importeCuota,
        mora: totalMora,
        deudaTotal: totalPendingPrincipal + totalMora,
        dm: dm,
        tipo: getEstado(nextCuota) === "mora" ? "mora" : (calcDiasHasta(nextCuota.fechaVencimiento) <= 3 ? "proximo" : null),
        fechaPago: nextCuota.fechaPago,
        estado: e,
        rawCuota: nextCuota,
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

  const alertIcons = { proximo: "🔔", mora: "🚨" };

  return (
    <div>
      <div style={sty.pageHeader}>
        <h1 style={sty.pageTitle}>📑 Estado de Cuentas</h1>
        <div style={{ display: "flex", gap: 10 }}>
           <div style={{ background: C.greenBg, color: C.green, padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 800 }}>✓ {cuotas.filter(c=>c.estado==="pagado").length} PAGOS</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {["todos", "pendiente", "mora", "pagado"].map(e => (
          <button key={e} style={{
            padding: "7px 18px", borderRadius: 99, cursor: "pointer", fontWeight: 700, fontSize: 12,
            border: `2px solid ${filtroEstado === e ? C.blue : C.border}`,
            background: filtroEstado === e ? C.blue : "white",
            color: filtroEstado === e ? "white" : C.text,
            textTransform: "capitalize",
          }} onClick={() => setFiltroEstado(e)}>
            {e === "todos" ? "Todos" : e === "mora" ? "🚨 Mora" : e === "pendiente" ? "⏳ Pendiente" : "✓ Pagado"}
          </button>
        ))}
        <select style={{ ...sty.input, flex: 1, minWidth: 220 }} value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
          <option value="">— Todos los clientes —</option>
          {clientes.map(c => <option key={c.clienteId} value={c.clienteId}>{c.clienteId} — {c.nombre} {c.apellido}</option>)}
        </select>
      </div>

      {confirmId && (() => {
        const c = cuotas.find(x => x.cuotaId === confirmId);
        const p = prestamos.find(x => x.prestamoId === c?.prestamoId);
        const mora = calcMoraAcum(p?.importe, p?.modalidad, c.fechaVencimiento, c.estado);
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
                <div style={{ ...sty.rowInfo, borderTop: `2px solid ${C.border}`, paddingTop: 8, marginTop: 4 }}>
                  <span style={{ fontWeight: 800 }}>TOTAL A COBRAR</span>
                  <strong style={{ fontSize: 18, color: C.green }}>{fmtCOP(total)}</strong>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ ...sty.btnPrimary, flex: 1, background: C.green }} onClick={() => registrarPago(confirmId)}>✓ Registrar pago</button>
                <button style={{ ...sty.btnOutline, flex: 1 }} onClick={() => setConfirmId(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        );
      })()}

      <Card style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ ...sty.table, minWidth: 1000 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Préstamo", "Cliente", "Modalidad", "Cuota", "Vencimiento", "Importe", "Mora", "Deuda Total", "Alert", "Pago", "Estado", "Acción"].map(h => (
                   <th key={h} style={sty.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayItems.length === 0 && (
                <tr><td colSpan={12} style={{ padding: 48, textAlign: "center", color: C.muted }}>No hay registros que mostrar</td></tr>
              )}
              {displayItems.map(item => {
                 const isPaid = item.estado === "pagado";
                 return (
                   <tr key={item.cuotaId || item.prestamoId} style={{ borderTop: `1px solid ${C.border}`, background: isPaid ? C.greenBg : "white" }}>
                     <td style={sty.td}><span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 800, color: C.blue }}>{item.prestamoId}</span></td>
                     <td style={sty.td}><strong>{item.nombre}</strong> <br/><span style={{fontSize:11, color:C.muted}}>{item.clienteId}</span></td>
                     <td style={sty.td}><span style={{ textTransform: "capitalize", fontSize: 12 }}>{item.modalidad}</span></td>
                     <td style={{ ...sty.td, textAlign: "center", fontWeight: 700 }}>{item.numeroCuota}</td>
                     <td style={sty.td}>{item.vencimiento === "FIN" ? "---" : fmtDate(item.vencimiento)}</td>
                     <td style={{ ...sty.td, fontWeight: 700 }}>{fmtCOP(item.importe)}</td>
                     <td style={{ ...sty.td, color: item.mora > 0 ? C.red : C.muted }}>{item.mora > 0 ? fmtCOP(item.mora) : "---"}</td>
                     <td style={{ ...sty.td, fontWeight: 900, color: isPaid ? C.green : C.red }}>{isPaid ? "SALDADO" : fmtCOP(item.deudaTotal)}</td>
                     <td style={{ ...sty.td, textAlign: "center", fontSize: 16 }}>{item.tipo ? alertIcons[item.tipo] : "---"}</td>
                     <td style={sty.td}>{item.fechaPago ? fmtDate(item.fechaPago) : "---"}</td>
                     <td style={sty.td}><StatusBadge estado={item.estado} /></td>
                     <td style={sty.td}>
                       <div style={{ display: "flex", gap: 4 }}>
                         {item.type === "cuota" && item.estado !== "pagado" && (
                           <button style={sty.btnSm} onClick={() => setConfirmId(item.cuotaId)}>💰</button>
                         )}
                        <button style={sty.btnSm} onClick={() => exportToPDF(item.rawCliente, item.rawPrestamo, item.type==="cuota" ? cuotas.filter(x=>x.prestamoId===item.prestamoId) : item.rawCuotas)}>📄</button>
                        <button style={{ ...sty.btnSm, color:C.red }} onClick={() => deletePrestamo("prestamoId", item.prestamoId)}>🗑</button>
                       </div>
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
