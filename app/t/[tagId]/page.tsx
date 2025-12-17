"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

export default function PublicTagPage() {
  const pathname = usePathname();

  // pathname je npr "/t/PET-YJRC38V"
  const tagId = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.length >= 2 ? parts[1] : "";
  }, [pathname]);

  const [data, setData] = useState<any>(null);
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

        if (res.status === 404) {
          setData({ state: "UNKNOWN", message: "Tag ne postoji ili je pogrešan." });
          return;
        }

        if (!res.ok) throw new Error(await res.text());

        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setErr(e?.message ?? "Greška");
      } finally {
        setLoading(false);
      }
    })();
  }, [tagId]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow">
        <div className="text-sm text-gray-500">Pet NFC</div>
        <h1 className="mt-1 text-2xl font-bold">Tag: {tagId || "—"}</h1>

        {loading && <p className="mt-4 text-sm text-gray-600">Učitavam…</p>}
        {err && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
            {err}
          </div>
        )}

        {!loading && !err && data && (
          <pre className="mt-4 rounded-xl bg-gray-50 p-3 text-xs overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
