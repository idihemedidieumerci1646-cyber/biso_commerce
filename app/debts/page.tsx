"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  Search,
  Plus,
  CheckCircle,
  CreditCard,
  Sparkles,
  UserPlus,
  Trash2,
  Wallet
} from "lucide-react";


type Debt = {
  id:string;
  client_name:string;
  phone:string;
  total_amount:number;
  paid_amount:number;
  currency:"FC" | "USD";
  created_at:string;
};


const inputStyle = `
w-full
rounded-2xl
border
border-white/10
bg-black/30
p-4
outline-none
text-white
placeholder:text-slate-500
focus:border-orange-400
transition
`;


export default function DebtsPage(){

const [debts,setDebts] = useState<Debt[]>([]);

const [name,setName] = useState("");
const [phone,setPhone] = useState("");
const [amount,setAmount] = useState("");

const [currency,setCurrency] =
useState<"FC"|"USD">("FC");

const [search,setSearch] = useState("");

const [selectedDebt,setSelectedDebt] =
useState("");

const [paymentAmount,setPaymentAmount] =
useState("");

const [showAll,setShowAll] =
useState(false);

const [showGuide,setShowGuide] =
useState(false);



useEffect(()=>{

loadDebts();

},[]);



const getUser = async()=>{

const phone =
localStorage.getItem("phone");


if(!phone)
return null;



const {data:user}=await supabase

.from("users")

.select("id")

.eq("phone",phone)

.single();



return user || null;

};



const loadDebts = async()=>{

const user = await getUser();


if(!user)
return;



const {data,error}=await supabase

.from("debts")

.select("*")

.eq("user_id",user.id)

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


setDebts(
(data || []) as Debt[]
);


};



const addDebt = async()=>{


if(
!name ||
!phone ||
!amount
){

alert(
"Veuillez remplir toutes les informations"
);

return;

}



const user = await getUser();


if(!user)
return;



const {error}=await supabase

.from("debts")

.insert({

user_id:user.id,

client_name:name,

phone:phone,

total_amount:Number(amount),

paid_amount:0,

currency,

created_at:new Date().toISOString()

});



if(error){

alert(error.message);

return;

}



setName("");

setPhone("");

setAmount("");

setCurrency("FC");


loadDebts();


};



const payDebt = async()=>{


if(
!selectedDebt ||
!paymentAmount
)
return;



const debt =
debts.find(
d=>d.id===selectedDebt
);


if(!debt)
return;



const value =
Number(paymentAmount);



const remaining =
debt.total_amount -
debt.paid_amount;



if(value > remaining){

alert(
"Le montant dépasse le reste à payer"
);

return;

}



const newPaid =
debt.paid_amount + value;



if(newPaid >= debt.total_amount){


await supabase

.from("debts")

.delete()

.eq("id",selectedDebt);



}else{


await supabase

.from("debts")

.update({

paid_amount:newPaid

})

.eq("id",selectedDebt);


}



setPaymentAmount("");

setSelectedDebt("");

setSearch("");


loadDebts();


};
const deleteDebt = async(id:string)=>{


if(
!confirm(
"Voulez-vous supprimer cette dette ?"
)
)
return;



await supabase

.from("debts")

.delete()

.eq("id",id);



loadDebts();


};



const filteredDebts = useMemo(()=>{


return debts.filter((d)=>

d.client_name

.toLowerCase()

.includes(
search.toLowerCase()
)

||

(d.phone || "")

.includes(search)

);


},[
debts,
search
]);




const totalFc = debts

.filter(
d=>d.currency==="FC"
)

.reduce(

(sum,d)=>

sum +

(
d.total_amount -
d.paid_amount
),

0

);



const totalUsd = debts

.filter(
d=>d.currency==="USD"
)

.reduce(

(sum,d)=>

sum +

(
d.total_amount -
d.paid_amount
),

0

);



const totalClients =
debts.length;



const totalPaid = debts.reduce(

(sum,d)=>

sum+d.paid_amount,

0

);



const visibleDebts =

showAll

?

debts

:

debts.slice(0,5);





return (

<main

className="
min-h-screen
bg-[#081221]
text-white
p-4
pb-24
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

🧾 Dettes clients

</h1>



<p

className="
text-slate-400
mt-1
"

>

Gestion des crédits et récupération d'argent

</p>


</div>




<button

onClick={()=>setShowGuide(!showGuide)}

className="
flex
items-center
gap-2
bg-orange-500/20
border
border-orange-400/30
px-4
py-3
rounded-xl
font-bold
"

>


<Sparkles size={18}/>

Guide


</button>


</div>





{/* GUIDE */}

{

showGuide &&

<div

className="
rounded-3xl
bg-black/30
border
border-white/10
p-5
text-sm
space-y-3
text-slate-300
"

>


<p>
👤 Ajoutez le nom et le téléphone du client.
</p>


<p>
💰 Choisissez la vraie monnaie : FC ou USD.
</p>


<p>
💳 Utilisez récupération quand le client paie.
</p>


<p>
📊 La progression montre combien est déjà récupéré.
</p>


</div>

}






{/* STATISTIQUES */}


<div

className="
grid
grid-cols-2
md:grid-cols-4
gap-4
"

>


<StatCard

title="Dette FC"

value={
totalFc.toLocaleString()+" FC"
}

/>



<StatCard

title="Dette USD"

value={
totalUsd.toLocaleString()+" $"
}

/>



<StatCard

title="Clients"

value={
String(totalClients)
}

/>



<StatCard

title="Récupéré"

value={
totalPaid.toLocaleString()
}

/>


</div>





{/* FORMULAIRES */}


<div

className="
grid
md:grid-cols-2
gap-5
"

>
  {/* NOUVELLE DETTE */}

<div
className="
rounded-3xl
bg-white/5
border
border-white/10
p-5
space-y-4
"
>


<h2
className="
font-black
text-xl
flex
items-center
gap-2
"
>

<UserPlus
className="text-orange-400"
/>

Nouvelle dette

</h2>



<input

placeholder="Nom du client"

value={name}

onChange={
e=>setName(e.target.value)
}

className={inputStyle}

/>



<input

placeholder="Numéro téléphone"

value={phone}

onChange={
e=>setPhone(e.target.value)
}

className={inputStyle}

/>



<input

type="number"

placeholder="Montant de la dette"

value={amount}

onChange={
e=>setAmount(e.target.value)
}

className={inputStyle}

/>




<p className="
text-sm
text-slate-400
">

Choisir la monnaie

</p>



<div
className="
grid
grid-cols-2
gap-3
"
>


<button

onClick={()=>setCurrency("FC")}

className={`
p-3
rounded-xl
font-black
border

${
currency==="FC"
?
"bg-orange-500 text-black"
:
"bg-black/30 border-white/10"
}

`}

>

🇨🇩 FC

</button>




<button

onClick={()=>setCurrency("USD")}

className={`
p-3
rounded-xl
font-black
border

${
currency==="USD"
?
"bg-green-500 text-black"
:
"bg-black/30 border-white/10"
}

`}

>

💵 USD

</button>


</div>





<button

onClick={addDebt}

className="
mt-3
w-full
py-4
rounded-xl
bg-gradient-to-r
from-orange-500
to-yellow-400
text-black
font-black
flex
justify-center
items-center
gap-2
"

>

<Plus size={18}/>

Ajouter la dette

</button>


</div>








{/* RECUPERATION */}


<div

className="
rounded-3xl
bg-white/5
border
border-white/10
p-5
"

>


<h2

className="
font-black
text-xl
mb-5
flex
items-center
gap-2
"

>


<CreditCard

className="text-green-400"

/>


Récupérer une dette


</h2>





<div

className="
relative
mb-4
"

>


<Search

size={20}

className="
absolute
left-4
top-1/2
-translate-y-1/2
text-slate-400
"

/>



<input


placeholder="Chercher un nom ou un numéro de téléphone..."


value={search}


onChange={e=>{

setSearch(e.target.value);

setSelectedDebt("");

}}


className="
w-full
pl-12
pr-4
py-4
rounded-2xl
bg-white
text-black
placeholder:text-slate-500
border-2
border-orange-500
outline-none
shadow-lg
focus:ring-4
focus:ring-orange-500/20
"

/>


</div>






{

search && !selectedDebt &&


<div

className="
rounded-xl
bg-black/60
overflow-hidden
"

>


{

filteredDebts.map(d=>(


<button

key={d.id}

onClick={()=>{

setSelectedDebt(d.id);

setSearch(d.client_name);

}}

className="
w-full
flex
justify-between
p-4
border-b
border-white/10
"

>


<span>

{d.client_name}

</span>



<span className="text-orange-400">


{(
d.total_amount -
d.paid_amount
).toLocaleString()} {d.currency}


</span>



</button>


))

}


</div>


}






{
selectedDebt &&


<div

className="
mt-4
rounded-2xl
bg-orange-500/10
border
border-orange-400/30
p-4
"

>


{

(()=>{

const d =
debts.find(
x=>x.id===selectedDebt
);


if(!d)
return null;



return (

<div className="space-y-2">


<p>

Client :

<b>
{d.client_name}
</b>

</p>


<p>

Reste :

<b className="text-orange-400">

{(
d.total_amount -
d.paid_amount
).toLocaleString()} {d.currency}

</b>

</p>


<p>

Paiement en :

<b className="text-green-400">

{d.currency}

</b>


</p>


</div>

)


})()

}


</div>

}






<input

type="number"

placeholder="Montant reçu"

value={paymentAmount}

onChange={
e=>setPaymentAmount(e.target.value)
}

className={`
${inputStyle}
mt-4
`}

/>




<button

onClick={payDebt}

className="
mt-4
w-full
py-4
rounded-xl
bg-green-500
text-black
font-black
flex
justify-center
items-center
gap-2
"

>

<CheckCircle size={18}/>

Valider le paiement

</button>


</div>


</div>
{/* LISTE DES DETTES */}

<div

className="
rounded-3xl
bg-white/5
border
border-white/10
p-5
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
flex
items-center
gap-2
"

>


<Wallet className="text-orange-400"/>

Toutes les dettes


</h2>



<button

onClick={()=>setShowAll(!showAll)}

className="
bg-orange-500
text-black
px-4
py-2
rounded-xl
font-bold
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

visibleDebts.length===0 ?


<p

className="
text-slate-400
text-center
py-8
"

>

Aucune dette enregistrée

</p>



:


<div className="space-y-4">


{

visibleDebts.map(d=>{


const reste =
d.total_amount -
d.paid_amount;



const percent =

d.total_amount > 0

?

Math.round(
(d.paid_amount /
d.total_amount)
*100
)

:

0;



return (


<div

key={d.id}

className="
rounded-3xl
bg-black/30
border
border-white/10
p-5
"

>



<div

className="
flex
justify-between
items-start
"

>


<div>


<h3

className="
font-black
text-lg
"

>

{d.client_name}

</h3>


<p

className="
text-sm
text-slate-400
"

>

📞 {d.phone}

</p>


</div>



<button

onClick={()=>deleteDebt(d.id)}

className="
bg-red-600
p-2
rounded-xl
"

>

<Trash2 size={16}/>

</button>



</div>






<div

className="
grid
grid-cols-2
gap-3
mt-4
text-sm
"

>


<div

className="
bg-white/5
rounded-xl
p-3
"

>

<p className="text-slate-400">

Dette totale

</p>


<b>

{d.total_amount.toLocaleString()} {d.currency}

</b>


</div>




<div

className="
bg-white/5
rounded-xl
p-3
"

>

<p className="text-slate-400">

Reste

</p>


<b className="text-orange-400">

{reste.toLocaleString()} {d.currency}

</b>


</div>



</div>






<div

className="
mt-4
h-3
rounded-full
bg-black/50
overflow-hidden
"

>


<div

className="
h-full
bg-gradient-to-r
from-green-400
to-orange-400
"

style={{

width:`${percent}%`

}}

/>


</div>





<p

className="
mt-2
text-sm
text-green-400
"

>

Récupéré : {percent}%

</p>



</div>


)


})

}


</div>


}


</div>



</div>


</main>


);


}







function StatCard({

title,

value

}:{

title:string;

value:string;

}){


return (

<div

className="
rounded-2xl
bg-white/5
border
border-white/10
p-4
"

>


<p

className="
text-sm
text-slate-400
"

>

{title}

</p>


<p

className="
mt-2
text-xl
font-black
"

>

{value}

</p>


</div>


);


}