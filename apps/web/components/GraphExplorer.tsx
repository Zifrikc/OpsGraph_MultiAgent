"use client";
import { useState } from "react";
import { GitBranch, Search, CircleDot, Building2 } from "lucide-react";
import type { Graph, Metrics } from "@/lib/useOpsGraph";
import Topology from "./Topology";

export default function GraphExplorer({
  graph,
  selected,
  onSelect,
  storeId,
  onStoreSelect,
  affected,
  incident,
  metrics,
}: {
  graph: Graph;
  selected: string;
  onSelect: (id: string) => void;
  storeId: string;
  onStoreSelect: (id: string) => void;
  affected: string[];
  incident: boolean;
  metrics: Metrics | null;
}) {
  const [search, setSearch] = useState("");
  const [impactOnly, setImpactOnly] = useState(false);
  const service = graph.services.find((item) => item.id === selected);
  const links = graph.edges.filter(
    (edge) => edge.source === selected || edge.target === selected,
  );
  const visible = graph.services.filter(
    (item) =>
      `${item.label} ${item.id} ${item.owner}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!impactOnly || affected.includes(item.id)),
  );
  return (
    <div className="graph-explorer">
      <section className="panel explorer-map">
        <div className="panel-heading">
          <div>
            <GitBranch size={18} />
            <h2>Operational Graph</h2>
            <span className="tag">
              {graph.services.length} servicios · {graph.stores.length} tiendas
              · {graph.edges.length} relaciones
            </span>
          </div>
          <span className="live-pill">
            <span className="dot mint-dot" />
            Actualización cada 2 s
          </span>
        </div>
        <p className="metrics-intro">
          Arrastra el fondo para mover el mapa, usa la rueda para acercar y
          arrastra servicios para reorganizarlos. Los datos se actualizan cada 2
          segundos.
        </p>
        <Topology
          graph={graph}
          selected={selected}
          onSelect={onSelect}
          affected={affected}
          incident={incident}
          focus={impactOnly}
          storeId={storeId}
          onStoreSelect={onStoreSelect}
          interactive
          activeStores={
            metrics?.stores
              .filter((item) => item.active > 0)
              .map((item) => item.id) || []
          }
        />
      </section>
      <aside className="panel explorer-inspector">
        <div className="panel-heading">
          <div>
            <Search size={17} />
            <h2>Explore Nodes</h2>
          </div>
        </div>
        <div className="explorer-controls">
          <input
            aria-label="Buscar nodos"
            placeholder="Servicio, ID o equipo…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <label>
            <input
              type="checkbox"
              checked={impactOnly}
              disabled={!incident}
              onChange={(event) => setImpactOnly(event.target.checked)}
            />{" "}
            Solo ruta afectada
          </label>
        </div>
        <div className="explorer-list">
          {graph.stores.map((store) => (
            <button
              key={store.id}
              className={storeId === store.id ? "active" : ""}
              onClick={() => onStoreSelect(store.id)}
            >
              <Building2 size={15} />
              {store.label}
              <small>
                {metrics?.stores.find((item) => item.id === store.id)?.active
                  ? "● Incident"
                  : store.region}
              </small>
            </button>
          ))}
          {visible.map((item) => (
            <button
              key={item.id}
              className={selected === item.id ? "active" : ""}
              onClick={() => onSelect(item.id)}
            >
              <CircleDot size={15} />
              {item.label}
              <small>{item.owner}</small>
            </button>
          ))}
        </div>
        {service && (
          <div className="explorer-detail">
            <h3>{service.label}</h3>
            <code>{service.id}</code>
            <dl>
              <dt>Equipo</dt>
              <dd>{service.owner}</dd>
              <dt>Tipo</dt>
              <dd>{service.kind}</dd>
              <dt>Latencia ficticia</dt>
              <dd>{service.latency} ms</dd>
              <dt>Estado</dt>
              <dd>
                {incident && affected.includes(service.id)
                  ? "Impactado"
                  : "Sin error en esta sesión"}
              </dd>
            </dl>
            <h3>Relaciones directas</h3>
            {links.length ? (
              <ul>
                {links.map((edge) => (
                  <li key={edge.source + edge.target}>
                    <code>{edge.source}</code> → <code>{edge.target}</code>
                    <small>{edge.type}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Sin relaciones directas en esta topología.</p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
