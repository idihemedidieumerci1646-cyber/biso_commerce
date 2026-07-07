"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  ShoppingCart,
  Package,
  Sparkles,
  CheckCircle,
  X,
  Plus,
  Minus,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  stock: number;
  initial_stock: number;
  purchase_price: number;
  selling_price: number;
  currency: string;
  pieces_per_unit: number;
};

export default function SalesPage() {

  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);

  const [showGuide, setShowGuide] = useState(false);


  useEffect(() => {
    loadProducts();
  }, []);


  const loadProducts = async () => {

    const phone = localStorage.getItem("phone");

    if (!phone) return;


    const { data:user } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();


    if(!user) return;


    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("name");


    setProducts(data || []);

  };



  const selectedProduct =
    products.find((p)=>p.id===productId);



  const filteredProducts =
    products.filter((p)=>
      p.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    );



  const increaseQty = () => {
    setQuantity(String(Number(quantity || 0)+1));
  };


  const decreaseQty = () => {

    const value = Number(quantity || 0);

    if(value > 1){
      setQuantity(String(value-1));
    }

  };



  const saveSale = async()=>{


    if(!selectedProduct || !quantity){

      alert("Sélectionnez un produit et une quantité");
      return;

    }


    const qty = Number(quantity);



    if(qty<=0){

      alert("Quantité invalide");
      return;

    }



    if(qty > selectedProduct.stock){

      alert("Stock insuffisant !");
      return;

    }



    const phone =
      localStorage.getItem("phone");


    if(!phone)return;



    const {data:user}=await supabase
      .from("users")
      .select("id")
      .eq("phone",phone)
      .single();



    if(!user)return;



    setLoading(true);



    const prixVente =
      Number(selectedProduct.selling_price);


    const prixAchat =
      Number(selectedProduct.purchase_price);



    const totalSale =
      prixVente * qty;



    const profit =
      (prixVente - prixAchat) * qty;



    await supabase
      .from("sales")
      .insert({

        user_id:user.id,

        product_id:selectedProduct.id,

        product_name:selectedProduct.name,

        quantity:qty,

        purchase_price:prixAchat,

        selling_price:prixVente,

        total_sale:totalSale,

        profit:profit,

        currency:selectedProduct.currency,

      });



    await supabase
      .from("products")
      .update({

        stock:selectedProduct.stock - qty

      })

      .eq("id",selectedProduct.id)

      .eq("user_id",user.id);



    setLoading(false);


    alert("Vente enregistrée ✅");


    setQuantity("");
    setProductId("");
    setSearchTerm("");

    loadProducts();

  };



  return (

<main className="
relative
min-h-screen
overflow-hidden
bg-[#081221]
text-white
px-4
py-6
pb-28
">


{/* LUMIERES */}





<div className="relative z-10 max-w-xl mx-auto">


{/* HEADER */}

<div className="
flex
items-center
justify-between
mb-6
">


<div>

<h1 className="
text-3xl
font-black
tracking-tight
">

💰 Caisse

<span className="
text-orange-400
">
 vente
</span>

</h1>


<p className="
text-sm
text-slate-400
mt-1
">

Enregistrez vos ventes rapidement

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

<Sparkles size={14} className="inline mr-1"/>

{showGuide ? "Fermer":"Guide"}

</button>


</div>
{/* GUIDE */}

{showGuide && (

<div className="
mb-5
rounded-3xl
border
border-orange-400/20
bg-white/5
p-5
backdrop-blur-xl
shadow-xl
">

<div className="
flex
items-center
gap-2
mb-4
">

<Sparkles className="text-orange-400"/>

<h2 className="font-bold text-orange-300">
Comment faire une vente ?
</h2>

</div>


<div className="
space-y-3
text-sm
text-slate-300
">


<div className="
rounded-2xl
bg-black/30
p-3
border
border-white/10
">

1️⃣ Recherchez votre produit dans la liste.

</div>


<div className="
rounded-2xl
bg-black/30
p-3
border
border-white/10
">

2️⃣ Sélectionnez le produit puis entrez la quantité vendue.

</div>


<div className="
rounded-2xl
bg-black/30
p-3
border
border-white/10
">

3️⃣ Le système calcule automatiquement le montant total et le bénéfice.

</div>


<div className="
rounded-2xl
bg-orange-500/10
border
border-orange-400/30
p-3
text-orange-200
">

✅ Cliquez sur "Valider la vente" pour enregistrer.

</div>


</div>


</div>

)}




{/* CARTE CAISSE */}

<div className="
rounded-3xl
border
border-white/10
bg-white/5
p-5
backdrop-blur-xl
shadow-2xl
space-y-5
">



{/* RECHERCHE */}

<div>


<label className="
text-xs
text-slate-400
mb-2
block
">

Produit

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



{searchTerm && !productId && (

<div className="
mt-3
max-h-60
overflow-y-auto
rounded-2xl
border
border-white/10
bg-black/60
">


{filteredProducts.map((p)=>(


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
transition
hover:bg-white/10
"


>


<div className="
flex
items-center
gap-3
">


<Package
size={18}
className="text-orange-400"
/>


<span>

{p.name}

</span>


</div>



<span className="
text-xs
text-slate-400
">

Stock {p.stock}

</span>


</button>


))}


</div>

)}


</div>





{/* QUANTITE */}

<div>


<label className="
text-xs
text-slate-400
mb-2
block
">

Quantité

</label>


<div className="
flex
items-center
gap-3
">


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
hover:bg-white/20
"

>

<Minus size={18}/>

</button>



<input

type="number"

value={quantity}

onChange={(e)=>setQuantity(e.target.value)}

placeholder="Ex: 5"

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
hover:bg-orange-500/30
"

>

<Plus size={18}/>

</button>


</div>


</div>





{/* RESUME */}

{selectedProduct && Number(quantity)>0 && (

<div className="
rounded-2xl
border
border-orange-400/30
bg-orange-500/10
p-5
">


<div className="
flex
items-center
gap-2
mb-3
">


<ShoppingCart
className="text-orange-400"
/>


<p className="
font-bold
text-orange-200
">

Résumé

</p>


</div>




<p className="
text-sm
text-slate-300
">

Produit :

<span className="font-bold text-white">

{" "}
{selectedProduct.name}

</span>


</p>



<p className="
mt-2
text-sm
text-slate-300
">

Prix unité :

<span className="font-bold text-white">

{" "}
{selectedProduct.selling_price}
{" "}
{selectedProduct.currency}

</span>

</p>



<div className="
mt-4
rounded-xl
bg-black/30
p-3
">

<p className="
text-xs
text-slate-400
">

Total à payer

</p>


<p className="
text-3xl
font-black
text-orange-400
">

{selectedProduct.selling_price *
Number(quantity)}

{" "}

{selectedProduct.currency}

</p>


</div>


</div>

)}





{/* BUTTON */}

<button

onClick={saveSale}

disabled={loading}

className="
group
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


{loading ? (

"Enregistrement..."

):(


<>

<CheckCircle size={20}/>

Valider la vente

</>


)}


</button>



</div>



</div>



</main>


);

}