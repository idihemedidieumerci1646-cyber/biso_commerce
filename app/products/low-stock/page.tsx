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
  XCircle,
  Boxes,
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



    setProducts((data || []).map((p)=>({
      id:p.id,
      name:p.name || p.product_name,
      stock:Number(p.stock) || 0,
      unit:p.unit || "unité"
    })));


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



  const outOfStock =
    products.filter((p)=>p.stock <= 0);


  const almostEmpty =
    products.filter(
      (p)=>p.stock > 0 && p.stock <= 5
    );



      return (
    <main
      className="
      relative
      min-h-screen
      overflow-hidden
      bg-[#050b16]
      text-white
      px-4
      py-6
      pb-24
      "
    >


      {/* HALO DESIGN */}
      <div
        className="
        pointer-events-none
        absolute
        inset-0
        bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.18),transparent_35%)]
        "
      />


      <div
        className="
        relative
        z-10
        mx-auto
        max-w-xl
        ">



        {/* HEADER */}
        <div
          className="
          mb-8
          flex
          items-center
          justify-between
          "
        >

          <div>

            <h1
              className="
              flex
              items-center
              gap-2
              text-3xl
              font-black
              "
            >

              <AlertTriangle
                className="text-orange-400"
              />

              Gestion du stock

            </h1>


            <p
              className="
              mt-2
              text-sm
              text-slate-400
              "
            >
              Retrouvez rapidement les produits à réapprovisionner.
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






        {/* RESUME STOCK */}

        <div
          className="
          mb-6
          grid
          grid-cols-2
          gap-3
          "
        >


          <div
            className="
            rounded-3xl
            border
            border-red-400/30
            bg-red-500/10
            p-5
            backdrop-blur-xl
            "
          >

            <div
              className="
              flex
              items-center
              justify-between
              "
            >

              <p className="text-sm text-slate-300">
                Rupture
              </p>


              <XCircle
                className="text-red-400"
              />

            </div>


            <p
              className="
              mt-3
              text-4xl
              font-black
              text-red-400
              "
            >
              {outOfStock.length}
            </p>


            <p
              className="
              text-xs
              text-slate-400
              "
            >
              Stock totalement vide
            </p>


          </div>





          <div
            className="
            rounded-3xl
            border
            border-orange-400/30
            bg-orange-500/10
            p-5
            backdrop-blur-xl
            "
          >

            <div
              className="
              flex
              items-center
              justify-between
              "
            >

              <p className="text-sm text-slate-300">
                Presque fini
              </p>


              <Boxes
                className="text-orange-300"
              />

            </div>


            <p
              className="
              mt-3
              text-4xl
              font-black
              text-orange-300
              "
            >
              {almostEmpty.length}
            </p>


            <p
              className="
              text-xs
              text-slate-400
              "
            >
              Stock inférieur à 5
            </p>


          </div>


        </div>





        {loading ? (

          <div
            className="
            flex
            justify-center
            py-10
            text-slate-400
            "
          >

            <RefreshCcw
              className="mr-2 animate-spin"
            />

            Chargement...

          </div>


        ) : (


          <div className="space-y-8">


            {/* PRODUITS EN RUPTURE */}

            {outOfStock.length > 0 && (

              <section>

                <div
                  className="
                  mb-3
                  flex
                  items-center
                  gap-2
                  "
                >

                  <XCircle
                    className="text-red-400"
                    size={20}
                  />

                  <h2
                    className="
                    text-lg
                    font-black
                    text-red-300
                    "
                  >
                    Produits en rupture
                  </h2>

                </div>



                <div className="space-y-4">


                  {outOfStock.map((p)=>(

                    <ProductCard
                      key={p.id}
                      product={p}
                      danger
                      onDelete={handleDelete}
                    />

                  ))}


                </div>


              </section>

            )}






            {/* PRODUITS PRESQUE EPUISES */}

            {almostEmpty.length > 0 && (

              <section>

                <div
                  className="
                  mb-3
                  flex
                  items-center
                  gap-2
                  "
                >

                  <AlertTriangle
                    className="text-orange-400"
                    size={20}
                  />

                  <h2
                    className="
                    text-lg
                    font-black
                    text-orange-300
                    "
                  >
                    Produits presque épuisés
                  </h2>

                </div>



                <div className="space-y-4">


                  {almostEmpty.map((p)=>(

                    <ProductCard
                      key={p.id}
                      product={p}
                      onDelete={handleDelete}
                    />

                  ))}


                </div>


              </section>

            )}






            {outOfStock.length === 0 &&
             almostEmpty.length === 0 && (


              <div
                className="
                rounded-3xl
                border
                border-green-400/30
                bg-green-500/10
                p-7
                text-center
                "
              >

                <Sparkles
                  className="
                  mx-auto
                  mb-3
                  text-green-400
                  "
                  size={35}
                />


                <p
                  className="
                  font-bold
                  text-green-300
                  "
                >
                  Excellent stock ✅
                </p>


                <p
                  className="
                  mt-2
                  text-sm
                  text-slate-400
                  "
                >
                  Aucun produit en rupture ou presque épuisé.
                </p>


              </div>


            )}


          </div>


        )}


      </div>


    </main>
  );

}




function ProductCard({
  product,
  danger = false,
  onDelete,
}:{
  product: Product;
  danger?: boolean;
  onDelete:(id:string)=>void;
}){


  return (

    <div
      className="
      rounded-3xl
      border
      border-white/10
      bg-white/[0.04]
      p-5
      backdrop-blur-xl
      shadow-xl
      "
    >


      <div
        className="
        flex
        items-center
        justify-between
        "
      >

        <div>

          <h3
            className="
            text-lg
            font-black
            text-white
            "
          >
            {product.name}
          </h3>


          <p
            className="
            mt-2
            text-sm
            text-slate-400
            "
          >

            Stock actuel :

            <span
              className={`
              ml-2
              font-black
              ${danger 
                ? "text-red-400" 
                : "text-orange-300"}
              `}
            >
              {product.stock} {product.unit}
            </span>

          </p>


        </div>




        <span
          className={`
          rounded-full
          px-3
          py-1
          text-xs
          font-black
          ${
            danger
            ? "bg-red-500/20 text-red-300"
            : "bg-orange-500/20 text-orange-300"
          }
          `}
        >

          {danger ? "RUPTURE" : "FAIBLE"}

        </span>


      </div>





      <div
        className="
        mt-5
        flex
        gap-3
        "
      >


        <button
          onClick={()=>onDelete(product.id)}
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
          href={`/products/edit/${product.id}`}
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

  );

}