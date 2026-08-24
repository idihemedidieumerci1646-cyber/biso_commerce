
"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log(
            "Service Worker enregistré :",
            registration.scope
          );
        })
        .catch((error) => {
          console.error(
            "Erreur Service Worker :",
            error
          );
        });
    }
  }, []);

  return null;
}
