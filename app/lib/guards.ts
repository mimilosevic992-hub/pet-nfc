const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

type Me = { email: string; phone: string | null; city: string | null };

export async function requireOwnerContact(
  router: { push: (p: string) => void; replace?: (p: string) => void },
  setErr?: (v: string | null) => void
): Promise<boolean> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("petnfc_token") : null;

  if (!token) {
    router.replace?.("/login");
    return false;
  }

  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const raw = await res.text();
  if (!res.ok) {
    let detail = raw;
    try {
      detail = JSON.parse(raw)?.detail ?? raw;
    } catch {}
    setErr?.(detail || "Ne mogu da učitam owner profil.");
    return false;
  }

  const me = JSON.parse(raw) as Me;
  const okPhone = (me.phone ?? "").trim().length >= 6;
  const okCity = (me.city ?? "").trim().length >= 2;

  if (!okPhone || !okCity) {
    setErr?.("Da bi uključio LOST, prvo popuni Moj profil (telefon i grad).");
    router.push("/me");
    return false;
  }

  return true;
}
