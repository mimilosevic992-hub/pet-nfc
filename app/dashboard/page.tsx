"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireOwnerContact } from "@/app/lib/guards";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type PetRow = {
  pet_id: number;
  name: string;
  species: string;
  status: "ACTIVE" | "LOST" | "DECEASED";
  tag_id: string | null;
  tag_status: string | null;

  avatar_url?: string | null;
  breeding?: boolean | null;
};

type DashReminder = {
  id: number;
  pet_id: number;
  pet_name: string;
  type: "VACCINE" | "CHECKUP" | "THERAPY" | string;
  date: string; // YYYY-MM-DD
  title: string;
  notes?: string | null;
  status: "upcoming" | "today" | "overdue" | string;
};

function initials(name: string) {
  const n = (name || "").trim();
  if (!n) return "🐾";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function toDate(d: string) {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(y, (m || 1) - 1, dd || 1);
}

function inNext7Days(d: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(today);
  end.setDate(end.getDate() + 7);

  const rd = toDate(d);
  rd.setHours(0, 0, 0, 0);

  return rd >= today && rd <= end;
}

export default function DashboardPage() {
  const router = useRouter();

  const [pets, setPets] = useState<PetRow[]>([]);
  const [upcoming, setUpcoming] = useState<DashReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function logout() {
    localStorage.removeItem("petnfc_token");
    router.push("/login");
  }

  async function loadPets() {
    setLoading(true);
    setMsg(null);
    setErr(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await fetch(`${API_BASE}/pets/my_auth`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      const data = JSON.parse(text) as PetRow[];
      setPets(data);

      // reminders ne sme da blokira dashboard
      loadUpcomingReminders(data);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  async function loadUpcomingReminders(rows: PetRow[]) {
    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) return;

      const alive = rows.filter((p) => p.status !== "DECEASED");

      const all = await Promise.all(
        alive.map(async (p) => {
          const res = await fetch(`${API_BASE}/pets/${p.pet_id}/reminders_auth`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });

          const text = await res.text();
          if (!res.ok) return [];

          const list = JSON.parse(text) as Array<{
            id: number;
            pet_id: number;
            type: string;
            date: string;
            title: string;
            notes?: string | null;
            status: string;
          }>;

          return list.map((r) => ({
            ...r,
            pet_name: p.name,
          })) as DashReminder[];
        })
      );

      const flat = all.flat();

      const filtered = flat
        .filter((r) => inNext7Days(r.date))
        .sort((a, b) => a.date.localeCompare(b.date));

      setUpcoming(filtered);
    } catch {
      setUpcoming([]);
    }
  }

  async function toggleLost(petId: number, nextLost: boolean) {
    setMsg(null);
    setErr(null);

    try {
      // ✅ STRICT: pre nego uključi LOST, proveri owner phone+city
      if (nextLost) {
        const ok = await requireOwnerContact(router, setErr);
        if (!ok) return;
      }

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

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      setPets((prev) =>
        prev.map((p) =>
          p.pet_id === petId ? { ...p, status: nextLost ? "LOST" : "ACTIVE" } : p
        )
      );

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
    loadPets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasPets = pets.length > 0;

  const title = useMemo(() => {
    if (loading) return "Dashboard";
    if (!hasPets) return "Dashboard — nema ljubimaca";
    return "Dashboard";
  }, [loading, hasPets]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Header */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="mt-1 text-sm text-gray-700">
                Tvoji ljubimci i brze akcije (LOST / profil).
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/pets/new"
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                + Dodaj ljubimca
              </a>

              <button
                onClick={loadPets}
                disabled={loading}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-40"
              >
                {loading ? "Učitavam..." : "Osveži"}
              </button>

              <a
                href="/me"
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
              >
                Moj profil
              </a>

              <button
                onClick={logout}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
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

        {/* Upcoming reminders */}
        {upcoming.length > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Podsetnici (narednih 7 dana)
              </h2>
              <div className="text-sm text-gray-700">{upcoming.length} ukupno</div>
            </div>

            <div className="mt-3 space-y-2">
              {upcoming.map((r) => (
                <a
                  key={r.id}
                  href={`/pets/${r.pet_id}/reminders`}
                  className="block rounded-xl border border-gray-300 p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-gray-900">
                      {r.pet_name}: {r.title}
                    </div>
                    <div className="text-sm text-gray-700">{r.date}</div>
                  </div>

                  <div className="mt-1 text-sm text-gray-700">
                    {r.type} • {r.status}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Pets */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Moji ljubimci</h2>
            <div className="text-sm text-gray-700">
              Ukupno: <b>{pets.length}</b>
            </div>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-gray-700">Učitavam…</p>
          ) : !hasPets ? (
            <div className="mt-4 rounded-2xl border bg-gray-50 p-6">
              <div className="font-semibold text-gray-900">Nemaš još ljubimaca.</div>
              <p className="mt-2 text-sm text-gray-700">
                Klikni na <b>Dodaj ljubimca</b> i aktiviraj tag da kreiraš profil.
              </p>
              <a
                href="/pets/new"
                className="mt-4 inline-flex rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                + Dodaj ljubimca
              </a>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pets.map((p) => {
                const isLost = p.status === "LOST";
                const avatar = p.avatar_url;

                return (
                  <div
                    key={p.pet_id}
                    className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm flex flex-col gap-3"
                  >
                    {/* Top */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden">
                          {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={avatar}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-gray-700">
                              {initials(p.name)}
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="font-semibold text-gray-900">
                            {p.name}{" "}
                            <span className="text-gray-600">({p.species})</span>
                          </div>
                          <div className="text-xs text-gray-700 mt-0.5">
                            Tag: <span className="font-mono">{p.tag_id ?? "-"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            isLost
                              ? "bg-red-100 text-red-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isLost ? "LOST" : "SAFE"}
                        </span>

                        {p.breeding ? (
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">
                            BREEDING
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {p.tag_id ? (
                      <div className="text-sm text-gray-700">
                        Public profil:{" "}
                        <a
                          className="underline"
                          href={`https://pet-nfc.vercel.app/t/${encodeURIComponent(
                            p.tag_id
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          /t/{p.tag_id}
                        </a>
                      </div>
                    ) : null}

                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <a
                        href={`/pets/${p.pet_id}`}
                        className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900 hover:bg-gray-100"
                      >
                        Profil
                      </a>
                      <a
                        href={`/pets/${p.pet_id}/edit`}
                        className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900 hover:bg-gray-100"
                      >
                        Izmeni profil
                      </a>
                    </div>

                    <button
                      onClick={() => toggleLost(p.pet_id, !isLost)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                        isLost ? "bg-red-600" : "bg-emerald-600"
                      }`}
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
