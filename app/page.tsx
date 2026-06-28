"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const phone = localStorage.getItem("phone");

    if (phone) {
      router.push("/dashboard");
    }
  }, [router]);

  return (

    <main className="min-h-screen bg-slate-950 text-white flex flex-col p-6">
      
      {/* Barre de navigation */}
      <nav className="flex justify-between items-center mb-12">
        <h1 className="font-bold text-xl flex items-center gap-2">🏪 Biso-Commerce</h1>
        <div className="flex gap-6 text-sm text-slate-400">
        </div>
      </nav>

      {/* Contenu principal */}
      <div className="flex-grow flex flex-col justify-center max-w-2xl mx-auto w-full">
        <h1 className="text-6xl font-extrabold tracking-tight mb-6">
          Biso-Commerce
        </h1>
        <p className="text-xl text-slate-300 mb-8">
          Gérez vos ventes, vos stocks et vos dettes facilement depuis votre smartphone.
        </p>
        <p className="text-slate-400 italic mb-12">Simple • Rapide • Efficace</p>

        {/* Boutons */}
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <Link href="/login" className="w-full">
            <button className="w-full px-8 py-4 rounded-xl bg-green-600 hover:bg-green-700 transition font-bold text-lg">
              Se connecter
            </button>
          </Link>
          <Link href="/register" className="w-full">
            <button className="w-full px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 transition font-semibold text-lg border border-white/10">
              Créer un compte
            </button>
          </Link>
        </div>
      </div>

      {/* Signature */}
      <footer className="text-right text-slate-500 font-medium text-sm uppercase">
        DIEUMERCI IDI (PDG)
      </footer>
      
    </main>
  );
}