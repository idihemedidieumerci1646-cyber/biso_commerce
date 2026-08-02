"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  Download,
  Search,
  Sparkles,
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


type DayReport = {
  fc:number;
  usd:number;
  profitFc:number;
  profitUsd:number;
  quantity:number;
};



export default function ReportsPage(){


const [salesHistory,setSalesHistory] = useState<Sale[]>([]);

const [filteredSales,setFilteredSales] = useState<Sale[]>([]);


const [selectedDate,setSelectedDate] = useState("");

const [showAll,setShowAll] = useState(false);

const [showGuide,setShowGuide] = useState(false);



const [today,setToday] = useState<DayReport>({
  fc:0,
  usd:0,
  profitFc:0,
  profitUsd:0,
  quantity:0
});


const [yesterday,setYesterday] = useState<DayReport>({
  fc:0,
  usd:0,
  profitFc:0,
  profitUsd:0,
  quantity:0
});


const [beforeYesterday,setBeforeYesterday] = useState<DayReport>({
  fc:0,
  usd:0,
  profitFc:0,
  profitUsd:0,
  quantity:0
});


const [bestProduct,setBestProduct] = useState("Aucun");



useEffect(()=>{

loadReports();

},[]);



/**
 * FORMAT PDF PROPRE
 * évite les caractères bizarres
 */
const formatPDF = (value:number)=>{

  return Math.round(value)
  .toLocaleString("en-US");

};



/**
 * Nettoyage texte PDF
 * évite Ø=Ü et caractères cassés
 */
const cleanPDF = (text:string)=>{

 return text
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g,"")
 .replace(/[^\x20-\x7E]/g,"");

};





const calculateDayReport = (
sales:Sale[],
targetDate:string
):DayReport=>{


let fc=0;
let usd=0;

let profitFc=0;
let profitUsd=0;

let quantity=0;


sales.forEach((sale)=>{


const date =
sale.created_at.split("T")[0];


if(date !== targetDate)
return;



const amount =
Number(sale.total_sale || 0);



const profit =
Number(sale.profit || 0);



quantity += Number(sale.quantity || 0);



if(sale.currency==="FC"){


fc += amount;

profitFc += profit;


}else{


usd += amount;

profitUsd += profit;


}


});



return {

fc,
usd,
profitFc,
profitUsd,
quantity

};


};
const loadReports = async()=>{

try{


const userId =
localStorage.getItem("user_id");


if(!userId)
return;



const {data,error}=await supabase

.from("sales")

.select("*")

.eq("user_id",userId)

.order(
"created_at",
{
ascending:false
}
);



if(error){

console.log(error);

return;

}



const list =
(data || []) as Sale[];



setSalesHistory(list);

setFilteredSales(list);




const now = new Date();



const todayDate =
now.toISOString()
.split("T")[0];



const yesterday =
new Date(now);


yesterday.setDate(
now.getDate()-1
);



const yesterdayDate =
yesterday.toISOString()
.split("T")[0];



const beforeYesterday =
new Date(now);


beforeYesterday.setDate(
now.getDate()-2
);



const beforeYesterdayDate =
beforeYesterday.toISOString()
.split("T")[0];




setToday(
calculateDayReport(
list,
todayDate
)
);



setYesterday(
calculateDayReport(
list,
yesterdayDate
)
);



setBeforeYesterday(
calculateDayReport(
list,
beforeYesterdayDate
)
);






// Produit le plus vendu


const products:any={};



list.forEach((sale)=>{


if(!products[sale.product_name]){

products[sale.product_name]=0;

}



products[sale.product_name]
+= Number(sale.quantity || 0);



});




let best="Aucun";

let max=0;



Object.keys(products).forEach((name)=>{


if(products[name]>max){


max =
products[name];


best =
name;


}


});



setBestProduct(best);



}catch(error){

console.log(error);

}



};






// ================================
// CREATION PDF
// ================================


