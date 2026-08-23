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
    <main className="relative min-h-screen overflow-hidden bg-[#f5f7fb] px-4 py-6 text-slate-900 sm:px-6">

      {/* =========================================================
          BACKGROUND
      ========================================================= */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div
          className="
          absolute
          -left-32
          -top-32
          h-80
          w-80
          rounded-full
          bg-indigo-100/70
          blur-3xl
          "
        />

        <div
          className="
          absolute
          -right-32
          top-1/4
          h-80
          w-80
          rounded-full
          bg-indigo-50
          blur-3xl
          "
        />

        <div
          className="
          absolute
          bottom-0
          left-1/2
          h-72
          w-72
          -translate-x-1/2
          rounded-full
          bg-slate-100
          blur-3xl
          "
        />

      </div>


      {/* =========================================================
          CONTAINER
      ========================================================= */}

      <div
        className="
        relative
        z-10
        mx-auto
        flex
        min-h-[calc(100vh-3rem)]
        w-full
        max-w-5xl
        items-center
        justify-center
        "
      >


        {/* =======================================================
            CARD PRINCIPALE
        ======================================================= */}

        <div
          className="
          w-full
          max-w-xl
          rounded-[26px]
          border
          border-slate-200
          bg-white
          p-6
          shadow-[0_12px_40px_rgba(15,23,42,0.06)]
          sm:p-8
          md:p-10
          "
        >


          {/* =====================================================
              BADGE
          ===================================================== */}

          <div className="mb-7 flex justify-center">

            <div
              className="
              flex
              items-center
              gap-2
              rounded-full
              border
              border-indigo-100
              bg-indigo-50
              px-4
              py-2
              text-xs
              font-bold
              text-indigo-700
              "
            >

              <div
                className="
                flex
                h-6
                w-6
                items-center
                justify-center
                rounded-lg
                bg-white
                "
              >

                <Sparkles
                  className="h-3.5 w-3.5 text-indigo-600"
                />

              </div>

              La caisse digitale intelligente

            </div>

          </div>


          {/* =====================================================
              LOGO
          ===================================================== */}

          <div className="relative flex justify-center">

            <div
              className="
              absolute
              h-40
              w-40
              rounded-full
              bg-indigo-100
              blur-3xl
              "
            />

            <div
              className="
              relative
              rounded-[26px]
              border
              border-slate-200
              bg-slate-50
              p-3
              shadow-[0_8px_25px_rgba(15,23,42,0.06)]
              "
            >

              <Image
                src="/logo.png"
                alt="BISO-COMMERCE"
                width={140}
                height={140}
                className="rounded-[20px]"
                priority
              />

            </div>

          </div>


          {/* =====================================================
              TITRE
          ===================================================== */}

          <h1
            className="
            mt-7
            text-center
            text-3xl
            font-black
            tracking-tight
            text-slate-900
            sm:text-4xl
            "
          >

            BISO-

            <span className="text-indigo-600">
              COMMERCE
            </span>

          </h1>


          {/* =====================================================
              DESCRIPTION
          ===================================================== */}

          <p
            className="
            mx-auto
            mt-4
            max-w-md
            text-center
            text-sm
            leading-7
            text-slate-500
            "
          >

            Gérez votre commerce facilement :
            ventes, stock, dépenses, dettes et bénéfices
            depuis votre téléphone.

          </p>


          {/* =====================================================
              MINI FEATURES
          ===================================================== */}

          <div
            className="
            mt-7
            grid
            grid-cols-1
            gap-3
            sm:grid-cols-2
            "
          >


            {/* GESTION */}

            <div
              className="
              flex
              items-center
              gap-3
              rounded-2xl
              border
              border-slate-200
              bg-slate-50
              p-3.5
              "
            >

              <div
                className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-indigo-100
                "
              >

                <Store
                  className="h-5 w-5 text-indigo-600"
                />

              </div>

              <div>

                <p className="text-sm font-bold text-slate-800">
                  Gestion complète
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Votre commerce en un seul endroit
                </p>

              </div>

            </div>


            {/* RAPIDE */}

            <div
              className="
              flex
              items-center
              gap-3
              rounded-2xl
              border
              border-slate-200
              bg-slate-50
              p-3.5
              "
            >

              <div
                className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-indigo-100
                "
              >

                <Zap
                  className="h-5 w-5 text-indigo-600"
                />

              </div>

              <div>

                <p className="text-sm font-bold text-slate-800">
                  Simple & rapide
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Pensé pour les petits commerces
                </p>

              </div>

            </div>


          </div>


          {/* =====================================================
              BOUTONS
          ===================================================== */}

          <div className="mt-8 flex flex-col gap-3">


            {/* CONNEXION */}

            <Link
              href="/login"
              className="
              group
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              bg-indigo-600
              px-6
              py-4
              font-bold
              text-white
              shadow-[0_8px_20px_rgba(79,70,229,0.18)]
              transition
              hover:bg-indigo-700
              hover:shadow-[0_10px_24px_rgba(79,70,229,0.22)]
              active:scale-[0.99]
              "
            >

              <div
                className="
                flex
                h-7
                w-7
                items-center
                justify-center
                rounded-lg
                bg-white/10
                "
              >

                🔐

              </div>

              Se connecter

              <ArrowRight
                className="
                h-5
                w-5
                transition
                group-hover:translate-x-1
                "
              />

            </Link>


            {/* CREATION COMPTE */}

            <Link
              href="/register"
              className="
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              border
              border-indigo-200
              bg-indigo-50
              px-6
              py-4
              font-bold
              text-indigo-700
              transition
              hover:bg-indigo-100
              active:scale-[0.99]
              "
            >

              <div
                className="
                flex
                h-7
                w-7
                items-center
                justify-center
                rounded-lg
                bg-white
                "
              >

                ✨

              </div>

              Créer un compte

            </Link>


          </div>


          {/* =====================================================
              INFORMATIONS SÉCURITÉ
          ===================================================== */}

          <div
            className="
            mt-8
            rounded-2xl
            border
            border-slate-200
            bg-slate-50
            p-4
            "
          >

            <div className="space-y-3">


              {/* SÉCURITÉ */}

              <div className="flex items-center gap-3">

                <div
                  className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-green-50
                  "
                >

                  <ShieldCheck
                    className="h-5 w-5 text-green-600"
                  />

                </div>


                <div>

                  <p className="text-sm font-bold text-slate-800">
                    Données sécurisées
                  </p>

                  <p className="text-xs text-slate-500">
                    Vos informations restent protégées
                  </p>

                </div>

              </div>


              {/* ASSISTANCE */}

              <div
                className="
                flex
                items-center
                gap-3
                border-t
                border-slate-200
                pt-3
                "
              >

                <div
                  className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-indigo-50
                  "
                >

                  <Phone
                    className="h-5 w-5 text-indigo-600"
                  />

                </div>


                <div>

                  <p className="text-sm font-bold text-slate-800">
                    Assistance
                  </p>

                  <p className="text-xs text-slate-500">
                    +243 994 864 173
                  </p>

                </div>

              </div>


            </div>

          </div>


        </div>


      </div>


      {/* =========================================================
          FOOTER
      ========================================================= */}

      <p
        className="
        absolute
        bottom-3
        left-0
        right-0
        text-center
        text-xs
        text-slate-400
        "
      >

        © {new Date().getFullYear()} BISO-COMMERCE
        {" • "}
        PDG DIEUMERCI IDI

      </p>


    </main>
  );
}