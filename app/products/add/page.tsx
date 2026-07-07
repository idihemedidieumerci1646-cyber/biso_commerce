"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  PackagePlus,
  Sparkles,
  Lightbulb,
  Boxes,
  DollarSign,
  Loader2,
  CheckCircle,
} from "lucide-react";


export default function AddProductPage() {


  const [name,setName]=useState("");
  const [type,setType]=useState("Pièce");
  const [quantity,setQuantity]=useState("");
  const [piecesPerUnit,setPiecesPerUnit]=useState("");
  const [buyPrice,setBuyPrice]=useState("");
  const [sellPrice,setSellPrice]=useState("");
  const [currency,setCurrency]=useState("FC");
  const [loading,setLoading]=useState(false);



  const saveProduct = async()=>{


    if(!name || !quantity || !buyPrice || !sellPrice){

      alert("Veuillez remplir tous les champs");
      return;

    }



    const nPieces =
      type !== "Pièce" && piecesPerUnit
      ? Number(piecesPerUnit)
      : 1;



    const totalStock =
      Number(quantity) * nPieces;



    const unitCost =
      Number(buyPrice) / totalStock;



    const phone =
      localStorage.getItem("phone");



    if(!phone){

      alert("Utilisateur non connecté");
      return;

    }



    setLoading(true);



    const {data:user}=await supabase
      .from("users")
      .select("id")
      .eq("phone",phone)
      .single();



    if(!user){

      setLoading(false);
      return;

    }





    const {error}=await supabase
      .from("products")
      .insert({

        user_id:user.id,

        name,

        unit:type,

        stock:totalStock,

        initial_stock:totalStock,

        purchase_price:unitCost,

        selling_price:Number(sellPrice),

        currency

      });





    setLoading(false);



    if(error){

      alert(error.message);
      return;

    }



    alert("Produit ajouté avec succès ✅");



    setName("");
    setQuantity("");
    setBuyPrice("");
    setSellPrice("");
    setPiecesPerUnit("");

  };







return (

<main className="relative min-h-screen overflow-hidden bg-[#060d1b] pb-24 text-white">









<div className="relative z-10 mx-auto max-w-xl p-5">





{/* HEADER */}

<div className="mb-7">


<div className="flex items-center gap-3">


<div className="rounded-2xl bg-orange-500/20 p-3">





</div>


<h1 className="text-3xl font-black">

Nouveau produit

</h1>


</div>



<p className="mt-2 text-xs text-slate-400">

Ajoutez votre stock facilement

</p>


</div>








{/* GUIDE UTILISATEUR */}

<div className="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-white/5 p-6 backdrop-blur-xl shadow-2xl">

  {/* Glow */}
  <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
  <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />


  <div className="relative z-10">

    {/* HEADER */}
    <div className="mb-6 flex items-center gap-3">

      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20 border border-orange-400/30">
        💡
      </div>

      <div>
        <h3 className="text-xl font-black text-white">
          Guide intelligent
        </h3>

        <p className="text-xs text-slate-400">
          Comment ajouter correctement vos produits
        </p>
      </div>

    </div>



    <div className="space-y-5 text-sm text-slate-300">


      {/* ETAPE 1 */}

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">

        <h4 className="mb-3 font-bold text-orange-400">
          📦 1. Achat en carton ou boîte
        </h4>


        <p className="text-slate-300">
          Exemple : 1 carton contient 100 médicaments acheté à 
          <span className="font-bold text-white"> 20 000 FC</span>
        </p>


        <div className="mt-3 rounded-xl bg-white/5 p-3">

          <p className="text-green-400">
            ✓ Quantité : <b>1</b>
          </p>

          <p className="text-green-400">
            ✓ Pièces dans le carton : <b>100</b>
          </p>

          <p className="text-green-400">
            ✓ Prix d'achat total : <b>20 000 FC</b>
          </p>

        </div>

      </div>




      {/* ETAPE 2 */}

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">


        <h4 className="mb-3 font-bold text-blue-400">
          🛒 2. Achat à la pièce
        </h4>


        <p>
          Exemple : 10 stylos achetés ensemble à 
          <span className="font-bold text-white"> 500 FC</span>
        </p>


        <div className="mt-3 rounded-xl bg-white/5 p-3">

          <p className="text-green-400">
            ✓ Quantité : <b>10</b>
          </p>

          <p className="text-green-400">
            ✓ Prix d'achat total : <b>500 FC</b>
          </p>

        </div>


      </div>




      {/* ETAPE 3 */}

      <div className="rounded-2xl border border-orange-400/20 bg-orange-500/5 p-4">


        <h4 className="mb-3 font-bold text-yellow-300">
          💰 3. Prix de vente
        </h4>


        <p>
          Indique ici le prix auquel tu vends 
          <span className="font-bold text-white">
            {" "}une seule unité
          </span>.
        </p>


        <p className="mt-2 text-xs text-slate-400">
          Exemple : un médicament vendu à 250 FC la pièce.
        </p>


      </div>




      {/* MESSAGE FINAL */}

      <div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-4">

        <p className="text-green-300 font-semibold">

          🚀 Biso-Commerce calcule automatiquement :

        </p>


        <ul className="mt-2 space-y-1 text-xs text-slate-300">

          <li>✓ Le prix d'achat par unité</li>
          <li>✓ Votre bénéfice réel</li>
          <li>✓ La valeur de votre stock</li>

        </ul>


      </div>



    </div>


  </div>

</div>





{/* FORMULAIRE */}


<div className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 backdrop-blur-xl">






<input

value={name}

onChange={(e)=>setName(e.target.value)}

placeholder="Nom du produit"

className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none placeholder:text-slate-500"

/>







<select

value={type}

onChange={(e)=>setType(e.target.value)}

className="w-full rounded-2xl border border-white/10 bg-black/40 p-4"

>


<option>Pièce</option>

<option>Carton</option>

<option>Boîte</option>

<option>Sachet</option>

<option>Kg</option>


</select>








<input

type="number"

value={quantity}

onChange={(e)=>setQuantity(e.target.value)}

placeholder={`Nombre de ${type}(s)`}

className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none"

/>








{
type!=="Pièce" &&

<input

type="number"

value={piecesPerUnit}

onChange={(e)=>setPiecesPerUnit(e.target.value)}

placeholder="Nombre de pièces par unité"

className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none"

/>

}









<div className="grid grid-cols-2 gap-3">


<input

type="number"

value={buyPrice}

onChange={(e)=>setBuyPrice(e.target.value)}

placeholder="Prix achat total"

className="rounded-2xl border border-white/10 bg-black/40 p-4"

/>



<input

type="number"

value={sellPrice}

onChange={(e)=>setSellPrice(e.target.value)}

placeholder="Prix vente"

className="rounded-2xl border border-white/10 bg-black/40 p-4"

/>


</div>







<select

value={currency}

onChange={(e)=>setCurrency(e.target.value)}

className="w-full rounded-2xl border border-white/10 bg-black/40 p-4"

>


<option value="FC">

FC

</option>


<option value="$">

$ USD

</option>


</select>









<button

onClick={saveProduct}

disabled={loading}

className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 p-4 font-black text-black shadow-lg transition hover:scale-[1.02]"

>


{
loading ?

<>

<Loader2 className="animate-spin"/>

Ajout...

</>

:

<>

<CheckCircle/>

Ajouter le produit

</>

}


</button>



</div>



</div>


</main>


);


}