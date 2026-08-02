"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  Search,
  ShoppingCart,
  Package,
  Sparkles,
  CheckCircle,
  Plus,
  Minus,
   TrendingUp,
  AlertTriangle,
} from "lucide-react";


type Product = {

  id:string;

  name:string;

  stock:number;

  initial_stock:number;

  purchase_price:number;

  selling_price:number;

  currency:string;

  pieces_per_unit:number;

};





export default function SalesPage(){


const [products,setProducts]=useState<Product[]>([]);

const [productId,setProductId]=useState("");

const [searchTerm,setSearchTerm]=useState("");

const [quantity,setQuantity]=useState("");

const [loading,setLoading]=useState(false);


const [showGuide,setShowGuide]=useState(false);


const [showSuccess,setShowSuccess]=useState(false);







useEffect(()=>{

loadProducts();

},[]);









// CHARGER LES PRODUITS

const loadProducts = async()=>{


try{


const userId =
localStorage.getItem("user_id");



if(!userId)
return;





if(navigator.onLine){



const {data,error}=await supabase

.from("products")

.select("*")

.eq("user_id",userId)

.order("name");




if(!error && data){

setProducts(data);

}


}



}catch(error){

console.log(error);

}



};









const selectedProduct =

products.find(

(p)=>p.id===productId

);









const filteredProducts =

products.filter((p)=>


p.name

.toLowerCase()

.includes(

searchTerm.toLowerCase()

)

);










const increaseQty=()=>{


setQuantity(

String(

Number(quantity || 0)+1

)

);


};










const decreaseQty=()=>{


const value =

Number(quantity || 0);



if(value>1){


setQuantity(

String(value-1)

);


}


};






const totalPreview =

selectedProduct

?

selectedProduct.selling_price *

Number(quantity || 0)

:

0;






const profitPreview =

selectedProduct

?

(
selectedProduct.selling_price -

selectedProduct.purchase_price

)

*

Number(quantity || 0)

:

0;






const stockAfterSale =

selectedProduct

?

selectedProduct.stock -

Number(quantity || 0)

:

0;
const saveSale = async()=>{


if(!selectedProduct || !quantity){


alert(
"Sélectionnez un produit et une quantité avant de continuer."
);


return;

}





const qty = Number(quantity);





if(qty <= 0){


alert(
"La quantité doit être supérieure à zéro."
);


return;

}





if(qty > selectedProduct.stock){


alert(
`Stock insuffisant !\nDisponible : ${selectedProduct.stock}`
);


return;

}






const userId =

localStorage.getItem("user_id");





if(!userId){


alert(
"Utilisateur non connecté"
);


return;

}





setLoading(true);





const prixVente =

Number(selectedProduct.selling_price);



const prixAchat =

Number(selectedProduct.purchase_price);





const totalSale =

prixVente * qty;





const profit =

(prixVente - prixAchat) * qty;








const saleData = {


id:crypto.randomUUID(),


user_id:userId,


product_id:selectedProduct.id,


product_name:selectedProduct.name,


quantity:qty,


purchase_price:prixAchat,


selling_price:prixVente,


total_sale:totalSale,


profit:profit,


currency:selectedProduct.currency,


created_at:new Date().toISOString().slice(0,19)


};










if(!navigator.onLine){


setLoading(false);


alert(
"Pas de connexion Internet."
);


return;

}








// ENREGISTRER LA VENTE


const {error}=await supabase

.from("sales")

.insert(saleData);





if(error){


setLoading(false);


alert(error.message);


return;

}








// DIMINUER LE STOCK


const nouveauStock =

selectedProduct.stock - qty;





const {error:updateError}=await supabase

.from("products")

.update({

stock:nouveauStock

})

.eq(

"id",

selectedProduct.id

)

.eq(

"user_id",

userId

);






if(updateError){


setLoading(false);


alert(updateError.message);


return;

}









// STOCK PRESQUE VIDE


if(nouveauStock <= 5){


alert(

`⚠️ Attention !\n\n${selectedProduct.name} est presque épuisé.\nStock restant : ${nouveauStock}`

);


}







// OUVRIR MESSAGE SUCCÈS


setShowSuccess(true);






setLoading(false);





setQuantity("");

setProductId("");

setSearchTerm("");



loadProducts();



};
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
pb-28
"
>


<div
className="
relative
z-10
max-w-xl
mx-auto
"
>





{/* HEADER */}


<div
className="
flex
items-center
justify-between
mb-6
"
>


<div>


<h1
className="
text-3xl
font-black
tracking-tight
"
>

💰 Caisse

<span
className="
text-orange-400
"
>

 vente

</span>

</h1>



<p
className="
text-sm
text-slate-400
mt-1
"
>

Enregistrez vos ventes rapidement avec BISO-COMMERCE

</p>


</div>






<button

onClick={()=>setShowGuide(!showGuide)}

className="
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


<Sparkles
size={14}
className="inline mr-1"
/>


{

showGuide

?

"Fermer"

:

"Guide"

}


</button>



</div>









{/* GUIDE */}



{

showGuide && (


<div
className="
mb-5
rounded-3xl
border
border-orange-400/20
bg-white/5
p-5
backdrop-blur-xl
shadow-xl
"
>




<div
className="
flex
items-center
gap-2
mb-5
"
>


<Sparkles
className="text-orange-400"
/>


<h2
className="
font-bold
text-orange-300
"
>

Guide de vente BISO-COMMERCE

</h2>


</div>








<div
className="
space-y-3
text-sm
text-slate-300
"
>




<div
className="
rounded-2xl
bg-black/30
p-4
border
border-white/10
"
>


<h3
className="
font-bold
text-white
mb-2
"
>

1️⃣ Rechercher un produit

</h3>


<p>

Cherchez le produit dans votre stock puis sélectionnez-le.

</p>


</div>







<div
className="
rounded-2xl
bg-black/30
p-4
border
border-white/10
"
>


<h3
className="
font-bold
text-white
mb-2
"
>

2️⃣ Choisir la quantité

</h3>


<p>

Indiquez combien de produits vous vendez.

Le système vérifie automatiquement le stock disponible.

</p>


</div>








<div
className="
rounded-2xl
bg-black/30
p-4
border
border-white/10
"
>


<h3
className="
font-bold
text-white
mb-2
"
>

3️⃣ Vérifier le résumé

</h3>


<ul
className="
text-xs
space-y-1
"
>


<li>
✅ Montant total de la vente
</li>


<li>
✅ Bénéfice estimé
</li>


<li>
✅ Stock restant
</li>


</ul>


</div>









<div
className="
rounded-2xl
bg-orange-500/10
border
border-orange-400/30
p-4
"
>


<h3
className="
font-bold
text-orange-200
"
>

4️⃣ Valider la vente

</h3>


<p>

Cliquez sur "Valider la vente".

BISO-COMMERCE enregistre automatiquement :

</p>



<ul
className="
mt-2
text-xs
space-y-1
"
>


<li>
✅ La vente
</li>


<li>
✅ Le bénéfice
</li>


<li>
✅ La diminution du stock
</li>


<li>
✅ La mise à jour du Dashboard
</li>


</ul>


</div>









<div
className="
rounded-2xl
bg-green-500/10
border
border-green-400/30
p-4
"
>


<h3
className="
font-bold
text-green-300
"
>

5️⃣ Après la vente

</h3>


<p>

Un message de succès apparaît.

Cliquez sur OK pour aller automatiquement au Dashboard.

</p>


</div>









{/* BOUTON FERMER EN BAS */}


<button

onClick={()=>setShowGuide(false)}

className="
mt-5
w-full
rounded-2xl
bg-orange-500
py-3
font-black
text-black
"

>

Fermer le guide

</button>





</div>


</div>


)

}
{/* CARTE CAISSE */}


<div
className="
rounded-3xl
border
border-white/10
bg-white/5
p-5
backdrop-blur-xl
shadow-2xl
space-y-5
"
>









{/* RECHERCHE PRODUIT */}



<div>


<label
className="
text-xs
text-slate-400
mb-2
block
"
>

Produit

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


<Search
size={18}
className="text-orange-400"
/>





<input


value={searchTerm}


onChange={(e)=>{


setSearchTerm(e.target.value);

setProductId("");

}}



placeholder="Rechercher un produit..."



className="
w-full
bg-transparent
py-3
outline-none
text-white
placeholder:text-slate-500
"

/>



</div>









{
searchTerm && !productId && (


<div
className="
mt-3
max-h-60
overflow-y-auto
rounded-2xl
border
border-white/10
bg-black/60
"
>


{


filteredProducts.map((p)=>(



<button

key={p.id}


onClick={()=>{


setProductId(p.id);

setSearchTerm(p.name);


}}


className="
flex
w-full
items-center
justify-between
border-b
border-white/5
px-4
py-3
hover:bg-white/10
"

>



<div
className="
flex
items-center
gap-3
"
>


<Package
size={18}
className="text-orange-400"
/>



<span>

{p.name}

</span>


</div>





<span
className="
text-xs
text-slate-400
"
>

Stock : {p.stock}

</span>



</button>



))


}



</div>


)

}



</div>









{/* QUANTITE */}


<div>


<label
className="
text-xs
text-slate-400
mb-2
block
"
>

Quantité vendue

</label>





<div
className="
flex
items-center
gap-3
"
>





<button

onClick={decreaseQty}

className="
h-12
w-12
rounded-xl
bg-white/10
flex
items-center
justify-center
"

>


<Minus size={18}/>

</button>









<input


type="number"


value={quantity}


onChange={(e)=>setQuantity(e.target.value)}


placeholder="Ex : 5"


className="
flex-1
rounded-xl
border
border-white/10
bg-black/30
p-3
text-center
outline-none
"

/>








<button

onClick={increaseQty}


className="
h-12
w-12
rounded-xl
bg-orange-500/20
text-orange-300
flex
items-center
justify-center
"

>


<Plus size={18}/>


</button>





</div>


</div>












{/* RESUME VENTE */}



{

selectedProduct && Number(quantity)>0 && (



<div
className="
rounded-2xl
border
border-orange-400/30
bg-orange-500/10
p-5
"
>



<div
className="
flex
items-center
gap-2
mb-3
"
>


<ShoppingCart
className="text-orange-400"
/>



<p
className="
font-bold
text-orange-200
"
>

Résumé de la vente

</p>



</div>








<p
className="
text-sm
text-slate-300
"
>

Produit :

<span
className="
font-bold
text-white
"
>

{" "}

{selectedProduct.name}

</span>


</p>







<p
className="
mt-2
text-sm
text-slate-300
"
>

Prix unité :

<span
className="
font-bold
text-white
"
>

{" "}

{selectedProduct.selling_price}

{" "}

{selectedProduct.currency}

</span>


</p>









<div
className="
mt-4
rounded-xl
bg-black/30
p-3
"
>


<p
className="
text-xs
text-slate-400
"
>

Total client

</p>


<p
className="
text-3xl
font-black
text-orange-400
"
>

{totalPreview}

{" "}

{selectedProduct.currency}


</p>


</div>








<div
className="
mt-3
flex
items-center
gap-2
text-green-300
text-sm
"
>


<TrendingUp
size={16}
/>


Bénéfice estimé :

{profitPreview}

{" "}

{selectedProduct.currency}


</div>







{

stockAfterSale <=5 && (

<div
className="
mt-3
flex
items-center
gap-2
rounded-xl
bg-red-500/10
p-3
text-xs
text-red-300
"
>

<AlertTriangle size={16}/>

Attention : stock presque épuisé ({stockAfterSale})

</div>

)

}





</div>


)


}
{/* BOUTON VALIDATION */}


<button


onClick={saveSale}


disabled={loading}



className="
flex
w-full
items-center
justify-center
gap-2
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


{

loading

?

"Enregistrement..."

:

<>

<CheckCircle size={20}/>

Valider la vente

</>

}


</button>





</div>







{/* POPUP SUCCES */}



{

showSuccess && (


<div
className="
fixed
inset-0
z-50
flex
items-center
justify-center
bg-black/70
px-5
"
>



<div
className="
w-full
max-w-sm
rounded-3xl
border
border-green-400/30
bg-[#081221]
p-6
text-center
shadow-2xl
"
>


<CheckCircle

size={55}

className="
mx-auto
mb-4
text-green-400
"

/>




<h2
className="
text-2xl
font-black
text-white
"
>

Vente réussie ✅

</h2>





<p
className="
mt-3
text-sm
text-slate-300
"
>

Votre vente a été enregistrée.


</p>








<button


onClick={()=>{


setShowSuccess(false);

window.location.href="/dashboard";


}}



className="
mt-6
w-full
rounded-2xl
bg-green-500
py-3
font-black
text-black
"

>


OK


</button>




</div>



</div>


)


}






</div>


</main>


);


}