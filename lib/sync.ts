import { supabase } from "@/lib/supabase";

import {
  getOffline,
  removeOffline,
} from "@/lib/offlineDB";




// Synchronisation des produits ajoutés hors ligne

export async function syncProducts(){


  const products =
    await getOffline("products");



  for(const product of products){



    const { error } =
      await supabase
      .from("products")
      .upsert(
        product,
        {
          onConflict:"id"
        }
      );



    if(!error){


      await removeOffline(
        "products",
        product.id
      );


    }


  }


}







// Synchronisation des ventes hors ligne

export async function syncSales(){


  const sales =
    await getOffline("sales");



  for(const sale of sales){



    const { error } =
      await supabase
      .from("sales")
      .upsert(
        sale,
        {
          onConflict:"id"
        }
      );



    if(!error){


      await removeOffline(
        "sales",
        sale.id
      );


    }


  }


}








// Synchronisation des produits modifiés hors ligne

export async function syncUpdatedProducts(){


  const products =
    await getOffline("updatedProducts");



  for(const product of products){



    const { error } =
      await supabase
      .from("products")
      .update(product)
      .eq(
        "id",
        product.id
      )
      .eq(
        "user_id",
        product.user_id
      );



    if(!error){


      await removeOffline(
        "updatedProducts",
        product.id
      );


    }


  }


}









// Synchronisation des suppressions hors ligne

export async function syncDeletedProducts(){


  const deletedProducts =
    await getOffline("deletedProducts");



  for(const product of deletedProducts){



    const { error } =
      await supabase
      .from("products")
      .delete()
      .eq(
        "id",
        product.id
      )
      .eq(
        "user_id",
        product.user_id
      );



    if(!error){


      await removeOffline(
        "deletedProducts",
        product.id
      );


    }


  }


}









// Synchronisation complète BISO-COMMERCE

export async function syncAll(){



  if(
    typeof navigator !== "undefined"
    &&
    !navigator.onLine
  ){

    return;

  }




  try{


    await syncProducts();


    await syncSales();


    await syncUpdatedProducts();


    await syncDeletedProducts();




    console.log(
      "Synchronisation BISO-COMMERCE terminée ✅"
    );



  }catch(error){



    console.log(
      "Erreur synchronisation :",
      error
    );



  }



}