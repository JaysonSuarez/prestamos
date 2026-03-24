import { useState, useEffect } from "react";
import { C, sty } from "../../styles/theme";
import { genId, todayStr, addPeriod, fmtCOP, fmtDate, PERIODO_DIAS } from "../../utils/helpers";
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
    
    const nCuotasInt = parseInt(form.numeroCuotas) || 1;
    const diasPorPeriodos = PERIODO_DIAS[form.modalidad] || 30;
    const meses = (nCuotasInt * diasPorPeriodos) / 30;
    
    const total = imp + (imp * 0.10 * meses);
    
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
    const prestamoId    = genId("PRE", prestamos, "prestamoId");
    
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

      setLocalToast(`✅ Préstamo ${prestamoId} registrado correctamente`);
      setTimeout(() => setLocalToast(null), 4000);
      setForm(INIT_FORM);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const modalidades = ["diario", "semanal", "quincenal", "mensual"];

  return (
    <div>
      <h1 style={sty.pageTitle}>Nuevo Préstamo</h1>

      {localToast && (
        <div style={{ background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: "14px 20px", marginBottom: 20, fontWeight: 700 }}>
          {localToast}
        </div>
      )}

      <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <Card>
          <h3 style={sty.sectionTitle}>Datos del crédito</h3>

          <Inp label="Cliente *">
            <select style={sty.input} value={form.clienteId} onChange={e => set("clienteId", e.target.value)}>
              <option value="">— Seleccionar cliente —</option>
              {clientes.map(c => (
                <option key={c.clienteId} value={c.clienteId}>{c.clienteId} — {c.nombre} {c.apellido}</option>
              ))}
            </select>
          </Inp>

          <Inp label="Importe del crédito (COP) *">
            <input
              style={sty.input} type="number"
              value={form.importe} onChange={e => set("importe", e.target.value)}
              placeholder="Ej: 500000"
            />
          </Inp>

          <Inp label="Modalidad de pago">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {modalidades.map(m => (
                <button key={m} style={{
                  padding: "10px 8px", borderRadius: 8, cursor: "pointer", fontWeight: 700,
                  border: `2px solid ${form.modalidad === m ? C.blue : C.border}`,
                  background: form.modalidad === m ? C.blueBg : "white",
                  color: form.modalidad === m ? C.blue : C.text,
                  textTransform: "capitalize",
                }} onClick={() => set("modalidad", m)}>{m}</button>
              ))}
            </div>
          </Inp>

          <Inp label={`Número de cuotas: ${form.numeroCuotas}`}>
            <input type="range" min={1} max={18} value={form.numeroCuotas}
              onChange={e => set("numeroCuotas", parseInt(e.target.value))}
              style={{ width: "100%", accentColor: C.blue }} />
          </Inp>

          <Inp label="Fecha de ingreso">
            <input style={sty.input} type="date" value={form.fechaInicio} onChange={e => set("fechaInicio", e.target.value)} />
          </Inp>

          <button
            style={{ ...sty.btnPrimary, width: "100%", marginTop: 10 }}
            onClick={handleRegistrar} disabled={!preview || loading}
          >
            {loading ? "Registrando..." : "Registrar Préstamo"}
          </button>
        </Card>

        <Card style={{ borderColor: preview ? C.blue : C.border, borderWidth: preview ? 2 : 1 }}>
          <h3 style={sty.sectionTitle}>Vista previa</h3>

          {!preview && <p style={{ color: C.muted, textAlign: "center", padding: "40px 0" }}>Selecciona un cliente e importe</p>}

          {preview && (
            <>
              <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
                <div style={sty.rowInfo}><span>Capital</span><strong>{fmtCOP(preview.imp)}</strong></div>
                <div style={sty.rowInfo}><span>Total a Pagar</span><strong>{fmtCOP(preview.total)}</strong></div>
                <div style={sty.rowInfo}><span>Cuotas</span><strong>{form.numeroCuotas} de {fmtCOP(preview.cuota)}</strong></div>
              </div>
              <div className="table-scroll" style={{ overflowY: "auto", maxHeight: 300, borderRadius: 8, border: `1px solid ${C.border}` }}>
                {preview.lista.map(c => (
                  <div key={c.num} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
                    <span>Cuota {c.num}</span>
                    <span>{fmtDate(c.fecha)}</span>
                    <strong style={{ color: C.blue }}>{fmtCOP(c.importe)}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
