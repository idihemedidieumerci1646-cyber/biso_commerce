"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Phone,
  Store,
  Zap,
} from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const phone = localStorage.getItem("phone");

    if (phone) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060d1b] px-6 text-white">

      {/* Background premium */}
      <div className="absolute inset-0 overflow-hidden">

        <div className="absolute -top-40 left-1/2 h-[550px] w-[550px] -translate-x-1/2 rounded-full bg-orange-500/20 blur-[160px]" />

        <div className="absolute -bottom-40 -left-40 h-[450px] w-[450px] rounded-full bg-blue-600/20 blur-[140px]" />

        <div className="absolute right-0 top-1/3 h-[350px] w-[350px] rounded-full bg-purple-600/20 blur-[140px]" />

      </div>


      {/* Container */}
      <div className="relative z-10 w-full max-w-md animate-[fadeIn_0.8s_ease]">


        {/* Card */}
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-8 shadow-2xl backdrop-blur-2xl">


          {/* Badge */}
          <div className="mb-7 flex justify-center">

            <div className="flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-5 py-2 text-xs font-semibold text-orange-300">

              <Sparkles className="h-4 w-4" />

              La caisse digitale intelligente

            </div>

          </div>



          {/* Logo */}
          <div className="relative flex justify-center">

            <div className="absolute h-44 w-44 rounded-full bg-orange-500/30 blur-3xl" />

            <div className="relative rounded-[2rem] border border-white/10 bg-black/20 p-3 shadow-xl">

              <Image
                src="/logo.png"
                alt="BISO-COMMERCE"
                width={140}
                height={140}
                className="rounded-3xl"
                priority
              />

            </div>

          </div>



          {/* Title */}
          <h1 className="mt-7 text-center text-4xl font-black tracking-tight">

            BISO-

            <span className="bg-gradient-to-r from-orange-400 via-yellow-300 to-orange-500 bg-clip-text text-transparent">

              COMMERCE

            </span>

          </h1>



          <p className="mt-5 text-center text-sm leading-7 text-slate-300">

            Gérez votre commerce facilement :
            ventes, stock, dépenses, dettes et bénéfices
            depuis votre téléphone.

          </p>



          {/* Mini features */}
          <div className="mt-7 grid grid-cols-2 gap-3">

            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">

              <Store className="h-4 w-4 text-orange-400" />

              Gestion complète

            </div>


            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">

              <Zap className="h-4 w-4 text-orange-400" />

              Simple & rapide

            </div>

          </div>



          {/* Buttons */}
          <div className="mt-8 flex flex-col gap-4">


            <Link
              href="/login"
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 px-6 py-4 font-bold text-black shadow-xl shadow-orange-500/20 transition-all duration-300 hover:scale-[1.03]"
            >

              🔐 Se connecter

              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />

            </Link>



            <Link
              href="/register"
              className="flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-4 font-bold text-white backdrop-blur transition-all duration-300 hover:scale-[1.03] hover:bg-white/20"
            >

              ✨ Créer un compte

            </Link>


          </div>



          {/* Security */}
          <div className="mt-8 space-y-3 border-t border-white/10 pt-6 text-sm text-slate-300">


            <div className="flex items-center gap-3">

              <ShieldCheck className="h-5 w-5 text-orange-400" />

              Données sécurisées

            </div>


            <div className="flex items-center gap-3">

              <Phone className="h-5 w-5 text-orange-400" />

              Assistance : +243 994 864 173

            </div>


          </div>


        </div>


        <p className="mt-6 text-center text-xs text-slate-500">

          © {new Date().getFullYear()} BISO-COMMERCE • Tous droits réservés

        </p>


      </div>


    </main>
  );
}