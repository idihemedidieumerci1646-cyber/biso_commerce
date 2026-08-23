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
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const [showReset, setShowReset] = useState(false);
  const [resetPhone, setResetPhone] = useState("");

  const handleLogin = async () => {
    if (!phone || !pin) {
      alert("Veuillez remplir tous les champs");
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
        alert("Cher client vérifie bien votre numéro et votre PIN");
        return;
      }

      const user = users[0];

      const basePin = String(user.pin).replace(/\s+/g, "");
      const saisiePin = String(pin).replace(/\s+/g, "");

      if (basePin !== saisiePin) {
        alert("PIN incorrect");
        return;
      }


      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();


      const now = new Date();
      const end = new Date(sub?.end_date || 0);

      const isActive =
        sub?.is_active === true && end > now;


      if (!sub || !isActive) {
        alert("Abonnement expiré");
        router.replace("/subscription");
        return;
      }


      localStorage.setItem("phone", cleanPhone);
      localStorage.setItem("user_id", user.id);


      router.push("/dashboard");


    } finally {
      setLoading(false);
    }
  };


  const handleResetPassword = () => {

    if (!resetPhone) {
      alert("Veuillez entrer votre numéro");
      return;
    }

    const message = encodeURIComponent(
      `Bonjour PDG j'ai oublié mon pin. Mon numéro est : ${resetPhone}`
    );


    window.open(
      `https://wa.me/243994864173?text=${message}`,
      "_blank"
    );

  };


  return (

    <main
      className="
      min-h-screen
      bg-[#f5f7fb]
      px-4
      py-8
      text-slate-900
      sm:px-6
      "
    >


      <div
        className="
        mx-auto
        w-full
        max-w-md
        "
      >


        {/* =====================================================
            RETOUR
        ===================================================== */}

        <Link
          href="/"
          className="
          mb-5
          inline-flex
          items-center
          gap-2
          rounded-xl
          px-2
          py-2
          text-sm
          font-semibold
          text-slate-500
          transition
          hover:bg-white
          hover:text-indigo-600
          "
        >

          <ArrowLeft size={16}/>

          Retour

        </Link>



        {/* =====================================================
            CARTE PRINCIPALE
        ===================================================== */}

        <div
          className="
          rounded-[26px]
          border
          border-slate-200
          bg-white
          p-6
          shadow-[0_10px_35px_rgba(15,23,42,0.06)]
          sm:p-8
          "
        >



          {/* =====================================================
              HEADER
          ===================================================== */}

          <div className="text-center">


            <div
              className="
              mx-auto
              mb-5
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-2xl
              bg-indigo-50
              "
            >

              <Lock
                className="text-indigo-600"
                size={30}
              />

            </div>



            <div className="mb-4 flex justify-center">

              <span
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
                text-indigo-600
                "
              >

                <Sparkles size={14}/>

                Connexion sécurisée

              </span>

            </div>


            <h1
              className="
              text-2xl
              font-black
              tracking-tight
              text-slate-900
              sm:text-3xl
              "
            >

              Connexion

            </h1>


            <p
              className="
              mt-2
              text-sm
              leading-6
              text-slate-500
              "
            >

              Accédez à votre caisse digitale

            </p>


          </div>




          {/* =====================================================
              FORM
          ===================================================== */}

          <div className="mt-8 space-y-5">


            {/* =================================================
                PHONE
            ================================================= */}

            <div>

              <label
                className="
                mb-2
                block
                text-xs
                font-bold
                uppercase
                tracking-wide
                text-slate-500
                "
              >
                NUMÉRO DE TÉLÉPHONE
              </label>


              <div
                className="
                flex
                items-center
                rounded-2xl
                border
                border-slate-200
                bg-slate-50
                px-4
                transition
                focus-within:border-indigo-400
                focus-within:bg-white
                focus-within:ring-4
                focus-within:ring-indigo-50
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
                    className="text-indigo-600"
                    size={18}
                  />

                </div>


                <input

                  type="tel"

                  value={phone}

                  onChange={(e)=>setPhone(e.target.value)}

                  placeholder="XXXXXXXXXX"

                  className="
                  w-full
                  bg-transparent
                  p-4
                  text-sm
                  font-medium
                  text-slate-900
                  outline-none
                  placeholder:text-slate-400
                  "

                />

              </div>

            </div>




            {/* =================================================
                PIN
            ================================================= */}

            <div>

              <label
                className="
                mb-2
                block
                text-xs
                font-bold
                uppercase
                tracking-wide
                text-slate-500
                "
              >
                CODE PIN
              </label>


              <div
                className="
                flex
                items-center
                rounded-2xl
                border
                border-slate-200
                bg-slate-50
                px-4
                transition
                focus-within:border-indigo-400
                focus-within:bg-white
                focus-within:ring-4
                focus-within:ring-indigo-50
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

                  <KeyRound
                    className="text-indigo-600"
                    size={18}
                  />

                </div>


                <input

                  type="password"

                  value={pin}

                  onChange={(e)=>setPin(e.target.value)}

                  placeholder="••••"

                  className="
                  w-full
                  bg-transparent
                  p-4
                  text-sm
                  font-medium
                  text-slate-900
                  outline-none
                  placeholder:text-slate-400
                  "

                />

              </div>

            </div>




            {/* =================================================
                BUTTON
            ================================================= */}

            <button

              onClick={handleLogin}

              disabled={loading}

              className="
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              bg-indigo-600
              p-4
              font-black
              text-white
              shadow-[0_8px_20px_rgba(79,70,229,0.18)]
              transition
              hover:bg-indigo-700
              active:scale-[0.99]
              disabled:cursor-not-allowed
              disabled:opacity-50
              "

            >

              {
                loading ?

                <>
                  <Loader2
                    className="animate-spin"
                    size={18}
                  />
                  Connexion...
                </>

                :

                <>
                  <Lock size={18}/>
                  Se connecter
                </>
              }

            </button>



            {/* =================================================
                RESET PASSWORD
            ================================================= */}

            <button

              onClick={()=>setShowReset(!showReset)}

              className="
              w-full
              rounded-xl
              py-2
              text-center
              text-xs
              font-semibold
              text-slate-500
              underline
              decoration-slate-300
              underline-offset-4
              transition
              hover:text-indigo-600
              "

            >

              Mot de passe oublié ?

            </button>




            {showReset && (

              <div
                className="
                space-y-3
                rounded-2xl
                border
                border-slate-200
                bg-slate-50
                p-4
                "
              >


                <div
                  className="
                  flex
                  h-9
                  items-center
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-3
                  "
                >

                  <Phone
                    size={16}
                    className="text-slate-400"
                  />

                  <input

                    type="tel"

                    value={resetPhone}

                    onChange={(e)=>setResetPhone(e.target.value)}

                    placeholder="Numéro du compte"

                    className="
                    w-full
                    bg-transparent
                    p-3
                    text-sm
                    text-slate-900
                    outline-none
                    placeholder:text-slate-400
                    "

                  />

                </div>



                <button

                  onClick={handleResetPassword}

                  className="
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-green-600
                  p-3
                  font-bold
                  text-white
                  transition
                  hover:bg-green-700
                  "

                >

                  <MessageCircle size={17}/>

                  WhatsApp Support

                </button>


              </div>

            )}



          </div>



          {/* =====================================================
              SÉCURITÉ
          ===================================================== */}

          <div
            className="
            mt-7
            flex
            items-center
            justify-center
            gap-2
            border-t
            border-slate-100
            pt-6
            text-xs
            font-semibold
            text-slate-500
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
              bg-green-50
              "
            >

              <ShieldCheck
                size={15}
                className="text-green-600"
              />

            </div>

            Connexion protégée

          </div>


        </div>


      </div>


    </main>

  );
}