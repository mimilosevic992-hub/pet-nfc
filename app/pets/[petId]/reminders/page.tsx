"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type ReminderRow = {
  id: number;
  pet_id: number;
  type: string;
  date: string;
  title: string;
  notes?: string | null;
  status: string;
};

export default function PetRemindersPage() {
  const params = useParams();

  const petId = useMemo(() => {
    const raw = (params as any)?.petId;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return v ? Number(v) : null;
  }, [params]);

  const [items, setItems] = useState<ReminderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(`${API_BASE}/pets/${petId}/reminders_auth`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!res.ok) throw new Error(await res.text());
      setItems((await res.json()) as ReminderRow[]);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!petId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  if (!petId) {
    return <div className="min-h-screen bg-gray-50 p-6">Pet ID nije validan.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Podsetnici</h1>
              <p className="mt-1 text-sm text-gray-600">Ljubimac #{petId}</p>
            </div>
            <a
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
              href={`/pets/${petId}`}
            >
              ← Profil
            </a>
          </div>

          {err && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
              {err}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Lista</h2>
            <button
              onClick={load}
              disabled={loading}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? "..." : "Osveži"}
            </button>
          </div>

          {loading ? (
            <p className="mt-3 text-sm text-gray-600">Učitavam…</p>
          ) : items.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">Nema podsetnika.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {items.map((r) => (
                <div key={r.id} className="rounded-2xl border p-4">
                  <div className="text-xs text-gray-600">
                    {r.date} • {r.type} • {r.status}
                  </div>
                  <div className="font-semibold">{r.title}</div>
                  {r.notes && <div className="mt-1 text-sm text-gray-700">{r.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
