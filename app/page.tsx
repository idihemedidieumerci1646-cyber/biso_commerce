
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Phone,
  Store,
  Zap,
  WifiOff,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [checkingUser, setCheckingUser] = useState(true);

  useEffect(() => {
    let cancelled = false;

    /**
     * IMPORTANT :
     *
     * Cette page ne vérifie PAS Internet.
     *
     * On vérifie uniquement si un numéro de téléphone
     * est déjà enregistré dans localStorage.
     *
     * Si l'utilisateur est déjà connecté :
     * → redirection immédiate vers /dashboard
     *
     * Aucun :
     * - fetch
     * - test Internet
     * - navigator.onLine
     * - délai
     * - attente de Supabase
     */

    try {
      const phone = localStorage.getItem("phone");

      /**
       * UTILISATEUR DÉJÀ CONNECTÉ
       *
       * On ne construit pas toute la page d'accueil.
       * On lance directement la navigation vers le Dashboard.
       */
      if (phone) {
        router.replace("/dashboard");
        return;
      }
    } catch (error) {
      console.warn("LocalStorage indisponible :", error);
    }

    /**
     * Aucun utilisateur connecté.
     *
     * On peut maintenant afficher normalement
     * la page d'accueil.
     */
    if (!cancelled) {
      setCheckingUser(false);
    }

    return () => {
      cancelled = true;
    };
  }, [router]);

  /**
   * Pendant la vérification de localStorage,
   * on évite de construire toute la grosse interface.
   *
   * Cela permet également d'éviter que l'utilisateur
   * voie brièvement la page d'accueil avant d'être
   * envoyé vers le Dashboard.
   */
  if (checkingUser) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-[#060d1b]">
        <div
          className="
            h-8
            w-8
            animate-spin
            rounded-full
            border-2
            border-white/20
            border-t-orange-400
          "
        />
      </main>
    );
  }

  return (
    <main
      className="
        relative
        flex
        min-h-screen
        w-full
        flex-col
        items-center
        justify-center
        overflow-hidden
        bg-[#060d1b]
        px-3
        py-5
        text-white
        sm:px-5
        sm:py-8
      "
    >
      {/* ==================================================
          FOND
      ================================================== */}

      <div
        className="
          absolute
          bottom-[-100px]
          right-[-80px]
          h-64
          w-64
          rounded-full
          bg-blue-600/10
          blur-3xl
        "
      />

      {/* ==================================================
          CONTENU
      ================================================== */}

      <section
        className="
          overflow-hidden
          rounded-[28px]
          border
          border-white/10
          bg-white/[0.06]
          shadow-2xl
          backdrop-blur-2xl
        "
      >
        {/* ==================================================
            HAUT
        ================================================== */}

        <div
          className="
            border-b
            border-white/10
            bg-gradient-to-br
            from-orange-500/10
            via-transparent
            to-blue-500/5
            px-4
            py-5
            sm:px-6
            sm:py-6
          "
        >
          <div className="flex justify-center">
            <div
              className="
                inline-flex
                items-center
                gap-1.5
                rounded-full
                border
                border-orange-400/20
                bg-orange-500/10
                px-3
                py-1.5
                text-[11px]
                font-black
                text-orange-300
              "
            >
              <Sparkles size={13} />
              La caisse digitale intelligente
            </div>
          </div>

          {/* LOGO */}

          <div className="mt-5 flex justify-center">
            <div className="relative">
              <div
                className="
                  absolute
                  inset-2
                  rounded-full
                  bg-orange-500/20
                  blur-2xl
                "
              />

              <div
                className="
                  relative
                  overflow-hidden
                  rounded-[24px]
                  border
                  border-white/10
                  bg-black/20
                  p-2
                  shadow-xl
                "
              >
                <Image
                  src="/logo.png"
                  alt="BISO-COMMERCE"
                  width={118}
                  height={118}
                  className="rounded-[19px]"
                  priority
                />
              </div>
            </div>
          </div>

          {/* TITRE */}

          <h1
            className="
              mt-5
              text-center
              text-3xl
              font-black
              tracking-tight
              sm:text-4xl
            "
          >
            BISO-
            <span
              className="
                bg-gradient-to-r
                from-orange-400
                via-yellow-300
                to-orange-500
                bg-clip-text
                text-transparent
              "
            >
              COMMERCE
            </span>
          </h1>

          <p
            className="
              mx-auto
              mt-3
              max-w-sm
              text-center
              text-xs
              leading-6
              text-slate-400
              sm:text-sm
            "
          >
            Gérez votre commerce facilement :
            ventes, stock, dépenses, dettes et
            bénéfices depuis votre téléphone.
          </p>
        </div>

        {/* ==================================================
            CONTENU
        ================================================== */}

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          {/* MINI FONCTIONS */}

          <div className="grid grid-cols-2 gap-2.5">
            <FeatureCard
              icon={
                <Store
                  size={17}
                  className="text-orange-400"
                />
              }
              text="Gestion complète"
            />

            <FeatureCard
              icon={
                <Zap
                  size={17}
                  className="text-orange-400"
                />
              }
              text="Simple & rapide"
            />

            <FeatureCard
              icon={
                <ShieldCheck
                  size={17}
                  className="text-green-400"
                />
              }
              text="Données sécurisées"
            />

            <FeatureCard
              icon={
                <WifiOff
                  size={17}
                  className="text-blue-400"
                />
              }
              text="Pensé pour mobile"
            />
          </div>

          {/* ACTIONS */}

          <div className="mt-5 space-y-2.5">
            <Link
              href="/login"
              className="
                group
                flex
                min-h-[54px]
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-gradient-to-r
                from-orange-500
                to-yellow-400
                px-4
                py-4
                text-sm
                font-black
                text-black
                shadow-lg
                shadow-orange-500/10
                transition
                hover:brightness-110
                active:scale-[0.99]
              "
            >
              <span>🔐 Se connecter</span>

              <ArrowRight
                size={18}
                className="
                  transition-transform
                  group-hover:translate-x-1
                "
              />
            </Link>

            <Link
              href="/register"
              className="
                flex
                min-h-[54px]
                w-full
                items-center
                justify-center
                rounded-2xl
                border
                border-white/10
                bg-white/[0.05]
                px-4
                py-4
                text-sm
                font-black
                text-white
                transition
                hover:bg-white/[0.08]
                active:scale-[0.99]
              "
            >
              ✨ Créer un compte
            </Link>
          </div>

          {/* INFORMATIONS */}

          <div
            className="
              mt-5
              space-y-2
              border-t
              border-white/10
              pt-4
            "
          >
            <div
              className="
                flex
                min-w-0
                items-center
                gap-2.5
                text-xs
                text-slate-400
              "
            >
              <ShieldCheck
                size={16}
                className="shrink-0 text-orange-400"
              />

              <span className="min-w-0 break-words">
                Données sécurisées
              </span>
            </div>

            <div
              className="
                flex
                min-w-0
                items-center
                gap-2.5
                text-xs
                text-slate-400
              "
            >
              <Phone
                size={16}
                className="shrink-0 text-orange-400"
              />

              <span className="min-w-0 break-words">
                Assistance : +243 994 864 173
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          PIED
      ================================================== */}

      <p
        className="
          mt-4
          px-2
          text-center
          text-[10px]
          leading-5
          text-slate-600
          sm:text-xs
        "
      >
        © {new Date().getFullYear()} BISO-COMMERCE
        {" • "}
        PDG DIEUMERCI IDI
      </p>
    </main>
  );
}

/* ======================================================
   PETITE CARTE
====================================================== */

function FeatureCard({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div
      className="
        flex
        min-w-0
        items-center
        gap-2.5
        overflow-hidden
        rounded-2xl
        border
        border-white/10
        bg-black/20
        px-3
        py-3
      "
    >
      <div
        className="
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-white/5
        "
      >
        {icon}
      </div>

      <span
        className="
          min-w-0
          truncate
          text-[11px]
          font-bold
          text-slate-300
          sm:text-xs
        "
      >
        {text}
      </span>
    </div>
  );
}
