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
} from "lucide-react";


export default function RegisterPage() {

  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPin, setShowPin] = useState(false);



  const handleRegister = async () => {

    if (!businessName || !phone || !pin) {
      alert("Veuillez remplir tous les champs");
      return;
    }


    setLoading(true);


    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        full_name: businessName,
        phone: phone,
        pin: pin,
      })
      .select()
      .single();



    if (userError || !user) {

      alert("Erreur utilisateur : " + userError?.message);
      setLoading(false);
      return;

    }




    const startDate = new Date();

    const endDate = new Date();

    endDate.setDate(endDate.getDate() + 30);




    const { error: subError } = await supabase
      .from("subscriptions")
      .insert({

        user_id: user.id,

        full_name: businessName,

        phone: phone,

        start_date: startDate.toISOString(),

        end_date: endDate.toISOString(),

        is_active: true,

        status: "trial",

      });



    if (subError) {

      alert("Erreur abonnement : " + subError.message);

      setLoading(false);

      return;

    }



    alert("Compte créé 🚀 30 jours gratuits activés");


    localStorage.setItem("phone", phone);

    localStorage.setItem("user_id", user.id);



    setLoading(false);


    router.push("/dashboard");

  };




  return (

    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060d1b] px-6 text-white">



      {/* BACKGROUND */}

      
<div className="absolute inset-0 bg-[#060d1b]" />





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



            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-400 shadow-xl shadow-orange-500/30">

              <Store className="text-black" size={30}/>

            </div>





            <div className="mb-3 flex justify-center">

              <span className="flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-xs text-orange-300">

                <Gift size={14}/>

                30 jours gratuits

              </span>


            </div>





            <h1 className="text-3xl font-black">

              Créer un compte

            </h1>



            <p className="mt-2 text-sm text-slate-400">

              Lancez votre commerce digital en quelques secondes

            </p>



          </div>






          {/* FORM */}


          <div className="mt-8 space-y-5">





            {/* BUSINESS */}


            <div>


              <label className="mb-2 block text-xs text-slate-400">

                NOM DU COMMERCE

              </label>



              <div className="flex items-center rounded-2xl border border-white/10 bg-black/30 px-4">


                <Store
                  size={18}
                  className="text-orange-400"
                />


                <input

                  type="text"

                  placeholder="Ex: Boutique Amani"

                  value={businessName}

                  onChange={(e)=>setBusinessName(e.target.value)}

                  className="w-full bg-transparent p-4 text-white outline-none placeholder:text-slate-600"

                />


              </div>


            </div>







            {/* PHONE */}



            <div>


              <label className="mb-2 block text-xs text-slate-400">

                TÉLÉPHONE

              </label>



              <div className="flex items-center rounded-2xl border border-white/10 bg-black/30 px-4">


                <Phone
                  size={18}
                  className="text-orange-400"
                />


                <input

                  type="tel"

                  placeholder="XXXXXXXXXX"

                  value={phone}

                  onChange={(e)=>setPhone(e.target.value)}

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


                <Lock
                  size={18}
                  className="text-orange-400"
                />



                <input

                  type={showPin ? "text" : "password"}

                  placeholder="••••"

                  value={pin}

                  onChange={(e)=>setPin(e.target.value)}

                  className="w-full bg-transparent p-4 text-white outline-none placeholder:text-slate-600"

                />




                <button

                  type="button"

                  onClick={()=>setShowPin(!showPin)}

                  className="text-slate-400 hover:text-white"

                >

                  {
                    showPin
                    ?
                    <EyeOff size={18}/>
                    :
                    <Eye size={18}/>
                  }


                </button>



              </div>


            </div>







            {/* BUTTON */}



            <button

              onClick={handleRegister}

              disabled={loading}

              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 p-4 font-bold text-black transition hover:scale-[1.02] disabled:opacity-50"

            >


              {

                loading

                ?

                <>

                  <Loader2
                    className="animate-spin"
                  />

                  Création...

                </>


                :

                <>

                  <Sparkles size={18}/>

                  Créer mon compte

                </>

              }


            </button>




          </div>







          <div className="mt-7 space-y-3 border-t border-white/10 pt-6 text-sm text-slate-300">


            <div className="flex items-center justify-center gap-2 text-xs">

              <ShieldCheck
                size={15}
                className="text-orange-400"
              />

              Aucun paiement nécessaire pendant l'essai

            </div>



            <p className="text-center text-xs text-slate-500">

              30 jours gratuits • Sans carte bancaire

            </p>


          </div>




        </div>


      </div>


    </main>

  );
}