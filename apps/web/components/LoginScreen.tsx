"use client";
import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole, Network, ShieldCheck } from "lucide-react";

export default function LoginScreen({
  onLogin,
  busy,
  error,
}: {
  onLogin: (username: string, password: string) => Promise<void>;
  busy: boolean;
  error: string;
}) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [hint, setHint] = useState(false);
  function submit(event: FormEvent) {
    event.preventDefault();
    void onLogin(username, password);
  }
  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-mark">
          <Network size={28} />
        </div>
        <div className="eyebrow">OPSGRAPH AI · DEMO LOCAL</div>
        <h1>Context for every decision.</h1>
        <p>Ingresa para explorar tiendas, servicios e incidentes conectados.</p>
        <form onSubmit={submit}>
          <label htmlFor="login-user">Usuario</label>
          <select
            id="login-user"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          >
            <option value="admin">admin · gestión y chat</option>
            <option value="operator">operator · simulación</option>
            <option value="viewer">viewer · lectura</option>
          </select>
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            className="login-hint"
            onClick={() => {
              setHint(!hint);
              setUsername("admin");
            }}
          >
            {hint ? "Demo access: admin / admin" : "Show demo credentials"}
          </button>
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}
          <button className="button primary" disabled={busy} type="submit">
            <LockKeyhole size={17} />{" "}
            {busy ? "Verificando…" : "Entrar al workspace"}{" "}
            <ArrowRight size={17} />
          </button>
        </form>
        <div className="login-foot">
          <ShieldCheck size={16} /> Demo credentials only · No real payments
        </div>
      </section>
      <div className="login-aside" aria-hidden="true">
        <span className="login-orbit one" />
        <span className="login-orbit two" />
        <Network size={108} strokeWidth={0.7} />
        <strong>
          See the system.
          <br />
          Understand the impact.
        </strong>
      </div>
    </main>
  );
}
