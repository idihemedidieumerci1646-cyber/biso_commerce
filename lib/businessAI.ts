import { supabase } from "@/lib/supabase";


export async function businessAI(question:string){

  const phone = localStorage.getItem("phone");

  if(!phone){
    return "Utilisateur non connecté.";
  }


  const {data:user} = await supabase
    .from("users")
    .select("id")
    .eq("phone",phone)
    .single();


  if(!user){
    return "Utilisateur introuvable.";
  }



  const q = question.toLowerCase();



  // =========================
  // VENTES DU JOUR
  // =========================

  if(
    q.includes("vendu") ||
    q.includes("vente")
  ){

    const today =
    new Date()
    .toISOString()
    .split("T")[0];


    const {data:sales}=await supabase
    .from("sales")
    .select("*")
    .eq("user_id",user.id);



    let fc = 0;
    let usd = 0;


    sales?.forEach((s)=>{


      if(
        s.created_at
        .split("T")[0]
        === today
      ){

        if(s.currency==="FC"){
          fc += Number(s.total_sale);
        }
        else{
          usd += Number(s.total_sale);
        }

      }


    });



    return `
📊 Résultat des ventes aujourd'hui :

💵 ${fc} FC

💲 ${usd} USD

Continuez à suivre votre commerce.
`;

  }






  // =========================
  // BENEFICE
  // =========================


  if(
    q.includes("bénéfice") ||
    q.includes("profit")
  ){


    const today =
    new Date()
    .toISOString()
    .split("T")[0];



    const {data:sales}=await supabase
    .from("sales")
    .select("*")
    .eq("user_id",user.id);



    let fc = 0;
    let usd = 0;



    sales?.forEach((s)=>{


      if(
        s.created_at
        .split("T")[0]
        === today
      ){


        if(s.currency==="FC"){

          fc += Number(s.profit);

        }else{

          usd += Number(s.profit);

        }


      }


    });



    return `
📈 Votre bénéfice aujourd'hui :

🟠 ${fc} FC

🟢 ${usd} USD

`;

  }







  // =========================
  // STOCK FAIBLE
  // =========================


  if(
    q.includes("stock") ||
    q.includes("rupture")
  ){


    const {data:products}=await supabase
    .from("products")
    .select("*")
    .eq("user_id",user.id);



    const low =
    products?.filter(
      p=>Number(p.stock)<=5
    );



    if(!low || low.length===0){

      return `
✅ Aucun produit en stock faible.

Votre stock est correct.
`;

    }



    return `
⚠️ Produits à surveiller :

${
low.map(
p=>`📦 ${p.name} : ${p.stock}`
)
.join("\n")
}

`;

  }







  // =========================
  // DETTES
  // =========================


  if(
    q.includes("doit") ||
    q.includes("dette")
  ){



    const {data:debts}=await supabase
    .from("debts")
    .select("*")
    .eq("user_id",user.id);



    if(!debts || debts.length===0){

      return "✅ Aucun client avec une dette.";

    }



    const biggest =
    debts.sort(
      (a,b)=>
      (b.total_amount-b.paid_amount)
      -
      (a.total_amount-a.paid_amount)
    )[0];



    return `
👤 Client avec la plus grande dette :

${biggest.client_name}

💰 Reste :
${biggest.total_amount-biggest.paid_amount}
${biggest.currency}
`;

  }






  return `
🤖 Je peux répondre à :

- ventes aujourd'hui
- bénéfice aujourd'hui
- stock faible
- client qui doit le plus

Posez-moi une question commerciale.
`;

}