// ═══════════════════════════════════════════════════════
//  DESIGN TOKENS & STYLES
// ═══════════════════════════════════════════════════════

export const C = {
  primary: "#3f3f3f", secondary: "#7b7b7b",
  accent: "#bd8d67", copper: "#bd8d67", 
  bg: "#faf9f6", card: "#ffffff", border: "#e8e6e1",
  text: "#2a2a2a", muted: "#8a8883",
  red: "#cf4444", green: "#3c8c5c",
  redBg: "#fdf2f2", greenBg: "#f0fdf4",
  redBorder: "#fecaca", greenBorder: "#bbf7d0",
  shadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
  shadowLg: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
};

export const sty = {
  container: { maxWidth: 1200, margin: "0 auto", padding: "0 20px" },
  pageTitle: { fontSize: 32, fontWeight: 900, marginBottom: 30, color: C.primary, letterSpacing: "-0.05em" },
  input: {
    width: "100%", padding: "14px 18px", borderRadius: 12, outline: "none",
    border: `1.5px solid ${C.border}`, background: "#fdfdfb", fontSize: 15,
    transition: "all 0.2s ease"
  },
  label: { fontSize: 13, fontWeight: 700, marginBottom: 8, display: "block", color: C.secondary },
  btnPrimary: {
    padding: "14px 28px", borderRadius: 12, border: "none", background: C.accent,
    color: "white", cursor: "pointer", fontWeight: 800, fontSize: 15, transition: "all 0.2s ease",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10
  },
  btnOutline: {
    padding: "12px 24px", borderRadius: 12, border: `1.5px solid ${C.border}`,
    background: "transparent", color: C.primary, cursor: "pointer", fontWeight: 700, fontSize: 14,
    transition: "all 0.2s ease"
  },
  rowInfo: { display: "flex", justifyContent: "space-between", fontSize: 14, padding: "4px 0" },
};

export const appStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; font-family: 'Montserrat', sans-serif; }
  body { background: ${C.bg}; color: ${C.text}; margin: 0; }
  input:focus { border-color: ${C.accent} !important; background: white !important; box-shadow: 0 0 0 4px rgba(189,141,103,0.1); }
  button:hover { filter: brightness(1.05); transform: translateY(-1px); }
  button:active { transform: translateY(0); }
  .card-compact:hover { transform: translateY(-3px); box-shadow: ${C.shadowLg} !important; }
`;
