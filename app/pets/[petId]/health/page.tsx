"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type HealthRow = {
  id: number;
  pet_id: number;
  section: string;
  date: string;
  title: string;
  notes?: string | null;
  vet_name?: string | null;
  clinic?: string | null;
  allergen?: string | null;
  reaction?: string | null;
  source_reminder_id?: number | null;
};

const SECTIONS = [
  { key: "VACCINATION", label: "Vakcinacije" },
  { key: "CHECKUP", label: "Pregledi" },
  { key: "THERAPY", label: "Terapije" },
  { key: "ALLERGY", label: "Alergije" },
  { key: "NOTE", label: "Ostale beleške" },
] as const;

export default function PetHealthPage() {
  const params = useParams();
  const petId = useMemo(() => {
    const raw = (params as any)?.petId;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return v ? Number(v) : null;
  }, [params]);

  const [section, setSection] = useState<(typeof SECTIONS)[number]["key"]>("VACCINATION");
  const [items, setItems] = useState<HealthRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // form
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [vetName, setVetName] = useState("");
  const [clinic, setClinic] = useState("");
  const [allergen, setAllergen] = useState("");
  const [reaction, setReaction] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(
        `${API_BASE}/pets/${petId}/health_auth?section=${encodeURIComponent(section)}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );

      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as HealthRow[];
      setItems(data);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  async function addEntry() {
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const body: any = {
        section,
        date,
        title,
        notes: notes || null,
        vet_name: vetName || null,
        clinic: clinic || null,
      };

      if (section === "ALLERGY") {
        body.allergen = allergen || null;
        body.reaction = reaction || null;
      }

      const res = await fetch(`${API_BASE}/pets/${petId}/health_auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(await res.text());

      setTitle("");
      setNotes("");
      setVetName("");
      setClinic("");
      setAllergen("");
      setReaction("");
      setMsg("Sačuvano ✅");
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  async function removeEntry(id: number) {
    if (!confirm("Obrisati ovaj zapis?")) return;

    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(`${API_BASE}/health/${id}_auth`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(await res.text());
      setMsg("Obrisano ✅");
      await load();
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
  }, [petId, section]);

  if (!petId) {
    return <div className="min-h-screen bg-gray-50 p-6">Pet ID nije validan.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Zdravstveni karton</h1>
              <p className="mt-1 text-sm text-gray-600">Ljubimac #{petId}</p>
            </div>
            <a className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100" href={`/pets/${petId}`}>
              ← Profil
            </a>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold border ${
                  section === s.key ? "bg-black text-white" : "hover:bg-gray-100"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {msg && <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{msg}</div>}
          {err && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">{err}</div>}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold">Dodaj unos (ručno)</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Datum</label>
              <input className="mt-1 w-full rounded-xl border px-3 py-2" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium">Naslov</label>
              <input className="mt-1 w-full rounded-xl border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="npr. Vakcina protiv besnila" />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Beleške</label>
              <textarea className="mt-1 w-full rounded-xl border px-3 py-2" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium">Veterinar (opciono)</label>
              <input className="mt-1 w-full rounded-xl border px-3 py-2" value={vetName} onChange={(e) => setVetName(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium">Klinika (opciono)</label>
              <input className="mt-1 w-full rounded-xl border px-3 py-2" value={clinic} onChange={(e) => setClinic(e.target.value)} />
            </div>

            {section === "ALLERGY" && (
              <>
                <div>
                  <label className="text-sm font-medium">Alergen</label>
                  <input className="mt-1 w-full rounded-xl border px-3 py-2" value={allergen} onChange={(e) => setAllergen(e.target.value)} placeholder="npr. Piletina" />
                </div>
                <div>
                  <label className="text-sm font-medium">Reakcija</label>
                  <input className="mt-1 w-full rounded-xl border px-3 py-2" value={reaction} onChange={(e) => setReaction(e.target.value)} placeholder="npr. Svrab, osip" />
                </div>
              </>
            )}
          </div>

          <button
            onClick={addEntry}
            disabled={loading || !title || !date}
            className="mt-4 rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading ? "..." : "Sačuvaj"}
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold">Unosi</h2>
          {loading ? (
            <p className="mt-3 text-sm text-gray-600">Učitavam…</p>
          ) : items.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">Nema unosa.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {items.map((x) => (
                <div key={x.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{x.title}</div>
                      <div className="text-sm text-gray-600">{x.date}</div>
                      {x.notes && <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{x.notes}</div>}
                      {(x.vet_name || x.clinic) && (
                        <div className="mt-2 text-xs text-gray-600">
                          {x.vet_name ? `Vet: ${x.vet_name}` : ""} {x.clinic ? `• Klinika: ${x.clinic}` : ""}
                        </div>
                      )}
                      {x.section === "ALLERGY" && (x.allergen || x.reaction) && (
                        <div className="mt-2 text-xs text-gray-700">
                          {x.allergen ? `Alergen: ${x.allergen}` : ""} {x.reaction ? `• Reakcija: ${x.reaction}` : ""}
                        </div>
                      )}
                      {x.source_reminder_id && (
                        <div className="mt-2 text-xs text-gray-500">Nastalo iz podsetnika #{x.source_reminder_id}</div>
                      )}
                    </div>

                    <button
                      onClick={() => removeEntry(x.id)}
                      className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-gray-100"
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
