const CACHE_NAME = "biso-commerce-v4";

const APP_SHELL = [
  "/",
  "/dashboard",
  "/products",
  "/manifest.json",
  "/icon.png"
];


self.addEventListener("install", (event)=>{

  event.waitUntil(
    caches.open(CACHE_NAME)
    .then((cache)=>{
      return cache.addAll(APP_SHELL);
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


  event.respondWith(

    caches.match(event.request)
    .then((cached)=>{


      if(cached){

        return cached;

      }


      return fetch(event.request)
      .then((response)=>{


        if(
          response &&
          response.status === 200 &&
          response.type === "basic"
        ){

          const clone = response.clone();


          caches.open(CACHE_NAME)
          .then((cache)=>{

            cache.put(
              event.request,
              clone
            );

          });

        }


        return response;


      })
      .catch(()=>{


        return caches.match("/");


      });


    })

  );


});