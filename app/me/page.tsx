"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type Me = {
  email: string;
  phone: string | null;
  city: string | null;
};

export default function MePage() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadMe() {
    setLoading(true);
    setErr(null);
    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const raw = await res.text();
      if (!res.ok) {
        let detail = raw;
        try {
          detail = JSON.parse(raw)?.detail ?? raw;
        } catch {}
        throw new Error(detail || `HTTP ${res.status}`);
      }

      const data = JSON.parse(raw) as Me;
      setMe(data);
      setPhone(data.phone ?? "");
      setCity(data.city ?? "");
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const cleanPhone = phone.trim();
      const cleanCity = city.trim();

      // minimalna validacija
      if (cleanCity.length < 2) throw new Error("Unesi grad.");
      if (cleanPhone.length < 6) throw new Error("Unesi validan broj telefona.");

      const res = await fetch(`${API_BASE}/owner/profile_auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: cleanPhone,
          city: cleanCity,
        }),
      });

      const raw = await res.text();
      if (!res.ok) {
        let detail = raw;
        try {
          detail = JSON.parse(raw)?.detail ?? raw;
        } catch {}
        throw new Error(detail || `HTTP ${res.status}`);
      }

      const data = JSON.parse(raw);
      setMe({ email: data.email, phone: data.phone, city: data.city });
      setMsg("Sačuvano ✅");
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Moj profil (vlasnik)</h1>
              <p className="mt-1 text-sm text-gray-600">
                Ovi podaci se koriste za LOST kontakt i lokaciju (parenje).
              </p>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
            >
              ← Dashboard
            </button>
          </div>

          {loading && <p className="mt-4 text-sm text-gray-600">Učitavam…</p>}

          {msg && (
            <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">
              {msg}
            </div>
          )}

          {err && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
              {err}
            </div>
          )}

          {!loading && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">Email</div>
                <div className="mt-1 font-semibold">{me?.email ?? "-"}</div>
              </div>

              <div>
                <label className="text-sm font-medium">Telefon (za LOST kontakt)</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="npr. +381 64 123 456"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Preporuka: broj koji želiš da se vidi kad je ljubimac LOST.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Grad</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="npr. Beograd"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Koristi se za lokaciju u javnom prikazu i kasnije za filter “parenje”.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Čuvam…" : "Sačuvaj"}
                </button>

                <button
                  onClick={loadMe}
                  disabled={saving}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100 disabled:opacity-50"
                >
                  Osveži
                </button>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
                <b>Napomena:</b> Ako ti je grad ili telefon prazno, kad uključiš LOST
                korisniku će kontakt biti nepotpun. Zato je dobro da ovo popuniš odmah.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
