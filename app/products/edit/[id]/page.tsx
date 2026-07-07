"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";

import {
  Package,
  Save,
  Loader2,
  Sparkles,
  Info,
  ChevronLeft,
} from "lucide-react";


export default function EditProductPage() {

  const params = useParams();
  const router = useRouter();

  const id = params.id as string;


  const [name, setName] = useState("");
  const [stock, setStock] = useState("");

  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");

  const [unit, setUnit] = useState("Pièce");
  const [currency, setCurrency] = useState("FC");

  const [piecesPerUnit, setPiecesPerUnit] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showGuide, setShowGuide] = useState(false);



  useEffect(() => {

    if(id){
      loadProduct();
    }

  },[id]);



  async function loadProduct(){

    setLoading(true);


    const {data,error}=await supabase
      .from("products")
      .select("*")
      .eq("id",id)
      .single();



    if(error || !data){

      alert("Impossible de charger le produit");

      setLoading(false);

      return;
    }



    setName(data.name || "");

    setStock(String(data.stock ?? 0));

    setPurchasePrice(
      String(data.purchase_price ?? 0)
    );

    setSellingPrice(
      String(data.selling_price ?? 0)
    );


    setUnit(data.unit || "Pièce");

    setCurrency(data.currency || "FC");


    setPiecesPerUnit(
      String(data.pieces_per_unit ?? 1)
    );


    setLoading(false);

  }





  async function updateProduct(){


    if(!name || !stock || !sellingPrice){

      alert("Veuillez remplir les champs obligatoires");

      return;

    }


    setSaving(true);



    const pieces =
      unit !== "Pièce" && piecesPerUnit
      ? Number(piecesPerUnit)
      : 1;



    const {error}=await supabase
      .from("products")
      .update({

        name,

        stock:Number(stock),

        purchase_price:Number(purchasePrice),

        selling_price:Number(sellingPrice),

        unit,

        currency,

        pieces_per_unit:pieces,

      })

      .eq("id",id);



    setSaving(false);



    if(error){

      alert(
        "Erreur : "+error.message
      );

      return;

    }



    alert("Produit modifié avec succès ✅");


    router.push("/products");

  }



  if(loading){

    return (

      <main className="
      min-h-screen
      bg-[#081221]
      flex
      items-center
      justify-center
      text-white
      ">

        <div className="
        flex
        items-center
        gap-3
        text-slate-300
        ">

          <Loader2 className="animate-spin"/>

          Chargement du produit...

        </div>


      </main>

    );

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

        


        


      </div>



      <div className="
      relative
      z-10
      mx-auto
      max-w-xl
      ">



        {/* HEADER */}

        <div className="
        mb-7
        flex
        items-center
        justify-between
        ">


          <button
          onClick={()=>router.back()}
          className="
          flex
          items-center
          gap-2
          rounded-xl
          border
          border-white/10
          bg-white/5
          px-3
          py-2
          text-sm
          text-slate-300
          backdrop-blur
          "
          >

            <ChevronLeft size={18}/>

            Retour

          </button>



          <div className="
          flex
          items-center
          gap-2
          rounded-full
          border
          border-orange-400/30
          bg-orange-500/10
          px-4
          py-2
          text-xs
          font-semibold
          text-orange-300
          ">

            <Sparkles size={14}/>

            Stock intelligent

          </div>


        </div>





        {/* TITRE */}

        <div className="mb-7">


          <h1 className="
          text-3xl
          font-black
          tracking-tight
          ">

            Modifier 

            <span className="
            bg-gradient-to-r
            from-orange-400
            to-yellow-300
            bg-clip-text
            text-transparent
            ">

              produit

            </span>

          </h1>



          <p className="
          mt-2
          text-sm
          text-slate-400
          ">

            Mets à jour ton stock, tes prix et les informations du produit.

          </p>


        </div>





        {/* GUIDE */}

        <button

          onClick={()=>setShowGuide(!showGuide)}

          className="
          mb-4
          flex
          w-full
          items-center
          justify-between
          rounded-2xl
          border
          border-green-400/30
          bg-green-500/10
          px-5
          py-4
          text-left
          transition
          hover:bg-green-500/20
          "

        >

          <div className="
          flex
          items-center
          gap-3
          ">

            <Info 
            className="text-green-400"
            size={20}
            />


            <div>

              <p className="
              font-bold
              text-green-300
              ">

                Guide modification

              </p>


              <p className="
              text-xs
              text-slate-400
              ">

                Comprendre les champs

              </p>


            </div>


          </div>


          <span className="
          text-green-400
          text-xl
          ">

            {showGuide ? "−" : "+"}

          </span>


        </button>




        {showGuide && (

          <div className="
          mb-5
          rounded-3xl
          border
          border-white/10
          bg-white/5
          p-5
          text-sm
          text-slate-300
          backdrop-blur-xl
          ">


            <div className="
            space-y-4
            ">


              <p>

                📦 <b className="text-white">
                Stock :
                </b>

                nombre total de pièces disponibles.

              </p>



              <p>

                🏷️ <b className="text-white">
                Prix achat :
                </b>

                coût d'achat du produit.

              </p>



              <p>

                💰 <b className="text-white">
                Prix vente :
                </b>

                prix auquel tu vends une unité.

              </p>


              <p className="
              text-green-300
              ">

                Le système garde automatiquement tes données de gestion.

              </p>


            </div>


          </div>

        )}
                {/* FORMULAIRE */}

        <div className="
        rounded-3xl
        border
        border-white/10
        bg-white/5
        p-6
        shadow-2xl
        backdrop-blur-xl
        space-y-5
        ">



          {/* NOM */}

          <div>

            <label className="
            mb-2
            block
            text-xs
            font-semibold
            text-slate-400
            ">

              Nom du produit

            </label>


            <div className="
            flex
            items-center
            gap-3
            rounded-2xl
            border
            border-white/10
            bg-black/30
            px-4
            ">

              <Package
              size={18}
              className="text-orange-400"
              />


              <input

                value={name}

                onChange={(e)=>setName(e.target.value)}

                placeholder="Ex: Coca Cola"

                className="
                w-full
                bg-transparent
                py-4
                text-white
                outline-none
                placeholder:text-slate-500
                "

              />


            </div>


          </div>





          {/* STOCK */}

          <div>

            <label className="
            mb-2
            block
            text-xs
            text-slate-400
            ">

              Stock disponible

            </label>


            <input

              type="number"

              value={stock}

              onChange={(e)=>setStock(e.target.value)}

              className="
              w-full
              rounded-2xl
              border
              border-white/10
              bg-black/30
              p-4
              text-white
              outline-none
              "

              placeholder="Quantité"

            />

          </div>





          {/* PIECES PAR UNITE */}

          {unit !== "Pièce" && (

            <div>

              <label className="
              mb-2
              block
              text-xs
              text-slate-400
              ">

                Pièces dans une unité

              </label>


              <input

              type="number"

              value={piecesPerUnit}

              onChange={(e)=>setPiecesPerUnit(e.target.value)}

              className="
              w-full
              rounded-2xl
              border
              border-white/10
              bg-black/30
              p-4
              text-white
              outline-none
              "

              placeholder="Ex: 12 pièces"

              />


            </div>

          )}






          {/* PRIX */}

          <div className="
          grid
          grid-cols-2
          gap-3
          ">


            <input

            type="number"

            value={purchasePrice}

            onChange={(e)=>setPurchasePrice(e.target.value)}

            placeholder="Prix achat"

            className="
            rounded-2xl
            border
            border-white/10
            bg-black/30
            p-4
            text-white
            outline-none
            "

            />



            <input

            type="number"

            value={sellingPrice}

            onChange={(e)=>setSellingPrice(e.target.value)}

            placeholder="Prix vente"

            className="
            rounded-2xl
            border
            border-white/10
            bg-black/30
            p-4
            text-white
            outline-none
            "

            />


          </div>






          {/* TYPE + MONNAIE */}

          <div className="
          grid
          grid-cols-2
          gap-3
          ">


            <select

            value={unit}

            onChange={(e)=>setUnit(e.target.value)}

            className="
            rounded-2xl
            border
            border-white/10
            bg-black/30
            p-4
            text-white
            outline-none
            "

            >

              <option>Pièce</option>

              <option>Carton</option>

              <option>Boîte</option>

              <option>Sachet</option>

              <option>Kg</option>


            </select>





            <select

            value={currency}

            onChange={(e)=>setCurrency(e.target.value)}

            className="
            rounded-2xl
            border
            border-white/10
            bg-black/30
            p-4
            text-white
            outline-none
            "

            >

              <option value="FC">
                FC
              </option>

              <option value="$">
                USD $
              </option>


            </select>


          </div>







          {/* BUTTON */}

          <button

          onClick={updateProduct}

          disabled={saving}

          className="
          group
          flex
          w-full
          items-center
          justify-center
          gap-3
          rounded-2xl
          bg-gradient-to-r
          from-orange-500
          to-yellow-400
          py-4
          font-black
          text-black
          shadow-lg
          transition
          hover:scale-[1.02]
          disabled:opacity-50
          "

          >


            {saving ? (

              <>

              <Loader2 
              className="animate-spin"
              size={20}
              />

              Enregistrement...

              </>

            ) : (

              <>

              <Save size={20}/>

              Enregistrer les modifications

              </>

            )}



          </button>




        </div>



      </div>


    </main>

  );

}