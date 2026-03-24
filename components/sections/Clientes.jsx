import { useState } from "react";
import { C, sty } from "../../styles/theme";
import { genId } from "../../utils/helpers";
import { Card, Inp } from "../ui";

const EMPTY_CLIENTE = { nombre: "", apellido: "", cc: "", domicilio: "", telefono: "" };

export function Clientes({ clientes, saveCliente, delCliente }) {
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
        placeholder="Buscar por nombre, código o CC..."
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
