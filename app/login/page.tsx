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

    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060d1b] px-6 text-white">


      {/* LIGHTS */}

      <div className="absolute inset-0">

        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-orange-500/20 blur-[160px]" />

        <div className="absolute bottom-0 right-0 h-[350px] w-[350px] rounded-full bg-blue-600/20 blur-[130px]" />

        <div className="absolute left-0 top-1/3 h-[300px] w-[300px] rounded-full bg-purple-600/20 blur-[120px]" />

      </div>



      <div className="relative z-10 w-full max-w-md">


        <Link
          href="/"
          className="mb-6 flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft size={16}/>
          Retour
        </Link>



        <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-8 shadow-2xl backdrop-blur-2xl">



          {/* HEADER */}

          <div className="text-center">


            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-400 shadow-lg shadow-orange-500/30">

              <Lock className="text-black" size={30}/>

            </div>



            <div className="mb-3 flex justify-center">

              <span className="flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-xs text-orange-300">

                <Sparkles size={14}/>
                Connexion sécurisée

              </span>

            </div>


            <h1 className="text-3xl font-black">

              Connexion

            </h1>


            <p className="mt-2 text-sm text-slate-400">

              Accédez à votre caisse digitale

            </p>


          </div>




          {/* FORM */}

          <div className="mt-8 space-y-5">


            {/* PHONE */}

            <div>

              <label className="mb-2 block text-xs text-slate-400">
                NUMÉRO DE TÉLÉPHONE
              </label>


              <div className="flex items-center rounded-2xl border border-white/10 bg-black/30 px-4">

                <Phone className="text-orange-400" size={18}/>


                <input

                  type="tel"

                  value={phone}

                  onChange={(e)=>setPhone(e.target.value)}

                  placeholder="XXXXXXXXXX"

                  className="w-full bg-transparent p-4 text-white outline-none placeholder:text-slate-600"

                />

              </div>

            </div>




            {/* PIN */}

            <div>

              <label className="mb-2 block text-xs text-slate-400">
                CODE PIN
              </label>


              <div className="flex items-center rounded-2xl border border-white/10 bg-black/30 px-4">

                <KeyRound className="text-orange-400" size={18}/>


                <input

                  type="password"

                  value={pin}

                  onChange={(e)=>setPin(e.target.value)}

                  placeholder="••••"

                  className="w-full bg-transparent p-4 text-white outline-none placeholder:text-slate-600"

                />

              </div>

            </div>




            {/* BUTTON */}

            <button

              onClick={handleLogin}

              disabled={loading}

              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 p-4 font-bold text-black transition hover:scale-[1.02] disabled:opacity-50"

            >

              {
                loading ?

                <>
                  <Loader2 className="animate-spin" size={18}/>
                  Connexion...
                </>

                :

                <>
                  <Lock size={18}/>
                  Se connecter
                </>
              }

            </button>



            <button

              onClick={()=>setShowReset(!showReset)}

              className="w-full text-center text-xs text-slate-400 underline"

            >

              Mot de passe oublié ?

            </button>




            {showReset && (

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">


                <input

                  type="tel"

                  value={resetPhone}

                  onChange={(e)=>setResetPhone(e.target.value)}

                  placeholder="Numéro du compte"

                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white outline-none"

                />



                <button

                  onClick={handleResetPassword}

                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 font-bold transition hover:bg-blue-700"

                >

                  <MessageCircle size={17}/>

                  WhatsApp Support

                </button>


              </div>

            )}



          </div>



          <div className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-400">

            <ShieldCheck size={15} className="text-orange-400"/>

            Connexion protégée

          </div>


        </div>


      </div>


    </main>

  );
}