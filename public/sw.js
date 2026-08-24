const CACHE_VERSION = "biso-commerce-v5";

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
    (async () => {
      const cache = await caches.open(CACHE_VERSION);

      /*
       * On met en cache les pages principales.
       *
       * Une page qui n'a jamais été ouverte avant ne pourra
       * évidemment pas être disponible hors connexion.
       */
      for (const url of APP_SHELL) {
        try {
          const response = await fetch(
            new Request(url, {
              method: "GET",
              cache: "no-store",
            })
          );

          if (response.ok) {
            await cache.put(url, response.clone());
          }
        } catch (error) {
          console.warn(
            "[BISO-COMMERCE] Impossible de précharger :",
            url,
            error
          );
        }
      }

      /*
       * Active immédiatement le nouveau SW.
       */
      await self.skipWaiting();
    })()
  );
});

/* =========================================================
   ACTIVATION
========================================================= */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(
            (name) => name.startsWith("biso-commerce-")
          )
          .filter(
            (name) => name !== CACHE_VERSION
          )
          .map((name) => caches.delete(name))
      );

      await self.clients.claim();

      console.log(
        "[BISO-COMMERCE] Service Worker activé :",
        CACHE_VERSION
      );
    })()
  );
});

/* =========================================================
   UTILITAIRES
========================================================= */

function isSameOrigin(request) {
  try {
    const url = new URL(request.url);

    return (
      url.origin === self.location.origin
    );
  } catch {
    return false;
  }
}

function isNextStaticFile(url) {
  return (
    url.pathname.startsWith("/_next/static/")
  );
}

function isNextImage(url) {
  return (
    url.pathname.startsWith("/_next/image")
  );
}

function isManifest(url) {
  return (
    url.pathname === "/manifest.json"
  );
}

async function putInCache(request, response) {
  if (
    !response ||
    !response.ok ||
    response.type !== "basic"
  ) {
    return;
  }

  try {
    const cache =
      await caches.open(CACHE_VERSION);

    await cache.put(
      request,
      response.clone()
    );
  } catch (error) {
    console.warn(
      "[BISO-COMMERCE] Erreur cache :",
      error
    );
  }
}

