const CACHE_NAME = "biso-commerce-v7";


const APP_SHELL = [
  "/",
  "/dashboard",
  "/products",
  "/products/edit",
  "/sales",
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

    caches.keys()
    .then((keys)=>{

      return Promise.all(

        keys
        .filter((key)=> key !== CACHE_NAME)
        .map((key)=> caches.delete(key))

      );

    })
    .then(()=>self.clients.claim())

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


        return caches.match("/")
        .then((home)=>{


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


        });



      });



    })

  );


});