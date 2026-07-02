export default function ExpiredPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white flex items-center justify-center p-6">

      <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 backdrop-blur-xl p-8 rounded-3xl text-center shadow-2xl">

        {/* ICON BADGE */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-red-600/20 flex items-center justify-center">
            <span className="text-2xl">⛔</span>
          </div>
        </div>

        {/* TITLE */}
        <h1 className="text-2xl sm:text-3xl font-bold mb-3 text-red-400">
          Abonnement expiré
        </h1>

        {/* TEXT */}
        <p className="text-slate-300 text-sm mb-2">
          Vos 30 jours gratuits sont terminés.
        </p>

        <p className="text-slate-400 text-xs mb-6 leading-relaxed">
          Veuillez renouveler votre abonnement pour continuer à utiliser
          <span className="text-green-400 font-semibold"> Biso-Commerce</span>.
        </p>

        {/* WARNING BOX */}
        <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl mb-6">
          <p className="text-xs text-red-300">
            ⚠️ Sans abonnement actif, l’accès à votre tableau de bord est bloqué.
          </p>
        </div>

        {/* BUTTON */}
        <a
          href="/subscription"
          className="block bg-green-600 hover:bg-green-700 transition p-4 rounded-2xl font-bold shadow-lg active:scale-95"
        >
          💳 Renouveler maintenant
        </a>

        {/* FOOTER SMALL TEXT */}
        <p className="text-[10px] text-slate-500 mt-5">
          Biso-Commerce • système de gestion sécurisé
        </p>

      </div>
    </main>
  );
}