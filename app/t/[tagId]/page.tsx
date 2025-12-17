"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type StateResponse = {
  state: "UNACTIVATED" | "UNASSIGNED" | "SAFE" | "LOST";
  message?: string;

  pet?: {
    name?: string;
    species?: string;
    status?: string;
  };

  owner?: {
    email?: string | null;
    phone?: string | null;
    city?: string | null;
  };

  email?: string | null;
  phone?: string | null;
  city?: string | null;
};

export default function PublicTagPage() {
  const params = useParams();

  // useParams može vratiti string | string[] | undefined
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

  const state = data?.state;

  const phone = data?.owner?.phone ?? data?.phone ?? null;
  const email = data?.owner?.email ?? data?.email ?? null;

  const badge = useMemo(() => {
    if (!state) return null;
    const base = "inline-block rounded-full px-3 py-1 text-xs font-bold";
    if (state === "LOST") return <span className={`${base} bg-red-100 text-red-800`}>LOST</span>;
    if (state === "SAFE") return <span className={`${base} bg-green-100 text-green-800`}>SAFE</span>;
    if (state === "UNASSIGNED")
      return <span className={`${base} bg-yellow-100 text-yellow-800`}>NIJE DODELJENO</span>;
    return <span className={`${base} bg-gray-100 text-gray-700`}>NIJE AKTIVIRAN</span>;
  }, [state]);

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
                {state === "UNACTIVATED" && (
                  <>
                    <div className="font-semibold">Tag nije aktiviran</div>
                    <p className="mt-2 text-sm text-gray-700">
                      {data.message ??
                        "Ovaj tag nije aktiviran. Vlasnik treba da ga aktivira u aplikaciji."}
                    </p>
                  </>
                )}

                {state === "UNASSIGNED" && (
                  <>
                    <div className="font-semibold">Tag je aktivan, ali nije dodeljen ljubimcu</div>
                    <p className="mt-2 text-sm text-gray-700">
                      {data.message ?? "Vlasnik još nije povezao ovaj tag sa profilom ljubimca."}
                    </p>
                  </>
                )}

                {(state === "SAFE" || state === "LOST") && (
                  <>
                    <div className="font-semibold">
                      {data.pet?.name ? (
                        <>
                          {data.pet.name}{" "}
                          {data.pet.species ? (
                            <span className="text-gray-500">({data.pet.species})</span>
                          ) : null}
                        </>
                      ) : (
                        "Profil ljubimca"
                      )}
                    </div>

                    <div className="mt-2 text-sm text-gray-700">
                      Status: <b>{state === "LOST" ? "LOST" : "SAFE"}</b>
                    </div>
                  </>
                )}
              </div>

              {state === "SAFE" && (
                <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                  Ljubimac nije prijavljen kao izgubljen.
                  <br />
                  Kontakt se prikazuje samo ako je ljubimac prijavljen kao izgubljen.
                </div>
              )}

              {state === "LOST" && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
                    Ljubimac je prijavljen kao izgubljen. Kontaktiraj vlasnika:
                  </div>

                  {phone ? (
                    <a
                      className="block rounded-xl bg-black px-4 py-3 text-center font-semibold text-white"
                      href={`tel:${phone}`}
                    >
                      Pozovi vlasnika
                    </a>
                  ) : null}

                  {email ? (
                    <a
                      className="block rounded-xl border px-4 py-3 text-center font-semibold hover:bg-gray-100"
                      href={`mailto:${email}?subject=Pronađen ljubimac (${tagId})`}
                    >
                      Pošalji email
                    </a>
                  ) : null}

                  {!phone && !email && (
                    <div className="rounded-xl bg-yellow-50 p-4 text-sm text-yellow-900">
                      Kontakt podaci nisu dostupni za ovaj profil.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
