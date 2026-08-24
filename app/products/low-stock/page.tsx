"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

import {
  AlertTriangle,
  Package,
  Trash2,
  ArrowRight,
  Sparkles,
  RefreshCcw,
  XCircle,
  Boxes,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type Product = {
  id: string;
  user_id?: string;
  name: string;
  stock: number;
  unit: string;
  created_at?: string;
};

type PendingDelete = {
  id: string;
  userId: string;
  createdAt: number;
};

/* =========================================================
   INDEXED DB
========================================================= */

/*
  IMPORTANT :

  Cette page utilise exactement la même base locale
  que la page /products.

  Base :
  biso-commerce-products

  Version :
  4

  Store produits :
  products

  Store suppressions :
  delete_queue
*/

const DB_NAME = "biso-commerce-products";
const DB_VERSION = 5;

const PRODUCTS_STORE = "products";
const DELETE_QUEUE_STORE = "delete_queue";

let dbPromise: Promise<IDBDatabase> | null = null;

/* =========================================================
   OUVRIR INDEXED DB
========================================================= */

function openProductsDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error(
        "IndexedDB est disponible uniquement dans le navigateur."
      )
    );
  }

  if (!("indexedDB" in window)) {
    return Promise.reject(
      new Error(
        "IndexedDB n'est pas supporté par ce navigateur."
      )
    );
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>(
    (resolve, reject) => {
      const request = indexedDB.open(
        DB_NAME,
        DB_VERSION
      );

      request.onupgradeneeded = () => {
        const db = request.result;
        const transaction = request.transaction;

        if (!transaction) {
          return;
        }

        /* =====================================================
           STORE PRODUITS
        ===================================================== */

        let productsStore: IDBObjectStore;

        if (
          !db.objectStoreNames.contains(
            PRODUCTS_STORE
          )
        ) {
          productsStore =
            db.createObjectStore(
              PRODUCTS_STORE,
              {
                keyPath: "id",
              }
            );
        } else {
          productsStore =
            transaction.objectStore(
              PRODUCTS_STORE
            );
        }

        if (
          !productsStore.indexNames.contains(
            "user_id"
          )
        ) {
          productsStore.createIndex(
            "user_id",
            "user_id",
            {
              unique: false,
            }
          );
        }

        if (
          !productsStore.indexNames.contains(
            "created_at"
          )
        ) {
          productsStore.createIndex(
            "created_at",
            "created_at",
            {
              unique: false,
            }
          );
        }

        /* =====================================================
           STORE SUPPRESSIONS
        ===================================================== */

        let deleteStore: IDBObjectStore;

        if (
          !db.objectStoreNames.contains(
            DELETE_QUEUE_STORE
          )
        ) {
          deleteStore =
            db.createObjectStore(
              DELETE_QUEUE_STORE,
              {
                keyPath: "id",
              }
            );
        } else {
          deleteStore =
            transaction.objectStore(
              DELETE_QUEUE_STORE
            );
        }

        if (
          !deleteStore.indexNames.contains(
            "userId"
          )
        ) {
          deleteStore.createIndex(
            "userId",
            "userId",
            {
              unique: false,
            }
          );
        }

        if (
          !deleteStore.indexNames.contains(
            "createdAt"
          )
        ) {
          deleteStore.createIndex(
            "createdAt",
            "createdAt",
            {
              unique: false,
            }
          );
        }
      };

      request.onsuccess = () => {
        const db = request.result;

        /*
          IMPORTANT :
          On ne fait PAS db.close() après chaque transaction.
          Cela évite l'erreur :
          "The database connection is closing."
        */

        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };

        resolve(db);
      };

      request.onerror = () => {
        dbPromise = null;

        reject(
          request.error ||
            new Error(
              "Impossible d'ouvrir la base locale des produits."
            )
        );
      };

      request.onblocked = () => {
        console.warn(
          "La mise à jour IndexedDB est bloquée. Fermez les autres onglets BISO-COMMERCE."
        );
      };
    }
  );

  return dbPromise;
}

/* =========================================================
   UTILITAIRE
========================================================= */

function normalizeProduct(
  product: any
): Product {
  return {
    id: String(product?.id || ""),
    user_id: product?.user_id
      ? String(product.user_id)
      : undefined,
    name: String(
      product?.name ||
        product?.product_name ||
        "Produit sans nom"
    ),
    stock:
      Number(product?.stock) || 0,
    unit: String(
      product?.unit || "unité"
    ),
    created_at:
      product?.created_at ||
      undefined,
  };
}

/* =========================================================
   USER ID
========================================================= */

function getStoredUserId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const saved =
    localStorage.getItem("user_id");

  return saved ? String(saved) : null;
}

/* =========================================================
   RÉCUPÉRER USER ID AVEC PHONE
========================================================= */

async function resolveUserId(): Promise<
  string | null
