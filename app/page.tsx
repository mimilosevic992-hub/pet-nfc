import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow space-y-3">
        <h1 className="text-2xl font-bold">Pet NFC</h1>
        <p className="text-sm text-gray-600">
          Dobrodošli. Ulogujte se da upravljate svojim ljubimcima.
        </p>
        <div className="flex gap-2">
          <Link className="rounded-xl bg-black px-4 py-2 text-white font-semibold" href="/login">
            Login
          </Link>
          <Link className="rounded-xl border px-4 py-2 font-semibold" href="/register">
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
