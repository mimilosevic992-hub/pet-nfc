"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://pet-nfc.onrender.com";

type StateKind = "SAFE" | "LOST" | "UNACTIVATED" | "TAG_NOT_FOUND";

type ApiResp = {
  state: StateKind;
  message?: string;
  pet?: { name?: string; species?: string };
  contact?: { phone?: string; owner_email?: string; city?: string };
  cta?: string;
};

export default function TagPublicPage({
  params,
}: {
  params: { tagId: string };
}) {
  const tagId = useMemo(() => params?.tagId, [params]);
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!tagId) return;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch(`${API_BASE}/t/${encodeURIComponent(tagId)}/state`, {
          cache: "no-store",
        });

        const text = await res.text();
        if (!res.ok) {
          // backend bi trebalo da vrati JSON i u erroru, ali fallback:
          throw new Error(text || `HTTP ${res.status}`);
        }

        // JSON parse (za slučaj da server vrati HTML grešku)
        let json: ApiResp;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error("Server nije vratio validan JSON.");
        }

        setData(json);
      } catch (e: any) {
        setErr(e?.message ?? "Greška");
      } finally {
        setLoading(false);
      }
    })();
  }, [tagId]);

  const title = "Pet NFC";

  const badge = (kind: StateKind) => {
    const base =
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold";
    if (kind === "SAFE") return `${base} bg-green-100 text-green-800`;
    if (kind === "LOST") return `${base} bg-red-100 text-red-800`;
    if (kind === "UNACTIVATED") return `${base} bg-amber-100 text-amber-800`;
    return `${base} bg-gray-100 text-gray-700`;
  };

  const card = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">{title}</h1>
              <div className="mt-1 text-sm text-gray-600">
                Tag: <span className="font-mono">{tagId}</span>
              </div>
            </div>
          </div>
          <div className="mt-5">{children}</div>
        </div>

        <div className="mx-auto mt-4 max-w-md text-center text-xs text-gray-500">
          Ako si pronašao ljubimca, koristi dugme za poziv/email (ako je LOST).
        </div>
      </div>
    </div>
  );

  if (loading) {
    return card(
      <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
        Učitavam…
      </div>
    );
  }

  if (err) {
    return card(
      <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
        {err}
      </div>
    );
  }

  if (!data) {
    return card(
      <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
        Nepoznat prikaz.
      </div>
    );
  }

  const state = data.state;
  const petName = data.pet?.name ?? "—";
  const species = data.pet?.species ?? "—";

  // CTA kontakt (samo LOST)
  const phone = data.contact?.phone ?? "";
  const email = data.contact?.owner_email ?? "";
  const city = data.contact?.city ?? "";

  if (state === "TAG_NOT_FOUND") {
    return card(
      <>
        <div className={badge(state)}>TAG NOT FOUND</div>
        <h2 className="mt-3 text-lg font-bold">Tag nije pronađen</h2>
        <p className="mt-2 text-sm text-gray-700">
          {data.message ?? "Tag ne postoji ili je pogrešan."}
        </p>
      </>
    );
  }

  if (state === "UNACTIVATED") {
    return card(
      <>
        <div className={badge(state)}>UNACTIVATED</div>
        <h2 className="mt-3 text-lg font-bold">Tag nije aktiviran</h2>
        <p className="mt-2 text-sm text-gray-700">
          {data.message ??
            "Ovaj tag nije aktiviran. Vlasnik treba da ga aktivira u aplikaciji."}
        </p>
      </>
    );
  }

  if (state === "SAFE") {
    return card(
      <>
        <div className={badge(state)}>SAFE</div>

        <h2 className="mt-3 text-lg font-bold">{petName}</h2>
        <p className="mt-1 text-sm text-gray-600">{species}</p>

        <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">
          {data.message ?? "Ljubimac nije prijavljen kao izgubljen."}
        </div>
      </>
    );
  }

  // LOST
  return card(
    <>
      <div className={badge(state)}>LOST</div>

      <h2 className="mt-3 text-lg font-bold">{petName}</h2>
      <p className="mt-1 text-sm text-gray-600">{species}</p>

      {city && (
        <div className="mt-3 text-sm text-gray-700">
          Grad: <b>{city}</b>
        </div>
      )}

      <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
        {data.message ?? "Ljubimac je prijavljen kao izgubljen."}
      </div>

      <div className="mt-5 space-y-3">
        <a
          className="block w-full rounded-xl bg-black px-4 py-3 text-center font-semibold text-white"
          href={phone ? `tel:${phone}` : "#"}
          onClick={(e) => {
            if (!phone) e.preventDefault();
          }}
        >
          {phone ? "Pozovi vlasnika" : "Telefon nije dostupan"}
        </a>

        <a
          className="block w-full rounded-xl border px-4 py-3 text-center font-semibold hover:bg-gray-50"
          href={email ? `mailto:${email}` : "#"}
          onClick={(e) => {
            if (!email) e.preventDefault();
          }}
        >
          {email ? "Pošalji email" : "Email nije dostupan"}
        </a>
      </div>
    </>
  );
}
