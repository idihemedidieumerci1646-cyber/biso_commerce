const CACHE_NAME = "biso-commerce-v3";

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
          const response = await fetch(url, {
            cache: "no-store",
          });

          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (error) {
          console.warn(
            "[BISO-COMMERCE] Cache impossible :",
            url,
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
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName !== CACHE_NAME
            )
            .map((cacheName) =>
              caches.delete(cacheName)
            )
        );
      })
      .then(() => self.clients.claim())
  );
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
   * Ne gérer que notre propre domaine.
   */
  if (url.origin !== self.location.origin) {
    return;
  }

  /* =======================================================
     JAVASCRIPT / CSS / CHUNKS NEXT.JS
     
     IMPORTANT :
     On NE fait PAS cache-first ici.

     Next.js génère des fichiers avec des noms/chunks
     qui peuvent changer après un nouveau build.
     
     On privilégie donc Internet.
     Si Internet est impossible, on essaie le cache.
  ======================================================= */

  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "worker"
  ) {
    event.respondWith(
      fetch(request, {
        cache: "no-store",
      })
        .then((response) => {
          return response;
        })
        .catch(async () => {
          const cached =
            await caches.match(request);

          if (cached) {
            return cached;
          }

          return new Response("", {
            status: 503,
          });
        })
    );

    return;
  }

  /* =======================================================
     IMAGES / FONTS
     
     Cache first acceptable ici.
  ======================================================= */

  if (
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches
        .match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request)
            .then((response) => {
              if (
                response &&
                response.ok &&
                response.type === "basic"
              ) {
                const clone =
                  response.clone();

                caches
                  .open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(
                      request,
                      clone
                    );
                  });
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

  /* =======================================================
     MANIFEST
  ======================================================= */

  if (request.destination === "manifest") {
    event.respondWith(
      fetch(request, {
        cache: "no-store",
      })
        .then((response) => {
          if (
            response &&
            response.ok
          ) {
            const clone =
              response.clone();

            caches
              .open(CACHE_NAME)
              .then((cache) => {
                cache.put(
                  request,
                  clone
                );
              });
          }

          return response;
        })
        .catch(async () => {
          const cached =
            await caches.match(request);

          if (cached) {
            return cached;
          }

          return new Response("", {
            status: 503,
          });
        })
    );

    return;
  }

  /* =======================================================
     NAVIGATION / PAGES
     
     Internet d'abord.
     
     Si Internet :
       nouvelle page
     
     Si pas Internet :
       page déjà visitée
  ======================================================= */

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, {
        cache: "no-store",
      })
        .then((response) => {
          if (
            response &&
            response.ok
          ) {
            const clone =
              response.clone();

            caches
              .open(CACHE_NAME)
              .then((cache) => {
                cache.put(
                  request,
                  clone
                );
              });
          }

          return response;
        })
        .catch(async () => {
          /* 1. URL exacte */
          const exactMatch =
            await caches.match(request);

          if (exactMatch) {
            return exactMatch;
          }

          /* 2. Chemin sans paramètres */
          const pathMatch =
            await caches.match(
              new Request(url.pathname)
            );

          if (pathMatch) {
            return pathMatch;
          }

          /* 3. Accueil */
          const home =
            await caches.match("/");

          if (home) {
            return home;
          }

          /* 4. Dashboard */
          const dashboard =
            await caches.match(
              "/dashboard"
            );

          if (dashboard) {
            return dashboard;
          }

          /* 5. Écran hors connexion */
          return new Response(
            `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>BISO-COMMERCE</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: #f5f7fb;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      color: #0f172a;
    }

    .box {
      width: 100%;
      max-width: 420px;
      padding: 28px;
      background: #ffffff;
      border-radius: 24px;
      text-align: center;
      box-shadow:
        0 10px 40px
        rgba(15, 23, 42, 0.08);
    }

    .icon {
      width: 58px;
      height: 58px;
      margin: 0 auto 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 18px;
      background: #eef2ff;
      color: #4f46e5;
      font-size: 26px;
    }

    h1 {
      margin: 0 0 10px;
      font-size: 22px;
      font-weight: 800;
    }

    p {
      margin: 0;
      color: #64748b;
      line-height: 1.6;
      font-size: 14px;
    }
  </style>
</head>

<body>
  <div class="box">
    <div class="icon">☁</div>

    <h1>Mode hors connexion</h1>

    <p>
      Cette page n'est pas encore disponible
      hors connexion.
      Connectez-vous une première fois à Internet
      pour la charger.
    </p>
  </div>
</body>
</html>
            `,
            {
              status: 503,
              headers: {
                "Content-Type":
                  "text/html; charset=utf-8",
              },
            }
          );
        })
    );

    return;
  }

  /* =======================================================
     AUTRES REQUÊTES
     
     Network first
  ======================================================= */

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response &&
          response.ok &&
          response.type === "basic"
        ) {
          const clone =
            response.clone();

          caches
            .open(CACHE_NAME)
            .then((cache) => {
              cache.put(
                request,
                clone
              );
            });
        }

        return response;
      })
      .catch(async () => {
        const cached =
          await caches.match(request);

        if (cached) {
          return cached;
        }

        return new Response("", {
          status: 503,
        });
      })
  );
});

/* =========================================================
   MESSAGE
========================================================= */

self.addEventListener("message", (event) => {
  if (
    event.data &&
    event.data.type ===
      "SKIP_WAITING"
  ) {
    self.skipWaiting();
  }
});