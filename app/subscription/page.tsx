"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle2,
  Clock3,
  Crown,
  MessageCircle,
  Smartphone,
  ShieldCheck,
  WifiOff,
  X,
  RefreshCw,
} from "lucide-react";

type Status = "active" | "expired" | "pending";

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [daysUsed, setDaysUsed] = useState(0);
  const [daysLeft, setDaysLeft] = useState(30);

  const [status, setStatus] = useState<Status>("active");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isOnline, setIsOnline] = useState(true);
  const [showConnectionPopup, setShowConnectionPopup] =
    useState(false);

  /* =====================================================
     CONNEXION
  ===================================================== */

  useEffect(() => {
    setIsOnline(navigator.onLine);

    if (navigator.onLine) {
      loadSubscription();
    }

    const handleOnline = () => {
      setIsOnline(true);
      setShowConnectionPopup(false);
      loadSubscription();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /* =====================================================
     CHARGEMENT ABONNEMENT
  ===================================================== */

  const loadSubscription = async () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      return;
    }

    try {
      const phoneStorage = localStorage.getItem("phone");

      if (!phoneStorage) return;

      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("phone", phoneStorage)
        .single();

      if (!user) return;

      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (!data) {
        setStatus("expired");
        return;
      }

      setSubscription(data);

      const now = new Date();

      const start = data.start_date
        ? new Date(data.start_date)
        : null;

      let used = 0;

      if (start) {
        const diff =
          now.getTime() - start.getTime();

        used = Math.floor(
          diff /
            (1000 * 60 * 60 * 24)
        );

        if (used < 0) used = 0;
      }

      const left = Math.max(0, 30 - used);

      setDaysUsed(used);
      setDaysLeft(left);

      if (data.status === "pending") {
        setStatus("pending");
      } else if (
        data.is_active === true ||
        data.status === "trial"
      ) {
        setStatus("active");
      } else {
        setStatus("expired");
      }
    } catch {
      // La page reste utilisable visuellement hors connexion.
    }
  };

  /* =====================================================
     ACTION REQUIRANT INTERNET
  ===================================================== */

  const requireConnection = () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      setShowConnectionPopup(true);
      return false;
    }

    return true;
  };

  /* =====================================================
     WHATSAPP
  ===================================================== */

  const openWhatsApp = (message: string) => {
    if (!requireConnection()) return;

    const url =
      "https://wa.me/243994864173?text=" +
      encodeURIComponent(message);

    window.open(url, "_blank");
  };

  /* =====================================================
     RENOUVELLEMENT
  ===================================================== */

  const handleRenew = async () => {
    if (!requireConnection()) return;

    if (!fullName.trim() || !phone.trim()) {
      alert(
        "Veuillez remplir votre nom et votre numéro."
      );
      return;
    }

    setLoading(true);

    try {
      const phoneStorage =
        localStorage.getItem("phone");

      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("phone", phoneStorage)
        .single();

      if (
        !user ||
        !subscription?.id
      ) {
        setLoading(false);
        return;
      }

      await supabase
        .from("subscriptions")
        .update({
          full_name: fullName,
          phone: phone,
          status: "pending",
          user_id: user.id,
        })
        .eq("id", subscription.id)
        .eq("user_id", user.id);

      setStatus("pending");
      setShowConfirmation(true);
    } catch {
      alert(
        "Impossible d'envoyer la demande. Vérifiez votre connexion."
      );
    }

    setLoading(false);
  };

  /* =====================================================
     COULEUR STATUT
  ===================================================== */

  const statusConfig = {
    active: {
      label: "Actif",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-400/20",
      icon: (
        <CheckCircle2
          size={22}
          className="text-emerald-400"
        />
      ),
    },

    pending: {
      label: "En vérification",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-400/20",
      icon: (
        <Clock3
          size={22}
          className="text-amber-400"
        />
      ),
    },

    expired: {
      label: "Expiré",
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-400/20",
      icon: (
        <ShieldCheck
          size={22}
          className="text-red-400"
        />
      ),
    },
  };

  const currentStatus = statusConfig[status];

  const progress = Math.min(
    100,
    (daysUsed / 30) * 100
  );

  return (
    <>
      <main
        className="
          min-h-screen
          bg-slate-950
          px-3
          py-4
          pb-10
          text-white
          sm:px-5
          sm:py-6
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-xl
            space-y-3
          "
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <header
            className="
              rounded-2xl
              border
              border-white/10
              bg-slate-900/80
              px-4
              py-3.5
            "
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-orange-500/10
                  "
                >
                  <Crown
                    size={21}
                    className="text-orange-400"
                  />
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-lg font-black">
                    Biso-Commerce
                  </h1>

                  <p className="truncate text-[11px] text-slate-500">
                    Gestion simple de votre commerce
                  </p>
                </div>
              </div>

              <div
                className={`
                  flex
                  shrink-0
                  items-center
                  gap-1.5
                  rounded-full
                  px-2.5
                  py-1.5
                  text-[10px]
                  font-bold
                  ${
                    isOnline
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400"
                  }
                `}
              >
                <span
                  className={`
                    h-1.5
                    w-1.5
                    rounded-full
                    ${
                      isOnline
                        ? "bg-emerald-400"
                        : "bg-red-400"
                    }
                  `}
                />

                <span className="hidden xs:inline">
                  {isOnline ? "En ligne" : "Hors ligne"}
                </span>
              </div>
            </div>
          </header>

          {/* =================================================
              TARIF
          ================================================= */}

          <section
            className="
              rounded-2xl
              border
              border-orange-400/15
              bg-gradient-to-r
              from-orange-500/10
              to-slate-900
              px-4
              py-4
            "
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-400">
                  Abonnement mensuel
                </p>

                <p className="mt-1 text-sm font-bold text-white">
                  Simple, rapide et professionnel
                </p>
              </div>

              <div className="shrink-0 text-right">
                <span className="text-2xl font-black text-orange-400">
                  5$
                </span>

                <span className="block text-[10px] text-slate-500">
                  / mois
                </span>
              </div>
            </div>
          </section>

          {/* =================================================
              STATUT + JOURS
          ================================================= */}

          <section
            className="
              rounded-2xl
              border
              border-white/10
              bg-slate-900/70
              p-4
            "
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    ${currentStatus.bg}
                  `}
                >
                  {currentStatus.icon}
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500">
                    Statut
                  </p>

                  <p
                    className={`
                      text-base
                      font-black
                      ${currentStatus.color}
                    `}
                  >
                    {currentStatus.label}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-2xl font-black">
                  {daysLeft}
                </p>

                <p className="text-[10px] text-slate-500">
                  jours restants
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-[10px] text-slate-500">
                <span>Utilisation</span>
                <span>{daysUsed}/30 jours</span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="
                    h-full
                    rounded-full
                    bg-gradient-to-r
                    from-orange-500
                    to-emerald-400
                    transition-all
                  "
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>
          </section>

          {/* =================================================
              MOYENS DE PAIEMENT
          ================================================= */}

          <section
            className="
              rounded-2xl
              border
              border-white/10
              bg-slate-900/70
              p-4
            "
          >
            <div className="mb-3 flex items-center gap-2">
              <Smartphone
                size={19}
                className="text-orange-400"
              />

              <h2 className="text-sm font-black">
                Moyens de paiement
              </h2>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <PaymentCard
                title="Airtel Money"
                number="+243 994 864 173"
              />

              <PaymentCard
                title="Orange Money"
                number="+243 891 618 812"
              />

              <PaymentCard
                title="M-Pesa"
                number="+243 810 168 651"
              />
            </div>

            <p className="mt-3 text-center text-[10px] text-slate-500">
              Nom du bénéficiaire :{" "}
              <span className="font-bold text-slate-300">
                DIEUMERCI IDI
              </span>
            </p>
          </section>

          {/* =================================================
              COMMENT PAYER
          ================================================= */}

          <section
            className="
              rounded-2xl
              border
              border-white/10
              bg-slate-900/70
              p-4
            "
          >
            <h2 className="mb-3 text-sm font-black">
              💳 Comment payer ?
            </h2>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Step number="1" text="Envoyez 5$ par Mobile Money" />
              <Step number="2" text="Gardez la preuve du paiement" />
              <Step number="3" text="Remplissez vos informations" />
              <Step number="4" text="Envoyez la preuve sur WhatsApp" />
            </div>
          </section>

          {/* =================================================
              FORMULAIRE
          ================================================= */}

          <section
            className="
              rounded-2xl
              border
              border-white/10
              bg-slate-900/70
              p-4
            "
          >
            <div className="mb-3">
              <h2 className="text-sm font-black">
                🔄 Demande d'activation
              </h2>

              <p className="mt-1 text-[11px] text-slate-500">
                Après votre paiement, envoyez votre demande.
              </p>
            </div>

            <div className="space-y-2.5">
              <input
                type="text"
                placeholder="Nom complet"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                className="
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-white/10
                  bg-slate-950
                  px-3
                  text-sm
                  text-white
                  outline-none
                  placeholder:text-slate-600
                  focus:border-orange-400/50
                "
              />

              <input
                type="tel"
                placeholder="Numéro téléphone"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                className="
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-white/10
                  bg-slate-950
                  px-3
                  text-sm
                  text-white
                  outline-none
                  placeholder:text-slate-600
                  focus:border-orange-400/50
                "
              />

              <button
                type="button"
                onClick={handleRenew}
                disabled={loading}
                className="
                  flex
                  h-11
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-gradient-to-r
                  from-orange-500
                  to-blue-600
                  text-sm
                  font-black
                  text-white
                  transition
                  active:scale-[0.98]
                  disabled:opacity-50
                "
              >
                {loading ? (
                  <>
                    <RefreshCw
                      size={17}
                      className="animate-spin"
                    />
                    Envoi...
                  </>
                ) : (
                  "Envoyer la demande"
                )}
              </button>
            </div>
          </section>
            {/* =================================================
              WHATSAPP
          ================================================= */}

          {showConfirmation && (
            <section
              className="
                rounded-2xl
                border
                border-emerald-400/20
                bg-emerald-500/5
                p-4
              "
            >
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
                    bg-emerald-500/10
                  "
                >
                  <MessageCircle
                    size={19}
                    className="text-emerald-400"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-black">
                    Preuve de paiement
                  </p>

                  <p className="text-[10px] text-slate-500">
                    Envoyez votre capture sur WhatsApp.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  openWhatsApp(
                    `Bonjour DIEUMERCI IDI (PDG),

Je viens de payer mon abonnement Biso-Commerce.

Nom : ${fullName}

Numéro : ${phone}

Je vous envoie la preuve du paiement.`
                  )
                }
                className="
                  mt-3
                  flex
                  h-11
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-emerald-600
                  text-sm
                  font-black
                  transition
                  active:scale-[0.98]
                "
              >
                <MessageCircle size={18} />
                Envoyer sur WhatsApp
              </button>
            </section>
          )}


          {/* =================================================
              DEMANDE EN ATTENTE
          ================================================= */}

          {status === "pending" && (
            <section
              className="
                rounded-2xl
                border
                border-amber-400/20
                bg-amber-500/5
                px-4
                py-3
              "
            >
              <div className="flex gap-3">
                <Clock3
                  size={20}
                  className="mt-0.5 shrink-0 text-amber-400"
                />

                <div>
                  <p className="text-sm font-black text-amber-300">
                    Paiement en vérification
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-slate-400">
                    Votre demande a été envoyée.
                    L'administration va vérifier votre paiement.
                  </p>
                </div>
              </div>
            </section>
          )}

        
          {/* =================================================
              FOOTER
          ================================================= */}

          <footer className="py-4 text-center">
            <p className="text-sm font-black">
              Biso-Commerce
            </p>

            <p className="mt-1 text-[11px] font-bold text-orange-400">
              IDI HEMEDI DIEUMERCI (PDG)
            </p>

            <p className="text-[9px] text-slate-600">
              KINSHASA, RDC
            </p>
          </footer>
        </div>
      </main>

      {/* =====================================================
          POPUP CONNEXION
      ===================================================== */}

      {showConnectionPopup && (
        <div
          className="
            fixed
            inset-0
            z-[9999]
            flex
            items-center
            justify-center
            bg-black/70
            px-4
            backdrop-blur-sm
          "
        >
          <div
            className="
              relative
              w-full
              max-w-[340px]
              rounded-3xl
              border
              border-white/10
              bg-slate-900
              p-5
              shadow-2xl
            "
          >
            <button
              type="button"
              onClick={() =>
                setShowConnectionPopup(false)
              }
              className="
                absolute
                right-3
                top-3
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-lg
                bg-white/5
                text-slate-400
              "
            >
              <X size={16} />
            </button>

            <div className="text-center">
              <div
                className="
                  mx-auto
                  mb-4
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-2xl
                  bg-orange-500/10
                "
              >
                <WifiOff
                  size={26}
                  className="text-orange-400"
                />
              </div>

              <h2 className="text-lg font-black">
                Connexion requise
              </h2>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Cette action nécessite une connexion
                Internet. Connectez-vous puis réessayez.
              </p>

              <button
                type="button"
                onClick={() => {
                  if (navigator.onLine) {
                    setIsOnline(true);
                    setShowConnectionPopup(false);
                    loadSubscription();
                  }
                }}
                className="
                  mt-4
                  flex
                  h-11
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-gradient-to-r
                  from-orange-500
                  to-blue-600
                  text-sm
                  font-black
                "
              >
                <RefreshCw size={17} />
                Vérifier la connexion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   CARTE PAIEMENT
========================================================= */

function PaymentCard({
  title,
  number,
}: {
  title: string;
  number: string;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-white/5
        bg-slate-950/80
        px-3
        py-2.5
      "
    >
      <p className="text-[11px] font-bold text-slate-300">
        {title}
      </p>

      <p className="mt-1 text-xs font-black text-orange-400">
        {number}
      </p>
    </div>
  );
}

/* =========================================================
   ÉTAPE PAIEMENT
========================================================= */

function Step({
  number,
  text,
}: {
  number: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-slate-950/60 px-3 py-2.5">
      <span
        className="
          flex
          h-6
          w-6
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-orange-500/10
          text-[10px]
          font-black
          text-orange-400
        "
      >
        {number}
      </span>

      <p className="text-[11px] leading-4 text-slate-300">
        {text}
      </p>
    </div>
  );
}