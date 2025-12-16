"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";



export default function NewPetPage() {
  const router = useRouter();

  const [tagId, setTagId] = useState("");
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("Dog");
  const [birthDate, setBirthDate] = useState("");
  const [pedigree, setPedigree] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("petnfc_token");
    if (!token) router.push("/login");
  }, [router]);

  async function createPet() {
    setLoading(true);
    setMsg(null);
    setErr(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      // 1) Activate tag (FREE -> ACTIVE)
      const activateRes = await fetch(`${API_BASE}/tags/activate_auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_id: tagId }),
      });

      if (!activateRes.ok) {
        const t = await activateRes.text();
        throw new Error(t || "Greška pri aktivaciji taga");
      }

      // 2) Create pet + assign (ACTIVE -> ASSIGNED)
      const assignRes = await fetch(`${API_BASE}/pets/create-and-assign_auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tag_id: tagId,
          name,
          species,
          birth_date: birthDate,
          pedigree: pedigree || null,
        }),
      });

      if (!assignRes.ok) {
        const t = await assignRes.text();
        throw new Error(t || "Greška pri kreiranju ljubimca");
      }

      setMsg("Ljubimac uspešno dodat ✅");
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("petnfc_token");
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dodaj ljubimca</h1>
          <button
            onClick={logout}
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
          >
            Logout
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-600">
          Unesi ID NFC taga, aktiviraj ga i dodeli ljubimcu.
        </p>

        <div className="mt-6 grid gap-3">
          <div>
            <label className="text-sm font-medium">NFC Tag ID</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={tagId}
              onChange={(e) => setTagId(e.target.value)}
              placeholder="npr. PET-0001"
            />
            <p className="mt-1 text-xs text-gray-500">
              Savet: koristi format kao PET-0001 / TEST-NEW-01.
            </p>
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
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
            >
              <option>Dog</option>
              <option>Cat</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Datum rođenja</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Pedigre (opciono)</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={pedigree}
              onChange={(e) => setPedigree(e.target.value)}
              placeholder="FCI-123456"
            />
          </div>

          <button
            onClick={createPet}
            disabled={loading || !tagId || !name || !species || !birthDate}
            className="mt-2 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading ? "Radim..." : "Aktiviraj tag i dodaj ljubimca"}
          </button>

          {msg && (
            <div className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
              {msg}
            </div>
          )}

          {err && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
              {err}
            </div>
          )}

          <div className="pt-2 text-sm text-gray-600">
            Nazad:{" "}
            <a className="underline" href="/dashboard">
              Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
