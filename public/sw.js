const CACHE_NAME = "biso-commerce-v5";


self.addEventListener("install", (event)=>{
  self.skipWaiting();
});


self.addEventListener("activate",(event)=>{

  event.waitUntil(
    self.clients.claim()
  );

});


self.addEventListener("fetch",(event)=>{


  event.respondWith(

    fetch(event.request)
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
    .catch(async()=>{


      const cached = await caches.match(
        event.request
      );


      if(cached){

        return cached;

      }


      return new Response(
        "Biso-Commerce hors connexion",
        {
          status:503,
          headers:{
            "Content-Type":"text/plain"
          }
        }
      );


    })

  );


});