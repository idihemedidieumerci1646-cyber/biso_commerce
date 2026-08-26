"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  Lock,
  Phone,
  KeyRound,
  Loader2,
  MessageCircle,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  WifiOff,
  X,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const [showReset, setShowReset] = useState(false);
  const [resetPhone, setResetPhone] = useState("");

  const [showPin, setShowPin] = useState(false);
  const [showConnectionModal, setShowConnectionModal] =
    useState(false);

  // ======================================================
  // CONNEXION INTERNET
  // ======================================================

  const requireConnection = () => {
    if (
      typeof navigator !== "undefined" &&
      !navigator.onLine
    ) {
      setShowConnectionModal(true);
      return false;
    }

    return true;
  };

  // ======================================================
  // CONNEXION
  // ======================================================

  const handleLogin = async () => {
    if (!requireConnection()) return;

    if (!phone.trim() || !pin.trim()) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = phone.trim();

      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .eq("phone", cleanPhone);

      if (error || !users?.length) {
        alert(
          "Cher client, vérifiez bien votre numéro et votre PIN."
        );
        return;
      }

      const user = users[0];

      const basePin = String(user.pin).replace(
        /\s+/g,
        ""
      );

      const saisiePin = String(pin).replace(
        /\s+/g,
        ""
      );

      if (basePin !== saisiePin) {
        alert("PIN incorrect.");
        return;
      }

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      const now = new Date();
      const end = new Date(sub?.end_date || 0);

      const isActive =
        sub?.is_active === true &&
        end > now;

      if (!sub || !isActive) {
        alert("Abonnement expiré.");
        router.replace("/subscription");
        return;
      }

      localStorage.setItem(
        "phone",
        cleanPhone
      );

      localStorage.setItem(
        "user_id",
        user.id
      );

      router.push("/dashboard");
    } catch (error) {
      console.error(error);

      alert(
        "Une erreur est survenue pendant la connexion."
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // RESET PIN
  // ======================================================

  const handleResetPassword = () => {
    if (!requireConnection()) return;

    if (!resetPhone.trim()) {
      alert("Veuillez entrer votre numéro.");
      return;
    }

    const message = encodeURIComponent(
      `Bonjour PDG, j'ai oublié mon PIN. Mon numéro est : ${resetPhone.trim()}`
    );

    window.open(
      `https://wa.me/243994864173?text=${message}`,
      "_blank"
    );
  };

  return (
    <>
      <main
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

        {/* ==================================================
            CONTENU
        ================================================== */}

        <div
          className="
            relative
            z-10
            flex
            w-full
            max-w-md
            items-center
            justify-center
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
                CARTE
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
                    <Lock size={25} />
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
                      <Sparkles size={13} />
                      Connexion sécurisée
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
                    Connexion
                  </h1>

                  <p
                    className="
                      mt-2
                      text-xs
                      leading-5
                      text-slate-400
                      sm:text-sm
                    "
                  >
                    Accédez à votre caisse digitale
                  </p>

                </div>
              </div>

              {/* ==================================================
                  FORMULAIRE
              ================================================== */}

              <div className="px-4 py-5 sm:px-6 sm:py-6">

                <div className="space-y-4">

                  {/* TÉLÉPHONE */}

                  <Field label="Numéro de téléphone">
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
                        className="
                          mr-3
                          shrink-0
                          text-orange-400
                        "
                      />

                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleLogin();
                          }
                        }}
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
                      <KeyRound
                        size={18}
                        className="
                          mr-3
                          shrink-0
                          text-orange-400
                        "
                      />

                      <input
                        type={
                          showPin
                            ? "text"
                            : "password"
                        }
                        inputMode="numeric"
                        autoComplete="current-password"
                        value={pin}
                        onChange={(e) =>
                          setPin(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleLogin();
                          }
                        }}
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

                  {/* CONNEXION */}

                  <button
                    type="button"
                    onClick={handleLogin}
                    disabled={loading}
                    className="
                      mt-1
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
                        Connexion...
                      </>
                    ) : (
                      <>
                        <Lock size={18} />
                        Se connecter
                      </>
                    )}
                  </button>

                  {/* MOT DE PASSE OUBLIÉ */}

                  <button
                    type="button"
                    onClick={() =>
                      setShowReset(!showReset)
                    }
                    className="
                      w-full
                      rounded-xl
                      px-3
                      py-2
                      text-center
                      text-xs
                      font-medium
                      text-slate-400
                      transition
                      hover:bg-white/5
                      hover:text-white
                    "
                  >
                    {showReset
                      ? "Fermer l'aide"
                      : "PIN oublié ?"}
                  </button>

                  {/* RESET */}

                  {showReset && (
                    <div
                      className="
                        overflow-hidden
                        rounded-2xl
                        border
                        border-white/10
                        bg-black/20
                        p-4
                      "
                    >
                      <div className="mb-3">
                        <p className="text-sm font-black text-white">
                          Récupérer votre PIN
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                          Entrez le numéro associé à
                          votre compte.
                        </p>
                      </div>

                      <div
                        className="
                          flex
                          min-h-[50px]
                          items-center
                          rounded-xl
                          border
                          border-white/10
                          bg-black/30
                          px-3
                        "
                      >
                        <Phone
                          size={17}
                          className="
                            mr-2.5
                            shrink-0
                            text-slate-500
                          "
                        />

                        <input
                          type="tel"
                          inputMode="tel"
                          value={resetPhone}
                          onChange={(e) =>
                            setResetPhone(
                              e.target.value
                            )
                          }
                          placeholder="Numéro du compte"
                          className="
                            min-w-0
                            flex-1
                            bg-transparent
                            py-3
                            text-[16px]
                            text-white
                            outline-none
                            placeholder:text-slate-600
                          "
                        />
                      </div>

                      <button
                        type="button"
                        onClick={
                          handleResetPassword
                        }
                        className="
                          mt-3
                          flex
                          min-h-[50px]
                          w-full
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          bg-[#25D366]
                          px-4
                          py-3
                          text-sm
                          font-black
                          text-white
                          transition
                          hover:brightness-105
                          active:scale-[0.99]
                        "
                      >
                        <MessageCircle size={18} />
                        WhatsApp Support
                      </button>
                    </div>
                  )}

                </div>

                {/* SÉCURITÉ */}

                <div
                  className="
                    mt-5
                    flex
                    items-center
                    justify-center
                    gap-2
                    border-t
                    border-white/10
                    pt-4
                    text-[11px]
                    text-slate-500
                  "
                >
                  <ShieldCheck
                    size={14}
                    className="text-orange-400"
                  />

                  Connexion protégée
                </div>

              </div>
            </section>

            {/* PETIT PIED */}

            <p className="mt-4 text-center text-[10px] text-slate-600">
              BISO-COMMERCE
            </p>

          </div>
        </div>
      </main>

      {/* ======================================================
          POPUP CONNEXION
      ====================================================== */}

      {showConnectionModal && (
        <div
          className="
            fixed
            inset-0
            z-[9999]
            flex
            items-center
            justify-center
            bg-black/75
            px-4
            backdrop-blur-md
          "
          onClick={() =>
            setShowConnectionModal(false)
          }
        >
          <div
            className="
              relative
              w-full
              max-w-sm
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-[#101a2b]
              shadow-2xl
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-yellow-400" />

            <button
              type="button"
              onClick={() =>
                setShowConnectionModal(false)
              }
              className="
                absolute
                right-4
                top-4
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-xl
                bg-white/5
                text-slate-400
                transition
                hover:bg-white/10
                hover:text-white
              "
              aria-label="Fermer"
            >
              <X size={18} />
            </button>

            <div className="p-6 text-center">
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
                  text-orange-400
                "
              >
                <WifiOff size={27} />
              </div>

              <h2 className="text-xl font-black text-white">
                Connexion requise
              </h2>

              <p
                className="
                  mt-3
                  text-sm
                  leading-6
                  text-slate-400
                "
              >
                Cette opération nécessite une
                connexion Internet.
              </p>

              <div
                className="
                  mt-4
                  rounded-2xl
                  border
                  border-orange-400/10
                  bg-orange-500/5
                  p-3
                  text-left
                "
              >
                <p className="text-xs leading-5 text-slate-300">
                  📡 Connectez votre téléphone à
                  Internet puis réessayez.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (
                    typeof navigator !==
                      "undefined" &&
                    navigator.onLine
                  ) {
                    setShowConnectionModal(
                      false
                    );
                    handleLogin();
                  }
                }}
                className="
                  mt-4
                  flex
                  min-h-[50px]
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-gradient-to-r
                  from-orange-500
                  to-yellow-400
                  px-4
                  py-3
                  text-sm
                  font-black
                  text-black
                  transition
                  active:scale-[0.99]
                "
              >
                <Sparkles size={17} />
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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