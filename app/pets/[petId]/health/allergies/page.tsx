"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";
const SECTION = "ALLERGY"; // važan naziv za backend

type Entry = {
  id: number;
  section: string;
  title: string;
  date: string;
  notes?: string | null;
  allergen?: string | null;
  reaction?: string | null;
};

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function AllergiesPage() {
  const params = useParams();
  const router = useRouter();
  const petId = String(params?.petId ?? "");

  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [date, setDate] = useState(todayISO());
  const [allergen, setAllergen] = useState("");
  const [reaction, setReaction] = useState("");
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

    if (!allergen.trim()) return setErr("Upiši alergen (npr. 'Piletina', 'Buve', 'Polen').");
    if (!date) return setErr("Izaberi datum.");

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const payload = {
        section: SECTION,
        date,
        title: `Alergija: ${allergen.trim()}`,
        notes: notes.trim() || null,
        allergen: allergen.trim(),
        reaction: reaction.trim() || null,
      };

      const res = await fetch(`${API_BASE}/pets/${encodeURIComponent(petId)}/health_auth`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      setAllergen("");
      setReaction("");
      setNotes("");
      setDate(todayISO());

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
              <h1 className="text-2xl font-bold">Alergije</h1>
              <p className="mt-1 text-sm text-gray-600">Statični zapisi (bez podsetnika).</p>
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
              <label className="text-sm font-medium">Datum</label>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Alergen</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={allergen}
                onChange={(e) => setAllergen(e.target.value)}
                placeholder="npr. Piletina / Polen / Buve"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Reakcija</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={reaction}
                onChange={(e) => setReaction(e.target.value)}
                placeholder="npr. svrab, crvenilo, proliv... (opciono)"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Napomena</label>
              <textarea
                className="mt-1 w-full rounded-xl border px-3 py-2"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="dodatne informacije... (opciono)"
              />
            </div>
          </div>

          <button onClick={add} className="mt-4 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white">
            Sačuvaj alergiju
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
                      <div className="font-semibold">{x.allergen || x.title}</div>
                      <div className="mt-1 text-sm text-gray-600">
                        Datum: {x.date || "-"}
                        {x.reaction ? ` • Reakcija: ${x.reaction}` : ""}
                      </div>
                      {x.notes ? <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{x.notes}</div> : null}
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
