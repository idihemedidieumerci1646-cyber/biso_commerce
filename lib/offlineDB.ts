import { openDB } from "idb";


export const dbPromise =
typeof window !== "undefined"
? openDB(
    "biso-commerce-offline",
    2,
    {
      upgrade(db) {


        if(!db.objectStoreNames.contains("products")){

          db.createObjectStore(
            "products",
            {
              keyPath:"id"
            }
          );

        }



        if(!db.objectStoreNames.contains("sales")){

          db.createObjectStore(
            "sales",
            {
              keyPath:"id"
            }
          );

        }



        if(!db.objectStoreNames.contains("deletedProducts")){

          db.createObjectStore(
            "deletedProducts",
            {
              keyPath:"id"
            }
          );

        }



        if(!db.objectStoreNames.contains("updatedProducts")){

          db.createObjectStore(
            "updatedProducts",
            {
              keyPath:"id"
            }
          );

        }



      },
    }
  )
: null;






export async function saveOffline(
  table:string,
  data:any
){

  if(!dbPromise)
    return;


  const db = await dbPromise;


  await db.put(
    table,
    data
  );

}







export async function getOffline(
  table:string
){

  if(!dbPromise)
    return [];


  const db = await dbPromise;


  return await db.getAll(
    table
  );

}







export async function removeOffline(
  table:string,
  id:string
){

  if(!dbPromise)
    return;


  const db = await dbPromise;


  await db.delete(
    table,
    id
  );

}