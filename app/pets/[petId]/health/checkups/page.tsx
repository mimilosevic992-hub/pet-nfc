"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";
const SECTION = "CHECKUPS";

type Entry = {
  id: number;
  section: string;
  title: string;
  date?: string | null;
  notes?: string | null;
  vet_name?: string | null;
  clinic?: string | null;
  meta?: any;
  weight_kg?: string | null;
};

export default function CheckupsPage() {
  const params = useParams();
  const router = useRouter();
  const petId = String(params?.petId ?? "");

  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [vetName, setVetName] = useState("");
  const [clinic, setClinic] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(
        `${API_BASE}/pets/${encodeURIComponent(petId)}/health_auth?section=${SECTION}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );

      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Entry[];
      setItems(data);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  async function add() {
    setErr(null);
    if (!title.trim()) return setErr("Upiši naslov pregleda (npr. 'Kontrolni pregled').");

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const payload = {
        section: SECTION,
        title: title.trim(),
        date: date || null,
        notes: notes.trim() || null,
        vet_name: vetName.trim() || null,
        clinic: clinic.trim() || null,
        weight_kg: weight.trim() || null,
      };

      const res = await fetch(`${API_BASE}/pets/${encodeURIComponent(petId)}/health_auth`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      setTitle("");
      setDate("");
      setVetName("");
      setClinic("");
      setWeight("");
      setNotes("");

      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    }
  }

  async function remove(id: number) {
    if (!confirm("Obrisati unos?")) return;

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(`${API_BASE}/health/${id}_auth`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(await res.text());
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("petnfc_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [items]
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Pregledi</h1>
              <p className="mt-1 text-sm text-gray-600">Pregledi, nalazi, kontrole.</p>
            </div>

            <Link
              href={`/pets/${petId}/health`}
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
            >
              ← Zdravstveni
            </Link>
          </div>

          {err && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
              {err}
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Naslov pregleda</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="npr. Kontrolni pregled / UZ abdomena"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Datum</label>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Veterinar</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={vetName}
                onChange={(e) => setVetName(e.target.value)}
                placeholder="opciono"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Klinika</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={clinic}
                onChange={(e) => setClinic(e.target.value)}
                placeholder="opciono"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Težina (kg)</label>
              <input
                type="number"
                step="0.1"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="opciono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Napomena / nalaz</label>
              <textarea
                className="mt-1 w-full rounded-xl border px-3 py-2"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="simptomi, nalaz, preporuke..."
              />
            </div>
          </div>

          <button onClick={add} className="mt-4 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white">
            Sačuvaj pregled
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Unosi</h2>
            {loading && <span className="text-sm text-gray-600">Učitavam…</span>}
          </div>

          {sorted.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">Nema unosa.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {sorted.map((x) => (
                <div key={x.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{x.title}</div>
                      <div className="mt-1 text-sm text-gray-600">
                        {x.date ? `Datum: ${x.date}` : "Datum: -"}
                        {x.vet_name ? ` • Vet: ${x.vet_name}` : ""}
                        {x.clinic ? ` • Klinika: ${x.clinic}` : ""}
                        {x.weight_kg ? ` • Težina: ${x.weight_kg} kg` : ""}
                      </div>
                      {x.notes ? (
                        <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{x.notes}</div>
                      ) : null}
                    </div>

                    <button
                      onClick={() => remove(x.id)}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-100"
                    >
                      Obriši
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
