const CACHE_VERSION = "biso-commerce-v8";

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
      const cache =
        await caches.open(CACHE_VERSION);

      /*
       * Pages principales.
       */
      for (const url of APP_SHELL) {
        try {
          const response =
            await fetch(
              new Request(url, {
                method: "GET",
                cache: "no-store",
              })
            );

          if (response.ok) {
            await cache.put(
              url,
              response.clone()
            );
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
      const cacheNames =
        await caches.keys();

      await Promise.all(
        cacheNames
          .filter((name) =>
            name.startsWith(
              "biso-commerce-"
            )
          )
          .filter(
            (name) =>
              name !== CACHE_VERSION
          )
          .map((name) =>
            caches.delete(name)
          )
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
    const url =
      new URL(request.url);

    return (
      url.origin ===
      self.location.origin
    );
  } catch {
    return false;
  }
}

/* =========================================================
   NEXT.JS STATIC
========================================================= */

function isNextStaticFile(url) {
  return (
    url.pathname.startsWith(
      "/_next/static/"
    )
  );
}

/* =========================================================
   NEXT IMAGE
========================================================= */

function isNextImage(url) {
  return (
    url.pathname.startsWith(
      "/_next/image"
    )
  );
}

/* =========================================================
   MANIFEST
========================================================= */

function isManifest(url) {
  return (
    url.pathname ===
    "/manifest.json"
  );
}

/* =========================================================
   PRODUIT — ROUTE ÉDITION
========================================================= */

function isProductEditRoute(url) {
  return (
    url.pathname.startsWith(
      "/products/edit/"
    )
  );
}
/* =========================================================
   PRODUIT — CACHE DE LA PAGE ÉDITION
========================================================= */

async function cacheProductEditPage(request, response) {
  if (
    !response ||
    !response.ok ||
    response.type !== "basic"
  ) {
    return;
  }

  try {
    const cache = await caches.open(
      CACHE_VERSION
    );

    /*
     * On sauvegarde l'URL exacte :
     *
     * /products/edit/123
     */
    await cache.put(
      request,
      response.clone()
    );

    /*
     * On sauvegarde également
     * le pathname exact.
     */
    const url = new URL(
      request.url
    );

    await cache.put(
      new Request(url.pathname),
      response.clone()
    );

    console.log(
      "[BISO-COMMERCE] Page édition produit mise en cache :",
      url.pathname
    );
  } catch (error) {
    console.warn(
      "[BISO-COMMERCE] Impossible de mettre en cache la page édition :",
      error
    );
  }
}

/* =========================================================
   PRODUIT — ROUTES
========================================================= */

function isProductsRoute(url) {
  return (
    url.pathname ===
      "/products" ||
    url.pathname ===
      "/products/" ||
    url.pathname ===
      "/products/add" ||
    url.pathname.startsWith(
      "/products/edit/"
    )
  );
}

/* =========================================================
   METTRE EN CACHE
========================================================= */

async function putInCache(
  request,
  response
) {
  if (
    !response ||
    !response.ok ||
    response.type !== "basic"
  ) {
    return;
  }

  try {
    const cache =
      await caches.open(
        CACHE_VERSION
      );

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

self.addEventListener(
  "fetch",
  (event) => {
    const request =
      event.request;

    /*
     * Seulement GET.
     *
     * IMPORTANT :
     * POST / PUT / PATCH / DELETE
     * ne sont PAS interceptés par ce SW.
     *
     * Les opérations d'ajout, modification
     * et suppression sont donc laissées
     * à ton application.
     */
    if (
      request.method !== "GET"
    ) {
      return;
    }

    /*
     * Seulement notre domaine.
     */
    if (
      !isSameOrigin(request)
    ) {
      return;
    }

    const url =
      new URL(request.url);

    /* =======================================================
       1. NAVIGATION / PAGES NEXT.JS
    ======================================================= */

    if (
      request.mode ===
      "navigate"
    ) {
      event.respondWith(
        (async () => {
          /*
           * =================================================
           * INTERNET D'ABORD
           * =================================================
           */

          try {
            const response =
              await fetch(
                request,
                {
                  cache:
                    "no-store",
                }
              );

            if (response.ok) {
              /*
               * Cache URL exacte.
               */
              await putInCache(
                request,
                response
              );

              /*
               * Cache également
               * le pathname.
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
             * =================================================
             * HORS CONNEXION
             * =================================================
             */

            console.warn(
              "[BISO-COMMERCE] Navigation hors connexion :",
              url.pathname
            );

            /*
             * =================================================
             * 1. URL EXACTE
             * =================================================
             */

            const exact =
              await caches.match(
                request
              );

            if (exact) {
              return exact;
            }

            /*
             * =================================================
             * 2. PATHNAME EXACT
             *
             * Très important pour :
             *
             * /products/edit/[id]
             * =================================================
             */

            const pathnameMatch =
              await caches.match(
                new Request(
                  url.pathname
                )
              );

            if (pathnameMatch) {
              return pathnameMatch;
            }

            /*
             * =================================================
             * 3. ROUTE ÉDITION PRODUIT
             *
             * Exemple :
             *
             * /products/edit/123
             *
             * On ne redirige JAMAIS vers Dashboard.
             * =================================================
             */

            if (
              isProductEditRoute(
                url
              )
            ) {
              console.warn(
                "[BISO-COMMERCE] Édition produit hors connexion :",
                url.pathname
              );

              /*
               * La page exacte doit avoir été
               * chargée auparavant pour être disponible
               * dans le cache.
               *
               * Si elle n'existe pas, on affiche
               * proprement l'écran hors connexion.
               */
              return offlinePage();
            }

            /*
             * =================================================
             * 4. ROUTES PRODUITS
             * =================================================
             */

            if (
              isProductsRoute(
                url
              )
            ) {
              const productsPage =
                await caches.match(
                  "/products"
                );

              if (productsPage) {
                return productsPage;
              }

              return offlinePage();
            }

            /*
             * =================================================
             * 5. APP SHELL
             * =================================================
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
             * =================================================
             * 6. ACCUEIL
             * =================================================
             *
             * PAS DE DASHBOARD FALLBACK.
             *
             * Une page demandée ne doit jamais
             * être remplacée arbitrairement par
             * le Dashboard.
             */

            const home =
              await caches.match(
                "/"
              );

            if (home) {
              return home;
            }

            /*
             * =================================================
             * 7. ÉCRAN OFFLINE
             * =================================================
             */

            return offlinePage();
          }
        })()
      );

      return;
    }

    /* =======================================================
       2. CHUNKS NEXT.JS / JAVASCRIPT
    ======================================================= */

    if (
      request.destination ===
        "script" ||
      request.destination ===
        "worker" ||
      isNextStaticFile(url)
    ) {
      event.respondWith(
        (async () => {
          try {
            const response =
              await fetch(
                request,
                {
                  cache:
                    "no-store",
                }
              );

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
             * utiliser le chunk déjà chargé.
             */

            const cached =
              await caches.match(
                request
              );

            if (cached) {
              return cached;
            }

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
      request.destination ===
      "style"
    ) {
      event.respondWith(
        (async () => {
          /*
           * Cache d'abord.
           */

          const cached =
            await caches.match(
              request
            );

          if (cached) {
            /*
             * Mise à jour en arrière-plan.
             */

            fetch(request, {
              cache:
                "no-store",
            })
              .then(
                (response) => {
                  if (
                    response &&
                    response.ok
                  ) {
                    void putInCache(
                      request,
                      response
                    );
                  }
                }
              )
              .catch(() => {});

            return cached;
          }

          /*
           * Pas de cache.
           */

          try {
            const response =
              await fetch(
                request,
                {
                  cache:
                    "no-store",
                }
              );

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
       4. IMAGES
    ======================================================= */

    if (
      request.destination ===
        "image" ||
      isNextImage(url)
    ) {
      event.respondWith(
        (async () => {
          const cached =
            await caches.match(
              request
            );

          if (cached) {
            return cached;
          }

          try {
            const response =
              await fetch(
                request
              );

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
      request.destination ===
      "font"
    ) {
      event.respondWith(
        (async () => {
          const cached =
            await caches.match(
              request
            );

          if (cached) {
            return cached;
          }

          try {
            const response =
              await fetch(
                request
              );

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
              await fetch(
                request,
                {
                  cache:
                    "no-store",
                }
              );

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
              await caches.match(
                request
              );

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
    ======================================================= */

    event.respondWith(
      (async () => {
        try {
          const response =
            await fetch(
              request
            );

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
            await caches.match(
              request
            );

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
  }
);

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
        rgba(
          15,
          23,
          42,
          0.08
        );
    }

    .icon {
      width: 64px;
      height: 64px;

      margin:
        0 auto 18px;

      display: flex;
      align-items: center;
      justify-content: center;

      border-radius: 20px;

      background: #eef2ff;

      color: #4f46e5;

      font-size: 28px;
    }

    h1 {
      margin:
        0 0 10px;

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

      Cette page n'a pas encore été
      chargée sur cet appareil.
      <br /><br />

      Les données déjà enregistrées
      localement restent disponibles.
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
   MESSAGES
========================================================= */

self.addEventListener(
  "message",
  (event) => {
    /*
     * Activer immédiatement
     * le nouveau Service Worker.
     */

    if (
      event.data &&
      event.data.type ===
        "SKIP_WAITING"
    ) {
      self.skipWaiting();
    }

    /*
     * Supprimer les anciens caches.
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
                caches.delete(
                  name
                )
              )
          );
        })()
      );
    }
  }
);