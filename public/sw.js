const CACHE_VERSION = "biso-commerce-v6";

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
       * Préchargement des pages principales.
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
            await cache.put(
              new Request(url),
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
       * Active immédiatement le nouveau Service Worker.
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
          .filter((name) =>
            name.startsWith("biso-commerce-")
          )
          .filter(
            (name) => name !== CACHE_VERSION
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
    const url = new URL(request.url);

    return (
      url.origin === self.location.origin
    );
  } catch {
    return false;
  }
}

function isNextStaticFile(url) {
  return url.pathname.startsWith(
    "/_next/static/"
  );
}

function isNextImage(url) {
  return url.pathname.startsWith(
    "/_next/image"
  );
}

function isManifest(url) {
  return (
    url.pathname ===
    "/manifest.json"
  );
}

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
   TROUVER UNE PAGE ADAPTÉE HORS CONNEXION
========================================================= */

async function getOfflineNavigation(
  url
) {
  /*
   * =======================================================
   * 1. URL EXACTE
   *
   * Exemple :
   *
   * /products/edit/123
   *
   * Si cette page a déjà été ouverte avec Internet,
   * elle doit être utilisée directement.
   * =======================================================
   */

  const exactRequest =
    new Request(
      url.href,
      {
        method: "GET",
      }
    );

  const exact =
    await caches.match(
      exactRequest
    );

  if (exact) {
    console.log(
      "[BISO-COMMERCE] Page exacte trouvée dans le cache :",
      url.pathname
    );

    return exact;
  }

  /*
   * =======================================================
   * 2. PATHNAME EXACT
   * =======================================================
   */

  const pathnameRequest =
    new Request(
      url.pathname,
      {
        method: "GET",
      }
    );

  const pathnameMatch =
    await caches.match(
      pathnameRequest
    );

  if (pathnameMatch) {
    console.log(
      "[BISO-COMMERCE] Pathname trouvé dans le cache :",
      url.pathname
    );

    return pathnameMatch;
  }

  /*
   * =======================================================
   * 3. ROUTES PARTICULIÈRES
   *
   * On ne renvoie PLUS toutes les routes vers Dashboard.
   *
   * Chaque section possède son propre fallback.
   * =======================================================
   */

  /*
   * PRODUITS
   *
   * /products/edit/123
   * /products/...
   */
  if (
    url.pathname === "/products" ||
    url.pathname.startsWith(
      "/products/"
    )
  ) {
    const productsPage =
      await caches.match(
        "/products"
      );

    if (productsPage) {
      return productsPage;
    }
  }

  /*
   * VENTES
   */
  if (
    url.pathname === "/sales" ||
    url.pathname.startsWith(
      "/sales/"
    )
  ) {
    const salesPage =
      await caches.match(
        "/sales"
      );

    if (salesPage) {
      return salesPage;
    }
  }

  /*
   * DETTES
   */
  if (
    url.pathname === "/debts" ||
    url.pathname.startsWith(
      "/debts/"
    )
  ) {
    const debtsPage =
      await caches.match(
        "/debts"
      );

    if (debtsPage) {
      return debtsPage;
    }
  }

  /*
   * RAPPORTS
   */
  if (
    url.pathname === "/reports" ||
    url.pathname.startsWith(
      "/reports/"
    )
  ) {
    const reportsPage =
      await caches.match(
        "/reports"
      );

    if (reportsPage) {
      return reportsPage;
    }
  }

  /*
   * DÉPENSES
   */
  if (
    url.pathname === "/expenses" ||
    url.pathname.startsWith(
      "/expenses/"
    )
  ) {
    const expensesPage =
      await caches.match(
        "/expenses"
      );

    if (expensesPage) {
      return expensesPage;
    }
  }

  /*
   * ASSISTANT
   */
  if (
    url.pathname === "/assistant" ||
    url.pathname.startsWith(
      "/assistant/"
    )
  ) {
    const assistantPage =
      await caches.match(
        "/assistant"
      );

    if (assistantPage) {
      return assistantPage;
    }
  }

  /*
   * ABONNEMENT
   */
  if (
    url.pathname === "/subscription" ||
    url.pathname.startsWith(
      "/subscription/"
    )
  ) {
    const subscriptionPage =
      await caches.match(
        "/subscription"
      );

    if (subscriptionPage) {
      return subscriptionPage;
    }
  }

  /*
   * =======================================================
   * 4. APP SHELL
   *
   * On essaie seulement les pages principales.
   * =======================================================
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
   * =======================================================
   * 5. IMPORTANT
   *
   * PLUS DE FALLBACK AUTOMATIQUE VERS /dashboard.
   *
   * Avant :
   *
   * route inconnue
   *       ↓
   * Dashboard ❌
   *
   * Maintenant :
   *
   * route inconnue
   *       ↓
   * vraie page offline
   * =======================================================
   */

  return offlinePage();
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
     */
    if (
      request.method !==
      "GET"
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
       1. NAVIGATION
    ======================================================= */

    if (
      request.mode ===
      "navigate"
    ) {
      event.respondWith(
        (async () => {
          /*
           * =================================================
           * INTERNET
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

            if (
              response.ok
            ) {
              /*
               * Mettre en cache l'URL exacte.
               */
              await putInCache(
                request,
                response
              );

              /*
               * Mettre également le pathname
               * en cache.
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
          } catch (
            error
          ) {
            /*
             * =================================================
             * HORS CONNEXION
             * =================================================
             */

            console.warn(
              "[BISO-COMMERCE] Navigation hors connexion :",
              url.pathname
            );

            return getOfflineNavigation(
              url
            );
          }
        })()
      );

      return;
    }

    /* =======================================================
       2. JAVASCRIPT / NEXT STATIC
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
          const cached =
            await caches.match(
              request
            );

          if (cached) {
            /*
             * Mise à jour silencieuse.
             */
            fetch(
              request,
              {
                cache:
                  "no-store",
              }
            )
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
              .catch(
                () => {}
              );

            return cached;
          }

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
      Cette page n'est pas encore disponible
      hors connexion.
      <br /><br />

      Ouvrez cette page au moins une fois
      avec Internet afin que BISO-COMMERCE
      puisse la conserver sur l'appareil.
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