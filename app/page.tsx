"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("user_id");

    // 🔥 SI déjà connecté → direct Dashboard
    if (userId) {
      router.replace("/dashboard");
    }
  }, []);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">

      {/* LOGO */}
      <Image
        src="/logo.png"
        alt="Biso-Commerce"
        width={150}
        height={150}
        className="mb-6"
      />

      {/* TITRE */}
      <h1 className="text-3xl font-bold text-center">
        BISO-COMMERCE
      </h1>

      {/* DESCRIPTION */}
      <p className="text-center text-slate-400 mt-3 text-sm leading-6">
        Votre caisse digitale pour gérer votre commerce simplement,
        suivre vos ventes, stock, dépenses et bénéfices.
      </p>

      {/* BOUTONS */}
      <div className="w-full mt-10 max-w-sm space-y-4">

        <Link href="/login" className="block w-full">
          <div className="w-full bg-green-600 py-4 rounded-2xl font-bold text-center">
            🔐 Se connecter
          </div>
        </Link>

        <Link href="/register" className="block w-full">
          <div className="w-full bg-white/10 py-4 rounded-2xl font-bold text-center">
            ✨ Créer un compte
          </div>
        </Link>

      </div>

      {/* FOOTER */}
      <p className="text-xs text-slate-500 mt-10 text-center">
        Assistance 24h/24 • +243 994 864 173
      </p>

    </main>
  );
}