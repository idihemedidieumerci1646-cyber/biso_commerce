"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

import {
  AlertTriangle,
  Package,
  Trash2,
  ArrowRight,
  Sparkles,
  RefreshCcw,
} from "lucide-react";


type Product = {
  id: string;
  name: string;
  stock: number;
  unit: string;
};



export default function LowStockPage() {


  const [products,setProducts] = useState<Product[]>([]);
  const [loading,setLoading] = useState(true);



  useEffect(()=>{

    loadProducts();

  },[]);



  async function loadProducts(){


    setLoading(true);


    const phone = localStorage.getItem("phone");


    if(!phone){

      setLoading(false);
      return;

    }



    const {data:user}=await supabase
      .from("users")
      .select("id")
      .eq("phone",phone)
      .single();



    if(!user){

      setLoading(false);
      return;

    }



    const {data}=await supabase
      .from("products")
      .select("*")
      .eq("user_id",user.id);



    const lowStock =
      (data || []).filter(
        (p)=>Number(p.stock)<=5
      );



    setProducts(lowStock);

    setLoading(false);

  }




  async function handleDelete(id:string){


    const confirmDelete =
      confirm("Supprimer ce produit ?");



    if(!confirmDelete) return;



    const phone =
      localStorage.getItem("phone");



    if(!phone) return;



    const {data:user}=await supabase
      .from("users")
      .select("id")
      .eq("phone",phone)
      .single();



    if(!user)return;



    const {error}=await supabase
      .from("products")
      .delete()
      .eq("id",id)
      .eq("user_id",user.id);



    if(error){

      alert("Erreur suppression");

      return;

    }



    loadProducts();


  }





  return (
        <main className="
    relative
    min-h-screen
    overflow-hidden
    bg-[#081221]
    text-white
    px-4
    py-6
    pb-24
    ">


      {/* EFFETS LUMINEUX */}

      <div className="
      absolute
      inset-0
      pointer-events-none
      ">

        <div className="
        absolute
        -top-40
        left-1/2
        h-[450px]
        w-[450px]
        -translate-x-1/2
        rounded-full
        bg-red-500/20
        blur-[150px]
        " />


        <div className="
        absolute
        bottom-0
        right-0
        h-[350px]
        w-[350px]
        rounded-full
        bg-orange-500/20
        blur-[120px]
        " />

      </div>




      <div className="
      relative
      z-10
      mx-auto
      max-w-xl
      ">



        {/* HEADER */}

        <div className="
        flex
        items-center
        justify-between
        mb-8
        ">


          <div>

            <h1 className="
            flex
            items-center
            gap-2
            text-3xl
            font-black
            ">

              <AlertTriangle
              className="text-red-400"
              />

              Stock faible

            </h1>


            <p className="
            mt-2
            text-sm
            text-slate-400
            ">

              Surveille les produits qui nécessitent un réapprovisionnement.

            </p>


          </div>




          <Link

          href="/products"

          className="
          flex
          items-center
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
          shadow-lg
          transition
          hover:scale-105
          "

          >

            <Package size={18}/>

            Produits

          </Link>



        </div>







        {/* RESUME */}

        <div className="
        mb-6
        rounded-3xl
        border
        border-red-400/30
        bg-red-500/10
        p-6
        backdrop-blur-xl
        ">


          <div className="
          flex
          items-center
          justify-between
          ">


            <div>


              <p className="
              text-sm
              text-slate-300
              ">

                Produits en alerte

              </p>


              <p className="
              mt-2
              text-4xl
              font-black
              text-red-400
              ">

                {products.length}

              </p>


              <p className="
              mt-1
              text-xs
              text-slate-400
              ">

                Stock inférieur ou égal à 5

              </p>


            </div>



            <div className="
            rounded-3xl
            bg-red-500/20
            p-5
            ">

              <AlertTriangle
              size={40}
              className="text-red-400"
              />

            </div>


          </div>


        </div>








        {/* LISTE */}

        {loading ? (

          <div className="
          flex
          justify-center
          py-10
          text-slate-400
          ">

            <RefreshCcw className="animate-spin mr-2"/>

            Chargement...

          </div>


        ) : products.length === 0 ? (


          <div className="
          rounded-3xl
          border
          border-green-400/30
          bg-green-500/10
          p-7
          text-center
          ">


            <Sparkles
            className="mx-auto mb-3 text-green-400"
            size={35}
            />


            <p className="
            font-bold
            text-green-300
            ">

              Aucun produit critique ✅

            </p>


            <p className="
            mt-2
            text-sm
            text-slate-400
            ">

              Votre stock est bien géré.

            </p>


          </div>



        ) : (


          <div className="
          space-y-4
          ">


          {products.map((p)=>(


            <div

            key={p.id}

            className="
            rounded-3xl
            border
            border-white/10
            bg-white/5
            p-5
            backdrop-blur-xl
            shadow-xl
            "

            >



              <div className="
              flex
              items-center
              justify-between
              ">


                <div>


                  <h2 className="
                  text-lg
                  font-black
                  ">

                    {p.name}

                  </h2>


                  <p className="
                  mt-2
                  text-sm
                  text-slate-400
                  ">

                    Stock actuel :

                    <span className="
                    ml-2
                    font-bold
                    text-red-400
                    ">

                      {p.stock} {p.unit}

                    </span>


                  </p>


                </div>



                <div className="
                rounded-full
                bg-red-500/20
                px-3
                py-1
                text-xs
                font-bold
                text-red-300
                ">

                  FAIBLE

                </div>



              </div>





              <div className="
              mt-5
              flex
              gap-3
              ">


                <button

                onClick={()=>handleDelete(p.id)}

                className="
                flex-1
                flex
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-red-600
                py-3
                font-bold
                transition
                hover:bg-red-700
                "

                >

                  <Trash2 size={17}/>

                  Supprimer

                </button>




                <Link

                href="/products"

                className="
                flex-1
                flex
                items-center
                justify-center
                gap-2
                rounded-2xl
                border
                border-green-400/30
                bg-green-500/10
                py-3
                font-bold
                text-green-300
                transition
                hover:bg-green-500/20
                "

                >

                  Réapprovisionner

                  <ArrowRight size={17}/>

                </Link>



              </div>



            </div>


          ))}


          </div>


        )}


      </div>


    </main>
  );

}