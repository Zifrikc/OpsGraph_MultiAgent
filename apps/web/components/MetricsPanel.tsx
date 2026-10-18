"use client";
import { Activity, Building2, CircleAlert, CheckCircle2 } from "lucide-react";
import type { Metrics } from "@/lib/useOpsGraph";

export default function MetricsPanel({
  metrics,
  selectedStore,
  onStoreSelect,
}: {
  metrics: Metrics | null;
  selectedStore: string;
  onStoreSelect: (id: string) => void;
}) {
  const stores = metrics?.stores || [];
  const services = (metrics?.services || [])
    .slice()
    .sort((a, b) => b.events - a.events);
  const storeMax = Math.max(1, ...stores.map((item) => item.total));
  const eventMax = Math.max(1, ...services.map((item) => item.events));
  return (
    <div className="metrics-grid">
      <section className="panel metrics-card">
        <div className="panel-heading">
          <div>
            <Building2 size={17} />
            <h2>Connected Stores</h2>
          </div>
          <span className="tag">{stores.length} tiendas</span>
        </div>
        <p className="metrics-intro">
          Selecciona una tienda para simular su tráfico. Comparten servicios de
          identidad, pedidos y pagos.
        </p>
        <div className="metrics-rows">
          {stores.map((item) => (
            <button
              className={`metric-row ${selectedStore === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => onStoreSelect(item.id)}
            >
              <span>
                <strong>{item.label}</strong>
                <small>
                  {item.approved} aprobados · {item.incidents} incidentes
                </small>
              </span>
              <div className="metric-track">
                <i
                  style={{
                    width: `${Math.max(5, (100 * item.total) / storeMax)}%`,
                  }}
                />
              </div>
              <b>{item.total}</b>
            </button>
          ))}
        </div>
      </section>
      <section className="panel metrics-card">
        <div className="panel-heading">
          <div>
            <Activity size={17} />
            <h2>Microservice Activity</h2>
          </div>
          <span className="tag">Datos mock</span>
        </div>
        <p className="metrics-intro">
          Conteos de eventos persistidos, actualizados mientras navegas.{" "}
          {metrics?.scope}
        </p>
        <div className="metrics-rows service-metrics">
          {services.map((item) => (
            <div className="metric-row" key={item.id}>
              <span>
                <strong>{item.label}</strong>
                <small>
                  {item.errors
                    ? `${item.errors} error(es)`
                    : "Sin errores registrados"}
                </small>
              </span>
              <div className="metric-track">
                <i
                  className={item.errors ? "has-error" : ""}
                  style={{
                    width: `${Math.max(3, (100 * item.events) / eventMax)}%`,
                  }}
                />
              </div>
              <b>{item.events}</b>
            </div>
          ))}
        </div>
        <div className="metrics-summary">
          <CheckCircle2 size={15} /> {metrics?.approved || 0} pagos aprobados{" "}
          <CircleAlert size={15} /> {metrics?.incidents || 0} incidentes
        </div>
      </section>
    </div>
  );
}