> {
  const existing =
    getStoredUserId();

  if (existing) {
    return existing;
  }

  if (
    typeof window !== "undefined" &&
    !navigator.onLine
  ) {
    return null;
  }

  const phone =
    typeof window !== "undefined"
      ? localStorage.getItem("phone")
      : null;

  if (!phone) {
    return null;
  }

  try {
    const {
      data: user,
      error,
    } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    if (
      error ||
      !user?.id
    ) {
      return null;
    }

    const userId =
      String(user.id);

    localStorage.setItem(
      "user_id",
      userId
    );

    return userId;
  } catch (error) {
    console.error(
      "Erreur récupération utilisateur :",
      error
    );

    return null;
  }
}

/* =========================================================
   LIRE PRODUITS DU CACHE
========================================================= */

async function getCachedProducts(
  userId: string
): Promise<Product[]> {
  const db =
    await openProductsDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          PRODUCTS_STORE,
          "readonly"
        );

      const store =
        transaction.objectStore(
          PRODUCTS_STORE
        );

      const request =
        store.getAll();

      request.onsuccess = () => {
        const all =
          (request.result || []) as any[];

        const products =
          all
            .map(
              normalizeProduct
            )
            .filter(
              (product) =>
                String(
                  product.user_id || ""
                ) ===
                String(userId)
            )
            .sort(
              (a, b) => {
                const dateA =
                  a.created_at
                    ? new Date(
                        a.created_at
                      ).getTime()
                    : 0;

                const dateB =
                  b.created_at
                    ? new Date(
                        b.created_at
                      ).getTime()
                    : 0;

                return (
                  dateB - dateA
                );
              }
            );

        resolve(products);
      };

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Impossible de lire les produits locaux."
            )
        );
      };
    }
  );
}

/* =========================================================
   SUPPRIMER PRODUIT DU CACHE
========================================================= */

async function removeCachedProduct(
  id: string
): Promise<void> {
  const db =
    await openProductsDB();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          PRODUCTS_STORE,
          "readwrite"
        );

      transaction
        .objectStore(
          PRODUCTS_STORE
        )
        .delete(id);

      transaction.oncomplete = () =>
        resolve();

      transaction.onerror = () =>
        reject(
          transaction.error ||
            new Error(
              "Impossible de supprimer le produit localement."
            )
        );

      transaction.onabort = () =>
        reject(
          transaction.error ||
            new Error(
              "La suppression locale a été interrompue."
            )
        );
    }
  );
}

/* =========================================================
   FILE DE SUPPRESSION
========================================================= */

async function addDeleteToQueue(
  item: PendingDelete
): Promise<void> {
  const db =
    await openProductsDB();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          DELETE_QUEUE_STORE,
          "readwrite"
        );

      transaction
        .objectStore(
          DELETE_QUEUE_STORE
        )
        .put(item);

      transaction.oncomplete = () =>
        resolve();

      transaction.onerror = () =>
        reject(
          transaction.error ||
            new Error(
              "Impossible d'enregistrer la suppression hors connexion."
            )
        );
    }
  );
}

/* =========================================================
   LIRE FILE SUPPRESSION
========================================================= */

async function getDeleteQueue(): Promise<
  PendingDelete[]
> {
  const db =
    await openProductsDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          DELETE_QUEUE_STORE,
          "readonly"
        );

      const request =
        transaction
          .objectStore(
            DELETE_QUEUE_STORE
          )
          .getAll();

      request.onsuccess = () => {
        resolve(
          (request.result ||
            []) as PendingDelete[]
        );
      };

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Impossible de lire la file de suppression."
            )
        );
      };
    }
  );
}

/* =========================================================
   RETIRER DE LA FILE
========================================================= */

async function removeFromDeleteQueue(
  id: string
): Promise<void> {
  const db =
    await openProductsDB();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          DELETE_QUEUE_STORE,
          "readwrite"
        );

      transaction
        .objectStore(
          DELETE_QUEUE_STORE
        )
        .delete(id);

      transaction.oncomplete = () =>
        resolve();

      transaction.onerror = () =>
        reject(
          transaction.error ||
            new Error(
              "Impossible de terminer la suppression."
            )
        );
    }
  );
}

/* =========================================================
   SYNCHRONISER SUPPRESSIONS
========================================================= */

async function syncPendingDeletes(): Promise<void> {
  if (
    typeof window === "undefined" ||
    !navigator.onLine
  ) {
    return;
  }

  const userId =
    await resolveUserId();

  if (!userId) {
    return;
  }

  let queue: PendingDelete[] = [];

  try {
    queue =
      await getDeleteQueue();
  } catch (error) {
    console.error(
      "Erreur lecture queue :",
      error
    );

    return;
  }

  const userQueue =
    queue.filter(
      (item) =>
        String(
          item.userId
        ) ===
        String(userId)
    );

  for (
    const item of userQueue
  ) {
    try {
      const {
        error,
      } = await supabase
        .from("products")
        .delete()
        .eq(
          "id",
          item.id
        )
        .eq(
          "user_id",
          userId
        );

      if (error) {
        throw error;
      }

      await removeFromDeleteQueue(
        item.id
      );
    } catch (error) {
      console.error(
        "Erreur synchronisation suppression produit :",
        error
      );
    }
  }
}

