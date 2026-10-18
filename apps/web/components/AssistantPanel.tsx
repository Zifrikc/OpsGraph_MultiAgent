"use client";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, BookOpen, Bot, Database, Sparkles } from "lucide-react";
import type { ChatResult, ModelChoice, ModelStatus } from "@/lib/useOpsGraph";

export default function AssistantPanel({
  result,
  busy,
  error,
  onAsk,
  onLoad,
  modelChoice,
  onModelChoice,
  modelStatus,
  onLoadModelStatus,
  onOpenInvestigation,
}: {
  result: ChatResult | null;
  busy: boolean;
  error: string;
  onAsk: (question: string) => Promise<ChatResult | null>;
  onLoad: () => Promise<void>;
  modelChoice: ModelChoice;
  onModelChoice: (choice: ModelChoice) => void;
  modelStatus: ModelStatus | null;
  onLoadModelStatus: () => Promise<void>;
  onOpenInvestigation: () => void;
}) {
  const [question, setQuestion] = useState("");
  useEffect(() => {
    void onLoad();
    void onLoadModelStatus();
  }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    const value = question.trim();
    if (value.length < 4 || busy) return;
    void onAsk(value).then((answer) => {
      if (answer) setQuestion("");
    });
  }
  return (
    <div className="assistant-layout">
      <section className="panel assistant-conversation">
        <div className="panel-heading">
          <div>
            <Bot size={19} />
            <h2>Agent Console</h2>
          </div>
          <span className="tag">ADMIN · MCP + GRAFO</span>
        </div>
        <div className="assistant-feed" aria-live="polite">
          {!result?.history.length && (
            <div className="assistant-empty">
              <Sparkles size={32} />
              <h3>Investiga con preguntas concretas</h3>
              <p>
                El asistente consulta la evidencia del incidente y fragmentos
                del runbook. Sus respuestas indican cuándo respondió el modelo y
                cuándo se usó una explicación determinista.
              </p>
            </div>
          )}
          {result?.history.map((item, index) => (
            <div className="chat-turn" key={index}>
              <div className="chat-question">{item.question}</div>
              <div className="chat-answer">{item.answer}</div>
            </div>
          ))}
          {busy && (
            <div className="chat-wait">
              <span className="spinner" /> Consultando grafo, runbooks y modelo…
            </div>
          )}
        </div>
        {error && (
          <div className="connection-banner" role="alert">
            {error}
          </div>
        )}
        <form className="assistant-form" onSubmit={submit}>
          <div className="assistant-suggestions">
            {[
              "¿Qué funciones tienes?",
              "¿Qué evidencia explica este incidente?",
              "¿Cómo puedo resolverlo de forma segura?",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={busy}
                onClick={() => setQuestion(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
          <label htmlFor="assistant-question">Tu consulta</label>
          <textarea
            id="assistant-question"
            value={question}
            maxLength={500}
            rows={3}
            placeholder="¿Qué servicios y tiendas pueden verse afectados por este timeout?"
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button
            className="button primary"
            type="submit"
            disabled={busy || question.trim().length < 4}
          >
            Consultar <ArrowRight size={16} />
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={onOpenInvestigation}
          >
            Open incident investigation <ArrowRight size={16} />
          </button>
        </form>
      </section>
      <aside className="panel assistant-evidence">
        <div className="model-config">
          <h3>Model connection</h3>
          <p>
            Choose the local default or supply your own API key for this browser
            session. This choice also applies to new payment investigations.
            Keys are sent to the backend for the request and are not saved.
          </p>
          <label htmlFor="model-provider">Provider</label>
          <select
            id="model-provider"
            value={modelChoice.provider}
            onChange={(event) =>
              onModelChoice({
                ...modelChoice,
                provider: event.target.value as ModelChoice["provider"],
                api_key: "",
                model: "",
              })
            }
          >
            <option value="default">Server default</option>
            <option value="ollama">Ollama local</option>
            <option value="google">Gemini API</option>
            <option value="anthropic">Claude API</option>
            <option value="openai">OpenAI API</option>
          </select>
          <label htmlFor="model-name">Model ID (optional)</label>
          <input
            id="model-name"
            value={modelChoice.model}
            placeholder="Use provider default"
            onChange={(event) =>
              onModelChoice({ ...modelChoice, model: event.target.value })
            }
          />
          {!["default", "ollama"].includes(modelChoice.provider) && (
            <>
              <label htmlFor="model-key">API key</label>
              <input
                id="model-key"
                type="password"
                autoComplete="off"
                value={modelChoice.api_key}
                placeholder="Enter key for this session"
                onChange={(event) =>
                  onModelChoice({ ...modelChoice, api_key: event.target.value })
                }
              />
            </>
          )}
          <small>
            Configured locally:{" "}
            {modelStatus
              ? `${modelStatus.provider} / ${modelStatus.model} · ${modelStatus.local_model_available ? "installed" : "not confirmed"}`
              : "checking"}
          </small>
        </div>
        <div className="panel-heading">
          <div>
            <Database size={17} />
            <h2>Evidence &amp; Execution</h2>
          </div>
        </div>
        <div className="assistant-status">
          <span>Proveedor/modelo</span>
          <strong>{result?.model || "Pendiente"}</strong>
          <span>Resultado de inferencia</span>
          <strong>{result?.provider_status || "Aún no consultado"}</strong>
        </div>
        <p>
          Un estado <code>deterministic_fallback</code> indica que el modelo no
          respondió o no entregó referencias válidas. No se presenta como
          respuesta generada por IA.
        </p>
        <h3>
          <BookOpen size={16} /> Fuentes citadas
        </h3>
        {result?.evidence_refs.length ? (
          <ul>
            {result.evidence_refs.map((ref) => (
              <li key={ref}>
                <code>{ref}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p>Haz una consulta para ver las referencias recuperadas.</p>
        )}
        {result?.uncertainties.length ? (
          <>
            <h3>Incertidumbres</h3>
            <ul>
              {result.uncertainties.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </>
        ) : null}
      </aside>
    </div>
  );
}
