"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import {
  Package,
  PlusCircle,
  BarChart3,
  CreditCard,
  Banknote,
  FileText,
  Crown,
  Zap,
  ShoppingCart,
  TrendingUp,
  Wallet,
  AlertTriangle,
  LogOut,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  X,
} from "lucide-react";


// ---------------- TYPES ----------------


type Sale = {
  total_sale: number;
  profit: number;
  currency: string;
  product_name: string;
  quantity: number;
  created_at: string;
};


type Product = {
  product_name: string;
  stock: number;
};


export default function DashboardPage() {


  const router = useRouter();


  const [initialLoading, setInitialLoading] = useState(true);

  const [showInfo, setShowInfo] = useState(false);


  const [daysUsed, setDaysUsed] = useState(0);

  const [daysLeft, setDaysLeft] = useState(30);


  const [status, setStatus] =
    useState<"active" | "expired">("active");



  const [todaySalesFc, setTodaySalesFc] = useState(0);

  const [todaySalesDollar, setTodaySalesDollar] = useState(0);


  const [todayProfitFc, setTodayProfitFc] = useState(0);

  const [todayProfitDollar, setTodayProfitDollar] = useState(0);



  const [todayProductsSold, setTodayProductsSold] = useState(0);



  const [exhaustedProducts, setExhaustedProducts] =
    useState<Product[]>([]);



  const [lastSales, setLastSales] =
    useState<Sale[]>([]);





  useEffect(() => {

    loadAll();

  }, []);





  async function loadAll() {


    const phone = localStorage.getItem("phone");


    if (!phone) {

      router.replace("/login");

      return;

    }




    const { data:user } = await supabase

      .from("users")

      .select("*")

      .eq("phone", phone)

      .single();




    if (!user) {

      router.replace("/login");

      return;

    }





    const ok = await checkSubscription(user.id);




    if (!ok) {

      router.replace("/subscription");

      return;

    }





    await loadDashboard(user.id);



    setInitialLoading(false);


  }






  async function checkSubscription(userId:string) {


    const { data } = await supabase

      .from("subscriptions")

      .select("*")

      .eq("user_id", userId)

      .order("created_at",{ascending:false})

      .limit(1);



    const sub = data?.[0];



    if (!sub) {

      setStatus("expired");

      return false;

    }




    const start = new Date(sub.start_date);

    const end = new Date(sub.end_date);

    const now = new Date();



    const diffDays = Math.floor(

      (now.getTime() - start.getTime())

      /

      (1000 * 60 * 60 * 24)

    );



    const used = diffDays < 0 ? 0 : diffDays;



    setDaysUsed(used);

    setDaysLeft(Math.max(0,30-used));



    const active =

      sub.is_active === true &&

      end > now;



    setStatus(active ? "active" : "expired");



    return active;


  }
    async function loadDashboard(userId: string) {


    const today =
      new Date().toISOString().split("T")[0];



    const [salesRes, productsRes] =

      await Promise.all([


        supabase

          .from("sales")

          .select("*")

          .eq("user_id", userId),



        supabase

          .from("products")

          .select("*")

          .eq("user_id", userId),


      ]);




    const sales = salesRes.data || [];

    const products = productsRes.data || [];




    let todayFc = 0;

    let todayDollar = 0;



    let profitFc = 0;

    let profitDollar = 0;



    let soldToday = 0;





    sales.forEach((sale: Sale) => {



      const saleDate =
        sale.created_at?.split("T")[0];




      if (saleDate === today) {



        soldToday += Number(
          sale.quantity || 0
        );




        if (sale.currency === "FC") {



          todayFc += Number(
            sale.total_sale || 0
          );



          profitFc += Number(
            sale.profit || 0
          );



        } else {



          todayDollar += Number(
            sale.total_sale || 0
          );



          profitDollar += Number(
            sale.profit || 0
          );


        }


      }


    });





    setTodaySalesFc(todayFc);

    setTodaySalesDollar(todayDollar);



    setTodayProfitFc(profitFc);

    setTodayProfitDollar(profitDollar);



    setTodayProductsSold(soldToday);




    setExhaustedProducts(

      products.filter(

        (p: Product)=>

          Number(p.stock) === 0

      )

    );



    setLastSales(

      sales.slice(0,5)

    );


  }







  if (!initialLoading && status === "expired") {


    return (

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060d1b] px-6 text-white">



        <div className="absolute inset-0">


          <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-orange-500/20 blur-[150px]" />


          <div className="absolute bottom-0 right-0 h-[350px] w-[350px] rounded-full bg-blue-600/20 blur-[120px]" />


        </div>





        <div className="relative z-10 max-w-md rounded-[2rem] border border-white/10 bg-white/[0.07] p-8 text-center backdrop-blur-xl">



          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20">

            <AlertTriangle
              className="text-red-400"
              size={32}
            />

          </div>





          <h1 className="text-3xl font-black text-red-400">

            Abonnement expiré

          </h1>





          <p className="mt-4 text-sm leading-7 text-slate-300">


            Votre période gratuite ou votre abonnement
            est terminé.


            <br />


            Renouvelez votre accès pour continuer
            à gérer votre commerce.


          </p>





          <Link

            href="/subscription"

            className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 p-4 font-bold text-black transition hover:scale-[1.03]"

          >


            <Crown size={20}/>

            Renouveler abonnement


          </Link>





          <a

            href="https://wa.me/243994864173"

            target="_blank"

            className="mt-5 block text-sm text-orange-400 hover:underline"

          >

            Contacter le support WhatsApp


          </a>



        </div>


      </main>

    );


  }





  const percentUsed = Math.round(

    (daysUsed / 30) * 100

  );




  if (initialLoading) {


    return (

      <main className="flex min-h-screen items-center justify-center bg-[#060d1b] text-white">

        <div className="flex items-center gap-3 text-slate-400">

          <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />

          Chargement du tableau de bord...

        </div>

      </main>

    );


  }
    return (

    <main className="relative min-h-screen overflow-hidden bg-[#060d1b] pb-28 text-white">


      {/* BACKGROUND LIGHTS */}

      <div className="pointer-events-none absolute inset-0">


        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-orange-500/20 blur-[160px]" />


        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-blue-600/20 blur-[140px]" />


        <div className="absolute left-0 top-1/3 h-[300px] w-[300px] rounded-full bg-purple-600/20 blur-[130px]" />


      </div>





      {/* HEADER */}


      <div className="relative z-10 px-5 pt-6">


        <div className="flex items-center justify-between">



          <div>


            <div className="flex items-center gap-2">


              <Sparkles
                size={18}
                className="text-orange-400"
              />


              <h1 className="text-2xl font-black tracking-tight">

                BISO-

                <span className="text-orange-400">

                  COMMERCE

                </span>

              </h1>


            </div>




            <p className="mt-1 text-xs text-slate-400">

              Votre commerce intelligent

            </p>


          </div>






          <div className="flex items-center gap-3">



            <Zap
              className="text-orange-400"
              size={22}
            />



            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-400 font-black text-black shadow-lg shadow-orange-500/30">

              PDG

            </div>


          </div>



        </div>



      </div>







      {/* SUBSCRIPTION CARD */}


      <div className="relative z-10 px-5 mt-6">


        <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl">



          <div className="flex items-center justify-between mb-4">


            <div>


              <p className="text-sm font-bold text-orange-400">

                Abonnement actif

              </p>


              <p className="text-xs text-slate-400">

                Essai gratuit professionnel

              </p>


            </div>



            <div className="rounded-full bg-orange-500/10 px-3 py-1 text-xs text-orange-300">


              {daysUsed}/30 jours


            </div>



          </div>





          <div className="h-3 overflow-hidden rounded-full bg-black/40">


            <div

              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all"

              style={{
                width:`${percentUsed}%`
              }}

            />



          </div>





          <div className="mt-3 flex items-center justify-between">


            <p className="text-xs text-slate-400">

              Temps restant

            </p>


            <p className="text-sm font-bold text-white">

              {daysLeft} jours

            </p>


          </div>


        </div>


      </div>







      {/* INFORMATION BUTTON */}


      <div className="relative z-10 px-5 mt-4">


        <button

          onClick={()=>setShowInfo(true)}

          className="text-xs text-slate-400 underline transition hover:text-orange-400"

        >

          ✨ Clique ici pour en savoir plus sur Biso-commerce


        </button>


      </div>







      {/* QUICK SALE BUTTON */}


      <div className="relative z-10 px-5 mt-5">


        <Link

          href="/sales"

          className="group flex items-center justify-between rounded-[2rem] bg-gradient-to-r from-orange-500 to-yellow-400 p-5 font-bold text-black shadow-xl shadow-orange-500/20 transition hover:scale-[1.02]"

        >



          <div className="flex items-center gap-4">


            <div className="rounded-2xl bg-black/10 p-3">


              <ShoppingCart size={26}/>


            </div>



            <div>


              <p className="text-lg">

                Nouvelle vente

              </p>


              <p className="text-xs opacity-70">

                Ouvrir la caisse rapidement

              </p>


            </div>


          </div>





          <ArrowRight

            className="transition group-hover:translate-x-1"

          />


        </Link>


      </div>
            {/* STATS */}

      <div className="relative z-10 mt-6 grid grid-cols-2 gap-4 px-5">


        <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl">


          <div className="mb-2 flex items-center justify-between">


            <p className="text-xs text-slate-400">
              Ventes aujourd'hui
            </p>


            <TrendingUp
              size={18}
              className="text-orange-400"
            />


          </div>



          <p className="text-xl font-black text-orange-400">

            {todaySalesFc}

          </p>


          <p className="mt-1 text-xs text-slate-500">

            Franc Congolais

          </p>


        </div>





        <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl">


          <div className="mb-2 flex items-center justify-between">


            <p className="text-xs text-slate-400">
              Ventes USD
            </p>


            <Wallet
              size={18}
              className="text-blue-400"
            />


          </div>



          <p className="text-xl font-black text-blue-400">

            {todaySalesDollar}

          </p>


          <p className="mt-1 text-xs text-slate-500">

            Dollars

          </p>


        </div>






        <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl">


          <div className="mb-2 flex items-center justify-between">


            <p className="text-xs text-slate-400">
              Bénéfice CDF
            </p>


            <BarChart3
              size={18}
              className="text-green-400"
            />


          </div>



          <p className="text-xl font-black text-green-400">

            {todayProfitFc}

          </p>


          <p className="mt-1 text-xs text-slate-500">

            Aujourd'hui

          </p>


        </div>






        <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl">


          <div className="mb-2 flex items-center justify-between">


            <p className="text-xs text-slate-400">
              Bénéfice USD
            </p>


            <CreditCard
              size={18}
              className="text-yellow-400"
            />


          </div>



          <p className="text-xl font-black text-yellow-400">

            {todayProfitDollar}

          </p>


          <p className="mt-1 text-xs text-slate-500">

            Aujourd'hui

          </p>


        </div>



      </div>









      {/* QUICK MENU */}


      <div className="relative z-10 mt-7 px-5">


        <h2 className="mb-4 text-sm font-bold text-white">

          Accès rapide

        </h2>





        <div className="grid grid-cols-4 gap-3">


          {[

            {
              label:"Produits",
              icon:Package,
              href:"/products"
            },


            {
              label:"Ajouter",
              icon:PlusCircle,
              href:"/products/add"
            },


            {
              label:"Ventes",
              icon:BarChart3,
              href:"/sales"
            },


            {
              label:"Dettes",
              icon:CreditCard,
              href:"/debts"
            },


            {
              label:"Dépenses",
              icon:Banknote,
              href:"/expenses"
            },


            {
              label:"Rapports",
              icon:FileText,
              href:"/reports"
            },


            {
              label:"Abonnement",
              icon:Crown,
              href:"/subscription"
            },


          ].map((item,index)=>{


            const Icon = item.icon;


            return (

              <Link

                key={index}

                href={item.href}

                className="group"

              >


                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-center backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/10">


                  <Icon

                    size={21}

                    className="mb-2 text-orange-400 transition group-hover:scale-110"

                  />


                  <span className="text-[10px] text-slate-300">

                    {item.label}

                  </span>


                </div>


              </Link>

            );


          })}


        </div>


      </div>
            {/* STOCK ALERT */}

      {
        exhaustedProducts.length > 0 && (

          <div className="relative z-10 mt-6 px-5">


            <Link href="/products/low-stock">


              <div className="flex items-center justify-between rounded-3xl border border-red-400/20 bg-red-500/10 p-5 backdrop-blur-xl transition hover:scale-[1.02]">


                <div className="flex items-center gap-3">


                  <div className="rounded-2xl bg-red-500/20 p-3">


                    <AlertTriangle
                      className="text-red-400"
                      size={22}
                    />


                  </div>




                  <div>


                    <p className="font-bold text-red-300">

                      Stock faible clique ici pour en savoir

                    </p>


                    <p className="text-xs text-slate-400">

                      {exhaustedProducts.length} produit(s) épuisé(s)

                    </p>


                  </div>


                </div>




                <ArrowRight
                  className="text-red-400"
                />


              </div>


            </Link>


          </div>

        )

      }









      {/* FOOTER */}


      <div className="relative z-10 mt-8 px-5 text-center">


        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">


          <ShieldCheck

            size={14}

            className="text-orange-400"

          />


          BISO-COMMERCE • Gestion sécurisée ( PDG DIEUMERCI IDI )


        </div>


      </div>
      
            {/* MODAL INFORMATION BISO-COMMERCE */}

      {showInfo && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm"
          onClick={() => setShowInfo(false)}
        >

          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-white/10 bg-[#081221] p-6 shadow-2xl"
          >


            {/* HEADER */}

            <div className="mb-6 flex items-center justify-between">


              <h2 className="text-xl font-black">

                BISO-

                <span className="text-orange-400">
                  COMMERCE
                </span>

              </h2>



              <button

                onClick={() => setShowInfo(false)}

                className="rounded-xl bg-white/10 px-3 py-2 text-slate-300 hover:bg-white/20"

              >

                ✕

              </button>


            </div>





            {/* CONTENU */}

            <div className="space-y-5 text-sm leading-6 text-slate-300">



              <div>


                <h3 className="text-lg font-bold text-orange-400">

                  📖 BIENVENUE SUR BISO-COMMERCE

                </h3>


                <p className="mt-3">

                  Biso-Commerce est une caisse digitale intelligente
                  qui vous permet de gérer facilement votre commerce
                  depuis votre téléphone.

                </p>


              </div>






              <div>


                <h3 className="font-bold text-white">

                  💼 Avec Biso-Commerce vous pouvez :

                </h3>



                <ul className="mt-3 space-y-2">


                  <li>
                    ✅ Ajouter et gérer vos produits
                  </li>


                  <li>
                    ✅ Enregistrer vos ventes chaque jour
                  </li>


                  <li>
                    ✅ Suivre vos bénéfices automatiquement
                  </li>


                  <li>
                    ✅ Contrôler vos dépenses
                  </li>


                  <li>
                    ✅ Gérer les dettes de vos clients
                  </li>


                  <li>
                    ✅ Voir vos rapports de commerce
                  </li>


                </ul>


              </div>






              <div>


                <h3 className="font-bold text-white">

                  📱 Installation de l'application

                </h3>


                <p className="mt-3">


                  <b className="text-green-400">
                    Android :
                  </b>


                  <br />

                  Ouvrez Chrome → cliquez sur ⋮ →
                  choisissez "Installer l'application".


                </p>




                <p className="mt-3">


                  <b className="text-blue-400">
                    iPhone :
                  </b>


                  <br />

                  Ouvrez Safari → Partager →
                  "Sur l'écran d'accueil" → Ajouter.


                </p>


              </div>






              <div className="rounded-2xl border border-orange-400/20 bg-orange-500/10 p-4">


                <p className="font-semibold text-orange-300">


                  🎯 Conseil PDG


                </p>


                <p className="mt-2 text-xs">


                  Ajoutez vos produits avant de commencer
                  les ventes afin d'obtenir des statistiques
                  précises sur votre commerce.


                </p>


              </div>






              <p className="text-center text-sm font-semibold text-green-400">


                Merci d'utiliser Biso-Commerce 💚
                <br />
                PDG DIEUMERCI IDI


              </p>



            </div>






            {/* BUTTON FERMER */}


            <button

              onClick={() => setShowInfo(false)}

              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 p-4 font-black text-black transition hover:scale-[1.02]"

            >

              J'ai compris 🚀

            </button>



          </div>


        </div>


      )}



    </main>

  );

}