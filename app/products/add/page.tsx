"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  PackagePlus,
  Loader2,
  CheckCircle,
  Info,
  Sparkles,
  Boxes,
  Layers,
  CircleDollarSign,
  TrendingUp,
} from "lucide-react";



export default function AddProductPage() {



const [name,setName] = useState("");

const [type,setType] = useState("Pièce");

const [quantity,setQuantity] = useState("");


// nombre de pièces dans un carton / boîte / sachet
const [piecesPerUnit,setPiecesPerUnit] = useState("1");


const [buyPrice,setBuyPrice] = useState("");

const [sellPrice,setSellPrice] = useState("");

const [currency,setCurrency] = useState("FC");


const [loading,setLoading] = useState(false);



// GUIDE
const [showGuide,setShowGuide] = useState(false);




// Calcul automatique aperçu bénéfice

const totalPieces =
type !== "Pièce"
?
Number(quantity || 0) * Number(piecesPerUnit || 1)
:
Number(quantity || 0);



const pricePerPiece =
totalPieces > 0
?
Number(buyPrice || 0) / totalPieces
:
0;



const profitPerPiece =
Number(sellPrice || 0) - pricePerPiece;



const totalProfit =
profitPerPiece * totalPieces;






const saveProduct = async()=>{


if(
!name ||
!quantity ||
!buyPrice ||
!sellPrice
){

alert(
"Veuillez remplir tous les champs obligatoires"
);

return;

}






const nPieces =
type !== "Pièce"
?
Number(piecesPerUnit || 1)
:
1;





const totalStock =
Number(quantity) * nPieces;






const unitCost =
Number(buyPrice) / totalStock;






let userId:string | null =
localStorage.getItem("user_id");







if(!userId){


const phone =
localStorage.getItem("phone");



if(!phone){

alert(
"Utilisateur non connecté"
);

return;

}





const {data:user,error:userError} =
await supabase

.from("users")

.select("id")

.eq("phone",phone)

.single();






if(userError || !user){

alert(
"Utilisateur introuvable"
);

return;

}




userId = user.id;


if(userId){

  localStorage.setItem(
    "user_id",
    userId
  );

}

}  // ajoute cette ligne


setLoading(true);






const productData = {


id:crypto.randomUUID(),


user_id:userId,


name,


unit:type,


stock:totalStock,


initial_stock:totalStock,


purchase_price:unitCost,


selling_price:Number(sellPrice),


currency,


created_at:new Date().toISOString()


};






const result =
await supabase

.from("products")

.insert(productData);





if(result.error){


alert(result.error.message);

setLoading(false);

return;

}





alert(
"Produit ajouté avec succès ✅"
);




setName("");

setQuantity("");

setBuyPrice("");

setSellPrice("");

setPiecesPerUnit("1");


setLoading(false);



};
  return (

<main
className="
relative
min-h-screen
overflow-hidden
bg-[#060d1b]
pb-24
text-white
"
>


<div
className="
absolute
inset-0
pointer-events-none
bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.18),transparent_40%)]
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
rounded-2xl
bg-orange-500/20
p-3
"
>


<PackagePlus
className="text-orange-400"
/>


</div>





<h1
className="
text-3xl
font-black
"
>

Nouveau produit

</h1>



</div>






<p
className="
mt-2
text-xs
text-slate-400
"
>

Ajoutez un produit, contrôlez votre stock et connaissez votre bénéfice avec BISO-COMMERCE.

</p>



</div>









{/* GUIDE PRINCIPAL */}


<div
className="
mb-5
rounded-3xl
border
border-orange-400/20
bg-white/[0.06]
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




<div
className="
flex
items-center
gap-3
"
>



<div
className="
rounded-xl
bg-orange-500/20
p-2
"
>


<Info
size={20}
className="text-orange-400"
/>


</div>





<div>


<h3
className="
font-black
text-orange-400
"
>

Guide ajout produit

</h3>



<p
className="
mt-1
text-xs
text-slate-400
"
>

Comprendre chaque champ avant d'ajouter.

</p>


</div>


</div>







<button

onClick={()=>setShowGuide(!showGuide)}

className="
rounded-xl
bg-orange-500
px-4
py-2
text-xs
font-black
text-black
"

>


{
showGuide
?
"Fermer"
:
"Voir"
}


</button>



</div>



</div>









