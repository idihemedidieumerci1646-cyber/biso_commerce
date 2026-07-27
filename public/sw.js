const CACHE_NAME = "biso-commerce-v8";


self.addEventListener("install", (event)=>{

  self.skipWaiting();

});



self.addEventListener("activate",(event)=>{

  event.waitUntil(
    self.clients.claim()
  );

});



self.addEventListener("fetch",(event)=>{


  // Laisser passer les requêtes Next.js et API
  const url = new URL(event.request.url);


  if(
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/")
  ){

    return;

  }



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



      const home = await caches.match("/");


      if(home){

        return home;

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