/* =========================================================
   CHARGER / SYNCHRONISER
========================================================= */

async function fetchProductsFromServer(
  userId: string
): Promise<Product[]> {
  const {
    data,
    error,
  } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", userId)
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return (
    (data || []) as any[]
  )
    .map(
      normalizeProduct
    )
    .filter(
      (product) =>
        product.id
    );
}

/* =========================================================
   PAGE
========================================================= */

export default function LowStockPage() {
  const [products, setProducts] =
    useState<Product[]>(
      []
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [isOnline, setIsOnline] =
    useState(true);

  const [syncing, setSyncing] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(
      null
    );

  const [message, setMessage] =
    useState<string | null>(
      null
    );

  /* =========================================================
     CHARGER PRODUITS
  ========================================================= */

  const loadProducts =
    useCallback(
      async (
        fullLoading = true
      ) => {
        if (fullLoading) {
          setLoading(true);
        }

        try {
          const userId =
            getStoredUserId();

          /*
            --------------------------------------------------
            IMPORTANT :
            Si user_id existe, on affiche d'abord
            le cache local.
            --------------------------------------------------
          */

          if (userId) {
            try {
              const cached =
                await getCachedProducts(
                  userId
                );

              setProducts(
                cached
              );
            } catch (cacheError) {
              console.error(
                "Erreur lecture cache :",
                cacheError
              );
            }
          }

          /*
            --------------------------------------------------
            HORS CONNEXION
            --------------------------------------------------
          */

          if (!navigator.onLine) {
            setIsOnline(false);
            setLoading(false);
            return;
          }

          /*
            --------------------------------------------------
            UTILISATEUR
            --------------------------------------------------
          */

          const resolvedUserId =
            await resolveUserId();

          if (!resolvedUserId) {
            setMessage(
              "Utilisateur non identifié. Connectez-vous à Internet une fois pour charger votre compte."
            );

            setLoading(false);
            return;
          }

          /*
            --------------------------------------------------
            SUPPRESSION EN ATTENTE
            --------------------------------------------------
          */

          setSyncing(true);

          await syncPendingDeletes();

          /*
            --------------------------------------------------
            SERVEUR
            --------------------------------------------------
          */

          const serverProducts =
            await fetchProductsFromServer(
              resolvedUserId
            );

          /*
            --------------------------------------------------
            FILTRER LES SUPPRESSIONS
            --------------------------------------------------
          */

          const queue =
            await getDeleteQueue();

          const pendingIds =
            new Set(
              queue
                .filter(
                  (item) =>
                    String(
                      item.userId
                    ) ===
                    String(
                      resolvedUserId
                    )
                )
                .map(
                  (item) =>
                    item.id
                )
            );

          const visibleServerProducts =
            serverProducts.filter(
              (product) =>
                !pendingIds.has(
                  product.id
                )
            );

          /*
            --------------------------------------------------
            METTRE À JOUR LE CACHE
            --------------------------------------------------
          */

          const db =
            await openProductsDB();

          await new Promise<void>(
            (
              resolve,
              reject
            ) => {
              const transaction =
                db.transaction(
                  PRODUCTS_STORE,
                  "readwrite"
                );

              const store =
                transaction.objectStore(
                  PRODUCTS_STORE
                );

              for (
                const product of visibleServerProducts
              ) {
                store.put(
                  product
                );
              }

              transaction.oncomplete =
                () =>
                  resolve();

              transaction.onerror =
                () =>
                  reject(
                    transaction.error ||
                      new Error(
                        "Impossible de mettre à jour le cache."
                      )
                  );
            }
          );

          /*
            --------------------------------------------------
            NETTOYAGE DU CACHE
            --------------------------------------------------
          */

          const cached =
            await getCachedProducts(
              resolvedUserId
            );

          const serverIds =
            new Set(
              visibleServerProducts.map(
                (product) =>
                  product.id
              )
            );

          for (
            const product of cached
          ) {
            if (
              !serverIds.has(
                product.id
              )
            ) {
              const waiting =
                pendingIds.has(
                  product.id
                );

              if (!waiting) {
                await removeCachedProduct(
                  product.id
                );
              }
            }
          }

          /*
            --------------------------------------------------
            AFFICHAGE FINAL
            --------------------------------------------------
          */

          const finalProducts =
            visibleServerProducts.map(
              (product) =>
                normalizeProduct(
                  product
                )
            );

          setProducts(
            finalProducts
          );

          setMessage(null);
        } catch (error) {
          console.error(
            "Erreur chargement stock faible :",
            error
          );

          /*
            Le cache reste affiché.
          */

          if (!navigator.onLine) {
            setIsOnline(false);
          } else {
            setMessage(
              "Impossible de synchroniser le stock. Les données déjà présentes sur cet appareil restent disponibles."
            );
          }
        } finally {
          setSyncing(false);
          setLoading(false);
        }
      },
      []
    );

  /* =========================================================
     INITIALISATION
  ========================================================= */

  useEffect(() => {
    setIsOnline(
      navigator.onLine
    );

    void loadProducts(
      true
    );
  }, [loadProducts]);

  /* =========================================================
     RETOUR INTERNET
  ========================================================= */

  useEffect(() => {
    const handleOnline =
      async () => {
        setIsOnline(true);
        setSyncing(true);

        setMessage(
          "Connexion rétablie. Synchronisation du stock en cours..."
        );

        try {
          await loadProducts(
            false
          );

          setMessage(
            "Stock synchronisé avec succès."
          );
        } catch (error) {
          console.error(
            error
          );
        } finally {
          setSyncing(false);
        }
      };

    const handleOffline =
      () => {
        setIsOnline(false);

        setMessage(
          "Vous êtes hors connexion. Le stock enregistré sur cet appareil reste disponible."
        );
      };

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );
    };
  }, [loadProducts]);

  /* =========================================================
     ÉCOUTER LES CHANGEMENTS PRODUITS
  ========================================================= */

  useEffect(() => {
    const handleProductsUpdated =
      async () => {
        try {
          const userId =
            getStoredUserId();

          if (!userId) {
            return;
          }

          const cached =
            await getCachedProducts(
              userId
            );

          setProducts(
            cached
          );
        } catch (error) {
          console.error(
            "Erreur actualisation locale :",
            error
          );
        }
      };

    window.addEventListener(
      "biso-products-updated",
      handleProductsUpdated
    );

    window.addEventListener(
      "biso-product-added",
      handleProductsUpdated
    );

    return () => {
      window.removeEventListener(
        "biso-products-updated",
        handleProductsUpdated
      );

      window.removeEventListener(
        "biso-product-added",
        handleProductsUpdated
      );
    };
  }, []);

  /* =========================================================
     ACTUALISER
  ========================================================= */

  const refreshProducts =
    async () => {
      if (refreshing) {
        return;
      }

      setRefreshing(true);

      try {
        await loadProducts(
          false
        );
      } finally {
        setRefreshing(false);
      }
    };

  /* =========================================================
     SUPPRESSION
  ========================================================= */

  async function handleDelete(
    id: string
  ) {
    const product =
      products.find(
        (item) =>
          item.id === id
      );

    if (!product) {
      return;
    }

    const confirmDelete =
      window.confirm(
        `Voulez-vous vraiment supprimer « ${product.name} » ?\n\nCette action est irréversible.`
      );

    if (!confirmDelete) {
      return;
    }

    const userId =
      getStoredUserId();

    if (!userId) {
      setMessage(
        "Utilisateur non identifié."
      );

      return;
    }

    setDeletingId(id);

    /*
      ------------------------------------------------------
      SUPPRESSION OPTIMISTE
      ------------------------------------------------------
    */

    try {
      setProducts(
        (current) =>
          current.filter(
            (item) =>
              item.id !== id
          )
      );

      await removeCachedProduct(
        id
      );

      /*
        ----------------------------------------------------
        HORS CONNEXION
        ----------------------------------------------------
      */

      if (!navigator.onLine) {
        await addDeleteToQueue(
          {
            id,
            userId,
            createdAt:
              Date.now(),
          }
        );

        setMessage(
          `« ${product.name} » a été supprimé de cet appareil. La suppression sera synchronisée dès que la connexion reviendra.`
        );

        return;
      }

      /*
        ----------------------------------------------------
        EN LIGNE
        ----------------------------------------------------
      */

      const {
        error,
      } = await supabase
        .from("products")
        .delete()
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          userId
        );

      if (error) {
        /*
          Restaurer localement
          en cas d'échec.
        */

        const db =
          await openProductsDB();

        await new Promise<void>(
          (
            resolve,
            reject
          ) => {
            const transaction =
              db.transaction(
                PRODUCTS_STORE,
                "readwrite"
              );

            transaction
              .objectStore(
                PRODUCTS_STORE
              )
              .put(product);

            transaction.oncomplete =
              () =>
                resolve();

            transaction.onerror =
              () =>
                reject(
                  transaction.error
                );
          }
        );

        setProducts(
          (current) => [
            product,
            ...current,
          ]
        );

        throw error;
      }

      setMessage(
        `« ${product.name} » a été supprimé définitivement.`
      );
    } catch (error) {
      console.error(
        "Erreur suppression produit :",
        error
      );

      setMessage(
        "Impossible de supprimer ce produit."
      );
    } finally {
      setDeletingId(null);
    }
  }

  /* =========================================================
     STATISTIQUES
  ========================================================= */

  const outOfStock =
    products.filter(
      (p) =>
        Number(p.stock) <=
        0
    );

  const almostEmpty =
    products.filter(
      (p) =>
        Number(p.stock) > 0 &&
        Number(p.stock) <= 5
    );

  return (
    <main
      className="
        min-h-screen
        w-full
        min-w-0
        overflow-x-hidden
        bg-[#f5f7fb]
        text-slate-900
        px-3
        py-4
        pb-24
        sm:px-6
        sm:py-6
        lg:px-8
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-6xl
          min-w-0
        "
      >

        {/* =========================================================
            HEADER
        ========================================================= */}

        <div
          className="
            mb-5
            w-full
            min-w-0
            overflow-hidden
            rounded-[24px]
            border
            border-slate-200
            bg-white
            p-4
            shadow-sm
            sm:mb-6
            sm:rounded-[26px]
            sm:p-7
          "
        >
          <div
            className="
              flex
              min-w-0
              flex-col
              gap-5
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >

            <div className="min-w-0">

              <div className="mb-4 flex items-center gap-3">

                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-2xl
                    bg-indigo-50
                    sm:h-12
                    sm:w-12
                  "
                >
                  <AlertTriangle
                    className="text-indigo-600"
                    size={24}
                  />
                </div>

                <div
                  className={`
                    flex
                    min-h-[36px]
                    items-center
                    gap-2
                    rounded-xl
                    px-3
                    text-[10px]
                    font-black
                    ${
                      syncing
                        ? "bg-indigo-50 text-indigo-600"
                        : isOnline
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-amber-50 text-amber-600"
                    }
                  `}
                >
                  {syncing ? (
                    <>
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                      Synchronisation
                    </>
                  ) : isOnline ? (
                    <>
                      <Wifi size={14} />
                      En ligne
                    </>
                  ) : (
                    <>
                      <WifiOff size={14} />
                      Hors connexion
                    </>
                  )}
                </div>

              </div>

              <h1
                className="
                  break-words
                  text-xl
                  font-black
                  tracking-tight
                  text-slate-900
                  sm:text-3xl
                "
              >
                Gestion du stock
              </h1>

              <p
                className="
                  mt-2
                  max-w-2xl
                  text-xs
                  leading-5
                  text-slate-500
                  sm:text-sm
                  sm:leading-6
                "
              >
                Retrouvez rapidement les produits à
                réapprovisionner avant de perdre des ventes.
              </p>

            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">

              <button
                type="button"
                onClick={refreshProducts}
                disabled={refreshing}
                className="
                  flex
                  min-h-[46px]
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  border
                  border-slate-200
                  bg-slate-50
                  px-4
                  py-3
                  text-xs
                  font-black
                  text-slate-700
                  shadow-sm
                  transition
                  hover:bg-slate-100
                  disabled:opacity-50
                  sm:text-sm
                "
              >
                <RefreshCcw
                  size={16}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                Actualiser
              </button>

              <Link
                href="/products"
                className="
                  flex
                  min-h-[46px]
                  shrink-0
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-indigo-600
                  px-5
                  py-3
                  text-xs
                  font-black
                  text-white
                  shadow-sm
                  transition
                  hover:bg-indigo-700
                  active:scale-[0.98]
                  sm:text-sm
                "
              >
                <Package size={18} />

                <span>
                  Produits
                </span>
              </Link>

            </div>
          </div>
        </div>

        {/* =========================================================
            MESSAGE
        ========================================================= */}

        {message && (
          <div
            className={`
              mb-5
              flex
              items-start
              gap-3
              rounded-2xl
              border
              p-4
              shadow-sm
              ${
                !isOnline
                  ? "border-amber-100 bg-amber-50"
                  : "border-indigo-100 bg-indigo-50"
              }
            `}
          >

            <div
              className={`
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                ${
                  !isOnline
                    ? "bg-amber-100 text-amber-600"
                    : "bg-white text-indigo-600"
                }
              `}
            >
              {!isOnline ? (
                <WifiOff size={17} />
              ) : (
                <AlertTriangle size={17} />
              )}
            </div>

            <p
              className={`
                flex-1
                text-xs
                font-bold
                leading-5
                ${
                  !isOnline
                    ? "text-amber-800"
                    : "text-indigo-800"
                }
              `}
            >
              {message}
            </p>

            <button
              type="button"
              onClick={() =>
                setMessage(null)
              }
              className="
                rounded-lg
                p-1
                text-slate-400
                transition
                hover:bg-white
                hover:text-slate-700
              "
              aria-label="Fermer"
            >
              ×
            </button>

          </div>
        )}

        {/* =========================================================
            RESUME STOCK
        ========================================================= */}

        <div
          className="
            mb-5
            grid
            w-full
            min-w-0
            grid-cols-1
            gap-3
            sm:mb-6
            sm:grid-cols-2
            sm:gap-4
          "
        >

          {/* RUPTURE */}

          <div
            className="
              min-w-0
              overflow-hidden
              rounded-[22px]
              border
              border-slate-200
              bg-white
              p-4
              shadow-sm
              sm:rounded-[26px]
              sm:p-5
            "
          >
            <div
              className="
                flex
                min-w-0
                items-start
                justify-between
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-red-50
                  sm:h-11
                  sm:w-11
                  sm:rounded-2xl
                "
              >
                <XCircle
                  className="text-red-500"
                  size={21}
                />
              </div>

              <span
                className="
                  shrink-0
                  rounded-full
                  bg-red-50
                  px-2.5
                  py-1
                  text-[10px]
                  font-bold
                  text-red-600
                  sm:px-3
                  sm:py-1.5
                  sm:text-xs
                "
              >
                Attention
              </span>
            </div>

            <p
              className="
                mt-4
                break-words
                text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-slate-500
                sm:mt-5
                sm:text-xs
              "
            >
              Produits en rupture
            </p>

            <p
              className="
                mt-1
                text-3xl
                font-black
                text-red-600
                sm:text-4xl
              "
            >
              {outOfStock.length}
            </p>

            <p
              className="
                mt-1
                text-[10px]
                leading-4
                text-slate-500
                sm:text-xs
                sm:leading-5
              "
            >
              Stock totalement vide
            </p>
          </div>

          {/* PRESQUE FINI */}

          <div
            className="
              min-w-0
              overflow-hidden
              rounded-[22px]
              border
              border-slate-200
              bg-white
              p-4
              shadow-sm
              sm:rounded-[26px]
              sm:p-5
            "
          >
            <div
              className="
                flex
                min-w-0
                items-start
                justify-between
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-indigo-50
                  sm:h-11
                  sm:w-11
                  sm:rounded-2xl
                "
              >
                <Boxes
                  className="text-indigo-600"
                  size={21}
                />
              </div>

              <span
                className="
                  shrink-0
                  rounded-full
                  bg-indigo-50
                  px-2.5
                  py-1
                  text-[10px]
                  font-bold
                  text-indigo-600
                  sm:px-3
                  sm:py-1.5
                  sm:text-xs
                "
              >
                À surveiller
              </span>
            </div>

            <p
              className="
                mt-4
                break-words
                text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-slate-500
                sm:mt-5
                sm:text-xs
              "
            >
              Presque fini
            </p>

            <p
              className="
                mt-1
                text-3xl
                font-black
                text-indigo-600
                sm:text-4xl
              "
            >
              {almostEmpty.length}
            </p>

            <p
              className="
                mt-1
                text-[10px]
                leading-4
                text-slate-500
                sm:text-xs
                sm:leading-5
              "
            >
              Entre 1 et 5 unités
            </p>
          </div>
        </div>

        {/* =========================================================
            CHARGEMENT
        ========================================================= */}

        {loading ? (
          <div
            className="
              w-full
              min-w-0
              overflow-hidden
              rounded-[24px]
              border
              border-slate-200
              bg-white
              px-5
              py-10
              text-center
              shadow-sm
              sm:rounded-[26px]
              sm:px-6
              sm:py-12
            "
          >
            <div
              className="
                mx-auto
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                bg-indigo-50
              "
            >
              <RefreshCcw
                className="
                  animate-spin
                  text-indigo-600
                "
                size={25}
              />
            </div>

            <p
              className="
                mt-4
                font-bold
                text-slate-900
              "
            >
              Chargement du stock...
            </p>

            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              Récupération de vos produits
            </p>
          </div>
        ) : (
          <div className="w-full min-w-0 space-y-7">

            {/* =====================================================
                PRODUITS EN RUPTURE + PRESQUE EPUISES
            ===================================================== */}

            {(outOfStock.length > 0 ||
              almostEmpty.length > 0) && (
              <div
                className="
                  grid
                  w-full
                  min-w-0
                  grid-cols-1
                  gap-6
                  sm:grid-cols-2
                  sm:gap-5
                "
              >

                {/* RUPTURE */}

                {outOfStock.length > 0 && (
                  <section className="min-w-0">

                    <div
                      className="
                        mb-3
                        flex
                        min-w-0
                        items-center
                        gap-2
                        sm:mb-4
                        sm:gap-3
                      "
                    >

                      <div
                        className="
                          flex
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-red-50
                          sm:h-10
                          sm:w-10
                        "
                      >
                        <XCircle
                          className="text-red-500"
                          size={19}
                        />
                      </div>

                      <div className="min-w-0">

                        <h2
                          className="
                            break-words
                            text-sm
                            font-black
                            leading-5
                            text-slate-900
                            sm:text-lg
                            sm:leading-6
                          "
                        >
                          Produits en rupture
                        </h2>

                        <p
                          className="
                            mt-0.5
                            hidden
                            text-xs
                            text-slate-500
                            sm:block
                          "
                        >
                          Ces produits ne sont plus disponibles.
                        </p>

                      </div>
                    </div>

                    <div className="space-y-3 sm:space-y-4">

                      {outOfStock.map(
                        (p) => (
                          <ProductCard
                            key={
                              p.id
                            }
                            product={
                              p
                            }
                            danger
                            deleting={
                              deletingId ===
                              p.id
                            }
                            onDelete={
                              handleDelete
                            }
                          />
                        )
                      )}

                    </div>
                  </section>
                )}

                {/* PRESQUE ÉPUISÉS */}

                {almostEmpty.length > 0 && (
                  <section className="min-w-0">

                    <div
                      className="
                        mb-3
                        flex
                        min-w-0
                        items-center
                        gap-2
                        sm:mb-4
                        sm:gap-3
                      "
                    >

                      <div
                        className="
                          flex
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-indigo-50
                          sm:h-10
                          sm:w-10
                        "
                      >
                        <AlertTriangle
                          className="text-indigo-600"
                          size={19}
                        />
                      </div>

                      <div className="min-w-0">

                        <h2
                          className="
                            break-words
                            text-sm
                            font-black
                            leading-5
                            text-slate-900
                            sm:text-lg
                            sm:leading-6
                          "
                        >
                          Presque épuisés
                        </h2>

                        <p
                          className="
                            mt-0.5
                            hidden
                            text-xs
                            text-slate-500
                            sm:block
                          "
                        >
                          Pensez à les réapprovisionner.
                        </p>

                      </div>
                    </div>

                    <div className="space-y-3 sm:space-y-4">

                      {almostEmpty.map(
                        (p) => (
                          <ProductCard
                            key={
                              p.id
                            }
                            product={
                              p
                            }
                            deleting={
                              deletingId ===
                              p.id
                            }
                            onDelete={
                              handleDelete
                            }
                          />
                        )
                      )}

                    </div>
                  </section>
                )}
              </div>
            )}

            {/* =====================================================
                STOCK NORMAL
            ===================================================== */}

            {outOfStock.length === 0 &&
              almostEmpty.length === 0 && (
                <div
                  className="
                    w-full
                    min-w-0
                    overflow-hidden
                    rounded-[24px]
                    border
                    border-slate-200
                    bg-white
                    p-6
                    text-center
                    shadow-sm
                    sm:rounded-[26px]
                    sm:p-8
                  "
                >

                  <div
                    className="
                      mx-auto
                      flex
                      h-16
                      w-16
                      items-center
                      justify-center
                      rounded-2xl
                      bg-green-50
                    "
                  >
                    <Sparkles
                      className="text-green-600"
                      size={32}
                    />
                  </div>

                  <p
                    className="
                      mt-4
                      text-lg
                      font-black
                      text-slate-900
                      sm:text-xl
                    "
                  >
                    Excellent stock ✅
                  </p>

                  <p
                    className="
                      mx-auto
                      mt-2
                      max-w-sm
                      text-sm
                      leading-6
                      text-slate-500
                    "
                  >
                    Aucun produit en rupture ou presque épuisé.
                    Votre stock est actuellement bien surveillé.
                  </p>

                  <Link
                    href="/products"
                    className="
                      mt-6
                      inline-flex
                      min-h-[46px]
                      items-center
                      justify-center
                      gap-2
                      rounded-2xl
                      bg-indigo-600
                      px-5
                      py-3
                      text-sm
                      font-black
                      text-white
                      shadow-sm
                      transition
                      hover:bg-indigo-700
                      active:scale-[0.98]
                    "
                  >
                    Voir mes produits

                    <ArrowRight size={17} />
                  </Link>

                </div>
              )}

          </div>
        )}
      </div>
    </main>
  );
}

