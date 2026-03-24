import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function playAlertSound() {
  const audio = new Audio('/sounds/notification.mp3');
  audio.play().catch(e => console.log('Audio auto-play blocked', e));
}

// ═══════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════
const fmtCOP = n =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

const fmtDate = str => {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
};

const todayStr = () => new Date().toISOString().split("T")[0];

const addPeriod = (dateStr, modalidad, n) => {
  const d = new Date(dateStr + "T12:00:00");
  if (modalidad === "diario")    d.setDate(d.getDate() + n);
  else if (modalidad === "semanal")   d.setDate(d.getDate() + 7 * n);
  else if (modalidad === "quincenal") d.setDate(d.getDate() + 15 * n);
  else if (modalidad === "mensual")   d.setMonth(d.getMonth() + n);
  return d.toISOString().split("T")[0];
};

const PERIODO_DIAS = { diario: 1, semanal: 7, quincenal: 15, mensual: 30 };

const calcDiasMora = fv => {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const v   = new Date(fv + "T00:00:00");
  const d   = Math.floor((hoy - v) / 86400000);
  return d > 0 ? d : 0;
};

const calcDiasHasta = fv => {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const v   = new Date(fv + "T00:00:00");
  return Math.floor((v - hoy) / 86400000);
};

const calcMoraAcum = (importeCuota, modalidad, fechaVenc, estadoCuota) => {
  if (estadoCuota === "pagado") return 0;
  const dias = calcDiasMora(fechaVenc);
  if (dias <= 0) return 0;
  const moraDiaria = (importeCuota * 0.10) / (PERIODO_DIAS[modalidad] || 30);
  return moraDiaria * dias;
};

const getEstado = c => {
  if (c.estado === "pagado") return "pagado";
  return calcDiasMora(c.fechaVencimiento) > 0 ? "mora" : "pendiente";
};

const getAlertType = c => {
  if (c.estado === "pagado") return null;
  const dh = calcDiasHasta(c.fechaVencimiento);
  const dm = calcDiasMora(c.fechaVencimiento);
  if (dm > 3)        return "mora";
  if (dm > 0)        return "mora-reciente";
  if (dh === 0)      return "hoy";
  if (dh > 0 && dh <= 3) return "proximo";
  return null;
};

const genId = (prefix, arr, field) => {
  const nums = arr.map(x => parseInt((x[field] || "").replace(/\D/g, "") || "0"));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
};

// ═══════════════════════════════════════════════════════
//  PDF GENERATOR
// ═══════════════════════════════════════════════════════
const exportToPDF = (cliente, prestamo, cuotasP) => {
  try {
    if (!cliente || !prestamo || !cuotasP) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(22, 33, 62); // C.sidebar color
    doc.text("ESTADO DE CUENTA - PRÉSTAMOS PRO", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha de reporte: ${new Date().toLocaleString()}`, 105, 28, { align: "center" });
    
    // Client Info Section
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 35, 196, 35);
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL CLIENTE", 14, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${cliente.nombre} ${cliente.apellido}`, 14, 52);
    doc.text(`Documento: ${cliente.cc}`, 14, 58);
    doc.text(`Teléfono: ${cliente.telefono || "—"}`, 14, 64);
    doc.text(`Dirección: ${cliente.domicilio || "—"}`, 14, 70);
    
    // Loan Info Section
    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN DEL CRÉDITO", 110, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`ID Préstamo: ${prestamo.prestamoId}`, 110, 52);
    doc.text(`Capital: ${fmtCOP(prestamo.importe)}`, 110, 58);
    doc.text(`Modalidad: ${prestamo.modalidad.charAt(0).toUpperCase() + prestamo.modalidad.slice(1)}`, 110, 64);
    doc.text(`Total a Pagar: ${fmtCOP(prestamo.totalAPagar)}`, 110, 70);

    // Financial Summary logic
    const todasPendientes = cuotasP.filter(c => getEstado(c) !== "pagado");
    const moraTotal = todasPendientes.reduce((s, c) => s + calcMoraAcum(c.importeCuota, prestamo.modalidad, c.fechaVencimiento, c.estado), 0);
    const porPagar = todasPendientes.reduce((s, c) => s + c.importeCuota, 0) + moraTotal;

    doc.setDrawColor(233, 69, 96); // C.accent
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 78, 182, 10, 'F');
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`ESTADO ACTUAL: ${porPagar <= 0 ? "LIQUIDADO" : "DEUDA ACTIVA: " + fmtCOP(porPagar)}`, 105, 84, { align: "center" });

    // Table of Cuotas
    const head = [['#', 'Vencimiento', 'Importe', 'Estado', 'Mora', 'Pago', 'Total Pagado']];
    const body = cuotasP.sort((a,b) => a.numeroCuota - b.numeroCuota).map(c => {
        const mora = getEstado(c) === "mora" ? calcMoraAcum(c.importeCuota, prestamo.modalidad, c.fechaVencimiento, c.estado) : 0;
        return [
          c.numeroCuota,
          fmtDate(c.fechaVencimiento),
          fmtCOP(c.importeCuota),
          getEstado(c).toUpperCase(),
          mora > 0 ? fmtCOP(mora) : "—",
          c.fechaPago ? fmtDate(c.fechaPago) : "—",
          c.estado === "pagado" ? fmtCOP(c.importeCuota) : "—"
        ];
    });

    autoTable(doc, {
      startY: 95,
      head: head,
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [22, 33, 96], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 10 } }
    });

    // Footer
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Este documento es un registro informativo del estado actual del crédito.", 14, finalY);
    doc.text("Préstamos Pro System - Gestionado digitalmente.", 14, finalY + 4);

    doc.save(`Estado_Cuenta_${cliente.cc}_${prestamo.prestamoId}.pdf`);
  } catch (err) {
    console.error("PDF Error:", err);
    toast.error("Error al generar PDF: " + err.message);
  }
};

