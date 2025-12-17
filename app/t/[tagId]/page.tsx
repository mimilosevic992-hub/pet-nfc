"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type PublicResponse =
  | { state: "UNKNOWN"; message?: string }
  | { state: "UNACTIVATED"; message: string; cta?: string }
  | { state: "UNASSIGNED"; message: string }
  | {
      state: "SAFE";
      pet: { name: string; species: string };
      message: string;
    }
  | {
      state: "LOST";
      pet: { name: string; species: string };
      contact?: { owner_email?: string; phone?: string; city?: string };
      cta?: string;
    };

export default function PublicTagPage({ params }: { params: { tagId: string } }) {
  const tagId = params.tagId;

  const [data, setData] = useState<PublicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      setData(null);

      try {
        const res = await fetch(`${API_BASE}/t/${encodeURIComponent(tagId)}`, {
          cache: "no-store",
        });

        // Ako backend vraća 404 za nepostojeći tag:
        if (res.status === 404) {
          setData({ state: "UNKNOWN", message: "Tag ne postoji ili je pogrešan." });
          return;
        }

        if (!res.ok) throw new Error(await res.text());

        const json = (await res.json()) as PublicResponse;
        setData(json);
      } catch (e: any) {
        setErr(e?.message ?? "Greška");
      } finally {
        setLoading(false);
      }
    })();
  }, [tagId]);

  const loginUrl = "/login";
  const activateUrl = "/pets/new"; // gde ti je flow: aktivacija taga + kreiranje ljubimca

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow">
        <div className="text-sm text-gray-500">Pet NFC</div>
        <h1 className="mt-1 text-2xl font-bold">Tag: {tagId}</h1>

        {loading && <p className="mt-4 text-sm text-gray-600">Učitavam…</p>}

        {err && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
            {err}
          </div>
        )}

        {!loading && !err && data && (
          <div className="mt-4 space-y-4">
            {data.state === "UNKNOWN" && (
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="font-semibold">Tag nije pronađen</div>
                <p className="mt-1 text-sm text-gray-700">
                  {data.message ?? "Ovaj tag nije u sistemu."}
                </p>
              </div>
            )}

            {data.state === "UNACTIVATED" && (
              <div className="rounded-xl bg-amber-50 p-4">
                <div className="font-semibold">Tag nije aktiviran</div>
                <p className="mt-1 text-sm text-amber-900">{data.message}</p>
                <p className="mt-2 text-sm text-amber-900">
                  Vlasnik? Uloguj se i aktiviraj tag.
                </p>

                <div className="mt-4 flex gap-2">
                  <a
                    href={loginUrl}
                    className="flex-1 rounded-xl border px-4 py-3 text-center text-sm font-semibold hover:bg-gray-100"
                  >
                    Uloguj se
                  </a>
                  <a
                    href={activateUrl}
                    className="flex-1 rounded-xl bg-black px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    Aktiviraj tag
                  </a>
                </div>
              </div>
            )}

            {data.state === "UNASSIGNED" && (
              <div className="rounded-xl bg-blue-50 p-4">
                <div className="font-semibold">Tag je aktiviran</div>
                <p className="mt-1 text-sm text-blue-900">{data.message}</p>
                <p className="mt-2 text-sm text-blue-900">
                  Vlasnik treba da dodeli ljubimca ovom tagu u aplikaciji.
                </p>
              </div>
            )}

            {data.state === "SAFE" && (
              <div className="rounded-xl bg-emerald-50 p-4">
                <div className="font-semibold">SAFE</div>
                <div className="mt-2 text-sm text-emerald-900">
                  <b>{data.pet.name}</b> ({data.pet.species})
                </div>
                <p className="mt-2 text-sm text-emerald-900">{data.message}</p>
              </div>
            )}

            {data.state === "LOST" && (
              <div className="rounded-xl bg-red-50 p-4">
                <div className="font-semibold">LOST</div>
                <div className="mt-2 text-sm text-red-900">
                  <b>{data.pet.name}</b> ({data.pet.species})
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {data.contact?.phone && (
                    <a
                      className="w-full rounded-xl bg-black px-4 py-3 text-center text-sm font-semibold text-white"
                      href={`tel:${data.contact.phone}`}
                    >
                      Pozovi vlasnika
                    </a>
                  )}

                  {data.contact?.owner_email && (
                    <a
                      className="w-full rounded-xl border px-4 py-3 text-center text-sm font-semibold hover:bg-gray-100"
                      href={`mailto:${data.contact.owner_email}?subject=Pet%20NFC%20-%20Pronađen%20ljubimac&body=Pozdrav,%20pronašao/la%20sam%20vašeg%20ljubimca.%20Javite%20mi%20se.`}
                    >
                      Pošalji email
                    </a>
                  )}

                  {data.contact?.city && (
                    <p className="text-sm text-red-900">
                      Grad: <b>{data.contact.city}</b>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500">
          Ako si pronašao ljubimca, koristi dugme za poziv/email (ako je LOST).
        </div>
      </div>
    </div>
  );
}
