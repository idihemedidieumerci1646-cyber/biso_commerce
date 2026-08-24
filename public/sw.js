
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

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of APP_SHELL) {
        try {
          await cache.add(url);
          console.log("Mis en cache :", url);
        } catch (error) {
          console.warn(
            "Impossible de mettre en cache :",
            url,
            error
          );
        }
      }
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  // ============================================================
  // NAVIGATION / PAGES
  // ============================================================

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(async () => {
          // Page exacte déjà visitée
          const cachedPage = await caches.match(request);

          if (cachedPage) {
            return cachedPage;
          }

          // Sinon essayer le Dashboard
          const dashboard = await caches.match("/dashboard");

          if (dashboard) {
            return dashboard;
          }

          // Dernier secours
          const home = await caches.match("/");

          if (home) {
            return home;
          }

          return new Response(
            `
              <!DOCTYPE html>
              <html lang="fr">
                <head>
                  <meta charset="UTF-8">
                  <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                  >
                  <title>BISO-COMMERCE</title>
                </head>

                <body>
                  <h2>BISO-COMMERCE</h2>
                  <p>
                    L'application est hors connexion.
                  </p>
                </body>
              </html>
            `,
            {
              status: 200,
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

  // ============================================================
  // AUTRES RESSOURCES
  // ============================================================

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
            const responseClone = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(() => {
          return new Response("", {
            status: 503,
            statusText: "Offline",
          });
        });
    })
  );
});
