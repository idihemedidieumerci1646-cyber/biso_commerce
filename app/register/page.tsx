"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  Store,
  Phone,
  Lock,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
  Gift,
  CheckCircle2,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPin, setShowPin] = useState(false);

  const handleRegister = async () => {
    if (!businessName.trim() || !phone.trim() || !pin.trim()) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);

    try {
      const { data: user, error: userError } = await supabase
        .from("users")
        .insert({
          full_name: businessName.trim(),
          phone: phone.trim(),
          pin: pin.trim(),
        })
        .select()
        .single();

      if (userError || !user) {
        alert(
          "Erreur utilisateur : " +
            (userError?.message || "Impossible de créer le compte.")
        );
        return;
      }

      const startDate = new Date();
      const endDate = new Date();

      endDate.setDate(endDate.getDate() + 30);

      const { error: subError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: user.id,
          full_name: businessName.trim(),
          phone: phone.trim(),
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          is_active: true,
          status: "trial",
        });

      if (subError) {
        alert(
          "Erreur abonnement : " +
            subError.message
        );
        return;
      }

      localStorage.setItem(
        "phone",
        phone.trim()
      );

      localStorage.setItem(
        "user_id",
        user.id
      );

      alert(
        "Compte créé 🚀 30 jours gratuits activés."
      );

      router.push("/dashboard");
    } catch (error) {
      console.error(error);

      alert(
        "Une erreur est survenue pendant la création du compte."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-[#060d1b]
        px-3
        py-5
        text-white
        sm:px-5
        sm:py-8
      "
    >
      {/* ======================================================
          FOND
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0">
        <div
          className="
            absolute
            left-1/2
            top-0
            h-72
            w-72
            -translate-x-1/2
            rounded-full
            bg-orange-500/10
            blur-3xl
          "
        />

        <div
          className="
            absolute
            bottom-0
            right-0
            h-64
            w-64
            rounded-full
            bg-blue-500/10
            blur-3xl
          "
        />
      </div>

      <div
        className="
          relative
          z-10
          mx-auto
          flex
          min-h-[calc(100vh-40px)]
          w-full
          max-w-md
          items-center
          justify-center
          sm:min-h-[calc(100vh-64px)]
        "
      >
        <div className="w-full">
          {/* ==================================================
              RETOUR
          ================================================== */}

          <Link
            href="/"
            className="
              mb-4
              inline-flex
              items-center
              gap-2
              rounded-xl
              px-2
              py-2
              text-sm
              font-medium
              text-slate-400
              transition
              hover:bg-white/5
              hover:text-white
            "
          >
            <ArrowLeft size={16} />
            Retour
          </Link>

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
            {/* HEADER */}

            <div
              className="
                border-b
                border-white/10
                bg-gradient-to-br
                from-orange-500/10
                via-white/[0.02]
                to-transparent
                px-4
                py-5
                sm:px-6
                sm:py-6
              "
            >
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
                    bg-gradient-to-br
                    from-orange-500
                    to-yellow-400
                    text-black
                    shadow-lg
                    shadow-orange-500/20
                  "
                >
                  <Store size={25} />
                </div>

                <div className="mb-3 flex justify-center">
                  <span
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
                    <Gift size={13} />
                    30 jours gratuits
                  </span>
                </div>

                <h1
                  className="
                    text-2xl
                    font-black
                    tracking-tight
                    sm:text-3xl
                  "
                >
                  Créer un compte
                </h1>

                <p
                  className="
                    mx-auto
                    mt-2
                    max-w-sm
                    text-xs
                    leading-5
                    text-slate-400
                    sm:text-sm
                  "
                >
                  Lancez votre commerce digital rapidement
                  avec Biso-Commerce.
                </p>
              </div>
            </div>

            {/* FORMULAIRE */}

            <div className="px-4 py-5 sm:px-6 sm:py-6">
              <div className="space-y-4">
                {/* NOM */}

                <Field label="Nom du commerce">
                  <div
                    className="
                      flex
                      min-h-[52px]
                      items-center
                      rounded-2xl
                      border
                      border-white/10
                      bg-black/25
                      px-4
                      transition
                      focus-within:border-orange-400/40
                      focus-within:bg-black/35
                    "
                  >
                    <Store
                      size={18}
                      className="mr-3 shrink-0 text-orange-400"
                    />

                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) =>
                        setBusinessName(
                          e.target.value
                        )
                      }
                      placeholder="Ex. Boutique Amani"
                      className="
                        min-w-0
                        flex-1
                        bg-transparent
                        py-3.5
                        text-[16px]
                        text-white
                        outline-none
                        placeholder:text-slate-600
                      "
                    />
                  </div>
                </Field>

                {/* TELEPHONE */}

                <Field label="Téléphone">
                  <div
                    className="
                      flex
                      min-h-[52px]
                      items-center
                      rounded-2xl
                      border
                      border-white/10
                      bg-black/25
                      px-4
                      transition
                      focus-within:border-orange-400/40
                      focus-within:bg-black/35
                    "
                  >
                    <Phone
                      size={18}
                      className="mr-3 shrink-0 text-orange-400"
                    />

                    <input
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value)
                      }
                      placeholder="XXXXXXXXXX"
                      className="
                        min-w-0
                        flex-1
                        bg-transparent
                        py-3.5
                        text-[16px]
                        text-white
                        outline-none
                        placeholder:text-slate-600
                      "
                    />
                  </div>
                </Field>

                {/* PIN */}

                <Field label="Code PIN">
                  <div
                    className="
                      flex
                      min-h-[52px]
                      items-center
                      rounded-2xl
                      border
                      border-white/10
                      bg-black/25
                      px-4
                      transition
                      focus-within:border-orange-400/40
                      focus-within:bg-black/35
                    "
                  >
                    <Lock
                      size={18}
                      className="mr-3 shrink-0 text-orange-400"
                    />

                    <input
                      type={
                        showPin
                          ? "text"
                          : "password"
                      }
                      inputMode="numeric"
                      value={pin}
                      onChange={(e) =>
                        setPin(e.target.value)
                      }
                      placeholder="••••"
                      className="
                        min-w-0
                        flex-1
                        bg-transparent
                        py-3.5
                        text-[16px]
                        text-white
                        outline-none
                        placeholder:text-slate-600
                      "
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPin(!showPin)
                      }
                      className="
                        ml-2
                        shrink-0
                        rounded-xl
                        p-2
                        text-slate-500
                        transition
                        hover:bg-white/5
                        hover:text-white
                      "
                      aria-label={
                        showPin
                          ? "Masquer le PIN"
                          : "Afficher le PIN"
                      }
                    >
                      {showPin ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </Field>

                {/* AVANTAGES */}

                <div
                  className="
                    grid
                    grid-cols-2
                    gap-2
                  "
                >
                  <Benefit>
                    <CheckCircle2
                      size={15}
                      className="shrink-0 text-green-400"
                    />
                    30 jours gratuits
                  </Benefit>

                  <Benefit>
                    <ShieldCheck
                      size={15}
                      className="shrink-0 text-blue-400"
                    />
                    Sans carte bancaire
                  </Benefit>
                </div>

                {/* BOUTON */}

                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={loading}
                  className="
                    mt-2
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
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={19}
                        className="animate-spin"
                      />
                      Création du compte...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Créer mon compte
                    </>
                  )}
                </button>
              </div>

              {/* FOOTER INTERNE */}

              <div
                className="
                  mt-5
                  border-t
                  border-white/10
                  pt-4
                  text-center
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2
                    text-[11px]
                    text-slate-400
                  "
                >
                  <ShieldCheck
                    size={14}
                    className="text-orange-400"
                  />

                  Vos données restent associées
                  à votre compte.
                </div>

                <p className="mt-2 text-[10px] text-slate-600">
                  30 jours gratuits • Aucun paiement
                  pendant l'essai
                </p>
              </div>
            </div>
          </section>

          {/* SIGNATURE */}

          <p className="mt-4 text-center text-[10px] text-slate-600">
            BISO-COMMERCE
          </p>
        </div>
      </div>
    </main>
  );
}

/* ======================================================
   CHAMP
====================================================== */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        className="
          mb-2
          block
          text-[11px]
          font-black
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </label>

      {children}
    </div>
  );
}

/* ======================================================
   AVANTAGE
====================================================== */

function Benefit({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        flex
        min-w-0
        items-center
        gap-2
        rounded-2xl
        border
        border-white/10
        bg-black/20
        px-3
        py-3
        text-[10px]
        font-bold
        text-slate-300
        sm:text-[11px]
      "
    >
      {children}
    </div>
  );
}