// ═══════════════════════════════════════════════════════
//  STORAGE HOOK
// ═══════════════════════════════════════════════════════
function useSupabaseStore(table, fieldsMapping) {
  const [val, setVal] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from(table).select('*');
      if (!error && data) {
        // Map table fields to original state object structure
        const mapped = data.map(item => {
          const newItem = {};
          for (const [stateField, dbField] of Object.entries(fieldsMapping)) {
             newItem[stateField] = item[dbField];
          }
          return newItem;
        });
        setVal(mapped);
      }
      setReady(true);
    })();
  }, [table]);

  const saveOne = async (item) => {
    const dbItem = {};
    for (const [stateField, dbField] of Object.entries(fieldsMapping)) {
      dbItem[dbField] = item[stateField];
    }
    const { error } = await supabase.from(table).upsert(dbItem);
    if (error) toast.error(`Error guardando ${table}: ${error.message}`);
    else {
      // Re-fetch or update locally
      const { data } = await supabase.from(table).select('*');
      if (data) {
        setVal(data.map(d => {
           const mapped = {};
           for (const [sF, dF] of Object.entries(fieldsMapping)) { mapped[sF] = d[dF]; }
           return mapped;
        }));
      }
    }
  };

  const deleteOne = async (idField, id) => {
    const dbIdField = fieldsMapping[idField];
    const { error } = await supabase.from(table).delete().eq(dbIdField, id);
    if (error) toast.error(`Error eliminando en ${table}: ${error.message}`);
    else {
      setVal(prev => prev.filter(x => x[idField] !== id));
    }
  };

  return [val, saveOne, deleteOne, ready];
}

// ═══════════════════════════════════════════════════════
//  TOKENS
// ═══════════════════════════════════════════════════════
const C = {
  sidebar: "#16213e", sidebarActive: "#0f3460", sidebarHover: "#1a2744",
  accent: "#e94560", accentMid: "#0f3460",
  bg: "#f0f4f8", card: "#ffffff", border: "#e2e8f0",
  text: "#1e293b", muted: "#64748b",
  green: "#15803d", greenBg: "#dcfce7", greenBorder: "#86efac",
  yellow: "#92400e", yellowBg: "#fef3c7", yellowBorder: "#fcd34d",
  red: "#b91c1c",   redBg: "#fee2e2",   redBorder: "#fca5a5",
  blue: "#1d4ed8",  blueBg: "#dbeafe",
};

// ═══════════════════════════════════════════════════════
//  SHARED SMALL COMPONENTS
// ═══════════════════════════════════════════════════════
const StatusBadge = ({ estado }) => {
  const cfg = {
    pagado:    { bg: C.greenBg,  color: C.green,  icon: "✓", label: "Pagado" },
    pendiente: { bg: C.yellowBg, color: C.yellow, icon: "⏳", label: "Pendiente" },
    mora:      { bg: C.redBg,    color: C.red,    icon: "!", label: "En Mora" },
  };
  const s = cfg[estado] || cfg.pendiente;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: s.bg, color: s.color,
      padding: "3px 10px", borderRadius: 99,
      fontSize: 11, fontWeight: 800, whiteSpace: "nowrap",
    }}>
      {s.icon} {s.label}
    </span>
  );
};

const Card = ({ children, style }) => (
  <div className="card-compact" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, ...style }}>
    {children}
  </div>
);

