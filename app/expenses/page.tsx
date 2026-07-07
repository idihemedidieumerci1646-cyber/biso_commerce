"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Wallet,
  TrendingUp,
  Receipt,
  PlusCircle,
  Trash2,
  Sparkles,
  Banknote,
} from "lucide-react";

type Sale = {
  total_sale: number;
  profit: number;
  currency: string;
  created_at: string;
};

type Expense = {
  id: number;
  title: string;
  amount: number;
  currency: string;
  created_at: string;
};

export default function ReportsPage() {

  const [todayFc, setTodayFc] = useState(0);
  const [todayUsd, setTodayUsd] = useState(0);

  const [todayProfitFc, setTodayProfitFc] = useState(0);
  const [todayProfitUsd, setTodayProfitUsd] = useState(0);

  const [todayExpenseFc, setTodayExpenseFc] = useState(0);
  const [todayExpenseUsd, setTodayExpenseUsd] = useState(0);

  const [expensesList, setExpensesList] = useState<Expense[]>([]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("FC");

  const now = new Date();

  const offset = now.getTimezoneOffset() * 60000;

  const localDate = new Date(
    now.getTime() - offset
  );

  const todayStr =
    localDate.toISOString().split("T")[0];


  const yesterdayDate = new Date(localDate);

  yesterdayDate.setDate(
    localDate.getDate() - 1
  );

  const yesterdayStr =
    yesterdayDate.toISOString().split("T")[0];


  useEffect(() => {
    load();
  }, []);


  const load = async () => {

    const phone =
      localStorage.getItem("phone");

    if (!phone) return;


    const { data:user } =
      await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();


    if (!user) return;


    const { data:sales } =
      await supabase
      .from("sales")
      .select("*")
      .eq("user_id", user.id);



    const { data:expenses } =
      await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order(
        "created_at",
        {
          ascending:false
        }
      );


    setExpensesList(
      expenses || []
    );


    let tFc = 0;
    let tUsd = 0;

    let pfFc = 0;
    let pfUsd = 0;

    let expFc = 0;
    let expUsd = 0;



    sales?.forEach(
      (s:Sale)=>{

        if(
          s.created_at.split("T")[0]
          === todayStr
        ){

          if(
            s.currency==="FC"
          ){

            tFc += Number(
              s.total_sale || 0
            );

            pfFc += Number(
              s.profit || 0
            );

          }else{

            tUsd += Number(
              s.total_sale || 0
            );

            pfUsd += Number(
              s.profit || 0
            );

          }

        }

      }
    );



    expenses?.forEach(
      (e:Expense)=>{

        if(
          e.created_at.split("T")[0]
          === todayStr
        ){

          if(
            e.currency==="FC"
          ){

            expFc += Number(
              e.amount || 0
            );

          }else{

            expUsd += Number(
              e.amount || 0
            );

          }

        }

      }
    );


    setTodayFc(tFc);
    setTodayUsd(tUsd);

    setTodayProfitFc(pfFc);
    setTodayProfitUsd(pfUsd);

    setTodayExpenseFc(expFc);
    setTodayExpenseUsd(expUsd);

  };



  const addExpense = async()=>{


    if(
      !title ||
      !amount
    ){

      alert(
        "Remplissez les champs"
      );

      return;

    }


    const phone =
      localStorage.getItem("phone");


    if(!phone)
      return;



    const {data:user} =
      await supabase
      .from("users")
      .select("id")
      .eq("phone",phone)
      .single();



    if(!user)
      return;



    const {error}=

      await supabase
      .from("expenses")
      .insert([
        {
          title,
          amount:Number(amount),
          currency,
          user_id:user.id
        }
      ]);



    if(error){

      alert(error.message);

      return;

    }



    setTitle("");
    setAmount("");

    load();

  };
   
  const deleteExpense = async (id:number)=>{

    if(!confirm("Supprimer cette dépense ?"))
      return;


    const phone =
      localStorage.getItem("phone");


    if(!phone)
      return;


    const {data:user}=await supabase
      .from("users")
      .select("id")
      .eq("phone",phone)
      .single();


    if(!user)
      return;


    await supabase
      .from("expenses")
      .delete()
      .eq("id",id)
      .eq("user_id",user.id);


    load();

  };



  const todayExpenses =
    expensesList.filter(
      (e)=>
      e.created_at &&
      e.created_at.split("T")[0]===todayStr
    );


  const yesterdayExpenses =
    expensesList.filter(
      (e)=>
      e.created_at &&
      e.created_at.split("T")[0]===yesterdayStr
    );



return (

<main className="
relative
min-h-screen
overflow-hidden
bg-[#081221]
text-white
p-4
pb-20
">


{/* LIGHT EFFECT */}




<div className="
relative
z-10
max-w-5xl
mx-auto
space-y-6
">


{/* HEADER */}

<div>

<div className="flex items-center gap-3">

<div className="
bg-orange-500/20
p-3
rounded-2xl
border
border-orange-400/30
">

<TrendingUp
className="text-orange-400"
/>

</div>


<div>

<h1 className="
text-3xl
font-black
">

Rapports

</h1>


<p className="
text-sm
text-slate-400
">

Analyse ventes & dépenses

</p>


</div>

</div>

</div>





{/* RESULTAT */}

<div className="
grid
sm:grid-cols-2
gap-4
">


<Card

title="Bénéfice restant FC"

value={
`${todayProfitFc - todayExpenseFc} FC`
}

icon={<Wallet/>}

/>


<Card

title="Bénéfice restant USD"

value={
`${todayProfitUsd - todayExpenseUsd} $`
}

icon={<Banknote/>}

/>


</div>





{/* VENTES */}

<div className="
grid
sm:grid-cols-2
gap-4
">


<InfoCard

title="Ventes du jour FC"

value={`${todayFc} FC`}

/>


<InfoCard

title="Ventes du jour USD"

value={`${todayUsd} $`}

/>


</div>





{/* AJOUT DEPENSE */}

<div className="
rounded-3xl
border
border-white/10
bg-white/5
backdrop-blur-xl
p-5
shadow-2xl
">


<div className="
flex
items-center
gap-2
mb-4
">

<PlusCircle
className="text-orange-400"
/>


<h2 className="font-bold text-lg">

Nouvelle dépense

</h2>


</div>



<div className="
space-y-3
">


<input

placeholder="Nom de la dépense"

value={title}

onChange={
(e)=>setTitle(e.target.value)
}

className="
w-full
rounded-xl
bg-black/40
border
border-white/10
p-3
outline-none
text-white
"

/>



<input

type="number"

placeholder="Montant"

value={amount}

onChange={
(e)=>setAmount(e.target.value)
}

className="
w-full
rounded-xl
bg-black/40
border
border-white/10
p-3
outline-none
text-white
"

/>




<select

value={currency}

onChange={
(e)=>setCurrency(e.target.value)
}

className="
w-full
rounded-xl
bg-black/40
border
border-white/10
p-3
text-white
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
font-bold
text-black
bg-gradient-to-r
from-orange-500
to-yellow-400
hover:scale-[1.02]
transition
flex
items-center
justify-center
gap-2
"

>

<Sparkles size={18}/>

Ajouter la dépense

</button>


</div>


</div>





{/* LISTES */}

<div className="
grid
md:grid-cols-2
gap-5
">



<ExpenseBox

title="Aujourd'hui"

data={todayExpenses}

color="text-green-400"

onDelete={deleteExpense}

/>



<ExpenseBox

title="Hier"

data={yesterdayExpenses}

color="text-orange-400"

onDelete={deleteExpense}

/>



</div>



</div>


</main>

);

}





function Card(
{
title,
value,
icon
}:any
){

return (

<div className="
rounded-3xl
border
border-white/10
bg-white/5
backdrop-blur-xl
p-5
shadow-xl
">


<div className="
flex
justify-between
items-center
mb-3
">


<p className="
text-sm
text-slate-400
">

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
text-white
">

{value}

</p>


</div>

);

}





function InfoCard(
{
title,
value
}:any
){

return (

<div className="
bg-slate-900/70
border
border-slate-800
rounded-2xl
p-4
">

<p className="
text-xs
text-slate-400
">

{title}

</p>


<p className="
text-xl
font-bold
text-green-400
">

{value}

</p>


</div>

);

}





function ExpenseBox(
{
title,
data,
color,
onDelete
}:any
){

return (

<div className="
rounded-3xl
border
border-white/10
bg-white/5
backdrop-blur-xl
p-5
">


<h3 className={`
font-bold
mb-4
${color}
`}>

{title}

</h3>



{
data.length===0 ?

<p className="
text-slate-500
text-sm
">

Aucune dépense

</p>


:


data.map(
(exp:Expense)=>(

<div
key={exp.id}
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

<p className="font-bold">

{exp.title}

</p>

<p className="text-sm text-slate-400">

{exp.amount} {exp.currency}

</p>


</div>



<button

onClick={()=>
onDelete(exp.id)
}

className="
bg-red-600
p-2
rounded-lg
"

>

<Trash2 size={15}/>

</button>



</div>

)

)

}



</div>

);

}