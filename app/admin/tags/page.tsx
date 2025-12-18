"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type TagRow = {
  tag_id: string;
  status: string;
  owner_email: string | null;
};

type TagDetail = {
  tag_id: string;
  status: string;
  owner_email: string | null;
  pet: null | {
    pet_id: number;
    name: string;
    species: string;
    status: string;
  };
};

const STATUS_OPTIONS = ["ALL", "FREE", "PROGRAMMED", "ACTIVE", "ASSIGNED", "LOST_TAG"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export default function AdminTagsPage() {
  const router = useRouter();

  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TagDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // ✅ FRONTEND public URL (Vercel) - ne API
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "https://pet-nfc.vercel.app");

  function publicUrl(tagId: string) {
    return `${SITE_URL}/t/${tagId}`;
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

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

      const data = (await res.json()) as TagRow[];
      setTags(data);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(tagId: string) {
    setSelectedId(tagId);
    setDetail(null);
    setDetailErr(null);
    setDetailLoading(true);

    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(`${API_BASE}/admin/tags/${encodeURIComponent(tagId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());

      const data = (await res.json()) as TagDetail;
      setDetail(data);
    } catch (e: any) {
      setDetailErr(e?.message ?? "Greška");
    } finally {
      setDetailLoading(false);
    }
  }

  async function exportFreeCsv() {
    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(`${API_BASE}/admin/tags/export?status=FREE&limit=5000`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "petnfc_tags_free.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr(e?.message ?? "Greška pri export-u");
    }
  }

  async function exportCsvByStatus(s: string) {
    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const res = await fetch(`${API_BASE}/admin/tags/export?status=${encodeURIComponent(s)}&limit=5000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `petnfc_tags_${s.toLowerCase()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    }
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
    setDetailErr(null);
    setDetailLoading(false);
  }

  function toggleSelect(tagId: string) {
    setSelected((prev) => ({ ...prev, [tagId]: !prev[tagId] }));
  }

  function clearSelected() {
    setSelected({});
  }

  function selectedIdsFromCurrentList(list: TagRow[]) {
    return list.filter((t) => selected[t.tag_id]).map((t) => t.tag_id);
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = { ...prev };
      for (const t of filtered) next[t.tag_id] = true;
      return next;
    });
  }

  async function exportSelectedCsv() {
    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const ids = selectedIdsFromCurrentList(tags); // ili filtered ako želiš samo sa liste
      if (ids.length === 0) throw new Error("Nisi izabrao nijedan tag.");

      const res = await fetch(`${API_BASE}/admin/tags/export-selected`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_ids: ids }),
      });

      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "petnfc_tags_selected.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr(e?.message ?? "Greška pri export-u");
    }
  }

  function getSelectedIds() {
    return Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }

  async function markProgrammed() {
    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const ids = getSelectedIds();
      if (ids.length === 0) throw new Error("Nisi izabrao nijedan tag.");

      const res = await fetch(`${API_BASE}/admin/tags/mark-programmed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_ids: ids }),
      });

      if (!res.ok) throw new Error(await res.text());

      await load();       // osveži tabelu
      clearSelected();    // očisti selekciju
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    }
  }

  async function unmarkProgrammed() {
    try {
      const token = localStorage.getItem("petnfc_token");
      if (!token) throw new Error("Nisi ulogovan.");

      const ids = getSelectedIds();
      if (ids.length === 0) throw new Error("Nisi izabrao nijedan tag.");

      const res = await fetch(`${API_BASE}/admin/tags/unmark-programmed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_ids: ids }),
      });

      if (!res.ok) throw new Error(await res.text());

      await load();
      clearSelected();
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    }
  }

  async function markPrintedSelected() {
    const token = localStorage.getItem("petnfc_token");
    if (!token) return;

    const tag_ids = Object.keys(selected).filter((id) => selected[id]);
    if (tag_ids.length === 0) return;

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`${API_BASE}/admin/tags/mark_printed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_ids }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text);

      clearSelected();
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setLoading(false);
    }
  }

  // Admin guard + initial load
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
        await load();
      } catch {
        router.replace("/dashboard");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const nq = normalize(q);
    return tags
      .filter((t) => (status === "ALL" ? true : t.status === status))
      .filter((t) => (nq ? normalize(t.tag_id).includes(nq) : true));
  }, [tags, q, status]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: tags.length };
    for (const s of STATUS_OPTIONS) map[s] = 0;
    map.ALL = tags.length;
    for (const t of tags) map[t.status] = (map[t.status] || 0) + 1;
    return map;
  }, [tags]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Inventar tagova</h1>
              <p className="mt-1 text-sm text-gray-600">
                Search + filter + detalji + copy link za programiranje NFC-a.
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href="/admin"
                className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
              >
                ← Admin
              </a>
              <button
                onClick={load}
                disabled={loading}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {loading ? "Učitavam..." : "Osveži"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Pretraga (tag id)</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="npr. PET-ABCD..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Status filter</label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "ALL" ? `ALL (${counts.ALL ?? 0})` : `${s} (${counts[s] ?? 0})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {err && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
              {err}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold">
              Rezultati: <span className="text-gray-600">{filtered.length}</span>
            </h2>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => copy(filtered.map((t) => publicUrl(t.tag_id)).join("\n"))}
                disabled={filtered.length === 0}
                className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100 disabled:opacity-40"
                title="Copy sve public URL-ove iz filtera"
              >
                Copy URLs (filter)
              </button>

              <button
                onClick={() => copy(getSelectedIds().join("\n"))}
                disabled={getSelectedIds().length === 0}
                className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100 disabled:opacity-40"
              >
                Copy SELECTED IDs
              </button>

              <button
                onClick={() => copy(getSelectedIds().map((id) => publicUrl(id)).join("\n"))}
                disabled={getSelectedIds().length === 0}
                className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100 disabled:opacity-40"
              >
                Copy SELECTED URLs
              </button>

              <button
                onClick={exportFreeCsv}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
              >
                Export FREE (CSV)
              </button>

              <button
                onClick={selectAllFiltered}
                disabled={filtered.length === 0}
                className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100 disabled:opacity-40"
              >
                Select all (filter)
              </button>

              <button
                onClick={clearSelected}
                className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
              >
                Clear selected
              </button>

              <button
                onClick={exportSelectedCsv}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
              >
                Export SELECTED (CSV)
              </button>
              <button
                onClick={() => exportCsvByStatus("PRINTED")}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
              >
                Export PRINTED (CSV)
              </button>
              <button
                onClick={markPrintedSelected}
                disabled={Object.keys(selected).filter((k) => selected[k]).length === 0 || loading}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Mark PRINTED (selected)
              </button>
              <button
                onClick={markProgrammed}
                className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
              >
                Mark PROGRAMMED
              </button>
              <button
                onClick={unmarkProgrammed}
                className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
              >
                Unmark PROGRAMMED
              </button>
            </div>
          </div>


          {loading ? (
            <p className="mt-4 text-sm text-gray-600">Učitavam…</p>
          ) : filtered.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">Nema rezultata.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">Select</th>
                    <th className="py-2">Tag</th>
                    <th>Status</th>
                    <th>Vlasnik</th>
                    <th>Public</th>
                    <th className="text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.tag_id} className="border-b last:border-0">
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={!!selected[t.tag_id]}
                          onChange={() => toggleSelect(t.tag_id)}
                        />
                      </td>
                      <td className="py-2 font-mono">{t.tag_id}</td>
                      <td>{t.status}</td>
                      <td className="text-gray-600">{t.owner_email ?? "-"}</td>
                      <td>
                        <a
                          className="underline"
                          href={publicUrl(t.tag_id)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => copy(t.tag_id)}
                            className="rounded-xl border px-3 py-1.5 text-xs font-semibold hover:bg-gray-100"
                          >
                            Copy ID
                          </button>
                          <button
                            onClick={() => copy(publicUrl(t.tag_id))}
                            className="rounded-xl border px-3 py-1.5 text-xs font-semibold hover:bg-gray-100"
                          >
                            Copy URL
                          </button>
                          <button
                            onClick={() => openDetail(t.tag_id)}
                            className="rounded-xl bg-black px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {selectedId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-600">Tag</div>
                  <div className="text-lg font-bold font-mono">{selectedId}</div>
                </div>

                <button
                  onClick={closeDetail}
                  className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-100"
                >
                  Zatvori
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => copy(selectedId)}
                  className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-100"
                >
                  Copy ID
                </button>
                <button
                  onClick={() => copy(publicUrl(selectedId))}
                  className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-100"
                >
                  Copy Public URL
                </button>
                <a
                  href={publicUrl(selectedId)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white"
                >
                  Open public
                </a>
              </div>

              <div className="mt-4 rounded-xl bg-gray-50 p-4">
                {detailLoading && <p className="text-sm text-gray-600">Učitavam detalje…</p>}

                {detailErr && (
                  <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
                    {detailErr}
                  </div>
                )}

                {detail && (
                  <div className="space-y-3 text-sm">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <div className="text-gray-500">Status</div>
                        <div className="font-semibold">{detail.status}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Owner</div>
                        <div className="font-semibold">{detail.owner_email ?? "-"}</div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white p-3 border">
                      <div className="font-semibold">Ljubimac</div>
                      {detail.pet ? (
                        <div className="mt-2 space-y-1">
                          <div>
                            <span className="text-gray-500">Ime:</span> <b>{detail.pet.name}</b>
                          </div>
                          <div>
                            <span className="text-gray-500">Vrsta:</span> <b>{detail.pet.species}</b>
                          </div>
                          <div>
                            <span className="text-gray-500">Status:</span> <b>{detail.pet.status}</b>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-gray-600">Nije dodeljen ljubimcu.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 text-xs text-gray-500">
                Napomena: security je na backend-u (admin only). Frontend ovde radi UX guard + redirect.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
