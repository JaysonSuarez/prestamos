import { C } from "../../styles/theme";

export const Card = ({ children, style = {} }) => (
  <div className="card-compact" style={{ 
    background: C.card, 
    border: `1px solid ${C.border}`, 
    borderRadius: 16, 
    padding: 24, 
    boxShadow: C.shadow,
    transition: "all 0.3s ease",
    ...style 
  }}>
    {children}
  </div>
);

export const StatusBadge = ({ estado }) => {
  const cfg = {
    pagado:    { bg: C.greenBg,  color: C.green,  icon: "✅", label: "Pagado" },
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

export const Inp = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</label>}
    {children}
  </div>
);
