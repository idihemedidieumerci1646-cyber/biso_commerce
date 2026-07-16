"use client";

import { useEffect } from "react";
import { startOnlineListener } from "@/lib/onlineListener";


export default function OnlineSync(){


  useEffect(()=>{


    startOnlineListener();


  },[]);



  return null;


}