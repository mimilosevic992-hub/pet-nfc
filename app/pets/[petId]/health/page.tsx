"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

const cards = [
  { href: "vaccinations", title: "Vakcinacije", desc: "Sve vakcine i potvrde." },
  { href: "checkups", title: "Pregledi", desc: "Veterinarski pregledi i nalazi." },
  { href: "treatments", title: "Terapije / tretmani", desc: "Lekovi, terapije, tretmani." },
  { href: "allergies", title: "Alergije", desc: "Statični zapisi (bez podsetnika)." },
  { href: "notes", title: "Ostale beleške", desc: "Sve ostalo što želiš da zabeležiš." },
];

export default function HealthHubPage() {
  const params = useParams();
  const petId = String(params?.petId ?? "");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Zdravstveni karton</h1>
              <p className="mt-1 text-sm text-gray-600">
                Svaka sekcija ima posebna polja.
              </p>
            </div>

            <Link
              href={`/pets/${petId}`}
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
            >
              ← Profil
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {cards.map((c) => (
              <Link
                key={c.href}
                href={`/pets/${petId}/health/${c.href}`}
                className="rounded-2xl border bg-white p-5 hover:bg-gray-50"
              >
                <div className="font-bold">{c.title}</div>
                <div className="mt-1 text-sm text-gray-600">{c.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
