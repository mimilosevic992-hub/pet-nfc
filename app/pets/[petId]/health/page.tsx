"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type Entry = {
  id: number;
  section: string;
  date: string;
  title: string;
  notes?: string | null;

  vet_name?: string | null;
  clinic?: string | null;

  next_due?: string | null; // vaccines
  weight_kg?: string | null; // checkups
  dosage?: string | null; // treatments
  duration_days?: number | null; // treatments

  allergen?: string | null; // allergies
  reaction?: string | null; // allergies
};

const cards = [
  { href: "vaccinations", title: "Vakcinacije", desc: "Sve vakcine i potvrde." },
  { href: "checkups", title: "Pregledi", desc: "Veterinarski pregledi i nalazi." },
  { href: "treatments", title: "Terapije / tretmani", desc: "Lekovi, terapije, tretmani." },
  { href: "allergies", title: "Alergije", desc: "Statični zapisi (bez podsetnika)." },
  { href: "notes", title: "Ostale beleške", desc: "Sve ostalo što želiš da zabeležiš." },
];

function sectionLabel(section: string) {
  switch (section) {
    case "VACCINATIONS":
      return "Vakcine";
    case "CHECKUPS":
      return "Pregledi";
    case "TREATMENTS":
      return "Terapije";
    case "ALLERGY":
      return "Alergije";
    case "NOTES":
      return "Beleške";
    default:
      return section;
  }
}

export default function HealthHubPage() {
  const params = useParams();
  const router = useRouter();
  const petId = String(params?.petId ?? "");

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [filter, setFilter] = useState<string>("ALL");

  async function loadAll() {
    setLoading(true);
    setErr(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await fetch(
        `${API_BASE}/pets/${encodeURIComponent(petId)}/health_auth`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Entry[];
      setEntries(data);
    } catch (e: any) {
      setErr(e?.message ?? "Greška pri učitavanju");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) return router.replace("/login");

      const res = await fetch(`${API_BASE}/pets/${encodeURIComponent(petId)}/health_pdf_auth`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `pet-nfc-karton-${petId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message ?? "Greška pri preuzimanju PDF-a");
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("petnfc_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  const filtered = useMemo(() => {
    const list =
      filter === "ALL" ? entries : entries.filter((e) => e.section === filter);

    return [...list].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [entries, filter]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* Header + cards */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Zdravstveni karton</h1>
              <p className="mt-1 text-sm text-gray-600">
                Svaka sekcija ima posebna polja. Timeline prikazuje sve unose zajedno.
              </p>
            </div>

            <Link
              href={`/pets/${petId}`}
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
            >
              ← Profil
            </Link>

            <button
              onClick={downloadPdf}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              📄 Preuzmi PDF
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {cards.map((c) => (
              <Link
                key={c.href}
                href={`/pets/${petId}/health/${c.href}`}
                className="rounded-2xl border bg-white p-5 hover:bg-gray-50"
              >
                <div className="font-bold">{c.title}</div>
                <div className="mt-1 text-sm text-gray-600">{c.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Timeline</h2>
              <p className="mt-1 text-sm text-gray-600">
                Hronološki pregled svih unosa u kartonu.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="rounded-xl border px-3 py-2 text-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="ALL">Sve</option>
                <option value="VACCINATIONS">Vakcine</option>
                <option value="CHECKUPS">Pregledi</option>
                <option value="TREATMENTS">Terapije</option>
                <option value="ALLERGY">Alergije</option>
                <option value="NOTES">Beleške</option>
              </select>

              <button
                onClick={loadAll}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-100"
              >
                Osveži
              </button>
            </div>
          </div>

          {err && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
              {err}
            </div>
          )}

          {loading ? (
            <p className="mt-4 text-sm text-gray-600">Učitavam…</p>
          ) : filtered.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">Nema unosa.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {filtered.map((e) => (
                <div key={e.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{e.title}</div>
                      <div className="mt-1 text-sm text-gray-600">
                        {sectionLabel(e.section)} • {e.date || "-"}
                      </div>

                      {/* Extra per section */}
                      {e.section === "VACCINATIONS" && e.next_due ? (
                        <div className="mt-1 text-sm text-gray-700">
                          Sledeća doza: {e.next_due}
                        </div>
                      ) : null}

                      {e.section === "CHECKUPS" && e.weight_kg ? (
                        <div className="mt-1 text-sm text-gray-700">
                          Težina: {e.weight_kg} kg
                        </div>
                      ) : null}

                      {e.section === "TREATMENTS" &&
                      (e.dosage || e.duration_days) ? (
                        <div className="mt-1 text-sm text-gray-700">
                          {e.dosage ? `Doza: ${e.dosage}` : ""}
                          {e.dosage && e.duration_days ? " • " : ""}
                          {e.duration_days ? `Trajanje: ${e.duration_days} dana` : ""}
                        </div>
                      ) : null}

                      {e.section === "ALLERGY" && (e.allergen || e.reaction) ? (
                        <div className="mt-1 text-sm text-gray-700">
                          {e.allergen ? `Alergen: ${e.allergen}` : ""}
                          {e.allergen && e.reaction ? " • " : ""}
                          {e.reaction ? `Reakcija: ${e.reaction}` : ""}
                        </div>
                      ) : null}

                      {(e.vet_name || e.clinic) ? (
                        <div className="mt-1 text-sm text-gray-600">
                          {e.vet_name ? `Veterinar: ${e.vet_name}` : ""}
                          {e.vet_name && e.clinic ? " • " : ""}
                          {e.clinic ? `Klinika: ${e.clinic}` : ""}
                        </div>
                      ) : null}

                      {e.notes ? (
                        <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                          {e.notes}
                        </div>
                      ) : null}
                    </div>

                    {/* Quick link to section */}
                    <Link
                      href={`/pets/${petId}/health/${
                        e.section === "VACCINATIONS"
                          ? "vaccinations"
                          : e.section === "CHECKUPS"
                          ? "checkups"
                          : e.section === "TREATMENTS"
                          ? "treatments"
                          : e.section === "ALLERGY"
                          ? "allergies"
                          : "notes"
                      }`}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-100"
                    >
                      Otvori
                    </Link>
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
