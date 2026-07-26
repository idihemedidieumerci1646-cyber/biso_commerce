"use client";

import { useEffect } from "react";

export default function RegisterSW(){

  useEffect(()=>{

    if("serviceWorker" in navigator){

      navigator.serviceWorker.register("/sw.js")
      .then(()=>{
        console.log("Service Worker installé ✅");
      })
      .catch((error)=>{
        console.log("Erreur SW :",error);
      });

    }

  },[]);


  return null;

}