"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  PackagePlus,
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


  // OUVRIR / FERMER LE GUIDE
  const [showGuide,setShowGuide]=useState(false);



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


<PackagePlus
className="text-orange-400"
/>


</div>


<h1 className="text-3xl font-black">

Nouveau produit

</h1>


</div>



<p className="mt-2 text-xs text-slate-400">

Ajoutez votre stock facilement avec BISO-COMMERCE

</p>


</div>




{/* BOUTON GUIDE */}

<div className="mb-5 rounded-3xl border border-orange-400/20 bg-white/[0.06] p-5 backdrop-blur-xl">


<div className="flex items-center justify-between">


<div>

<h3 className="font-black text-orange-400">

💡 Guide ajout produit

</h3>


<p className="mt-1 text-xs text-slate-400">

Découvrez comment remplir correctement les informations

</p>


</div>



<button

onClick={()=>setShowGuide(!showGuide)}

className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-black"

>


{
showGuide
?
"Fermer"
:
"Voir le guide"
}


</button>


</div>


</div>





{/* GUIDE OUVERT */}

{
showGuide && (

<div className="mb-6 rounded-3xl border border-orange-500/30 bg-white/5 p-6 backdrop-blur-xl">


<h2 className="mb-5 text-xl font-black text-orange-400">

📦 Comment ajouter un produit ?

</h2>


<div className="space-y-4 text-sm text-slate-300">



<div className="rounded-2xl bg-black/30 p-4">

<h3 className="font-bold text-white">

1️⃣ Nom du produit

</h3>


<p className="mt-2 text-xs">

Écrivez le nom exact du produit.

Exemple :
Paracétamol, Riz, Savon, Téléphone...

</p>

</div>




<div className="rounded-2xl bg-black/30 p-4">

<h3 className="font-bold text-white">

2️⃣ Choisir le type

</h3>


<p className="mt-2 text-xs">

Choisissez comment vous achetez votre produit :

<br/>

• Pièce = vous achetez directement une unité.

<br/>

• Carton / Boîte / Sachet = vous achetez plusieurs pièces ensemble.

</p>

</div>




<div className="rounded-2xl bg-black/30 p-4">

<h3 className="font-bold text-white">

3️⃣ Quantité achetée

</h3>


<p className="mt-2 text-xs">

Exemple :

Vous achetez 2 cartons → écrivez 2.

Si vous achetez 20 pièces → écrivez 20.

</p>

</div>



</div>


</div>

)

}
{
showGuide && (

<div className="mb-6 rounded-3xl border border-orange-500/30 bg-white/5 p-6 backdrop-blur-xl">


<div className="space-y-4 text-sm text-slate-300">



<div className="rounded-2xl bg-black/30 p-4">


<h3 className="font-bold text-white">

4️⃣ Nombre de pièces dans une boîte ou un carton

</h3>


<p className="mt-2 text-xs">

Cette partie apparaît seulement si vous choisissez :

Carton, Boîte, Sachet ou Kg.

<br/><br/>

Exemple :

Vous achetez 1 carton contenant 100 bouteilles.

Vous écrivez :

<br/>

Quantité : <b className="text-green-400">1</b>

<br/>

Pièces par unité : <b className="text-green-400">100</b>


<br/><br/>

BISO-COMMERCE va automatiquement créer un stock de :

<b className="text-orange-400">
100 pièces
</b>

</p>


</div>





<div className="rounded-2xl bg-black/30 p-4">


<h3 className="font-bold text-white">

5️⃣ Prix d'achat total

</h3>


<p className="mt-2 text-xs">

Entrez combien vous avez payé pour acheter ce stock complet.

<br/><br/>

Exemple :

1 carton acheté à :

<b className="text-green-400">
20 000 FC
</b>


<br/><br/>

Vous écrivez :

<b className="text-orange-400">
20 000
</b>


</p>


</div>






<div className="rounded-2xl bg-black/30 p-4">


<h3 className="font-bold text-white">

6️⃣ Prix de vente

</h3>


<p className="mt-2 text-xs">


Écrivez le prix auquel vous vendez une seule pièce.

<br/><br/>

Exemple :

Vous achetez une boîte de médicaments et vous vendez chaque comprimé à :

<b className="text-green-400">
500 FC
</b>


</p>


</div>







<div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-4">


<h3 className="font-bold text-green-400">

🚀 Calcul automatique BISO-COMMERCE

</h3>


<p className="mt-2 text-xs">

Après l'ajout du produit, l'application calcule automatiquement :

</p>


<ul className="mt-3 space-y-2 text-xs">


<li>
✅ Le nombre total d'unités disponibles
</li>


<li>
✅ Le prix d'achat par unité
</li>


<li>
✅ La valeur de votre stock
</li>


<li>
✅ Votre bénéfice pendant les ventes
</li>


</ul>


</div>



</div>


</div>

)

}






{/* FORMULAIRE AJOUT PRODUIT */}


<div className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 backdrop-blur-xl">






<input

value={name}

onChange={(e)=>setName(e.target.value)}

placeholder="Nom du produit (ex: Paracétamol)"

className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none placeholder:text-slate-500"

/>







<select

value={type}

onChange={(e)=>setType(e.target.value)}

className="w-full rounded-2xl border border-white/10 bg-black/40 p-4"

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








<input

type="number"

value={quantity}

onChange={(e)=>setQuantity(e.target.value)}

placeholder={`Nombre de ${type}(s)`}

className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none placeholder:text-slate-500"

/>







{
type!=="Pièce" &&

<input

type="number"

value={piecesPerUnit}

onChange={(e)=>setPiecesPerUnit(e.target.value)}

placeholder="Nombre de pièces dans une unité"

className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none placeholder:text-slate-500"

/>

}





{/* PRIX */}

<div className="grid grid-cols-2 gap-3">



<input

type="number"

value={buyPrice}

onChange={(e)=>setBuyPrice(e.target.value)}

placeholder="Prix achat total"

className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none placeholder:text-slate-500"

/>





<input

type="number"

value={sellPrice}

onChange={(e)=>setSellPrice(e.target.value)}

placeholder="Prix vente par unité"

className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none placeholder:text-slate-500"

/>



</div>






<select

value={currency}

onChange={(e)=>setCurrency(e.target.value)}

className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none"

>



<option value="FC">

Franc Congolais (FC)

</option>



<option value="$">

Dollar ($)

</option>



</select>







{/* EXPLICATION AVANT AJOUT */}

<div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">


<p className="text-sm font-bold text-blue-300">

📌 Vérification avant d'ajouter

</p>


<ul className="mt-3 space-y-2 text-xs text-slate-300">


<li>
✅ Le nom du produit doit être correct
</li>


<li>
✅ La quantité doit correspondre à votre achat
</li>


<li>
✅ Le prix d'achat doit être le montant total payé
</li>


<li>
✅ Le prix de vente doit être le prix d'une seule unité
</li>


</ul>


</div>








{/* BOUTON AJOUT */}


<button

onClick={saveProduct}

disabled={loading}

className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 p-4 font-black text-black shadow-lg transition hover:scale-[1.02]"

>



{

loading

?

<>

<Loader2

className="animate-spin"

/>

Ajout du produit...

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
