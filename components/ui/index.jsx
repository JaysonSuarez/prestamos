import { C } from "../../styles/theme";

export const Card = ({ children, style = {}, compact = false }) => (
  <div className={compact ? "card-compact" : ""} style={{ 
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

export const StatusBadge = ({ val }) => {
  const isOk = val === "pagado" || val === "activo" || val === "al día";
  return (
    <span style={{ 
      padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      background: isOk ? C.greenBg : C.redBg, color: isOk ? C.green : C.red 
    }}>
      {val}
    </span>
  );
};

export const Inp = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: "block", color: C.secondary }}>{label}</label>}
    <input style={{
      width: "100%", padding: "14px 18px", borderRadius: 12, outline: "none",
      border: `1.5px solid ${C.border}`, background: "#fdfdfb", fontSize: 15,
      transition: "all 0.2s ease"
    }} {...props} />
  </div>
);
