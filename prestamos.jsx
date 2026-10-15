"use client";
import React, { useState, useEffect, useRef } from "react";

import {
  LayoutDashboard,
  Wallet,
  UsersRound,
  Plus,
  ReceiptText,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Search,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  CheckCheck,
  Clock,
  TriangleAlert,
  Banknote,
  CalendarDays,
  Download,
  Trash2,
  Pencil,
  Phone,
  MapPin,
  Info,
  TrendingUp,
  ShieldCheck,
  LogOut,
  SlidersHorizontal,
  UserRound,
  FileText,
  Coins,
  History,
  ChartNoAxesCombined,
  RotateCcw,
  Menu,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { toast as notify } from "react-toastify";
import { useSupabaseStore } from "./hooks/useSupabaseStore";
import {
  fmtCOP as cop,
  fmtDate as fd,
  todayStr,
  addPeriod,
  calcDiasMora,
  calcDiasHasta,
  getEstado,
  calcMoraAcum,
  PERIODO_DIAS,
  genId,
  playAlertSound,
} from "./utils/helpers";
import { exportToPDF } from "./services/pdfExport";

const nav = [
  ["dashboard", "Dashboard", LayoutDashboard, "Inicio"],
  ["capital", "Capital propio", Wallet, "Capital"],
  ["clientes", "Clientes", UsersRound, "Clientes"],
  ["nuevo", "Nuevo préstamo", Plus, "Prestar"],
  ["cuentas", "Estado de cuentas", ReceiptText, "Cuentas"],
];
const initials = (c) => `${c?.nombre?.[0] || ""}${c?.apellido?.[0] || ""}`;
const full = (c) => (c ? `${c.nombre} ${c.apellido}` : "Cliente no disponible");
function Badge({ type, children }) {
  return (
    <span className={"badge " + (type || "neutral")}>
      <span />
      {children ||
        {
          pagado: "Pagado",
          mora: "En mora",
          pendiente: "Pendiente",
          hoy: "Vence hoy",
          activo: "Activo",
        }[type] ||
        type}
    </span>
  );
}
function Button({ children, icon: Icon, onClick, kind = "", ...rest }) {
  return (
    <button
      type="button"
      className={"button " + kind}
      onClick={onClick}
      {...rest}
    >
      {Icon && <Icon size={17} />}
      {children}
    </button>
  );
}
function Metric({ label, value, note, icon: Icon, tone = "", onClick }) {
  return (
    <div className={"metric " + tone}>
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">
          <Icon size={18} />
        </span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
      {onClick && (
        <button
          className="metric-link"
          onClick={onClick}
          aria-label={"Ver " + label}
        >
          <ArrowUpRight size={17} />
        </button>
      )}
    </div>
  );
}
function Heading({ kicker, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
function Person({ c, subtitle }) {
  return (
    <div className="person">
      <span className="avatar">{initials(c) || "?"}</span>
      <div>
        <strong>{full(c)}</strong>
        <small>{subtitle || c?.clienteId}</small>
      </div>
    </div>
  );
}
function Empty({
  title = "No hay resultados",
  description = "Prueba con otros filtros.",
}) {
  return (
    <div className="empty">
      <Search />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null),
    previous = useRef(
      typeof document !== "undefined" ? document.activeElement : null,
    );
  useEffect(() => {
    ref.current?.querySelector("button,input,select")?.focus();
    const listener = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const all = [
          ...ref.current.querySelectorAll("button,input,select,a,textarea"),
        ].filter((e) => !e.disabled);
        if (e.shiftKey && document.activeElement === all[0]) {
          e.preventDefault();
          all.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === all.at(-1)) {
          e.preventDefault();
          all[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", listener);
      document.body.style.overflow = before;
      previous.current?.focus();
    };
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar ventana"
          >
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export default function App({ user }) {
  const [clientes, saveCliente, delCliente, loadedC, refreshClientes, errorC] =
    useSupabaseStore("clientes", {
      clienteId: "cliente_id",
      cc: "cc",
      nombre: "nombre",
      apellido: "apellido",
      telefono: "telefono",
      domicilio: "domicilio",
    });
  const [
    prestamos,
    savePrestamo,
    delPrestamo,
    loadedP,
    refreshPrestamos,
    errorP,
  ] = useSupabaseStore("prestamos", {
    prestamoId: "prestamo_id",
    cliente_id: "cliente_id",
    importe: "importe",
    modalidad: "modalidad",
    numeroCuotas: "numero_cuotas",
    importeCuota: "importe_cuota",
    totalAPagar: "total_a_pagar",
    fechaInicio: "fecha_inicio",
  });
  const [cuotas, saveCuota, delCuota, loadedCu, refreshCuotas, errorCu] =
    useSupabaseStore("cuotas", {
      cuotaId: "cuota_id",
      prestamoId: "prestamo_id",
      clienteId: "cliente_id",
      numeroCuota: "numero_cuota",
      fechaVencimiento: "fecha_vencimiento",
      importeCuota: "importe_cuota",
      estado: "estado",
      fechaPago: "fecha_pago",
    });

  const [configs, saveConfig, , loadedK, refreshConfig, errorK] =
    useSupabaseStore("config", { id: "id", value: "value" });

  const capital = configs.find((x) => x.id === "capital_inicial")?.value || 0;

  const saveCapital = async (val) => {
    await saveConfig({ id: "capital_inicial", value: val });
  };

  if (!loadedC || !loadedP || !loadedCu || !loadedK)
    return (
      <div className="app-loading" role="status">
        <Brand />
        <span className="loading-spinner" />
        <p>Cargando tu cartera...</p>
      </div>
    );
  if (errorC || errorP || errorCu || errorK)
    return (
      <div className="app-loading" role="alert">
        <Brand />
        <p>
          No se pudo cargar tu cartera. Verifica la conexión e intenta de nuevo.
        </p>
        <button
          className="button lime"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </div>
    );
  return (
    <Portfolio
      user={user}
      clientes={clientes}
      saveCliente={saveCliente}
      delCliente={delCliente}
      prestamos={prestamos}
      savePrestamo={savePrestamo}
      delPrestamo={delPrestamo}
      cuotas={cuotas}
      saveCuota={saveCuota}
      capital={capital}
      saveCapital={saveCapital}
      refreshCuotas={refreshCuotas}
      refreshPrestamos={refreshPrestamos}
    />
  );
}

function Portfolio({
  user,
  clientes,
  saveCliente,
  delCliente,
  prestamos,
  savePrestamo,
  delPrestamo,
  cuotas,
  saveCuota,
  capital,
  saveCapital,
  refreshCuotas,
  refreshPrestamos,
}) {
  const [tab, setTab] = useState("dashboard"),
    [filter, setFilter] = useState("todos"),
    [clientFilter, setClientFilter] = useState(""),
    [search, setSearch] = useState(""),
    [dialog, setDialog] = useState(null),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  async function runAction(action) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setToast(
        "No se pudo completar la operación: " +
          (error?.message || "Intenta de nuevo."),
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function signOut() {
    await runAction(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    });
  }
  const [capitalFocus, setCapitalFocus] = useState("caja"),
    [capitalStatus, setCapitalStatus] = useState("todos");
  const [form, setForm] = useState({
      clienteId: "",
      importe: "",
      modalidad: "mensual",
      numeroCuotas: 12,
      fechaInicio: todayStr(),
    }),
    [step, setStep] = useState(1),
    [errors, setErrors] = useState({});
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4300);
      return () => clearTimeout(t);
    }
  }, [toast]);
  function go(id, opts = {}) {
    if (busyRef.current) return;
    setTab(id);
    setSearch("");
    setDialog(null);
    if (id === "cuentas") {
      setFilter(opts.filter || "todos");
      setClientFilter(opts.client || "");
    }
    if (id === "nuevo" && opts.client) {
      setForm((f) => ({ ...f, clienteId: opts.client }));
      setStep(1);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const client = (id) => clientes.find((c) => c.clienteId === id),
    parts = (p) =>
      cuotas
        .filter((c) => c.prestamoId === p.prestamoId)
        .sort((a, b) => a.numeroCuota - b.numeroCuota),
    active = (p) => parts(p).some((c) => c.estado !== "pagado"),
    activeLoans = prestamos.filter(active),
    unpaid = (p) => parts(p).filter((c) => c.estado !== "pagado"),
    loanMora = (p) =>
      unpaid(p).reduce(
        (s, c) =>
          s +
          calcMoraAcum(p.importe, p.modalidad, c.fechaVencimiento, c.estado),
        0,
      ),
    received = (p) =>
      parts(p)
        .filter((c) => c.estado === "pagado")
        .reduce((s, c) => s + c.importeCuota, 0);
  const cobrado = cuotas
      .filter((c) => c.estado === "pagado")
      .reduce((s, c) => s + c.importeCuota, 0),
    original = prestamos.reduce((s, p) => s + p.importe, 0),
    caja = capital - original + cobrado;
  const invertido = activeLoans.reduce(
    (s, p) =>
      s +
      p.importe -
      received(p) * (p.totalAPagar > 0 ? p.importe / p.totalAPagar : 0),
    0,
  );
  const intereses = activeLoans.reduce(
    (s, p) =>
      s +
      unpaid(p).reduce(
        (a, c) =>
          a +
          c.importeCuota *
            (p.totalAPagar > 0
              ? (p.totalAPagar - p.importe) / p.totalAPagar
              : 0) +
          calcMoraAcum(p.importe, p.modalidad, c.fechaVencimiento, c.estado),
        0,
      ),
    0,
  );
  const esperado = prestamos.reduce((s, p) => s + p.totalAPagar - p.importe, 0),
    historico = prestamos.reduce((s, p) => s + p.totalAPagar, 0),
    neto = caja + invertido + intereses - capital,
    retorno = capital > 0 ? (neto / capital) * 100 : 0,
    liquidezBaja = caja < capital * 0.15;
  const pendiente = activeLoans.reduce(
      (s, p) => s + unpaid(p).reduce((a, c) => a + c.importeCuota, 0),
      0,
    ),
    moraTotal = activeLoans.reduce((s, p) => s + loanMora(p), 0);
  const pendingRows = activeLoans
    .map((p) => ({ p, c: unpaid(p)[0], cli: client(p.cliente_id) }))
    .sort((a, b) => a.c.fechaVencimiento.localeCompare(b.c.fechaVencimiento));
  const todayRows = pendingRows.filter(
      (r) => r.c.fechaVencimiento === todayStr(),
    ),
    lateRows = pendingRows.filter((r) => getEstado(r.c) === "mora");
  const alertRows = cuotas
    .filter(
      (c) => c.estado !== "pagado" && calcDiasHasta(c.fechaVencimiento) <= 3,
    )
    .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
  const previousAlerts = useRef(0);
  useEffect(() => {
    if (alertRows.length > previousAlerts.current) {
      notify.warn("Tienes cuotas pendientes de seguimiento.");
      playAlertSound();
    }
    previousAlerts.current = alertRows.length;
  }, [alertRows.length]);
  function loanState(p) {
    const pp = parts(p);
    return pp.length && pp.every((c) => c.estado === "pagado")
      ? "pagado"
      : unpaid(p).some((c) => getEstado(c) === "mora")
        ? "mora"
        : "activo";
  }
  function download(p) {
    const cli = client(p.cliente_id);
    if (!cli) {
      setToast("El cliente de este préstamo ya no está registrado.");
      return;
    }
    exportToPDF(cli, p, cuotas);
    setToast("Estado de cuenta PDF generado.");
  }
  function deleteLoan(p) {
    setDialog({ type: "deleteLoan", p });
  }
  function loanActions(p) {
    return (
      <div className="action-row">
        <Button icon={Download} onClick={() => download(p)}>
          PDF
        </Button>
        <Button icon={Trash2} kind="danger-ghost" onClick={() => deleteLoan(p)}>
          Eliminar
        </Button>
      </div>
    );
  }
  function status(c) {
    return getEstado(c) === "mora"
      ? "mora"
      : c.fechaVencimiento === todayStr()
        ? "hoy"
        : "pendiente";
  }
  function detailButton(p) {
    return (
      <button
        className="text-button"
        onClick={() => setDialog({ type: "loan", p })}
      >
        Ver detalle <ChevronRight size={15} />
      </button>
    );
  }
  function dashboard() {
    const totalActive = activeLoans.reduce((s, p) => s + p.importe, 0),
      totalCollect = activeLoans.reduce((s, p) => s + p.totalAPagar, 0);
    return (
      <>
        <Heading
          kicker="EL PULSO DE TU CARTERA"
          title="Tu negocio, en una mirada."
          description="Qué tienes, qué has cobrado y qué necesita atención hoy."
        >
          <Button kind="primary" icon={Plus} onClick={() => go("nuevo")}>
            Nuevo préstamo
          </Button>
        </Heading>
        <section className="overview-hero">
          <div>
            <span className="hero-label">Dinero en caja</span>
            <div className={"hero-value " + (caja < 0 ? "negative" : "")}>
              {cop(caja)}
              <small>COP</small>
            </div>
            <p>Disponible según tu capital, desembolsos y pagos recibidos.</p>
            <button className="hero-link" onClick={() => go("capital")}>
              Entender mi capital <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="hero-today">
            <div className="hero-today-icon">
              <CalendarDays />
            </div>
            <div>
              <small>PARA HOY</small>
              <strong>
                {todayRows.length}{" "}
                {todayRows.length === 1 ? "cobro vence" : "cobros vencen"} hoy
              </strong>
              <span>
                {cop(todayRows.reduce((s, r) => s + r.c.importeCuota, 0))} en
                próximas cuotas
              </span>
            </div>
            <Button
              kind="lime"
              icon={ArrowRight}
              onClick={() => go("cuentas", { filter: "hoy" })}
            >
              Revisar
            </Button>
          </div>
        </section>
        <div className="metrics-grid dashboard-metrics">
          <Metric
            label="Clientes"
            value={clientes.length}
            note={`${activeLoans.length} préstamos activos`}
            icon={UsersRound}
            onClick={() => go("clientes")}
          />
          <Metric
            label="Capital prestado"
            value={cop(totalActive)}
            note="Importe original de los préstamos activos"
            icon={Wallet}
          />
          <Metric
            label="Total a cobrar"
            value={cop(totalCollect)}
            note="Capital + intereses de préstamos activos"
            icon={TrendingUp}
          />
          <Metric
            label="Cobrado"
            value={cop(cobrado)}
            note="Pagos recibidos de todos los préstamos"
            tone="green"
            icon={CheckCheck}
          />
          <Metric
            label="Por cobrar"
            value={cop(pendiente)}
            note="Cuotas pendientes de préstamos activos"
            icon={Clock}
          />
          <Metric
            label="Interés mora"
            value={cop(moraTotal)}
            note="Mora acumulada de las cuotas vencidas"
            tone="red"
            icon={TriangleAlert}
            onClick={() => go("cuentas", { filter: "mora" })}
          />
        </div>
        <div className="two-columns">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Primero, lo que necesita atención</h2>
                <p>Próxima cuota de cada préstamo, por vencimiento.</p>
              </div>
              <span className="count">{pendingRows.length}</span>
            </div>
            {pendingRows.length ? (
              pendingRows.slice(0, 4).map(({ p, c, cli }) => (
                <div className="agenda-row" key={p.prestamoId}>
                  <Person
                    c={cli}
                    subtitle={`${p.prestamoId} · Cuota ${c.numeroCuota} de ${p.numeroCuotas}`}
                  />
                  <div className="agenda-money">
                    <strong>{cop(c.importeCuota)}</strong>
                    <Badge type={status(c)} />
                  </div>
                  <button
                    className="icon-button"
                    aria-label={"Ver préstamo de " + full(cli)}
                    onClick={() => setDialog({ type: "loan", p })}
                  >
                    <ChevronRight />
                  </button>
                </div>
              ))
            ) : (
              <Empty
                title="Todo al día"
                description="No hay próximas cuotas pendientes."
              />
            )}
            <Button
              kind="text full"
              icon={ArrowRight}
              onClick={() => go("cuentas")}
            >
              Ir a estado de cuentas
            </Button>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Alertas activas</h2>
                <p>Cuotas vencidas, de hoy y de los próximos 3 días.</p>
              </div>
              <span className="count">{alertRows.length}</span>
            </div>
            {alertRows.length ? (
              alertRows.slice(0, 4).map((c) => {
                const p = prestamos.find((p) => p.prestamoId === c.prestamoId);
                return (
                  <button
                    className={
                      "alert-row " + (getEstado(c) === "mora" ? "late" : "soon")
                    }
                    key={c.cuotaId}
                    onClick={() => setDialog({ type: "loan", p })}
                  >
                    <span className="alert-symbol">
                      {getEstado(c) === "mora" ? (
                        <TriangleAlert size={17} />
                      ) : (
                        <CalendarDays size={17} />
                      )}
                    </span>
                    <span>
                      <strong>
                        {getEstado(c) === "mora"
                          ? `${calcDiasMora(c.fechaVencimiento)} días en mora`
                          : c.fechaVencimiento === todayStr()
                            ? "Vence hoy"
                            : "Vence pronto"}
                      </strong>
                      <small>
                        {full(client(c.clienteId))} · {cop(c.importeCuota)}
                      </small>
                      <small>
                        {c.cuotaId} · {fd(c.fechaVencimiento)}
                      </small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                );
              })
            ) : (
              <Empty
                title="Sin alertas"
                description="No hay vencimientos cercanos ni cuotas en mora."
              />
            )}
          </section>
        </div>
      </>
    );
  }
  function capitalPage() {
    const selected = {
      capital: {
        label: "Mi capital total",
        icon: Wallet,
        value: capital,
        note: "El dinero propio que has destinado al negocio.",
        rows: [["Capital configurado", capital]],
        explanation:
          "Es el valor que ingresas en Actualizar capital. Sirve como punto de partida para calcular la caja y la rentabilidad.",
      },
      invertido: {
        label: "Capital invertido (OUT)",
        icon: ArrowUpRight,
        value: invertido,
        note: "El principal que sigue en manos de tus clientes.",
        rows: activeLoans.map((p) => [
          p.prestamoId + " · " + full(client(p.cliente_id)),
          p.importe -
            received(p) * (p.totalAPagar > 0 ? p.importe / p.totalAPagar : 0),
        ]),
        explanation:
          "Se estima el principal pendiente de cada préstamo activo: capital original menos pagos recibidos multiplicados por la proporción de capital del préstamo.",
      },
      caja: {
        label: "Dinero en caja",
        icon: Banknote,
        value: caja,
        note: "El saldo disponible según los movimientos del negocio.",
        rows: [
          ["Mi capital total", capital],
          ["− Capital prestado histórico", -original],
          ["+ Cobrado de todos los préstamos", cobrado],
        ],
        explanation:
          "La caja incluye pagos recibidos de todos los préstamos. Un valor negativo refleja un faltante de liquidez según los registros actuales.",
      },
      intereses: {
        label: "Intereses por cobrar",
        icon: Coins,
        value: intereses,
        note: "Intereses pendientes y mora acumulada de préstamos activos.",
        rows: activeLoans.map((p) => [
          p.prestamoId + " · " + full(client(p.cliente_id)),
          unpaid(p).reduce(
            (s, c) =>
              s +
              c.importeCuota *
                (p.totalAPagar > 0
                  ? (p.totalAPagar - p.importe) / p.totalAPagar
                  : 0) +
              calcMoraAcum(
                p.importe,
                p.modalidad,
                c.fechaVencimiento,
                c.estado,
              ),
            0,
          ),
        ]),
        explanation:
          "Incluye la proporción de interés de las cuotas no pagadas y su mora acumulada. Es una proyección, no dinero disponible.",
      },
      ganancia: {
        label: "Ganancia esperada",
        icon: TrendingUp,
        value: esperado,
        note: "Intereses proyectados de todos los préstamos, activos y saldados.",
        rows: prestamos.map((p) => [
          p.prestamoId + " · " + full(client(p.cliente_id)),
          p.totalAPagar - p.importe,
        ]),
        explanation:
          "Para cada préstamo se resta el capital original al total a pagar. Esta cifra histórica no equivale a ganancia ya recibida ni al saldo neto actual.",
      },
      historico: {
        label: "Histórico cartera",
        icon: History,
        value: historico,
        note: "Todo lo prestado en capital e intereses, desde el inicio.",
        rows: prestamos.map((p) => [
          p.prestamoId + " · " + full(client(p.cliente_id)),
          p.totalAPagar,
        ]),
        explanation:
          "Suma el total a pagar de todos los préstamos registrados. Incluye créditos activos y saldados.",
      },
    }[capitalFocus];
    const FocusIcon = selected.icon,
      position = Math.max(caja, 0) + Math.max(invertido, 0),
      cashShare = position > 0 ? (Math.max(caja, 0) / position) * 100 : 0;
    const capitalVisible = prestamos.filter(
      (p) =>
        capitalStatus === "todos" ||
        (capitalStatus === "activos" && active(p)) ||
        (capitalStatus === "saldados" && !active(p)),
    );
    function explore(id) {
      setCapitalFocus(id);
      requestAnimationFrame(() =>
        document
          .getElementById("capital-explorer")
          ?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "instant"
              : "smooth",
            block: "start",
          }),
      );
    }
    return (
      <>
        <Heading
          kicker="TU CAPITAL, EN MOVIMIENTO"
          title="Haz que cada peso cuente."
          description="Explora tu liquidez, tu inversión y el detalle detrás de cada cifra."
        >
          <Button
            icon={SlidersHorizontal}
            onClick={() => setDialog({ type: "capital" })}
          >
            Actualizar capital
          </Button>
        </Heading>
        <section className="capital-hero">
          <div className="capital-hero-main">
            <div className="capital-hero-label">
              <span className="hero-wallet">
                <Wallet size={18} />
              </span>
              <span>Dinero en caja</span>
              <span className={"cash-state " + (liquidezBaja ? "low" : "")}>
                {liquidezBaja ? "Liquidez baja" : "Caja sana"}
              </span>
            </div>
            <div
              className={
                "capital-hero-value " + (caja < 0 ? "cash-negative" : "")
              }
            >
              {cop(caja)}
              <small>COP</small>
            </div>
            <p>
              Disponible para nuevos préstamos según los movimientos de tu
              negocio.
            </p>
            <button
              className="capital-hero-action"
              onClick={() => explore("caja")}
            >
              ¿Cómo se calcula mi caja? <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="capital-hero-health">
            <div className="capital-health-caption">
              <TrendingUp size={17} />
              <span>SALUD FINANCIERA</span>
            </div>
            <small>
              {neto > 0
                ? "Estás en ganancia"
                : neto < 0
                  ? "Estás en pérdida"
                  : "Punto de equilibrio"}
            </small>
            <strong className={neto < 0 ? "cash-negative" : ""}>
              {neto > 0 ? "+" : ""}
              {cop(neto)}
            </strong>
            <div className="capital-return">
              <span>Rentabilidad actual</span>
              <b>
                {retorno.toFixed(1)}% <ArrowUpRight size={14} />
              </b>
            </div>
            <button onClick={() => setDialog({ type: "financial" })}>
              Ver cálculo de rentabilidad <ChevronRight size={14} />
            </button>
          </div>
        </section>
        <div className={"capital-liquidity " + (liquidezBaja ? "warning" : "")}>
          <span>
            {liquidezBaja ? (
              <TriangleAlert size={18} />
            ) : (
              <ShieldCheck size={18} />
            )}
          </span>
          <div>
            <strong>
              {liquidezBaja
                ? "Recupera liquidez antes de volver a prestar."
                : "Tu caja tiene liquidez para operar."}
            </strong>
            <p>
              {liquidezBaja
                ? "No prestes más hasta recuperar capital. La caja está por debajo del 15% de tu capital total."
                : "La caja se encuentra por encima del umbral de alerta del sistema."}
            </p>
          </div>
          <button onClick={() => go("cuentas")}>
            Ver cobros <ArrowRight size={15} />
          </button>
        </div>
        <div className="capital-section-heading">
          <div>
            <h2>Tu capital, desde cada ángulo</h2>
            <p>Toca una cifra para explorar su composición.</p>
          </div>
          <span className="capital-live">
            <span />
            Calculado con tus registros
          </span>
        </div>
        <div className="capital-tiles">
          {[
            [
              "capital",
              "Mi capital total",
              capital,
              "Capital total destinado al negocio",
              Wallet,
              "purple",
            ],
            [
              "invertido",
              "Capital invertido (OUT)",
              invertido,
              "Principal que está en manos de clientes",
              ArrowUpRight,
              "blue",
            ],
            [
              "caja",
              "Dinero en caja",
              caja,
              "Liquidez disponible para nuevos préstamos",
              Banknote,
              caja < 0 ? "red" : "green",
            ],
            [
              "intereses",
              "Intereses por cobrar",
              intereses,
              "Ganancia proyectada activa, incluida la mora",
              Coins,
              "amber",
            ],
            [
              "ganancia",
              "Ganancia esperada",
              esperado,
              "Total de intereses proyectados de todos los tiempos",
              TrendingUp,
              "green",
            ],
            [
              "historico",
              "Histórico cartera",
              historico,
              "Suma bruta total (capital + interés) prestada",
              History,
              "slate",
            ],
          ].map(([id, label, value, note, Icon, tone]) => (
            <button
              key={id}
              className={
                "capital-tile " +
                tone +
                (capitalFocus === id ? " selected" : "")
              }
              aria-pressed={capitalFocus === id}
              aria-controls="capital-explorer"
              onClick={() => explore(id)}
            >
              <div className="capital-tile-top">
                <span className="capital-tile-icon">
                  <Icon size={19} />
                </span>
                <ArrowUpRight size={15} />
              </div>
              <span className="capital-tile-label">{label}</span>
              <strong>{cop(value)}</strong>
              <p>{note}</p>
              <span className="capital-tile-bottom">
                {capitalFocus === id
                  ? "Explorando esta cifra"
                  : "Ver composición"}
                {capitalFocus === id ? (
                  <Check size={13} />
                ) : (
                  <ChevronRight size={13} />
                )}
              </span>
            </button>
          ))}
        </div>
        <div className="capital-explore-layout">
          <section
            className="panel capital-explorer"
            id="capital-explorer"
            aria-live="polite"
          >
            <div className="capital-explorer-heading">
              <span className="capital-explorer-icon">
                <FocusIcon size={21} />
              </span>
              <div>
                <small>DETRÁS DE LA CIFRA</small>
                <h2>{selected.label}</h2>
              </div>
            </div>
            <p className="capital-explorer-note">{selected.note}</p>
            <div className="capital-explorer-rows" key={capitalFocus}>
              {selected.rows.length ? (
                selected.rows.map(([label, value], i) => (
                  <div key={label + i}>
                    <span>{label}</span>
                    <strong>
                      {value < 0 ? "− " + cop(Math.abs(value)) : cop(value)}
                    </strong>
                  </div>
                ))
              ) : (
                <p>No hay préstamos que compongan esta cifra.</p>
              )}
              <div className="capital-explorer-total">
                <span>{selected.label}</span>
                <strong className={selected.value < 0 ? "red-text" : ""}>
                  {cop(selected.value)}
                </strong>
              </div>
            </div>
            <p className="capital-explainer">
              <Info size={16} />
              {selected.explanation}
            </p>
            {capitalFocus === "capital" && (
              <Button
                icon={Pencil}
                kind="text"
                onClick={() => setDialog({ type: "capital" })}
              >
                Actualizar mi capital
              </Button>
            )}
            {["invertido", "intereses"].includes(capitalFocus) && (
              <Button
                icon={ReceiptText}
                kind="text"
                onClick={() => go("cuentas")}
              >
                Revisar préstamos activos
              </Button>
            )}
          </section>
          <section className="panel capital-position">
            <div className="panel-heading">
              <div>
                <h2>¿Dónde está tu dinero?</h2>
                <p>Caja y principal pendiente de recuperar.</p>
              </div>
            </div>
            <div
              className="capital-position-ring"
              style={{ "--cash-share": cashShare + "%" }}
              role="img"
              aria-label={`${cashShare.toFixed(1)}% de la suma de caja positiva y capital pendiente está en caja.`}
            >
              <div>
                <Wallet size={20} />
                <strong>{cashShare.toFixed(1)}%</strong>
                <small>en caja</small>
              </div>
            </div>
            <div className="position-legend">
              <button onClick={() => explore("caja")}>
                <span className="position-dot cash" />
                <span>Dinero en caja</span>
                <strong className={caja < 0 ? "red-text" : ""}>
                  {cop(caja)}
                </strong>
                <ChevronRight size={14} />
              </button>
              <button onClick={() => explore("invertido")}>
                <span className="position-dot invested" />
                <span>Capital invertido</span>
                <strong>{cop(invertido)}</strong>
                <ChevronRight size={14} />
              </button>
            </div>
            <p className="capital-position-note">
              {caja < 0
                ? "La caja es negativa y se representa como 0% en el gráfico. El importe real se conserva arriba."
                : "Distribución de caja + principal pendiente. No representa el capital inicial ni incluye intereses futuros."}
            </p>
          </section>
        </div>
        <div className="capital-section-heading capital-loans-heading">
          <div>
            <h2>Tu cartera, préstamo a préstamo</h2>
            <p>Explora los créditos que dan forma a tu capital.</p>
          </div>
          <div
            className="capital-loan-tabs"
            aria-label="Filtrar resumen de préstamos"
          >
            {[
              ["todos", "Todos"],
              ["activos", "Activos"],
              ["saldados", "Saldados"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={capitalStatus === id}
                className={capitalStatus === id ? "selected" : ""}
                onClick={() => setCapitalStatus(id)}
              >
                {label}
                <span>
                  {id === "todos"
                    ? prestamos.length
                    : id === "activos"
                      ? activeLoans.length
                      : prestamos.length - activeLoans.length}
                </span>
              </button>
            ))}
          </div>
        </div>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Resumen por préstamo</h2>
              <p>Capital prestado, interés y cobros de cada crédito.</p>
            </div>
            <span className="count">{capitalVisible.length}</span>
          </div>
          <div className="desktop-table">
            <table>
              <thead>
                <tr>
                  {[
                    "Préstamo",
                    "Cliente",
                    "Capital prestado",
                    "Interés",
                    "Cobrado",
                    "Estado",
                    "Acciones",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {capitalVisible.map((p) => (
                  <tr key={p.prestamoId}>
                    <td>
                      <button
                        className="id-link"
                        onClick={() => setDialog({ type: "loan", p })}
                      >
                        {p.prestamoId}
                      </button>
                    </td>
                    <td>
                      <strong>{full(client(p.cliente_id))}</strong>
                      <small>{p.cliente_id}</small>
                    </td>
                    <td>{cop(p.importe)}</td>
                    <td>{cop(p.totalAPagar - p.importe)}</td>
                    <td className="green-text">{cop(received(p))}</td>
                    <td>
                      <Badge type={active(p) ? "activo" : "pagado"}>
                        {active(p) ? "Activo" : "Saldado"}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="icon-button danger"
                        aria-label={"Eliminar " + p.prestamoId}
                        onClick={() => deleteLoan(p)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobile-cards">
            {capitalVisible.map((p) => (
              <article className="mini-loan" key={p.prestamoId}>
                <div className="row-between">
                  <strong>{p.prestamoId}</strong>
                  <Badge type={active(p) ? "activo" : "pagado"}>
                    {active(p) ? "Activo" : "Saldado"}
                  </Badge>
                </div>
                <p>
                  {full(client(p.cliente_id))} <small>· {p.cliente_id}</small>
                </p>
                <div className="mini-values">
                  <div>
                    <small>Capital prestado</small>
                    <strong>{cop(p.importe)}</strong>
                  </div>
                  <div>
                    <small>Interés</small>
                    <strong>{cop(p.totalAPagar - p.importe)}</strong>
                  </div>
                  <div>
                    <small>Cobrado</small>
                    <strong className="green-text">{cop(received(p))}</strong>
                  </div>
                </div>
                <div className="row-between">
                  {detailButton(p)}
                  <button
                    className="icon-button danger"
                    aria-label={"Eliminar " + p.prestamoId}
                    onClick={() => deleteLoan(p)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!capitalVisible.length && (
            <Empty
              title="No hay préstamos"
              description="Los nuevos préstamos aparecerán aquí."
            />
          )}
        </section>
      </>
    );
  }

  function clientsPage() {
    const filtered = clientes.filter((c) =>
      (full(c) + " " + c.clienteId + " " + c.cc)
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
    return (
      <>
        <Heading
          kicker="PERSONAS DETRÁS DE CADA PRÉSTAMO"
          title="Clientes"
          description="Todos sus datos y su relación con tu cartera, en un lugar."
        >
          <Button
            kind="primary"
            icon={Plus}
            onClick={() => setDialog({ type: "clientForm" })}
          >
            Nuevo cliente
          </Button>
        </Heading>
        <section className="panel">
          <div className="toolbar">
            <label className="search">
              <Search size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre, código o cédula"
                aria-label="Buscar clientes"
              />
              {search && (
                <button
                  aria-label="Limpiar búsqueda"
                  onClick={() => setSearch("")}
                >
                  <X size={15} />
                </button>
              )}
            </label>
            <small>
              {filtered.length} de {clientes.length} clientes
            </small>
          </div>
          <div className="desktop-table">
            <table>
              <thead>
                <tr>
                  {[
                    "Código",
                    "Nombre completo",
                    "CC / Cédula",
                    "Teléfono",
                    "Domicilio",
                    "Acciones",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.clienteId}>
                    <td>
                      <button
                        className="id-link"
                        onClick={() => setDialog({ type: "client", c })}
                      >
                        {c.clienteId}
                      </button>
                    </td>
                    <td>
                      <Person
                        c={c}
                        subtitle={`${prestamos.filter((p) => p.cliente_id === c.clienteId).length} préstamos`}
                      />
                    </td>
                    <td>{c.cc}</td>
                    <td>{c.telefono || "—"}</td>
                    <td className="wrap-cell">{c.domicilio || "—"}</td>
                    <td>
                      <div className="action-row">
                        <button
                          className="icon-button"
                          aria-label={"Editar " + full(c)}
                          onClick={() => setDialog({ type: "clientForm", c })}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={"Ver ficha de " + full(c)}
                          onClick={() => setDialog({ type: "client", c })}
                        >
                          <ChevronRight size={17} />
                        </button>
                        <button
                          className="icon-button danger"
                          aria-label={"Eliminar " + full(c)}
                          onClick={() => setDialog({ type: "deleteClient", c })}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobile-cards">
            {filtered.map((c) => (
              <article className="client-card" key={c.clienteId}>
                <div className="row-between">
                  <Person c={c} />
                  <button
                    className="icon-button"
                    aria-label={"Editar " + full(c)}
                    onClick={() => setDialog({ type: "clientForm", c })}
                  >
                    <Pencil size={17} />
                  </button>
                </div>
                <dl>
                  <div>
                    <dt>CC / Cédula</dt>
                    <dd>{c.cc}</dd>
                  </div>
                  <div>
                    <dt>
                      <Phone size={14} /> Teléfono
                    </dt>
                    <dd>{c.telefono || "—"}</dd>
                  </div>
                  <div>
                    <dt>
                      <MapPin size={14} /> Domicilio
                    </dt>
                    <dd>{c.domicilio || "—"}</dd>
                  </div>
                </dl>
                <button
                  className="button full"
                  onClick={() => setDialog({ type: "client", c })}
                >
                  Ver ficha y préstamos <ArrowRight size={16} />
                </button>
              </article>
            ))}
          </div>
          {!filtered.length && <Empty />}
        </section>
      </>
    );
  }
  function accountsPage() {
    const settled = prestamos.filter(
      (p) => parts(p).length && parts(p).every((c) => c.estado === "pagado"),
    );
    let rows =
      filter === "pagado"
        ? settled.map((p) => ({ p, c: null, cli: client(p.cliente_id) }))
        : pendingRows.filter(
            (r) =>
              filter === "todos" ||
              (filter === "hoy" && r.c.fechaVencimiento === todayStr()) ||
              (filter === "mora" && getEstado(r.c) === "mora") ||
              (filter === "pendiente" && getEstado(r.c) === "pendiente"),
          );
    rows = rows.filter(
      (r) =>
        (!clientFilter || r.p.cliente_id === clientFilter) &&
        (full(r.cli) + " " + r.p.prestamoId)
          .toLowerCase()
          .includes(search.toLowerCase()),
    );
    return (
      <>
        <Heading
          kicker="CADA VENCIMIENTO, CADA PAGO"
          title="Estado de cuentas"
          description="Consulta la próxima cuota y el detalle completo de cada préstamo."
        >
          <span className="payments-count">
            <CheckCheck size={17} />
            {cuotas.filter((c) => c.estado === "pagado").length} pagos
            registrados
          </span>
        </Heading>
        <div className="account-summary">
          <button onClick={() => setFilter("hoy")}>
            <CalendarDays />
            <span>
              <small>Vence hoy</small>
              <strong>
                {cop(todayRows.reduce((s, r) => s + r.c.importeCuota, 0))}
              </strong>
              <small>{todayRows.length} próximas cuotas</small>
            </span>
          </button>
          <button onClick={() => setFilter("mora")}>
            <TriangleAlert className="red-text" />
            <span>
              <small>Interés de mora</small>
              <strong className="red-text">{cop(moraTotal)}</strong>
              <small>
                {lateRows.length} préstamos con próxima cuota vencida
              </small>
            </span>
          </button>
          <button onClick={() => setFilter("pagado")}>
            <CheckCheck className="green-text" />
            <span>
              <small>Préstamos saldados</small>
              <strong>{settled.length}</strong>
              <small>Ver totales consolidados</small>
            </span>
          </button>
        </div>
        <section className="panel">
          <div className="filter-tabs" aria-label="Filtrar por estado">
            {[
              ["todos", "Todos", activeLoans.length],
              [
                "pendiente",
                "Pendiente",
                pendingRows.filter((r) => getEstado(r.c) === "pendiente")
                  .length,
              ],
              ["hoy", "Hoy", todayRows.length],
              ["mora", "Mora", lateRows.length],
              ["pagado", "Pagado", settled.length],
            ].map(([v, l, n]) => (
              <button
                className={v === filter ? "selected" : ""}
                key={v}
                onClick={() => setFilter(v)}
                aria-pressed={v === filter}
              >
                {l}
                <span>{n}</span>
              </button>
            ))}
          </div>
          <div className="toolbar accounts-toolbar">
            <label className="search">
              <Search size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar cuentas"
                placeholder="Cliente o código de préstamo"
              />
            </label>
            <label className="client-filter">
              <span className="sr-only">Filtrar por cliente</span>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
              >
                <option value="">Todos los clientes</option>
                {clientes.map((c) => (
                  <option key={c.clienteId} value={c.clienteId}>
                    {full(c)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="results-line">
            <small>
              {rows.length} préstamos ·{" "}
              {filter === "pagado"
                ? "Total consolidado de créditos saldados"
                : "Una próxima cuota por préstamo activo"}
            </small>
            {(clientFilter || search) && (
              <button
                className="text-button"
                onClick={() => {
                  setClientFilter("");
                  setSearch("");
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="desktop-table">
            <table className="accounts-table">
              <thead>
                <tr>
                  {[
                    "Cliente / préstamo",
                    filter === "pagado"
                      ? "Total del préstamo"
                      : "Próxima cuota",
                    "Cuotas",
                    "Deuda total",
                    "Estado",
                    "Acciones",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, c, cli }) => (
                  <tr key={p.prestamoId}>
                    <td>
                      <Person
                        c={cli}
                        subtitle={`${p.prestamoId} · ${p.modalidad}`}
                      />
                    </td>
                    <td>
                      <strong>{cop(c ? c.importeCuota : p.totalAPagar)}</strong>
                      <small>
                        {c ? fd(c.fechaVencimiento) : "Préstamo saldado"}
                      </small>
                    </td>
                    <td>
                      <strong>
                        {parts(p).filter((c) => c.estado === "pagado").length} /{" "}
                        {p.numeroCuotas} pagadas
                      </strong>
                      <div className="progress">
                        <span
                          style={{
                            width:
                              (parts(p).filter((c) => c.estado === "pagado")
                                .length /
                                p.numeroCuotas) *
                                100 +
                              "%",
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <strong>
                        {c
                          ? cop(
                              unpaid(p).reduce(
                                (s, c) => s + c.importeCuota,
                                0,
                              ) + loanMora(p),
                            )
                          : "SALDADO"}
                      </strong>
                      <small>
                        {loanMora(p) > 0
                          ? `Incluye ${cop(loanMora(p))} de mora`
                          : "Sin mora acumulada"}
                      </small>
                    </td>
                    <td>
                      <Badge type={c ? status(c) : "pagado"} />
                    </td>
                    <td>
                      <div className="action-row">
                        {c && (
                          <Button
                            icon={Banknote}
                            kind="primary compact"
                            onClick={() => setDialog({ type: "payment", p, c })}
                          >
                            Cobrar
                          </Button>
                        )}
                        <button
                          className="icon-button"
                          onClick={() => setDialog({ type: "loan", p })}
                          aria-label={"Detalle de " + p.prestamoId}
                        >
                          <ChevronRight size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobile-cards">
            {rows.map(({ p, c, cli }) => (
              <article
                className={
                  "account-card " +
                  (c && getEstado(c) === "mora" ? "overdue" : "")
                }
                key={p.prestamoId}
              >
                <div className="row-between">
                  <small className="loan-code">
                    {p.prestamoId} · {p.modalidad}
                  </small>
                  <Badge type={c ? status(c) : "pagado"} />
                </div>
                <Person c={cli} />
                <div className="account-card-main">
                  <div>
                    <small>{c ? "Próxima cuota" : "Total del préstamo"}</small>
                    <strong>{cop(c ? c.importeCuota : p.totalAPagar)}</strong>
                  </div>
                  <div className="align-right">
                    <small>{c ? "Vencimiento" : "Último pago"}</small>
                    <b>
                      {c
                        ? fd(c.fechaVencimiento)
                        : fd(parts(p).at(-1)?.fechaPago)}
                    </b>
                    <small>
                      {c
                        ? `Cuota ${c.numeroCuota} de ${p.numeroCuotas}`
                        : "Saldado"}
                    </small>
                  </div>
                </div>
                <div className="debt-line">
                  <span>Deuda total</span>
                  <strong>
                    {c
                      ? cop(
                          unpaid(p).reduce((s, c) => s + c.importeCuota, 0) +
                            loanMora(p),
                        )
                      : "SALDADO"}
                  </strong>
                </div>
                <details className="inline-details">
                  <summary>
                    Más información <ChevronDown size={16} />
                  </summary>
                  <dl>
                    <div>
                      <dt>Modalidad</dt>
                      <dd>{p.modalidad}</dd>
                    </div>
                    <div>
                      <dt>Mora acumulada del préstamo</dt>
                      <dd>{cop(loanMora(p))}</dd>
                    </div>
                    <div>
                      <dt>Cuotas pagadas</dt>
                      <dd>
                        {parts(p).filter((c) => c.estado === "pagado").length} /{" "}
                        {p.numeroCuotas}
                      </dd>
                    </div>
                    <div>
                      <dt>Alerta</dt>
                      <dd>
                        {c
                          ? getEstado(c) === "mora"
                            ? `${calcDiasMora(c.fechaVencimiento)} días en mora`
                            : calcDiasHasta(c.fechaVencimiento) <= 3
                              ? "Vence pronto"
                              : "Sin alerta"
                          : "Sin alerta"}
                      </dd>
                    </div>
                    <div>
                      <dt>Fecha de pago</dt>
                      <dd>
                        {c
                          ? c.fechaPago
                            ? fd(c.fechaPago)
                            : "Sin registrar"
                          : fd(parts(p).at(-1)?.fechaPago)}
                      </dd>
                    </div>
                  </dl>
                  {loanActions(p)}
                </details>
                <div className="account-card-actions">
                  {c && (
                    <Button
                      kind="primary"
                      icon={Banknote}
                      onClick={() => setDialog({ type: "payment", p, c })}
                    >
                      Registrar pago
                    </Button>
                  )}
                  <Button
                    icon={FileText}
                    onClick={() => setDialog({ type: "loan", p })}
                  >
                    Detalle
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {!rows.length && (
            <Empty
              title="Sin préstamos en esta vista"
              description="Prueba otro estado o cambia los filtros."
            />
          )}
        </section>
      </>
    );
  }
  const amount = Number(form.importe),
    n = Number(form.numeroCuotas),
    validPreview =
      amount > 0 &&
      Number.isInteger(n) &&
      n >= 1 &&
      n <= 18 &&
      form.fechaInicio,
    months = (n * (PERIODO_DIAS[form.modalidad] || 30)) / 30,
    total = amount + amount * 0.1 * months,
    regular = Math.round(total / n / 50) * 50;
  const schedule = validPreview
    ? Array.from({ length: n }, (_, i) => ({
        numero: i + 1,
        fecha: addPeriod(form.fechaInicio, form.modalidad, i + 1),
        importe: i === 0 ? total - regular * (n - 1) : regular,
      }))
    : [];
  function field(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  }
  function nextStep() {
    const e = {};
    if (step === 1 && !form.clienteId)
      e.clienteId = "Selecciona un cliente para continuar.";
    if (step === 2) {
      if (!(amount > 0)) e.importe = "Ingresa un importe mayor que cero.";
      if (!Number.isInteger(n) || n < 1 || n > 18)
        e.numeroCuotas = "Elige entre 1 y 18 cuotas.";
      if (!form.fechaInicio) e.fechaInicio = "Selecciona la fecha de ingreso.";
      if (validPreview && schedule.some((c) => c.importe <= 0))
        e.importe = "El importe es demasiado bajo para estas cuotas.";
    }
    setErrors(e);
    if (!Object.keys(e).length) setStep((s) => s + 1);
  }
  async function registerLoan() {
    if (
      !validPreview ||
      !client(form.clienteId) ||
      schedule.some((c) => c.importe <= 0)
    )
      return;
    await runAction(async () => {
      const id = genId("PRE", prestamos, "prestamoId");
      await savePrestamo({
        prestamoId: id,
        cliente_id: form.clienteId,
        importe: amount,
        modalidad: form.modalidad,
        numeroCuotas: n,
        importeCuota: regular,
        totalAPagar: total,
        fechaInicio: form.fechaInicio,
      });
      try {
        await saveCuota(
          schedule.map((c) => ({
            cuotaId: `${id}-C${String(c.numero).padStart(2, "0")}`,
            prestamoId: id,
            clienteId: form.clienteId,
            numeroCuota: c.numero,
            fechaVencimiento: c.fecha,
            importeCuota: c.importe,
            estado: "pendiente",
            fechaPago: null,
          })),
        );
      } catch (error) {
        const rollback = await supabase
          .from("prestamos")
          .delete()
          .eq("prestamo_id", id);
        await refreshPrestamos();
        if (rollback.error)
          throw new Error(
            "El préstamo quedó sin un calendario completo. Revisa " +
              id +
              " antes de volver a registrarlo.",
          );
        throw error;
      }
      setForm({
        clienteId: "",
        importe: "",
        modalidad: "mensual",
        numeroCuotas: 12,
        fechaInicio: todayStr(),
      });
      setStep(1);
      setToast(`Préstamo ${id} registrado correctamente.`);
      setTab("cuentas");
      setFilter("todos");
      setClientFilter("");
      setSearch("");
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }
  function newLoan() {
    return (
      <>
        <Heading
          kicker="DE LOS DATOS AL PLAN DE PAGOS"
          title="Nuevo préstamo"
          description="Configura el crédito y revisa cada cuota antes de registrarlo."
        />
        <div className="steps" aria-label="Progreso del préstamo">
          {["Cliente", "Condiciones", "Revisar"].map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <span className="step-line" />}
              <div
                className={
                  "step " +
                  (step === i + 1 ? "current" : step > i + 1 ? "done" : "")
                }
                aria-current={step === i + 1 ? "step" : undefined}
              >
                <b>{step > i + 1 ? <Check size={14} /> : i + 1}</b>
                <span>{label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="loan-layout">
          <section className="panel loan-form">
            {step === 1 ? (
              <>
                <div className="panel-heading">
                  <div>
                    <h2>¿A quién le vas a prestar?</h2>
                    <p>Selecciona un cliente registrado.</p>
                  </div>
                  <UsersRound size={21} />
                </div>
                <label className="field-label">
                  Cliente <span>*</span>
                  <select
                    value={form.clienteId}
                    onChange={(e) => field("clienteId", e.target.value)}
                    aria-invalid={!!errors.clienteId}
                  >
                    <option value="">Seleccionar cliente</option>
                    {clientes.map((c) => (
                      <option value={c.clienteId} key={c.clienteId}>
                        {full(c)} · {c.clienteId}
                      </option>
                    ))}
                  </select>
                </label>
                {errors.clienteId && (
                  <p className="error" role="alert">
                    {errors.clienteId}
                  </p>
                )}
                {form.clienteId && (
                  <div className="selected-client">
                    <Person c={client(form.clienteId)} />
                    <dl>
                      <div>
                        <dt>Cédula</dt>
                        <dd>{client(form.clienteId)?.cc}</dd>
                      </div>
                      <div>
                        <dt>Teléfono</dt>
                        <dd>{client(form.clienteId)?.telefono || "—"}</dd>
                      </div>
                    </dl>
                  </div>
                )}
                <div className="helper">
                  <Info size={17} />
                  <span>
                    ¿Es un cliente nuevo? Registra primero sus datos para
                    asociar el préstamo correctamente.
                  </span>
                </div>
                <Button
                  kind="text"
                  icon={Plus}
                  onClick={() =>
                    setDialog({ type: "clientForm", fromLoan: true })
                  }
                >
                  Registrar un cliente
                </Button>
              </>
            ) : step === 2 ? (
              <>
                <div className="panel-heading">
                  <div>
                    <h2>Define las condiciones</h2>
                    <p>El plan de pagos se actualiza con cada cambio.</p>
                  </div>
                  <SlidersHorizontal size={21} />
                </div>
                <label className="field-label">
                  Importe del crédito · COP <span>*</span>
                  <input
                    className="amount-input"
                    inputMode="numeric"
                    type="number"
                    min="1"
                    value={form.importe}
                    placeholder="Ej. 2000000"
                    onChange={(e) => field("importe", e.target.value)}
                    aria-invalid={!!errors.importe}
                  />
                </label>
                {errors.importe && (
                  <p className="error" role="alert">
                    {errors.importe}
                  </p>
                )}
                <fieldset className="mode-fieldset">
                  <legend>Modalidad de pago</legend>
                  <div className="mode-options">
                    {["diario", "semanal", "quincenal", "mensual"].map((m) => (
                      <button
                        aria-pressed={form.modalidad === m}
                        className={form.modalidad === m ? "selected" : ""}
                        key={m}
                        onClick={() => field("modalidad", m)}
                      >
                        <CalendarDays size={17} />
                        <span>{m}</span>
                        {form.modalidad === m && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="form-grid">
                  <label className="field-label">
                    Número de cuotas
                    <input
                      aria-invalid={!!errors.numeroCuotas}
                      type="number"
                      min="1"
                      max="18"
                      value={form.numeroCuotas}
                      onChange={(e) => field("numeroCuotas", e.target.value)}
                    />
                    <small>De 1 a 18 cuotas</small>
                  </label>
                  <label className="field-label">
                    Fecha de ingreso
                    <input
                      aria-invalid={!!errors.fechaInicio}
                      type="date"
                      value={form.fechaInicio}
                      onChange={(e) => field("fechaInicio", e.target.value)}
                    />
                  </label>
                </div>
                {errors.numeroCuotas && (
                  <p className="error" role="alert">
                    {errors.numeroCuotas}
                  </p>
                )}
                {errors.fechaInicio && (
                  <p className="error" role="alert">
                    {errors.fechaInicio}
                  </p>
                )}
                <div className="helper">
                  <Info size={17} />
                  <span>
                    Configuración actual del sistema: interés simple del 10%
                    mensual. Las cuotas se redondean a $50 y el ajuste se aplica
                    a la primera.
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="panel-heading">
                  <div>
                    <h2>Revisa antes de registrar</h2>
                    <p>Comprueba el cliente y el calendario completo.</p>
                  </div>
                  <ShieldCheck size={22} />
                </div>
                <Person c={client(form.clienteId)} />
                <div className="review-data">
                  <div>
                    <small>Capital</small>
                    <strong>{cop(amount)}</strong>
                  </div>
                  <div>
                    <small>Modalidad</small>
                    <strong>{form.modalidad}</strong>
                  </div>
                  <div>
                    <small>Cuotas</small>
                    <strong>{n}</strong>
                  </div>
                  <div>
                    <small>Fecha de ingreso</small>
                    <strong>{fd(form.fechaInicio)}</strong>
                  </div>
                </div>
                <h3 className="schedule-title">Calendario de pagos</h3>
                <div className="schedule">
                  <div className="schedule-header">
                    <span>Cuota</span>
                    <span>Vencimiento</span>
                    <span>Importe</span>
                  </div>
                  {schedule.map((c) => (
                    <div key={c.numero}>
                      <span>{String(c.numero).padStart(2, "0")}</span>
                      <span>{fd(c.fecha)}</span>
                      <strong>{cop(c.importe)}</strong>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="wizard-actions">
              {step > 1 ? (
                <Button icon={ArrowLeft} onClick={() => setStep((s) => s - 1)}>
                  Atrás
                </Button>
              ) : (
                <Button onClick={() => go("dashboard")}>Cancelar</Button>
              )}
              {step < 3 ? (
                <Button kind="primary" icon={ArrowRight} onClick={nextStep}>
                  Continuar
                </Button>
              ) : (
                <Button
                  kind="primary"
                  icon={Check}
                  disabled={busy}
                  onClick={registerLoan}
                >
                  {busy ? "Registrando..." : "Registrar préstamo"}
                </Button>
              )}
            </div>
          </section>
          <aside className="loan-summary">
            <div className="summary-top">
              <span className="eyebrow">VISTA PREVIA</span>
              <h2>Así queda el crédito</h2>
              <small>Valor de la cuota regular</small>
              <div className="summary-value">
                {validPreview ? cop(regular) : "—"}
              </div>
              <span>
                {validPreview
                  ? `${n} cuotas · Pago ${form.modalidad}`
                  : "Completa las condiciones del crédito"}
              </span>
              <div className="summary-ledger">
                <div>
                  <span>Capital</span>
                  <strong>{validPreview ? cop(amount) : "—"}</strong>
                </div>
                <div>
                  <span>Intereses</span>
                  <strong>{validPreview ? cop(total - amount) : "—"}</strong>
                </div>
                <div>
                  <span>Total a pagar</span>
                  <strong>{validPreview ? cop(total) : "—"}</strong>
                </div>
              </div>
            </div>
            <div className="summary-bottom">
              <ShieldCheck size={18} />
              <p>
                Revisa los datos y el calendario antes de registrar el préstamo.
              </p>
            </div>
            {step === 2 && validPreview && (
              <div className="first-payment">
                <CalendarDays size={19} />
                <div>
                  <small>Primera cuota</small>
                  <strong>{cop(schedule[0].importe)}</strong>
                  <span>{fd(schedule[0].fecha)}</span>
                </div>
              </div>
            )}
          </aside>
        </div>
      </>
    );
  }
  function loanDetails(p) {
    const pp = parts(p),
      next = unpaid(p)[0];
    return (
      <>
        <Person
          c={client(p.cliente_id)}
          subtitle={`${p.prestamoId} · ${p.cliente_id}`}
        />
        <div className="detail-hero">
          <div>
            <small>Deuda total pendiente</small>
            <strong>
              {cop(
                unpaid(p).reduce((s, c) => s + c.importeCuota, 0) + loanMora(p),
              )}
            </strong>
          </div>
          <Badge type={loanState(p)}>
            {loanState(p) === "pagado" ? "Saldado" : undefined}
          </Badge>
        </div>
        <dl className="detail-grid">
          <div>
            <dt>Capital prestado</dt>
            <dd>{cop(p.importe)}</dd>
          </div>
          <div>
            <dt>Total a pagar</dt>
            <dd>{cop(p.totalAPagar)}</dd>
          </div>
          <div>
            <dt>Interés del plan</dt>
            <dd>{cop(p.totalAPagar - p.importe)}</dd>
          </div>
          <div>
            <dt>Cobrado</dt>
            <dd>{cop(received(p))}</dd>
          </div>
          <div>
            <dt>Modalidad</dt>
            <dd>{p.modalidad}</dd>
          </div>
          <div>
            <dt>Fecha de ingreso</dt>
            <dd>{fd(p.fechaInicio)}</dd>
          </div>
          <div>
            <dt>Mora acumulada</dt>
            <dd className={loanMora(p) > 0 ? "red-text" : ""}>
              {cop(loanMora(p))}
            </dd>
          </div>
          <div>
            <dt>Último pago registrado</dt>
            <dd>
              {pp
                .filter((c) => c.fechaPago)
                .map((c) => c.fechaPago)
                .sort()
                .at(-1)
                ? fd(
                    pp
                      .filter((c) => c.fechaPago)
                      .map((c) => c.fechaPago)
                      .sort()
                      .at(-1),
                  )
                : "—"}
            </dd>
          </div>
        </dl>
        <h3 className="schedule-title">Todas las cuotas · {pp.length}</h3>
        <div className="installments">
          {pp.map((c) => (
            <div className="installment" key={c.cuotaId}>
              <div>
                <strong>Cuota {c.numeroCuota}</strong>
                <small>{fd(c.fechaVencimiento)}</small>
              </div>
              <div className="align-right">
                <strong>{cop(c.importeCuota)}</strong>
                <small>
                  {getEstado(c) === "mora"
                    ? `Mora ${cop(calcMoraAcum(p.importe, p.modalidad, c.fechaVencimiento, c.estado))}`
                    : c.fechaPago
                      ? "Pagada " + fd(c.fechaPago)
                      : "Sin pago registrado"}
                </small>
              </div>
              <Badge type={getEstado(c)} />
            </div>
          ))}
        </div>
        <div className={"modal-actions" + (busy ? " is-saving" : "")}>
          {next && (
            <Button
              kind="primary"
              icon={Banknote}
              onClick={() => setDialog({ type: "payment", p, c: next })}
            >
              Cobrar próxima cuota
            </Button>
          )}
          {loanActions(p)}
        </div>
      </>
    );
  }
  function modalContent() {
    if (!dialog) return null;
    const { type, p, c } = dialog;
    return (
      <Modal
        key={type + (p?.prestamoId || c?.clienteId || "")}
        title={
          {
            loan: "Detalle del préstamo",
            payment: "Confirmar pago",
            client: "Ficha del cliente",
            clientForm: c ? "Editar cliente" : "Nuevo cliente",
            capital: "Actualizar capital",
            financial: "Cómo se calcula la salud financiera",
            deleteLoan: "Eliminar préstamo",
            deleteClient: "Eliminar cliente",
          }[type]
        }
        onClose={() => {
          if (!busyRef.current) setDialog(null);
        }}
        wide={type === "loan" || type === "client"}
      >
        {type === "loan" ? (
          loanDetails(p)
        ) : type === "payment" ? (
          <>
            <Person
              c={client(p.cliente_id)}
              subtitle={`${p.prestamoId} · Cuota ${c.numeroCuota} de ${p.numeroCuotas}`}
            />
            <div className="payment-total">
              <small>Total a cobrar en esta cuota</small>
              <strong>
                {cop(
                  c.importeCuota +
                    calcMoraAcum(
                      p.importe,
                      p.modalidad,
                      c.fechaVencimiento,
                      c.estado,
                    ),
                )}
              </strong>
            </div>
            <div className="ledger">
              <div>
                <span>Importe de la cuota</span>
                <strong>{cop(c.importeCuota)}</strong>
              </div>
              <div>
                <span>Mora de esta cuota</span>
                <strong>
                  {cop(
                    calcMoraAcum(
                      p.importe,
                      p.modalidad,
                      c.fechaVencimiento,
                      c.estado,
                    ),
                  )}
                </strong>
              </div>
              <div>
                <span>Fecha de pago</span>
                <strong>{fd(todayStr())}</strong>
              </div>
            </div>
            <div className="helper">
              <Info size={17} />
              <span>
                Confirma cuando hayas recibido el dinero. Se registrarán el
                estado de pago y la fecha de esta cuota.
              </span>
            </div>
            <div className={"modal-actions" + (busy ? " is-saving" : "")}>
              <Button onClick={() => setDialog(null)}>Cancelar</Button>
              <Button
                kind="primary"
                icon={Check}
                onClick={() =>
                  runAction(async () => {
                    await saveCuota({
                      ...c,
                      estado: "pagado",
                      fechaPago: todayStr(),
                    });
                    setDialog(null);
                    setToast("Pago registrado correctamente.");
                  })
                }
              >
                Confirmar pago
              </Button>
            </div>
          </>
        ) : type === "capital" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (busy) return;
              const value = Number(
                new FormData(e.currentTarget).get("capital"),
              );
              runAction(async () => {
                await saveCapital(value);
                setDialog(null);
                setToast("Capital actualizado correctamente.");
              });
            }}
          >
            <p className="muted">
              Ingresa el total de dinero propio destinado al negocio.
            </p>
            <label className="field-label">
              Mi capital total · COP
              <input
                name="capital"
                defaultValue={capital}
                type="number"
                min="0"
                required
                autoFocus
              />
            </label>
            <div className="helper">
              <Info size={17} />
              <span>
                Actualizar este valor recalcula la caja, la ganancia y la
                rentabilidad.
              </span>
            </div>
            <div className="modal-actions">
              <Button onClick={() => setDialog(null)}>Cancelar</Button>
              <button type="submit" className="button primary">
                Guardar capital
              </button>
            </div>
          </form>
        ) : type === "financial" ? (
          <>
            <p className="muted">
              La rentabilidad se calcula con la caja, el capital pendiente y los
              intereses proyectados.
            </p>
            <div className="ledger">
              <div>
                <span>Dinero en caja</span>
                <strong>{cop(caja)}</strong>
              </div>
              <div>
                <span>+ Capital invertido (OUT)</span>
                <strong>{cop(invertido)}</strong>
              </div>
              <div>
                <span>+ Intereses por cobrar</span>
                <strong>{cop(intereses)}</strong>
              </div>
              <div>
                <span>− Mi capital total</span>
                <strong>{cop(capital)}</strong>
              </div>
              <div className="total">
                <span>Saldo neto</span>
                <strong>{cop(neto)}</strong>
              </div>
              <div>
                <span>Rentabilidad actual</span>
                <strong>{retorno.toFixed(1)}%</strong>
              </div>
            </div>
            <p className="context-note">
              Rentabilidad = saldo neto ÷ capital total × 100. La alerta de
              liquidez aparece cuando la caja es inferior al 15% del capital.
            </p>
          </>
        ) : type === "clientForm" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              for (const k in data) data[k] = data[k].trim();
              if (!data.nombre || !data.apellido || !data.cc) return;
              const id = c?.clienteId || genId("CLI", clientes, "clienteId");
              runAction(async () => {
                await saveCliente({ ...(c || {}), clienteId: id, ...data });
                if (dialog.fromLoan) field("clienteId", id);
                setDialog(null);
                setToast(
                  c
                    ? "Datos del cliente actualizados."
                    : "Cliente registrado correctamente.",
                );
              });
            }}
          >
            <p className="form-intro">Los campos con * son obligatorios.</p>
            <div className="form-grid">
              {[
                ["nombre", "Nombre *"],
                ["apellido", "Apellido *"],
                ["cc", "Cédula / CC *"],
                ["telefono", "Teléfono"],
                ["domicilio", "Domicilio"],
              ].map(([key, label]) => (
                <label
                  className={
                    "field-label " + (key === "domicilio" ? "span-full" : "")
                  }
                  key={key}
                >
                  {label}
                  <input
                    name={key}
                    defaultValue={c?.[key] || ""}
                    required={["nombre", "apellido", "cc"].includes(key)}
                    type={key === "telefono" ? "tel" : "text"}
                  />
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <Button onClick={() => setDialog(null)}>Cancelar</Button>
              <button className="button primary" type="submit" disabled={busy}>
                {c ? "Guardar cambios" : "Registrar cliente"}
              </button>
            </div>
          </form>
        ) : type === "client" ? (
          <>
            <Person c={c} />
            <dl className="detail-grid">
              <div>
                <dt>Cédula / CC</dt>
                <dd>{c.cc}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>{c.telefono || "—"}</dd>
              </div>
              <div className="span-full">
                <dt>Domicilio</dt>
                <dd>{c.domicilio || "—"}</dd>
              </div>
            </dl>
            <div className="action-row">
              <Button
                icon={Pencil}
                onClick={() => setDialog({ type: "clientForm", c })}
              >
                Editar datos
              </Button>
              <Button
                icon={Plus}
                kind="primary"
                onClick={() => go("nuevo", { client: c.clienteId })}
              >
                Nuevo préstamo
              </Button>
            </div>
            <h3 className="schedule-title">Préstamos de este cliente</h3>
            {prestamos
              .filter((p) => p.cliente_id === c.clienteId)
              .map((p) => (
                <button
                  className="client-loan"
                  key={p.prestamoId}
                  onClick={() => setDialog({ type: "loan", p })}
                >
                  <div>
                    <strong>{p.prestamoId}</strong>
                    <small>
                      {cop(p.importe)} · {p.modalidad}
                    </small>
                  </div>
                  <Badge type={loanState(p)} />
                  <ChevronRight size={17} />
                </button>
              ))}
            {!prestamos.some((p) => p.cliente_id === c.clienteId) && (
              <Empty
                title="Sin préstamos asociados"
                description="Puedes crear su primer préstamo desde aquí."
              />
            )}
            <Button
              kind="text full"
              icon={ReceiptText}
              onClick={() => go("cuentas", { client: c.clienteId })}
            >
              Ver estado de cuentas
            </Button>
            <div className="modal-actions">
              <Button
                kind="danger-ghost"
                icon={Trash2}
                onClick={() => setDialog({ type: "deleteClient", c })}
              >
                Eliminar cliente
              </Button>
            </div>
          </>
        ) : type === "deleteLoan" || type === "deleteClient" ? (
          <>
            <div className="delete-warning">
              <TriangleAlert />
              <div>
                <strong>
                  {type === "deleteLoan" ? p.prestamoId : full(c)}
                </strong>
                <p>
                  {type === "deleteLoan"
                    ? "Se eliminarán este préstamo y todas sus cuotas."
                    : "Se eliminará la ficha de este cliente."}
                </p>
              </div>
            </div>
            <div className="modal-actions">
              <Button onClick={() => setDialog(null)}>Cancelar</Button>
              <Button
                kind="danger-fill"
                icon={Trash2}
                onClick={() =>
                  runAction(async () => {
                    if (type === "deleteLoan") {
                      const { error } = await supabase
                        .from("cuotas")
                        .delete()
                        .eq("prestamo_id", p.prestamoId);
                      if (error) throw error;
                      await delPrestamo("prestamoId", p.prestamoId);
                      await refreshCuotas();
                    } else await delCliente("clienteId", c.clienteId);
                    setDialog(null);
                    setToast("Registro eliminado correctamente.");
                  })
                }
              >
                Eliminar
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    );
  }
  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <Brand />
          <small className="nav-caption">TU ESPACIO DE TRABAJO</small>
          <nav aria-label="Principal">
            {nav.map(([id, label, Icon, short]) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => go(id)}
                aria-current={tab === id ? "page" : undefined}
              >
                <Icon size={19} />
                <span>{label}</span>
                {id === "cuentas" && alertRows.length > 0 && (
                  <b>{alertRows.length}</b>
                )}
              </button>
            ))}
          </nav>
          <div className="side-bottom">
            <div className="side-quote">
              <ShieldCheck size={20} />
              <strong>Tu capital, bajo control.</strong>
              <p>Una visión clara de cada préstamo y cada cobro.</p>
            </div>
            <div className="sidebar-counts">
              <span>{clientes.length} clientes</span>
              <span>{prestamos.length} préstamos</span>
              <span>{cuotas.length} cuotas</span>
            </div>
            <div className="side-profile">
              <span className="avatar">AD</span>
              <div>
                <strong>
                  {user?.user_metadata?.full_name || "Administrador"}
                </strong>
                <small>{user?.email || "Préstamos Pro"}</small>
              </div>
              <button aria-label="Cerrar sesión" onClick={signOut}>
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <span className="crumb">
              Mi espacio <ChevronRight size={12} />
              <b>{nav.find((t) => t[0] === tab)[1]}</b>
            </span>
            <div className="topbar-right">
              <small>Moneda COP</small>
              <span className="avatar">AD</span>
            </div>
          </header>
          <div className="mobile-header">
            <Brand />
            <span className="avatar">AD</span>
          </div>
          <main aria-busy={busy} className={"page page-" + tab} key={tab}>
            {{
              dashboard,
              capital: capitalPage,
              clientes: clientsPage,
              nuevo: newLoan,
              cuentas: accountsPage,
            }[tab]()}
            <footer>
              <span>Préstamos Pro · Gestión de créditos en COP</span>
              <span>Tu capital, bajo control.</span>
            </footer>
          </main>
        </div>
        <nav className="bottom-nav" aria-label="Navegación móvil">
          {[nav[0], nav[1], nav[3], nav[2], nav[4]].map(
            ([id, label, Icon, short]) => (
              <button
                aria-label={label}
                aria-current={tab === id ? "page" : undefined}
                key={id}
                className={
                  (tab === id ? "active " : "") +
                  (id === "nuevo" ? "nav-create" : "")
                }
                onClick={() => go(id)}
              >
                <span>
                  <Icon size={21} />
                  {id === "cuentas" && lateRows.length > 0 && <i />}
                </span>
                <small>{short}</small>
              </button>
            ),
          )}
        </nav>
      </div>
      {busy && (
        <div className="saving-status" role="status">
          <span className="loading-spinner" />
          Guardando cambios...
        </div>
      )}
      {modalContent()}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
    </>
  );
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <ChartNoAxesCombined size={23} />
      </span>
      <div>
        préstamos<sup>PRO</sup>
        <small>Gestión de créditos</small>
      </div>
    </div>
  );
}
