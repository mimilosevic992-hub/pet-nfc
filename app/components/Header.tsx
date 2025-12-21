"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://pet-nfc.onrender.com";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  // Sakrij header na public tag stranicama (/t/[tagId])
  if (pathname?.startsWith("/t/")) {
    return null;
  }

  const [open, setOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("petnfc_token");
    setIsAuthed(!!token);

    if (!token) {
      setIsAdmin(false);
      return;
    }

    // admin check
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        setIsAdmin(res.ok);
      } catch {
        setIsAdmin(false);
      }
    })();
  }, [pathname]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function logout() {
    localStorage.removeItem("petnfc_token");
    setIsAuthed(false);
    setIsAdmin(false);
    setOpen(false);
    router.push("/login");
  }

  // Ako želiš da se header NE prikazuje na javnom tag prikazu:
  // if (pathname?.startsWith("/t/")) return null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-white backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
              aria-label="Open menu"
            >
              ☰
            </button>

            <button
              onClick={() => go(isAuthed ? "/dashboard" : "/")}
              className="text-base font-bold text-gray-900"
              aria-label="Go home"
            >
              Pet NFC
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isAuthed ? (
              <>
                <button
                  onClick={() => go("/dashboard")}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                >
                  Dashboard
                </button>
                <button
                  onClick={logout}
                  className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => go("/login")}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                >
                  Login
                </button>
                <button
                  onClick={() => go("/register")}
                  className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-over */}
      <div
        className={`fixed left-0 top-0 z-50 h-full w-72 bg-white shadow-xl transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b p-4">
          <div className="font-bold">Meni</div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-2">
          <MenuBtn onClick={() => go(isAuthed ? "/dashboard" : "/")}>
            Početna
          </MenuBtn>

          {isAuthed && (
            <>
              <MenuBtn onClick={() => go("/dashboard")}>Dashboard</MenuBtn>

              {/* “Moj profil” — napravićemo rutu /me (placeholder) */}
              <MenuBtn onClick={() => go("/me")}>Moj profil</MenuBtn>

              {/* “Udomi” — placeholder ruta /udomi */}
              <MenuBtn onClick={() => go("/udomi")}>Udomi</MenuBtn>

              {isAdmin && <MenuBtn onClick={() => go("/admin")}>Admin</MenuBtn>}

              <div className="pt-2">
                <button
                  onClick={logout}
                  className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
                >
                  Logout
                </button>
              </div>
            </>
          )}

          {!isAuthed && (
            <>
              <MenuBtn onClick={() => go("/login")}>Login</MenuBtn>
              <MenuBtn onClick={() => go("/register")}>Register</MenuBtn>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function MenuBtn({
  children, 
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100"
    >
      {children}
    </button>
  );
}
