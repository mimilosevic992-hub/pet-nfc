"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type BreedingItem = {
  pet_id: number;
  name: string;
  species: string;
  sex: "MALE" | "FEMALE";
  breed: string | null;
  city: string | null;
  tag_id: string | null;
  public_url: string | null; // "/t/<tag>"
};

export default function BreedingPage() {
  const [items, setItems] = useState<BreedingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`${API_BASE}/public/breeding?limit=50`, { cache: "no-store" });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      setItems(JSON.parse(text));
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ljubimci za parenje</h1>
              <p className="mt-1 text-sm text-gray-700">
                Javno dostupna lista (MVP). Kasnije dodajemo filtere, opis, slike i detaljan “breeding profil”.
              </p>
            </div>

            <button
              onClick={load}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
            >
              Osveži
            </button>
          </div>

          {loading && <p className="mt-4 text-sm text-gray-700">Učitavam…</p>}
          {err && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">{err}</div>}
        </div>

        {!loading && !err && (
          <div className="rounded-2xl bg-white p-6 shadow">
            {items.length === 0 ? (
              <div className="rounded-2xl border bg-gray-50 p-6">
                <div className="font-semibold text-gray-900">Trenutno nema ljubimaca za parenje.</div>
                <p className="mt-2 text-sm text-gray-700">Vlasnici uključuju status parenja sa profila ljubimca.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <div key={p.pet_id} className="rounded-2xl border border-gray-300 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-gray-900">{p.name}</div>
                        <div className="text-sm text-gray-700">
                          {p.species} • {p.sex === "MALE" ? "Mužjak" : "Ženka"}
                          {p.breed ? ` • ${p.breed}` : ""}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">{p.city ?? "Grad nije unet"}</div>
                      </div>

                      <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">PARENJE</span>
                    </div>

                    {p.tag_id ? (
                      <div className="mt-3 text-sm text-gray-700">
                        Public profil:{" "}
                        <a
                          className="underline"
                          href={`https://pet-nfc.vercel.app/t/${encodeURIComponent(p.tag_id)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          /t/{p.tag_id}
                        </a>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
