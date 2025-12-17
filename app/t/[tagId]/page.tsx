"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type StateResponse =
  | { state: "UNACTIVATED"; message: string }
  | { state: "UNASSIGNED"; message: string }
  | {
      state: "SAFE" | "LOST";
      pet: { name: string; species: string; status: "ACTIVE" | "LOST" | "DECEASED" };
      owner?: { phone?: string | null; email?: string | null };
      message?: string;
    };

export default function PublicTagPage() {
  const params = useParams();

  const tagId = useMemo(() => {
    const raw = (params as any)?.tagId;
    if (!raw) return "";
    const v = Array.isArray(raw) ? raw[0] : raw;
    try {
      return decodeURIComponent(v);
    } catch {
      return String(v);
    }
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<StateResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);
      setData(null);

      if (!tagId) {
        setErr("Neispravan link (tagId nedostaje).");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/t/${encodeURIComponent(tagId)}/state`, {
          cache: "no-store",
        });

        const text = await res.text();

        let json: any;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error(text || "Server nije vratio validan JSON.");
        }

        if (!res.ok) {
          throw new Error(json?.detail || json?.message || `Greška: ${res.status}`);
        }

        if (!cancelled) setData(json as StateResponse);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Greška");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [tagId]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <h1 className="text-xl font-bold">Pet NFC</h1>
        <div className="mt-2 text-sm text-gray-600">
          Tag: <span className="font-mono">{tagId || "-"}</span>
        </div>

        {loading && (
          <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
            Učitavam…
          </div>
        )}

        {err && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
            {err}
          </div>
        )}

        {!loading && !err && data && (
          <div className="mt-4 space-y-3">
            {data.state === "UNACTIVATED" && (
              <>
                <div className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold">
                  NIJE AKTIVIRAN
                </div>
                <p className="text-sm text-gray-700">{data.message}</p>
                <p className="text-sm text-gray-600">
                  Vlasnik treba da aktivira tag u aplikaciji (Setup → Aktiviraj tag).
                </p>
              </>
            )}

            {data.state === "UNASSIGNED" && (
              <>
                <div className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold">
                  NIJE DODELJENO
                </div>
                <p className="text-sm text-gray-700">{data.message}</p>
                <p className="text-sm text-gray-600">
                  Tag je aktivan, ali još nije dodeljen ljubimcu.
                </p>
              </>
            )}

            {(data.state === "SAFE" || data.state === "LOST") && (
              <>
                <div
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                    data.state === "SAFE" ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  {data.state}
                </div>

                <div className="rounded-xl border p-3">
                  <div className="font-semibold">
                    {data.pet.name}{" "}
                    <span className="text-gray-500">({data.pet.species})</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Status: <b>{data.pet.status}</b>
                  </div>
                </div>

                {data.pet.status !== "LOST" ? (
                  <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                    Ljubimac nije prijavljen kao izgubljen.
                    <div className="mt-1 text-gray-600">
                      Kontakt se prikazuje samo ako je ljubimac prijavljen kao izgubljen.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-700 font-semibold">
                      Kontakt vlasnika (LOST):
                    </div>

                    {data.owner?.phone ? (
                      <a
                        className="block rounded-xl bg-black px-4 py-3 text-center font-semibold text-white"
                        href={`tel:${data.owner.phone}`}
                      >
                        Pozovi: {data.owner.phone}
                      </a>
                    ) : null}

                    {data.owner?.email ? (
                      <a
                        className="block rounded-xl border px-4 py-3 text-center font-semibold"
                        href={`mailto:${data.owner.email}`}
                      >
                        Pošalji email: {data.owner.email}
                      </a>
                    ) : null}

                    {!data.owner?.phone && !data.owner?.email && (
                      <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                        Kontakt nije dostupan.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