const Inp = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={sty.label}>{label}</label>}
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════
function Dashboard({ clientes, prestamos, cuotas, alertas }) {
  const totalPrestado = prestamos.reduce((s, p) => s + p.importe, 0);
  const totalAPagar   = prestamos.reduce((s, p) => s + p.totalAPagar, 0);
  const cobrado = cuotas
    .filter(c => c.estado === "pagado")
    .reduce((s, c) => s + c.importeCuota, 0);
  const pendiente = cuotas
    .filter(c => getEstado(c) !== "pagado")
    .reduce((s, c) => s + c.importeCuota, 0);
  const cuotasMora = cuotas.filter(c => getEstado(c) === "mora");
  const totalMora = cuotasMora.reduce((s, c) => {
    const p = prestamos.find(p => p.prestamoId === c.prestamoId);
    return s + c.importeCuota + calcMoraAcum(c.importeCuota, p?.modalidad, c.fechaVencimiento, c.estado);
  }, 0);

  const stats = [
    { icon: "👥", label: "Clientes",          value: clientes.length,  raw: true,  color: C.blue },
    { icon: "💵", label: "Capital prestado",  value: totalPrestado,               color: C.text },
    { icon: "📈", label: "Total a cobrar",    value: totalAPagar,                 color: C.blue },
    { icon: "✅", label: "Cobrado",           value: cobrado,                     color: C.green },
    { icon: "⏳", label: "Por cobrar",        value: pendiente,                   color: C.yellow },
    { icon: "🚨", label: "En mora",           value: totalMora,                   color: C.red },
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

      {/* Stats grid */}
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

      {/* Alertas */}
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
                      {c.cuotaId} · Cuota #{c.numeroCuota} · {fmtCOP(c.importeCuota)} · Vence: {fmtDate(c.fechaVencimiento)}
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

// ═══════════════════════════════════════════════════════
//  CLIENTES
// ═══════════════════════════════════════════════════════
const EMPTY_CLIENTE = { nombre: "", apellido: "", cc: "", domicilio: "", telefono: "" };

function Clientes({ clientes, saveCliente, delCliente }) {
  const [form, setForm]       = useState(EMPTY_CLIENTE);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]   = useState("");

  const filtered = clientes.filter(c =>
    `${c.nombre} ${c.apellido} ${c.clienteId} ${c.cc}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.apellido.trim() || !form.cc.trim())
      return alert("Nombre, apellido y CC son obligatorios");
    if (editing) {
      await saveCliente({ clienteId: editing, ...form });
      setEditing(null);
    } else {
      const clienteId = genId("CLI", clientes, "clienteId");
      await saveCliente({ clienteId, ...form });
    }
    setForm(EMPTY_CLIENTE);
    setShowForm(false);
  };

  const handleEdit = c => {
    setForm({ nombre: c.nombre, apellido: c.apellido, cc: c.cc, domicilio: c.domicilio, telefono: c.telefono });
    setEditing(c.clienteId);
    setShowForm(true);
  };

  const handleDelete = id => {
    if (!confirm("¿Eliminar este cliente? Esta acción no se puede deshacer.")) return;
    delCliente("clienteId", id);
  };

  return (
    <div>
      <div style={sty.pageHeader}>
        <h1 style={sty.pageTitle}>Clientes</h1>
        <button style={sty.btnPrimary} onClick={() => { setForm(EMPTY_CLIENTE); setEditing(null); setShowForm(true); }}>
          + Nuevo Cliente
        </button>
      </div>

      <input
        style={{ ...sty.input, maxWidth: 360, marginBottom: 20 }}
        placeholder="Buscar por nombre, código o CC…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {showForm && (
        <Card style={{ marginBottom: 24, borderLeft: `4px solid ${C.blue}` }}>
          <h3 style={{ margin: "0 0 20px", fontWeight: 800, fontSize: 16 }}>
            {editing ? "Editar cliente" : "Nuevo cliente"}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Inp label="Nombre *">
              <input style={sty.input} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Ej: Juan" />
            </Inp>
            <Inp label="Apellido *">
              <input style={sty.input} value={form.apellido} onChange={e => set("apellido", e.target.value)} placeholder="Ej: Pérez" />
            </Inp>
            <Inp label="Cédula / CC *">
              <input style={sty.input} value={form.cc} onChange={e => set("cc", e.target.value)} placeholder="Ej: 12345678" />
            </Inp>
            <Inp label="Teléfono">
              <input style={sty.input} type="tel" value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="Ej: 3001234567" />
            </Inp>
            <div style={{ gridColumn: "1/-1" }}>
              <Inp label="Domicilio">
                <input style={sty.input} value={form.domicilio} onChange={e => set("domicilio", e.target.value)} placeholder="Dirección completa" />
              </Inp>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={sty.btnPrimary} onClick={handleSave}>
              {editing ? "Guardar cambios" : "Registrar cliente"}
            </button>
            <button style={sty.btnOutline} onClick={() => { setShowForm(false); setEditing(null); }}>
              Cancelar
            </button>
          </div>
        </Card>
      )}

      <Card style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={sty.table}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Código", "Nombre completo", "CC / Cédula", "Teléfono", "Domicilio", "Acciones"].map(h => (
                  <th key={h} style={sty.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: "center", color: C.muted, fontSize: 14 }}>
                    {search ? "Sin resultados para esa búsqueda" : "Aún no hay clientes registrados"}
                  </td>
                </tr>
              )}
              {filtered.map(c => (
                <tr key={c.clienteId} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={sty.td}>
                    <span style={{ fontFamily: "monospace", fontWeight: 800, color: C.blue, fontSize: 13 }}>{c.clienteId}</span>
                  </td>
                  <td style={sty.td}><strong>{c.nombre} {c.apellido}</strong></td>
                  <td style={sty.td}>{c.cc}</td>
                  <td style={sty.td}>{c.telefono || "—"}</td>
                  <td style={sty.td}>{c.domicilio || "—"}</td>
                  <td style={sty.td}>
                    <button style={sty.btnSm} onClick={() => handleEdit(c)} title="Editar">✏️</button>
                    <button style={{ ...sty.btnSm, color: C.red }} onClick={() => handleDelete(c.clienteId)} title="Eliminar">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  NUEVO PRÉSTAMO (Calculadora + Registro)
// ═══════════════════════════════════════════════════════
const INIT_FORM = { clienteId: "", importe: "", modalidad: "mensual", numeroCuotas: 12, fechaInicio: todayStr() };

function NuevoPrestamo({ clientes, prestamos, savePrestamo, cuotas, saveCuota }) {
  const [form, setForm]     = useState(INIT_FORM);
  const [preview, setPreview] = useState(null);
  const [toast, setToast]   = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Recalculate preview whenever form changes
  useEffect(() => {
    const imp = parseFloat(form.importe);
    if (!form.clienteId || !imp || imp <= 0 || !form.fechaInicio) { setPreview(null); return; }
    
    const nCuotas = parseInt(form.numeroCuotas) || 1;
    const diasPorPeriodos = PERIODO_DIAS[form.modalidad] || 30;
    const meses = (nCuotas * diasPorPeriodos) / 30;
    
    const total = imp + (imp * 0.10 * meses);
    const nCuotasInt = parseInt(form.numeroCuotas) || 1;
    
    // Redondeamos la cuota base a los 50 más cercanos
    const cuotaBase = Math.round((total / nCuotasInt) / 50) * 50;
    // La primera cuota absorbe la diferencia para que el total sea exacto
    const primeraCuota = total - (cuotaBase * (nCuotasInt - 1));
    
    const lista = Array.from({ length: nCuotasInt }, (_, i) => ({
      num: i + 1,
      fecha: addPeriod(form.fechaInicio, form.modalidad, i + 1),
      importe: i === 0 ? primeraCuota : cuotaBase,
    }));
    
    const cliente = clientes.find(c => c.clienteId === form.clienteId);
    // Guardamos cuotaBase en el objeto preview para la UI
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

      setToast(`✅ Préstamo ${prestamoId} registrado con ${parseInt(form.numeroCuotas)} cuotas`);
      setTimeout(() => setToast(null), 4000);
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

      {toast && (
        <div style={{ background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: "14px 20px", marginBottom: 20, fontWeight: 700, fontSize: 14 }}>
          {toast}
        </div>
      )}

      <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* ── Formulario ── */}
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
              style={sty.input} type="number" min={0} step={1000}
              value={form.importe} onChange={e => set("importe", e.target.value)}
              placeholder="Ej: 500000"
            />
            {form.importe && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{fmtCOP(parseFloat(form.importe) || 0)}</div>}
          </Inp>

          <Inp label="Modalidad de pago">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {modalidades.map(m => (
                <button key={m} style={{
                  padding: "10px 8px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
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
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginTop: 2 }}>
              <span>1 cuota</span><span>18 cuotas</span>
            </div>
          </Inp>

          <Inp label="Tasa de interés">
            <div style={{ padding: "9px 12px", background: "#f8fafc", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontWeight: 700, color: C.muted }}>
              10% mensual sobre el capital
            </div>
          </Inp>

          <Inp label="Fecha de ingreso">
            <input style={sty.input} type="date" value={form.fechaInicio} onChange={e => set("fechaInicio", e.target.value)} />
          </Inp>

          <button
            style={{ ...sty.btnPrimary, width: "100%", marginTop: 4, opacity: (preview && !loading) ? 1 : 0.45, fontSize: 15, padding: "13px" }}
            onClick={handleRegistrar} disabled={!preview || loading}
          >
            {loading ? "Registrando..." : "Registrar Préstamo"}
          </button>
        </Card>

        {/* ── Preview ── */}
        <Card style={{ borderColor: preview ? C.blue : C.border, borderWidth: preview ? 2 : 1 }}>
          <h3 style={{ ...sty.sectionTitle, color: preview ? C.blue : C.muted }}>
            Vista previa del crédito
          </h3>

          {!preview && (
            <div style={{ textAlign: "center", color: C.muted, padding: "60px 0 40px", fontSize: 14 }}>
              Selecciona un cliente e ingresa<br />el importe para ver el resumen
            </div>
          )}

          {preview && (
            <>
              {/* Resumen */}
              <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
                {[
                  ["Cliente",           `${preview.cliente?.clienteId} — ${preview.cliente?.nombre} ${preview.cliente?.apellido}`],
                  ["Capital prestado",  fmtCOP(preview.imp)],
                  ["Interés total",     fmtCOP(preview.total - preview.imp)],
                  ["Modalidad",         form.modalidad],
                  ["N° de cuotas",      form.numeroCuotas],
                  ["Valor por cuota",   fmtCOP(preview.cuota)],
                  ["Fecha de ingreso",  fmtDate(form.fechaInicio)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 13, color: C.muted }}>{k}</span>
                    <strong style={{ fontSize: 13, color: C.text }}>{v}</strong>
                  </div>
                ))}
                {/* Total destacado */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: C.blueBg, borderRadius: 8, marginTop: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: C.blue }}>TOTAL A PAGAR</span>
                  <strong style={{ fontSize: 18, color: C.blue }}>{fmtCOP(preview.total)}</strong>
                </div>
              </div>

              {/* Plan de cuotas */}
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Plan de cuotas
              </div>
              <div className="table-scroll" style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${C.border}`, background: "white" }}>
                {preview.lista.map(c => (
                  <div key={c.num} style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: `1px solid #f1f5f9`, fontSize: 12 }}>
                    <span style={{ color: C.muted, minWidth: 70 }}>Cuota {c.num}</span>
                    <span style={{ color: C.text }}>{fmtDate(c.fecha)}</span>
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

// ═══════════════════════════════════════════════════════
//  CAPITAL PROPIO
// ═══════════════════════════════════════════════════════
function CapitalPropio({ prestamos, cuotas, capitalInicial, setCapitalInicial }) {
  const [editCap, setEditCap] = useState(false);
  const [tempCap, setTempCap] = useState("");

  // Capital total invertido en préstamos activos (suma de importes)
  const capitalInvertido = prestamos.reduce((s, p) => s + p.importe, 0);

  // Lo que ya regresó a la caja: cuotas pagadas
  const cobrado = cuotas
    .filter(c => c.estado === "pagado")
    .reduce((s, c) => s + c.importeCuota, 0);

  // Cuánto falta por cobrar (cuotas pendientes + mora)
  const pendientesTotal = cuotas
    .filter(c => getEstado(c) !== "pagado")
    .reduce((s, c) => {
      const p = prestamos.find(px => px.prestamoId === c.prestamoId);
      const mora = calcMoraAcum(c.importeCuota, p?.modalidad, c.fechaVencimiento, c.estado);
      return s + c.importeCuota + mora;
    }, 0);

  // Ganancia = total a pagar - capital prestado (pura ganancia/interés)
  const totalAPagar = prestamos.reduce((s, p) => s + p.totalAPagar, 0);
  const gananciaTotal = totalAPagar - capitalInvertido;

  // Ganancia ya realizada (de cuotas pagadas, restando el capital proporcional)
  const gananciaRealizada = cobrado > 0
    ? cobrado - (capitalInvertido > 0 ? (cobrado / totalAPagar) * capitalInvertido : 0)
    : 0;

  // Dinero que está afuera (en manos de deudores) = capital invertido - capital recuperado
  const capitalRecuperado = cobrado > 0 && totalAPagar > 0
    ? (cobrado / totalAPagar) * capitalInvertido
    : 0;
  const dineroAfuera = capitalInvertido - capitalRecuperado;

  // Dinero disponible en caja = capital inicial - capital invertido + lo cobrado
  const dineroEnCaja = (capitalInicial || 0) - capitalInvertido + cobrado;

  // Total para invertir (lo que tenemos disponible)
  const totalParaInvertir = dineroEnCaja;

  const metrics = [
    {
      icon: "🏦", label: "Mi Capital Total", value: capitalInicial || 0,
      color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd",
      tip: "Capital que pusiste para hacer préstamos",
    },
    {
      icon: "💸", label: "Capital Invertido", value: capitalInvertido,
      color: C.blue, bg: C.blueBg, border: "#93c5fd",
      tip: "Suma de todos los préstamos otorgados",
    },
    {
      icon: "🏠", label: "Dinero en Caja", value: dineroEnCaja,
      color: C.green, bg: C.greenBg, border: C.greenBorder,
      tip: "Capital disponible que tienes tú ahora mismo",
    },
    {
      icon: "🛣️", label: "Dinero Afuera", value: dineroAfuera,
      color: "#d97706", bg: "#fffbeb", border: "#fcd34d",
      tip: "Capital que está en manos de los deudores",
    },
    {
      icon: "📥", label: "Por Cobrar (con mora)", value: pendientesTotal,
      color: C.yellow, bg: C.yellowBg, border: C.yellowBorder,
      tip: "Total que te deben (cuotas pendientes + mora)",
    },
    {
      icon: "🎯", label: "Ganancia Total Esperada", value: gananciaTotal,
      color: C.green, bg: C.greenBg, border: C.greenBorder,
      tip: "Interés total que ganarás sobre todos los préstamos",
    },
    {
      icon: "✅", label: "Ganancia Realizada", value: gananciaRealizada,
      color: "#15803d", bg: "#dcfce7", border: "#86efac",
      tip: "Ganancia ya cobrada en cuotas pagadas",
    },
    {
      icon: "📊", label: "Total Invertido + Por Cobrar", value: capitalInvertido + pendientesTotal,
      color: C.text, bg: "#f8fafc", border: C.border,
      tip: "Capital puesto + lo que aún te deben (valor total del portafolio)",
    },
  ];

  return (
    <div>
      <div style={sty.pageHeader}>
        <h1 style={sty.pageTitle}>💼 Capital Propio</h1>
        <button style={sty.btnPrimary} onClick={() => { setTempCap(capitalInicial || ""); setEditCap(true); }}>
          ✏️ Actualizar Capital
        </button>
      </div>

      {editCap && (
        <Card style={{ marginBottom: 24, borderLeft: `4px solid #7c3aed` }}>
          <h3 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 16 }}>💰 Mi Capital para Préstamos</h3>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
            Ingresa el total de dinero propio que destinaste para hacer préstamos.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              style={{ ...sty.input, maxWidth: 280 }}
              type="number" min={0} step={1000}
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16, marginBottom: 32 }}>
        {metrics.map(m => (
          <div key={m.label} style={{
            background: m.bg,
            border: `1.5px solid ${m.border}`,
            borderRadius: 14,
            padding: "20px 22px",
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{m.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: m.color, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: m.color }}>{fmtCOP(m.value)}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{m.tip}</div>
          </div>
        ))}
      </div>

      {/* Tabla resumen por préstamo */}
      <Card style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px", fontWeight: 800, fontSize: 15, color: C.text, borderBottom: `1px solid ${C.border}` }}>
          📋 Resumen por Préstamo
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={sty.table}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Préstamo", "Cliente", "Capital Prestado", "Total a Pagar", "% Interés", "Cobrado", "Por Cobrar", "Estado"].map(h => (
                  <th key={h} style={sty.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prestamos.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: C.muted }}>Sin préstamos registrados</td></tr>
              )}
              {prestamos.map(p => {
                const cuotasP = cuotas.filter(c => c.prestamoId === p.prestamoId);
                const cobradoP = cuotasP.filter(c => c.estado === "pagado").reduce((s, c) => s + c.importeCuota, 0);
                const porCobrarP = cuotasP.filter(c => getEstado(c) !== "pagado").reduce((s, c) => s + c.importeCuota, 0);
                const totalPagadas = cuotasP.filter(c => c.estado === "pagado").length;
                const interesPorc = p.importe > 0 ? (((p.totalAPagar - p.importe) / p.importe) * 100).toFixed(0) : 0;
                const completo = cuotasP.length > 0 && cuotasP.every(c => c.estado === "pagado");
                return (
                  <tr key={p.prestamoId} style={{ borderTop: `1px solid ${C.border}`, background: completo ? C.greenBg : "white" }}>
                    <td style={sty.td}><span style={{ fontFamily: "monospace", fontWeight: 800, color: C.blue, fontSize: 12 }}>{p.prestamoId}</span></td>
                    <td style={sty.td}><span style={{ fontSize: 12 }}>{p.cliente_id}</span></td>
                    <td style={{ ...sty.td, fontWeight: 700 }}>{fmtCOP(p.importe)}</td>
                    <td style={{ ...sty.td, fontWeight: 700, color: C.blue }}>{fmtCOP(p.totalAPagar)}</td>
                    <td style={{ ...sty.td, textAlign: "center" }}><span style={{ background: C.blueBg, color: C.blue, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 800 }}>{interesPorc}%</span></td>
                    <td style={{ ...sty.td, color: C.green, fontWeight: 700 }}>{fmtCOP(cobradoP)}</td>
                    <td style={{ ...sty.td, color: C.yellow, fontWeight: 700 }}>{fmtCOP(porCobrarP)}</td>
                    <td style={sty.td}>
                      {completo
                        ? <span style={{ background: C.greenBg, color: C.green, padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 800 }}>✓ Saldado</span>
                        : <span style={{ background: C.yellowBg, color: C.yellow, padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 800 }}>{totalPagadas}/{cuotasP.length} cuotas</span>
                      }
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

// ═══════════════════════════════════════════════════════
//  ESTADO DE CUENTAS
// ═══════════════════════════════════════════════════════
function Estados({ clientes, prestamos, cuotas, saveCuota }) {
  const [filtroEstado,   setFiltroEstado]   = useState("todos");
  const [filtroCliente,  setFiltroCliente]  = useState("");
  const [filtroPrestamo, setFiltroPrestamo] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  const registrarPago = async id => {
    const c = cuotas.find(x => x.cuotaId === id);
    if (!c) return;
    await saveCuota({ ...c, estado: "pagado", fechaPago: todayStr() });
    setConfirmId(null);
  };

  const deshacerPago = async id => {
    if (!confirm("¿Deshacer el registro de pago?")) return;
    const c = cuotas.find(x => x.cuotaId === id);
    if (!c) return;
    await saveCuota({ ...c, estado: "pendiente", fechaPago: null });
  };

  const filtered = cuotas
    .filter(c => {
      const e = getEstado(c);
      if (filtroEstado !== "todos" && e !== filtroEstado) return false;
      if (filtroCliente  && c.clienteId  !== filtroCliente)  return false;
      if (filtroPrestamo && c.prestamoId !== filtroPrestamo) return false;
      
      // Mostrar solo la próxima cuota a pagar para cada préstamo
      if (e !== "pagado") {
        const cuotasPendientes = cuotas.filter(x => x.prestamoId === c.prestamoId && getEstado(x) !== "pagado");
        const minNum = Math.min(...cuotasPendientes.map(x => x.numeroCuota));
        if (c.numeroCuota !== minNum) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const ea = getEstado(a), eb = getEstado(b);
      if (ea === "mora" && eb !== "mora") return -1;
      if (eb === "mora" && ea !== "mora") return 1;
      return a.fechaVencimiento.localeCompare(b.fechaVencimiento);
    });

  const rowBg = {
    pagado:    { bg: "#f0fdf4", left: C.green },
    pendiente: { bg: "#fffbeb", left: C.yellow },
    mora:      { bg: "#fff1f2", left: C.red },
  };

  const alertIcons = {
    proximo: "🔔", hoy: "⚠️", "mora-reciente": "🚨", mora: "🚨",
  };

  // Summary counters
  const counts = { pagado: 0, pendiente: 0, mora: 0 };
  cuotas.forEach(c => counts[getEstado(c)]++);

  return (
    <div>
      <div style={sty.pageHeader}>
        <h1 style={sty.pageTitle}>Estado de Cuentas</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ background: C.greenBg, color: C.green, padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 800 }}>✓ {counts.pagado} pagadas</div>
          <div style={{ background: C.yellowBg, color: C.yellow, padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 800 }}>⏳ {counts.pendiente} pendientes</div>
          <div style={{ background: C.redBg, color: C.red, padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 800 }}>🚨 {counts.mora} en mora</div>
        </div>
      </div>

      {/* Filtros */}
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
        <select style={{ ...sty.input, flex: 1, minWidth: 180 }} value={filtroPrestamo} onChange={e => setFiltroPrestamo(e.target.value)}>
          <option value="">— Todos los préstamos —</option>
          {prestamos.map(p => <option key={p.prestamoId} value={p.prestamoId}>{p.prestamoId}</option>)}
        </select>
      </div>

      <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{filtered.length} cuota(s) · ordenadas por mora → fecha</div>

      {/* Modal confirmación pago */}
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
                <div style={{ ...sty.rowInfo, borderTop: `2px solid ${C.border}`, paddingTop: 8, marginTop: 4 }}>
                  <span style={{ fontWeight: 800 }}>TOTAL A COBRAR</span>
                  <strong style={{ fontSize: 18, color: mora > 0 ? C.red : C.green }}>{fmtCOP(total)}</strong>
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
          <table style={{ ...sty.table, minWidth: 1100 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["ID Préstamo", "Cod. Cliente", "Nombre", "Modalidad", "Próx. Cuota", "Vencimiento", "Val. Cuota", "Mora Acum.", "DEUDA TOTAL", "Días Mora", "Alerta", "Fecha Pago", "Estado", "Acción"].map(h => (
                  <th key={h} style={sty.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={14} style={{ padding: 48, textAlign: "center", color: C.muted }}>
                    No hay cuotas que mostrar con estos filtros
                  </td>
                </tr>
              )}
              {filtered.map(c => {
                const estado   = getEstado(c);
                const prestamo = prestamos.find(p => p.prestamoId === c.prestamoId);
                const cliente  = clientes.find(cl => cl.clienteId === c.clienteId);
                const mora     = estado === "mora"
                  ? calcMoraAcum(c.importeCuota, prestamo?.modalidad, c.fechaVencimiento, c.estado)
                  : 0;
                // Deuda total del préstamo = suma de TODAS las cuotas pendientes + mora acumulada
                const todasPendientes = cuotas.filter(x => x.prestamoId === c.prestamoId && getEstado(x) !== "pagado");
                const deudaTotal = todasPendientes.reduce((s, x) => {
                  const moraCuota = calcMoraAcum(x.importeCuota, prestamo?.modalidad, x.fechaVencimiento, x.estado);
                  return s + x.importeCuota + moraCuota;
                }, 0);
                const dm   = calcDiasMora(c.fechaVencimiento);
                const tipo = getAlertType(c);
                const rc   = rowBg[estado] || rowBg.pendiente;

                return (
                  <tr key={c.cuotaId} style={{ background: rc.bg, borderTop: `1px solid ${C.border}`, borderLeft: `4px solid ${rc.left}` }}>
                    <td style={sty.td}><span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 800, color: C.blue }}>{c.prestamoId}</span></td>
                    <td style={sty.td}><span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{c.clienteId}</span></td>
                    <td style={{ ...sty.td, whiteSpace: "nowrap" }}><strong style={{ fontSize: 13 }}>{cliente ? `${cliente.nombre} ${cliente.apellido}` : "—"}</strong></td>
                    <td style={sty.td}><span style={{ textTransform: "capitalize", fontSize: 12, color: C.muted }}>{prestamo?.modalidad || "—"}</span></td>
                    <td style={{ ...sty.td, textAlign: "center", fontWeight: 700 }}>{c.numeroCuota}<span style={{ color: C.muted, fontWeight: 400 }}>/{prestamo?.numeroCuotas || "?"}</span></td>
                    <td style={{ ...sty.td, whiteSpace: "nowrap" }}>{fmtDate(c.fechaVencimiento)}</td>
                    <td style={{ ...sty.td, fontWeight: 700 }}>{fmtCOP(c.importeCuota)}</td>
                    <td style={{ ...sty.td, fontWeight: mora > 0 ? 800 : 400, color: mora > 0 ? C.red : C.muted }}>{mora > 0 ? fmtCOP(mora) : "—"}</td>
                    <td style={{ ...sty.td, fontWeight: 900, color: estado === "pagado" ? C.green : C.red, fontSize: 14, background: estado !== "pagado" ? "rgba(185,28,28,0.06)" : undefined }}>
                      {estado === "pagado" ? <span style={{ color: C.green }}>✓ Saldado</span> : fmtCOP(deudaTotal)}
                    </td>
                    <td style={{ ...sty.td, textAlign: "center", fontWeight: dm > 0 ? 800 : 400, color: dm > 0 ? C.red : C.muted }}>{dm > 0 ? `${dm}d` : "—"}</td>
                    <td style={{ ...sty.td, textAlign: "center", fontSize: 16 }}>{tipo ? alertIcons[tipo] : "—"}</td>
                    <td style={{ ...sty.td, whiteSpace: "nowrap" }}>{fmtDate(c.fechaPago)}</td>
                    <td style={sty.td}><StatusBadge estado={estado} /></td>
                    <td style={sty.td}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {estado !== "pagado"
                          ? <button style={{ ...sty.btnSm, background: C.greenBg, color: C.green, fontWeight: 800, fontSize: 11, border: `1px solid ${C.greenBorder}` }} onClick={() => setConfirmId(c.cuotaId)}>✓ Pagar</button>
                          : <button style={{ ...sty.btnSm, background: C.redBg, color: C.red, fontSize: 11 }} onClick={() => deshacerPago(c.cuotaId)}>↩ Anular</button>
                        }
                        <button 
                          style={{ ...sty.btnSm, background: C.blueBg, color: C.blue, border: `1px solid #93c5fd` }} 
                          onClick={() => exportToPDF(cliente, prestamo, cuotas.filter(x => x.prestamoId === c.prestamoId))}
                          title="Descargar PDF"
                        >
                          📄 PDF
                        </button>
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

// ═══════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════
const sty = {
  pageTitle: { margin: "0 0 24px", fontSize: 28, fontWeight: 900, color: C.text },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  sectionTitle: { margin: "0 0 16px", fontWeight: 800, fontSize: 18, color: C.text },
  label: { display: "block", fontSize: 11, fontWeight: 800, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 },
  input: {
    width: "100%", padding: "10px 14px", border: `2px solid ${C.border}`, borderRadius: 8,
    fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff", color: C.text,
    fontFamily: "inherit",
  },
  btnPrimary: { padding: "11px 24px", background: C.blue, color: "white", border: "none", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 14 },
  btnOutline: { padding: "11px 24px", background: "white", color: C.text, border: `2px solid ${C.border}`, borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14 },
  btnSm: { padding: "6px 14px", background: "#f1f5f9", border: `1px solid ${C.border}`, borderRadius: 7, cursor: "pointer", fontSize: 13, marginRight: 4 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "12px 14px", textAlign: "left", fontSize: 10, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap" },
  td: { padding: "12px 14px", verticalAlign: "middle" },
  rowInfo: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14 },
};

const appStyles = {
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

// ═══════════════════════════════════════════════════════
//  ROOT APP
// ═══════════════════════════════════════════════════════
export default function App() {
  const [clientes, saveCliente, delCliente, loadedC] = useSupabaseStore("clientes", {
    clienteId: "cliente_id", nombre: "nombre", apellido: "apellido", cc: "cc", domicilio: "domicilio", telefono: "telefono"
  });
  const [prestamos, savePrestamo, delPrestamo, loadedP] = useSupabaseStore("prestamos", {
    prestamoId: "prestamo_id", cliente_id: "cliente_id", importe: "importe", modalidad: "modalidad", 
    numeroCuotas: "numero_cuotas", importeCuota: "importe_cuota", totalAPagar: "total_a_pagar", fechaInicio: "fecha_inicio"
  });
  // Mapping for cuotas
  const [cuotas, saveCuota, delCuota, loadedQ] = useSupabaseStore("cuotas", {
     cuotaId: "cuota_id", prestamoId: "prestamo_id", clienteId: "cliente_id",
     numeroCuota: "numero_cuota", fechaVencimiento: "fecha_vencimiento",
     importeCuota: "importe_cuota", estado: "estado", fechaPago: "fecha_pago"
  });
  const [configs, saveConfig, , loadedK] = useSupabaseStore("config", {
     id: "id", value: "value"
  });

  const [tab, setTab] = useState("dashboard");

  const capitalInicial = configs.find(x => x.id === "capital_inicial")?.value || 0;

  const handleSetCapital = (val) => {
    saveConfig({ id: "capital_inicial", value: val });
  };

  const prevAlertsCount = useRef(0);

  useEffect(() => {
    const alertas = cuotas.filter(c => getAlertType(c) !== null);
    if (alertas.length > prevAlertsCount.current) {
      toast.warn(`💰 ¡Nueva alerta de mora! Tienes ${alertas.length} cuotas pendientes.`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
      playAlertSound();
    }
    prevAlertsCount.current = alertas.length;
  }, [cuotas]);

  if (!loadedC || !loadedP || !loadedQ || !loadedK) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "monospace", color: C.muted, flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 32 }}>💰</div>
        <div>Cargando datos…</div>
      </div>
    );
  }

  const alertas = cuotas.filter(c => getAlertType(c) !== null);

  const tabs = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "capital",   icon: "💼", label: "Capital Propio" },
    { id: "clientes",  icon: "👥", label: "Clientes" },
    { id: "nuevo",     icon: "➕", label: "Nuevo Préstamo" },
    { id: "estados",   icon: "📋", label: "Estado de Cuentas" },
  ];

  return (
    <div style={appStyles.root} className="app-root">
      <style>{`
        @media (max-width: 768px) {
          .app-root { flex-direction: column !important; overflow: auto !important; }
          .app-sidebar { width: 100% !important; height: auto !important; position: static !important; }
          .app-nav { flex-direction: row !important; overflow-x: auto !important; padding: 8px !important; gap: 8px !important; }
          .app-nav::-webkit-scrollbar { display: none; }
          .app-nav-btn { flex: 1 !important; white-space: nowrap !important; padding: 8px 12px !important; justify-content: center !important; flex-direction: column !important; font-size: 11px !important; height: 60px !important; }
          .app-nav-btn span:first-of-type { font-size: 20px !important; }
          .app-logo { display: none !important; }
          .app-sidebar-footer { display: none !important; }
          .app-main { padding: 12px !important; height: auto !important; overflow: visible !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .form-grid { grid-template-columns: 1fr !important; }
          .table-scroll { margin: 0 -12px !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
          h1 { font-size: 20px !important; }
        }
      `}</style>
      {/* ─ Sidebar ─ */}
      <aside style={appStyles.sidebar} className="app-sidebar">
        <div style={appStyles.logo} className="app-logo">
          <span style={appStyles.logoIcon}>💰</span>
          <div>
            <div style={appStyles.logoTitle}>Préstamos Pro</div>
            <div style={appStyles.logoSub}>Gestión de créditos</div>
          </div>
        </div>

        <nav style={appStyles.nav} className="app-nav">
          {tabs.map(t => (
            <button
              key={t.id}
              style={{ ...appStyles.navBtn, ...(tab === t.id ? appStyles.navBtnActive : {}) }}
              onClick={() => setTab(t.id)}
              className="app-nav-btn"
            >
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              <span>{t.label}</span>
              {t.id === "estados" && alertas.length > 0 && (
                <span style={appStyles.badge}>{alertas.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={appStyles.sidebarFooter} className="app-sidebar-footer">
          <div style={appStyles.statsRow}><span>Clientes</span><strong style={{ color: "rgba(255,255,255,0.8)" }}>{clientes.length}</strong></div>
          <div style={appStyles.statsRow}><span>Préstamos</span><strong style={{ color: "rgba(255,255,255,0.8)" }}>{prestamos.length}</strong></div>
          <div style={appStyles.statsRow}><span>Cuotas</span><strong style={{ color: "rgba(255,255,255,0.8)" }}>{cuotas.length}</strong></div>
        </div>
      </aside>

      {/* ─ Main ─ */}
      <main style={appStyles.main} className="app-main">
        {tab === "dashboard" && <Dashboard clientes={clientes} prestamos={prestamos} cuotas={cuotas} alertas={alertas} />}
        {tab === "capital"   && <CapitalPropio prestamos={prestamos} cuotas={cuotas} capitalInicial={capitalInicial} setCapitalInicial={handleSetCapital} />}
        {tab === "clientes"  && <Clientes clientes={clientes} saveCliente={saveCliente} delCliente={delCliente} />}
        {tab === "nuevo"     && <NuevoPrestamo clientes={clientes} prestamos={prestamos} savePrestamo={savePrestamo} cuotas={cuotas} saveCuota={saveCuota} />}
        {tab === "estados"   && <Estados clientes={clientes} prestamos={prestamos} cuotas={cuotas} saveCuota={saveCuota} />}
      </main>
      <ToastContainer />
    </div>
  );
}
