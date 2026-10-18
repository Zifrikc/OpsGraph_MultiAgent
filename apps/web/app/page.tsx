"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Code2,
  CreditCard,
  ExternalLink,
  GitBranch,
  Layers3,
  Maximize2,
  Network,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Terminal,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import Topology from "@/components/Topology";
import { useOpsGraph } from "@/lib/useOpsGraph";
import { DemoEvent, Phase, Scenario, scenarioLabels } from "@/lib/demo";
const PosScene = dynamic(() => import("@/components/PosScene"), {
  ssr: false,
  loading: () => (
    <div className="pos-scene model-status">Preparando escena 3D…</div>
  ),
});
const products = [
  {
    name: "Studio Headphones",
    sub: "Sonido para crear. Sin distracciones.",
    price: 129,
    icon: "◉",
    color: "violet",
  },
  {
    name: "Everyday Keyboard",
    sub: "Compacto. Preciso. A tu ritmo.",
    price: 89,
    icon: "▦",
    color: "mint",
  },
  {
    name: "Desk Essentials",
    sub: "El pequeño upgrade de tu espacio.",
    price: 39,
    icon: "▱",
    color: "peach",
  },
];
export default function Home() {
  const [view, setView] = useState<"overview" | "checkout" | "events">(
    "overview",
  );
  const [scenario, setScenario] = useState<Scenario>("timeout");
  const backend = useOpsGraph();
  const phase: Phase = backend.sending
    ? "processing"
    : backend.state.phase === "error"
      ? "idle"
      : backend.state.phase;
  const events = backend.state.events;
  const services = backend.graph.services;
  const affected =
    backend.state.incident?.evidence.calculate_blast_radius?.affected || [];
  const analysis = backend.state.incident;

  const [selected, setSelected] = useState("payment-service");
  const [focus, setFocus] = useState(false);
  const [query, setQuery] = useState("");
  const [product, setProduct] = useState(0);
  const [run, setRun] = useState(0);
  const [step, setStep] = useState(0);
  const [payload, setPayload] = useState<DemoEvent | null>(null);
  const [tab, setTab] = useState<"details" | "investigation">("details");
  const [confirm, setConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [notice, setNotice] = useState("");
  const incident = phase === "incident";
  const svc = services.find((s) => s.id === selected) || services[0];
  useEffect(() => {
    if (backend.state.product !== undefined) setProduct(backend.state.product);
    if (backend.state.scenario) setScenario(backend.state.scenario);
  }, [backend.state.product, backend.state.scenario]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    setStep(
      phase === "idle"
        ? 0
        : phase === "processing"
          ? Math.min(
              4,
              Math.max(
                1,
                events.filter((e) => e.traceId === backend.state.paymentId)
                  .length,
              ),
            )
          : 4,
    );
    if (phase === "incident") {
      setSelected("bank-connector");
      setTab("investigation");
    }
  }, [phase, events.length, backend.state.paymentId]);
  async function pay() {
    if (phase === "processing" || !backend.connected) return;
    setRun((r) => r + 1);
    setConfirm(false);
    await backend.pay(scenario, product);
  }
  function reset() {
    if (phase === "processing") {
      setNotice("Espera a que termine la investigación.");
      return;
    }
    backend.reset();
    setStep(0);
    setFocus(false);
    setConfirm(false);
    setPayload(null);
    setNotice(
      "Nueva sesión. La sesión anterior permanece guardada en FalkorDB.",
    );
  }
  async function mitigate() {
    await backend.recover();
    setConfirm(false);
    setFocus(false);
  }
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          { schemaVersion: 1, source: "opsgraph-integrated-demo", events },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "opsgraph-demo-events.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const nav = (id: typeof view, label: string, icon: React.ReactNode) => (
    <button
      className={`nav-item ${view === id ? "active" : ""}`}
      onClick={() => setView(id)}
    >
      {icon}
      <span>{label}</span>
      {id === "events" && events.length > 0 && <small>{events.length}</small>}
    </button>
  );
  return (
    <div className="shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("overview");
          }}
        >
          <span className="brand-symbol">
            <Network size={23} />
          </span>
          <strong>
            opsgraph<span>ai</span>
          </strong>
        </a>
        <div className="workspace">
          <span className="workspace-avatar">O</span>
          <div>
            OpsGraph workspace<small>Hackathon playground</small>
          </div>
          <span className="workspace-chevron">⌄</span>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Navegación principal">
          {nav("overview", "Observabilidad", <Network size={18} />)}
          {nav("checkout", "Payment studio", <CreditCard size={18} />)}
          {nav("events", "Explorador de eventos", <Terminal size={18} />)}
        </nav>
        <div className="sidebar-divider" />
        <div className="nav-caption">ENTORNO</div>
        <div className="environment">
          <span className="dot mint-dot" />
          Demo local <span className="tiny-tag">MOCK</span>
        </div>
        <div className="environment">
          <GitBranch size={14} />8 servicios simulados
        </div>
        <div className="sidebar-bottom">
          <div className="demo-callout">
            <Sparkles size={19} />
            <strong>Una compra. Toda la historia.</strong>
            <p>
              Explora cómo un evento conecta servicios, evidencia y decisiones.
            </p>
            <button
              onClick={() =>
                setView(view === "checkout" ? "overview" : "checkout")
              }
            >
              {view === "checkout"
                ? "Ver observabilidad"
                : "Iniciar una compra"}
              <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="profile">
            <span className="avatar">OG</span>
            <div>
              Demo operator<small>Entorno de demostración</small>
            </div>
            <span className="dot mint-dot" />
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <span>
              {view === "overview"
                ? "Observabilidad"
                : view === "checkout"
                  ? "Payment studio"
                  : "Eventos"}
            </span>
          </div>
          <div className="topbar-actions">
            <span className="local-status">
              <span className="dot mint-dot" />
              {backend.connected
                ? "FalkorDB conectado · pagos ficticios"
                : "Backend desconectado"}
            </span>
            <span className="topbar-divider" />
            <span className="avatar small">OG</span>
          </div>
        </header>
        <div className="page-content">
          {backend.error && (
            <div className="connection-banner" role="alert">
              {backend.error}
            </div>
          )}
          {backend.state.phase === "error" && (
            <div className="connection-banner" role="alert">
              La investigación se interrumpió. Los eventos quedaron guardados.
              Inicia otra sesión para reintentar.
            </div>
          )}

          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {view === "checkout"
                  ? "PAYMENT PLAYGROUND"
                  : view === "events"
                    ? "EVENT STREAM"
                    : "CONNECTED OPERATIONS"}
              </div>
              <h1>
                {view === "overview"
                  ? "Cada servicio cuenta una historia."
                  : view === "checkout"
                    ? "Una compra que conecta todo."
                    : "Del clic a la evidencia."}
              </h1>
              <p>
                {view === "overview"
                  ? "Sigue las dependencias. Entiende el impacto. Decide con contexto."
                  : view === "checkout"
                    ? "Inicia un pago de prueba y observa su recorrido en tiempo real."
                    : "Eventos generados en este navegador, listos para inspeccionar y compartir."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="button secondary icon-button"
                title="Reiniciar demo"
                aria-label="Reiniciar demo"
                onClick={reset}
              >
                <RotateCcw size={16} />
              </button>
              <button
                className="button primary"
                onClick={() =>
                  view === "checkout"
                    ? setView("overview")
                    : setView("checkout")
                }
              >
                {view === "checkout" ? (
                  <Network size={16} />
                ) : (
                  <Play size={15} />
                )}{" "}
                {view === "checkout" ? "Ver dashboard" : "Simular un pago"}
              </button>
            </div>
          </div>
          {view === "overview" && (
            <>
              <div className="stats-grid">
                <Stat
                  label="Servicios monitoreados"
                  value={String(backend.graph.services.length).padStart(2, "0")}
                  note="Topología de demostración"
                  icon={<Layers3 size={18} />}
                />
                <Stat
                  label="Estado del sistema"
                  value={incident ? "Degradado" : "Operativo"}
                  note={
                    incident
                      ? `${affected.length} servicios en la ruta afectada`
                      : "Todos los servicios disponibles"
                  }
                  tone={incident ? "danger" : "mint"}
                  icon={<Activity size={18} />}
                />
                <Stat
                  label="Incidentes abiertos"
                  value={incident ? "01" : "00"}
                  note={
                    phase === "resolved"
                      ? "Incidente resuelto en la demo"
                      : "Sesión actual"
                  }
                  tone={incident ? "danger" : ""}
                  icon={<TriangleAlert size={18} />}
                />
                <Stat
                  label="Eventos de la sesión"
                  value={String(events.length).padStart(2, "0")}
                  note={
                    events.length
                      ? "Traza disponible en el explorador"
                      : "Esperando tu primera compra"
                  }
                  icon={<Zap size={18} />}
                />
              </div>
              <div
                className={`observability-layout ${expanded ? "map-expanded" : ""}`}
              >
                <section className="panel graph-panel">
                  <div className="panel-heading">
                    <div>
                      <Network size={17} />
                      <h2>Mapa de servicios</h2>
                      <span className="tag">8 nodos</span>
                    </div>
                    <div>
                      <label className="focus-toggle">
                        <input
                          type="checkbox"
                          checked={focus}
                          disabled={!incident}
                          onChange={(e) => setFocus(e.target.checked)}
                        />
                        <span />
                        Ruta afectada
                      </label>
                      <button
                        className="plain-button"
                        title="Ampliar mapa"
                        aria-label="Ampliar mapa"
                        onClick={() => setExpanded(!expanded)}
                      >
                        {expanded ? <X size={17} /> : <Maximize2 size={17} />}
                      </button>
                    </div>
                  </div>
                  <div className="graph-context">
                    <span className="live-pill">
                      <span
                        className={`dot ${incident ? "red-dot" : "mint-dot"}`}
                      />
                      {incident ? "Incidente activo" : "Sistema saludable"}
                    </span>
                    <span>
                      commerce-demo <ChevronRight size={12} /> dependencies
                    </span>
                  </div>
                  <Topology
                    graph={backend.graph}
                    affected={affected}
                    incident={incident}
                    selected={selected}
                    onSelect={(id) => {
                      setSelected(id);
                      setTab("details");
                    }}
                    focus={focus}
                  />
                  <div className="graph-footer">
                    <div>
                      <span className="legend">
                        <i className="mint-dot" />
                        Saludable
                      </span>
                      <span className="legend">
                        <i className="amber-dot" />
                        Impactado
                      </span>
                      <span className="legend">
                        <i className="red-dot" />
                        Origen del error
                      </span>
                    </div>
                    <span>Selecciona un servicio para explorar</span>
                  </div>
                </section>
                <aside className="panel inspector">
                  <div className="inspector-tabs">
                    <button
                      className={tab === "details" ? "selected" : ""}
                      onClick={() => setTab("details")}
                    >
                      Servicio
                    </button>
                    <button
                      className={tab === "investigation" ? "selected" : ""}
                      onClick={() => setTab("investigation")}
                    >
                      Investigación{" "}
                      {incident && <span className="dot red-dot" />}
                    </button>
                  </div>
                  {tab === "details" ? (
                    <>
                      <div className="service-heading">
                        <span
                          className={`service-icon ${incident && affected.includes(selected) ? "danger" : ""}`}
                        >
                          <Box size={23} />
                        </span>
                        <span
                          className={`badge ${incident && affected.includes(selected) ? "danger" : "mint"}`}
                        >
                          {incident && affected.includes(selected)
                            ? "Degradado"
                            : "Saludable"}
                        </span>
                        <h2>{svc.label}</h2>
                        <code>{svc.id}</code>
                      </div>
                      <div className="detail-list">
                        <Detail label="Responsable" value={svc.owner} />
                        <Detail label="Categoría" value={svc.kind} />
                        <Detail
                          label="Latencia simulada"
                          value={
                            incident && affected.includes(selected)
                              ? "5,000 ms"
                              : `${svc.latency} ms`
                          }
                        />
                        <Detail label="Entorno" value="commerce-demo" />
                      </div>
                      <div className="inspector-section">
                        <h3>Dependencias y contexto</h3>
                        <p>
                          Las flechas siguen la dirección consumidor →
                          dependencia. Selecciona un nodo para conocer su estado
                          en este escenario.
                        </p>
                      </div>
                      <div className="inspector-note">
                        <ShieldCheck size={17} />
                        <span>
                          Datos locales de demostración. Sin conexión con
                          infraestructura real.
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="investigation">
                      {incident || phase === "resolved" ? (
                        <>
                          <div className="incident-title">
                            <span
                              className={`badge ${incident ? "danger" : "mint"}`}
                            >
                              {incident ? "P1 · ACTIVO" : "RESUELTO"}
                            </span>
                            <code>INC-{analysis?.id.slice(0, 8)}</code>
                          </div>
                          <h2>El banco no responde</h2>
                          <p>
                            La autorización superó el tiempo de espera
                            configurado.
                          </p>
                          <div className="agent-step">
                            <span className="agent-icon">
                              <Sparkles size={15} />
                            </span>
                            <div>
                              <h3>
                                Triage Agent <small>MCP</small>
                              </h3>
                              <p>
                                {affected.length} servicios en la ruta afectada.
                                Origen observado: <b>bank-connector</b>.
                              </p>
                              <button
                                className="text-button"
                                onClick={() => {
                                  setFocus(true);
                                  setSelected("bank-connector");
                                }}
                              >
                                Ver ruta de impacto <ArrowRight size={13} />
                              </button>
                            </div>
                          </div>
                          <div className="agent-step">
                            <span className="agent-icon">
                              <Search size={15} />
                            </span>
                            <div>
                              <h3>
                                Investigator <small>MCP</small>
                              </h3>
                              <p>
                                {analysis?.summary.summary ||
                                  "Recopilando evidencia desde FalkorDB…"}
                              </p>
                              <span className="evidence-tag">
                                Síntesis:{" "}
                                {analysis?.provider_status || "pendiente"}
                              </span>
                            </div>
                          </div>
                          <details className="evidence-details">
                            <summary>
                              Herramientas y fuentes (
                              {analysis?.steps.length || 0})
                            </summary>
                            {analysis?.steps.map((entry, i) => (
                              <div key={i}>
                                <strong>
                                  {entry.agent} · {entry.tool}
                                </strong>
                                <small>{entry.mode}</small>
                                <code>{entry.result.ref}</code>
                              </div>
                            ))}
                            {analysis?.summary.uncertainties?.map((text) => (
                              <p key={text}>{text}</p>
                            ))}
                          </details>
                          <div className="runbook">
                            <div>
                              <Code2 size={16} />
                              <span>RB-007 · Recuperar conector</span>
                            </div>
                            <p>
                              Simular cambio a proveedor alternativo y
                              restablecer la salud del servicio.
                            </p>
                            <button
                              className="button primary"
                              disabled={!incident}
                              onClick={() => setConfirm(true)}
                            >
                              {incident
                                ? "Revisar acción simulada"
                                : "Recuperación completada"}
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="empty-investigation">
                          <ShieldCheck size={36} />
                          <h3>Todo en calma</h3>
                          <p>
                            Ejecuta un pago con el escenario de timeout para
                            explorar el diagnóstico guiado.
                          </p>
                          <button
                            className="button secondary"
                            onClick={() => setView("checkout")}
                          >
                            Ir a Payment studio
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </aside>
              </div>
              <section className="panel activity-panel">
                <div className="panel-heading">
                  <div>
                    <Activity size={17} />
                    <h2>Actividad reciente</h2>
                    <span className="tag">Esta sesión</span>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setView("events")}
                  >
                    Ver todos los eventos <ArrowRight size={14} />
                  </button>
                </div>
                {events.length ? (
                  <div className="activity-list">
                    {events
                      .slice(-4)
                      .reverse()
                      .map((event) => (
                        <button
                          className="activity-row"
                          key={event.id}
                          onClick={() => setPayload(event)}
                        >
                          <span
                            className={`event-icon ${event.type.includes("timeout") || event.type === "incident.opened" ? "danger" : ""}`}
                          >
                            <CircleDot size={15} />
                          </span>
                          <div>
                            <strong>{event.type}</strong>
                            <span>{event.service}</span>
                          </div>
                          <time>{formatTime(event.timestamp)}</time>
                          <ChevronRight size={15} />
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="empty-activity">
                    <span className="empty-icon">
                      <Activity size={22} />
                    </span>
                    <div>
                      <strong>Tu primer evento empieza con una compra</strong>
                      <p>
                        Abre Payment studio y sigue el recorrido de un pago por
                        todo el sistema.
                      </p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setView("checkout")}
                    >
                      Comenzar <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </section>
            </>
          )}
          {view === "checkout" && (
            <>
              <div className="studio-layout">
                <section className="panel shop-panel">
                  <div className="panel-heading">
                    <div>
                      <ShoppingBag size={17} />
                      <h2>La tienda de prueba</h2>
                    </div>
                    <span className="tag">SANDBOX</span>
                  </div>
                  <div className="shop-intro">
                    <span className="eyebrow">CURATED FOR YOUR EVERYDAY</span>
                    <h2>
                      Pequeñas cosas.
                      <br />
                      Grandes ideas.
                    </h2>
                    <p>Elige un producto para iniciar el recorrido.</p>
                  </div>
                  <div className="products">
                    {products.map((p, i) => (
                      <button
                        key={p.name}
                        disabled={phase === "processing"}
                        className={`product ${product === i ? "chosen" : ""}`}
                        onClick={() => setProduct(i)}
                      >
                        <div className={`product-art ${p.color}`}>
                          <span>{p.icon}</span>
                          {product === i && (
                            <i>
                              <Check size={13} />
                            </i>
                          )}
                        </div>
                        <div>
                          <strong>{p.name}</strong>
                          <small>{p.sub}</small>
                          <b>${p.price}.00</b>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="order-total">
                    <span>
                      Total de prueba <small>1 producto · USD</small>
                    </span>
                    <strong>
                      ${products[product].price}
                      <small>.00</small>
                    </strong>
                  </div>
                  <div className="mock-card">
                    <CreditCard size={21} />
                    <div>
                      Tarjeta de demostración
                      <small>MOCK •••• 4242 · No requiere datos reales</small>
                    </div>
                    <ShieldCheck size={18} />
                  </div>
                </section>
                <section className="panel pos-panel">
                  <div className="panel-heading">
                    <div>
                      <Box size={17} />
                      <h2>Terminal interactivo</h2>
                    </div>
                    <span className="tag">
                      <span className="dot mint-dot" /> 3D ASSET
                    </span>
                  </div>
                  <div className="pos-stage">
                    <div className="pos-orbit" />
                    <PosScene playing={phase === "processing"} run={run} />
                    <div className="scene-hint">
                      Arrastra para rotar · Desliza para acercar
                    </div>
                  </div>
                  <div className="payment-control">
                    <div className="scenario-label">
                      <label htmlFor="scenario">Escenario de la demo</label>
                      <span>Solo simulación</span>
                    </div>
                    <select
                      id="scenario"
                      value={scenario}
                      disabled={
                        phase === "processing" || incident || !backend.connected
                      }
                      onChange={(e) => setScenario(e.target.value as Scenario)}
                    >
                      {Object.entries(scenarioLabels).map(([id, label]) => (
                        <option value={id} key={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="button pay-button"
                      disabled={
                        phase === "processing" || incident || !backend.connected
                      }
                      onClick={pay}
                    >
                      {phase === "processing" ? (
                        <>
                          <span className="spinner" />
                          Procesando pago de prueba…
                        </>
                      ) : incident ? (
                        <>
                          <TriangleAlert size={18} />
                          Resuelve el incidente para continuar
                        </>
                      ) : (
                        <>
                          <CreditCard size={18} />
                          Pagar ${products[product].price}.00 de prueba
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                    <p className="payment-disclaimer">
                      <ShieldCheck size={13} /> Sin cobros reales. Sin datos
                      bancarios. Persistencia en FalkorDB.
                    </p>
                  </div>
                </section>
              </div>
              <section className="panel journey-panel">
                <div className="panel-heading">
                  <div>
                    <GitBranch size={17} />
                    <h2>El recorrido de tu pago</h2>
                  </div>
                  <span
                    className={`badge ${incident ? "danger" : phase === "approved" || phase === "resolved" ? "mint" : ""}`}
                  >
                    {phase === "idle"
                      ? "Listo para comenzar"
                      : phase === "processing"
                        ? "En progreso"
                        : phase === "approved"
                          ? "Aprobado"
                          : incident
                            ? "Timeout detectado"
                            : "Servicio recuperado"}
                  </span>
                </div>
                <div className="journey">
                  {[
                    "Checkout",
                    "Identidad y orden",
                    "Pago y riesgo",
                    "Autorización bancaria",
                  ].map((label, i) => (
                    <div
                      key={label}
                      className={`journey-step ${step > i ? "done" : ""} ${incident && i === 3 ? "failed" : ""}`}
                    >
                      <span>{step > i ? <Check size={15} /> : i + 1}</span>
                      <div>
                        <strong>{label}</strong>
                        <small>
                          {
                            [
                              "api-gateway",
                              "authentication · orders",
                              "payments · fraud",
                              "bank-connector",
                            ][i]
                          }
                        </small>
                      </div>
                      {i < 3 && <ArrowRight size={18} />}
                    </div>
                  ))}
                </div>
                {(incident || phase === "approved" || phase === "resolved") && (
                  <div className={`payment-result ${incident ? "error" : ""}`}>
                    <div>
                      {incident ? (
                        <TriangleAlert size={20} />
                      ) : (
                        <CheckCircle2 size={20} />
                      )}
                      <span>
                        <strong>
                          {incident
                            ? "Un fallo en el banco, una historia en el grafo."
                            : phase === "resolved"
                              ? "El servicio se recuperó. Puedes iniciar otro pago."
                              : "Pago de prueba aprobado."}
                        </strong>
                        <small>
                          {incident
                            ? "La compra no se completó. Explora el impacto y la evidencia en el dashboard."
                            : phase === "resolved"
                              ? "La recuperación no reintenta ni aprueba automáticamente el pago anterior."
                              : "La traza incluye autorización, persistencia y notificación simuladas."}
                        </small>
                      </span>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setView("overview")}
                    >
                      Abrir dashboard <ArrowUpRight size={16} />
                    </button>
                  </div>
                )}
              </section>
              <div className="attribution">
                Modelo{" "}
                <a
                  href="https://sketchfab.com/3d-models/1-pos-0d4121c18e4341a0839fc6f20af24b88"
                  target="_blank"
                  rel="noreferrer"
                >
                  “1 POS”
                </a>{" "}
                de{" "}
                <a
                  href="https://sketchfab.com/abhijithsince2002"
                  target="_blank"
                  rel="noreferrer"
                >
                  abhijithsince2002
                </a>{" "}
                ·{" "}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noreferrer"
                >
                  CC BY 4.0
                </a>{" "}
                · Animación original reproducida parcialmente; el estado del
                pago lo determina la simulación.
              </div>
            </>
          )}
          {view === "events" && (
            <section className="panel events-panel">
              <div className="panel-heading">
                <div>
                  <Terminal size={17} />
                  <h2>Registro de eventos</h2>
                  <span className="tag">{events.length}</span>
                </div>
                <button
                  className="button secondary"
                  onClick={download}
                  disabled={!events.length}
                >
                  <ArrowDownToLine size={15} />
                  Exportar JSON
                </button>
              </div>
              <div className="event-toolbar">
                <label className="search-field">
                  <Search size={16} />
                  <input
                    aria-label="Buscar eventos"
                    placeholder="Buscar por evento, servicio o traza…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <span className="local-status">
                  <span className="dot mint-dot" />
                  Eventos persistidos en FalkorDB
                </span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>HORA LOCAL</th>
                      <th>EVENTO</th>
                      <th>SERVICIO</th>
                      <th>TRACE ID</th>
                      <th>DATOS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events
                      .filter((e) =>
                        `${e.type} ${e.service} ${e.traceId}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .slice()
                      .reverse()
                      .map((event) => (
                        <tr key={event.id}>
                          <td className="muted">
                            {formatTime(event.timestamp)}
                          </td>
                          <td>
                            <span
                              className={`dot ${event.type.includes("timeout") ? "red-dot" : "mint-dot"}`}
                            />
                            {event.type}
                          </td>
                          <td>{event.service}</td>
                          <td>
                            <code>{event.traceId}</code>
                          </td>
                          <td>
                            <button
                              className="text-button"
                              onClick={() => setPayload(event)}
                            >
                              JSON <Code2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {!events.length && (
                <div className="empty-investigation">
                  <Terminal size={32} />
                  <h3>La sesión todavía no tiene eventos</h3>
                  <p>
                    Inicia una compra para generar una traza de extremo a
                    extremo.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => setView("checkout")}
                  >
                    Crear primer evento <ArrowRight size={15} />
                  </button>
                </div>
              )}
              {events.length > 0 &&
                !events.some((e) =>
                  `${e.type} ${e.service} ${e.traceId}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                ) && (
                  <div className="empty-investigation">
                    No hay eventos que coincidan con “{query}”.
                  </div>
                )}
              <div className="events-footnote">
                Los eventos se guardan en FalkorDB. Recargar conserva esta
                sesión. Reiniciar inicia otra sesión sin borrar el historial.
              </div>
            </section>
          )}
          <footer className="page-footer">
            <span>
              <span className="brand-mini">✳</span> OPSGRAPH AI{" "}
              <span className="footer-separator">/</span> Operations, connected.
            </span>
            <span>FalkorDB Hackathon · Integrated MVP</span>
          </footer>
        </div>
      </main>
      {notice && (
        <div role="status" className="toast">
          <CheckCircle2 size={18} />
          {notice}
          <button
            aria-label="Cerrar notificación"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {payload && (
        <Modal title="Payload del evento" onClose={() => setPayload(null)}>
          <span className="badge">SIMULADO · JSON</span>
          <pre>{JSON.stringify(payload, null, 2)}</pre>
          <button className="button secondary" onClick={() => setPayload(null)}>
            Cerrar
          </button>
        </Modal>
      )}
      {confirm && (
        <Modal
          title="Revisar recuperación simulada"
          onClose={() => setConfirm(false)}
        >
          <div className="modal-icon">
            <ShieldCheck size={28} />
          </div>
          <p>
            RB-007 cambiará el estado del conector a saludable dentro de esta
            demo. La aprobación y la recuperación se guardarán en FalkorDB.
          </p>
          <div className="inspector-note">
            No ejecuta cambios reales ni reintenta el pago fallido. La acción
            queda registrada para revisión.
          </div>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setConfirm(false)}
            >
              Cancelar
            </button>
            <button className="button primary" onClick={mitigate}>
              Aprobar simulación <Check size={15} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-PE", { hour12: false });
}
function Stat({
  label,
  value,
  note,
  icon,
  tone = "",
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  tone?: string;
}) {
  return (
    <section className="stat panel">
      <div>
        {label}
        <span>{icon}</span>
      </div>
      <strong className={tone}>{value}</strong>
      <small>
        {tone === "mint" && <span className="dot mint-dot" />}
        {note}
      </small>
    </section>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const el = ref.current;
    el?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && el) {
        const items = el.querySelectorAll<HTMLElement>(
          'button,a,input,select,[tabindex="0"]',
        );
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === el)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      before?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="panel-heading">
          <h2>{title}</h2>
          <button
            className="plain-button"
            aria-label="Cerrar diálogo"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