{showGuide && (


<div
className="
mb-6
rounded-3xl
border
border-orange-400/20
bg-white/5
p-6
backdrop-blur-xl
"
>



<h2
className="
mb-5
flex
items-center
gap-2
text-xl
font-black
text-orange-400
"
>


<Sparkles size={20}/>

Comment ajouter un produit ?

</h2>






<div
className="
space-y-4
text-sm
text-slate-300
"
>






<div
className="
rounded-2xl
bg-black/30
p-4
"
>


<h3
className="
font-bold
text-white
"
>

1️⃣ Nom du produit

</h3>


<p
className="
mt-2
text-xs
leading-5
"
>

C'est le nom que l'utilisateur utilisera pour reconnaître facilement le produit dans son stock.

Choisissez un nom clair et facile à retrouver.


<br/><br/>

Exemple :

<br/>

• Coca Cola 33cl

<br/>

• Paracétamol 500mg

<br/>

• Riz 25kg


</p>


</div>








<div
className="
rounded-2xl
bg-black/30
p-4
"
>


<h3
className="
font-bold
text-white
"
>

2️⃣ Type d'unité

</h3>


<p
className="
mt-2
text-xs
leading-5
"
>


Choisissez comment vous achetez votre produit.


<br/><br/>


<b className="text-orange-300">
Pièce :
</b>

Un seul article.


<br/>

Exemple : 1 téléphone.


<br/><br/>


<b className="text-orange-300">
Carton :
</b>

Un emballage qui contient plusieurs pièces.


<br/>

Exemple : 1 carton = 24 bouteilles.


<br/><br/>


<b className="text-orange-300">
Boîte / Sachet :
</b>

À utiliser selon votre manière d'acheter ou vendre.


</p>


</div>
<div
className="
rounded-2xl
bg-black/30
p-4
"
>


<h3
className="
font-bold
text-white
"
>

3️⃣ Quantité achetée

</h3>



<p
className="
mt-2
text-xs
leading-5
"
>

Indiquez combien d'unités vous avez achetées.


<br/><br/>


Exemple :

<br/>


Vous achetez :

<br/>

📦 5 cartons de boissons


<br/><br/>


Écrivez :

<br/>

Quantité = 5


<br/><br/>


Si chaque carton contient 24 bouteilles :


<br/>

Nombre de pièces = 24


<br/><br/>


BISO-COMMERCE calcule automatiquement :


<br/><br/>


5 cartons × 24 bouteilles


<br/>


= 120 bouteilles en stock


</p>


</div>








<div
className="
rounded-2xl
bg-black/30
p-4
"
>


<h3
className="
font-bold
text-white
"
>

4️⃣ Nombre de pièces dans une unité

</h3>



<p
className="
mt-2
text-xs
leading-5
"
>


Ce champ apparaît seulement pour :

<br/>


<b className="text-orange-300">
Carton, Boîte, Sachet
</b>


<br/><br/>


Il indique combien de petites pièces sont contenues dans votre emballage.


<br/><br/>


Exemples :


<br/><br/>


📦 1 carton = 24 bouteilles


<br/>

➡️ Écrire : 24


<br/><br/>


💊 1 boîte = 100 comprimés


<br/>

➡️ Écrire : 100


<br/><br/>


Le système transforme automatiquement votre achat en stock réel.


</p>


</div>








<div
className="
rounded-2xl
bg-black/30
p-4
"
>


<h3
className="
font-bold
text-white
"
>

5️⃣ Prix d'achat

</h3>




<p
className="
mt-2
text-xs
leading-5
"
>


Entrez combien vous avez payé au fournisseur.


<br/><br/>


Exemple :


<br/>


Vous achetez 5 cartons pour 100 000 FC.


<br/><br/>


Prix achat total = 100 000 FC


<br/><br/>


BISO-COMMERCE calcule automatiquement le coût d'une pièce.


</p>


</div>









<div
className="
rounded-2xl
bg-black/30
p-4
"
>


<h3
className="
font-bold
text-white
"
>

6️⃣ Prix de vente

</h3>



<p
className="
mt-2
text-xs
leading-5
"
>


C'est le prix auquel l'utilisateur vend une pièce à ses clients.


<br/><br/>


Exemple :


<br/>


Une bouteille est vendue à 2 000 FC.


<br/><br/>


Prix vente = 2 000 FC


<br/><br/>


Ce prix permet de calculer automatiquement votre bénéfice.


</p>


</div>









<div
className="
rounded-2xl
border
border-green-400/20
bg-green-500/10
p-4
"
>


<h3
className="
flex
items-center
gap-2
font-bold
text-green-300
"
>


<TrendingUp size={18}/>

Bénéfice automatique


</h3>




<p
className="
mt-2
text-xs
leading-5
"
>


Après avoir rempli les prix, BISO-COMMERCE calcule :


<br/><br/>


✅ Le coût réel d'une pièce


<br/>

✅ Le bénéfice par pièce


<br/>

✅ Le bénéfice potentiel sur tout le stock


<br/><br/>


Exemple :


<br/><br/>


Achat d'une bouteille : 1 500 FC


<br/>

Vente : 2 000 FC


<br/>


Bénéfice : 500 FC par bouteille


<br/><br/>


Si vous avez 100 bouteilles :


<br/>


500 × 100 = 50 000 FC de bénéfice potentiel


</p>


</div>







</div>


{/* BOUTON FERMER GUIDE EN BAS */}

<button

onClick={()=>setShowGuide(false)}

className="
mt-6
w-full
rounded-2xl
bg-orange-500
p-4
font-black
text-black
transition
hover:scale-[1.02]
"

>

Fermer le guide

</button>


</div>


)}
{/* FORMULAIRE */}


