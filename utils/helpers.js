// ═══════════════════════════════════════════════════════
//  HELPERS & FORMATTERS
// ═══════════════════════════════════════════════════════

export const fmtCOP = n =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

export const fmtDate = str => {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
};

export const todayStr = () => new Date().toISOString().split("T")[0];

export const addPeriod = (dateStr, modalidad, n) => {
  const d = new Date(dateStr + "T12:00:00");
  if (modalidad === "diario")    d.setDate(d.getDate() + n);
  else if (modalidad === "semanal")   d.setDate(d.getDate() + 7 * n);
  else if (modalidad === "quincenal") d.setDate(d.getDate() + 15 * n);
  else if (modalidad === "mensual")   d.setMonth(d.getMonth() + n);
  return d.toISOString().split("T")[0];
};

export const PERIODO_DIAS = { diario: 1, semanal: 7, quincenal: 15, mensual: 30 };

export const calcDiasMora = fv => {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const v   = new Date(fv + "T00:00:00");
  const d   = Math.floor((hoy - v) / 86400000);
  return d > 0 ? d : 0;
};

export const calcDiasHasta = fv => {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const v   = new Date(fv + "T00:00:00");
  return Math.floor((v - hoy) / 86400000);
};

export const calcMoraAcum = (importeCuota, modalidad, fechaVenc, estadoCuota) => {
  if (estadoCuota === "pagado") return 0;
  const dias = calcDiasMora(fechaVenc);
  if (dias <= 0) return 0;
  const moraDiaria = (importeCuota * 0.10) / (PERIODO_DIAS[modalidad] || 30);
  return moraDiaria * dias;
};

export const getEstado = c => {
  if (c.estado === "pagado") return "pagado";
  return calcDiasMora(c.fechaVencimiento) > 0 ? "mora" : "pendiente";
};

export const getAlertType = c => {
  if (c.estado === "pagado") return null;
  const dh = calcDiasHasta(c.fechaVencimiento);
  const dm = calcDiasMora(c.fechaVencimiento);
  if (dm > 3)        return "mora";
  if (dm > 0)        return "mora-reciente";
  if (dh === 0)      return "hoy";
  if (dh > 0 && dh <= 3) return "proximo";
  return null;
};

export const genId = (prefix, arr, field) => {
  const nums = arr.map(x => parseInt((x[field] || "").replace(/\D/g, "") || "0"));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
};

export function playAlertSound() {
  const audio = new Audio('/sounds/notification.mp3');
  audio.play().catch(e => console.log('Audio auto-play blocked', e));
}
