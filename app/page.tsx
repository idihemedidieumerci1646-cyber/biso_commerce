"use client";

import Image from "next/image";
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
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-black to-slate-950 text-white overflow-hidden">

      {/* Effets lumineux */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-500/20 blur-[120px]" />

      <div className="absolute bottom-0 left-0 w-60 h-60 bg-orange-500/10 blur-[120px]" />

      <div className="relative flex flex-col justify-between min-h-screen px-7 py-10">

        {/* ================= LOGO ================= */}

        <div className="text-center mt-6">

          <div className="flex justify-center">

            <Image
              src="/logo.png"
              alt="Biso-Commerce"
              width={170}
              height={170}
              priority
              className="drop-shadow-2xl"
            />

          </div>

          <h1 className="mt-5 text-4xl font-black tracking-wide">
            BISO-COMMERCE
          </h1>

          <p className="mt-4 text-slate-300 leading-7 text-base">

            Votre caisse digitale intelligente
            <br />

            pour gérer votre commerce

            <br />

            simplement, rapidement
            <br />
            et en toute sécurité.

          </p>

        </div>

        {/* ================= BOUTONS ================= */}

        <div className="space-y-4">

          <Link href="/login">

            <button className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 font-bold text-lg shadow-xl active:scale-95 transition">

              🔐 Se connecter

            </button>

          </Link>

          <Link href="/register">

            <button className="w-full h-14 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md font-semibold active:scale-95 transition">

              ✨ Créer un compte

            </button>

          </Link>

        </div>

        {/* ================= FOOTER ================= */}

        <div className="text-center space-y-4 mt-12">

          <div className="bg-white/5 border border-white/10 rounded-3xl p-5">

            <p className="text-slate-300 text-sm">

              Assistance disponible 24h/24

            </p>

            <p className="mt-4 font-bold text-lg">

              PDG DIEUMERCI IDI

            </p>

            <p className="text-blue-400 font-semibold mt-2">

              📞 WhatsApp : +243 994 864 173

            </p>

          </div>

          <p className="text-xs text-slate-500">

            © 2026 Biso-Commerce

          </p>

        </div>

      </div>

    </main>
  );
}