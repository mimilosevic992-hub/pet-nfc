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
  sex?: "MALE" | "FEMALE" | "UNKNOWN";
  breed?: string | null;
  is_neutered?: "YES" | "NO" | "UNKNOWN";
  notes?: string | null;
};

export default function PetEditPage() {
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
  const [pedigree, setPedigree] = useState(false);
  const [breed, setBreed] = useState("");
  const [isNeutered, setIsNeutered] = useState<"YES" | "NO" | "UNKNOWN">("UNKNOWN");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
      if (!petId) throw new Error("Neispravan petId.");

      // koristi istu rutu kao na profilu
      const res = await fetch(`${API_BASE}/pets/${petId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      const data = JSON.parse(text) as PetDetail;
      setPet(data);
      setBreed(data.breed ?? "");
      setIsNeutered((data.is_neutered as any) ?? "UNKNOWN");
      setNotes(data.notes ?? "");
      setPedigree(!!data.pedigree);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");
      if (!petId) throw new Error("Neispravan petId.");

      const res = await fetch(`${API_BASE}/pets/${petId}/edit_auth`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pedigree,
          breed: breed.trim() || null,
          is_neutered: isNeutered,
          notes: notes.trim() || null,
        }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      setMsg("Sačuvano ✅");
      // reload da osveži pet state
      await loadPet();
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setSaving(false);
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

  const birthYear = pet?.birth_date ? String(pet.birth_date).slice(0, 4) : "-";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Izmeni profil</h1>
              <p className="mt-1 text-sm text-gray-600">
                Zaključani podaci se ne mogu menjati. (Ime, vrsta, godina rođenja, tag)
              </p>
            </div>
            <div className="flex gap-2">
              {pet ? (
                <a
                  href={`/pets/${pet.pet_id}`}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
                >
                  ← Profil
                </a>
              ) : (
                <a
                  href="/dashboard"
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
                >
                  ← Dashboard
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
            {/* Locked */}
            <div className="rounded-2xl border p-4">
              <div className="font-semibold">Zaključano</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <div className="text-gray-500">Ime</div>
                  <div className="font-semibold">{pet.name}</div>
                </div>
                <div>
                  <div className="text-gray-500">Vrsta</div>
                  <div className="font-semibold">{pet.species}</div>
                </div>
                <div>
                  <div className="text-gray-500">Godina rođenja</div>
                  <div className="font-semibold">{birthYear}</div>
                </div>
                <div>
                  <div className="text-gray-500">Tag ID</div>
                  <div className="font-mono font-semibold">{pet.tag_id ?? "-"}</div>
                </div>
                <div>
                  <div className="text-gray-500">Pol</div>
                  <div className="font-semibold">{pet.sex ?? "UNKNOWN"}</div>
                </div>
              </div>
            </div>

            {/* Editable */}
            <div className="rounded-2xl border p-4">
              <div className="font-semibold">Izmenjivo</div>

              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pedigree}
                  onChange={(e) => setPedigree(e.target.checked)}
                />
                Pedigree (prikaži oznaku)
              </label>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium">Rasa (opciono)</label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    placeholder="npr. Labrador, Mešanac…"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Sterilisan / kastriran</label>
                  <select
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={isNeutered}
                    onChange={(e) => setIsNeutered(e.target.value as any)}
                  >
                    <option value="UNKNOWN">Nepoznato</option>
                    <option value="YES">Da</option>
                    <option value="NO">Ne</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Napomena (opciono)</label>
                  <textarea
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="npr. plašljiv, ne voli druge pse, alergija na…"
                  />
                </div>
              </div>

              <button
                onClick={save}
                disabled={saving}
                className="mt-4 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-40"
              >
                {saving ? "Čuvam..." : "Sačuvaj"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
