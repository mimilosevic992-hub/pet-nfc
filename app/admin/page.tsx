"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

export default function AdminPage() {
  const router = useRouter();

  const [count, setCount] = useState(20);
  const [prefix, setPrefix] = useState("PET");
  const [length, setLength] = useState(12);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function generateTags() {
    setLoading(true);
    setErr(null);
    setResult([]);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(`${API_BASE}/admin/tags/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prefix, count, length }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setResult(data.created || []);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("petnfc_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
      } catch {
        router.replace("/dashboard");
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Admin – NFC Tagovi</h1>
            <a
              href="/admin/tags"
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
            >
              Inventar →
            </a>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Prefix</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Broj tagova</label>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Dužina ID-a</label>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
              />
            </div>
          </div>

          <button
            onClick={generateTags}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading ? "Generišem..." : "Generiši tagove"}
          </button>

          {err && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
              {err}
            </div>
          )}
        </div>

        {result.length > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-bold">Kreirani tagovi</h2>

            <textarea
              className="mt-3 w-full rounded-xl border p-3 text-sm font-mono"
              rows={Math.min(10, result.length)}
              readOnly
              value={result.join("\n")}
            />

            <button
              onClick={() => navigator.clipboard.writeText(result.join("\n"))}
              className="mt-3 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
            >
              Kopiraj sve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
