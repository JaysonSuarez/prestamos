import { useState, useEffect } from "react";
import { C, sty } from "../../styles/theme";
import { todayStr, fmtCOP, addPeriod, PERIODO_DIAS, genId } from "../../utils/helpers";
import { Card, Inp } from "../ui";

const INIT_FORM = { clienteId: "", importe: "", modalidad: "mensual", numeroCuotas: 12, fechaInicio: todayStr() };

export function NuevoPrestamo({ clientes, prestamos, savePrestamo, cuotas, saveCuota }) {
  const [form, setForm]     = useState(INIT_FORM);
  const [preview, setPreview] = useState(null);
  const [localToast, setLocalToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const imp = parseFloat(form.importe);
    if (!form.clienteId || !imp || imp <= 0 || !form.fechaInicio) { setPreview(null); return; }
    
    const nCuotas = parseInt(form.numeroCuotas) || 1;
    const diasPorPeriodos = PERIODO_DIAS[form.modalidad] || 30;
    const meses = (nCuotas * diasPorPeriodos) / 30;
    
    const total = imp + (imp * 0.10 * meses);
    const nCuotasInt = parseInt(form.numeroCuotas) || 1;
    
    const cuotaBase = Math.round((total / nCuotasInt) / 50) * 50;
    const primeraCuota = total - (cuotaBase * (nCuotasInt - 1));
    
    const lista = Array.from({ length: nCuotasInt }, (_, i) => ({
      num: i + 1,
      fecha: addPeriod(form.fechaInicio, form.modalidad, i + 1),
      importe: i === 0 ? primeraCuota : cuotaBase,
    }));
    
    const cliente = clientes.find(c => c.clienteId === form.clienteId);
    setPreview({ imp, total, cuota: cuotaBase, lista, cliente });
  }, [form, clientes]);

  const handleRegistrar = async () => {
    if (!preview || loading) return;
    setLoading(true);
    const prestamoId = genId("PRE", prestamos, "prestamoId");
    
    try {
      const nuevoPrestamo = {
        prestamoId,
        cliente_id:    form.clienteId,
        importe:      preview.imp,
        modalidad:    form.modalidad,
        numeroCuotas: parseInt(form.numeroCuotas),
        importeCuota: preview.cuota,
        totalAPagar:  preview.total,
        fechaInicio:  form.fechaInicio,
      };
      const nuevasCuotas = preview.lista.map((c, i) => ({
        cuotaId:         `${prestamoId}-C${String(i + 1).padStart(2, "0")}`,
        prestamoId,
        clienteId:       form.clienteId,
        numeroCuota:     c.num,
        fechaVencimiento: c.fecha,
        importeCuota:    c.importe,
        estado:          "pendiente",
        fechaPago:       null,
      }));
      
      await savePrestamo(nuevoPrestamo);
      for (const cuota of nuevasCuotas) {
        await saveCuota(cuota);
      }

      setLocalToast(`✅ Préstamo ${prestamoId} registrado con ${parseInt(form.numeroCuotas)} cuotas`);
      setTimeout(() => setLocalToast(null), 4000);
      setForm(INIT_FORM);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={sty.pageTitle}>Solicitud de Nuevo Crédito</h1>

      {localToast && (
        <div style={{ background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: "14px 20px", marginBottom: 20, fontWeight: 700, fontSize: 14 }}>
          {localToast}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <Card>
          <h3 style={{ margin: "0 0 20px", fontWeight: 800 }}>📉 Calculadora de Crédito</h3>
          <Inp label="Cliente" list="lclients" value={form.clienteId} onChange={e => set("clienteId", e.target.value)} placeholder="Escribe el nombre o cédula..." />
          <datalist id="lclients">
            {clientes.map(c => <option key={c.clienteId} value={c.clienteId}>{c.nombre} {c.apellido} ({c.cc})</option>)}
          </datalist>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Inp label="Monto a Prestar ($)" type="number" value={form.importe} onChange={e => set("importe", e.target.value)} />
            <Inp label="Fecha Inicio" type="date" value={form.fechaInicio} onChange={e => set("fechaInicio", e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={sty.label}>Modalidad de Cobro</label>
              <select style={sty.input} value={form.modalidad} onChange={e => set("modalidad", e.target.value)}>
                <option value="diario">Diario</option>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual (10% interés)</option>
              </select>
            </div>
            <Inp label="Número de Cuotas" type="number" value={form.numeroCuotas} onChange={e => set("numeroCuotas", e.target.value)} />
          </div>

          <button style={{ ...sty.btnPrimary, width: "100%", marginTop: 24 }} onClick={handleRegistrar} disabled={loading || !preview}>
            {loading ? "⚙️ Procesando..." : "🚀 Finalizar y Registrar Crédito"}
          </button>
        </Card>

        {preview ? (
          <Card style={{ border: `1px solid ${C.accent}`, background: "#fffdf9" }}>
            <h3 style={{ margin: "0 0 20px", fontWeight: 800, color: C.accent }}>📑 Resumen del Crédito</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={sty.rowInfo}><span>Cliente:</span><strong>{preview.cliente?.nombre} {preview.cliente?.apellido}</strong></div>
              <div style={sty.rowInfo}><span>Capital inicial:</span><strong>{fmtCOP(preview.imp)}</strong></div>
              <div style={sty.rowInfo}><span>Interés calculado (10%):</span><strong>{fmtCOP(preview.total - preview.imp)}</strong></div>
              <div style={sty.rowInfo}><span>Monto total a devolver:</span><strong style={{ fontSize: 18, color: C.accent }}>{fmtCOP(preview.total)}</strong></div>
              <div style={sty.rowInfo}><span>Valor de cada cuota:</span><strong>{fmtCOP(preview.cuota)}</strong></div>
            </div>

            <div style={{ marginTop: 20, borderTop: `1.5px dashed ${C.border}`, paddingTop: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12 }}>🗓 Calendario de Vencimientos</div>
              <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {preview.lista.map(c => (
                  <div key={c.num} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "8px 12px", background: C.bg, borderRadius: 8 }}>
                    <span>Cuota #{c.num} — {c.fecha}</span>
                    <strong style={{ color: C.secondary }}>{fmtCOP(c.importe)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <div style={{ border: `2px dashed ${C.border}`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontWeight: 700 }}>
            Completa los datos para ver el resumen
          </div>
        )}
      </div>
    </div>
  );
}
