"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

import {
  Package,
  Plus,
  Search,
  Trash2,
  Edit,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  RefreshCcw,
  Boxes,
  TrendingUp,
} from "lucide-react";


type Product = {
  id: string;
  name: string | null;
  stock: number;
  unit: string | null;
  purchase_price: number;
  selling_price: number;
  currency: string;
  created_at?: string;
};



export default function ProductsPage() {


  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");




  const fetchProducts = async () => {

    try {

      setLoading(true);


      const userId = localStorage.getItem("user_id");


      if (!userId) {

        setLoading(false);
        return;

      }



      const { data,error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("created_at",{ascending:false});



      if(error){

        alert(error.message);

      }else{

        setProducts(data || []);

      }


    }catch(err){

      console.log(err);

    }


    setLoading(false);

  };






  const refreshProducts = async()=>{

    setRefreshing(true);

    await fetchProducts();

    setRefreshing(false);

  };






  const deleteProduct = async(id:string)=>{


    const ok = confirm(
      "Voulez-vous supprimer ce produit ?"
    );


    if(!ok)return;




    const userId = localStorage.getItem("user_id");


    if(!userId)return;





    const {error}=await supabase
      .from("products")
      .delete()
      .eq("id",id)
      .eq("user_id", userId);





    if(error){

      alert(error.message);

    }else{

      await fetchProducts();

    }


  };







  useEffect(()=>{

    fetchProducts();

  },[]);





  const stats = useMemo(()=>{


    const rupture =
      products.filter(p=>Number(p.stock)<=0).length;


    const faible =
      products.filter(
        p=>Number(p.stock)>0 && Number(p.stock)<=5
      ).length;



    const valeur = products.reduce(
      (total,p)=>
        total + 
        (Number(p.purchase_price)||0) *
        (Number(p.stock)||0)
    ,0);

    const benefice = products.reduce(
  (total,p)=>
    total +
    (
      (Number(p.selling_price)||0) -
      (Number(p.purchase_price)||0)
    )
    *
    (Number(p.stock)||0)
,0);



    return {
  total:products.length,
  rupture,
  faible,
  valeur,
  benefice
};

    

  },[products]);



    const filteredProducts = useMemo(()=>{


    return products

      .filter((p)=>
        (p.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      )

      .sort((a,b)=>{


        const aStock = Number(a.stock);
        const bStock = Number(b.stock);


        // Rupture en premier
        if(aStock === 0 && bStock !== 0) return -1;
        if(bStock === 0 && aStock !== 0) return 1;


        // Presque épuisé ensuite
        if(aStock <=5 && bStock >5) return -1;
        if(bStock <=5 && aStock >5) return 1;


        return 0;


      });


  },[products,searchTerm]);







  return (

    <main
      className="
      relative
      min-h-screen
      overflow-hidden
      bg-[#050b16]
      pb-24
      text-white
      "
    >


      {/* lumière arrière */}

      <div
        className="
        pointer-events-none
        absolute
        inset-0
        bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.20),transparent_35%)]
        "
      />





      <div
        className="
        relative
        z-10
        mx-auto
        max-w-xl
        p-5
        "
      >




        {/* HEADER */}


        <div
          className="
          mb-7
          flex
          items-center
          justify-between
          "
        >


          <div>

            <div
              className="
              flex
              items-center
              gap-2
              "
            >

              <span
                className="
                rounded-2xl
                bg-gradient-to-br
                from-orange-500
                to-yellow-400
                p-2
                "
              >

                <Package
                  className="text-black"
                  size={22}
                />

              </span>


              <h1
                className="
                text-3xl
                font-black
                "
              >
                Produits
              </h1>


            </div>



            <p
              className="
              mt-2
              text-xs
              text-slate-400
              "
            >
              Gérez votre stock facilement avec BISO-COMMERCE
            </p>


          </div>




          <button
            onClick={refreshProducts}
            className="
            rounded-2xl
            border
            border-white/10
            bg-white/5
            p-3
            "
          >

            <RefreshCcw
              size={20}
              className={
                refreshing
                ? "animate-spin text-orange-400"
                : "text-slate-300"
              }
            />

          </button>



        </div>






        {/* STATISTIQUES STOCK */}


        <div
          className="
          mb-4
          grid
          grid-cols-2
          gap-3
          "
        >



          <div
            className="
            rounded-3xl
            border
            border-white/10
            bg-white/[0.05]
            p-4
            backdrop-blur-xl
            "
          >

            <Package
              className="mb-2 text-orange-400"
            />

            <p className="text-xs text-slate-400">
              Total produits
            </p>

            <p className="text-3xl font-black">
              {stats.total}
            </p>

          </div>






          <div
            className="
            rounded-3xl
            border
            border-red-400/20
            bg-red-500/10
            p-4
            "
          >

            <AlertTriangle
              className="mb-2 text-red-400"
            />


            <p className="text-xs text-slate-400">
              Rupture
            </p>


            <p className="text-3xl font-black text-red-400">
              {stats.rupture}
            </p>


          </div>






          <div
            className="
            rounded-3xl
            border
            border-orange-400/20
            bg-orange-500/10
            p-4
            "
          >

            <Boxes
              className="mb-2 text-orange-300"
            />


            <p className="text-xs text-slate-400">
              Stock faible
            </p>


            <p className="text-3xl font-black text-orange-300">
              {stats.faible}
            </p>


          </div>






          <div
            className="
            rounded-3xl
            border
            border-green-400/20
            bg-green-500/10
            p-4
            "
          >

            <TrendingUp
              className="mb-2 text-green-400"
            />


            <p className="text-xs text-slate-400">
              Valeur stock
            </p>


            <p className="text-lg font-black text-green-300">
              {stats.valeur.toLocaleString()} FC
            </p>


          </div>



        </div>

        <div
className="
rounded-3xl
border
border-purple-400/20
bg-purple-500/10
p-4
"
>

<TrendingUp
className="mb-2 text-purple-400"
/>

<p className="text-xs text-slate-400">
Bénéfice possible
</p>

<p className="text-lg font-black text-purple-300">
{stats.benefice.toLocaleString()} FC
</p>

</div>


<div className="mt-8"></div>


        {/* RECHERCHE + AJOUT */}


        <div
          className="
          mb-6
          flex
          gap-3
          "
        >


          <div
            className="
            flex-1
            flex
            items-center
            gap-2
            rounded-2xl
            border
            border-white/10
            bg-white/[0.06]
            px-4
            "
          >

            <Search
              size={18}
              className="text-slate-400"
            />


            <input

  value={searchTerm}

  onChange={(e)=>setSearchTerm(e.target.value)}

  placeholder="Chercher nom ou téléphone"

  className="
  w-full
  bg-transparent
  py-3
  text-sm
  text-white
  placeholder:text-slate-400
  outline-none
  "

  style={{
    color:"#ffffff",
    WebkitTextFillColor:"#ffffff",
    caretColor:"#ffffff"
  }}

/>


</div>





          <Link

            href="/products/add"

            className="
            flex
            items-center
            justify-center
            rounded-2xl
            bg-gradient-to-r
            from-orange-500
            to-yellow-400
            px-5
            text-black
            "

          >

            <Plus size={24}/>

          </Link>



        </div>
                {/* LISTE DES PRODUITS */}


        <div className="space-y-4">


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

            Chargement des produits...

          </div>



        ) : filteredProducts.length === 0 ? (



          <div
            className="
            rounded-3xl
            border
            border-white/10
            bg-white/[0.05]
            p-8
            text-center
            backdrop-blur-xl
            "
          >

            <Sparkles
              className="
              mx-auto
              mb-3
              text-orange-400
              "
              size={35}
            />


            <p className="font-bold text-slate-200">
              Aucun produit trouvé
            </p>


            <p className="mt-2 text-sm text-slate-400">
              Ajoutez un produit ou modifiez votre recherche.
            </p>


          </div>




        ) : (



          filteredProducts.map((p)=>(



            <div

              key={p.id}

              className="
              rounded-[1.8rem]
              border
              border-white/10
              bg-white/[0.05]
              p-5
              backdrop-blur-xl
              shadow-[0_20px_50px_-25px_rgba(0,0,0,0.8)]
              transition
              hover:-translate-y-1
              hover:border-orange-400/30
              "

            >





              <div
                className="
                flex
                items-start
                justify-between
                gap-3
                "
              >



                <div>


                  <h2
                    className="
                    text-lg
                    font-black
                    text-white
                    "
                  >

                    {p.name || "Produit sans nom"}

                  </h2>




                  <p
                    className="
                    mt-2
                    text-xs
                    text-slate-400
                    "
                  >

                    Stock :

                    <span
                      className="
                      ml-1
                      font-bold
                      text-white
                      "
                    >

                      {p.stock} {p.unit || "unité"}

                    </span>


                  </p>





                  <p
                    className="
                    mt-2
                    text-xs
                    text-slate-400
                    "
                  >

                    Achat :

                    <span className="font-bold text-slate-200">
                      {" "}
                      {p.purchase_price || 0} {p.currency}
                    </span>


                    {" • "}


                    Vente :

                    <span className="font-bold text-green-300">
                      {p.selling_price || 0} {p.currency}
                    </span>


                  </p>



                </div>






                {/* STATUT */}


                {

                p.stock === 0 ? (


                  <span
                    className="
                    flex
                    items-center
                    gap-1
                    rounded-full
                    bg-red-500/20
                    px-3
                    py-1
                    text-xs
                    font-black
                    text-red-300
                    "
                  >

                    <AlertTriangle size={13}/>

                    Rupture

                  </span>



                ) : p.stock <= 5 ? (



                  <span
                    className="
                    flex
                    items-center
                    gap-1
                    rounded-full
                    bg-orange-500/20
                    px-3
                    py-1
                    text-xs
                    font-black
                    text-orange-300
                    "
                  >

                    <AlertTriangle size={13}/>

                    Faible

                  </span>



                ) : (



                  <span
                    className="
                    flex
                    items-center
                    gap-1
                    rounded-full
                    bg-green-500/20
                    px-3
                    py-1
                    text-xs
                    font-black
                    text-green-300
                    "
                  >

                    <CheckCircle size={13}/>

                    Disponible

                  </span>



                )

                }



              </div>






              {/* ACTIONS */}


              <div
                className="
                mt-5
                flex
                gap-3
                "
              >



                <Link

                  href={`/products/edit/${p.id}`}

                  className="
                  flex-1
                  flex
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-blue-500/20
                  py-3
                  text-sm
                  font-bold
                  text-blue-300
                  transition
                  hover:bg-blue-500/30
                  "

                >

                  <Edit size={16}/>

                  Modifier

                </Link>






                <button

                  onClick={()=>deleteProduct(p.id)}

                  className="
                  flex-1
                  flex
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-red-500/20
                  py-3
                  text-sm
                  font-bold
                  text-red-300
                  transition
                  hover:bg-red-500/30
                  "

                >

                  <Trash2 size={16}/>

                  Supprimer

                </button>




              </div>



            </div>



          ))

        )}



        </div>



      </div>


    </main>

  );


}