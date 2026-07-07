"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

type Product = {
  id: string;
  name: string | null;
  stock: number;
  unit: string | null;
  purchase_price: number;
  selling_price: number;
  currency: string;
};

export default function ProductsPage() {

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");



  const fetchProducts = async () => {

    try {

      setLoading(true);

      const phone = localStorage.getItem("phone");


      if (!phone) {
        setLoading(false);
        return;
      }



      const { data:user } = await supabase
        .from("users")
        .select("id")
        .eq("phone", phone)
        .single();



      if (!user) {
        setLoading(false);
        return;
      }



      const { data,error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id",user.id)
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






  const deleteProduct = async(id:string)=>{


    const ok = confirm(
      "Voulez-vous supprimer ce produit ?"
    );


    if(!ok)return;



    const phone = localStorage.getItem("phone");


    if(!phone)return;



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

      alert(error.message);

    }else{

      await fetchProducts();

    }


  };






  useEffect(()=>{

    fetchProducts();

  },[]);






  const filteredProducts = products.filter((p)=>

    (p.name || "")
    .toLowerCase()
    .includes(searchTerm.toLowerCase())

  );





  return (

    <main className="relative min-h-screen overflow-hidden bg-[#060d1b] pb-24 text-white">



      


      







      <div className="relative z-10 p-5">



        {/* HEADER */}


        <div className="mb-6 flex items-center justify-between">


          <div>


            <div className="flex items-center gap-2">


              <Package className="text-orange-400"/>


              <h1 className="text-3xl font-black">

                Produits

              </h1>


            </div>


            <p className="mt-1 text-xs text-slate-400">

              Gestion intelligente de votre stock

            </p>


          </div>



          <Sparkles className="text-orange-400"/>


        </div>







        {/* SEARCH + ADD */}


        <div className="mb-6 flex gap-3">


          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-4 backdrop-blur-xl">


            <Search
              size={18}
              className="text-slate-400"
            />


            <input

              value={searchTerm}

              onChange={(e)=>setSearchTerm(e.target.value)}

              placeholder="Rechercher..."

              className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-500"

            />


          </div>





          <Link

            href="/products/add"

            className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 px-5 text-black shadow-lg"

          >

            <Plus size={24}/>

          </Link>



        </div>







        {/* LISTE */}


        <div className="space-y-4">



        {
          loading ? (

            <p className="py-10 text-center text-slate-400">

              Chargement...

            </p>


          ) : filteredProducts.length===0 ? (


            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center">

              Aucun produit trouvé

            </div>


          ) : (


            filteredProducts.map((p)=>(


              <div

                key={p.id}

                className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl"

              >



                <div className="flex justify-between">


                  <div>


                    <h2 className="text-lg font-black">

                      {p.name || "Produit sans nom"}

                    </h2>


                    <p className="mt-1 text-xs text-slate-400">

                      Stock : {p.stock} {p.unit || ""}

                    </p>


                  </div>





                  <div>


                  {
                    p.stock===0 ? (

                      <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300">

                        <AlertTriangle size={13}/>

                        Épuisé

                      </span>


                    ) : p.stock<=3 ? (

                      <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs text-yellow-300">

                        Faible

                      </span>


                    ) : (

                      <span className="flex items-center gap-1 rounded-full bg-green-500/20 px-3 py-1 text-xs text-green-300">

                        <CheckCircle size={13}/>

                        OK

                      </span>


                    )
                  }


                  </div>


                </div>





                <div className="mt-5 flex gap-3">


                  <Link

                    href={`/products/edit/${p.id}`}

                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-500/20 py-3 text-sm font-bold text-blue-300"

                  >

                    <Edit size={16}/>

                    Modifier

                  </Link>





                  <button

                    onClick={()=>deleteProduct(p.id)}

                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500/20 py-3 text-sm font-bold text-red-300"

                  >

                    <Trash2 size={16}/>

                    Supprimer

                  </button>



                </div>


              </div>


            ))

          )
        }


        </div>


      </div>


    </main>

  );

}