/* =========================================================
   PRODUCT CARD
========================================================= */

function ProductCard({
  product,
  danger = false,
  deleting = false,
  onDelete,
}: {
  product: Product;
  danger?: boolean;
  deleting?: boolean;
  onDelete: (
    id: string
  ) => void;
}) {
  return (
    <div
      className="
        w-full
        min-w-0
        overflow-hidden
        rounded-[22px]
        border
        border-slate-200
        bg-white
        p-3
        shadow-sm
        transition
        hover:shadow-md
        sm:rounded-[26px]
        sm:p-5
      "
    >

      {/* INFORMATIONS */}

      <div className="min-w-0">

        <div
          className="
            flex
            min-w-0
            items-start
            justify-between
            gap-2
          "
        >

          <div
            className="
              flex
              min-w-0
              flex-1
              items-start
              gap-2
              sm:gap-3
            "
          >

            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-indigo-50
                sm:h-11
                sm:w-11
                sm:rounded-2xl
              "
            >
              <Package
                size={18}
                className="
                  text-indigo-600
                  sm:h-[21px]
                  sm:w-[21px]
                "
              />
            </div>

            <div className="min-w-0 flex-1">

              <h3
                className="
                  break-words
                  text-sm
                  font-black
                  leading-5
                  text-slate-900
                  sm:text-lg
                  sm:leading-6
                "
              >
                {product.name}
              </h3>

              <p
                className="
                  mt-0.5
                  hidden
                  text-xs
                  text-slate-500
                  sm:block
                "
              >
                Gestion du stock
              </p>

            </div>
          </div>

          {/* STATUT */}

          <span
            className={`
              shrink-0
              rounded-full
              px-2
              py-1
              text-[8px]
              font-black
              tracking-wide
              sm:px-3
              sm:py-1.5
              sm:text-[10px]
              ${
                danger
                  ? "bg-red-50 text-red-600 ring-1 ring-red-100"
                  : "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"
              }
            `}
          >
            {danger
              ? "RUPTURE"
              : "FAIBLE"}
          </span>

        </div>

        {/* STOCK */}

        <div
          className={`
            mt-3
            w-full
            rounded-xl
            border
            p-3
            sm:mt-5
            sm:rounded-2xl
            sm:p-4
            ${
              danger
                ? "border-red-100 bg-red-50/60"
                : "border-indigo-100 bg-indigo-50/60"
            }
          `}
        >

          <p
            className="
              text-[9px]
              font-bold
              uppercase
              tracking-wider
              text-slate-500
              sm:text-xs
            "
          >
            Stock actuel
          </p>

          <div
            className="
              mt-1
              flex
              min-w-0
              items-end
              gap-1.5
              sm:gap-2
            "
          >

            <span
              className={`
                text-2xl
                font-black
                leading-none
                sm:text-3xl
                ${
                  danger
                    ? "text-red-600"
                    : "text-indigo-600"
                }
              `}
            >
              {product.stock}
            </span>

            <span
              className="
                mb-0.5
                min-w-0
                max-w-[65%]
                break-words
                text-[10px]
                font-bold
                leading-4
                text-slate-500
                sm:mb-1
                sm:max-w-none
                sm:text-sm
              "
            >
              {product.unit}
            </span>

          </div>

          <p
            className="
              mt-1
              hidden
              text-xs
              text-slate-500
              sm:block
            "
          >
            Quantité actuellement disponible
          </p>

        </div>
      </div>

      {/* MESSAGE */}

      <div
        className={`
          mt-3
          flex
          min-w-0
          items-start
          gap-2
          rounded-xl
          border
          p-3
          sm:mt-4
          sm:gap-3
          sm:rounded-2xl
          sm:p-4
          ${
            danger
              ? "border-red-100 bg-red-50/60"
              : "border-indigo-100 bg-indigo-50/60"
          }
        `}
      >

        {danger ? (
          <XCircle
            size={16}
            className="
              mt-0.5
              shrink-0
              text-red-500
              sm:h-[18px]
              sm:w-[18px]
            "
          />
        ) : (
          <AlertTriangle
            size={16}
            className="
              mt-0.5
              shrink-0
              text-indigo-600
              sm:h-[18px]
              sm:w-[18px]
            "
          />
        )}

        <p
          className="
            min-w-0
            break-words
            text-[10px]
            leading-4
            text-slate-600
            sm:text-sm
            sm:leading-5
          "
        >
          {danger
            ? "Ce produit est complètement épuisé. Réapprovisionnez-le pour pouvoir continuer à le vendre."
            : "Ce produit possède un stock faible. Pensez à le réapprovisionner prochainement."}
        </p>
      </div>

      {/* ACTIONS */}

      <div
        className="
          mt-3
          grid
          w-full
          min-w-0
          grid-cols-2
          gap-2
          sm:mt-5
          sm:gap-3
        "
      >

        {/* SUPPRIMER */}

        <button
          type="button"
          onClick={() =>
            onDelete(
              product.id
            )
          }
          disabled={
            deleting
          }
          className="
            flex
            min-w-0
            min-h-[44px]
            items-center
            justify-center
            gap-1
            rounded-xl
            bg-red-600
            px-2
            py-2.5
            text-[10px]
            font-bold
            text-white
            shadow-sm
            transition
            hover:bg-red-700
            active:scale-[0.98]
            disabled:cursor-not-allowed
            disabled:opacity-60
            sm:gap-2
            sm:rounded-2xl
            sm:px-4
            sm:py-3.5
            sm:text-sm
          "
        >

          {deleting ? (
            <Loader2
              size={15}
              className="animate-spin"
            />
          ) : (
            <Trash2
              size={15}
              className="
                shrink-0
                sm:h-[17px]
                sm:w-[17px]
              "
            />
          )}

          <span className="truncate">
            {deleting
              ? "Suppression..."
              : "Supprimer"}
          </span>

        </button>

        {/* RÉAPPROVISIONNER */}

        <Link
          href={`/products/edit/${product.id}`}
          className="
            flex
            min-w-0
            min-h-[44px]
            items-center
            justify-center
            gap-1
            rounded-xl
            bg-green-50
            px-2
            py-2.5
            text-[10px]
            font-bold
            text-green-700
            ring-1
            ring-green-200
            transition
            hover:bg-green-100
            active:scale-[0.98]
            sm:gap-2
            sm:rounded-2xl
            sm:px-4
            sm:py-3.5
            sm:text-sm
          "
        >

          <span className="truncate">
            Réapprovisionner
          </span>

          <ArrowRight
            size={15}
            className="
              shrink-0
              sm:h-[17px]
              sm:w-[17px]
            "
          />

        </Link>
      </div>
    </div>
  );
}