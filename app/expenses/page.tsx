"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  PlusCircle,
  Trash2,
  Wallet,
  Banknote,
  Search,
  History
} from "lucide-react";



type Expense = {

  id:number;

  title:string;

  amount:number;

  currency:string;

  created_at:string;

};





export default function ExpensesPage(){



const [expenses,setExpenses] =
useState<Expense[]>([]);



const [title,setTitle] =
useState("");



const [amount,setAmount] =
useState("");



const [currency,setCurrency] =
useState("FC");



const [totalFc,setTotalFc] =
useState(0);



const [totalUsd,setTotalUsd] =
useState(0);




const [showAll,setShowAll] =
useState(false);



const [searchDate,setSearchDate] =
useState("");




const getDate = (date:Date)=>{


const offset =
date.getTimezoneOffset()*60000;



return new Date(
date.getTime()-offset
)

.toISOString()
.split("T")[0];


};





const todayStr =
getDate(new Date());



const yesterdayStr =
getDate(
new Date(
Date.now()-86400000
)
);







useEffect(()=>{


loadExpenses();


},[]);







const getUser = async()=>{


const phone =
localStorage.getItem("phone");



if(!phone)
return null;




const {data:user}=

await supabase

.from("users")

.select("id")

.eq(
"phone",
phone
)

.single();




return user;


};







const formatMoney=(value:number)=>{


return value.toLocaleString(
"fr-FR"
);


};







const loadExpenses = async()=>{


const user =
await getUser();



if(!user)
return;





const {data,error}=

await supabase

.from("expenses")

.select("*")

.eq(
"user_id",
user.id
)

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
(data || []) as Expense[];



setExpenses(list);





let fc=0;

let usd=0;




list.forEach((expense)=>{


if(

expense.created_at
.split("T")[0]

===

todayStr

){



if(
expense.currency==="FC"
){


fc += Number(
expense.amount
);



}else{


usd += Number(
expense.amount
);



}


}



});




setTotalFc(fc);

setTotalUsd(usd);



};








const addExpense = async()=>{


if(
!title ||
!amount
){


alert(
"Remplissez tous les champs"
);


return;


}




const user =
await getUser();



if(!user)
return;





const {error}=

await supabase

.from("expenses")

.insert([

{

title:title,

amount:Number(amount),

currency:currency,

user_id:user.id,

created_at:
new Date().toISOString()

}

]);




if(error){


alert(error.message);

return;


}




setTitle("");

setAmount("");



loadExpenses();



};
const deleteExpense = async(id:number)=>{


const confirmDelete =
confirm(
"Supprimer cette dépense ?"
);



if(!confirmDelete)
return;





const user =
await getUser();



if(!user)
return;





await supabase

.from("expenses")

.delete()

.eq(
"id",
id
)

.eq(
"user_id",
user.id
);





loadExpenses();



};







const todayExpenses =

expenses.filter(

(e)=>

e.created_at
.split("T")[0]

===

todayStr

);







const yesterdayExpenses =

expenses.filter(

(e)=>

e.created_at
.split("T")[0]

===

yesterdayStr

);








const searchedExpenses =

searchDate

?

expenses.filter(

(e)=>

e.created_at
.split("T")[0]

===

searchDate

)

:

expenses;







const displayedExpenses =

showAll

?

searchedExpenses

:

todayExpenses;








return (

<main

className="
min-h-screen
bg-[#081221]
text-white
p-4
pb-20
"

>


<div

className="
max-w-5xl
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
"

>


<div className="
flex
items-center
gap-3
"

>


<div

className="
bg-orange-500/20
p-3
rounded-2xl
"

>


<Wallet

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

Gestion des dépenses

</h1>


<p

className="
text-slate-400
"

>

Suivi des sorties d'argent du commerce

</p>


</div>



</div>


</div>







{/* TOTAUX */}



<div

className="
grid
md:grid-cols-2
gap-5
"

>


<MoneyCard

title="Dépenses du jour FC"

value={
formatMoney(totalFc)+" FC"
}

icon={<Wallet/>}

/>





<MoneyCard

title="Dépenses du jour USD"

value={
formatMoney(totalUsd)+" $"
}

icon={<Banknote/>}

/>



</div>









{/* AJOUT */}



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
font-black
text-xl
mb-4
"

>

➕ Nouvelle dépense

</h2>





<div

className="
space-y-3
"

>


<input

placeholder="Nom de la dépense"

value={title}

onChange={(e)=>
setTitle(e.target.value)
}

className="
w-full
rounded-xl
bg-black/40
border
border-white/10
p-3
"

/>






<input

type="number"

placeholder="Montant"

value={amount}

onChange={(e)=>
setAmount(e.target.value)
}

className="
w-full
rounded-xl
bg-black/40
border
border-white/10
p-3
"

/>







<select

value={currency}

onChange={(e)=>
setCurrency(e.target.value)
}

className="
w-full
rounded-xl
bg-black/40
border
border-white/10
p-3
"

>


<option value="FC">
FC
</option>


<option value="USD">
USD
</option>


</select>







<button

onClick={addExpense}

className="
w-full
rounded-xl
py-4
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


<PlusCircle size={18}/>

Ajouter la dépense


</button>



</div>


</div>









{/* CONTROLES HISTORIQUE */}



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
flex-col
md:flex-row
gap-3
"

>


<input

type="date"

value={searchDate}

onChange={(e)=>
setSearchDate(e.target.value)
}

className="
flex-1
rounded-xl
bg-black/40
border
border-white/10
p-3
"

/>





<button

onClick={()=>
setShowAll(!showAll)
}

className="
bg-orange-500
text-black
font-black
rounded-xl
px-5
py-3
flex
items-center
justify-center
gap-2
"

>


<History size={18}/>


{

showAll

?

"Cacher historique"

:

"Voir toutes les dépenses"

}



</button>



</div>


</div>
{/* LISTE DES DEPENSES */}



<div

className="
grid
md:grid-cols-2
gap-5
"

>


<ExpenseList

title="Aujourd'hui"

data={todayExpenses}

onDelete={deleteExpense}

/>




<ExpenseList

title="Hier"

data={yesterdayExpenses}

onDelete={deleteExpense}

/>


</div>








{

showAll && (



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
mb-5
"

>

📋 Historique complet des dépenses

</h2>




{

displayedExpenses.length===0

?


<p className="
text-slate-400
">

Aucune dépense trouvée

</p>



:


displayedExpenses.map((expense)=>(


<div

key={expense.id}

className="
flex
justify-between
items-center
border-b
border-white/10
py-4
"

>


<div>


<p className="
font-black
"

>

{expense.title}

</p>




<p className="
text-sm
text-slate-400
"

>

{formatMoney(expense.amount)}
{" "}
{expense.currency}

</p>




<p className="
text-xs
text-slate-500
"

>

📅 {new Date(
expense.created_at
).toLocaleString()}

</p>



</div>






<button

onClick={()=>
deleteExpense(expense.id)
}

className="
bg-red-600
p-2
rounded-xl
"

>


<Trash2 size={16}/>


</button>



</div>


))



}



</div>



)



}



</div>


</main>


);


}









function MoneyCard({

title,

value,

icon

}:any){



return (



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
"

>


<p className="
text-slate-400
"

>

{title}

</p>



<div className="
text-orange-400
">

{icon}

</div>


</div>




<p className="
text-2xl
font-black
mt-3
"

>

{value}

</p>



</div>



);



}









function ExpenseList({

title,

data,

onDelete

}:any){



return (



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
text-xl
font-black
text-orange-400
mb-4
"

>

{title}

</h2>





{

data.length===0

?


<p className="
text-slate-500
"

>

Aucune dépense

</p>



:


data.map((expense:Expense)=>(



<div

key={expense.id}

className="
flex
justify-between
items-center
border-b
border-white/10
py-3
"

>


<div>


<p className="
font-bold
"

>

{expense.title}

</p>



<p className="
text-sm
text-slate-400
"

>

{expense.amount.toLocaleString("fr-FR")}
{" "}
{expense.currency}

</p>



</div>





<button

onClick={()=>
onDelete(expense.id)
}

className="
bg-red-600
p-2
rounded-xl
"

>


<Trash2 size={15}/>


</button>




</div>



))



}



</div>



);



}