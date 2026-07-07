"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";


export default function SubscriptionPage() {


  const [subscription, setSubscription] = useState<any>(null);

  const [daysUsed, setDaysUsed] = useState(0);
  const [daysLeft, setDaysLeft] = useState(30);

  const [status, setStatus] = useState<
    "active" | "expired" | "pending"
  >("active");


  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");


  const [step, setStep] =
    useState<"form" | "confirm">("form");




  useEffect(() => {

    loadSubscription();

  }, []);





  const loadSubscription = async () => {


    const phoneStorage =
      localStorage.getItem("phone");


    if (!phoneStorage) return;



    const { data:user } =
      await supabase
      .from("users")
      .select("id")
      .eq("phone", phoneStorage)
      .single();



    if (!user) return;




    const { data } =
      await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order(
        "created_at",
        {
          ascending:false
        }
      )
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



    if(start){


      const diff =
        now.getTime()
        -
        start.getTime();



      const days =
        Math.floor(
          diff /
          (
            1000 *
            60 *
            60 *
            24
          )
        );



      used =
        days < 0
        ? 0
        : days;


    }




    const left =
      Math.max(
        0,
        30 - used
      );



    setDaysUsed(used);
    setDaysLeft(left);





    const trialActive =
      data.status === "trial"
      &&
      new Date(
        data.trial_end || 0
      ) > now;




    const active =
      data.is_active === true
      &&
      left > 0;



    const pending =
      data.status === "pending";





    if(pending){

      setStatus("pending");

    }
    else if(trialActive || active){

      setStatus("active");

    }
    else{

      setStatus("expired");

    }



  };







  const handleRenew = async () => {



    if(!fullName || !phone){

      alert(
        "Veuillez remplir votre nom et numéro de téléphone"
      );

      return;

    }




    const phoneStorage =
      localStorage.getItem("phone");



    if(!phoneStorage) return;





    const { data:user } =
      await supabase
      .from("users")
      .select("id")
      .eq(
        "phone",
        phoneStorage
      )
      .single();





    if(
      !user
      ||
      !subscription?.id
    )
      return;






    await supabase
    .from("subscriptions")
    .update({

      full_name:
      fullName,


      phone:
      phone,


      status:
      "pending",


      user_id:
      user.id

    })
    .eq(
      "id",
      subscription.id
    )
    .eq(
      "user_id",
      user.id
    );





    setStatus("pending");


    setStep("confirm");



  };

    return (

    <main
      className="
      min-h-screen
      px-4
      py-8
      text-white
      bg-gradient-to-b
      from-black
      via-slate-950
      to-black
      relative
      overflow-hidden
      "
    >


      {/* HALOS LUMINEUX */}

      <div
        className="
        absolute
        -top-20
        -left-20
        w-80
        h-80
        rounded-full
        bg-orange-500/20
        blur-3xl
        "
      />


      <div
        className="
        absolute
        top-40
        right-0
        w-96
        h-96
        rounded-full
        bg-blue-500/20
        blur-3xl
        "
      />




      <div
        className="
        max-w-2xl
        mx-auto
        space-y-6
        relative
        z-10
        "
      >




        {/* HEADER */}


        <div
          className="
          bg-white/5
          backdrop-blur-xl
          border
          border-white/10
          rounded-3xl
          p-6
          text-center
          shadow-xl
          "
        >


          <div
            className="
            text-5xl
            mb-3
            "
          >
            💳
          </div>



          <h1
            className="
            text-3xl
            font-black
            "
          >
            Mon abonnement
          </h1>



          <p
            className="
            text-slate-400
            text-sm
            mt-2
            "
          >
            Gestion de votre accès Biso-Commerce
          </p>


        </div>





        {/* STATUS CARD */}


        <div
          className="
          bg-white/5
          backdrop-blur-xl
          border
          border-white/10
          rounded-3xl
          p-6
          text-center
          shadow-xl
          "
        >



          <p
            className="
            text-slate-400
            text-sm
            "
          >
            Statut actuel
          </p>




          <h2

            className={`
            text-3xl
            font-black
            mt-3

            ${
              status === "active"
              ? "text-green-400"
              :
              status === "pending"
              ? "text-yellow-400"
              :
              "text-red-400"
            }

            `}

          >


            {
              status === "active"
              ?
              "🟢 Actif"

              :

              status === "pending"
              ?

              "⏳ Validation"

              :

              "🔴 Expiré"
            }


          </h2>




          <p
            className="
            text-xs
            text-slate-500
            mt-3
            "
          >

            Votre accès Biso-Commerce

          </p>



        </div>





        {/* UTILISATION */}



        <div
          className="
          bg-white/5
          backdrop-blur-xl
          border
          border-white/10
          rounded-3xl
          p-6
          shadow-xl
          "
        >



          <div
            className="
            flex
            justify-between
            items-center
            "
          >


            <h3
              className="
              font-bold
              "
            >

              📅 Utilisation

            </h3>



            <span
              className="
              text-green-400
              font-bold
              "
            >

              {daysLeft} jours

            </span>


          </div>





          <div
            className="
            mt-5
            h-3
            bg-slate-800
            rounded-full
            overflow-hidden
            "
          >


            <div

              className="
              h-full
              bg-gradient-to-r
              from-orange-500
              to-green-500
              rounded-full
              "

              style={{
                width:
                `${Math.min(
                  100,
                  (daysUsed / 30) * 100
                )}%`
              }}

            />

          </div>




          <p
            className="
            text-slate-400
            text-sm
            mt-3
            "
          >

            {daysUsed} / 30 jours utilisés

          </p>


        </div>
                {/* INFO ABONNEMENT */}
        <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-5 shadow-xl">

          <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/20 blur-3xl rounded-full" />

          <div className="relative">

            <h3 className="text-xl font-bold flex items-center gap-2">
              💎 Biso-Commerce Premium
            </h3>

            <p className="text-slate-400 text-sm mt-2">
              Un abonnement simple pour gérer votre commerce professionnellement.
            </p>


            <div className="mt-5 grid gap-3">

              <div className="flex items-center gap-3 bg-black/40 border border-slate-700 rounded-2xl p-3">
                <span className="text-2xl">📦</span>
                <div>
                  <p className="font-bold">Gestion produits</p>
                  <p className="text-xs text-slate-400">
                    Stock, prix et approvisionnement
                  </p>
                </div>
              </div>


              <div className="flex items-center gap-3 bg-black/40 border border-slate-700 rounded-2xl p-3">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="font-bold">Suivi des ventes</p>
                  <p className="text-xs text-slate-400">
                    Enregistrez chaque vente facilement
                  </p>
                </div>
              </div>


              <div className="flex items-center gap-3 bg-black/40 border border-slate-700 rounded-2xl p-3">
                <span className="text-2xl">🧾</span>
                <div>
                  <p className="font-bold">Gestion des dettes</p>
                  <p className="text-xs text-slate-400">
                    Suivez vos clients débiteurs
                  </p>
                </div>
              </div>


              <div className="flex items-center gap-3 bg-black/40 border border-slate-700 rounded-2xl p-3">
                <span className="text-2xl">📊</span>
                <div>
                  <p className="font-bold">Rapports financiers</p>
                  <p className="text-xs text-slate-400">
                    Analysez vos performances
                  </p>
                </div>
              </div>


              <div className="flex items-center gap-3 bg-black/40 border border-slate-700 rounded-2xl p-3">
                <span className="text-2xl">🚀</span>
                <div>
                  <p className="font-bold">Dashboard complet</p>
                  <p className="text-xs text-slate-400">
                    Vue globale de votre activité
                  </p>
                </div>
              </div>


            </div>


            <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-orange-500/20 to-blue-500/20 border border-orange-400/20">

              <p className="text-sm text-slate-300">
                Prix abonnement
              </p>

              <p className="text-3xl font-bold mt-1">
                5$
                <span className="text-sm text-slate-400">
                  {" "} / mois
                </span>
              </p>

            </div>

          </div>

        </div>



        {/* MOYENS DE PAIEMENT */}

        <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-5">

          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full" />


          <div className="relative">

            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              📱 Paiement Mobile Money
            </h3>


            <div className="space-y-3">


              <div className="bg-black/40 border border-slate-700 rounded-2xl p-4 flex justify-between items-center">

                <div>
                  <p className="font-bold">
                    🔴 Airtel Money
                  </p>

                  <p className="text-sm text-slate-400">
                    +243 994 864 173
                  </p>
                </div>

              </div>



              <div className="bg-black/40 border border-slate-700 rounded-2xl p-4 flex justify-between items-center">

                <div>
                  <p className="font-bold">
                    🟠 Orange Money
                  </p>

                  <p className="text-sm text-slate-400">
                    +243XXXXXXXX
                  </p>
                </div>

              </div>



              <div className="bg-black/40 border border-slate-700 rounded-2xl p-4 flex justify-between items-center">

                <div>
                  <p className="font-bold">
                    🔵 MPESA
                  </p>

                  <p className="text-sm text-slate-400">
                    +243XXXXXXXX
                  </p>
                </div>

              </div>


            </div>


          </div>


        </div>
                {/* FORMULAIRE RENOUVELLEMENT */}

        <div className="relative overflow-hidden bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-5">

          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-3xl rounded-full" />

          <div className="relative space-y-4">

            <h3 className="text-xl font-bold">
              🔄 Demande de renouvellement
            </h3>

            <p className="text-sm text-slate-400">
              Entrez vos informations après avoir effectué le paiement.
            </p>


            <input
              type="text"
              placeholder="👤 Nom complet"
              value={fullName}
              onChange={(e)=>setFullName(e.target.value)}
              className="
                w-full p-4 rounded-2xl
                bg-black/60
                border border-slate-700
                text-white
                placeholder:text-slate-500
                outline-none
                focus:border-orange-400
              "
              style={{
                color:"#fff",
                WebkitTextFillColor:"#fff",
                caretColor:"#fff"
              }}
            />


            <input
              type="tel"
              placeholder="📱 Numéro téléphone"
              value={phone}
              onChange={(e)=>setPhone(e.target.value)}
              className="
                w-full p-4 rounded-2xl
                bg-black/60
                border border-slate-700
                text-white
                placeholder:text-slate-500
                outline-none
                focus:border-blue-400
              "
              style={{
                color:"#fff",
                WebkitTextFillColor:"#fff",
                caretColor:"#fff"
              }}
            />



            <button
              onClick={handleRenew}
              className="
                w-full
                p-4
                rounded-2xl
                font-bold
                bg-gradient-to-r
                from-orange-500
                to-blue-600
                hover:opacity-90
                transition
                shadow-lg
              "
            >
              🚀 Envoyer ma demande
            </button>


          </div>

        </div>




        {/* CONFIRMATION WHATSAPP */}

        {step === "confirm" && (

          <div className="
            bg-yellow-500/10
            border
            border-yellow-500/30
            rounded-3xl
            p-5
            space-y-4
          ">


            <h3 className="text-xl font-bold text-yellow-300">
              📸 Dernière étape
            </h3>


            <p className="text-sm text-yellow-200">
              Votre demande a été envoyée.
              Envoyez maintenant la preuve du paiement.
            </p>



            <div className="
              bg-black/40
              rounded-2xl
              p-4
              text-sm
              space-y-2
            ">

              <p>
                ✅ Capture écran du paiement
              </p>

              <p>
                ✅ Preuve Mobile Money
              </p>

  

            </div>



            <button

              onClick={()=>{

                const message = `Bonjour PDG,

Je viens de payer mon renouvellement Biso-Commerce.

Nom : ${fullName}

Téléphone : ${phone}

Je vous envoie la preuve de paiement.`;

                const url =
                "https://wa.me/243994864173?text="
                + encodeURIComponent(message);


                window.open(url,"_blank");

              }}

              className="
                w-full
                p-4
                rounded-2xl
                font-bold
                bg-green-600
                hover:bg-green-500
                transition
              "

            >

              📲 Envoyer la preuve WhatsApp

            </button>


          </div>

        )}






        {/* STATUS PENDING */}

        {status === "pending" && (

          <div
            className="
            bg-yellow-500/10
            border
            border-yellow-500/30
            rounded-2xl
            p-4
            text-yellow-300
            text-center
            "
          >

            ⏳ Votre paiement est en cours de vérification.

          </div>

        )}



      </div>

    </main>

  );

}