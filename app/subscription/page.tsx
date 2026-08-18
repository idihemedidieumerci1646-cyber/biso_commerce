"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle2,
  Clock3,
  Crown,
  MessageCircle,
  Smartphone,
  ShieldCheck,
  Sparkles
} from "lucide-react";


export default function SubscriptionPage(){


const [subscription,setSubscription]=useState<any>(null);


const [daysUsed,setDaysUsed]=useState(0);

const [daysLeft,setDaysLeft]=useState(30);



const [status,setStatus]=useState<
"active"|"expired"|"pending"
>("active");



const [fullName,setFullName]=useState("");

const [phone,setPhone]=useState("");



const [showConfirmation,setShowConfirmation]=useState(false);

const [loading,setLoading]=useState(false);







useEffect(()=>{

loadSubscription();

},[]);








const loadSubscription=async()=>{


const phoneStorage=
localStorage.getItem("phone");


if(!phoneStorage)return;




const {data:user}=await supabase

.from("users")

.select("id")

.eq(
"phone",
phoneStorage
)

.single();




if(!user)return;





const {data}=await supabase

.from("subscriptions")

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
)

.limit(1)

.maybeSingle();






if(!data){

setStatus("expired");

return;

}





setSubscription(data);






const now=new Date();


const start=data.start_date
?
new Date(data.start_date)
:
null;




let used=0;



if(start){


const diff=

now.getTime()
-
start.getTime();



used=Math.floor(

diff /
(
1000*
60*
60*
24
)

);



if(used<0)
used=0;


}





const left=Math.max(
0,
30-used
);





setDaysUsed(used);

setDaysLeft(left);






if(data.status==="pending"){


setStatus("pending");


}

else if(
data.is_active===true
||
data.status==="trial"
){


setStatus("active");


}

else{


setStatus("expired");


}



};













const openWhatsApp=(message:string)=>{


const url=

"https://wa.me/243994864173?text="
+
encodeURIComponent(message);



window.open(
url,
"_blank"
);


};









const handleRenew=async()=>{


if(!fullName || !phone){


alert(
"Veuillez remplir votre nom et votre numéro"
);


return;


}



setLoading(true);





const phoneStorage=

localStorage.getItem("phone");




const {data:user}=await supabase

.from("users")

.select("id")

.eq(
"phone",
phoneStorage
)

.single();






if(
!user
||
!subscription?.id
){

setLoading(false);

return;

}







await supabase

.from("subscriptions")

.update({

full_name:fullName,

phone:phone,

status:"pending",

user_id:user.id


})

.eq(
"id",
subscription.id
)

.eq(
"user_id",
user.id
);







setStatus("pending");




setShowConfirmation(true);



setLoading(false);



};








