import { ChartNoAxesCombined } from "lucide-react";

export function AuthFrame({ children }) {
  return (
    <div className="auth-layout">
      <div className="auth-brand">
        <div className="brand">
          <span className="brand-mark">
            <ChartNoAxesCombined size={23} />
          </span>
          <div>
            préstamos<sup>PRO</sup>
            <small>Gestión de créditos</small>
          </div>
        </div>
        <div>
          <span className="eyebrow">TU CAPITAL, EN MOVIMIENTO</span>
          <h1>
            Más claridad.
            <br />
            Mejores decisiones.
          </h1>
          <p>
            Clientes, préstamos y cobros.
            <br />
            Tu negocio, bajo control.
          </p>
        </div>
        <small>Préstamos Pro · Gestión de créditos</small>
      </div>
      <section className="auth-form">{children}</section>
    </div>
  );
}