const downloadPDF = ()=>{


const data = selectedDate

?

salesHistory.filter(
(sale)=>
sale.created_at.split("T")[0]
=== selectedDate
)

:

filteredSales;




if(data.length===0){

alert(
"Aucune vente trouvée pour créer le rapport."
);

return;

}





const doc = new jsPDF({

orientation:"portrait",

unit:"mm",

format:"a4",

putOnlyUsedFonts:true,

compress:true

});



doc.setFont(
"helvetica",
"normal"
);



doc.setFontSize(12);






const dateRapport =

selectedDate ||

new Date()
.toISOString()
.split("T")[0];






let totalFc=0;

let totalUsd=0;


let profitFc=0;

let profitUsd=0;



const produits:any={};





data.forEach((sale)=>{


const montant =
Number(sale.total_sale || 0);



const benefice =
Number(sale.profit || 0);




if(sale.currency==="FC"){


totalFc += montant;

profitFc += benefice;



}else{


totalUsd += montant;

profitUsd += benefice;



}





if(!produits[sale.product_name]){


produits[sale.product_name]={

quantity:0,

montant:0,

currency:sale.currency,

profit:0

};


}




produits[sale.product_name].quantity
+= Number(sale.quantity || 0);



produits[sale.product_name].montant
+= montant;



produits[sale.product_name].profit
+= benefice;



});
// =============================
// PAGE DE GARDE PDF
// =============================


doc.setFontSize(26);


doc.text(
cleanPDF("BISO-COMMERCE"),
20,
35
);



doc.setFontSize(16);


doc.text(
cleanPDF("Rapport professionnel de gestion"),
20,
50
);



doc.setFontSize(12);


doc.text(
cleanPDF("Suivi des ventes - benefices - performance commerciale"),
20,
65
);



doc.line(
20,
75,
190,
75
);





doc.setFontSize(13);



doc.text(
cleanPDF(
"Date du rapport : "
+ dateRapport
),
20,
95
);



doc.text(
cleanPDF(
"Nombre de transactions : "
+ data.length
),
20,
110
);



doc.text(
cleanPDF(
"Produit le plus vendu : "
+ bestProduct
),
20,
125
);




// =============================
// RESUME FINANCIER PDF
// =============================


doc.addPage();



doc.setFontSize(20);



doc.text(
"Resume financier",
20,
30
);



autoTable(doc,{

startY:45,


head:[

[
"Categorie",
"Montant"
]

],



body:[


[
"Ventes FC",
formatPDF(totalFc)+" FC"
],


[
"Ventes USD",
formatPDF(totalUsd)+" $"
],



[
"Benefice FC",
formatPDF(profitFc)+" FC"
],



[
"Benefice USD",
formatPDF(profitUsd)+" $"
]


],



styles:{

fontSize:11,

cellPadding:5

}



});







// =============================
// DETAIL PRODUITS
// =============================


doc.addPage();



doc.setFontSize(20);



doc.text(
"Detail des ventes",
20,
30
);




const rows =

Object.keys(produits)

.map((name)=>[



cleanPDF(name),



produits[name].quantity,



formatPDF(
produits[name].montant
)
+
" "
+
produits[name].currency,



formatPDF(
produits[name].profit
)
+
" "
+
produits[name].currency



]);





autoTable(doc,{


startY:45,



head:[


[
"Produit",
"Quantite",
"Ventes",
"Benefice"
]


],



body:rows,



styles:{


fontSize:10,


cellPadding:4


}



});






// =============================
// ANALYSE FINALE
// =============================


doc.addPage();



doc.setFontSize(20);



doc.text(
"Analyse commerciale",
20,
30
);




doc.setFontSize(12);



doc.text(

cleanPDF(
"Produit le plus vendu : "
+
bestProduct
),

20,

55

);




doc.text(

cleanPDF(
"Total quantite vendue : "
+
data.reduce(
(a,b)=>
a + Number(b.quantity || 0),
0
)
+
" unites"
),

20,

70

);





doc.text(
"Ce document permet au responsable de suivre",
20,
175
);


doc.text(
"les ventes et bénéfices du commerce.",
20,
190
);

doc.text(
"Total ventes FC : "
+
formatPDF(totalFc)
+
" FC",
20,
90
);


doc.text(
"Total ventes USD : "
+
formatPDF(totalUsd)
+
" $",
20,
105
);


doc.text(
"Bénéfice total FC : "
+
formatPDF(profitFc)
+
" FC",
20,
120
);


doc.text(
"Bénéfice total USD : "
+
formatPDF(profitUsd)
+
" $",
20,
135
);
// =============================
// TELECHARGEMENT PDF PROPRE
// =============================


const pdfBlob = doc.output("blob");


const url = URL.createObjectURL(pdfBlob);



const link = document.createElement("a");


link.href = url;


link.download =

"Rapport-BISO-COMMERCE-"

+

dateRapport

+

".pdf";



document.body.appendChild(link);


link.click();



document.body.removeChild(link);



URL.revokeObjectURL(url);



};