return (

<main

className="
min-h-screen
bg-[#020617]
text-white
px-4
py-8
"

>


<div

className="
max-w-2xl
mx-auto
space-y-6
"

>







{/* HEADER */}


<div

className="
rounded-[32px]
p-6
bg-gradient-to-br
from-slate-900
to-blue-950
border
border-white/10
shadow-xl
"

>


<div

className="
flex
items-center
gap-3
"

>


<Crown

className="
text-yellow-400
"

size={35}

/>



<h1

className="
text-2xl
font-black
"

>

Biso-Commerce

</h1>


</div>





<p

className="
text-slate-400
mt-3
"

>

Gérez votre commerce facilement et professionnellement.

</p>







{/* TARIF */}


<div

className="
mt-5
rounded-2xl
bg-black/30
border
border-orange-400/20
p-4
flex
items-center
justify-between
"

>


<div>

<p

className="
text-sm
text-slate-400
"

>

Abonnement mensuel

</p>


<p

className="
text-lg
font-bold
"

>

Fini les calculs compliqués dans les cahiers 📒❌

</p>


</div>





<div

className="
text-right
"

>

<p

className="
text-3xl
font-black
text-orange-400
"

>

5$

</p>


<p

className="
text-xs
text-slate-400
"

>

/ mois

</p>


</div>



</div>




</div>






{/* STATUT */}


<div

className="
bg-white/5
border
border-white/10
rounded-[30px]
p-6
shadow-xl
"

>


<div

className="
flex
items-center
justify-between
"

>


<div>


<p

className="
text-sm
text-slate-400
"

>

Statut abonnement

</p>




<h2

className={`

mt-2
text-3xl
font-black

${
status==="active"
?
"text-green-400"
:
status==="pending"
?
"text-yellow-400"
:
"text-red-400"
}

`}

>

{

status==="active"

?

"🟢 Actif"

:

status==="pending"

?

"⏳ Vérification"

:

"🔴 Expiré"

}


</h2>



</div>





{

status==="active"

?

<CheckCircle2
size={42}
className="text-green-400"
/>


:

status==="pending"

?

<Clock3
size={42}
className="text-yellow-400"
/>


:

<ShieldCheck
size={42}
className="text-red-400"
/>


}



</div>


</div>









{/* COMPTEUR 30 JOURS */}



<div

className="
bg-gradient-to-br
from-slate-900
to-slate-800
border
border-white/10
rounded-[30px]
p-6
"

>


<div

className="
flex
justify-between
"

>


<h3

className="
font-black
"

>

📅 Utilisation

</h3>



<span

className="
text-orange-400
font-bold
"

>

{daysLeft} jours restants

</span>



</div>






<div

className="
mt-5
h-3
bg-black/50
rounded-full
overflow-hidden
"

>


<div

className="
h-full
bg-gradient-to-r
from-orange-500
to-green-500
"

style={{

width:

`${Math.min(
100,
(daysUsed/30)*100
)}%`

}}

/>


</div>





<p

className="
text-sm
text-slate-400
mt-3
"

>

{daysUsed} / 30 jours utilisés

</p>



</div>









{/* GUIDE PAIEMENT */}



<div

className="
bg-gradient-to-br
from-orange-500/10
to-blue-500/10
border
border-white/10
rounded-[30px]
p-6
"

>


<h3

className="
font-black
text-xl
"

>

💳 Comment payer ?

</h3>




<div

className="
mt-4
space-y-3
text-sm
text-slate-300
"

>


<p>

1️⃣ Envoyez <b>5$</b> par Mobile Money

</p>



<p>

2️⃣ Gardez la preuve du paiement

</p>



<p>

3️⃣ Écrivez votre nom et votre numéro

</p>



<p>

4️⃣ Envoyez la capture sur WhatsApp

</p>



<p>

5️⃣ Attendez la validation de l'administration

</p>



</div>


</div>









{/* PAIEMENT */}



<div

className="
bg-white/5
border
border-white/10
rounded-[30px]
p-6
"

>


<h3

className="
text-xl
font-black
flex
gap-2
items-center
"

>


<Smartphone size={22}/>

Nos moyens de paiement

</h3>






<div

className="
mt-5
space-y-3
"

>





<div

className="
bg-black/40
rounded-2xl
p-4
border
border-white/5
"

>


<p

className="
font-bold
"

>

🔴 Airtel Money

</p>



<p

className="
text-orange-400
font-bold
"

>

+243 994 864 173

</p>



<p

className="
text-xs
text-slate-400
"

>

Nom : DIEUMERCI IDI

</p>


</div>









<div

className="
bg-black/40
rounded-2xl
p-4
border
border-white/5
"

>


<p

className="
font-bold
"

>

🟠 Orange Money

</p>



<p

className="
text-orange-400
font-bold
"

>

+243 891 618 812

</p>



<p

className="
text-xs
text-slate-400
"

>

Nom : DIEUMERCI IDI

</p>


</div>









<div

className="
bg-black/40
rounded-2xl
p-4
border
border-white/5
"

>


<p

className="
font-bold
"

>

🔵 M-Pesa

</p>



<p

className="
text-orange-400
font-bold
"

>

+243 810 168 651

</p>



<p

className="
text-xs
text-slate-400
"

>

Nom : DIEUMERCI IDI

</p>


</div>






</div>


</div>







{/* FORMULAIRE */}



<div

className="
bg-white/5
border
border-white/10
rounded-[30px]
p-6
"

>


<h3

className="
text-xl
font-black
"

>

🔄 Demande d'activation

</h3>




<p

className="
text-sm
text-slate-400
mt-2
"

>

Après votre paiement, remplissez vos informations.

</p>







<div

className="
space-y-4
mt-5
"

>



<input


type="text"

placeholder="👤 Nom complet"

value={fullName}

onChange={(e)=>setFullName(e.target.value)}

className="
w-full
p-4
rounded-2xl
bg-black/50
border
border-white/10
outline-none
"

style={{
color:"#fff",
WebkitTextFillColor:"#fff"
}}

/>






<input


type="tel"

placeholder="📱 Numéro téléphone"

value={phone}

onChange={(e)=>setPhone(e.target.value)}

className="
w-full
p-4
rounded-2xl
bg-black/50
border
border-white/10
outline-none
"

style={{
color:"#fff",
WebkitTextFillColor:"#fff"
}}

/>







<button


onClick={handleRenew}


disabled={loading}


className="
w-full
p-4
rounded-2xl
bg-gradient-to-r
from-orange-500
to-blue-600
font-black
text-lg
"

>


{

loading

?

"⏳ Enregistrement..."

:

"✅ Envoyer pour vérification"

}



</button>




</div>



</div>









{/* MESSAGE VERIFICATION */}



{

status==="pending"

&&


<div

className="
bg-yellow-500/10
border
border-yellow-400/30
rounded-3xl
p-5
text-yellow-300
"

>


<h3

className="
font-black
text-lg
"

>

⏳ Paiement en vérification

</h3>



<p

className="
text-sm
mt-2
"

>

Votre demande est envoyée.

L'administration va vérifier votre paiement.

</p>



</div>



}









{/* WHATSAPP CAPTURE */}



{

showConfirmation

&&


<div

className="
bg-green-500/10
border
border-green-400/30
rounded-3xl
p-6
"

>


<h3

className="
text-xl
font-black
"

>

📸 Envoyer la preuve

</h3>




<p

className="
text-sm
text-slate-300
mt-2
"

>

Cliquez pour envoyer votre capture de paiement directement.

</p>





<button


onClick={()=>openWhatsApp(

`Bonjour DIEUMERCI IDI (PDG),

Je viens de payer mon abonnement Biso-Commerce.

Nom : ${fullName}

Numéro : ${phone}

Je vous envoie la preuve du paiement.`

)}


className="
mt-5
w-full
p-4
rounded-2xl
bg-green-600
font-black
flex
justify-center
items-center
gap-2
"

>


<MessageCircle size={22}/>


Envoyer la capture WhatsApp


</button>



</div>



}




{/* IDEE AMELIORATION */}



<div

className="
bg-white/5
border
border-white/10
rounded-[30px]
p-6
"

>


<h3

className="
text-xl
font-black
"

>

💡 Proposer une idée

</h3>



<p

className="
text-sm
text-slate-400
mt-2
"

>

Une suggestion pour améliorer l'application ?

</p>






<button


onClick={()=>openWhatsApp(

`Bonjour DIEUMERCI IDI (PDG),

Je voudrais proposer une amélioration pour Biso-Commerce.`

)}



className="
mt-5
w-full
p-4
rounded-2xl
bg-orange-500
text-black
font-black
"

>


🚀 Envoyer une proposition


</button>



</div>









{/* SIGNATURE */}



<footer

className="
text-center
py-8
"

>


<p

className="
font-black
text-xl
"

>

Biso-Commerce

</p>



<p

className="
text-orange-400
font-black
mt-2
"

>

DIEUMERCI IDI (PDG)

</p>




<p

className="
text-xs
text-slate-500
"

>

KINSHASA, RDC

</p>



</footer>








</div>

</main>


);


}