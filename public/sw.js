const CACHE_NAME = "biso-commerce-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});


self.addEventListener("activate", (event) => {

  event.waitUntil(
    caches.keys().then((keys)=>{

      return Promise.all(
        keys
        .filter((key)=> key !== CACHE_NAME)
        .map((key)=> caches.delete(key))
      );

    }).then(()=>self.clients.claim())
  );

});


self.addEventListener("fetch", (event)=>{

  const url = new URL(event.request.url);


  // Ne jamais toucher aux fichiers Next en développement
  if(
    url.pathname.startsWith("/_next/")
  ){

    return;

  }


  event.respondWith(

    fetch(event.request)
    .then((response)=>{

      const clone = response.clone();

      caches.open(CACHE_NAME)
      .then((cache)=>{

        cache.put(
          event.request,
          clone
        );

      });


      return response;

    })
    .catch(()=>{

      return caches.match(event.request);

    })

  );

});