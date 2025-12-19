"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";
const SECTION = "VACCINATIONS";

type Entry = {
  id: number;
  section: string;
  title: string;
  date?: string | null;
  notes?: string | null;
  meta?: any;
};

export default function VaccinationsPage() {
  const params = useParams();
  const router = useRouter();
  const petId = String(params?.petId ?? "");

  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [vaccineName, setVaccineName] = useState("");
  const [givenAt, setGivenAt] = useState("");
  const [vet, setVet] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(
        `${API_BASE}/pets/${encodeURIComponent(petId)}/health/entries_auth?section=${SECTION}`,
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
    if (!vaccineName.trim()) return setErr("Upiši naziv vakcine.");

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const payload = {
        section: SECTION,
        title: vaccineName.trim(),
        date: givenAt || null,
        notes: notes.trim() || null,
        meta: { vet: vet.trim() || null, next_due: nextDue || null },
      };

      const res = await fetch(`${API_BASE}/pets/${encodeURIComponent(petId)}/health/entries_auth`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      setVaccineName("");
      setGivenAt("");
      setVet("");
      setNextDue("");
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

      const res = await fetch(`${API_BASE}/health/entries/${id}_auth`, {
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
              <h1 className="text-2xl font-bold">Vakcinacije</h1>
              <p className="mt-1 text-sm text-gray-600">Dodaj i pregledaj vakcine.</p>
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
              <label className="text-sm font-medium">Naziv vakcine</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={vaccineName}
                onChange={(e) => setVaccineName(e.target.value)}
                placeholder="npr. Besnilo / DHPPi..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">Datum davanja</label>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={givenAt}
                onChange={(e) => setGivenAt(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Veterinar / ambulanta</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={vet}
                onChange={(e) => setVet(e.target.value)}
                placeholder="opciono"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Sledeća doza (opciono)</label>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Napomena</label>
              <textarea
                className="mt-1 w-full rounded-xl border px-3 py-2"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="serijski broj, reakcija, doza..."
              />
            </div>
          </div>

          <button
            onClick={add}
            className="mt-4 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white"
          >
            Sačuvaj vakcinu
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
                        {x.meta?.vet ? ` • Vet: ${x.meta.vet}` : ""}
                        {x.meta?.next_due ? ` • Sledeća: ${x.meta.next_due}` : ""}
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
