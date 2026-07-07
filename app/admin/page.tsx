"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Subscription = {
  id: string;
  full_name: string;
  phone: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  status: string;
  created_at: string;
};


export default function AdminPage() {

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [renewRequests, setRenewRequests] = useState<Subscription[]>([]);
  const [activeClients, setActiveClients] = useState<Subscription[]>([]);
  const [expiredClients, setExpiredClients] = useState<Subscription[]>([]);

  const [totalRevenue, setTotalRevenue] = useState(0);



  useEffect(() => {
    checkAdmin();
    loadData();
  }, []);



  const checkAdmin = async () => {

    const phone = localStorage.getItem("phone");


    if (!phone) {

      window.location.href="/login";
      return;

    }


    const {data:user}=await supabase
      .from("users")
      .select("is_admin")
      .eq("phone",phone)
      .single();



    if(!user?.is_admin){

      window.location.href="/dashboard";

    }

  };



  const loadData = async()=>{


    setLoading(true);



    const {data:subs,error}=await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at",{ascending:false});



    if(error){

      console.log(error);
      setLoading(false);
      return;

    }




    const {data:payments}=await supabase
      .from("subscription_payments")
      .select("*");



    let revenue=0;



    payments?.forEach((p:any)=>{

      revenue+=Number(p.amount || 0);

    });



    const now=new Date();


    const data=(subs as Subscription[]) || [];



    const active=data.filter((s)=>{

      if(!s.end_date) return false;

      return s.is_active && new Date(s.end_date)>now;

    });



    const expired=data.filter((s)=>{

      if(!s.end_date) return true;

      return new Date(s.end_date)<now;

    });



    const requests=data.filter(
      (s)=>s.status==="pending"
    );



    setSubscriptions(data);

    setActiveClients(active);

    setExpiredClients(expired);

    setRenewRequests(requests);

    setTotalRevenue(revenue);



    setLoading(false);


  };
    const activateSubscription = async (client: Subscription) => {

    const confirmAction = confirm(
      "Activer l'abonnement de " + client.full_name + " ?"
    );


    if(!confirmAction) return;



    const start = new Date();

    const end = new Date();

    end.setDate(end.getDate()+30);



    const {error}=await supabase
      .from("subscriptions")
      .update({

        is_active:true,

        status:"active",

        start_date:start.toISOString(),

        end_date:end.toISOString(),

      })
      .eq("id",client.id);



    if(error){

      alert(error.message);
      return;

    }




    const {error:paymentError}=await supabase
      .from("subscription_payments")
      .insert({

        phone:client.phone,

        full_name:client.full_name,

        amount:5,

      });



    if(paymentError){

      alert(paymentError.message);

      return;

    }



    await loadData();


  };





  const deleteRequest = async(client:Subscription)=>{


    const confirmDelete=confirm(
      "Refuser la demande de "+client.full_name+" ?"
    );



    if(!confirmDelete)return;



    const {error}=await supabase
      .from("subscriptions")
      .update({

        status:"rejected",

        is_active:false,

      })
      .eq("id",client.id);



    if(error){

      alert(error.message);

      return;

    }



    await loadData();


  };





  const filteredRequests = renewRequests.filter((client)=>

    client.full_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase())

    ||

    client.phone.includes(searchTerm)

  );





  if(loading){

    return (

      <main className="
        min-h-screen
        bg-black
        text-white
        flex
        items-center
        justify-center
      ">

        <div className="
          bg-slate-900
          border
          border-slate-800
          rounded-2xl
          p-6
        ">

          ⏳ Chargement Admin...

        </div>


      </main>

    );

  }




  return (

    <main className="
      min-h-screen
      bg-black
      text-white
      p-4
      sm:p-6
      relative
      overflow-hidden
    ">


      <div className="
        absolute
        -top-40
        -right-40
        w-96
        h-96
        bg-blue-600/20
        blur-3xl
        rounded-full
      "/>



      <div className="
        absolute
        bottom-0
        left-0
        w-80
        h-80
        bg-orange-500/20
        blur-3xl
        rounded-full
      "/>



      <div className="
        max-w-6xl
        mx-auto
        space-y-6
        relative
        z-10
      ">


        {/* HEADER */}

        <div className="
          bg-slate-900/70
          backdrop-blur-xl
          border
          border-slate-700
          rounded-3xl
          p-6
        ">


          <h1 className="
            text-3xl
            font-bold
          ">

            👑 Admin Panel

          </h1>


          <p className="
            text-slate-400
            text-sm
            mt-2
          ">

            Gestion abonnements Biso-Commerce

          </p>


        </div>
                {/* STATISTIQUES */}

        <div className="
          grid
          md:grid-cols-3
          gap-4
        ">


          <div className="
            bg-slate-900/80
            backdrop-blur-xl
            border
            border-green-500/20
            rounded-3xl
            p-5
          ">

            <p className="text-slate-400 text-sm">
              💰 Revenus
            </p>

            <h2 className="
              text-3xl
              font-bold
              text-green-400
              mt-2
            ">
              {totalRevenue} $
            </h2>

          </div>



          <div className="
            bg-slate-900/80
            backdrop-blur-xl
            border
            border-blue-500/20
            rounded-3xl
            p-5
          ">

            <p className="text-slate-400 text-sm">
              👥 Clients actifs
            </p>


            <h2 className="
              text-3xl
              font-bold
              text-blue-400
              mt-2
            ">
              {activeClients.length}
            </h2>


          </div>




          <div className="
            bg-slate-900/80
            backdrop-blur-xl
            border
            border-red-500/20
            rounded-3xl
            p-5
          ">


            <p className="text-slate-400 text-sm">
              ❌ Expirés
            </p>


            <h2 className="
              text-3xl
              font-bold
              text-red-400
              mt-2
            ">
              {expiredClients.length}
            </h2>


          </div>



        </div>





        {/* RECHERCHE */}

        <div className="
          bg-slate-900/70
          backdrop-blur-xl
          border
          border-slate-800
          rounded-3xl
          p-5
        ">


          <input

            type="text"

            placeholder="🔎 Rechercher client ou téléphone..."

            value={searchTerm}

            onChange={(e)=>setSearchTerm(e.target.value)}

            className="
              w-full
              p-4
              rounded-2xl
              bg-black/60
              border
              border-slate-700
              text-white
              placeholder:text-slate-500
              outline-none
              focus:border-blue-500
            "

            style={{
              color:"#fff",
              WebkitTextFillColor:"#fff",
              caretColor:"#fff"
            }}

          />


        </div>






        {/* DEMANDES */}

        <div className="
          bg-slate-900/70
          backdrop-blur-xl
          border
          border-slate-800
          rounded-3xl
          p-5
        ">



          <div className="
            flex
            justify-between
            items-center
            mb-5
          ">


            <h2 className="
              text-xl
              font-bold
            ">

              📩 Demandes de renouvellement

            </h2>


            <span className="
              bg-yellow-500/20
              text-yellow-300
              px-3
              py-1
              rounded-full
              text-sm
            ">

              {filteredRequests.length}

            </span>


          </div>





          {filteredRequests.length===0 ? (

            <p className="
              text-slate-500
              text-center
              py-6
            ">

              Aucune demande

            </p>


          ) : (


            <div className="space-y-4">


              {filteredRequests.map((client)=>(


                <div

                  key={client.id}

                  className="
                    bg-black/40
                    border
                    border-slate-700
                    rounded-2xl
                    p-4
                    flex
                    flex-col
                    sm:flex-row
                    justify-between
                    gap-4
                  "

                >


                  <div>

                    <p className="
                      font-bold
                      text-lg
                    ">

                      {client.full_name}

                    </p>


                    <p className="
                      text-sm
                      text-slate-400
                    ">

                      📱 {client.phone}

                    </p>


                    <p className="
                      text-xs
                      text-yellow-400
                      mt-1
                    ">

                      ⏳ En attente

                    </p>


                  </div>
                                    <div className="
                    flex
                    gap-3
                    items-center
                  ">


                    <button

                      onClick={() => activateSubscription(client)}

                      className="
                        bg-gradient-to-r
                        from-green-500
                        to-emerald-600
                        px-4
                        py-2
                        rounded-xl
                        font-bold
                        text-sm
                        shadow-lg
                        hover:scale-105
                        transition
                      "

                    >

                      ✅ Activer

                    </button>




                    <button

                      onClick={() => deleteRequest(client)}

                      className="
                        bg-gradient-to-r
                        from-red-500
                        to-red-700
                        px-4
                        py-2
                        rounded-xl
                        font-bold
                        text-sm
                        shadow-lg
                        hover:scale-105
                        transition
                      "

                    >

                      ❌ Refuser

                    </button>



                  </div>



                </div>


              ))}



            </div>


          )}



        </div>






        {/* CLIENTS ACTIFS */}

        <div className="
          bg-slate-900/70
          backdrop-blur-xl
          border
          border-slate-800
          rounded-3xl
          p-5
        ">


          <h2 className="
            text-xl
            font-bold
            mb-4
          ">

            🟢 Clients actifs

          </h2>



          {activeClients.length === 0 ? (

            <p className="text-slate-500">
              Aucun client actif
            </p>


          ) : (


            <div className="space-y-3">


              {activeClients.map((client)=>(


                <div

                  key={client.id}

                  className="
                    bg-black/40
                    border
                    border-slate-700
                    rounded-2xl
                    p-4
                    flex
                    justify-between
                  "

                >

                  <div>

                    <p className="font-bold">
                      {client.full_name}
                    </p>


                    <p className="text-sm text-slate-400">
                      📱 {client.phone}
                    </p>

                  </div>



                  <div className="
                    text-green-400
                    text-sm
                    font-bold
                  ">

                    ACTIF

                  </div>



                </div>


              ))}



            </div>


          )}



        </div>







        {/* CLIENTS EXPIRÉS */}

        <div className="
          bg-slate-900/70
          backdrop-blur-xl
          border
          border-slate-800
          rounded-3xl
          p-5
        ">


          <h2 className="
            text-xl
            font-bold
            mb-4
          ">

            🔴 Clients expirés

          </h2>




          {expiredClients.length===0 ? (


            <p className="text-slate-500">
              Aucun abonnement expiré
            </p>


          ) : (


            <div className="space-y-3">


              {expiredClients.map((client)=>(


                <div

                  key={client.id}

                  className="
                    bg-black/40
                    border
                    border-red-500/20
                    rounded-2xl
                    p-4
                    flex
                    justify-between
                  "

                >


                  <div>

                    <p className="font-bold">
                      {client.full_name}
                    </p>


                    <p className="text-sm text-slate-400">
                      📱 {client.phone}
                    </p>

                  </div>



                  <div className="
                    text-red-400
                    text-sm
                    font-bold
                  ">

                    EXPIRÉ

                  </div>



                </div>


              ))}



            </div>


          )}



        </div>




      </div>


    </main>

  );


}