<div
className="
space-y-4
rounded-[2rem]
border
border-white/10
bg-white/[0.07]
p-6
backdrop-blur-xl
"
>






{/* NOM PRODUIT */}


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



<input

value={name}

onChange={(e)=>setName(e.target.value)}

placeholder="Nom du produit dans votre gestion de stock"

className="
w-full
rounded-2xl
border
border-white/10
bg-black/40
p-4
outline-none
placeholder:text-slate-500
"

/>


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
bg-black/40
px-4
"
>


<Boxes
size={18}
className="text-orange-400"
/>



<select

value={type}

onChange={(e)=>setType(e.target.value)}

className="
w-full
bg-[#111827]
text-white
py-4
outline-none
rounded-xl
"

>


<option value="Pièce">
Pièce
</option>


<option value="Carton">
Carton
</option>


<option value="Boîte">
Boîte
</option>


<option value="Sachet">
Sachet
</option>


<option value="Kg">
Kg
</option>


</select>



</div>


</div>









{/* QUANTITE */}



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

value={quantity}

onChange={(e)=>setQuantity(e.target.value)}

placeholder={`Nombre de ${type}(s)`}

className="
w-full
rounded-2xl
border
border-white/10
bg-black/40
p-4
outline-none
"

/>


</div>









{/* PIECES PAR UNITE */}



{
type !== "Pièce" && (


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

Nombre de pièces dans {type}

</label>



<div
className="
flex
items-center
gap-3
rounded-2xl
border
border-white/10
bg-black/40
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

onChange={(e)=>setPiecesPerUnit(e.target.value)}

placeholder="Exemple : 24"

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

Exemple : 1 carton de boissons = 24 bouteilles

</p>



</div>



)

}









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

Prix achat total

</label>


<input

type="number"

value={buyPrice}

onChange={(e)=>setBuyPrice(e.target.value)}

placeholder="Ex: 100000"

className="
w-full
rounded-2xl
border
border-white/10
bg-black/40
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

Prix vente unité

</label>



<input

type="number"

value={sellPrice}

onChange={(e)=>setSellPrice(e.target.value)}

placeholder="Ex: 2000"

className="
w-full
rounded-2xl
border
border-white/10
bg-black/40
p-4
outline-none
"

/>



</div>



</div>









{/* MONNAIE */}



<select

value={currency}

onChange={(e)=>setCurrency(e.target.value)}

className="
w-full
rounded-2xl
border
border-white/10
bg-[#111827]
p-4
text-white
outline-none
"

>


<option value="FC">

Franc Congolais (FC)

</option>



<option value="$">

Dollar ($)

</option>



</select>








{/* RESUME AUTOMATIQUE */}



<div
className="
rounded-3xl
border
border-green-400/20
bg-green-500/10
p-5
"
>


<p
className="
mb-4
font-black
text-green-300
"
>

📊 Résumé automatique

</p>



<div
className="
space-y-2
text-sm
text-slate-300
"
>


<p>

Stock réel :

<span className="ml-2 font-bold text-white">

{totalPieces}

pièces

</span>

</p>




<p>

Coût par pièce :

<span className="ml-2 font-bold text-white">

{Math.round(pricePerPiece)}

{currency}

</span>

</p>




<p>

Bénéfice par pièce :

<span className="ml-2 font-bold text-green-300">

{Math.round(profitPerPiece)}

{currency}

</span>

</p>




<p>

Bénéfice potentiel total :

<span className="ml-2 font-bold text-green-300">

{Math.round(totalProfit)}

{currency}

</span>

</p>



</div>


</div>
{/* VERIFICATION AVANT AJOUT */}


<div
className="
rounded-2xl
border
border-blue-400/20
bg-blue-500/10
p-4
"
>


<p
className="
font-black
text-blue-300
"
>

📌 Vérification avant ajout

</p>



<ul
className="
mt-3
space-y-2
text-xs
text-slate-300
"
>


<li>
✅ Le nom du produit est correct pour votre gestion.
</li>


<li>
✅ Le type d'unité correspond à votre façon d'acheter le produit.
</li>


<li>
✅ La quantité correspond à votre stock réel.
</li>


<li>
✅ Le prix d'achat correspond au montant payé au fournisseur.
</li>


<li>
✅ Le prix de vente correspond au prix que vous appliquez aux clients.
</li>


<li>
✅ BISO-COMMERCE calcule automatiquement votre bénéfice.
</li>



</ul>


</div>









{/* BOUTON AJOUT */}



<button

onClick={saveProduct}

disabled={loading}

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
p-4
font-black
text-black
shadow-xl
transition
hover:scale-[1.02]
disabled:opacity-50
"

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