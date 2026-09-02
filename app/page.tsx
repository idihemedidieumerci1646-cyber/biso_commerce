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
WifiOff,
} from "lucide-react";

/**

* Vérifie si Internet fonctionne réellement.
*
* IMPORTANT :
* Cette vérification est totalement indépendante
* de l'affichage de la page.
*
* Si le réseau est connecté mais que :
* * le forfait est épuisé ;
* * Internet ne répond pas ;
* * la requête est bloquée ;
*
* la fonction retourne simplement false.
*
* Elle ne doit JAMAIS empêcher la page principale
* de s'afficher.
  */
  async function hasRealInternet(
  timeout = 2500
  ): Promise<boolean> {
  if (typeof navigator === "undefined") {
  return false;
  }

if (!navigator.onLine) {
return false;
}

const controller = new AbortController();

const timer = window.setTimeout(() => {
controller.abort();
}, timeout);

try {
/**
* Test réseau léger.
*
* no-cors permet uniquement de vérifier que
* la requête réseau arrive à obtenir une réponse.
*/
await fetch(
"https://www.gstatic.com/generate_204",
{
method: "GET",
mode: "no-cors",
cache: "no-store",
signal: controller.signal,
}
);

return true;


} catch {
return false;
} finally {
window.clearTimeout(timer);
}
}

export default function Home() {
const router = useRouter();

useEffect(() => {
let cancelled = false;


/**
 * IMPORTANT :
 * Le rendu de Home ne dépend PAS de cette fonction.
 *
 * La page est déjà affichée.
 * Cette fonction sert uniquement à déterminer
 * s'il faut éventuellement rediriger vers Dashboard.
 */
const checkAndRedirect = async () => {
  try {
    /**
     * localStorage peut être indisponible dans
     * certaines situations Safari/PWA.
     *
     * Dans ce cas, on ne bloque surtout pas
     * la page principale.
     */
    let phone: string | null = null;

    try {
      phone = localStorage.getItem("phone");
    } catch (error) {
      console.warn(
        "LocalStorage indisponible :",
        error
      );
      return;
    }

    /**
     * Aucun utilisateur connecté.
     *
     * On ne fait absolument rien.
     * La page principale reste affichée.
     */
    if (!phone) {
      return;
    }

    /**
     * Si iPhone/Safari indique directement
     * qu'il n'y a pas de connexion :
     *
     * PAS DE TEST INTERNET.
     * PAS DE REDIRECTION.
     *
     * La page reste disponible hors connexion.
     */
    if (!navigator.onLine) {
      return;
    }

    /**
     * navigator.onLine === true ne garantit PAS
     * que les données mobiles fonctionnent.
     *
     * On teste donc Internet séparément.
     *
     * MAIS ce test ne bloque jamais le rendu
     * de la page.
     */
    const internetWorks =
      await hasRealInternet(2500);

    /**
     * Entre-temps, le composant peut avoir
     * été démonté.
     */
    if (cancelled) {
      return;
    }

    /**
     * Internet fonctionne réellement.
     *
     * L'utilisateur est déjà connecté :
     * on peut aller au Dashboard.
     */
    if (internetWorks) {
      router.replace("/dashboard");
      return;
    }

    /**
     * Internet ne fonctionne pas réellement.
     *
     * Exemple :
     * - forfait épuisé ;
     * - données mobiles coupées ;
     * - réseau connecté sans Internet ;
     * - problème temporaire réseau.
     *
     * ON NE REDIRIGE PAS.
     *
     * La page principale reste donc visible.
     */
    console.warn(
      "Connexion détectée mais Internet inaccessible. " +
      "La page principale reste affichée."
    );
  } catch (error) {
    /**
     * Une erreur ne doit JAMAIS empêcher
     * l'affichage de Home.
     */
    console.warn(
      "Vérification réseau ignorée :",
      error
    );
  }
};

/**
 * Lancement en arrière-plan.
 *
 * Le rendu de la page n'attend PAS cette fonction.
 */
void checkAndRedirect();

return () => {
  cancelled = true;
};


}, [router]);

return ( <main
   className="
     relative
     flex
     min-h-screen
     w-full
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


  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div
      className="
        absolute
        left-1/2
        top-[-80px]
        h-64
        w-64
        -translate-x-1/2
        rounded-full
        bg-orange-500/10
        blur-3xl
        sm:h-80
        sm:w-80
      "
    />

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
  </div>

  {/* ==================================================
      CONTENU
  ================================================== */}

  <div
    className="
      relative
      z-10
      w-full
      max-w-md
    "
  >
    {/* ==================================================
        CARTE PRINCIPALE
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
  </div>
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
return ( <div
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
 > <div
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
{icon} </div>


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
