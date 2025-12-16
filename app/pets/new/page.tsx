"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type Step = "TAG" | "FORM" | "DONE";

export default function NewPetPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("TAG");

  const [tagId, setTagId] = useState("");
  const [tagMsg, setTagMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [birthYear, setBirthYear] = useState<number | "">("");
  const [pedigree, setPedigree] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // auth guard
  useEffect(() => {
    const token = localStorage.getItem("petnfc_token");
    if (!token) router.replace("/login");
  }, [router]);

  const canActivate = useMemo(() => tagId.trim().length >= 3, [tagId]);
  const canCreate = useMemo(() => {
    return (
      tagId.trim().length >= 3 &&
      name.trim().length >= 1 &&
      species.trim().length >= 1 &&
      typeof birthYear === "number" &&
      birthYear >= 1900 &&
      birthYear <= 2100
    );
  }, [tagId, name, species, birthYear]);

  async function activateTag() {
    setLoading(true);
    setErr(null);
    setTagMsg(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(`${API_BASE}/tags/activate_auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_id: tagId.trim() }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setTagMsg(`Tag aktiviran: ${data.tag_id} (${data.status})`);
      setStep("FORM");
    } catch (e: any) {
      setErr(e?.message ?? "Greška pri aktivaciji taga");
    } finally {
      setLoading(false);
    }
  }

  async function createPet() {
    setLoading(true);
    setErr(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(`${API_BASE}/pets/create-and-assign_auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tag_id: tagId.trim(),
          name: name.trim(),
          species: species.trim(),
          birth_year: birthYear,
          pedigree,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      setStep("DONE");
      // posle kratkog momenta vrati na dashboard
      setTimeout(() => router.push("/dashboard"), 600);
    } catch (e: any) {
      setErr(e?.message ?? "Greška pri kreiranju ljubimca");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Dodaj ljubimca</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border px-3 py-1.5 text-sm font-semibold hover:bg-gray-100"
          >
            Nazad
          </button>
        </div>

        {/* STEP 1: TAG */}
        {step === "TAG" && (
          <>
            <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
              <b>Korak 1:</b> Aktiviraj tag (unesi ID taga koji si kupio).
            </div>

            <div>
              <label className="text-sm font-medium">ID taga</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="PET-0005"
                value={tagId}
                onChange={(e) => setTagId(e.target.value)}
              />
            </div>

            <button
              onClick={activateTag}
              disabled={loading || !canActivate}
              className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-40"
            >
              {loading ? "Aktiviram..." : "Aktiviraj tag"}
            </button>

            <a
              href="https://tvoja-prodavnica.com"
              className="block text-center text-sm underline text-gray-700"
            >
              Nemaš tag? Kupi ovde
            </a>

            {tagMsg && (
              <div className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
                {tagMsg}
              </div>
            )}
          </>
        )}

        {/* STEP 2: FORM */}
        {step === "FORM" && (
          <>
            <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
              <b>Korak 2:</b> Unesi identitet ljubimca (zaključava se nakon čuvanja).
            </div>

            <div className="text-sm text-gray-600">
              Tag: <b>{tagId.trim()}</b>
            </div>

            <div>
              <label className="text-sm font-medium">Ime</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rex"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Vrsta</label>

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSpecies("DOG")}
                  className={`flex-1 rounded-xl border px-4 py-2 font-semibold ${
                    species === "DOG"
                      ? "bg-black text-white"
                      : "bg-white hover:bg-gray-100"
                  }`}
                >
                  🐶 Pas
                </button>

                <button
                  type="button"
                  onClick={() => setSpecies("CAT")}
                  className={`flex-1 rounded-xl border px-4 py-2 font-semibold ${
                    species === "CAT"
                      ? "bg-black text-white"
                      : "bg-white hover:bg-gray-100"
                  }`}
                >
                  🐱 Mačka
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Godina rođenja</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={birthYear}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setBirthYear(v === "" ? "" : Number(v));
                }}
                placeholder="2020"
                inputMode="numeric"
              />
              <p className="mt-1 text-xs text-gray-500">
                Obavezno. Čuva se kao datum: YYYY-01-01.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pedigree}
                onChange={(e) => setPedigree(e.target.checked)}
              />
              Pedigre
            </label>

            <button
              onClick={createPet}
              disabled={loading || !canCreate}
              className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-40"
            >
              {loading ? "Čuvam..." : "Sačuvaj ljubimca (zaključaj identitet)"}
            </button>
          </>
        )}

        {/* DONE */}
        {step === "DONE" && (
          <div className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
            Sačuvano ✅ Vraćam te na Dashboard...
          </div>
        )}

        {err && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
            {err}
          </div>
        )}
      </div>
    </div>
  );
}
