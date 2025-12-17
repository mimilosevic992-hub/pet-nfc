"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type Unactivated = { state: "UNACTIVATED"; message: string };
type Unassigned = { state: "UNASSIGNED"; message: string };
type SafeOrLost = {
  state: "SAFE" | "LOST";
  pet: { name: string; species: string; status: "ACTIVE" | "LOST" | "DECEASED" };
  message?: string;
  contact?: { owner_email?: string | null; phone?: string | null; city?: string | null };
};

type StateResponse = Unactivated | Unassigned | SafeOrLost;

function isSafeOrLost(x: StateResponse): x is SafeOrLost {
  return x.state === "SAFE" || x.state === "LOST";
}

export default function PublicTagPage() {
  const params = useParams();

  const raw = params?.tagId;
  const tagId = useMemo(() => {
    if (!raw) return null;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return decodeURIComponent(v);
  }, [raw]);

  const [data, setData] = useState<StateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!tagId) {
      setLoading(false);
      setErr("Ne mogu da pročitam tagId iz URL-a.");
      return;
    }

    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);
      setData(null);

      try {
        const res = await fetch(`${API_BASE}/t/${encodeURIComponent(tagId)}/state`, {
          cache: "no-store",
        });

        const text = await res.text();
        if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

        const json = JSON.parse(text) as StateResponse;

        if (!alive) return;
        setData(json);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Greška");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [tagId]);

  const badge = useMemo(() => {
    if (!data) return null;
    const base = "inline-block rounded-full px-3 py-1 text-xs font-bold";
    if (data.state === "LOST") return <span className={`${base} bg-red-100 text-red-800`}>LOST</span>;
    if (data.state === "SAFE") return <span className={`${base} bg-green-100 text-green-800`}>SAFE</span>;
    if (data.state === "UNASSIGNED")
      return <span className={`${base} bg-yellow-100 text-yellow-800`}>NIJE DODELJENO</span>;
    return <span className={`${base} bg-gray-100 text-gray-700`}>NIJE AKTIVIRAN</span>;
  }, [data]);

  // kontakt samo ako je SAFE/LOST
  const phone = data && isSafeOrLost(data) ? (data.contact?.phone ?? null) : null;
  const email = data && isSafeOrLost(data) ? (data.contact?.owner_email ?? null) : null;
  const city = data && isSafeOrLost(data) ? (data.contact?.city ?? null) : null;

  // LOST status samo ako je SAFE/LOST
  const isLost = data?.state === "LOST";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-white p-6 shadow space-y-4">
          <div>
            <div className="text-xl font-bold">Pet NFC</div>
            <div className="text-sm text-gray-600 mt-1">Tag: {tagId ?? "-"}</div>
          </div>

          {loading && <div className="text-sm text-gray-600">Učitavam…</div>}

          {err && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
              {err}
            </div>
          )}

          {!loading && !err && data && (
            <>
              <div className="flex items-center gap-2">{badge}</div>

              <div className="rounded-xl border p-4">
                {data.state === "UNACTIVATED" && (
                  <>
                    <div className="font-semibold">Tag nije aktiviran</div>
                    <p className="mt-2 text-sm text-gray-700">{data.message}</p>
                  </>
                )}

                {data.state === "UNASSIGNED" && (
                  <>
                    <div className="font-semibold">Tag je aktivan, ali nije dodeljen ljubimcu</div>
                    <p className="mt-2 text-sm text-gray-700">{data.message}</p>
                  </>
                )}

                {isSafeOrLost(data) && (
                  <>
                    <div className="font-semibold">
                      {data.pet.name}{" "}
                      <span className="text-gray-500">({data.pet.species})</span>
                    </div>

                    <div className="mt-2 text-sm text-gray-700">
                      Status: <b>{data.state === "LOST" ? "LOST" : "SAFE"}</b>
                    </div>
                  </>
                )}
              </div>

              {/* Kontakt sekcija */}
              {isSafeOrLost(data) && !isLost && (
                <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                  Ljubimac nije prijavljen kao izgubljen.
                  <div className="mt-1 text-gray-600">
                    Kontakt se prikazuje samo ako je ljubimac prijavljen kao izgubljen.
                  </div>
                </div>
              )}

              {isSafeOrLost(data) && isLost && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-700 font-semibold">Kontakt vlasnika (LOST):</div>

                  {phone ? (
                    <a
                      className="block rounded-xl bg-black px-4 py-3 text-center font-semibold text-white"
                      href={`tel:${phone}`}
                    >
                      Pozovi: {phone}
                    </a>
                  ) : null}

                  {email ? (
                    <a
                      className="block rounded-xl border px-4 py-3 text-center font-semibold"
                      href={`mailto:${email}`}
                    >
                      Pošalji email: {email}
                    </a>
                  ) : null}

                  {!phone && !email && (
                    <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                      Kontakt podaci nisu dostupni za ovaj profil.
                    </div>
                  )}

                  {city ? <div className="text-xs text-gray-600">Grad: {city}</div> : null}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
