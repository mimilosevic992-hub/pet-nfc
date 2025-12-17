"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type TagRow = {
  tag_id: string;
  status: string;
  owner_email: string | null;
};

export default function AdminTagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("petnfc_token");
    if (!token) router.replace("/login");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(`${API_BASE}/admin/tags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setTags(data);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Inventar tagova</h1>
            <a
              href="/admin"
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
            >
              ← Nazad
            </a>
          </div>

          {loading && <p className="mt-4 text-sm text-gray-600">Učitavam…</p>}
          {err && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
              {err}
            </div>
          )}

          {!loading && tags.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">Tag</th>
                    <th>Status</th>
                    <th>Vlasnik</th>
                    <th>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {tags.map((t) => (
                    <tr key={t.tag_id} className="border-b last:border-0">
                      <td className="py-2 font-mono">{t.tag_id}</td>
                      <td>{t.status}</td>
                      <td className="text-gray-600">{t.owner_email ?? "-"}</td>
                      <td>
                        <a
                          className="underline"
                          href={`${API_BASE}/t/${t.tag_id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && tags.length === 0 && (
            <p className="mt-4 text-sm text-gray-600">Nema tagova.</p>
          )}
        </div>
      </div>
    </div>
  );
}
