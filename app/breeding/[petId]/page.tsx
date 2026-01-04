"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type BreedingDetail = {
  pet_id: number;
  name: string;
  species: string; // DOG/CAT
  sex: "MALE" | "FEMALE";
  breed: string | null;
  city: string | null;
  birth_date: string | null; // "YYYY-01-01"
  pedigree: string | null; // "TRUE"/"FALSE"/null
  is_neutered: string | null; // "YES"/"NO"/"UNKNOWN"
  notes: string | null;

  // Ne prikazujemo javno (ni tag id ni public_url)
  tag_id: string | null;
  public_url: string | null;
};

function prettySpecies(s: string) {
  return s === "DOG" ? "Pas" : s === "CAT" ? "Mačka" : s;
}
function prettySex(s: string) {
  return s === "MALE" ? "Mužjak" : s === "FEMALE" ? "Ženka" : s;
}
function prettyPedigree(v: string | null) {
  if (!v) return "—";
  const t = v.trim().toLowerCase();
  if (t === "true" || t === "1" || t === "yes") return "DA";
  if (t === "false" || t === "0" || t === "no") return "NE";
  return v;
}
function prettyNeutered(v: string | null) {
  if (!v) return "—";
  if (v === "YES") return "DA";
  if (v === "NO") return "NE";
  return "—";
}
function ageFromBirthDate(birth_date: string | null) {
  if (!birth_date) return null;
  const y = Number(birth_date.slice(0, 4));
  if (!Number.isFinite(y)) return null;
  const now = new Date();
  return Math.max(0, now.getFullYear() - y);
}
function initials(name: string) {
  const n = (name || "").trim();
  if (!n) return "🐾";
  return n
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function BreedingDetailPage() {
  const params = useParams();
  const petId = useMemo(() => String(params?.petId ?? ""), [params]);

  const [data, setData] = useState<BreedingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`${API_BASE}/public/breeding/${petId}`, {
        cache: "no-store",
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      setData(JSON.parse(text));
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!petId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  const age = ageFromBirthDate(data?.birth_date ?? null);

  // public-safe avatar endpoint
  const avatar = data ? `${API_BASE}/public/pets/${data.pet_id}/avatar` : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Breeding profil</h1>
              <p className="mt-1 text-sm text-gray-700">
                Detalji o ljubimcu (javno).
              </p>
            </div>

            <a
              href="/breeding"
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
            >
              ← Nazad na listu
            </a>
          </div>

          {loading && <p className="mt-4 text-sm text-gray-700">Učitavam…</p>}
          {err && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
              {err}
            </div>
          )}
        </div>

        {!loading && data && (
          <div className="rounded-2xl bg-white p-6 shadow space-y-4">
            {/* HERO */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-4">
                {/* AVATAR */}
                <div className="h-24 w-24 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatar}
                      alt={data.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // sakrij img, ostavi inicijale
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                  <span className="text-xl font-extrabold text-gray-700">
                    {initials(data.name)}
                  </span>
                </div>

                <div>
                  <div className="text-xl font-bold text-gray-900">{data.name}</div>
                  <div className="mt-1 text-sm text-gray-700">
                    {prettySpecies(data.species)} • {prettySex(data.sex)}
                    {data.breed ? ` • ${data.breed}` : ""}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {data.city ?? "Grad nije unet"}
                  </div>
                </div>
              </div>

              <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                PARENJE
              </span>
            </div>

            {/* INFO GRID */}
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-xl border border-gray-300 p-4">
                <div className="text-gray-700">Starost</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {age !== null ? `${age} god.` : "—"}
                </div>
              </div>

              <div className="rounded-xl border border-gray-300 p-4">
                <div className="text-gray-700">Pedigree</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {prettyPedigree(data.pedigree)}
                </div>
              </div>

              <div className="rounded-xl border border-gray-300 p-4">
                <div className="text-gray-700">Sterilisan/Kastriran</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {prettyNeutered(data.is_neutered)}
                </div>
              </div>

              <div className="rounded-xl border border-gray-300 p-4">
                <div className="text-gray-700">Rođenje</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {data.birth_date ?? "—"}
                </div>
              </div>
            </div>

            {/* OPIS */}
            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="font-semibold text-gray-900">Opis</div>
              <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                {data.notes?.trim()
                  ? data.notes
                  : "Vlasnik još nije dodao opis. (Kasnije dodajemo posebno polje za breeding opis.)"}
              </div>
            </div>

            {/* Namerno: nema /t linka, nema tag id-a */}
            <div className="text-xs text-gray-500">
              Kontakt ide kroz sistem (kasnije dodajemo dugme “Pošalji poruku” ili “Zatraži kontakt”).
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
