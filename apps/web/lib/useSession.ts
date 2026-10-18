"use client";
import { useEffect, useState } from "react";

export type User = { name: string; role: "admin" | "operator" | "viewer" };

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener("opsgraph-auth-expired", expired);
    fetch("/api/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()).user as User;
      })
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    return () => window.removeEventListener("opsgraph-auth-expired", expired);
  }, []);
  async function login(username: string, password: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.detail || "No se pudo iniciar sesión");
      setUser(data.user);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await fetch("/api/session", { method: "DELETE" });
    setUser(null);
  }
  return { user, loading, busy, error, login, logout };
}