const filterByDate = ()=>{


if(!selectedDate){


setFilteredSales(
salesHistory
);


return;


}




const result =

salesHistory.filter(

(sale)=>

sale.created_at
.split("T")[0]

=== selectedDate


);



setFilteredSales(result);



};







const displayedSales =


showAll


?


filteredSales


:


filteredSales.slice(0,7);







return (


<main

className="
min-h-screen
bg-[#081221]
text-white
p-4
"

>


<div

className="
max-w-6xl
mx-auto
space-y-6
"

>





{/* HEADER */}



<div

className="
rounded-3xl
bg-white/5
border
border-white/10
p-6
backdrop-blur-xl
"

>



<div

className="
flex
justify-between
items-center
"

>



<div>



<h1

className="
text-3xl
font-black
"

>


📊 Rapport PRO


</h1>




<p

className="
text-slate-400
mt-2
"

>


Analyse complète du commerce


</p>



</div>






<button

onClick={()=>setShowGuide(!showGuide)}

className="
bg-orange-500/20
border
border-orange-400/30
px-4
py-3
rounded-xl
font-bold
"

>


<Sparkles

size={16}

className="inline mr-2"

/>


Guide



</button>




</div>



</div>







{/* GUIDE */}



{

showGuide && (



<div className="space-y-3 text-sm text-slate-300">

<div className="bg-black/30 rounded-2xl p-4">
🔥 <b>Aujourd'hui :</b><br/>
Affiche toutes les ventes réalisées pendant la journée actuelle.
Les ventes se mettent à jour automatiquement.
</div>


<div className="bg-black/30 rounded-2xl p-4">
📅 <b>Hier :</b><br/>
Affiche les ventes du jour précédent.
Quand une nouvelle journée commence, hier devient automatiquement l'ancien aujourd'hui.
</div>


<div className="bg-black/30 rounded-2xl p-4">
⏳ <b>Avant-hier :</b><br/>
Affiche les ventes réalisées deux jours avant.
Le système change automatiquement selon la date.
</div>


<div className="bg-black/30 rounded-2xl p-4">
💰 <b>Bénéfice :</b><br/>
Montre l'argent gagné après avoir retiré le prix d'achat des produits vendus.
</div>


<div className="bg-black/30 rounded-2xl p-4">
📦 <b>Produit le plus vendu :</b><br/>
Le système analyse automatiquement les quantités vendues pour trouver le produit qui marche le mieux.
</div>


<div className="bg-black/30 rounded-2xl p-4">
🔎 <b>Recherche par date :</b><br/>
Choisissez une date pour voir uniquement les ventes de cette journée.
</div>


<div className="bg-orange-500/20 rounded-2xl p-4">
📄 <b>Créer PDF :</b><br/>
Génère un rapport professionnel avec :
<br/>• Total ventes FC
<br/>• Total ventes USD
<br/>• Bénéfices FC et USD
<br/>• Détail des produits vendus
<br/>• Analyse commerciale
</div>


<div className="bg-green-500/20 rounded-2xl p-4">
✅ <b>Automatique :</b><br/>
Vous n'avez rien à changer chaque jour.
Les rapports utilisent la date réelle des ventes enregistrées.
</div>


<button
onClick={()=>setShowGuide(false)}
className="
w-full
bg-orange-500
text-black
py-3
rounded-xl
font-black
mt-4
"
>
Fermer le guide
</button>


</div>

)

}
{/* STATISTIQUES JOURNALIÈRES */}


<div

className="
grid
grid-cols-1
md:grid-cols-3
gap-5
"

>


<ReportCard

icon="🔥"

title="Aujourd'hui"

value={

`${today.fc.toLocaleString()} FC |
${today.usd.toLocaleString()} $`

}

subtitle={

`Bénéfice :
${today.profitFc.toLocaleString()} FC |
${today.profitUsd.toLocaleString()} $`

}

/>





<ReportCard

icon="📅"

title="Hier"

value={

`${yesterday.fc.toLocaleString()} FC |
${yesterday.usd.toLocaleString()} $`

}

subtitle={

`Bénéfice :
${yesterday.profitFc.toLocaleString()} FC |
${yesterday.profitUsd.toLocaleString()} $`

}

/>






<ReportCard

icon="⏳"

title="Avant-hier"

value={

`${beforeYesterday.fc.toLocaleString()} FC |
${beforeYesterday.usd.toLocaleString()} $`

}

subtitle={

`Bénéfice :
${beforeYesterday.profitFc.toLocaleString()} FC |
${beforeYesterday.profitUsd.toLocaleString()} $`

}

/>


</div>






{/* RECHERCHE + PDF */}


<div

className="
rounded-3xl
bg-white/5
border
border-white/10
p-6
"

>


<h2

className="
text-xl
font-black
mb-4
"

>

📄 Générer le rapport officiel

</h2>




<div

className="
flex
flex-col
md:flex-row
gap-3
"

>


<input

type="date"

value={selectedDate}

onChange={(e)=>
setSelectedDate(e.target.value)
}

className="
bg-black/40
border
border-white/10
rounded-xl
p-3
flex-1
"

/>





<button

onClick={filterByDate}

className="
bg-blue-500
px-5
py-3
rounded-xl
font-black
"

>


<Search

size={16}

className="inline mr-2"

/>


Chercher


</button>







<button

onClick={downloadPDF}

className="
bg-gradient-to-r
from-orange-500
to-yellow-400
text-black
px-5
py-3
rounded-xl
font-black
"

>


<Download

size={16}

className="inline mr-2"

/>


Créer PDF


</button>




</div>


</div>









{/* HISTORIQUE DES VENTES */}



<div

className="
rounded-3xl
bg-white/5
border
border-white/10
p-6
"

>



<div

className="
flex
justify-between
items-center
mb-5
"

>


<h2

className="
text-xl
font-black
"

>


🧾 Historique des ventes


</h2>




<button

onClick={()=>setShowAll(!showAll)}

className="
bg-orange-500
text-black
px-4
py-2
rounded-xl
font-black
"

>


{
showAll
?
"Réduire"
:
"Voir tout"
}



</button>



</div>







{

displayedSales.length===0


?


(

<p className="text-slate-400">

Aucune vente disponible

</p>

)


:


(


<div className="space-y-3">


{


displayedSales.map((sale)=>(



<div

key={sale.id}

className="
rounded-2xl
bg-black/30
border
border-white/10
p-4
flex
justify-between
"

>



<div>



<p className="font-black">

📦 {sale.product_name}

</p>




<p className="text-xs text-slate-400">


📅

{new Date(
sale.created_at
).toLocaleString()}


</p>





<p className="text-xs text-slate-500">


Quantité : x{sale.quantity}


</p>



</div>







<div className="text-right">


<p className="font-black text-green-400">


{formatPDF(sale.total_sale)}

{" "}

{sale.currency}


</p>





<p className="text-xs text-slate-400">


Bénéfice :

{" "}

{formatPDF(sale.profit)}

{" "}

{sale.currency}



</p>




</div>




</div>



))


}



</div>


)


}



</div>





</div>


</main>


);


}







// ================================
// COMPOSANT CARTE
// ================================


function ReportCard({

icon,

title,

value,

subtitle


}:{

icon:string;

title:string;

value:string;

subtitle:string;

}){


return (


<div

className="
rounded-3xl
bg-white/5
border
border-white/10
p-5
shadow-xl
"

>


<div className="text-3xl mb-3">

{icon}

</div>




<p className="text-slate-400 text-sm">

{title}

</p>




<p className="font-black text-lg mt-2">

{value}

</p>




<p className="text-xs text-green-400 mt-3">

{subtitle}

</p>



</div>


);


}