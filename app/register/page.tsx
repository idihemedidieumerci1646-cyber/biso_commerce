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

              <Store
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
                border-green-200
                bg-green-50
                px-4
                py-2
                text-xs
                font-bold
                text-green-600
                "
              >

                <Gift size={14}/>

                30 jours gratuits

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

              Créer un compte

            </h1>



            <p
              className="
              mt-2
              text-sm
              leading-6
              text-slate-500
              "
            >

              Lancez votre commerce digital en quelques secondes

            </p>



          </div>






          {/* =====================================================
              FORM
          ===================================================== */}

          <div className="mt-8 space-y-5">





            {/* =================================================
                BUSINESS
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

                NOM COMPLET


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

                  <Store
                    size={18}
                    className="text-indigo-600"
                  />

                </div>


                <input

                  type="text"

                  placeholder="Ex: Dieumerci idi"

                  value={businessName}

                  onChange={(e)=>setBusinessName(e.target.value)}

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

                TÉLÉPHONE

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
                    size={18}
                    className="text-indigo-600"
                  />

                </div>


                <input

                  type="tel"

                  placeholder="XXXXXXXXXX"

                  value={phone}

                  onChange={(e)=>setPhone(e.target.value)}

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

                  <Lock
                    size={18}
                    className="text-indigo-600"
                  />

                </div>



                <input

                  type={showPin ? "text" : "password"}

                  placeholder="••••"

                  value={pin}

                  onChange={(e)=>setPin(e.target.value)}

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




                <button

                  type="button"

                  onClick={()=>setShowPin(!showPin)}

                  className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  text-slate-400
                  transition
                  hover:bg-indigo-50
                  hover:text-indigo-600
                  "

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









            {/* =================================================
                BUTTON
            ================================================= */}



            <button

              onClick={handleRegister}

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

                loading

                ?

                <>

                  <Loader2
                    className="animate-spin"
                    size={19}
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









          {/* =====================================================
              INFORMATIONS ESSAI
          ===================================================== */}


          <div
            className="
            mt-7
            space-y-3
            border-t
            border-slate-100
            pt-6
            "
          >


            <div
              className="
              flex
              items-center
              justify-center
              gap-2
              text-center
              text-xs
              font-semibold
              text-slate-600
              "
            >

              <div
                className="
                flex
                h-7
                w-7
                shrink-0
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

              Aucun paiement nécessaire pendant l'essai

            </div>



            <p
              className="
              text-center
              text-xs
              text-slate-400
              "
            >

              30 jours gratuits • Sans carte bancaire

            </p>


          </div>




        </div>


      </div>


    </main>

  );
}