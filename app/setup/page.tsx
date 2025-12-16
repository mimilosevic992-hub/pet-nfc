"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";



export default function SetupPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Učitaj ulogovanog korisnika (email + postojeći phone/city ako postoje)
  useEffect(() => {
    async function loadMe() {
      try {
        const token = localStorage.getItem("petnfc_token");
        if (!token) {
          router.push("/login");
          return;
        }

        const meRes = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!meRes.ok) {
          // token možda nije validan
          localStorage.removeItem("petnfc_token");
          router.push("/login");
          return;
        }

        const me = await meRes.json();
        setEmail(me.email ?? "");
        setPhone(me.phone ?? "");
        setCity(me.city ?? "");
      } catch {
        // ako nešto pukne, vrati na login
        router.push("/login");
      }
    }

    loadMe();
  }, [router]);

  async function saveProfile() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(`${API_BASE}/owner/profile_auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone, city }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(`Sačuvano: ${data.email} (${data.city})`);
    } catch (e: any) {
      setError(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("petnfc_token");
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Pet NFC — Setup profila</h1>
          <button
            onClick={logout}
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
          >
            Logout
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-600">
          Kontakt podaci će biti vidljivi samo kada je ljubimac u LOST režimu.
        </p>

        <div className="mt-6 space-y-3">
          <div>
            <label className="text-sm font-medium">Ulogovan kao</label>
            <input
              className="mt-1 w-full rounded-xl border bg-gray-100 px-3 py-2 text-gray-700"
              value={email || "—"}
              readOnly
            />
          </div>

          <div>
            <label className="text-sm font-medium">Telefon</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+381601234567"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Grad</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Beograd"
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={loading || !phone || !city}
            className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading ? "Čuvam..." : "Sačuvaj"}
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
            Sledeće:{" "}
            <a className="underline" href="/dashboard">
              Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
