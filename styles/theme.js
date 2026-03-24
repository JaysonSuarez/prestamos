// ═══════════════════════════════════════════════════════
//  DESIGN TOKENS & STYLES (REVERTED TO 8c249fe LOOK)
// ═══════════════════════════════════════════════════════

export const C = {
  sidebar: "#16213e", sidebarActive: "#0f3460", sidebarHover: "#1a2744",
  accent: "#e94560", accentMid: "#0f3460",
  bg: "#f0f4f8", card: "#ffffff", border: "#e2e8f0",
  text: "#1e293b", muted: "#64748b",
  green: "#15803d", greenBg: "#dcfce7", greenBorder: "#86efac",
  yellow: "#92400e", yellowBg: "#fef3c7", yellowBorder: "#fcd34d",
  red: "#b91c1c",   redBg: "#fee2e2",   redBorder: "#fca5a5",
  blue: "#1d4ed8",  blueBg: "#dbeafe",
  shadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
  shadowLg: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
};

export const sty = {
  pageTitle: { margin: "0 0 24px", fontSize: 28, fontWeight: 900, color: C.text },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  sectionTitle: { margin: "0 0 16px", fontWeight: 800, fontSize: 18, color: C.text },
  label: { display: "block", fontSize: 11, fontWeight: 800, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 },
  input: {
    width: "100%", padding: "10px 14px", border: `2px solid ${C.border}`, borderRadius: 8,
    fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff", color: C.text,
    fontFamily: "inherit",
  },
  btnPrimary: { padding: "11px 24px", background: C.blue, color: "white", border: "none", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 14, transition: "0.2s" },
  btnOutline: { padding: "11px 24px", background: "white", color: C.text, border: `2px solid ${C.border}`, borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14, transition: "0.2s" },
  btnSm: { padding: "6px 14px", background: "#f1f5f9", border: `1px solid ${C.border}`, borderRadius: 7, cursor: "pointer", fontSize: 13, marginRight: 4, transition: "0.15s" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "12px 14px", textAlign: "left", fontSize: 10, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap" },
  td: { padding: "12px 14px", verticalAlign: "middle" },
  rowInfo: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14 },
};

export const appStyles = `
  * { box-sizing: border-box; font-family: 'Segoe UI', system-ui, sans-serif; }
  body { background: ${C.bg}; color: ${C.text}; margin: 0; }
  .app-nav-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important; }
  .app-nav-btn:hover { background: rgba(255,255,255,0.05) !important; color: white !important; transform: translateX(4px); }
  .card-compact:hover { transform: translateY(-3px); box-shadow: ${C.shadowLg} !important; }
  
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
`;
