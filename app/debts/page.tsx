"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users,
  Wallet,
  Search,
  Plus,
  CheckCircle,
  CreditCard,
  Sparkles,
  UserPlus,
} from "lucide-react";


type Debt = {
  id: string;
  client_name: string;
  total_amount: number;
  paid_amount: number;
  currency: string;
};



export default function DebtsPage() {


const [debts,setDebts] = useState<Debt[]>([]);

const [name,setName] = useState("");

const [amount,setAmount] = useState("");

const [currency,setCurrency] = useState("FC");

const [paymentAmount,setPaymentAmount] = useState("");

const [selectedDebt,setSelectedDebt] = useState("");

const [searchTerm,setSearchTerm] = useState("");



useEffect(()=>{

loadDebts();

},[]);




const loadDebts = async()=>{


const phone = localStorage.getItem("phone");

if(!phone)return;



const {data:user}=await supabase
.from("users")
.select("id")
.eq("phone",phone)
.single();



if(!user)return;



const {data,error}=await supabase
.from("debts")
.select("*")
.eq("user_id",user.id)
.order("created_at",{ascending:false});



if(error){

console.log(error);
return;

}



setDebts(data || []);


};





const addDebt = async()=>{


if(!name || !amount){

alert("Veuillez remplir tous les champs");

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



const {error}=await supabase
.from("debts")
.insert({

client_name:name,

total_amount:Number(amount),

paid_amount:0,

currency,

user_id:user.id

});



if(error){

alert(error.message);

return;

}



setName("");

setAmount("");

loadDebts();


};





const payDebt = async()=>{


if(!selectedDebt || !paymentAmount)
return;



const debt =
debts.find(d=>d.id===selectedDebt);



if(!debt)return;



const remaining =
debt.total_amount - debt.paid_amount;



if(Number(paymentAmount)>remaining){

alert("Montant trop élevé");

return;

}



const newPaid =
debt.paid_amount + Number(paymentAmount);



if(debt.total_amount-newPaid<=0){


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

setSearchTerm("");

loadDebts();


};





const filteredDebts =
debts.filter((d)=>

d.client_name
.toLowerCase()
.includes(searchTerm.toLowerCase())

);




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




<div className="
relative
z-10
max-w-xl
mx-auto
">



{/* HEADER */}


<div className="
flex
items-center
justify-between
mb-7
">


<div>

<h1 className="
text-3xl
font-black
">

🧾

<span className="text-orange-400">

 Dettes

</span>

</h1>


<p className="
text-sm
text-slate-400
mt-1
">

Clients & paiements

</p>


</div>



<div className="
rounded-2xl
bg-orange-500/10
border
border-orange-400/30
p-3
">

<Users
className="text-orange-400"
/>


</div>



</div>
{/* NOUVELLE DETTE */}

<div className="
rounded-3xl
border
border-white/10
bg-white/5
p-5
backdrop-blur-xl
shadow-2xl
mb-5
">


<div className="
flex
items-center
gap-2
mb-5
">


<UserPlus
className="text-orange-400"
/>


<h2 className="
font-bold
text-lg
">

Nouvelle dette

</h2>


</div>



<div className="space-y-3">



<input

placeholder="Nom du client"

value={name}

onChange={(e)=>setName(e.target.value)}

className="
w-full
rounded-2xl
border
border-white/10
bg-black/30
p-4
outline-none
text-white
placeholder:text-slate-500
"

/>



<input

type="number"

placeholder="Montant"

value={amount}

onChange={(e)=>setAmount(e.target.value)}

className="
w-full
rounded-2xl
border
border-white/10
bg-black/30
p-4
outline-none
text-white
placeholder:text-slate-500
"

/>



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
FC
</option>

<option value="$">
USD
</option>


</select>





<button

onClick={addDebt}

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
"

>


<Plus size={20}/>

Ajouter la dette


</button>



</div>



</div>





{/* PAIEMENT */}

<div className="
rounded-3xl
border
border-white/10
bg-white/5
p-5
backdrop-blur-xl
shadow-2xl
mb-6
">



<div className="
flex
items-center
gap-2
mb-5
">


<CreditCard
className="text-orange-400"
/>


<h2 className="font-bold text-lg">

Recevoir paiement

</h2>


</div>




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

placeholder="Rechercher un client"

value={searchTerm}

onChange={(e)=>{

setSearchTerm(e.target.value);

setSelectedDebt("");

}}

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




{searchTerm && !selectedDebt && (


<div className="
mt-3
rounded-2xl
overflow-hidden
border
border-white/10
bg-black/60
">


{filteredDebts.map((d)=>{


const rest =
d.total_amount-d.paid_amount;



return (


<button

key={d.id}

onClick={()=>{

setSelectedDebt(d.id);

setSearchTerm(d.client_name);

}}

className="
w-full
flex
items-center
justify-between
p-4
border-b
border-white/5
hover:bg-white/10
transition
"

>


<span className="font-semibold">

{d.client_name}

</span>



<span className="
text-orange-400
text-sm
">

{rest} {d.currency}

</span>



</button>


)


})}


</div>


)}





<input

type="number"

placeholder="Montant reçu"

value={paymentAmount}

onChange={(e)=>setPaymentAmount(e.target.value)}

className="
mt-4
w-full
rounded-2xl
border
border-white/10
bg-black/30
p-4
outline-none
text-white
placeholder:text-slate-500
"

/>





<button

onClick={payDebt}

className="
mt-3
flex
w-full
items-center
justify-center
gap-2
rounded-2xl
bg-green-500
py-4
font-black
text-black
transition
hover:bg-green-400
"

>


<CheckCircle size={20}/>

Valider paiement


</button>



</div>






{/* LISTE DETTES */}


<div>


<div className="
flex
items-center
gap-2
justify-center
mb-4
">


<Wallet
className="text-orange-400"
/>


<h2 className="
font-black
text-xl
">

Dettes actives

</h2>


</div>




{debts.length===0 ? (


<div className="
rounded-3xl
border
border-white/10
bg-white/5
p-8
text-center
text-slate-400
">

Aucune dette enregistrée


</div>



):(



<div className="space-y-4">


{debts.map((d)=>{


const remaining =
d.total_amount-d.paid_amount;



const percent =
d.total_amount>0
?
(d.paid_amount/d.total_amount)*100
:
0;



return (


<div

key={d.id}

className="
rounded-3xl
border
border-white/10
bg-white/5
p-5
backdrop-blur-xl
"


>


<div className="
flex
justify-between
items-center
mb-3
">


<div>

<p className="
font-black
text-lg
">

{d.client_name}

</p>


<p className="
text-xs
text-slate-400
">

Total : {d.total_amount} {d.currency}

</p>


</div>



<div className="
rounded-full
bg-orange-500/10
px-3
py-1
text-sm
font-bold
text-orange-300
">

{remaining} {d.currency}

</div>


</div>





<div className="
h-3
w-full
rounded-full
bg-black/40
overflow-hidden
">


<div

className="
h-full
rounded-full
bg-gradient-to-r
from-orange-500
to-yellow-400
"

style={{
width:`${percent}%`
}}

/>


</div>



<p className="
mt-2
text-xs
text-slate-400
">

Payé : {d.paid_amount} {d.currency}

</p>



</div>


)


})}



</div>


)}



</div>





</div>


</main>


);

}