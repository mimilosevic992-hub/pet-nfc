"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = "http://127.0.0.1:8000";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doLogin() {
    setLoading(true);
    setError(null);

    try {
      // OAuth2 form-data: username + password
      const form = new URLSearchParams();
      form.append("username", email);
      form.append("password", password);

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      localStorage.setItem("petnfc_token", data.access_token);

      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">Prijava</h1>
        <p className="mt-1 text-sm text-gray-600">
          Uloguj se da pristupiš dashboardu.
        </p>

        <div className="mt-6 space-y-3">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tvoj@email.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Lozinka</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            onClick={doLogin}
            disabled={!email || !password || loading}
            className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading ? "Prijavljujem..." : "Prijavi se"}
          </button>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
              {error}
            </div>
          )}

          <div className="pt-2 text-sm text-gray-600">
            Nemaš nalog?{" "}
            <a className="underline" href="/register">
              Registruj se
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
