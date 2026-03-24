import { useState } from "react";
import { C, sty } from "../../styles/theme";
import { genId } from "../../utils/helpers";
import { Card, Inp } from "../ui";

export function Clientes({ clientes, saveCliente, delCliente }) {
  const [form, setForm] = useState({ clienteId: "", nombre: "", apellido: "", cc: "", telefono: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.nombre || !form.cc) return;
    const cid = genId("CLI", clientes, "clienteId");
    await saveCliente({ ...form, clienteId: cid });
    setForm({ clienteId: "", nombre: "", apellido: "", cc: "", telefono: "" });
  };

  const handleEdit = c => setForm({ ...c });

  return (
    <div>
      <h1 style={sty.pageTitle}>Directorio de Clientes</h1>
      <Card style={{ marginBottom: 32, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
        <Inp label="Nombre" value={form.nombre} onChange={e => set("nombre", e.target.value)} />
        <Inp label="Apellido" value={form.apellido} onChange={e => set("apellido", e.target.value)} />
        <Inp label="Cédula / CC" value={form.cc} onChange={e => set("cc", e.target.value)} />
        <Inp label="WhatsApp / Tel." value={form.telefono} onChange={e => set("telefono", e.target.value)} />
        <div style={{ alignSelf: "end", paddingBottom: 16 }}>
          <button style={sty.btnPrimary} onClick={handleAdd}>💾 Guardar Registro</button>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        {clientes.length === 0 ? <p style={{ color: C.muted, textAlign: "center", gridColumn: "1/-1", padding: 60 }}>No hay clientes registrados aún.</p> : clientes.map(c => (
          <Card key={c.clienteId || c.cc} compact>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>{c.nombre} {c.apellido}</div>
                <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>C.C. {c.cc}</div>
                <div style={{ fontSize: 13, color: C.accent, fontWeight: 700, marginTop: 4 }}>📞 {c.telefono}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...sty.btnOutline, padding: "8px 12px" }} onClick={() => handleEdit(c)}>✎</button>
                <button style={{ ...sty.btnOutline, padding: "8px 12px", border: `1.5px solid ${C.redBorder}`, color: C.red }} onClick={() => delCliente("clienteId", c.clienteId)}>🗑</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
