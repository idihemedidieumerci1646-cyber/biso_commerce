const CACHE_NAME = "biso-commerce-v2";

const APP_SHELL = [
  "/",
  "/dashboard",
  "/sales",
  "/products",
  "/products/add",
  "/debts",
  "/subscription",
  "/assistant",
  "/reports",
  "/expenses",
  "/manifest.json",
];

/* =========================================================
   INSTALLATION
========================================================= */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of APP_SHELL) {
        try {
          await cache.add(url);
        } catch (error) {
          console.warn(
            `[BISO-COMMERCE] Impossible de mettre en cache : ${url}`,
            error
          );
        }
      }
    })
  );

  self.skipWaiting();
});

/* =========================================================
   ACTIVATION
========================================================= */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );

  self.clients.claim();
});

/* =========================================================
   FETCH
========================================================= */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /*
    On ne gère que les requêtes de notre propre application.
  */
  if (url.origin !== self.location.origin) {
    return;
  }

  /*
    ========================================================
    NAVIGATION DES PAGES
    ========================================================

    Exemple :

    /dashboard
    /products
    /products/add
    /products/edit/123
    /sales

    On essaie Internet en premier.

    Si Internet fonctionne :
      → on affiche la nouvelle page
      → on la met en cache

    Si Internet ne fonctionne pas :
      → on utilise le cache
  */

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const responseClone = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(async () => {
          /*
            1. Chercher exactement l'URL demandée.

            Exemple :
            /products/edit/abc123
          */

          const exactMatch = await caches.match(request);

          if (exactMatch) {
            return exactMatch;
          }

          /*
            2. Si la page dynamique n'est pas encore
               directement dans le cache, essayer de trouver
               une page HTML déjà mise en cache.
          */

          const cachedRoot = await caches.match("/");

          if (cachedRoot) {
            return cachedRoot;
          }

          /*
            3. Dernière possibilité :
               dashboard.
          */

          const cachedDashboard =
            await caches.match("/dashboard");

          if (cachedDashboard) {
            return cachedDashboard;
          }

          return new Response(
            `
              <!DOCTYPE html>
              <html lang="fr">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>BISO-COMMERCE</title>
                  <style>
                    body {
                      margin: 0;
                      min-height: 100vh;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      background: #f5f7fb;
                      font-family: Arial, sans-serif;
                      color: #0f172a;
                    }

                    .box {
                      width: calc(100% - 32px);
                      max-width: 420px;
                      padding: 28px;
                      background: white;
                      border-radius: 24px;
                      text-align: center;
                      box-shadow: 0 10px 40px rgba(15, 23, 42, 0.08);
                    }

                    h1 {
                      margin: 0 0 10px;
                      font-size: 22px;
                    }

                    p {
                      margin: 0;
                      color: #64748b;
                      line-height: 1.6;
                    }
                  </style>
                </head>

                <body>
                  <div class="box">
                    <h1>Mode hors connexion</h1>
                    <p>
                      Cette page n'est pas encore disponible hors connexion.
                      Connectez-vous une première fois à Internet pour la charger.
                    </p>
                  </div>
                </body>
              </html>
            `,
            {
              status: 503,
              headers: {
                "Content-Type": "text/html; charset=utf-8",
              },
            }
          );
        })
    );

    return;
  }

  /*
    ========================================================
    FICHIERS JS / CSS / IMAGES / MANIFEST
    ========================================================

    Stratégie :
      CACHE FIRST

    Si le fichier existe dans le cache :
      → utilisation immédiate

    Sinon :
      → Internet
      → puis sauvegarde dans le cache
  */

  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "manifest"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            if (
              response &&
              response.status === 200 &&
              response.type === "basic"
            ) {
              const responseClone =
                response.clone();

              caches.open(CACHE_NAME).then(
                (cache) => {
                  cache.put(
                    request,
                    responseClone
                  );
                }
              );
            }

            return response;
          })
          .catch(() => {
            return new Response("", {
              status: 503,
            });
          });
      })
    );

    return;
  }

  /*
    ========================================================
    AUTRES REQUÊTES
    ========================================================

    Network First :
      Internet → cache si Internet échoue.
  */

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          response.type === "basic"
        ) {
          const responseClone =
            response.clone();

          caches.open(CACHE_NAME).then(
            (cache) => {
              cache.put(
                request,
                responseClone
              );
            }
          );
        }

        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

/* =========================================================
   MESSAGE
   Permet de forcer la mise à jour du Service Worker.
========================================================= */

self.addEventListener("message", (event) => {
  if (
    event.data &&
    event.data.type === "SKIP_WAITING"
  ) {
    self.skipWaiting();
  }
});