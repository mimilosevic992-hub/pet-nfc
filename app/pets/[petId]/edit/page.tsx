"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type PetDetail = {
  pet_id: number;
  name: string;
  species: string;
  birth_date: string | null;

  // backend ti možda vraća "TRUE"/"FALSE" ili bool — mi ćemo tretirati fleksibilno
  pedigree: any;

  status: "ACTIVE" | "LOST" | "DECEASED";
  tag_id: string | null;
  tag_status: string | null;

  sex?: "MALE" | "FEMALE" | "UNKNOWN";
  breed?: string | null;
  is_neutered?: "YES" | "NO" | "UNKNOWN";
  notes?: string | null;

  avatar_url?: string | null;
};

function toBool(v: any) {
  if (typeof v === "boolean") return v;
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "da" || s === "y";
}

function prettySpecies(s: string) {
  return s === "DOG" ? "Pas" : s === "CAT" ? "Mačka" : s;
}
function prettySex(s?: string) {
  if (!s) return "—";
  if (s === "MALE") return "Mužjak";
  if (s === "FEMALE") return "Ženka";
  return s;
}

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

  // editable fields
  const [pedigree, setPedigree] = useState(false);
  const [breed, setBreed] = useState("");
  const [isNeutered, setIsNeutered] = useState<"YES" | "NO" | "UNKNOWN">(
    "UNKNOWN"
  );
  const [notes, setNotes] = useState("");

  // state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
      setPedigree(toBool(data.pedigree));

      // reset local preview on reload
      setAvatarFile(null);
      setAvatarPreview(null);
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
      await loadPet();
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar() {
    setErr(null);
    setMsg(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");
      if (!petId) throw new Error("Neispravan petId.");
      if (!avatarFile) throw new Error("Izaberi sliku.");

      // mali guard: samo slike
      if (!avatarFile.type.startsWith("image/")) {
        throw new Error("Fajl mora biti slika (image/*).");
      }

      setUploadingAvatar(true);

      const fd = new FormData();
      fd.append("file", avatarFile);

      const res = await fetch(`${API_BASE}/pets/${petId}/avatar_auth`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      setMsg("Slika sačuvana ✅");
      await loadPet();
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function deleteAvatar() {
    setErr(null);
    setMsg(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");
      if (!petId) throw new Error("Neispravan petId.");

      const res = await fetch(`${API_BASE}/pets/${petId}/avatar_auth`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      setMsg("Slika obrisana ✅");
      await loadPet();
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

  useEffect(() => {
    // cleanup object url
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(avatarPreview);
        } catch {}
      }
    };
  }, [avatarPreview]);

  const birthYear = pet?.birth_date ? String(pet.birth_date).slice(0, 4) : "-";

  const currentAvatar = pet?.avatar_url || null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Header */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Izmeni profil</h1>
              <p className="mt-1 text-sm text-gray-700">
                Zaključani podaci se ne mogu menjati (ime, vrsta, godina rođenja,
                tag, pol).
              </p>
            </div>

            <div className="flex gap-2">
              {pet ? (
                <a
                  href={`/pets/${pet.pet_id}`}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                >
                  ← Profil
                </a>
              ) : (
                <a
                  href="/dashboard"
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                >
                  ← Dashboard
                </a>
              )}
            </div>
          </div>

          {loading && <p className="mt-4 text-sm text-gray-700">Učitavam…</p>}

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
            {/* Avatar */}
            <div className="rounded-2xl border border-gray-300 p-4">
              <div className="font-semibold text-gray-900">Slika ljubimca</div>

              <div className="mt-3 flex items-center gap-4">
                <div className="h-20 w-20 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-gray-600">🐾</span>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setAvatarFile(f);
                      setAvatarPreview(f ? URL.createObjectURL(f) : null);
                    }}
                    className="block w-full text-sm"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={uploadAvatar}
                      disabled={uploadingAvatar || !avatarFile}
                      className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {uploadingAvatar ? "Upload..." : "Sačuvaj sliku"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                      disabled={uploadingAvatar || (!avatarFile && !avatarPreview)}
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-40"
                    >
                      Poništi izbor
                    </button>

                    <button
                      type="button"
                      onClick={deleteAvatar}
                      disabled={uploadingAvatar || !currentAvatar}
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-40"
                    >
                      Obriši
                    </button>
                  </div>

                  <p className="text-xs text-gray-500">
                    Preporuka: mala slika. Backend limit (MVP): max 1MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Locked */}
            <div className="rounded-2xl border border-gray-300 p-4">
              <div className="font-semibold text-gray-900">Zaključano</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <div className="text-gray-600">Ime</div>
                  <div className="font-semibold text-gray-900">{pet.name}</div>
                </div>

                <div>
                  <div className="text-gray-600">Vrsta</div>
                  <div className="font-semibold text-gray-900">
                    {prettySpecies(pet.species)}
                  </div>
                </div>

                <div>
                  <div className="text-gray-600">Godina rođenja</div>
                  <div className="font-semibold text-gray-900">{birthYear}</div>
                </div>

                <div>
                  <div className="text-gray-600">Tag ID</div>
                  <div className="font-mono font-semibold text-gray-900">
                    {pet.tag_id ?? "-"}
                  </div>
                </div>

                <div>
                  <div className="text-gray-600">Pol</div>
                  <div className="font-semibold text-gray-900">
                    {prettySex(pet.sex)}
                  </div>
                </div>
              </div>
            </div>

            {/* Editable */}
            <div className="rounded-2xl border border-gray-300 p-4">
              <div className="font-semibold text-gray-900">Izmenjivo</div>

              <label className="mt-3 flex items-center gap-2 text-sm text-gray-900">
                <input
                  type="checkbox"
                  checked={pedigree}
                  onChange={(e) => setPedigree(e.target.checked)}
                />
                Pedigree (prikaži oznaku)
              </label>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Rasa (opciono)
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    placeholder="npr. Labrador, Mešanac…"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Sterilisan / kastriran
                  </label>
                  <select
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2"
                    value={isNeutered}
                    onChange={(e) => setIsNeutered(e.target.value as any)}
                  >
                    <option value="UNKNOWN">Nepoznato</option>
                    <option value="YES">Da</option>
                    <option value="NO">Ne</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Napomena (opciono)
                  </label>
                  <textarea
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2"
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
