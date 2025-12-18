"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type PetDetail = {
  pet_id: number;
  name: string;
  species: string;
  birth_date: string | null;
  pedigree: boolean;
  status: "ACTIVE" | "LOST" | "DECEASED";
  tag_id: string | null;
  tag_status: string | null;
};

export default function PetProfilePage() {
  const router = useRouter();
  const params = useParams();

  const petId = useMemo(() => {
    const raw = params?.petId;
    if (!raw) return null;
    const v = Array.isArray(raw) ? raw[0] : raw;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }, [params]);

  const [pet, setPet] = useState<PetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadPet() {
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) {
        router.replace("/login");
        return;
      }
      if (!petId) throw new Error("Neispravan petId u URL-u.");

      const res = await fetch(`${API_BASE}/pets/${petId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      setPet(JSON.parse(text));
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  async function toggleLost() {
    setErr(null);
    setMsg(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");
      if (!pet) throw new Error("Nema podataka o ljubimcu.");

      const nextLost = pet.status !== "LOST";

      const res = await fetch(`${API_BASE}/pets/${pet.pet_id}/lost_auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lost: nextLost }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      setPet({ ...pet, status: nextLost ? "LOST" : "ACTIVE" });
      setMsg(nextLost ? "LOST uključen" : "LOST isključen");
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
    loadPet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  const publicUrl = pet?.tag_id ? `https://pet-nfc.vercel.app/t/${encodeURIComponent(pet.tag_id)}` : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Profil ljubimca</h1>
              <p className="mt-1 text-sm text-gray-600">Ovo je centralna stranica (dnevnik, zdravlje, podsetnici… kasnije).</p>
            </div>

            <div className="flex gap-2">
              <a
                href="/dashboard"
                className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
              >
                ← Dashboard
              </a>
              {pet && (
                <a
                  href={`/pets/${pet.pet_id}/edit`}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
                >
                  Izmeni profil
                </a>
              )}
            </div>
          </div>

          {loading && <p className="mt-4 text-sm text-gray-600">Učitavam…</p>}

          {msg && (
            <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">
              {msg}
            </div>
          )}

          {err && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
              {err}
            </div>
          )}
        </div>

        {!loading && pet && (
          <div className="rounded-2xl bg-white p-6 shadow space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">
                  {pet.name} <span className="text-gray-500">({pet.species})</span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Status:{" "}
                  <span className={`font-bold ${pet.status === "LOST" ? "text-red-600" : "text-green-700"}`}>
                    {pet.status === "LOST" ? "LOST" : "SAFE"}
                  </span>
                </div>
              </div>

              <button
                onClick={toggleLost}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                  pet.status === "LOST" ? "bg-red-600" : "bg-emerald-600"
                }`}
              >
                {pet.status === "LOST" ? "Isključi LOST" : "Uključi LOST"}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">Tag ID</div>
                <div className="mt-1 font-mono font-semibold">{pet.tag_id ?? "-"}</div>
                <div className="mt-1 text-xs text-gray-500">Tag status: {pet.tag_status ?? "-"}</div>

                {publicUrl ? (
                  <div className="mt-2 text-sm">
                    Public link:{" "}
                    <a className="underline" href={publicUrl} target="_blank" rel="noreferrer">
                      /t/{pet.tag_id}
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">Zaključani podaci</div>
                <div className="mt-2 text-sm text-gray-700 space-y-1">
                  <div>
                    Godina rođenja:{" "}
                    <b>{pet.birth_date ? pet.birth_date.slice(0, 4) : "-"}</b>
                  </div>
                  <div>
                    Pedigree: <b>{pet.pedigree ? "DA" : "NE"}</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="font-semibold">Sledeće funkcije (uskoro ovde):</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Zdravstveni karton</li>
                <li>Dnevnik (beleške)</li>
                <li>Podsetnici (vakcine, terapija)</li>
                <li>Breeding toggle + oznaka</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
