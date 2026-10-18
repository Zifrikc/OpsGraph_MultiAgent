"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DemoEvent,
  Phase,
  Scenario,
  services as initialServices,
} from "./demo";
export type Evidence = {
  ref?: string;
  affected?: string[];
  paths?: string[][];
  owners?: string[];
  deployments?: { id: string; minutesBefore: number }[];
  runbooks?: { id: string; title: string; action: string }[];
};
export type Incident = {
  id: string;
  status: string;
  provider_status: string;
  summary: {
    summary?: string;
    evidence_refs?: string[];
    uncertainties?: string[];
  };
  evidence: Record<string, Evidence>;
  steps: { agent: string; tool: string; mode: string; result: Evidence }[];
};
type Snapshot = {
  phase: Phase | "error";
  events: DemoEvent[];
  paymentId?: string;
  scenario?: Scenario;
  product?: number;
  incident: Incident | null;
};
export type Graph = {
  services: typeof initialServices;
  edges: { source: string; target: string; type: string }[];
};
async function request<T>(path: string, body?: unknown): Promise<T> {
  const result = await fetch("/api/backend/" + path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!result.ok) {
    const data = await result.json().catch(() => ({}));
    throw new Error(
      typeof data.detail === "string" ? data.detail : `Error ${result.status}`,
    );
  }
  return result.json();
}
export function useOpsGraph() {
  const [state, setState] = useState<Snapshot>({
    phase: "idle",
    events: [],
    incident: null,
  });
  const [graph, setGraph] = useState<Graph>({
    services: initialServices,
    edges: [],
  });
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const session = useRef("");
  const submitting = useRef(false);
  const [sending, setSending] = useState(false);
  const refresh = useCallback(async () => {
    const id = session.current;
    if (!id) return;
    try {
      const snapshot = await request<Snapshot>("state/" + id);
      if (session.current !== id) return;
      setState(snapshot);
      setConnected(true);
      setError("");
    } catch (e) {
      setConnected(false);
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    session.current =
      localStorage.getItem("opsgraph-session") || crypto.randomUUID();
    localStorage.setItem("opsgraph-session", session.current);
    let active = true;
    let pending = false;
    const poll = async () => {
      if (pending) return;
      pending = true;
      try {
        const topology = await request<Graph>("topology");
        if (topology.services.length !== 8)
          throw new Error(
            "La semilla del grafo no está disponible. Reinicia la API.",
          );
        if (active) setGraph(topology);
        if (active) await refresh();
      } catch (e) {
        if (active) {
          setConnected(false);
          setError((e as Error).message);
        }
      } finally {
        pending = false;
      }
    };
    void poll();
    const interval = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [refresh]);
  async function pay(scenario: Scenario, product: number) {
    if (submitting.current) return;
    submitting.current = true;
    setSending(true);
    setError("");
    const id = session.current;
    try {
      const result = await request<Snapshot>("mock-payments", {
        id: crypto.randomUUID(),
        session_id: id,
        scenario,
        product,
      });
      if (session.current === id) setState(result);
    } catch (e) {
      setError((e as Error).message);
      await refresh();
    } finally {
      submitting.current = false;
      setSending(false);
    }
  }
  async function recover() {
    if (!state.incident) return;
    try {
      setState(
        await request<Snapshot>(`incidents/${state.incident.id}/actions`, {
          session_id: session.current,
          action: "simulate_recovery",
        }),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function reset() {
    if (submitting.current || state.phase === "processing") return;
    session.current = crypto.randomUUID();
    localStorage.setItem("opsgraph-session", session.current);
    setState({ phase: "idle", events: [], incident: null });
    setError("");
  }
  return { state, graph, connected, error, pay, recover, reset, sending };
}
