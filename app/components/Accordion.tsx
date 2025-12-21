"use client";

import { useState } from "react";

export function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border bg-white shadow">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-bold text-gray-900">{title}</span>
        <span className="text-xl text-gray-900">{open ? "–" : "+"}</span>
      </button>

      {open && <div className="border-t px-5 py-4">{children}</div>}
    </div>
  );
}
