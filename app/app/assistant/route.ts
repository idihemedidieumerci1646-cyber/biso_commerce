import { NextResponse } from "next/server";


export async function POST(req: Request) {


  try {


    const body = await req.json();


    const message =
      String(body.message || "")
      .toLowerCase()
      .trim();


    const data = body.data || {};



    if (!message) {

      return NextResponse.json({
        reply: "Veuillez poser une question."
      });

    }




    const ventes = data.ventes || [];

    const produits = data.produits || [];

    const expenses = data.expenses || [];

    const dettes = data.dettes || [];





    let totalVentes = 0;

    let totalBenefice = 0;

    let totalDepenses = 0;

    let totalDettes = 0;




    ventes.forEach((v:any)=>{


      totalVentes += Number(
        v.total_sale || 0
      );


      totalBenefice += Number(
        v.profit || 0
      );


    });





    expenses.forEach((e:any)=>{


      totalDepenses += Number(
        e.amount || 0
      );


    });





    dettes.forEach((d:any)=>{


      totalDettes +=
      Number(d.total_amount || 0)
      -
      Number(d.paid_amount || 0);


    });





    const stockFaible =
      produits.filter(
        (p:any)=>Number(p.stock) <= 5
      );





    const classement:any = {};



    ventes.forEach((v:any)=>{


      const nom =
      v.product_name || "Produit inconnu";


      classement[nom] =
      (classement[nom] || 0)
      +
      Number(v.quantity || 0);



    });





    const topProduits =
      Object.entries(classement)
      .sort(
        (a:any,b:any)=>b[1]-a[1]
      )
      .slice(0,5);





    let reply = "";

        if(
      message.includes("vente") ||
      message.includes("vendu") ||
      message.includes("chiffre") ||
      message.includes("revenu")
    ){


      reply = `
📊 ANALYSE DES VENTES


💰 Chiffre d'affaires :

${totalVentes} FC


🛒 Nombre de ventes :

${ventes.length}



🏆 Produits les plus vendus :


${
topProduits.length > 0
?
topProduits
.map(
(item:any,index:number)=>
`${index+1}️⃣ ${item[0]} : ${item[1]} vendus`
)
.join("\n")
:
"Aucune vente enregistrée"
}



💡 Conseil :

Continuez à développer les produits qui attirent vos clients.
`;

    }





    else if(
      message.includes("bénéfice") ||
      message.includes("benefice") ||
      message.includes("profit") ||
      message.includes("gain") ||
      message.includes("gagn")
    ){



      const resultat =
      totalBenefice - totalDepenses;



      reply = `
📈 ANALYSE DU BÉNÉFICE



💰 Bénéfice :

${totalBenefice} FC



💸 Dépenses :

${totalDepenses} FC



📊 Résultat après dépenses :

${resultat} FC



Analyse :

${
resultat > 0
?
"✅ Votre commerce génère une marge positive."
:
"⚠️ Les dépenses doivent être mieux contrôlées."
}



💡 Conseil :

Favorisez les produits avec une meilleure rentabilité.
`;

    }






    else if(
      message.includes("produit") ||
      message.includes("meilleur") ||
      message.includes("top") ||
      message.includes("marche")
    ){



      reply = `
🏆 ANALYSE DES PRODUITS



Produits les plus performants :



${
topProduits.length > 0
?
topProduits
.map(
(item:any,index:number)=>
`${index+1}️⃣ ${item[0]} : ${item[1]} ventes`
)
.join("\n")
:
"Aucune donnée disponible"
}



💡 Conseil :

Augmentez le stock des produits qui se vendent rapidement.
`;

    }






    else if(
      message.includes("stock") ||
      message.includes("rupture") ||
      message.includes("manque") ||
      message.includes("commander")
    ){



      reply = `
⚠️ ANALYSE DU STOCK



Produits à surveiller :

${stockFaible.length}



${
stockFaible.length > 0
?
stockFaible
.map(
(p:any)=>
`📦 ${p.name} : ${p.stock} ${p.unit}`
)
.join("\n")
:
"✅ Aucun produit critique."
}



💡 Conseil :

Réapprovisionnez avant la rupture.
`;

    }






    else if(
      message.includes("dette") ||
      message.includes("doit") ||
      message.includes("client")
    ){


      reply = `
💳 ANALYSE DES DETTES CLIENTS



Montant restant :

${totalDettes} FC



Clients concernés :

${dettes.length}



💡 Conseil :

Relancez les clients avec les montants les plus élevés.
`;

    }
        else if(
      message.includes("résumé") ||
      message.includes("resume") ||
      message.includes("rapport") ||
      message.includes("commerce") ||
      message.includes("situation")
    ){


      const resultat =
      totalBenefice - totalDepenses;



      reply = `
📊 RAPPORT GLOBAL BISO-COMMERCE



💰 Chiffre d'affaires :

${totalVentes} FC



📈 Bénéfices :

${totalBenefice} FC



💸 Dépenses :

${totalDepenses} FC



📊 Résultat :

${resultat} FC



📦 Produits :

${produits.length}



⚠️ Stock faible :

${stockFaible.length}



💳 Dettes clients :

${totalDettes} FC



🔎 Analyse :


${
resultat > 0
?
"✅ Votre commerce évolue positivement."
:
"⚠️ Il faut améliorer la gestion des dépenses."
}



🎯 Priorités :

1️⃣ Surveiller les stocks.

2️⃣ Développer les produits rentables.

3️⃣ Suivre les dettes clients.

`;

    }





    else if(
      message.includes("conseil") ||
      message.includes("aide") ||
      message.includes("progresser") ||
      message.includes("améliorer") ||
      message.includes("ameliorer")
    ){



      reply = `
🚀 CONSEILS DE L'ASSISTANT BISO



📦 Stock :

${
stockFaible.length > 0
?
`⚠️ ${stockFaible.length} produit(s) doivent être commandés.`
:
"✅ Votre stock est correct."
}



💰 Gestion :

Analysez vos bénéfices avant de réinvestir.



🏆 Produits :

Mettez en avant vos meilleurs produits.



💳 Clients :

Suivez les paiements en retard.



🤖 Conclusion :

Votre objectif est d'augmenter les ventes tout en gardant un bon contrôle des dépenses.
`;

    }
    

else if(
  message.includes("progresse") ||
  message.includes("avance") ||
  message.includes("performance") ||
  message.includes("va bien") ||
  message.includes("évolution") ||
  message.includes("evolution")
){

  const marge =
  totalVentes > 0
  ?
  ((totalBenefice / totalVentes) * 100).toFixed(1)
  :
  0;


  reply = `
📈 ANALYSE DE PERFORMANCE DU COMMERCE


💰 Chiffre d'affaires :

${totalVentes} FC


📊 Bénéfice :

${totalBenefice} FC


💸 Dépenses :

${totalDepenses} FC


📌 Marge estimée :

${marge}%



🔎 Diagnostic :


${
Number(totalBenefice) > Number(totalDepenses)
?
"✅ Votre commerce garde une situation positive."
:
"⚠️ Les dépenses sont élevées par rapport aux bénéfices."
}



🎯 Recommandations :

1️⃣ Suivez les produits qui se vendent rapidement.

2️⃣ Évitez les ruptures de stock.

3️⃣ Contrôlez les dépenses inutiles.


L'assistant Biso continue de surveiller votre activité.
`;

}

else if(
  message.includes("commander") ||
  message.includes("acheter") ||
  message.includes("approvision") ||
  message.includes("renforcer")
){

  const produitsACommander =
  produits.filter(
    (p:any)=>Number(p.stock)<=5
  );


  reply = `
🛒 RECOMMANDATION D'APPROVISIONNEMENT


Produits nécessitant une commande :


${
produitsACommander.length > 0
?
produitsACommander
.map(
(p:any)=>
`📦 ${p.name}
Stock actuel : ${p.stock} ${p.unit}`
)
.join("\n\n")
:
"✅ Aucun produit urgent à commander."
}



📌 Conseil de l'assistant :


${
produitsACommander.length > 0
?
"Commandez ces produits rapidement pour éviter une rupture."
:
"Continuez à surveiller régulièrement votre stock."
}


🤖 Analyse Biso-Commerce
`;
}
else if(
  message.includes("rentable") ||
  message.includes("rapporte") ||
  message.includes("marge") ||
  message.includes("benefice produit") ||
  message.includes("bénéfice produit")
){

  const rentabilite:any = {};


  ventes.forEach((v:any)=>{

    const nom =
    v.product_name || "Produit inconnu";


    rentabilite[nom] =
    (rentabilite[nom] || 0)
    +
    Number(v.profit || 0);


  });



  const classementRentable =
  Object.entries(rentabilite)
  .sort(
    (a:any,b:any)=>b[1]-a[1]
  )
  .slice(0,5);



  reply = `
💰 ANALYSE DES PRODUITS RENTABLES



🏆 Produits qui génèrent le plus de bénéfices :



${
classementRentable.length > 0
?
classementRentable
.map(
(item:any,index:number)=>
`${index+1}️⃣ ${item[0]} : ${item[1]} FC de bénéfice`
)
.join("\n\n")
:
"Aucune donnée de bénéfice disponible."
}



📌 Conseil de l'assistant :


Concentrez vos efforts sur les produits qui apportent le plus de bénéfices, pas seulement ceux qui se vendent beaucoup.



🤖 Analyse Biso-Commerce
`;

}

    else {
        
    



      reply = `
🤖 Assistant Biso-Commerce



Je peux analyser votre commerce.



Essayez :

📊 Combien ai-je vendu ?

💰 Quel est mon bénéfice ?

🏆 Quel produit marche le mieux ?

📦 Quels produits dois-je commander ?

💳 Qui me doit de l'argent ?

📈 Est-ce que mon commerce progresse ?



Je suis prêt à analyser vos données.
`;

    }






    return NextResponse.json({

      reply

    });



  } catch(error){


    console.error(error);



    return NextResponse.json({

      reply:
      "Une erreur est survenue avec l'assistant."

    });


  }


}