


"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  Bot,
  Sparkles,
  Send,
  TrendingUp,
  Package,
  Wallet,
  AlertTriangle,
  Lightbulb
} from "lucide-react";


type Sale = {
  id:string;
  product_name:string;
  quantity:number;
  total_sale:number;
  profit:number;
  currency:string;
  created_at:string;
};


type Product = {
  id:string;
  name:string;
  stock:number;
  unit:string;
};


type Expense = {
  id:number;
  title:string;
  amount:number;
  currency:string;
};


type Debt = {
  id:string;
  client_name:string;
  total_amount:number;
  paid_amount:number;
};



export default function AssistantPage(){


const [sales,setSales]=useState<Sale[]>([]);
const [products,setProducts]=useState<Product[]>([]);
const [expenses,setExpenses]=useState<Expense[]>([]);
const [debts,setDebts]=useState<Debt[]>([]);


const [question,setQuestion]=useState("");

const [answer,setAnswer]=useState("");

const [loading,setLoading]=useState(false);



useEffect(()=>{

loadData();

},[]);




async function loadData(){


const phone =
localStorage.getItem("phone");


if(!phone)return;



const {data:user}=await supabase
.from("users")
.select("id")
.eq("phone",phone)
.single();



if(!user)return;




const {data:salesData}=await supabase
.from("sales")
.select("*")
.eq("user_id",user.id);



const {data:productsData}=await supabase
.from("products")
.select("*")
.eq("user_id",user.id);



const {data:expensesData}=await supabase
.from("expenses")
.select("*")
.eq("user_id",user.id);



const {data:debtsData}=await supabase
.from("debts")
.select("*")
.eq("user_id",user.id);




setSales(salesData || []);

setProducts(productsData || []);

setExpenses(expensesData || []);

setDebts(debtsData || []);


}




function analyseCommerce(type:string){


let totalVentes=0;

let totalProfit=0;

let totalDepenses=0;

let totalDettes=0;



sales.forEach(s=>{

totalVentes += Number(s.total_sale || 0);

totalProfit += Number(s.profit || 0);

});



expenses.forEach(e=>{

totalDepenses += Number(e.amount || 0);

});



debts.forEach(d=>{

totalDettes +=
Number(d.total_amount || 0)
-
Number(d.paid_amount || 0);

});



const stockFaible =
products.filter(
p=>Number(p.stock)<=5
);



const produits:any={};



sales.forEach(s=>{

produits[s.product_name] =
(produits[s.product_name] || 0)
+
Number(s.quantity);

});



const meilleurProduit =
Object.entries(produits)
.sort(
(a:any,b:any)=>b[1]-a[1]
)[0];



if(type==="ventes"){

return `
📊 ANALYSE DES VENTES


💰 Chiffre d'affaires :

${totalVentes} FC


🛒 Nombre de ventes :

${sales.length}


🏆 Produit le plus vendu :

${meilleurProduit?.[0] || "Aucun"}


💡 Conseil :

Continuez à développer les produits qui attirent vos clients.
`;

}



if(type==="benefice"){

return `
📈 ANALYSE DU BÉNÉFICE


💰 Bénéfice actuel :

${totalProfit} FC


📊 Total ventes :

${totalVentes} FC


💸 Dépenses :

${totalDepenses} FC


💡 Conseil :

Augmentez les produits avec une meilleure marge.
`;

}



if(type==="stock"){

return `
⚠️ ANALYSE DU STOCK


Produits en alerte :

${stockFaible.length}


${
stockFaible.length
?
stockFaible.map(p=>
`• ${p.name} : ${p.stock} ${p.unit}`
).join("\n")
:
"✅ Aucun produit en rupture."
}


💡 Conseil :

Réapprovisionnez avant de perdre des ventes.
`;

}
if(type==="dettes"){

return `
💳 ANALYSE DES DETTES CLIENTS


Montant restant :

${totalDettes} FC


👥 Clients débiteurs :

${debts.length}


💡 Conseil :

Relancez les clients qui ont les plus grandes dettes afin d'améliorer votre trésorerie.
`;

}



return `
📊 RAPPORT GLOBAL BISO-COMMERCE


💰 Chiffre d'affaires :

${totalVentes} FC


📈 Bénéfice :

${totalProfit} FC


💸 Dépenses :

${totalDepenses} FC


📦 Nombre de produits :

${products.length}


⚠️ Stock faible :

${stockFaible.length}


💳 Dettes clients :

${totalDettes} FC



🔎 ANALYSE :


Votre commerce possède ${sales.length} ventes enregistrées.


Priorités :

1️⃣ Surveiller les produits en stock faible.

2️⃣ Suivre les dettes clients.

3️⃣ Favoriser les produits rentables.


`;

}






async function askAssistant(text?:string){



const userQuestion =
(text || question)
.toLowerCase()
.trim();



if(!userQuestion)return;



setLoading(true);



let result="";




if(
userQuestion.includes("vente") ||
userQuestion.includes("vendu") ||
userQuestion.includes("chiffre") ||
userQuestion.includes("ca") ||
userQuestion.includes("revenu") ||
userQuestion.includes("gagné") ||
userQuestion.includes("aujourd'hui") ||
userQuestion.includes("aujourd’hui")
){

result = analyseCommerce("ventes");

}




else if(
userQuestion.includes("bénéfice") ||
userQuestion.includes("benefice") ||
userQuestion.includes("profit") ||
userQuestion.includes("gain") ||
userQuestion.includes("gagné") ||
userQuestion.includes("gagne") ||
userQuestion.includes("marge") ||
userQuestion.includes("rentable") ||
userQuestion.includes("argent")
){

result =
analyseCommerce("benefice");

}





else if(
userQuestion.includes("stock")
||
userQuestion.includes("rupture")
||
userQuestion.includes("manque")
||
userQuestion.includes("vide")
||
userQuestion.includes("reste")
||
userQuestion.includes("disponible")
||
userQuestion.includes("acheter")
||
userQuestion.includes("réapprovisionner")
||
userQuestion.includes("recommander")
){

result =
analyseCommerce("stock");

}





else if(
userQuestion.includes("dette")
||
userQuestion.includes("doit")
||
userQuestion.includes("client")
||
userQuestion.includes("impayé")
||
userQuestion.includes("impaye")
||
userQuestion.includes("crédit")
||
userQuestion.includes("credit")
||
userQuestion.includes("argent dû")
||
userQuestion.includes("argent du")
||
userQuestion.includes("qui me doit")
){

result =
analyseCommerce("dettes");

}





else if(
userQuestion.includes("meilleur")
||
userQuestion.includes("top")
||
userQuestion.includes("produit")
||
userQuestion.includes("vend le plus")
||
userQuestion.includes("plus vendu")
||
userQuestion.includes("populaire")
||
userQuestion.includes("marche le mieux")
||
userQuestion.includes("marche bien")
||
userQuestion.includes("fort")
){


let total=0;


expenses.forEach(e=>{

total += Number(e.amount || 0);

});



result = `
💸 ANALYSE DES DÉPENSES


Total dépenses :

${total} FC


Nombre de dépenses :

${expenses.length}


💡 Conseil :

Contrôlez vos sorties d'argent pour protéger vos bénéfices.
`;

}





else if(
userQuestion.includes("meilleur")
||
userQuestion.includes("top")
||
userQuestion.includes("produit")
){


const classement:any={};


sales.forEach(s=>{

classement[s.product_name] =
(classement[s.product_name] || 0)
+
Number(s.quantity);

});



const top =
Object.entries(classement)
.sort(
(a:any,b:any)=>b[1]-a[1]
)
.slice(0,5);



result = `
🏆 TOP PRODUITS


${
top.length===0
?
"Aucune vente disponible"
:
top.map(
(item:any,index)=>
`${index+1}️⃣ ${item[0]} : ${item[1]} vendus`
).join("\n")
}


💡 Conseil :

Mettez plus en avant vos produits qui se vendent rapidement.
`;

}





else if(
userQuestion.includes("conseil")
||
userQuestion.includes("aide")
||
userQuestion.includes("améliorer")
){

const faible =
products.filter(
p=>p.stock<=5
);



result = `
🚀 CONSEILS POUR VOTRE COMMERCE


${
faible.length
?
"⚠️ Certains produits doivent être réapprovisionnés."
:
"✅ Votre stock est bien surveillé."
}


💳 Suivez régulièrement les dettes clients.


📈 Analysez les produits qui rapportent le plus.


💰 Réinvestissez une partie des bénéfices.


Votre assistant vous recommande de consulter vos rapports chaque semaine.
`;

}





else if(
userQuestion.includes("résumé")
||
userQuestion.includes("rapport")
||
userQuestion.includes("commerce")
){

result =
analyseCommerce("global");

}

else if(
userQuestion.includes("ajouter un produit")
||
userQuestion.includes("comment ajouter")
||
userQuestion.includes("créer un produit")
||
userQuestion.includes("creer un produit")
||
userQuestion.includes("nouveau produit")
){

result = `
📦 AJOUTER UN PRODUIT SUR BISO-COMMERCE


Pour enregistrer un nouveau produit dans votre commerce :


1️⃣ Ouvrez le menu :

📦 Produits

Puis cliquez sur le bouton :

➕ Ajouter un produit


2️⃣ Entrez les informations du produit :


📝 Nom du produit

Exemple :

• Paracétamol
• Riz 25Kg
• Coca-Cola
• Savon


3️⃣ Choisissez l'unité de vente :


Vous pouvez choisir :

✅ Pièce

✅ Carton

✅ Boîte

✅ Sachet

✅ Kg



4️⃣ Entrez la quantité achetée.


Exemple :

Vous achetez :

2 cartons de boissons


Vous écrivez :

📦 Quantité :
2


📦 Nombre de pièces par carton :
24



Biso-Commerce va automatiquement calculer :


✅ Le stock total disponible

✅ Le prix d'achat par unité

✅ La valeur réelle de votre stock

✅ Vos bénéfices pendant les ventes



5️⃣ Ajoutez vos prix :


💰 Prix d'achat total :

Le montant payé pour acheter le produit.


💵 Prix de vente :

Le prix auquel vous allez vendre une unité.


Exemple :

Achat :
20 000 FC


Vente :
1 000 FC par pièce



6️⃣ Cliquez sur :

✅ Ajouter le produit



Votre produit sera maintenant enregistré dans votre commerce et disponible pour vos ventes.


💡 CONSEIL DU PDG :

Ajoutez toujours vos produits avant de commencer les ventes.

Cela permet à Biso-Commerce de calculer correctement :

📊 Vos ventes

📈 Vos bénéfices

📦 Votre stock


`;

}





else if(
userQuestion.includes("android")
||
userQuestion.includes("télécharger")
||
userQuestion.includes("telecharger")
||
userQuestion.includes("installer")
){

result = `
📱 INSTALLER BISO-COMMERCE SUR ANDROID


Vous pouvez utiliser Biso-Commerce comme une vraie application sur votre téléphone Android.


Suivez ces étapes :


1️⃣ Ouvrez Biso-Commerce avec :

🌐 Google Chrome


2️⃣ Cliquez sur les trois petits points :

⋮

en haut à droite de Chrome.


3️⃣ Choisissez :

📲 Installer l'application

ou

📲 Ajouter à l'écran d'accueil



4️⃣ Confirmez l'installation.


Après cela :


✅ Une icône Biso-Commerce apparaîtra sur votre téléphone.

✅ Vous pourrez ouvrir l'application directement.

✅ Vous n'aurez plus besoin de chercher le site dans Chrome.



💡 Conseil :

Utilisez toujours la dernière version de Chrome pour une meilleure expérience.


`;

}





else if(
userQuestion.includes("iphone")
||
userQuestion.includes("ios")
||
userQuestion.includes("apple")
){

result = `
🍎 INSTALLER BISO-COMMERCE SUR IPHONE


Pour ajouter Biso-Commerce sur votre iPhone :


1️⃣ Ouvrez le site avec :

🌐 Safari


2️⃣ Appuyez sur le bouton :

⬆️ Partager

(l'icône carré avec une flèche vers le haut)


3️⃣ Faites défiler les options.


4️⃣ Sélectionnez :

📱 Sur l'écran d'accueil


5️⃣ Cliquez sur :

Ajouter



Maintenant :


✅ Biso-Commerce apparaîtra comme une application.

✅ Vous pourrez l'ouvrir rapidement depuis votre écran.


💡 Important :

Sur iPhone, utilisez Safari pour l'installation.


`;

}





else if(
userQuestion.includes("problème")
||
userQuestion.includes("probleme")
||
userQuestion.includes("aide")
||
userQuestion.includes("support")
||
userQuestion.includes("question")
){

result = `
🛠️ BESOIN D'ASSISTANCE ?


Notre service client Biso-Commerce est disponible pour vous aider.


Vous pouvez nous contacter pour :


✅ Installation de l'application

✅ Création des produits

✅ Gestion des ventes

✅ Problèmes techniques

✅ Abonnement

✅ Questions sur l'utilisation


📲 Service client WhatsApp :

+243 994 864 173



Notre équipe vous accompagnera rapidement.


Merci d'utiliser :

🚀 BISO-COMMERCE


`;

}



else{


result = `
🤖 Assistant Biso peut analyser votre commerce.


Essayez par exemple :


• Mes ventes aujourd'hui

• Quel produit est le plus vendu ?

• Quel est mon bénéfice ?

• Quels produits sont en rupture ?

• Qui me doit de l'argent ?

• Combien ai-je dépensé ?

• Donne-moi un rapport complet


`;

}



setAnswer(result);

setLoading(false);


}
return (

<main
className="
min-h-screen
bg-[#081221]
text-white
px-4
py-6
pb-28
"
>


<div
className="
max-w-3xl
mx-auto
space-y-6
"
>


{/* HEADER */}

<div
className="
rounded-3xl
border
border-white/10
bg-white/5
backdrop-blur-xl
p-6
shadow-2xl
"
>


<div className="
flex
items-center
gap-4
">


<div
className="
rounded-3xl
bg-orange-500/20
p-4
"
>

<Bot
size={38}
className="text-orange-400"
/>

</div>



<div>

<h1
className="
text-3xl
font-black
"
>

Assistant Biso

</h1>


<p
className="
text-slate-400
text-sm
mt-1
"
>

Votre conseiller intelligent de commerce

</p>


</div>


</div>


</div>






{/* CARTES */}

<div
className="
grid
grid-cols-2
gap-4
"
>


<div
className="
rounded-3xl
bg-orange-500/10
border
border-orange-400/20
p-5
"
>

<TrendingUp
className="text-orange-400 mb-3"
/>


<p className="text-sm text-slate-400">
Ventes
</p>


<p className="text-2xl font-black">
{sales.length}
</p>


</div>





<div
className="
rounded-3xl
bg-blue-500/10
border
border-blue-400/20
p-5
"
>

<Package
className="text-blue-400 mb-3"
/>


<p className="text-sm text-slate-400">
Produits
</p>


<p className="text-2xl font-black">
{products.length}
</p>


</div>





<div
className="
rounded-3xl
bg-green-500/10
border
border-green-400/20
p-5
"
>

<Wallet
className="text-green-400 mb-3"
/>


<p className="text-sm text-slate-400">
Dettes
</p>


<p className="text-2xl font-black">
{debts.length}
</p>


</div>





<div
className="
rounded-3xl
bg-red-500/10
border
border-red-400/20
p-5
"
>

<AlertTriangle
className="text-red-400 mb-3"
/>


<p className="text-sm text-slate-400">
Stock faible
</p>


<p className="text-2xl font-black">

{
products.filter(
p=>p.stock<=5
).length
}

</p>


</div>


</div>







{/* QUESTIONS RAPIDES */}

<div
className="
rounded-3xl
border
border-white/10
bg-white/5
p-5
"
>


<div className="
flex
items-center
gap-2
mb-5
">

<Sparkles
className="text-orange-400"
/>


<h2 className="font-black text-lg">
Questions rapides
</h2>


</div>




<div
className="
grid
sm:grid-cols-2
gap-3
"
>


{

[
"Mes ventes",
"Mon bénéfice",
"Produit le plus vendu",
"Stock faible",
"Mes dettes clients",
"Mes dépenses",
"Résumé commerce",
"Donne-moi des conseils",
"Comment installer sur Android ?",
"Comment installer sur iPhone ?",

]

.map((item)=>(


<button

key={item}

onClick={()=>
askAssistant(item)
}

className="
rounded-2xl
border
border-white/10
bg-black/30
p-4
text-left
font-bold
hover:bg-white/10
transition
"

>

{item}

</button>


))


}



</div>


</div>








{/* QUESTION */}

<div
className="
rounded-3xl
border
border-white/10
bg-white/5
p-5
"
>


<h2 className="
font-black
mb-4
">

🤖 Posez votre question

</h2>




<div className="
flex
gap-3
">


<input

value={question}

onChange={(e)=>
setQuestion(e.target.value)
}

placeholder="
Ex: Est-ce que mon commerce progresse ?
"

className="
flex-1
rounded-2xl
bg-black/40
border
border-white/10
p-4
outline-none
"

/>



<button

onClick={()=>
askAssistant()
}

disabled={loading}

className="
rounded-2xl
bg-gradient-to-r
from-orange-500
to-yellow-400
px-5
font-black
text-black
"

>

<Send/>

</button>



</div>


</div>








{/* REPONSE */}

{

answer && (


<div
className="
rounded-3xl
border
border-green-400/20
bg-green-500/10
p-6
shadow-xl
"
>


<div className="
flex
items-center
gap-2
mb-4
">


<Lightbulb
className="text-yellow-400"
/>


<h2 className="
font-black
text-lg
">

Analyse Assistant

</h2>


</div>



<p
className="
whitespace-pre-line
text-slate-200
leading-relaxed
"
>

{answer}

</p>


</div>


)


}



</div>


</main>


);


}