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
  Boxes,
  CircleDollarSign,
  Layers,
} from "lucide-react";


export default function EditProductPage() {


  const params = useParams();
  const router = useRouter();

  const id = params.id as string;



  const [name,setName] = useState("");

  // quantité entrée par l'utilisateur
  const [stock,setStock] = useState("");

  // nombre de pièces dans carton/boite/sachet
  const [piecesPerUnit,setPiecesPerUnit] = useState("1");


  const [purchasePrice,setPurchasePrice] = useState("");

  const [sellingPrice,setSellingPrice] = useState("");


  const [unit,setUnit] = useState("Pièce");

  const [currency,setCurrency] = useState("FC");



  const [loading,setLoading] = useState(true);

  const [saving,setSaving] = useState(false);


  const [showGuide,setShowGuide] = useState(false);





  useEffect(()=>{

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

    setPurchasePrice(
      String(data.purchase_price ?? 0)
    );


    setSellingPrice(
      String(data.selling_price ?? 0)
    );


    setCurrency(
      data.currency || "FC"
    );



    setUnit(
      data.unit || "Pièce"
    );



    setPiecesPerUnit(
      String(data.pieces_per_unit ?? 1)
    );



    /*
      On garde le fonctionnement intelligent :

      Exemple :
      5 cartons × 12 bouteilles = 60 bouteilles en stock

      On affiche ici la quantité en unité commerciale
      pour que l'utilisateur comprenne.
    */


    if(
      data.unit &&
      data.unit !== "Pièce" &&
      data.pieces_per_unit
    ){

      setStock(
        String(
          Number(data.stock) /
          Number(data.pieces_per_unit)
        )
      );


    }else{


      setStock(
        String(data.stock ?? 0)
      );


    }





    setLoading(false);


  }






  async function updateProduct(){


    if(!name || !stock || !sellingPrice){


      alert(
        "Veuillez remplir les champs obligatoires"
      );


      return;

    }



    setSaving(true);




    const pieces =

      unit !== "Pièce"

      ? Number(piecesPerUnit) || 1

      : 1;






    // conversion en stock réel

    const totalStock =

      unit !== "Pièce"

      ? Number(stock) * pieces

      : Number(stock);






    const {error}=await supabase

      .from("products")

      .update({

        name,


        stock:totalStock,


        purchase_price:
        Number(purchasePrice),


        selling_price:
        Number(sellingPrice),


        unit,


        currency,


        pieces_per_unit:
        pieces,


      })

      .eq("id",id);





    setSaving(false);




    if(error){


      alert(
        "Erreur : "+error.message
      );


      return;


    }





    alert(
      "Produit modifié avec succès ✅"
    );


    router.push("/products");


  }





  if(loading){


    return (

      <main
      className="
      min-h-screen
      bg-[#081221]
      flex
      items-center
      justify-center
      text-white
      "
      >

        <div
        className="
        flex
        items-center
        gap-3
        text-slate-300
        "
        >

          <Loader2
          className="animate-spin"
          />

          Chargement du produit...

        </div>


      </main>

    );


  }
    return (

    <main
    className="
    relative
    min-h-screen
    overflow-hidden
    bg-[#081221]
    text-white
    px-4
    py-6
    pb-24
    "
    >



      {/* LUMIERE ARRIERE */}

      <div
      className="
      pointer-events-none
      absolute
      inset-0
      bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.18),transparent_40%)]
      "
      />




      <div
      className="
      relative
      z-10
      mx-auto
      max-w-xl
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
          "

          >

            <ChevronLeft size={18}/>

            Retour

          </button>






          <div
          className="
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
          font-bold
          text-orange-300
          "
          >

            <Sparkles size={14}/>

            Stock intelligent

          </div>


        </div>







        {/* TITRE */}


        <div
        className="
        mb-7
        "
        >


          <h1
          className="
          text-3xl
          font-black
          "
          >

            Modifier

            <span
            className="
            ml-2
            bg-gradient-to-r
            from-orange-400
            to-yellow-300
            bg-clip-text
            text-transparent
            "
            >

              produit

            </span>


          </h1>



          <p
          className="
          mt-2
          text-sm
          text-slate-400
          "
          >

            Modifie le stock, les prix et les informations de ton produit.

          </p>


        </div>








        {/* GUIDE INTELLIGENT */}


        <button

        onClick={()=>setShowGuide(!showGuide)}

        className="
        mb-4
        flex
        w-full
        items-center
        justify-between
        rounded-3xl
        border
        border-green-400/30
        bg-green-500/10
        px-5
        py-4
        transition
        hover:bg-green-500/20
        "

        >


          <div
          className="
          flex
          items-center
          gap-3
          "
          >

            <Info
            size={22}
            className="text-green-400"
            />



            <div>


              <p
              className="
              font-black
              text-green-300
              "
              >

                Comment modifier ?

              </p>


              <p
              className="
              text-xs
              text-slate-400
              "
              >

                Guide simple pour éviter les erreurs

              </p>


            </div>


          </div>



          <span
          className="
          text-xl
          text-green-300
          "
          >

            {showGuide ? "−" : "+"}

          </span>


        </button>








        {showGuide && (

          <div
          className="
          mb-5
          rounded-3xl
          border
          border-white/10
          bg-white/5
          p-5
          text-sm
          text-slate-300
          backdrop-blur-xl
          space-y-4
          "
          >



            <p>

              📦 <b className="text-white">
              Nom produit :
              </b>

              le nom qui permet de reconnaître facilement le produit dans votre stock

            </p>




            <p>

              🔢 <b className="text-white">
              Stock :
              </b>

              Mets combien tu as acheté ou combien tu as en réserve.

            </p>




            <p>

              📦 <b className="text-white">
              Carton / boîte / sachet :
              </b>

              Si un carton contient plusieurs pièces,
              indique le nombre ici.

            </p>




            <p
            className="text-orange-300"
            >

              Exemple :
              5 cartons × 12 bouteilles = 60 bouteilles dans le stock.

            </p>





            <p>

              💰 <b className="text-white">
              Prix achat :
              </b>

              Prix payé pour acheter le produit.

            </p>





            <p>

              💵 <b className="text-white">
              Prix vente :
              </b>

              Prix auquel tu vends aux clients.

            </p>





            <p
            className="
            text-green-300
            font-semibold
            "
            >

              BISO-COMMERCE calcule automatiquement le vrai stock.

            </p>



          </div>

        )}
                {/* FORMULAIRE PRODUIT */}


        <div
        className="
        rounded-3xl
        border
        border-white/10
        bg-white/5
        p-6
        shadow-2xl
        backdrop-blur-xl
        space-y-5
        "
        >





          {/* NOM DU PRODUIT */}


          <div>


            <label
            className="
            mb-2
            block
            text-xs
            font-bold
            text-slate-400
            "
            >

              Nom du produit

            </label>




            <div
            className="
            flex
            items-center
            gap-3
            rounded-2xl
            border
            border-white/10
            bg-black/30
            px-4
            "
            >


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
              outline-none
              placeholder:text-slate-500
              "

              />


            </div>


          </div>







          {/* TYPE UNITE */}


          <div>


            <label
            className="
            mb-2
            block
            text-xs
            font-bold
            text-slate-400
            "
            >

              Type d'unité

            </label>



            <div
            className="
            flex
            items-center
            gap-3
            rounded-2xl
            border
            border-white/10
            bg-black/30
            px-4
            "
            >


              <Boxes
              size={18}
              className="text-orange-400"
              />



              <select
value={unit}
onChange={(e)=>setUnit(e.target.value)}
className="
w-full
bg-[#111827]
text-white
py-4
outline-none
rounded-xl
"
>

             

                <option>
                  Pièce
                </option>


                <option>
                  Carton
                </option>


                <option>
                  Boîte
                </option>


                <option>
                  Sachet
                </option>


                <option>
                  Kg
                </option>


              </select>


            </div>


          </div>







          {/* NOMBRE PIECES PAR UNITE */}



          {unit !== "Pièce" && (


            <div>


              <label
              className="
              mb-2
              block
              text-xs
              font-bold
              text-slate-400
              "
              >

                Nombre de pièces dans {unit}

              </label>



              <div
              className="
              flex
              items-center
              gap-3
              rounded-2xl
              border
              border-white/10
              bg-black/30
              px-4
              "
              >

                <Layers
                size={18}
                className="text-orange-400"
                />


                <input


                type="number"


                value={piecesPerUnit}


                onChange={(e)=>
                  setPiecesPerUnit(e.target.value)
                }


                placeholder="Ex: 12"


                className="
                w-full
                bg-transparent
                py-4
                outline-none
                "


                />


              </div>





              <p
              className="
              mt-2
              text-xs
              text-orange-300
              "
              >

                Exemple : 1 carton contient 12 pièces.

              </p>


            </div>


          )}








          {/* STOCK */}



          <div>


            <label
            className="
            mb-2
            block
            text-xs
            font-bold
            text-slate-400
            "
            >

              Quantité disponible

            </label>



            <input


            type="number"


            value={stock}


            onChange={(e)=>setStock(e.target.value)}


            placeholder="Ex: 5"


            className="
            w-full
            rounded-2xl
            border
            border-white/10
            bg-black/30
            p-4
            outline-none
            "


            />



            {unit !== "Pièce" && (

              <p
              className="
              mt-2
              text-xs
              text-green-300
              "
              >

                Stock réel :
                {" "}
                {Number(stock || 0) *
                Number(piecesPerUnit || 1)}
                {" "}
                pièces

              </p>

            )}


          </div>







          {/* PRIX */}



          <div
          className="
          grid
          grid-cols-2
          gap-3
          "
          >


            <div>


              <label
              className="
              mb-2
              block
              text-xs
              text-slate-400
              "
              >

                Prix achat

              </label>


              <input

              type="number"

              value={purchasePrice}

              onChange={(e)=>
                setPurchasePrice(e.target.value)
              }

              className="
              w-full
              rounded-2xl
              border
              border-white/10
              bg-black/30
              p-4
              outline-none
              "

              />

            </div>





            <div>


              <label
              className="
              mb-2
              block
              text-xs
              text-slate-400
              "
              >

                Prix vente

              </label>



              <input

              type="number"

              value={sellingPrice}

              onChange={(e)=>
                setSellingPrice(e.target.value)
              }


              className="
              w-full
              rounded-2xl
              border
              border-white/10
              bg-black/30
              p-4
              outline-none
              "


              />


            </div>



          </div>
                    {/* MONNAIE */}


          <div>


            <label
            className="
            mb-2
            block
            text-xs
            font-bold
            text-slate-400
            "
            >

              Monnaie

            </label>



            <select


            value={currency}


            onChange={(e)=>setCurrency(e.target.value)}


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

            >


              <option value="FC">
                FC - Franc Congolais
              </option>



              <option value="$">
                USD $
              </option>



            </select>



          </div>







          {/* RESUME AUTOMATIQUE */}


          <div
          className="
          rounded-3xl
          border
          border-blue-400/20
          bg-blue-500/10
          p-5
          "
          >



            <p
            className="
            mb-3
            font-black
            text-blue-300
            "
            >

              Résumé du produit

            </p>




            <div
            className="
            space-y-2
            text-sm
            text-slate-300
            "
            >


              <p>

                Produit :
                <span className="ml-2 font-bold text-white">
                  {name || "Sans nom"}
                </span>

              </p>




              <p>

                Stock :
                <span className="ml-2 font-bold text-white">

                  {unit === "Pièce"
                  ? stock
                  :
                  Number(stock || 0) *
                  Number(piecesPerUnit || 1)
                  }

                  {" "}
                  pièces

                </span>

              </p>





              <p>

                Marge par pièce :

                <span
                className="
                ml-2
                font-bold
                text-green-300
                "
                >

                {
                Number(sellingPrice || 0)
                -
                Number(purchasePrice || 0)
                }

                {" "}
                {currency}

                </span>


              </p>



            </div>


          </div>









          {/* BOUTON SAUVEGARDE */}



          <button


          onClick={updateProduct}


          disabled={saving}



          className="
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
                size={20}
                className="animate-spin"
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