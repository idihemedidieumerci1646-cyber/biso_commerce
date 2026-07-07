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
    loadData();
  }, []);




  const loadData = async () => {

    setLoading(true);


    const { data: subs, error } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", {
        ascending:false
      });


    if(error){

      console.error(error);
      setLoading(false);
      return;

    }



    const { data: payments } = await supabase
      .from("subscription_payments")
      .select("*");



    let revenue = 0;


    payments?.forEach((p:any)=>{

      revenue += Number(p.amount || 0);

    });



    const now = new Date();


    const data =
      (subs as Subscription[]) || [];



    const active = data.filter((s)=>{

      if(!s.end_date)
        return false;


      return (
        s.is_active === true &&
        new Date(s.end_date) > now
      );

    });



    const expired = data.filter((s)=>{

      if(!s.end_date)
        return true;


      return new Date(s.end_date) < now;

    });



    const requests =
      data.filter(
        (s)=>s.status==="pending"
      );



    setSubscriptions(data);

    setActiveClients(active);

    setExpiredClients(expired);

    setRenewRequests(requests);

    setTotalRevenue(revenue);


    setLoading(false);

  };



  const activateSubscription = async(
    client:Subscription
  )=>{


    const confirmAction =
      confirm(
        "Activer abonnement de "
        + client.full_name
        + " ?"
      );


    if(!confirmAction)
      return;



    const start = new Date();


    const end = new Date();

    end.setDate(
      end.getDate()+30
    );



    const {error} =
      await supabase
      .from("subscriptions")
      .update({

        is_active:true,

        status:"active",

        start_date:
          start.toISOString(),

        end_date:
          end.toISOString()

      })
      .eq("id",client.id);



    if(error){

      alert(error.message);

      return;

    }



    await loadData();

  };
    const deleteRequest = async (
    client: Subscription
  ) => {

    const confirmDelete =
      confirm(
        "Refuser demande de "
        + client.full_name
        + " ?"
      );


    if(!confirmDelete)
      return;



    const {error} =
      await supabase
      .from("subscriptions")
      .update({

        status:"rejected",

        is_active:false

      })
      .eq("id",client.id);



    if(error){

      alert(error.message);

      return;

    }


    await loadData();

  };




  const filteredRequests =
    renewRequests.filter((client)=>

      client.full_name
      .toLowerCase()
      .includes(
        searchTerm.toLowerCase()
      )

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
          bg-slate-900/80
          backdrop-blur-xl
          border
          border-slate-700
          rounded-3xl
          px-8
          py-5
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


      {/* LIGHT EFFECT */}

      <div className="
        absolute
        top-0
        left-0
        w-72
        h-72
        bg-blue-500/20
        blur-3xl
        rounded-full
      "/>


      <div className="
        absolute
        bottom-0
        right-0
        w-72
        h-72
        bg-orange-500/20
        blur-3xl
        rounded-full
      "/>



      <div className="
        max-w-6xl
        mx-auto
        space-y-6
        relative
      ">



        {/* HEADER */}


        <div className="
          bg-slate-900/70
          backdrop-blur-xl
          border
          border-slate-700/50
          rounded-3xl
          p-6
          shadow-xl
        ">


          <h1 className="
            text-3xl
            font-bold
            flex
            items-center
            gap-2
          ">

            👑 Admin Biso-Commerce

          </h1>



          <p className="
            text-slate-400
            text-sm
            mt-2
          ">

            Gestion abonnements,
            paiements et clients

          </p>


        </div>




        {/* STATISTIQUES */}


        <div className="
          grid
          md:grid-cols-3
          gap-4
        ">



          <div className="
            bg-gradient-to-br
            from-green-600/30
            to-slate-900
            backdrop-blur-xl
            border
            border-green-500/30
            rounded-3xl
            p-5
          ">

            <p className="
              text-slate-300
              text-sm
            ">
              💰 Revenus
            </p>


            <h2 className="
              text-3xl
              font-bold
              mt-2
            ">

              {totalRevenue} $

            </h2>

          </div>
                    <div className="
            bg-gradient-to-br
            from-blue-600/30
            to-slate-900
            backdrop-blur-xl
            border
            border-blue-500/30
            rounded-3xl
            p-5
          ">

            <p className="
              text-slate-300
              text-sm
            ">
              👥 Clients actifs
            </p>


            <h2 className="
              text-3xl
              font-bold
              mt-2
            ">

              {activeClients.length}

            </h2>

          </div>





          <div className="
            bg-gradient-to-br
            from-red-600/30
            to-slate-900
            backdrop-blur-xl
            border
            border-red-500/30
            rounded-3xl
            p-5
          ">


            <p className="
              text-slate-300
              text-sm
            ">
              ❌ Expirés
            </p>



            <h2 className="
              text-3xl
              font-bold
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
          border-slate-700/50
          rounded-3xl
          p-5
        ">


          <h2 className="
            font-bold
            mb-3
          ">

            🔎 Rechercher une demande

          </h2>



          <input

            type="text"

            placeholder="
              Nom ou numéro téléphone...
            "

            value={searchTerm}

            onChange={(e)=>
              setSearchTerm(
                e.target.value
              )
            }


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
              focus:border-blue-400
            "

            style={{
              color:"#fff",
              WebkitTextFillColor:"#fff",
              caretColor:"#fff"
            }}

          />


        </div>








        {/* DEMANDES RENOUVELLEMENT */}



        <div className="
          bg-slate-900/70
          backdrop-blur-xl
          border
          border-slate-700/50
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

              🔔 Demandes

            </h2>



            <span className="
              bg-yellow-500/20
              text-yellow-300
              px-3
              py-1
              rounded-full
              text-sm
              font-bold
            ">

              {filteredRequests.length}

            </span>


          </div>





          {filteredRequests.length === 0 ? (

            <p className="
              text-slate-500
              text-center
              py-5
            ">

              Aucune demande en attente

            </p>


          ) : (


            <div className="
              space-y-4
            ">


              {filteredRequests.map((c)=>(


                <div
                  key={c.id}
                  className="
                    bg-black/40
                    border
                    border-slate-700
                    rounded-2xl
                    p-4
                    flex
                    flex-col
                    md:flex-row
                    md:items-center
                    justify-between
                    gap-4
                  "
                >



                  <div>


                    <p className="
                      font-bold
                      text-lg
                    ">

                      👤 {c.full_name}

                    </p>



                    <p className="
                      text-sm
                      text-slate-400
                    ">

                      📱 {c.phone}

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
                  ">


                    <button
                      onClick={() =>
                        activateSubscription(c)
                      }

                      className="
                        flex-1
                        md:flex-none
                        px-5
                        py-3
                        rounded-2xl
                        font-bold
                        bg-gradient-to-r
                        from-green-500
                        to-emerald-600
                        hover:opacity-90
                        transition
                        shadow-lg
                      "
                    >

                      ✅ Activer

                    </button>



                    <button
                      onClick={() =>
                        deleteRequest(c)
                      }

                      className="
                        flex-1
                        md:flex-none
                        px-5
                        py-3
                        rounded-2xl
                        font-bold
                        bg-gradient-to-r
                        from-red-500
                        to-orange-600
                        hover:opacity-90
                        transition
                        shadow-lg
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
          border-slate-700/50
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



          <div className="
            grid
            md:grid-cols-2
            gap-3
          ">


            {activeClients.map((client)=>(

              <div
                key={client.id}
                className="
                  bg-black/40
                  border
                  border-green-500/20
                  rounded-2xl
                  p-4
                "
              >

                <p className="font-bold">
                  👤 {client.full_name}
                </p>


                <p className="
                  text-sm
                  text-slate-400
                ">

                  📱 {client.phone}

                </p>


                <p className="
                  text-xs
                  text-green-400
                  mt-2
                ">

                  Expire le :
                  {" "}
                  {new Date(
                    client.end_date
                  ).toLocaleDateString()}

                </p>


              </div>


            ))}


          </div>


        </div>





        {/* CLIENTS EXPIRES */}



        <div className="
          bg-slate-900/70
          backdrop-blur-xl
          border
          border-slate-700/50
          rounded-3xl
          p-5
        ">


          <h2 className="
            text-xl
            font-bold
            mb-4
          ">

            🔴 Abonnements expirés

          </h2>



          {expiredClients.length === 0 ? (

            <p className="
              text-slate-500
            ">

              Aucun abonnement expiré

            </p>


          ) : (


            <div className="
              space-y-3
            ">


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
                    items-center
                  "
                >


                  <div>

                    <p className="font-bold">
                      👤 {client.full_name}
                    </p>


                    <p className="
                      text-sm
                      text-slate-400
                    ">

                      📱 {client.phone}

                    </p>

                  </div>


                  <span className="
                    text-xs
                    bg-red-500/20
                    text-red-300
                    px-3
                    py-1
                    rounded-full
                  ">

                    Expiré

                  </span>


                </div>


              ))}


            </div>


          )}


        </div>




      </div>


    </main>

  );

}