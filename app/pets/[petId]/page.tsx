"use client";

import { Accordion } from "@/app/components/Accordion";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { requireOwnerContact } from "@/app/lib/guards";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  const s = (first + second).toUpperCase();
  return s || "🐾";
}

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

  const [confirmLostOpen, setConfirmLostOpen] = useState(false);

  // Breeding state (dok ne uvežemo backend, držimo lokalno)
  const [breedingOn, setBreedingOn] = useState(false);

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

      const data = JSON.parse(text) as PetDetail;
      setPet(data);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  async function setLost(nextLost: boolean) {
    setErr(null);
    setMsg(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");
      if (!pet) throw new Error("Nema podataka o ljubimcu.");

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

  async function toggleBreeding(next: boolean) {
    setErr(null);
    setMsg(null);

    try {
      // TODO: uveži sa backendom kada bude spremno
      setBreedingOn(next);
      setMsg(next ? "Status parenja uključen" : "Status parenja isključen");
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

  const publicUrl = pet?.tag_id
    ? `https://pet-nfc.vercel.app/t/${encodeURIComponent(pet.tag_id)}`
    : null;

  const lostOn = pet?.status === "LOST";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* TOP HEADER */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profil ljubimca</h1>
              <p className="mt-1 text-sm text-gray-700">
                Brze akcije + sažetak. Detalji su u sekcijama ispod.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/dashboard"
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
              >
                ← Dashboard
              </a>

              {pet && (
                <a
                  href={`/pets/${pet.pet_id}/edit`}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                >
                  Izmeni profil
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

        {/* HERO */}
        {!loading && pet && (
          <div className="rounded-2xl bg-white p-6 shadow space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-lg font-extrabold text-gray-900">
                  {initials(pet.name)}
                </div>

                <div>
                  <div className="text-xl font-bold text-gray-900">
                    {pet.name}{" "}
                    <span className="text-gray-600 font-semibold">
                      ({pet.species})
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        lostOn
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {lostOn ? "LOST" : "SAFE"}
                    </span>

                    {breedingOn && (
                      <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">
                        PARENJE ON
                      </span>
                    )}

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
                      TAG: {pet.tag_id ?? "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick link (public) */}
              {publicUrl ? (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                >
                  🌍 Javni profil
                </a>
              ) : (
                <span className="text-sm text-gray-700">Nema taga</span>
              )}
            </div>

            {/* GRID ACTIONS */}
            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={`/pets/${pet.pet_id}/health`}
                className="rounded-2xl border border-gray-300 bg-white p-5 hover:bg-gray-50"
              >
                <div className="text-sm font-bold text-gray-900">
                  💉 Zdravstveni karton
                </div>
                <div className="mt-1 text-sm text-gray-700">
                  Vakcine, pregledi, terapije, alergije, beleške + PDF.
                </div>
              </a>

              <a
                href={`/pets/${pet.pet_id}/reminders`}
                className="rounded-2xl border border-gray-300 bg-white p-5 hover:bg-gray-50"
              >
                <div className="text-sm font-bold text-gray-900">⏰ Podsetnici</div>
                <div className="mt-1 text-sm text-gray-700">
                  Vakcine, pregledi i terapije (today/overdue/upcoming).
                </div>
              </a>

              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Dnevnik dolazi uskoro 🙂");
                }}
                className="rounded-2xl border border-gray-300 bg-white p-5 hover:bg-gray-50"
              >
                <div className="text-sm font-bold text-gray-900">📝 Dnevnik</div>
                <div className="mt-1 text-sm text-gray-700">
                  Beleške kroz vreme (kasnije).
                </div>
              </a>

              <a
                href={publicUrl ?? "#"}
                target={publicUrl ? "_blank" : undefined}
                rel={publicUrl ? "noreferrer" : undefined}
                className={`rounded-2xl border border-gray-300 bg-white p-5 hover:bg-gray-50 ${
                  publicUrl ? "" : "opacity-60 pointer-events-none"
                }`}
              >
                <div className="text-sm font-bold text-gray-900">🌍 Javni profil</div>
                <div className="mt-1 text-sm text-gray-700">
                  Stranica koju vidi nalazač preko NFC taga.
                </div>
              </a>
            </div>

            {/* ACCORDIONS */}
            <div className="space-y-3">
              <Accordion title="Osnovni podaci">
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div className="rounded-xl border border-gray-300 p-4">
                    <div className="text-gray-700">Datum rođenja</div>
                    <div className="mt-1 font-semibold text-gray-900">
                      {pet.birth_date ?? "-"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-300 p-4">
                    <div className="text-gray-700">Pedigree</div>
                    <div className="mt-1 font-semibold text-gray-900">
                      {pet.pedigree ? "DA" : "NE"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-300 p-4 sm:col-span-2">
                    <div className="text-gray-700">Tag status</div>
                    <div className="mt-1 font-semibold text-gray-900">
                      {pet.tag_status ?? "-"}
                    </div>
                  </div>
                </div>
              </Accordion>

              <Accordion title="Zdravstveni sažetak">
                <div className="text-sm text-gray-800">
                  Ovo ćemo popuniti “pametan sažetak” iz kartona (poslednja vakcina,
                  poslednji pregled, alergije, aktivna terapija…).
                </div>
                <div className="mt-3">
                  <a
                    href={`/pets/${pet.pet_id}/health`}
                    className="inline-block rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Otvori karton
                  </a>
                </div>
              </Accordion>

              <Accordion title="Vidljivost">
                <div className="space-y-4">
                  {/* LOST */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-gray-900">LOST mod</div>
                      <div className="mt-1 text-sm text-gray-700">
                        Kada je uključen, javni profil prikazuje kontakt podatke vlasnika.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!lostOn) {
                          const ok = await requireOwnerContact(router, setErr);
                          if (!ok) return;          // ❗ strict
                          setConfirmLostOpen(true); // owner podaci ok → confirm
                        } else {
                          setLost(false);           // gašenje bez provere
                        }
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-bold ${
                        lostOn ? "bg-red-600 text-white" : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      {lostOn ? "LOST: ON" : "LOST: OFF"}
                    </button>
                  </div>

                  {/* PARENJE */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-gray-900">Status parenja</div>
                      <div className="mt-1 text-sm text-gray-700">
                        Kada je uključen, ljubimac će se pojaviti na početnoj stranici u sekciji
                        „Ljubimci za parenje“.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleBreeding(!breedingOn)}
                      className={`rounded-full px-4 py-2 text-sm font-bold ${
                        breedingOn ? "bg-black text-white" : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      {breedingOn ? "PARENJE: ON" : "PARENJE: OFF"}
                    </button>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                    <b>Napomena:</b> kasnije dodajemo “Breeding profil” (pol, grad, rasa, opis…)
                    da listing bude kvalitetan.
                  </div>
                </div>

                {/* Confirm modal */}
                {confirmLostOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow">
                      <div className="text-lg font-bold text-gray-900">
                        Uključiti LOST mod?
                      </div>
                      <div className="mt-2 text-sm text-gray-700">
                        Ovo će omogućiti da nalazač na javnom profilu vidi kontakt podatke vlasnika.
                      </div>

                      <div className="mt-5 flex justify-end gap-2">
                        <button
                          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                          onClick={() => setConfirmLostOpen(false)}
                        >
                          Otkaži
                        </button>

                        <button
                          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                          onClick={async () => {
                            const ok = await requireOwnerContact(router, setErr);
                            if (!ok) {
                              setConfirmLostOpen(false);
                              return;
                            }
                            setConfirmLostOpen(false);
                            setLost(true);
                          }}
                        >
                          Da, uključi
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </Accordion>

              <Accordion title="Recovery & Security">
                <div className="space-y-3">
                  <div className="rounded-xl border border-gray-300 p-4">
                    <div className="font-semibold text-gray-900">Skeniranja taga</div>
                    <div className="mt-2 text-sm text-gray-800">
                      Ovde premeštamo statistiku skeniranja (ukupno, poslednje, LOST skeniranja).
                      <br />
                      Pošalji mi endpoint koji koristiš za scan stats i ubaciću tačno.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      alert("LOST poster: ubacićemo download action iz postojećeg koda 🙂")
                    }
                    className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                  >
                    🖼️ Preuzmi LOST poster
                  </button>
                </div>
              </Accordion>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
