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
export type Snapshot = {
  phase: Phase | "error";
  events: DemoEvent[];
  paymentId?: string;
  scenario?: Scenario;
  product?: number;
  storeId?: string;
  incident: Incident | null;
};
export type Graph = {
  services: typeof initialServices;
  edges: { source: string; target: string; type: string }[];
  stores: { id: string; label: string; region: string }[];
};
export type Metrics = {
  stores: {
    id: string;
    label: string;
    total: number;
    approved: number;
    incidents: number;
    active: number;
  }[];
  services: { id: string; label: string; events: number; errors: number }[];
  total: number;
  approved: number;
  incidents: number;
  scope: string;
};
export type ChatResult = {
  answer: string;
  evidence_refs: string[];
  uncertainties: string[];
  provider_status: string;
  model: string;
  history: { question: string; answer: string }[];
};
export type ModelChoice = {
  provider: "default" | "ollama" | "google" | "anthropic" | "openai";
  model: string;
  api_key: string;
};
export type ModelStatus = {
  provider: string;
  model: string;
  local_model_available: boolean;
};
async function request<T>(path: string, body?: unknown): Promise<T> {
  const result = await fetch("/api/backend/" + path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!result.ok) {
    if (result.status === 401 && typeof window !== "undefined")
      window.dispatchEvent(new Event("opsgraph-auth-expired"));
    const data = await result.json().catch(() => ({}));
    throw new Error(
      typeof data.detail === "string" ? data.detail : `Error ${result.status}`,
    );
  }
  return result.json();
}
export function useOpsGraph(enabled = true) {
  const [state, setState] = useState<Snapshot>({
    phase: "idle",
    events: [],
    incident: null,
  });
  const [graph, setGraph] = useState<Graph>({
    services: initialServices,
    edges: [],
    stores: [],
  });
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [chat, setChat] = useState<ChatResult | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [modelChoice, setModelChoice] = useState<ModelChoice>({
    provider: "default",
    model: "",
    api_key: "",
  });
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
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
    if (!enabled) return;
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
        const nextMetrics = await request<Metrics>("metrics");
        if (active) setMetrics(nextMetrics);
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
  }, [refresh, enabled]);
  async function pay(scenario: Scenario, product: number, storeId: string) {
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
        store_id: storeId,
        model_choice: modelChoice,
      });
      if (session.current === id) setState(result);
      return result;
    } catch (e) {
      setError((e as Error).message);
      await refresh();
      return null;
    } finally {
      submitting.current = false;
      setSending(false);
    }
  }
  async function batch() {
    if (submitting.current) return null;
    submitting.current = true;
    setSending(true);
    setError("");
    try {
      const result = await request<Snapshot>("mock-payments/batch", {
        session_id: session.current,
        model_choice: modelChoice,
      });
      setState(result);
      return result;
    } catch (e) {
      setError((e as Error).message);
      await refresh();
      return null;
    } finally {
      submitting.current = false;
      setSending(false);
    }
  }
  async function recover() {
    if (!state.incident) return;
    try {
      const result = await request<Snapshot>(
        `incidents/${state.incident.id}/actions`,
        {
          session_id: session.current,
          action: "simulate_recovery",
        },
      );
      setState(result);
      setError("");
      return result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }
  async function ask(question: string) {
    setChatLoading(true);
    setChatError("");
    try {
      const result = await request<ChatResult>("chat", {
        session_id: session.current,
        question,
        model_choice: modelChoice,
      });
      setChat(result);
      return result;
    } catch (e) {
      setChatError((e as Error).message);
      return null;
    } finally {
      setChatLoading(false);
    }
  }
  async function loadModelStatus() {
    try {
      setModelStatus(await request<ModelStatus>("model/status"));
    } catch {
      setModelStatus(null);
    }
  }
  async function loadChat() {
    if (!session.current) return;
    try {
      const result = await request<ChatResult>(
        `chat/history/${session.current}`,
      );
      setChat(result);
    } catch (e) {
      setChatError((e as Error).message);
    }
  }
  function reset() {
    if (submitting.current || state.phase === "processing") return;
    session.current = crypto.randomUUID();
    localStorage.setItem("opsgraph-session", session.current);
    setState({ phase: "idle", events: [], incident: null });
    setError("");
    setChat(null);
  }
  return {
    state,
    graph,
    metrics,
    connected,
    error,
    pay,
    batch,
    recover,
    reset,
    sending,
    chat,
    chatLoading,
    chatError,
    ask,
    loadChat,
    modelChoice,
    setModelChoice,
    modelStatus,
    loadModelStatus,
  };
}
