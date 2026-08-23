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
  Sparkles,
  CreditCard,
  CalendarDays,
  User,
  Phone,
  ArrowRight,
} from "lucide-react";


// ================================================================
// TYPES
// ================================================================

type SubscriptionStatus = "active" | "expired" | "pending";


// ================================================================
// PAGE
// ================================================================

export default function SubscriptionPage() {

  // ==============================================================
  // STATES
  // ==============================================================

  const [subscription, setSubscription] = useState<any>(null);

  const [daysUsed, setDaysUsed] = useState(0);

  const [daysLeft, setDaysLeft] = useState(30);

  const [status, setStatus] =
    useState<SubscriptionStatus>("active");

  const [fullName, setFullName] = useState("");

  const [phone, setPhone] = useState("");

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [loading, setLoading] = useState(false);


  // ==============================================================
  // CHARGEMENT
  // ==============================================================

  useEffect(() => {

    loadSubscription();

  }, []);


  // ==============================================================
  // CHARGER L'ABONNEMENT
  // ==============================================================

  const loadSubscription = async () => {

    try {

      const phoneStorage =
        localStorage.getItem("phone");

      if (!phoneStorage) {

        setStatus("expired");

        return;

      }


      // ------------------------------------------------------------
      // CHERCHER L'UTILISATEUR
      // ------------------------------------------------------------

      const {
        data: user,
        error: userError,
      } = await supabase
        .from("users")
        .select("id, full_name, phone")
        .eq("phone", phoneStorage)
        .maybeSingle();


      if (userError) {

        console.error(
          "Erreur utilisateur :",
          userError
        );

        setStatus("expired");

        return;

      }


      if (!user) {

        setStatus("expired");

        return;

      }


      // ------------------------------------------------------------
      // REMPLIR AUTOMATIQUEMENT LES INFORMATIONS
      // ------------------------------------------------------------

      if (user.full_name) {

        setFullName(user.full_name);

      }

      if (user.phone) {

        setPhone(user.phone);

      }


      // ------------------------------------------------------------
      // CHERCHER L'ABONNEMENT
      // ------------------------------------------------------------

      const {
        data,
        error,
      } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();


      if (error) {

        console.error(
          "Erreur abonnement :",
          error
        );

        setStatus("expired");

        return;

      }


      if (!data) {

        setStatus("expired");

        return;

      }


      setSubscription(data);


      // ------------------------------------------------------------
      // CALCUL DES JOURS
      // ------------------------------------------------------------

      const now = new Date();

      const start = data.start_date
        ? new Date(data.start_date)
        : null;


      let used = 0;


      if (start) {

        const diff =
          now.getTime() -
          start.getTime();


        used = Math.floor(
          diff /
          (
            1000 *
            60 *
            60 *
            24
          )
        );


        if (used < 0) {

          used = 0;

        }

      }


      const left = Math.max(
        0,
        30 - used
      );


      setDaysUsed(used);

      setDaysLeft(left);


      // ------------------------------------------------------------
      // STATUT
      // ------------------------------------------------------------

      if (data.status === "pending") {

        setStatus("pending");

      }

      else if (
        data.is_active === true ||
        data.status === "trial"
      ) {

        setStatus("active");

      }

      else {

        setStatus("expired");

      }

    }

    catch (error) {

      console.error(
        "Erreur chargement abonnement :",
        error
      );

      setStatus("expired");

    }

  };


  // ==============================================================
  // WHATSAPP
  // ==============================================================

  const openWhatsApp = (
    message: string
  ) => {

    const url =
      "https://wa.me/243994864173?text=" +
      encodeURIComponent(message);


    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );

  };


  // ==============================================================
  // DEMANDE DE RENOUVELLEMENT
  // ==============================================================

  const handleRenew = async () => {

    // ------------------------------------------------------------
    // VALIDATION
    // ------------------------------------------------------------

    if (
      !fullName.trim() ||
      !phone.trim()
    ) {

      alert(
        "Veuillez remplir votre nom et votre numéro."
      );

      return;

    }


    if (loading) {

      return;

    }


    setLoading(true);


    try {

      const phoneStorage =
        localStorage.getItem("phone");


      if (!phoneStorage) {

        alert(
          "Votre session utilisateur est introuvable."
        );

        setLoading(false);

        return;

      }


      // ----------------------------------------------------------
      // UTILISATEUR
      // ----------------------------------------------------------

      const {
        data: user,
        error: userError,
      } = await supabase
        .from("users")
        .select("id")
        .eq("phone", phoneStorage)
        .maybeSingle();


      if (userError) {

        console.error(
          "Erreur utilisateur :",
          userError
        );

        alert(
          "Impossible de récupérer votre compte."
        );

        setLoading(false);

        return;

      }


      if (!user) {

        alert(
          "Utilisateur introuvable."
        );

        setLoading(false);

        return;

      }


      // ----------------------------------------------------------
      // VERIFIER L'ABONNEMENT
      // ----------------------------------------------------------

      if (!subscription?.id) {

        alert(
          "Aucun abonnement trouvé pour votre compte."
        );

        setLoading(false);

        return;

      }


      // ----------------------------------------------------------
      // METTRE EN ATTENTE
      // ----------------------------------------------------------

      const {
        error: updateError,
      } = await supabase
        .from("subscriptions")
        .update({

          full_name:
            fullName.trim(),

          phone:
            phone.trim(),

          status:
            "pending",

          user_id:
            user.id,

        })
        .eq(
          "id",
          subscription.id
        )
        .eq(
          "user_id",
          user.id
        );


      if (updateError) {

        console.error(
          "Erreur mise à jour abonnement :",
          updateError
        );

        alert(
          "Une erreur est survenue lors de l'envoi de la demande."
        );

        setLoading(false);

        return;

      }


      // ----------------------------------------------------------
      // METTRE À JOUR L'ÉTAT LOCAL
      // ----------------------------------------------------------

      setSubscription({
        ...subscription,
        full_name:
          fullName.trim(),
        phone:
          phone.trim(),
        status:
          "pending",
      });


      setStatus("pending");

      setShowConfirmation(true);


    }

    catch (error) {

      console.error(
        "Erreur renouvellement :",
        error
      );

      alert(
        "Une erreur inattendue est survenue."
      );

    }


    setLoading(false);

  };


  // ==============================================================
  // POURCENTAGE
  // ==============================================================

  const usagePercentage =
    Math.min(
      100,
      Math.max(
        0,
        (daysUsed / 30) * 100
      )
    );


  // ==============================================================
  // JSX
  // ==============================================================

  return (

    <main
      className="
        min-h-screen
        bg-[#f5f7fb]
        text-slate-900
        px-4
        py-6
        sm:px-6
        sm:py-10
      "
    >

      <div
        className="
          max-w-2xl
          mx-auto
          space-y-5
        "
      >


        {/* ========================================================
            HEADER
        ======================================================== */}

        <section
          className="
            bg-white
            rounded-[26px]
            border
            border-slate-200/80
            p-6
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
          "
        >

          <div
            className="
              flex
              items-center
              gap-4
            "
          >

            <div
              className="
                w-12
                h-12
                rounded-2xl
                bg-indigo-600
                flex
                items-center
                justify-center
                shadow-[0_8px_18px_rgba(79,70,229,0.18)]
              "
            >

              <Crown
                size={23}
                className="text-white"
              />

            </div>


            <div>

              <h1
                className="
                  text-2xl
                  font-black
                  tracking-tight
                  text-slate-900
                "
              >
                Biso-Commerce
              </h1>

              <p
                className="
                  text-sm
                  text-slate-500
                  mt-1
                "
              >
                Votre espace abonnement
              </p>

            </div>

          </div>


          <div
            className="
              mt-6
              rounded-2xl
              bg-indigo-50
              border
              border-indigo-100
              p-5
            "
          >

            <div
              className="
                flex
                flex-col
                sm:flex-row
                sm:items-center
                sm:justify-between
                gap-4
              "
            >

              <div>

                <p
                  className="
                    text-xs
                    font-bold
                    uppercase
                    tracking-wide
                    text-indigo-600
                  "
                >
                  Abonnement mensuel
                </p>


                <p
                  className="
                    text-base
                    font-black
                    text-slate-900
                    mt-1
                  "
                >
                  Gérez votre commerce simplement
                </p>


                <p
                  className="
                    text-sm
                    text-slate-500
                    mt-1
                  "
                >
                  Stock, ventes, dettes et bénéfices.
                </p>

              </div>


              <div
                className="
                  shrink-0
                  text-left
                  sm:text-right
                "
              >

                <p
                  className="
                    text-3xl
                    font-black
                    text-indigo-600
                  "
                >
                  5$
                </p>

                <p
                  className="
                    text-xs
                    text-slate-500
                  "
                >
                  / mois
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ========================================================
            STATUT
        ======================================================== */}

        <section
          className="
            bg-white
            rounded-[26px]
            border
            border-slate-200/80
            p-6
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
              gap-4
            "
          >

            <div>

              <p
                className="
                  text-sm
                  font-semibold
                  text-slate-500
                "
              >
                Statut de l'abonnement
              </p>


              <h2
                className="
                  mt-2
                  text-2xl
                  font-black
                  text-slate-900
                "
              >

                {status === "active"
                  ? "Actif"
                  : status === "pending"
                  ? "En vérification"
                  : "Expiré"}

              </h2>


              <div className="mt-2">

                {status === "active" && (

                  <span
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-full
                      bg-emerald-50
                      px-3
                      py-1.5
                      text-xs
                      font-bold
                      text-emerald-700
                    "
                  >

                    <span
                      className="
                        w-2
                        h-2
                        rounded-full
                        bg-emerald-500
                      "
                    />

                    Abonnement actif

                  </span>

                )}


                {status === "pending" && (

                  <span
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-full
                      bg-amber-50
                      px-3
                      py-1.5
                      text-xs
                      font-bold
                      text-amber-700
                    "
                  >

                    <Clock3 size={14} />

                    Paiement en vérification

                  </span>

                )}


                {status === "expired" && (

                  <span
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-full
                      bg-slate-100
                      px-3
                      py-1.5
                      text-xs
                      font-bold
                      text-slate-600
                    "
                  >

                    <ShieldCheck size={14} />

                    Abonnement expiré

                  </span>

                )}

              </div>

            </div>


            <div
              className={`
                w-14
                h-14
                rounded-2xl
                flex
                items-center
                justify-center
                shrink-0
                ${
                  status === "active"
                    ? "bg-emerald-50"
                    : status === "pending"
                    ? "bg-amber-50"
                    : "bg-slate-100"
                }
              `}
            >

              {status === "active" ? (

                <CheckCircle2
                  size={28}
                  className="text-emerald-600"
                />

              ) : status === "pending" ? (

                <Clock3
                  size={28}
                  className="text-amber-600"
                />

              ) : (

                <ShieldCheck
                  size={28}
                  className="text-slate-500"
                />

              )}

            </div>

          </div>

        </section>


        {/* ========================================================
            COMPTEUR
        ======================================================== */}

        <section
          className="
            bg-white
            rounded-[26px]
            border
            border-slate-200/80
            p-6
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
              gap-4
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  w-10
                  h-10
                  rounded-xl
                  bg-indigo-50
                  flex
                  items-center
                  justify-center
                "
              >

                <CalendarDays
                  size={20}
                  className="text-indigo-600"
                />

              </div>


              <div>

                <h3
                  className="
                    font-black
                    text-slate-900
                  "
                >
                  Utilisation
                </h3>

                <p
                  className="
                    text-xs
                    text-slate-500
                    mt-0.5
                  "
                >
                  Période de 30 jours
                </p>

              </div>

            </div>


            <div
              className="
                text-right
              "
            >

              <p
                className="
                  text-xl
                  font-black
                  text-indigo-600
                "
              >
                {daysLeft}
              </p>

              <p
                className="
                  text-xs
                  font-semibold
                  text-slate-500
                "
              >
                jours restants
              </p>

            </div>

          </div>


          <div
            className="
              mt-6
              h-3
              rounded-full
              bg-slate-100
              overflow-hidden
            "
          >

            <div
              className="
                h-full
                rounded-full
                bg-indigo-600
                transition-all
                duration-500
              "
              style={{
                width:
                  `${usagePercentage}%`,
              }}
            />

          </div>


          <div
            className="
              mt-3
              flex
              items-center
              justify-between
              text-xs
              font-semibold
              text-slate-500
            "
          >

            <span>
              {daysUsed} jours utilisés
            </span>

            <span>
              30 jours
            </span>

          </div>

        </section>


        {/* ========================================================
            COMMENT PAYER
        ======================================================== */}

        <section
          className="
            bg-white
            rounded-[26px]
            border
            border-slate-200/80
            p-6
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
          "
        >

          <div
            className="
              flex
              items-center
              gap-3
            "
          >

            <div
              className="
                w-11
                h-11
                rounded-2xl
                bg-indigo-50
                flex
                items-center
                justify-center
              "
            >

              <CreditCard
                size={21}
                className="text-indigo-600"
              />

            </div>


            <div>

              <h3
                className="
                  text-lg
                  font-black
                  text-slate-900
                "
              >
                Comment payer ?
              </h3>

              <p
                className="
                  text-sm
                  text-slate-500
                "
              >
                Suivez simplement ces étapes.
              </p>

            </div>

          </div>


          <div
            className="
              mt-6
              space-y-3
            "
          >

            {[
              "Envoyez 5$ par Mobile Money.",
              "Gardez votre preuve de paiement.",
              "Remplissez votre nom et votre numéro.",
              "Envoyez la capture sur WhatsApp.",
              "Attendez la validation de l'administration.",
            ].map(
              (text, index) => (

                <div
                  key={index}
                  className="
                    flex
                    items-center
                    gap-3
                    rounded-2xl
                    bg-slate-50
                    border
                    border-slate-100
                    p-4
                  "
                >

                  <div
                    className="
                      w-8
                      h-8
                      rounded-xl
                      bg-indigo-600
                      text-white
                      flex
                      items-center
                      justify-center
                      text-xs
                      font-black
                      shrink-0
                    "
                  >
                    {index + 1}
                  </div>


                  <p
                    className="
                      text-sm
                      font-medium
                      text-slate-700
                    "
                  >
                    {text}
                  </p>

                </div>

              )
            )}

          </div>

        </section>


        {/* ========================================================
            MOYENS DE PAIEMENT
        ======================================================== */}

        <section
          className="
            bg-white
            rounded-[26px]
            border
            border-slate-200/80
            p-6
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
          "
        >

          <div
            className="
              flex
              items-center
              gap-3
            "
          >

            <div
              className="
                w-11
                h-11
                rounded-2xl
                bg-indigo-50
                flex
                items-center
                justify-center
              "
            >

              <Smartphone
                size={21}
                className="text-indigo-600"
              />

            </div>


            <div>

              <h3
                className="
                  text-lg
                  font-black
                  text-slate-900
                "
              >
                Nos moyens de paiement
              </h3>

              <p
                className="
                  text-sm
                  text-slate-500
                "
              >
                Choisissez votre moyen Mobile Money.
              </p>

            </div>

          </div>


          <div
            className="
              mt-6
              space-y-3
            "
          >


            {/* AIRTEL */}

            <div
              className="
                rounded-2xl
                border
                border-slate-200
                bg-slate-50
                p-5
              "
            >

              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >

                <div>

                  <p
                    className="
                      font-black
                      text-slate-900
                    "
                  >
                    Airtel Money
                  </p>

                  <p
                    className="
                      text-xs
                      text-slate-500
                      mt-1
                    "
                  >
                    DIEUMERCI IDI
                  </p>

                </div>


                <span
                  className="
                    rounded-xl
                    bg-white
                    border
                    border-slate-200
                    px-3
                    py-2
                    text-xs
                    font-bold
                    text-slate-700
                  "
                >
                  Airtel
                </span>

              </div>


              <p
                className="
                  mt-4
                  text-lg
                  font-black
                  text-indigo-600
                "
              >
                +243 994 864 173
              </p>

            </div>


            {/* ORANGE */}

            <div
              className="
                rounded-2xl
                border
                border-slate-200
                bg-slate-50
                p-5
              "
            >

              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >

                <div>

                  <p
                    className="
                      font-black
                      text-slate-900
                    "
                  >
                    Orange Money
                  </p>

                  <p
                    className="
                      text-xs
                      text-slate-500
                      mt-1
                    "
                  >
                    DIEUMERCI IDI
                  </p>

                </div>


                <span
                  className="
                    rounded-xl
                    bg-white
                    border
                    border-slate-200
                    px-3
                    py-2
                    text-xs
                    font-bold
                    text-slate-700
                  "
                >
                  Orange
                </span>

              </div>


              <p
                className="
                  mt-4
                  text-lg
                  font-black
                  text-indigo-600
                "
              >
                +243 891 618 812
              </p>

            </div>


            {/* M-PESA */}

            <div
              className="
                rounded-2xl
                border
                border-slate-200
                bg-slate-50
                p-5
              "
            >

              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >

                <div>

                  <p
                    className="
                      font-black
                      text-slate-900
                    "
                  >
                    M-Pesa
                  </p>

                  <p
                    className="
                      text-xs
                      text-slate-500
                      mt-1
                    "
                  >
                    DIEUMERCI IDI
                  </p>

                </div>


                <span
                  className="
                    rounded-xl
                    bg-white
                    border
                    border-slate-200
                    px-3
                    py-2
                    text-xs
                    font-bold
                    text-slate-700
                  "
                >
                  Vodacom
                </span>

              </div>


              <p
                className="
                  mt-4
                  text-lg
                  font-black
                  text-indigo-600
                "
              >
                +243 810 168 651
              </p>

            </div>

          </div>

        </section>


        {/* ========================================================
            DEMANDE D'ACTIVATION
        ======================================================== */}

        <section
          className="
            bg-white
            rounded-[26px]
            border
            border-slate-200/80
            p-6
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
          "
        >

          <div
            className="
              flex
              items-start
              gap-3
            "
          >

            <div
              className="
                w-11
                h-11
                rounded-2xl
                bg-indigo-50
                flex
                items-center
                justify-center
                shrink-0
              "
            >

              <Sparkles
                size={20}
                className="text-indigo-600"
              />

            </div>


            <div>

              <h3
                className="
                  text-lg
                  font-black
                  text-slate-900
                "
              >
                Demande d'activation
              </h3>

              <p
                className="
                  text-sm
                  text-slate-500
                  mt-1
                "
              >
                Après votre paiement, remplissez vos informations.
              </p>

            </div>

          </div>


          <div
            className="
              space-y-4
              mt-6
            "
          >

            {/* NOM */}

            <div>

              <label
                className="
                  block
                  text-sm
                  font-bold
                  text-slate-700
                  mb-2
                "
              >
                Nom complet
              </label>


              <div className="relative">

                <User
                  size={18}
                  className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />


                <input
                  type="text"
                  placeholder="Votre nom complet"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  className="
                    w-full
                    h-14
                    pl-12
                    pr-4
                    rounded-2xl
                    bg-slate-50
                    border
                    border-slate-200
                    text-slate-900
                    placeholder:text-slate-400
                    outline-none
                    transition
                    focus:border-indigo-500
                    focus:ring-4
                    focus:ring-indigo-500/10
                  "
                />

              </div>

            </div>


            {/* TELEPHONE */}

            <div>

              <label
                className="
                  block
                  text-sm
                  font-bold
                  text-slate-700
                  mb-2
                "
              >
                Numéro de téléphone
              </label>


              <div className="relative">

                <Phone
                  size={18}
                  className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />


                <input
                  type="tel"
                  placeholder="Votre numéro de téléphone"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  className="
                    w-full
                    h-14
                    pl-12
                    pr-4
                    rounded-2xl
                    bg-slate-50
                    border
                    border-slate-200
                    text-slate-900
                    placeholder:text-slate-400
                    outline-none
                    transition
                    focus:border-indigo-500
                    focus:ring-4
                    focus:ring-indigo-500/10
                  "
                />

              </div>

            </div>


            {/* BOUTON */}

            <button
              onClick={handleRenew}
              disabled={loading}
              className="
                w-full
                h-14
                rounded-2xl
                bg-indigo-600
                hover:bg-indigo-700
                active:scale-[0.99]
                text-white
                font-black
                transition
                shadow-[0_8px_20px_rgba(79,70,229,0.18)]
                disabled:opacity-60
                disabled:cursor-not-allowed
              "
            >

              {loading ? (

                <span
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2
                  "
                >

                  <span
                    className="
                      w-5
                      h-5
                      border-2
                      border-white/30
                      border-t-white
                      rounded-full
                      animate-spin
                    "
                  />

                  Enregistrement...

                </span>

              ) : (

                <span
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2
                  "
                >

                  <CheckCircle2 size={20} />

                  Envoyer pour vérification

                  <ArrowRight size={18} />

                </span>

              )}

            </button>

          </div>

        </section>


        {/* ========================================================
            PAIEMENT EN VERIFICATION
        ======================================================== */}

        {status === "pending" && (

          <section
            className="
              bg-amber-50
              border
              border-amber-200
              rounded-[26px]
              p-6
            "
          >

            <div
              className="
                flex
                items-start
                gap-4
              "
            >

              <div
                className="
                  w-11
                  h-11
                  rounded-2xl
                  bg-amber-100
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >

                <Clock3
                  size={21}
                  className="text-amber-600"
                />

              </div>


              <div>

                <h3
                  className="
                    font-black
                    text-lg
                    text-amber-900
                  "
                >
                  Paiement en vérification
                </h3>


                <p
                  className="
                    text-sm
                    text-amber-800/80
                    mt-1
                    leading-6
                  "
                >
                  Votre demande a bien été envoyée.
                  L'administration va vérifier votre paiement
                  avant d'activer votre abonnement.
                </p>

              </div>

            </div>

          </section>

        )}


        {/* ========================================================
            WHATSAPP
        ======================================================== */}

        {showConfirmation && (

          <section
            className="
              bg-emerald-50
              border
              border-emerald-200
              rounded-[26px]
              p-6
            "
          >

            <div
              className="
                flex
                items-start
                gap-4
              "
            >

              <div
                className="
                  w-11
                  h-11
                  rounded-2xl
                  bg-emerald-100
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >

                <MessageCircle
                  size={21}
                  className="text-emerald-600"
                />

              </div>


              <div className="flex-1">

                <h3
                  className="
                    text-lg
                    font-black
                    text-emerald-900
                  "
                >
                  Envoyer la preuve de paiement
                </h3>


                <p
                  className="
                    text-sm
                    text-emerald-800/80
                    mt-1
                    leading-6
                  "
                >
                  Envoyez votre capture de paiement sur
                  WhatsApp afin que l'administration puisse
                  vérifier votre demande.
                </p>


                <button
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
                    mt-5
                    w-full
                    h-14
                    rounded-2xl
                    bg-emerald-600
                    hover:bg-emerald-700
                    text-white
                    font-black
                    flex
                    items-center
                    justify-center
                    gap-2
                    transition
                  "
                >

                  <MessageCircle size={21} />

                  Envoyer la capture sur WhatsApp

                </button>

              </div>

            </div>

          </section>

        )}


        {/* ========================================================
            PROPOSER UNE IDEE
        ======================================================== */}

        <section
          className="
            bg-white
            rounded-[26px]
            border
            border-slate-200/80
            p-6
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
          "
        >

          <div
            className="
              flex
              items-start
              gap-4
            "
          >

            <div
              className="
                w-11
                h-11
                rounded-2xl
                bg-indigo-50
                flex
                items-center
                justify-center
                shrink-0
              "
            >

              <Sparkles
                size={20}
                className="text-indigo-600"
              />

            </div>


            <div>

              <h3
                className="
                  text-lg
                  font-black
                  text-slate-900
                "
              >
                Proposer une idée
              </h3>


              <p
                className="
                  text-sm
                  text-slate-500
                  mt-1
                  leading-6
                "
              >
                Une suggestion pour améliorer
                Biso-Commerce ?
              </p>

            </div>

          </div>


          <button
            onClick={() =>
              openWhatsApp(
                `Bonjour DIEUMERCI IDI (PDG),

Je voudrais proposer une amélioration pour Biso-Commerce.`
              )
            }
            className="
              mt-5
              w-full
              h-14
              rounded-2xl
              bg-slate-900
              hover:bg-slate-800
              text-white
              font-black
              flex
              items-center
              justify-center
              gap-2
              transition
            "
          >

            <MessageCircle size={20} />

            Envoyer une proposition

          </button>

        </section>


        {/* ========================================================
            SECURITE
        ======================================================== */}

        <section
          className="
            bg-indigo-50
            border
            border-indigo-100
            rounded-[26px]
            p-6
          "
        >

          <div
            className="
              flex
              items-start
              gap-4
            "
          >

            <div
              className="
                w-11
                h-11
                rounded-2xl
                bg-white
                flex
                items-center
                justify-center
                shrink-0
                shadow-sm
              "
            >

              <ShieldCheck
                size={21}
                className="text-indigo-600"
              />

            </div>


            <div>

              <h3
                className="
                  font-black
                  text-slate-900
                "
              >
                Paiement sécurisé
              </h3>


              <p
                className="
                  text-sm
                  text-slate-600
                  mt-1
                  leading-6
                "
              >
                Conservez toujours votre preuve de paiement.
                Votre abonnement sera activé après vérification
                par l'administration.
              </p>

            </div>

          </div>

        </section>


        {/* ========================================================
            FOOTER
        ======================================================== */}

        <footer
          className="
            text-center
            py-8
          "
        >

          <div
            className="
              inline-flex
              items-center
              gap-2
            "
          >

            <div
              className="
                w-9
                h-9
                rounded-xl
                bg-indigo-600
                flex
                items-center
                justify-center
              "
            >

              <Crown
                size={18}
                className="text-white"
              />

            </div>


            <span
              className="
                font-black
                text-slate-900
              "
            >
              Biso-Commerce
            </span>

          </div>


          <p
            className="
              text-sm
              font-bold
              text-indigo-600
              mt-3
            "
          >
            IDI HEMEDI DIEUMERCI (PDG)
          </p>


          <p
            className="
              text-xs
              text-slate-400
              mt-1
            "
          >
            KINSHASA, RDC
          </p>


          <p
            className="
              text-xs
              text-slate-400
              mt-4
            "
          >
            Gestion simple • Rapide • Professionnelle 😊
          </p>

        </footer>

      </div>

    </main>

  );

}