/* =========================================================
   FETCH
========================================================= */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  /*
   * Seulement GET.
   */
  if (request.method !== "GET") {
    return;
  }

  /*
   * Seulement notre domaine.
   */
  if (!isSameOrigin(request)) {
    return;
  }

  const url = new URL(request.url);

  /* =======================================================
     1. NAVIGATION / PAGES NEXT.JS
  ======================================================= */

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        /*
         * INTERNET D'ABORD
         *
         * Cela permet d'obtenir la dernière version
         * de la page lorsqu'Internet est disponible.
         */
        try {
          const response = await fetch(
            request,
            {
              cache: "no-store",
            }
          );

          if (response.ok) {
            /*
             * Sauvegarder la page actuelle.
             */
            await putInCache(
              request,
              response
            );

            /*
             * Sauvegarder également le pathname.
             *
             * Exemple :
             *
             * /products/edit/123
             */
            try {
              await putInCache(
                new Request(
                  url.pathname
                ),
                response
              );
            } catch {
              /* rien */
            }

            return response;
          }

          throw new Error(
            `Navigation HTTP ${response.status}`
          );
        } catch (error) {
          /*
           * PAS INTERNET
           */

          console.warn(
            "[BISO-COMMERCE] Navigation hors connexion :",
            url.pathname
          );

          /*
           * 1. URL exacte
           */
          const exact =
            await caches.match(request);

          if (exact) {
            return exact;
          }

          /*
           * 2. Pathname exact
           */
          const pathnameMatch =
            await caches.match(
              new Request(url.pathname)
            );

          if (pathnameMatch) {
            return pathnameMatch;
          }

          /*
           * 3. Une page de l'APP SHELL
           */
          if (
            APP_SHELL.includes(
              url.pathname
            )
          ) {
            const shell =
              await caches.match(
                url.pathname
              );

            if (shell) {
              return shell;
            }
          }

          /*
           * 4. Dashboard comme dernier fallback.
           *
           * Cela évite le "This page couldn't load"
           * si une route dynamique n'a pas été préchargée.
           */
          const dashboard =
            await caches.match(
              "/dashboard"
            );

          if (dashboard) {
            return dashboard;
          }

          /*
           * 5. Accueil
           */
          const home =
            await caches.match("/");

          if (home) {
            return home;
          }

          /*
           * 6. Écran offline
           */
          return offlinePage();
        }
      })()
    );

    return;
  }

  /* =======================================================
     2. CHUNKS NEXT.JS / JAVASCRIPT
     
     IMPORTANT :
     On utilise NETWORK FIRST.

     Cela évite de garder indéfiniment un vieux chunk.
     Mais si le téléphone est hors connexion et que le
     chunk a déjà été chargé auparavant, on peut utiliser
     sa copie locale.
  ======================================================= */

  if (
    request.destination === "script" ||
    request.destination === "worker" ||
    isNextStaticFile(url)
  ) {
    event.respondWith(
      (async () => {
        try {
          const response =
            await fetch(request, {
              cache: "no-store",
            });

          /*
           * Ne mettre en cache que les réponses valides.
           */
          if (
            response &&
            response.ok
          ) {
            await putInCache(
              request,
              response
            );
          }

          return response;
        } catch {
          /*
           * Hors connexion :
           * chercher le chunk précédemment téléchargé.
           */
          const cached =
            await caches.match(request);

          if (cached) {
            return cached;
          }

          /*
           * Aucun chunk disponible.
           */
          return new Response(
            "Ressource JavaScript indisponible hors connexion.",
            {
              status: 503,
              headers: {
                "Content-Type":
                  "text/plain; charset=utf-8",
              },
            }
          );
        }
      })()
    );

    return;
  }

  /* =======================================================
     3. CSS
  ======================================================= */

  if (
    request.destination === "style"
  ) {
    event.respondWith(
      (async () => {
        /*
         * D'abord cache.
         *
         * Le CSS change moins souvent que les pages.
         */
        const cached =
          await caches.match(request);

        if (cached) {
          /*
           * On essaie quand même de mettre à jour
           * en arrière-plan.
           */
          fetch(request, {
            cache: "no-store",
          })
            .then((response) => {
              if (response.ok) {
                void putInCache(
                  request,
                  response
                );
              }
            })
            .catch(() => {});

          return cached;
        }

        /*
         * Pas de cache → Internet.
         */
        try {
          const response =
            await fetch(request, {
              cache: "no-store",
            });

          if (response.ok) {
            await putInCache(
              request,
              response
            );
          }

          return response;
        } catch {
          return new Response(
            "",
            {
              status: 503,
            }
          );
        }
      })()
    );

    return;
  }

  /* =======================================================
     4. IMAGES
  ======================================================= */

  if (
    request.destination === "image" ||
    isNextImage(url)
  ) {
    event.respondWith(
      (async () => {
        const cached =
          await caches.match(request);

        if (cached) {
          return cached;
        }

        try {
          const response =
            await fetch(request);

          if (
            response &&
            response.ok
          ) {
            await putInCache(
              request,
              response
            );
          }

          return response;
        } catch {
          return new Response(
            "",
            {
              status: 503,
            }
          );
        }
      })()
    );

    return;
  }

  /* =======================================================
     5. POLICES
  ======================================================= */

  if (
    request.destination === "font"
  ) {
    event.respondWith(
      (async () => {
        const cached =
          await caches.match(request);

        if (cached) {
          return cached;
        }

        try {
          const response =
            await fetch(request);

          if (
            response &&
            response.ok
          ) {
            await putInCache(
              request,
              response
            );
          }

          return response;
        } catch {
          return new Response(
            "",
            {
              status: 503,
            }
          );
        }
      })()
    );

    return;
  }

  /* =======================================================
     6. MANIFEST
  ======================================================= */

  if (
    isManifest(url)
  ) {
    event.respondWith(
      (async () => {
        try {
          const response =
            await fetch(request, {
              cache: "no-store",
            });

          if (
            response &&
            response.ok
          ) {
            await putInCache(
              request,
              response
            );
          }

          return response;
        } catch {
          const cached =
            await caches.match(request);

          if (cached) {
            return cached;
          }

          return new Response(
            "{}",
            {
              status: 503,
              headers: {
                "Content-Type":
                  "application/manifest+json",
              },
            }
          );
        }
      })()
    );

    return;
  }

  /* =======================================================
     7. AUTRES RESSOURCES
     
     NETWORK FIRST
  ======================================================= */

  event.respondWith(
    (async () => {
      try {
        const response =
          await fetch(request);

        if (
          response &&
          response.ok
        ) {
          await putInCache(
            request,
            response
          );
        }

        return response;
      } catch {
        const cached =
          await caches.match(request);

        if (cached) {
          return cached;
        }

        return new Response(
          "",
          {
            status: 503,
          }
        );
      }
    })()
  );
});

/* =========================================================
   PAGE HORS CONNEXION
========================================================= */

function offlinePage() {
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

    html,
    body {
      margin: 0;
      padding: 0;
      min-height: 100%;
    }

    body {
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

      padding: 30px;

      background: #ffffff;

      border-radius: 26px;

      text-align: center;

      box-shadow:
        0 12px 45px
        rgba(15, 23, 42, 0.08);
    }

    .icon {
      width: 64px;
      height: 64px;

      margin: 0 auto 18px;

      display: flex;
      align-items: center;
      justify-content: center;

      border-radius: 20px;

      background: #eef2ff;

      color: #4f46e5;

      font-size: 28px;
    }

    h1 {
      margin: 0 0 10px;

      font-size: 22px;

      font-weight: 800;
    }

    p {
      margin: 0;

      color: #64748b;

      font-size: 14px;

      line-height: 1.7;
    }
  </style>
</head>

<body>
  <div class="box">

    <div class="icon">
      ☁
    </div>

    <h1>
      Mode hors connexion
    </h1>

    <p>
      BISO-COMMERCE est actuellement
      hors connexion.
      <br /><br />
      Revenez sur l'application lorsque
      la connexion Internet est disponible
      pour charger cette page.
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

        "Cache-Control":
          "no-store",
      },
    }
  );
}

/* =========================================================
   MESSAGE
========================================================= */

self.addEventListener(
  "message",
  (event) => {
    if (
      event.data &&
      event.data.type ===
        "SKIP_WAITING"
    ) {
      self.skipWaiting();
    }

    /*
     * Permet de demander au SW de supprimer
     * tous les anciens caches.
     */
    if (
      event.data &&
      event.data.type ===
        "CLEAR_OLD_CACHES"
    ) {
      event.waitUntil(
        (async () => {
          const cacheNames =
            await caches.keys();

          await Promise.all(
            cacheNames
              .filter(
                (name) =>
                  name.startsWith(
                    "biso-commerce-"
                  ) &&
                  name !==
                    CACHE_VERSION
              )
              .map((name) =>
                caches.delete(name)
              )
          );
        })()
      );
    }
  }
);