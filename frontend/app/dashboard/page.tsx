"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = "http://127.0.0.1:8000";

type PetRow = {
  pet_id: number;
  name: string;
  species: string;
  status: "ACTIVE" | "LOST" | "DECEASED";
  tag_id: string | null;
  tag_status: string | null;
};

export default function DashboardPage() {
    const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("petnfc_token");
    if (!token) router.push("/login");
  }, [router]);

  const [pets, setPets] = useState<PetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

    async function loadPets() {
        setLoading(true);
        setMsg(null);
        setErr(null);

        try {
            const token = localStorage.getItem("petnfc_token");
            if (!token) throw new Error("Nisi ulogovan.");

            const res = await fetch(`${API_BASE}/pets/my_auth`, {
            headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(await res.text());

            const data = (await res.json()) as PetRow[];
            setPets(data);
            setMsg(`Učitano: ${data.length} ljubimaca`);
        } catch (e: any) {
            setErr(e?.message ?? "Greška");
        } finally {
            setLoading(false);
        }
        }


    async function toggleLost(petId: number, nextLost: boolean) {
        setLoading(true);
        setMsg(null);
        setErr(null);

        try {
            const token = localStorage.getItem("petnfc_token");
            if (!token) throw new Error("Nisi ulogovan.");

            const res = await fetch(`${API_BASE}/pets/${petId}/lost_auth`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ lost: nextLost }),
            });

            if (!res.ok) throw new Error(await res.text());

            await loadPets();
            setMsg(nextLost ? "LOST uključen" : "LOST isključen");
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
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <a
              href="/pets/new"
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              + Dodaj ljubimca
            </a>
            <button
              onClick={logout}
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
       

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
            onClick={loadPets}
            disabled={loading}
            className="mt-4 rounded-xl bg-black px-4 py-2 font-semibold text-white disabled:opacity-40"
            >
            {loading ? "..." : "Učitaj moje ljubimce"}
            </button>
          </div>

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

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold">Moji ljubimci</h2>

          {pets.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">Nema ljubimaca (ili još nisi učitao).</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {pets.map((p) => {
                const isLost = p.status === "LOST";
                return (
                  <div
                    key={p.pet_id}
                    className="rounded-2xl border bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-semibold">
                        {p.name} <span className="text-gray-500">({p.species})</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Status: <b>{p.status}</b> • Tag: <b>{p.tag_id ?? "-"}</b>
                      </div>
                      {p.tag_id && (
                        <div className="text-sm text-gray-600">
                          NFC link:{" "}
                          <a
                            className="underline"
                            href={`http://127.0.0.1:8000/t/${p.tag_id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            /t/{p.tag_id}
                          </a>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => toggleLost(p.pet_id, !isLost)}
                      disabled={loading}
                      className={`rounded-xl px-4 py-2 font-semibold text-white ${
                        isLost ? "bg-red-600" : "bg-emerald-600"
                      } disabled:opacity-40`}
                    >
                      {isLost ? "Isključi LOST" : "Uključi LOST"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
