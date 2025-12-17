"use client";

import { useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type StateResponse = {
  state: "UNACTIVATED" | "ACTIVE" | "LOST";
  message?: string;
  pet?: {
    name: string;
    species: string;
    phone?: string;
    email?: string;
  };
};

export default function PublicTagPage() {
  const [tagId, setTagId] = useState<string>("");
  const [data, setData] = useState<StateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // izvuci tagId direktno iz URL-a
  useEffect(() => {
    const parts = window.location.pathname.split("/");
    const last = parts[parts.length - 1];
    setTagId(decodeURIComponent(last));
  }, []);

  useEffect(() => {
    if (!tagId) return;

    setLoading(true);
    fetch(`${API_BASE}/t/${tagId}/state`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((json) => {
        setData(json);
        setError(null);
      })
      .catch(() => {
        setError("Nepoznat prikaz.");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [tagId]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <h1 className="text-xl font-bold mb-2">Pet NFC</h1>

        {loading && <p className="text-gray-600">Učitavam…</p>}

        {!loading && error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        {!loading && data && (
          <>
            {data.state === "UNACTIVATED" && (
              <p className="text-sm text-gray-700">{data.message}</p>
            )}

            {data.state === "ACTIVE" && data.pet && (
              <div className="space-y-2">
                <p><b>Ljubimac:</b> {data.pet.name}</p>
                <p><b>Vrsta:</b> {data.pet.species}</p>
                <p className="text-green-600 font-semibold">
                  Ljubimac je bezbedan
                </p>
              </div>
            )}

            {data.state === "LOST" && data.pet && (
              <div className="space-y-3">
                <p className="text-red-600 font-bold">🚨 LJUBIMAC JE IZGUBLJEN</p>

                {data.pet.phone && (
                  <a
                    href={`tel:${data.pet.phone}`}
                    className="block rounded-xl bg-black text-white text-center py-3 font-semibold"
                  >
                    Pozovi vlasnika
                  </a>
                )}

                {data.pet.email && (
                  <a
                    href={`mailto:${data.pet.email}`}
                    className="block rounded-xl border text-center py-3 font-semibold"
                  >
                    Pošalji email
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
