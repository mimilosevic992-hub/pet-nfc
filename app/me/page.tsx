export default function MePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">Moj profil</h1>
        <p className="mt-2 text-sm text-gray-600">Uskoro: podaci korisnika, edit telefona/grad itd.</p>
        <a href="/dashboard" className="mt-4 inline-block underline">← Dashboard</a>
      </div>
    </div>
  );
}