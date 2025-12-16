"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";



export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function doRegister() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error(await res.text());

      setResult("Registracija uspešna. Sada se prijavi.");
      setTimeout(() => router.push("/login"), 800);
    } catch (e: any) {
      setError(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">Registracija</h1>

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
              placeholder="minimum 6 karaktera"
            />
          </div>

          <button
            onClick={doRegister}
            disabled={!email || !password || loading}
            className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading ? "Kreiram..." : "Napravi nalog"}
          </button>

          {result && (
            <div className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
              {result}
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
              {error}
            </div>
          )}

          <div className="pt-2 text-sm text-gray-600">
            Već imaš nalog?{" "}
            <a className="underline" href="/login">
              Prijavi se
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
