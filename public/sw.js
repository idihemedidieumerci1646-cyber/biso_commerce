const CACHE_NAME = "biso-commerce-v4";

const OFFLINE_PAGES = [
  "/",
  "/dashboard",
  "/products",
  "/sales"
];


self.addEventListener("install", (event)=>{

  event.waitUntil(

    caches.open(CACHE_NAME)
    .then((cache)=>{

      return cache.addAll(OFFLINE_PAGES);

    })

  );

  self.skipWaiting();

});



self.addEventListener("activate",(event)=>{

  event.waitUntil(
    self.clients.claim()
  );

});



self.addEventListener("fetch",(event)=>{


  if(event.request.method !== "GET"){
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


      return caches.match(event.request)

      .then((cached)=>{


        return cached || caches.match("/");


      });


    })


  );


});