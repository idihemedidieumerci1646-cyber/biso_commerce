import { syncAll } from "./sync";


export function startOnlineListener(){


  if(typeof window === "undefined"){

    return;

  }





  // Synchronisation immédiate si internet est déjà disponible

  if(navigator.onLine){


    syncAll();


  }







  // Synchronisation automatique quand internet revient

  window.addEventListener(

    "online",

    async()=>{


      console.log(
        "Internet revenu, synchronisation..."
      );



      await syncAll();



      console.log(
        "Synchronisation terminée ✅"
      );



    }

  );



}