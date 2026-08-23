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
      min-h-screen
      bg-[#f5f7fb]
      text-slate-900
      px-4
      py-6
      pb-24
      sm:px-6
      lg:px-8
      "
    >


      <div
        className="
        mx-auto
        max-w-6xl
        "
      >



        {/* =========================================================
            HEADER
        ========================================================= */}

        <div
          className="
          mb-6
          rounded-[26px]
          border
          border-slate-200
          bg-white
          p-5
          shadow-sm
          sm:p-7
          "
        >


          <div
            className="
            flex
            flex-col
            gap-5
            sm:flex-row
            sm:items-center
            sm:justify-between
            "
          >


            <div className="min-w-0">


              <div
                className="
                mb-4
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                bg-indigo-50
                "
              >

                <AlertTriangle
                  className="text-indigo-600"
                  size={25}
                />

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

                Gestion du stock

              </h1>


              <p
                className="
                mt-2
                max-w-2xl
                text-sm
                leading-6
                text-slate-500
                "
              >

                Retrouvez rapidement les produits à
                réapprovisionner avant de perdre des ventes.

              </p>

            </div>



            <Link
              href="/products"
              className="
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              bg-indigo-600
              px-5
              py-3.5
              text-sm
              font-black
              text-white
              shadow-sm
              transition
              hover:bg-indigo-700
              active:scale-[0.98]
              sm:w-auto
              "
            >

              <Package size={18}/>

              <span>
                Produits
              </span>

            </Link>


          </div>


        </div>





        {/* =========================================================
            RESUME STOCK
        ========================================================= */}

        <div
          className="
          mb-6
          grid
          grid-cols-1
          gap-4
          sm:grid-cols-2
          "
        >


          {/* RUPTURE */}

          <div
            className="
            rounded-[26px]
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            "
          >

            <div
              className="
              flex
              items-start
              justify-between
              "
            >

              <div
                className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-2xl
                bg-red-50
                "
              >

                <XCircle
                  className="text-red-500"
                  size={22}
                />

              </div>


              <span
                className="
                rounded-full
                bg-red-50
                px-3
                py-1.5
                text-xs
                font-bold
                text-red-600
                "
              >

                Attention

              </span>

            </div>


            <p
              className="
              mt-5
              text-xs
              font-bold
              uppercase
              tracking-wider
              text-slate-500
              "
            >

              Produits en rupture

            </p>


            <p
              className="
              mt-1
              text-4xl
              font-black
              text-red-600
              "
            >

              {outOfStock.length}

            </p>


            <p
              className="
              mt-1
              text-xs
              leading-5
              text-slate-500
              "
            >

              Stock totalement vide

            </p>


          </div>





          {/* PRESQUE FINI */}

          <div
            className="
            rounded-[26px]
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            "
          >

            <div
              className="
              flex
              items-start
              justify-between
              "
            >

              <div
                className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-2xl
                bg-indigo-50
                "
              >

                <Boxes
                  className="text-indigo-600"
                  size={22}
                />

              </div>


              <span
                className="
                rounded-full
                bg-indigo-50
                px-3
                py-1.5
                text-xs
                font-bold
                text-indigo-600
                "
              >

                À surveiller

              </span>

            </div>


            <p
              className="
              mt-5
              text-xs
              font-bold
              uppercase
              tracking-wider
              text-slate-500
              "
            >

              Presque fini

            </p>


            <p
              className="
              mt-1
              text-4xl
              font-black
              text-indigo-600
              "
            >

              {almostEmpty.length}

            </p>


            <p
              className="
              mt-1
              text-xs
              leading-5
              text-slate-500
              "
            >

              Entre 1 et 5 unités

            </p>


          </div>


        </div>





        {/* =========================================================
            CHARGEMENT
        ========================================================= */}

        {loading ? (

          <div
            className="
            rounded-[26px]
            border
            border-slate-200
            bg-white
            px-6
            py-12
            text-center
            shadow-sm
            "
          >

            <div
              className="
              mx-auto
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-2xl
              bg-indigo-50
              "
            >

              <RefreshCcw
                className="
                animate-spin
                text-indigo-600
                "
                size={25}
              />

            </div>


            <p
              className="
              mt-4
              font-bold
              text-slate-900
              "
            >

              Chargement du stock...

            </p>


            <p
              className="
              mt-1
              text-sm
              text-slate-500
              "
            >

              Récupération de vos produits

            </p>

          </div>


        ) : (


          <div className="space-y-7">


            {/* =====================================================
                PRODUITS EN RUPTURE
            ===================================================== */}

            {outOfStock.length > 0 && (

              <section>

                <div
                  className="
                  mb-4
                  flex
                  items-center
                  gap-3
                  "
                >

                  <div
                    className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-red-50
                    "
                  >

                    <XCircle
                      className="text-red-500"
                      size={20}
                    />

                  </div>


                  <div>

                    <h2
                      className="
                      text-lg
                      font-black
                      text-slate-900
                      "
                    >

                      Produits en rupture

                    </h2>


                    <p
                      className="
                      mt-0.5
                      text-xs
                      text-slate-500
                      "
                    >

                      Ces produits ne sont plus disponibles.

                    </p>

                  </div>

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





            {/* =====================================================
                PRODUITS PRESQUE EPUISES
            ===================================================== */}

            {almostEmpty.length > 0 && (

              <section>

                <div
                  className="
                  mb-4
                  flex
                  items-center
                  gap-3
                  "
                >

                  <div
                    className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-indigo-50
                    "
                  >

                    <AlertTriangle
                      className="text-indigo-600"
                      size={20}
                    />

                  </div>


                  <div>

                    <h2
                      className="
                      text-lg
                      font-black
                      text-slate-900
                      "
                    >

                      Produits presque épuisés

                    </h2>


                    <p
                      className="
                      mt-0.5
                      text-xs
                      text-slate-500
                      "
                    >

                      Pensez à réapprovisionner ces produits.

                    </p>

                  </div>

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





            {/* =====================================================
                STOCK NORMAL
            ===================================================== */}

            {outOfStock.length === 0 &&
             almostEmpty.length === 0 && (

              <div
                className="
                rounded-[26px]
                border
                border-slate-200
                bg-white
                p-8
                text-center
                shadow-sm
                "
              >

                <div
                  className="
                  mx-auto
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  bg-green-50
                  "
                >

                  <Sparkles
                    className="text-green-600"
                    size={32}
                  />

                </div>


                <p
                  className="
                  mt-4
                  text-xl
                  font-black
                  text-slate-900
                  "
                >

                  Excellent stock ✅

                </p>


                <p
                  className="
                  mx-auto
                  mt-2
                  max-w-sm
                  text-sm
                  leading-6
                  text-slate-500
                  "
                >

                  Aucun produit en rupture ou presque épuisé.
                  Votre stock est actuellement bien surveillé.

                </p>


                <Link
                  href="/products"
                  className="
                  mt-6
                  inline-flex
                  items-center
                  gap-2
                  rounded-2xl
                  bg-indigo-600
                  px-5
                  py-3
                  text-sm
                  font-black
                  text-white
                  shadow-sm
                  transition
                  hover:bg-indigo-700
                  active:scale-[0.98]
                  "
                >

                  Voir mes produits

                  <ArrowRight size={17}/>

                </Link>


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
      overflow-hidden
      rounded-[26px]
      border
      border-slate-200
      bg-white
      p-5
      shadow-sm
      transition
      hover:shadow-md
      "
    >


      {/* =========================================================
          INFORMATIONS PRODUIT
      ========================================================= */}

      <div
        className="
        flex
        items-start
        justify-between
        gap-4
        "
      >

        <div
          className="
          min-w-0
          "
        >

          <div
            className="
            flex
            items-center
            gap-3
            "
          >

            <div
              className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-2xl
              bg-indigo-50
              "
            >

              <Package
                size={21}
                className="text-indigo-600"
              />

            </div>


            <div className="min-w-0">

              <h3
                className="
                truncate
                text-lg
                font-black
                text-slate-900
                "
              >

                {product.name}

              </h3>


              <p
                className="
                mt-1
                text-xs
                text-slate-500
                "
              >

                Gestion du stock

              </p>

            </div>

          </div>


          {/* STOCK BIEN VISIBLE */}

          <div
            className={`
            mt-5
            rounded-2xl
            border
            p-4
            ${
              danger
              ? "border-red-100 bg-red-50/60"
              : "border-indigo-100 bg-indigo-50/60"
            }
            `}
          >

            <p
              className="
              text-xs
              font-bold
              uppercase
              tracking-wider
              text-slate-500
              "
            >

              Stock actuel

            </p>


            <div
              className="
              mt-1
              flex
              items-end
              gap-2
              "
            >

              <span
                className={`
                text-3xl
                font-black
                ${
                  danger
                  ? "text-red-600"
                  : "text-indigo-600"
                }
                `}
              >

                {product.stock}

              </span>


              <span
                className="
                mb-1
                text-sm
                font-bold
                text-slate-500
                "
              >

                {product.unit}

              </span>

            </div>


            <p
              className="
              mt-1
              text-xs
              text-slate-500
              "
            >

              Quantité actuellement disponible

            </p>

          </div>


        </div>




        {/* STATUT */}

        <span
          className={`
          shrink-0
          rounded-full
          px-3
          py-1.5
          text-[10px]
          font-black
          tracking-wide
          ${
            danger
            ? "bg-red-50 text-red-600 ring-1 ring-red-100"
            : "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"
          }
          `}
        >

          {danger ? "RUPTURE" : "FAIBLE"}

        </span>


      </div>





      {/* =========================================================
          MESSAGE
      ========================================================= */}

      <div
        className={`
        mt-4
        flex
        items-start
        gap-3
        rounded-2xl
        border
        p-4
        ${
          danger
          ? "border-red-100 bg-red-50/60"
          : "border-indigo-100 bg-indigo-50/60"
        }
        `}
      >

        {danger ? (

          <XCircle
            size={18}
            className="
            mt-0.5
            shrink-0
            text-red-500
            "
          />

        ) : (

          <AlertTriangle
            size={18}
            className="
            mt-0.5
            shrink-0
            text-indigo-600
            "
          />

        )}


        <p
          className="
          text-sm
          leading-5
          text-slate-600
          "
        >

          {danger
            ? "Ce produit est complètement épuisé. Réapprovisionnez-le pour pouvoir continuer à le vendre."
            : "Ce produit possède un stock faible. Pensez à le réapprovisionner prochainement."
          }

        </p>

      </div>





      {/* =========================================================
          ACTIONS
      ========================================================= */}

      <div
        className="
        mt-5
        grid
        grid-cols-1
        gap-3
        sm:grid-cols-2
        "
      >


        <button
          onClick={()=>onDelete(product.id)}
          className="
          flex
          items-center
          justify-center
          gap-2
          rounded-2xl
          bg-red-600
          px-4
          py-3.5
          font-bold
          text-white
          shadow-sm
          transition
          hover:bg-red-700
          active:scale-[0.98]
          "
        >

          <Trash2 size={17}/>

          Supprimer

        </button>





        <Link
          href={`/products/edit/${product.id}`}
          className="
          flex
          items-center
          justify-center
          gap-2
          rounded-2xl
          bg-green-50
          px-4
          py-3.5
          font-bold
          text-green-700
          ring-1
          ring-green-200
          transition
          hover:bg-green-100
          active:scale-[0.98]
          "
        >

          Réapprovisionner

          <ArrowRight size={17}/>

        </Link>


      </div>


    </div>

  );

}