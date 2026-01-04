"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type BreedingItem = {
  pet_id: number;
  name: string;
  species: string; // DOG/CAT
  sex: "MALE" | "FEMALE";
  breed: string | null;
  city: string | null;

  // OVO NE KORISTIMO ZA UI (ne prikazujemo tag/link javno)
  tag_id: string | null;
  public_url: string | null; // "/t/<tag>" (ne prikazujemo)
};

type SortKey = "NEWEST" | "NAME_ASC" | "NAME_DESC" | "CITY_ASC" | "CITY_FIRST";

function norm(s: string) {
  return (s || "").trim().toLowerCase();
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

export default function BreedingPage() {
  const [items, setItems] = useState<BreedingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // filters
  const [species, setSpecies] = useState<"ALL" | "DOG" | "CAT">("ALL");
  const [sex, setSex] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [city, setCity] = useState<string>("ALL");
  const [q, setQ] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("NEWEST");

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`${API_BASE}/public/breeding?limit=100`, {
        cache: "no-store",
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      const data = JSON.parse(text) as BreedingItem[];
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const c = (it.city ?? "").trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "sr"));
  }, [items]);

  const filtered = useMemo(() => {
    const qq = norm(q);

    let out = items.filter((p) => {
      if (species !== "ALL" && p.species !== species) return false;
      if (sex !== "ALL" && p.sex !== sex) return false;
      if (city !== "ALL" && (p.city ?? "").trim() !== city) return false;

      if (qq) {
        const hay = `${p.name} ${p.breed ?? ""} ${p.city ?? ""} ${p.species} ${p.sex}`;
        if (!norm(hay).includes(qq)) return false;
      }

      return true;
    });

    out = [...out];
    if (sort === "NAME_ASC") {
      out.sort((a, b) => a.name.localeCompare(b.name, "sr"));
    } else if (sort === "NAME_DESC") {
      out.sort((a, b) => b.name.localeCompare(a.name, "sr"));
    } else if (sort === "CITY_ASC") {
      out.sort((a, b) => (a.city ?? "").localeCompare(b.city ?? "", "sr"));
    } else if (sort === "CITY_FIRST") {
      out.sort((a, b) => {
        const ac = (a.city ?? "").trim();
        const bc = (b.city ?? "").trim();
        const aHas = ac ? 0 : 1;
        const bHas = bc ? 0 : 1;
        if (aHas !== bHas) return aHas - bHas;
        return ac.localeCompare(bc, "sr");
      });
    } else {
      // NEWEST (MVP proxy)
      out.sort((a, b) => b.pet_id - a.pet_id);
    }

    return out;
  }, [items, species, sex, city, q, sort]);

  function resetFilters() {
    setSpecies("ALL");
    setSex("ALL");
    setCity("ALL");
    setQ("");
    setSort("NEWEST");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Header */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Ljubimci za parenje
              </h1>
              <p className="mt-1 text-sm text-gray-700">
                Javno dostupna lista. Filtriraj po vrsti, polu i gradu.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={load}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
              >
                Osveži
              </button>
              <button
                onClick={resetFilters}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
              >
                Reset
              </button>
            </div>
          </div>

          {loading && <p className="mt-4 text-sm text-gray-700">Učitavam…</p>}
          {err && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
              {err}
            </div>
          )}

          {/* Filters */}
          {!loading && !err && (
            <div className="mt-5 grid gap-3 md:grid-cols-5">
              <div>
                <div className="text-xs font-semibold text-gray-700">Vrsta</div>
                <select
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={species}
                  onChange={(e) =>
                    setSpecies(e.target.value as "ALL" | "DOG" | "CAT")
                  }
                >
                  <option value="ALL">Sve</option>
                  <option value="DOG">Pas</option>
                  <option value="CAT">Mačka</option>
                </select>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-700">Pol</div>
                <select
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={sex}
                  onChange={(e) =>
                    setSex(e.target.value as "ALL" | "MALE" | "FEMALE")
                  }
                >
                  <option value="ALL">Svi</option>
                  <option value="MALE">Mužjak</option>
                  <option value="FEMALE">Ženka</option>
                </select>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-700">Grad</div>
                <select
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="ALL">Svi gradovi</option>
                  {cityOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-gray-700">
                  Pretraga (ime / rasa / grad)
                </div>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="npr. labrador, beograd, max…"
                />
              </div>

              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-gray-700">Sort</div>
                <select
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  <option value="NEWEST">Najnovije</option>
                  <option value="CITY_FIRST">Najpre sa gradom</option>
                  <option value="CITY_ASC">Grad A–Z</option>
                  <option value="NAME_ASC">Ime A–Z</option>
                  <option value="NAME_DESC">Ime Z–A</option>
                </select>
              </div>

              <div className="md:col-span-3 flex items-end">
                <div className="text-sm text-gray-700">
                  Prikazano: <b className="text-gray-900">{filtered.length}</b>{" "}
                  / <b className="text-gray-900">{items.length}</b>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* List */}
        {!loading && !err && (
          <div className="rounded-2xl bg-white p-6 shadow">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border bg-gray-50 p-6">
                <div className="font-semibold text-gray-900">
                  Nema rezultata za izabrane filtere.
                </div>
                <p className="mt-2 text-sm text-gray-700">
                  Probaj da ukloniš grad ili pretragu.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => {
                  const avatar = `${API_BASE}/public/pets/${p.pet_id}/avatar`;

                  return (
                    <a
                      key={p.pet_id}
                      href={`/breeding/${p.pet_id}`}
                      className="block rounded-2xl border border-gray-300 bg-white p-5 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {/* AVATAR */}
                          <div className="h-12 w-12 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={avatar}
                              alt={p.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                // sakrij img, ostavi inicijale
                                e.currentTarget.style.display = "none";
                              }}
                            />
                            <span className="text-sm font-bold text-gray-700">
                              {initials(p.name)}
                            </span>
                          </div>

                          <div>
                            <div className="font-bold text-gray-900">{p.name}</div>
                            <div className="text-sm text-gray-700">
                              {p.species === "DOG" ? "Pas" : "Mačka"} •{" "}
                              {p.sex === "MALE" ? "Mužjak" : "Ženka"}
                              {p.breed ? ` • ${p.breed}` : ""}
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              {p.city ?? "Grad nije unet"}
                            </div>
                          </div>
                        </div>

                        <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                          PARENJE
                        </span>
                      </div>

                      {/* Namerno ne prikazujemo tag_id / public link */}
                      <div className="mt-3 text-xs text-gray-500">
                        Klikni za detalje
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
