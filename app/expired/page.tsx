export default function ExpiredPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/10 p-8 rounded-3xl text-center">

        <h1 className="text-3xl font-bold mb-4">
          ⛔ Abonnement expiré
        </h1>

        <p className="text-slate-300 mb-6">
          Vos 30 jours gratuits sont terminés.
        </p>

        <p className="text-slate-300 mb-8">
          Veuillez renouveler votre abonnement pour continuer à utiliser Biso-Commerce.
        </p>

        <a
          href="/subscription"
          className="block bg-green-600 p-4 rounded-xl font-bold"
        >
          Renouveler maintenant
        </a>

      </div>
    </main>
  );
}