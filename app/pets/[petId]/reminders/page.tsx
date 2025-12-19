"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type ReminderRow = {
  id: number;
  pet_id: number;
  type: "VACCINE" | "CHECKUP" | "THERAPY" | string;
  date: string; // YYYY-MM-DD
  title: string;
  notes?: string | null;
  status: "upcoming" | "today" | "overdue" | string;
};

type CompletePayload = {
  section: "VACCINATIONS" | "CHECKUP" | "THERAPY";
  date: string;
  title: string;
  notes: string;
  vet_name: string;
  clinic: string;
};

function mapReminderTypeToSection(t: string): CompletePayload["section"] {
  const u = (t || "").toUpperCase();
  if (u === "VACCINE") return "VACCINATIONS";
  if (u === "CHECKUP") return "CHECKUP";
  return "THERAPY";
}

function badge(status: string) {
  const base = "inline-block rounded-full px-3 py-1 text-xs font-bold";
  if (status === "overdue") return <span className={`${base} bg-red-100 text-red-800`}>OVERDUE</span>;
  if (status === "today") return <span className={`${base} bg-yellow-100 text-yellow-800`}>TODAY</span>;
  return <span className={`${base} bg-green-100 text-green-800`}>UPCOMING</span>;
}

export default function PetRemindersPage() {
  const params = useParams();

  const petId = useMemo(() => {
    const raw = (params as any)?.petId;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return v ? Number(v) : null;
  }, [params]);

  const [items, setItems] = useState<ReminderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Create form
  const [rtype, setRtype] = useState<"VACCINE" | "CHECKUP" | "THERAPY">("VACCINE");
  const [rdate, setRdate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rtitle, setRtitle] = useState("");
  const [rnotes, setRnotes] = useState("");

  // Complete modal
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeId, setCompleteId] = useState<number | null>(null);
  const [completeType, setCompleteType] = useState<string>("VACCINE");
  const [cp, setCp] = useState<CompletePayload>({
    section: "VACCINATIONS",
    date: new Date().toISOString().slice(0, 10),
    title: "",
    notes: "",
    vet_name: "",
    clinic: "",
  });

  async function load() {
    if (!petId) return;
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(`${API_BASE}/pets/${petId}/reminders_auth`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as ReminderRow[];
      setItems(data);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  async function createReminder() {
    if (!petId) return;
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(`${API_BASE}/pets/${petId}/reminders_auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: rtype,
          date: rdate,
          title: rtitle,
          notes: rnotes || null,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      setRtitle("");
      setRnotes("");
      setMsg("Podsetnik sačuvan ✅");
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  async function deleteReminder(id: number) {
    if (!confirm("Obrisati ovaj podsetnik?")) return;

    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(`${API_BASE}/reminders/${id}_auth`, {
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

  function openComplete(r: ReminderRow) {
    setCompleteId(r.id);
    setCompleteType(r.type);

    const section = mapReminderTypeToSection(r.type);

    setCp({
      section,
      date: r.date,
      title: r.title,
      notes: r.notes ?? "",
      vet_name: "",
      clinic: "",
    });

    setCompleteOpen(true);
  }

  function closeComplete() {
    setCompleteOpen(false);
    setCompleteId(null);
  }

  async function completeReminder() {
    if (!completeId) return;

    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      // backend pravilo: section mora odgovarati tipu
      const expected = mapReminderTypeToSection(completeType);
      if (cp.section !== expected) {
        throw new Error(`Sekcija mora biti ${expected} za tip ${completeType}.`);
      }

      const res = await fetch(`${API_BASE}/reminders/${completeId}/complete_auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          section: cp.section,
          date: cp.date,
          title: cp.title,
          notes: cp.notes || null,
          vet_name: cp.vet_name || null,
          clinic: cp.clinic || null,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      setMsg("Završeno ✅ Upisano u zdravstveni karton.");
      closeComplete();
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
  }, [petId]);

  if (!petId) {
    return <div className="min-h-screen bg-gray-50 p-6">Pet ID nije validan.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-4">
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

          {msg && (
            <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{msg}</div>
          )}
          {err && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
              {err}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold">Dodaj podsetnik</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Tip</label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={rtype}
                onChange={(e) => setRtype(e.target.value as any)}
              >
                <option value="VACCINE">Vakcina</option>
                <option value="CHECKUP">Pregled</option>
                <option value="THERAPY">Terapija / lek</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Datum</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={rdate}
                onChange={(e) => setRdate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Naslov</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={rtitle}
                onChange={(e) => setRtitle(e.target.value)}
                placeholder="npr. Revakcinacija"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-sm font-medium">Beleške (opciono)</label>
              <textarea
                className="mt-1 w-full rounded-xl border px-3 py-2"
                rows={3}
                value={rnotes}
                onChange={(e) => setRnotes(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={createReminder}
            disabled={loading || !rtitle || !rdate}
            className="mt-4 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading ? "..." : "Sačuvaj podsetnik"}
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Lista</h2>
            <button
              onClick={load}
              disabled={loading}
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100 disabled:opacity-40"
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {badge(r.status)}
                        <span className="text-xs text-gray-600">{r.date}</span>
                        <span className="text-xs text-gray-600">• {r.type}</span>
                      </div>
                      <div className="font-semibold">{r.title}</div>
                      {r.notes && (
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{r.notes}</div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openComplete(r)}
                        className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
                      >
                        Završi
                      </button>
                      <button
                        onClick={() => deleteReminder(r.id)}
                        className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
                      >
                        Obriši
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {completeOpen && completeId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-600">Završi podsetnik</div>
                  <div className="text-lg font-bold">Upis u zdravstveni karton</div>
                </div>

                <button
                  onClick={closeComplete}
                  className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-100"
                >
                  Zatvori
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Sekcija</label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2 bg-gray-50"
                    value={cp.section}
                    readOnly
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Datum</label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={cp.date}
                    onChange={(e) => setCp((p) => ({ ...p, date: e.target.value }))}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Naslov</label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={cp.title}
                    onChange={(e) => setCp((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Beleške</label>
                  <textarea
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    rows={3}
                    value={cp.notes}
                    onChange={(e) => setCp((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Veterinar (opciono)</label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={cp.vet_name}
                    onChange={(e) => setCp((p) => ({ ...p, vet_name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Klinika (opciono)</label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={cp.clinic}
                    onChange={(e) => setCp((p) => ({ ...p, clinic: e.target.value }))}
                  />
                </div>
              </div>

              <button
                onClick={completeReminder}
                disabled={loading || !cp.title || !cp.date}
                className="mt-4 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-40"
              >
                {loading ? "..." : "Završi i upiši u karton"}
              </button>

              <div className="mt-3 text-xs text-gray-500">
                Pravilo: završavanjem podsetnika → upisuje se u zdravstveni karton i podsetnik se briše.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// osigurač da TS ne prijavi "not a module" čak i ako dođe do glitcheva
export {};
