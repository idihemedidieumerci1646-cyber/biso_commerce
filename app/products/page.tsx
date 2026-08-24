"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

import {
  Package,
  Plus,
  Search,
  Trash2,
  Edit,
  AlertTriangle,
  RefreshCcw,
  Boxes,
  TrendingUp,
  Info,
  X,
  CircleDollarSign,
  ChevronRight,
  ShoppingBag,
  Wifi,
  WifiOff,
  CloudOff,
  Loader2,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type Product = {
  id: string;
  user_id?: string;
  name: string | null;
  stock: number;
  unit: string | null;
  purchase_price: number;
  selling_price: number;
  currency: string;
  created_at?: string;
  updated_at?: string;
};

type PendingDelete = {
  id: string;
  userId: string;
  createdAt: number;
};

type DeleteModalState = {
  open: boolean;
  product: Product | null;
};

type SyncState =
  | "offline"
  | "online"
  | "syncing"
  | "error";

/* =========================================================
   INDEXED DB
========================================================= */

const DB_NAME = "biso-commerce-products";
const DB_VERSION = 8;

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

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const transaction = request.transaction;

      if (!transaction) {
        return;
      }

      let productsStore: IDBObjectStore;

      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
        productsStore = db.createObjectStore(PRODUCTS_STORE, {
          keyPath: "id",
        });
      } else {
        productsStore =
          transaction.objectStore(PRODUCTS_STORE);
      }

      if (!productsStore.indexNames.contains("user_id")) {
        productsStore.createIndex("user_id", "user_id", {
          unique: false,
        });
      }

      if (!productsStore.indexNames.contains("created_at")) {
        productsStore.createIndex(
          "created_at",
          "created_at",
          {
            unique: false,
          }
        );
      }

      if (!db.objectStoreNames.contains(DELETE_QUEUE_STORE)) {
        const deleteStore = db.createObjectStore(
          DELETE_QUEUE_STORE,
          {
            keyPath: "id",
          }
        );

        deleteStore.createIndex("userId", "userId", {
          unique: false,
        });
      }
    };

    request.onsuccess = () => {
      const db = request.result;

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
            "Impossible d'ouvrir IndexedDB."
          )
      );
    };

    request.onblocked = () => {
      console.warn(
        "La mise à jour IndexedDB est bloquée. Fermez les autres onglets de Biso-Commerce."
      );
    };
  });

  return dbPromise;
}

/* =========================================================
   UTILITAIRE ERREUR
========================================================= */

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null
  ) {
    const e = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
      status?: number;
      statusCode?: number;
    };

    if (e.message) return e.message;
    if (e.details) return e.details;
    if (e.hint) return e.hint;

    if (e.code) {
      return `Erreur Supabase (${e.code})`;
    }

    try {
      const json = JSON.stringify(error);

      if (json && json !== "{}") {
        return json;
      }
    } catch {
      // Rien
    }
  }

  if (typeof error === "string") {
    return error;
  }

  return "Une erreur inconnue est survenue.";
}

/* =========================================================
   LOG ERREUR SUPABASE
========================================================= */

function logSupabaseError(
  title: string,
  error: unknown
) {
  console.error(title, error);

  if (
    typeof error === "object" &&
    error !== null
  ) {
    const e = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
      status?: number;
      statusCode?: number;
    };

    console.error("Supabase details :", {
      message: e.message,
      details: e.details,
      hint: e.hint,
      code: e.code,
      status: e.status,
      statusCode: e.statusCode,
    });
  }

  console.error(
    "Message erreur :",
    getErrorMessage(error)
  );
}

/* =========================================================
   UTILISATEUR
========================================================= */

function getStoredUserId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const userId =
    localStorage.getItem("user_id");

  if (!userId) {
    return null;
  }

  return String(userId);
}

/* =========================================================
   LIRE TOUS LES PRODUITS DU CACHE
========================================================= */

async function getAllCachedProducts(
  userId: string
): Promise<Product[]> {
  const db = await openProductsDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      PRODUCTS_STORE,
      "readonly"
    );

    const store =
      transaction.objectStore(
        PRODUCTS_STORE
      );

    const request = store.getAll();

    request.onsuccess = () => {
      const all =
        (request.result || []) as Product[];

      const result = all.filter(
        (product) =>
          String(product.user_id || "") ===
          String(userId)
      );

      result.sort((a, b) => {
        const dateA = a.created_at
          ? new Date(a.created_at).getTime()
          : 0;

        const dateB = b.created_at
          ? new Date(b.created_at).getTime()
          : 0;

        return dateB - dateA;
      });

      resolve(result);
    };

    request.onerror = () => {
      reject(
        request.error ||
          new Error(
            "Impossible de lire les produits hors connexion."
          )
      );
    };
  });
}

/* =========================================================
   METTRE UN PRODUIT EN CACHE
========================================================= */

async function cacheProduct(
  product: Product
): Promise<void> {
  const db = await openProductsDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      PRODUCTS_STORE,
      "readwrite"
    );

    transaction
      .objectStore(PRODUCTS_STORE)
      .put(product);

    transaction.oncomplete = () =>
      resolve();

    transaction.onerror = () => {
      reject(
        transaction.error ||
          new Error(
            "Impossible de sauvegarder le produit."
          )
      );
    };
  });
}

/* =========================================================
   METTRE PLUSIEURS PRODUITS EN CACHE
========================================================= */

async function cacheProducts(
  products: Product[]
): Promise<void> {
  if (!products.length) {
    return;
  }

  const db = await openProductsDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      PRODUCTS_STORE,
      "readwrite"
    );

    const store =
      transaction.objectStore(
        PRODUCTS_STORE
      );

    for (const product of products) {
      store.put(product);
    }

    transaction.oncomplete = () =>
      resolve();

    transaction.onerror = () => {
      reject(
        transaction.error ||
          new Error(
            "Impossible de mettre en cache les produits."
          )
      );
    };
  });
}

/* =========================================================
   SUPPRIMER PRODUIT DU CACHE
========================================================= */

async function removeCachedProduct(
  id: string
): Promise<void> {
  const db = await openProductsDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      PRODUCTS_STORE,
      "readwrite"
    );

    transaction
      .objectStore(PRODUCTS_STORE)
      .delete(id);

    transaction.oncomplete = () =>
      resolve();

    transaction.onerror = () => {
      reject(
        transaction.error ||
          new Error(
            "Impossible de supprimer le produit localement."
          )
      );
    };
  });
}

/* =========================================================
   AJOUTER SUPPRESSION À LA FILE
========================================================= */

async function addDeleteToQueue(
  item: PendingDelete
): Promise<void> {
  const db = await openProductsDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      DELETE_QUEUE_STORE,
      "readwrite"
    );

    transaction
      .objectStore(DELETE_QUEUE_STORE)
      .put(item);

    transaction.oncomplete = () =>
      resolve();

    transaction.onerror = () => {
      reject(
        transaction.error ||
          new Error(
            "Impossible d'enregistrer la suppression hors connexion."
          )
      );
    };
  });
}

/* =========================================================
   LIRE FILE SUPPRESSION
========================================================= */

async function getDeleteQueue(): Promise<
  PendingDelete[]
> {
  const db = await openProductsDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
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
        (request.result || []) as PendingDelete[]
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
  });
}

/* =========================================================
   RETIRER DE LA FILE
========================================================= */

async function removeFromDeleteQueue(
  id: string
): Promise<void> {
  const db = await openProductsDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      DELETE_QUEUE_STORE,
      "readwrite"
    );

    transaction
      .objectStore(DELETE_QUEUE_STORE)
      .delete(id);

    transaction.oncomplete = () =>
      resolve();

    transaction.onerror = () => {
      reject(
        transaction.error ||
          new Error(
            "Impossible de terminer la suppression."
          )
      );
    };
  });
}

/* =========================================================
   NORMALISER PRODUIT
========================================================= */

function normalizeProduct(
  product: Product
): Product {
  return {
    ...product,
    id: String(product.id),
    user_id: product.user_id
      ? String(product.user_id)
      : undefined,
    name: product.name ?? null,
    stock:
      Number(product.stock) || 0,
    purchase_price:
      Number(product.purchase_price) || 0,
    selling_price:
      Number(product.selling_price) || 0,
    currency: String(
      product.currency || ""
    ),
    unit: product.unit ?? null,
  };
}

/* =========================================================
   PAGE
========================================================= */

export default function ProductsPage() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [showGuide, setShowGuide] =
    useState(false);

  const [isOnline, setIsOnline] =
    useState(true);

  const [syncState, setSyncState] =
    useState<SyncState>("online");

  const [syncError, setSyncError] =
    useState<string | null>(null);

  const [pendingDeletes, setPendingDeletes] =
    useState(0);

  const [deletingIds, setDeletingIds] =
    useState<Set<string>>(new Set());

  const [deleteModal, setDeleteModal] =
    useState<DeleteModalState>({
      open: false,
      product: null,
    });

  /* =========================================================
     CHARGER CACHE
  ========================================================= */

  const loadCachedProducts =
    useCallback(async () => {
      const userId =
        getStoredUserId();

      if (!userId) {
        setProducts([]);
        return;
      }

      try {
        const cached =
          await getAllCachedProducts(
            userId
          );

        setProducts(cached);
      } catch (error) {
        console.error(
          "Erreur lecture cache :",
          error
        );
      }
    }, []);

  /* =========================================================
     COMPTER SUPPRESSIONS EN ATTENTE
  ========================================================= */

  const updatePendingDeleteCount =
    useCallback(async () => {
      try {
        const queue =
          await getDeleteQueue();

        const userId =
          getStoredUserId();

        if (!userId) {
          setPendingDeletes(0);
          return;
        }

        const count =
          queue.filter(
            (item) =>
              String(item.userId) ===
              String(userId)
          ).length;

        setPendingDeletes(count);
      } catch (error) {
        console.error(
          "Erreur file suppression :",
          error
        );
      }
    }, []);

  /* =========================================================
     SYNCHRONISER SUPPRESSIONS
  ========================================================= */

  const syncPendingDeletes =
    useCallback(async () => {
      if (
        typeof navigator !== "undefined" &&
        !navigator.onLine
      ) {
        return;
      }

      const userId =
        getStoredUserId();

      if (!userId) {
        return;
      }

      let queue: PendingDelete[];

      try {
        queue =
          await getDeleteQueue();
      } catch (error) {
        logSupabaseError(
          "Erreur lecture file suppression :",
          error
        );
        return;
      }

      const userQueue =
        queue.filter(
          (item) =>
            String(item.userId) ===
            String(userId)
        );

      if (!userQueue.length) {
        setPendingDeletes(0);
        return;
      }

      setSyncState("syncing");
      setSyncError(null);

      for (const item of userQueue) {
        try {
          const { error } =
            await supabase
              .from("products")
              .delete()
              .eq("id", item.id)
              .eq("user_id", userId);

          if (error) {
            throw error;
          }

          await removeFromDeleteQueue(
            item.id
          );
        } catch (error) {
          logSupabaseError(
            "Erreur synchronisation suppression :",
            error
          );

          setSyncState("error");

          setSyncError(
            `Suppression en attente : ${getErrorMessage(
              error
            )}`
          );

          break;
        }
      }

      await updatePendingDeleteCount();

      const remaining =
        await getDeleteQueue();

      const remainingUser =
        remaining.filter(
          (item) =>
            String(item.userId) ===
            String(userId)
        );

      if (!remainingUser.length) {
        setSyncState("online");
        setSyncError(null);
      }
    }, [
      updatePendingDeleteCount,
    ]);

  /* =========================================================
     CHARGER PRODUITS SUPABASE
  ========================================================= */

  const fetchProductsOnline =
    useCallback(async () => {
      const userId =
        getStoredUserId();

      console.log(
        "USER ID :",
        userId
      );

      if (!userId) {
        setProducts([]);
        setLoading(false);

        setSyncError(
          "Utilisateur non identifié. Le user_id est absent du navigateur."
        );

        return;
      }

      if (
        typeof navigator !== "undefined" &&
        !navigator.onLine
      ) {
        return;
      }

      setSyncState("syncing");
      setSyncError(null);

      const pageSize = 1000;
      let from = 0;

      const allProducts: Product[] = [];

      try {
        while (true) {
          const to =
            from +
            pageSize -
            1;

          console.log(
            `Chargement produits Supabase : ${from} → ${to}`
          );

          const {
            data,
            error,
          } = await supabase
            .from("products")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", {
              ascending: false,
            })
            .range(from, to);

          if (error) {
            throw error;
          }

          const page =
            ((data || []) as Product[]).map(
              normalizeProduct
            );

          allProducts.push(
            ...page
          );

          console.log(
            `Produits reçus dans ce bloc : ${page.length}`
          );

          if (
            page.length <
            pageSize
          ) {
            break;
          }

          from += pageSize;
        }

        console.log(
          "TOTAL PRODUITS SUPABASE :",
          allProducts.length
        );

        /* =====================================================
           CACHE DES PRODUITS SERVEUR
        ===================================================== */

        await cacheProducts(
          allProducts
        );

        /* =====================================================
           CORRECTION IMPORTANTE

           On NE SUPPRIME PLUS automatiquement du cache
           les produits qui ne sont pas encore sur Supabase.

           Ils peuvent avoir été créés hors connexion.
        ===================================================== */

        const cachedProducts =
          await getAllCachedProducts(
            userId
          );

        const serverIds =
          new Set(
            allProducts.map(
              (product) =>
                product.id
            )
          );

        /*
         * Produits présents localement mais pas encore
         * présents sur Supabase.
         */
        const localOnlyProducts =
          cachedProducts.filter(
            (product) =>
              !serverIds.has(
                product.id
              )
          );

        /*
         * Supabase + produits locaux.
         */
        const mergedProducts = [
          ...localOnlyProducts,
          ...allProducts,
        ];

        /*
         * Éviter les doublons.
         */
        const uniqueProducts =
          Array.from(
            new Map(
              mergedProducts.map(
                (product) => [
                  product.id,
                  product,
                ]
              )
            ).values()
          );

        /*
         * Trier du plus récent au plus ancien.
         */
        uniqueProducts.sort(
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

        /*
         * AFFICHAGE DU CATALOGUE COMPLET
         *
         * Les produits locaux ne disparaissent plus.
         */
        setProducts(
          uniqueProducts
        );

        setSyncState("online");
        setSyncError(null);

        await updatePendingDeleteCount();
      } catch (error: unknown) {
        logSupabaseError(
          "Erreur chargement Supabase :",
          error
        );

        const message =
          getErrorMessage(error);

        /*
         * NE PAS supprimer le cache.
         */
        try {
          const cached =
            await getAllCachedProducts(
              userId
            );

          setProducts(
            cached
          );
        } catch (cacheError) {
          console.error(
            "Erreur lecture cache après erreur Supabase :",
            cacheError
          );
        }

        setSyncState("error");

        setSyncError(
          message ||
            "Impossible de synchroniser les produits avec Supabase."
        );
      }
    }, [
      updatePendingDeleteCount,
    ]);

  /* =========================================================
     CHARGEMENT PRINCIPAL
  ========================================================= */

  const loadProducts =
    useCallback(
      async (
        showFullLoader = true
      ) => {
        const userId =
          getStoredUserId();

        if (!userId) {
          setProducts([]);
          setLoading(false);

          setSyncError(
            "Utilisateur non identifié."
          );

          return;
        }

        if (showFullLoader) {
          setLoading(true);
        }

        /*
         * CACHE IMMÉDIAT
         */
        try {
          const cached =
            await getAllCachedProducts(
              userId
            );

          setProducts(
            cached
          );
        } catch (error) {
          console.error(
            "Erreur cache :",
            error
          );
        }

        /*
         * INTERNET
         */
        if (
          typeof navigator !== "undefined" &&
          navigator.onLine
        ) {
          await syncPendingDeletes();

          await fetchProductsOnline();
        } else {
          setSyncState(
            "offline"
          );
        }

        await updatePendingDeleteCount();

        setLoading(false);
      },
      [
        fetchProductsOnline,
        syncPendingDeletes,
        updatePendingDeleteCount,
      ]
    );

  /* =========================================================
     SUPPRESSION PRODUIT
  ========================================================= */

  const deleteProduct =
    async (
      product: Product
    ) => {
      const userId =
        getStoredUserId();

      if (!userId) {
        setDeleteModal({
          open: false,
          product: null,
        });

        setSyncError(
          "Utilisateur non identifié."
        );

        return;
      }

      if (
        deletingIds.has(
          product.id
        )
      ) {
        return;
      }

      setDeletingIds(
        (current) => {
          const next =
            new Set(current);

          next.add(
            product.id
          );

          return next;
        }
      );

      setDeleteModal({
        open: false,
        product: null,
      });

      const previousProducts =
        products;

      try {
        setProducts(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                product.id
            )
        );

        await removeCachedProduct(
          product.id
        );

        if (
          typeof navigator !== "undefined" &&
          !navigator.onLine
        ) {
          await addDeleteToQueue({
            id: product.id,
            userId,
            createdAt:
              Date.now(),
          });

          await updatePendingDeleteCount();

          setSyncState(
            "offline"
          );

          setSyncError(null);

          return;
        }

        setSyncState(
          "syncing"
        );

        const {
          data,
          error,
        } = await supabase
          .from("products")
          .delete()
          .eq("id", product.id)
          .eq("user_id", userId)
          .select("id");

        if (error) {
          throw error;
        }

        if (
          !data ||
          data.length === 0
        ) {
          throw new Error(
            "Supabase n'a supprimé aucune ligne. Vérifiez la colonne user_id et les politiques RLS de la table products."
          );
        }

        setSyncState(
          "online"
        );

        setSyncError(null);
      } catch (error: unknown) {
        logSupabaseError(
          "Erreur suppression produit :",
          error
        );

        if (
          typeof navigator !== "undefined" &&
          !navigator.onLine
        ) {
          try {
            await addDeleteToQueue({
              id: product.id,
              userId,
              createdAt:
                Date.now(),
            });

            await updatePendingDeleteCount();

            setSyncState(
              "offline"
            );

            setSyncError(
              "Suppression enregistrée. Elle sera synchronisée au retour de la connexion."
            );

            return;
          } catch (queueError) {
            console.error(
              "Impossible d'ajouter la suppression à la file :",
              queueError
            );
          }
        }

        try {
          await cacheProduct({
            ...product,
            user_id: userId,
          });
        } catch (cacheError) {
          console.error(
            "Erreur restauration cache :",
            cacheError
          );
        }

        setProducts(
          previousProducts
        );

        setSyncState(
          "error"
        );

        setSyncError(
          getErrorMessage(
            error
          ) ||
            "Impossible de supprimer le produit."
        );
      } finally {
        setDeletingIds(
          (current) => {
            const next =
              new Set(current);

            next.delete(
              product.id
            );

            return next;
          }
        );

        await updatePendingDeleteCount();
      }
    };

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
      } catch (error) {
        console.error(
          "Erreur actualisation :",
          error
        );
      } finally {
        setRefreshing(false);
      }
    };

  /* =========================================================
     DEMANDER SUPPRESSION
  ========================================================= */

  const askDelete = (
    product: Product
  ) => {
    if (
      deletingIds.has(
        product.id
      )
    ) {
      return;
    }

    setDeleteModal({
      open: true,
      product,
    });
  };

  /* =========================================================
     INITIALISATION
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const init =
      async () => {
        try {
          await openProductsDB();

          if (!mounted) {
            return;
          }

          setIsOnline(
            typeof navigator !==
              "undefined"
              ? navigator.onLine
              : true
          );

          await loadProducts(
            true
          );
        } catch (error) {
          console.error(
            "Erreur initialisation :",
            error
          );

          if (mounted) {
            setLoading(false);

            setSyncState(
              "error"
            );

            setSyncError(
              getErrorMessage(
                error
              )
            );
          }
        }
      };

    init();

    return () => {
      mounted = false;
    };
  }, [loadProducts]);

  /* =========================================================
     REALTIME — PRODUITS
  ========================================================= */

  useEffect(() => {
    const userId =
      getStoredUserId();

    if (!userId) {
      return;
    }

    const channel = supabase
      .channel(
        `products-user-${userId}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log(
            "Produit modifié :",
            payload
          );

          if (
            payload.eventType ===
              "INSERT" &&
            payload.new
          ) {
            const product =
              normalizeProduct(
                payload.new as Product
              );

            try {
              await cacheProduct(
                product
              );
            } catch (error) {
              console.error(
                "Erreur cache nouveau produit :",
                error
              );
            }

            setProducts(
              (current) => {
                const exists =
                  current.some(
                    (item) =>
                      item.id ===
                      product.id
                  );

                if (exists) {
                  return current.map(
                    (item) =>
                      item.id ===
                      product.id
                        ? product
                        : item
                  );
                }

                return [
                  product,
                  ...current,
                ];
              }
            );

            return;
          }

          if (
            payload.eventType ===
              "UPDATE" &&
            payload.new
          ) {
            const product =
              normalizeProduct(
                payload.new as Product
              );

            try {
              await cacheProduct(
                product
              );
            } catch (error) {
              console.error(
                "Erreur cache produit modifié :",
                error
              );
            }

            setProducts(
              (current) =>
                current.map(
                  (item) =>
                    item.id ===
                    product.id
                      ? product
                      : item
                )
            );

            return;
          }

          if (
            payload.eventType ===
              "DELETE" &&
            payload.old
          ) {
            const productId =
              String(
                (payload.old as Product)
                  .id
              );

            try {
              await removeCachedProduct(
                productId
              );
            } catch (error) {
              console.error(
                "Erreur suppression cache :",
                error
              );
            }

            setProducts(
              (current) =>
                current.filter(
                  (item) =>
                    item.id !==
                    productId
                )
            );
          }
        }
      )
      .subscribe((status) => {
        console.log(
          "Realtime products :",
          status
        );
      });

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, []);

  /* =========================================================
     RECHARGER APRÈS RETOUR SUR PAGE
  ========================================================= */

  useEffect(() => {
    const handleVisibilityChange =
      async () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          try {
            await loadProducts(
              false
            );
          } catch (error) {
            console.error(
              "Erreur rechargement après retour :",
              error
            );
          }
        }
      };

    const handleFocus =
      async () => {
        try {
          await loadProducts(
            false
          );
        } catch (error) {
          console.error(
            "Erreur rechargement après focus :",
            error
          );
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [loadProducts]);

  /* =========================================================
     ONLINE / OFFLINE
  ========================================================= */

  useEffect(() => {
    const handleOnline =
      async () => {
        setIsOnline(true);

        setSyncState(
          "syncing"
        );

        setSyncError(null);

        try {
          await syncPendingDeletes();

          await fetchProductsOnline();

          await updatePendingDeleteCount();
        } catch (error) {
          console.error(
            "Erreur reconnexion :",
            error
          );

          setSyncState(
            "error"
          );

          setSyncError(
            getErrorMessage(
              error
            )
          );
        }
      };

    const handleOffline =
      () => {
        setIsOnline(false);

        setSyncState(
          "offline"
        );

        setSyncError(null);
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
  }, [
    fetchProductsOnline,
    syncPendingDeletes,
    updatePendingDeleteCount,
  ]);

  /* =========================================================
     PRODUIT AJOUTÉ — AFFICHAGE IMMÉDIAT
  ========================================================= */

  useEffect(() => {
    const handleProductAdded =
      async (event: Event) => {
        try {
          const customEvent =
            event as CustomEvent<Product>;

          const newProduct =
            customEvent.detail;

          if (
            !newProduct ||
            !newProduct.id
          ) {
            return;
          }

          const normalizedProduct =
            normalizeProduct(
              newProduct
            );

          try {
            await cacheProduct(
              normalizedProduct
            );
          } catch (error) {
            console.error(
              "Erreur cache produit ajouté :",
              error
            );
          }

          setProducts(
            (current) => {
              const exists =
                current.some(
                  (product) =>
                    product.id ===
                    normalizedProduct.id
                );

              if (exists) {
                return current.map(
                  (product) =>
                    product.id ===
                    normalizedProduct.id
                      ? normalizedProduct
                      : product
                );
              }

              return [
                normalizedProduct,
                ...current,
              ];
            }
          );

          setSyncError(null);
        } catch (error) {
          console.error(
            "Erreur affichage produit ajouté :",
            error
          );
        }
      };

    window.addEventListener(
      "biso-product-added",
      handleProductAdded
    );

    const handleStorage =
      async (
        event: StorageEvent
      ) => {
        if (
          event.key !==
            "biso-product-added" ||
          !event.newValue
        ) {
          return;
        }

        try {
          const product =
            JSON.parse(
              event.newValue
            ) as Product;

          await handleProductAdded(
            new CustomEvent(
              "biso-product-added",
              {
                detail: product,
              }
            )
          );
        } catch (error) {
          console.error(
            "Erreur lecture produit ajouté :",
            error
          );
        }
      };

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "biso-product-added",
        handleProductAdded
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  /* =========================================================
     STATISTIQUES
  ========================================================= */

  const stats = useMemo(() => {
    const rupture =
      products.filter(
        (p) =>
          Number(p.stock) <= 0
      ).length;

    const faible =
      products.filter(
        (p) =>
          Number(p.stock) > 0 &&
          Number(p.stock) <= 5
      ).length;

    let valeurFC = 0;
    let valeurUSD = 0;

    let beneficeFC = 0;
    let beneficeUSD = 0;

    for (const p of products) {
      const currency =
        String(
          p.currency || ""
        )
          .trim()
          .toUpperCase();

      const stock =
        Number(p.stock) || 0;

      const purchase =
        Number(
          p.purchase_price
        ) || 0;

      const selling =
        Number(
          p.selling_price
        ) || 0;

      const value =
        purchase * stock;

      const profit =
        (selling - purchase) *
        stock;

      if (
        currency === "FC" ||
        currency === "CDF" ||
        currency ===
          "FRANC CONGOLAIS"
      ) {
        valeurFC += value;
        beneficeFC += profit;
      }

      if (
        currency === "$" ||
        currency === "USD" ||
        currency === "DOLLAR"
      ) {
        valeurUSD += value;
        beneficeUSD += profit;
      }
    }

    return {
      total: products.length,
      rupture,
      faible,
      valeurFC,
      valeurUSD,
      beneficeFC,
      beneficeUSD,
    };
  }, [products]);

  /* =========================================================
     RECHERCHE
  ========================================================= */

  const filteredProducts =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      const result =
        products.filter(
          (p) =>
            (p.name || "")
              .toLowerCase()
              .includes(search)
        );

      result.sort((a, b) => {
        const aStock =
          Number(a.stock);

        const bStock =
          Number(b.stock);

        if (
          aStock <= 0 &&
          bStock > 0
        ) {
          return -1;
        }

        if (
          bStock <= 0 &&
          aStock > 0
        ) {
          return 1;
        }

        if (
          aStock > 0 &&
          aStock <= 5 &&
          bStock > 5
        ) {
          return -1;
        }

        if (
          bStock > 0 &&
          bStock <= 5 &&
          aStock > 5
        ) {
          return 1;
        }

        const aDate =
          a.created_at
            ? new Date(
                a.created_at
              ).getTime()
            : 0;

        const bDate =
          b.created_at
            ? new Date(
                b.created_at
              ).getTime()
            : 0;

        return (
          bDate - aDate
        );
      });

      return result;
    }, [
      products,
      searchTerm,
    ]);

  /* =========================================================
     RENDU
  ========================================================= */

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f5f7fb] pb-24 text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-indigo-200/20 blur-3xl" />
        <div className="absolute -right-24 top-80 h-72 w-72 rounded-full bg-cyan-200/15 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-8">

        <header className="mb-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:mb-5 sm:rounded-[28px] sm:p-6">
          <div className="flex flex-col gap-4">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm sm:h-14 sm:w-14">
                <Package
                  size={22}
                  className="sm:h-7 sm:w-7"
                />
              </div>

              <div className="min-w-0 flex-1">

                <div className="flex flex-wrap items-center gap-2">

                  <h1 className="text-xl font-black tracking-tight sm:text-3xl">
                    Produits
                  </h1>

                  <span className="rounded-full bg-indigo-50 px-2 py-1 text-[8px] font-black text-indigo-600 sm:text-[9px]">
                    STOCK
                  </span>

                </div>

              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">

              <div
                className={`inline-flex min-h-[38px] items-center gap-2 rounded-xl px-3 text-[10px] font-black ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {isOnline ? (
                  <Wifi size={15} />
                ) : (
                  <WifiOff size={15} />
                )}

                {isOnline
                  ? "Connecté"
                  : "Hors connexion"}
              </div>

              {syncState ===
                "syncing" && (
                <div className="inline-flex min-h-[38px] items-center gap-2 rounded-xl bg-indigo-50 px-3 text-[10px] font-black text-indigo-600">

                  <Loader2
                    size={15}
                    className="animate-spin"
                  />

                  Synchronisation...
                </div>
              )}

              {!isOnline &&
                pendingDeletes >
                  0 && (
                <div className="inline-flex min-h-[38px] items-center gap-2 rounded-xl bg-amber-50 px-3 text-[10px] font-black text-amber-600">

                  <CloudOff
                    size={15}
                  />

                  {pendingDeletes}{" "}
                  suppression
                  {pendingDeletes >
                  1
                    ? "s"
                    : ""}{" "}
                  en attente
                </div>
              )}

            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">

              <button
                type="button"
                onClick={
                  refreshProducts
                }
                disabled={
                  refreshing
                }
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 sm:px-4"
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
                href="/products/add"
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 sm:px-4"
              >
                <Plus size={17} />
                Ajouter
              </Link>

            </div>
          </div>
        </header>

        {syncError && (
          <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-3.5">

            <div className="flex items-start gap-3">

              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div className="min-w-0">

                <p className="text-xs font-black text-amber-800">
                  Synchronisation
                </p>

                <p className="mt-1 break-words text-[11px] leading-5 text-amber-700">
                  {syncError}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSyncError(
                    null
                  )
                }
                className="ml-auto rounded-lg p-1 text-amber-500 hover:bg-amber-100"
              >
                <X size={15} />
              </button>

            </div>
          </div>
        )}

        <section className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">

          <StatCard
            icon={
              <ShoppingBag
                size={18}
              />
            }
            label="Produits"
            value={stats.total.toLocaleString()}
            description="Catalogue"
            tone="indigo"
          />

          <StatCard
            icon={
              <AlertTriangle
                size={18}
              />
            }
            label="Rupture"
            value={stats.rupture.toLocaleString()}
            description="À réapprovisionner"
            tone="red"
          />

          <StatCard
            icon={
              <Boxes size={18} />
            }
            label="Stock faible"
            value={stats.faible.toLocaleString()}
            description="5 unités ou moins"
            tone="amber"
          />

          <div className="min-w-0 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm sm:p-4">

            <div className="flex items-center gap-2">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CircleDollarSign
                  size={17}
                />
              </div>

              <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                Valeur stock
              </p>

            </div>

            <div className="mt-3 space-y-1">

              <p className="truncate text-xs font-black text-emerald-600 sm:text-sm">
                {stats.valeurFC.toLocaleString()}{" "}
                FC
              </p>

              <p className="truncate text-xs font-black text-emerald-600 sm:text-sm">
                {stats.valeurUSD.toLocaleString()}{" "}
                $
              </p>

            </div>

          </div>

        </section>

        <section className="mb-4 overflow-hidden rounded-[22px] border border-indigo-100 bg-white shadow-sm">

          <div className="flex items-center gap-3 p-4">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp
                size={18}
              />
            </div>

            <div className="min-w-0">

              <h2 className="text-sm font-black">
                Bénéfice potentiel
              </h2>

              <p className="mt-0.5 text-[10px] text-slate-500">
                Estimation du stock disponible
              </p>

            </div>

          </div>

          <div className="grid grid-cols-2 border-t border-slate-100">

            <div className="p-4">

              <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                FC
              </p>

              <p className="mt-1 text-sm font-black text-slate-900 sm:text-xl">
                {stats.beneficeFC.toLocaleString()}{" "}
                FC
              </p>

            </div>

            <div className="border-l border-slate-100 p-4">

              <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                USD
              </p>

              <p className="mt-1 text-sm font-black text-slate-900 sm:text-xl">
                {stats.beneficeUSD.toLocaleString()}{" "}
                $
              </p>

            </div>

          </div>
        </section>

        <section className="mb-4 overflow-hidden rounded-[22px] border border-indigo-100 bg-white shadow-sm">

          <div className="flex items-center gap-3 p-4">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Info size={18} />
            </div>

            <div className="min-w-0 flex-1">

              <h2 className="text-sm font-black">
                Guide des produits
              </h2>

              <p className="mt-0.5 text-[10px] text-slate-500">
                Comment utiliser votre inventaire.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowGuide(
                  !showGuide
                )
              }
              className="shrink-0 rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-black text-white hover:bg-indigo-700"
            >
              {showGuide
                ? "Fermer"
                : "Guide"}
            </button>

          </div>

          {showGuide && (
            <div className="space-y-2 border-t border-slate-100 p-3">

              <GuideItem
                number="1"
                title="Ajouter"
                text={
                  <>
                    Utilisez{" "}
                    <strong>
                      Ajouter
                    </strong>{" "}
                    pour enregistrer un nouveau produit.
                  </>
                }
              />

              <GuideItem
                number="2"
                title="Stock"
                text={
                  <>
                    <strong className="text-emerald-600">
                      Disponible
                    </strong>
                    ,{" "}
                    <strong className="text-amber-600">
                      faible
                    </strong>{" "}
                    ou{" "}
                    <strong className="text-red-600">
                      rupture
                    </strong>{" "}
                    selon la quantité.
                  </>
                }
              />

              <GuideItem
                number="3"
                title="Prix et bénéfice"
                text={
                  <>
                    Le bénéfice potentiel est calculé avec{" "}
                    <strong>
                      prix de vente − prix d'achat
                    </strong>{" "}
                    × stock.
                  </>
                }
              />

              <GuideItem
                number="4"
                title="Hors connexion"
                text={
                  <>
                    Les produits déjà synchronisés restent
                    accessibles sans Internet. Les suppressions
                    hors connexion sont conservées localement
                    puis envoyées automatiquement au serveur.
                  </>
                }
              />

            </div>
          )}

        </section>

        <section className="mb-4 rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm">

          <div className="flex gap-2">

            <div className="flex min-h-[48px] min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">

              <Search
                size={18}
                className="shrink-0 text-slate-400"
              />

              <input
                value={
                  searchTerm
                }
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
                placeholder="Chercher un produit"
                className="min-w-0 w-full bg-transparent py-2 text-sm font-medium outline-none placeholder:text-slate-400"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchTerm("")
                  }
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
                >
                  <X size={15} />
                </button>
              )}

            </div>

            <Link
              href="/products/add"
              className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus size={21} />
            </Link>

          </div>
        </section>

        <div className="mb-3 flex items-end justify-between px-1">

          <div>

            <h2 className="text-lg font-black">
              Inventaire
            </h2>

            <p className="mt-0.5 text-[10px] font-medium text-slate-500">
              {filteredProducts.length.toLocaleString()}{" "}
              produit
              {filteredProducts.length !==
              1
                ? "s"
                : ""}
            </p>

          </div>

        </div>

        <section className="space-y-2.5">

          {loading ? (
            <div className="rounded-[22px] border border-slate-200 bg-white p-10 text-center shadow-sm">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">

                <RefreshCcw
                  size={22}
                  className="animate-spin"
                />

              </div>

              <p className="mt-4 text-sm font-black">
                Chargement des produits...
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Chargement du catalogue complet.
              </p>

            </div>
          ) : filteredProducts.length ===
            0 ? (
            <div className="rounded-[22px] border border-slate-200 bg-white p-8 text-center shadow-sm">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Package size={25} />
              </div>

              <p className="mt-4 font-black">
                Aucun produit trouvé
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Ajoutez un produit ou modifiez votre recherche.
              </p>

              {!searchTerm && (
                <Link
                  href="/products/add"
                  className="mt-5 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white"
                >
                  <Plus size={16} />
                  Ajouter
                </Link>
              )}

            </div>
          ) : (
            filteredProducts.map(
              (p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  deleting={deletingIds.has(
                    p.id
                  )}
                  onDelete={() =>
                    askDelete(p)
                  }
                />
              )
            )
          )}

        </section>

      </div>

      {deleteModal.open &&
        deleteModal.product && (
          <DeleteModal
            product={
              deleteModal.product
            }
            deleting={deletingIds.has(
              deleteModal.product.id
            )}
            onCancel={() =>
              setDeleteModal({
                open: false,
                product: null,
              })
            }
            onConfirm={() =>
              deleteProduct(
                deleteModal.product!
              )
            }
          />
        )}

    </main>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
  description,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  tone:
    | "indigo"
    | "red"
    | "amber";
}) {
  const styles = {
    indigo: {
      box: "bg-indigo-50 text-indigo-600",
      value: "text-slate-900",
    },
    red: {
      box: "bg-red-50 text-red-500",
      value: "text-red-500",
    },
    amber: {
      box: "bg-amber-50 text-amber-500",
      value: "text-amber-500",
    },
  };

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">

      <div className="flex items-center justify-between gap-2">

        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${styles[tone].box}`}
        >
          {icon}
        </div>

        <span className="hidden text-[8px] font-black uppercase tracking-wide text-slate-400 sm:block">
          {description}
        </span>

      </div>

      <p className="mt-3 text-[9px] font-semibold text-slate-500">
        {label}
      </p>

      <p
        className={`mt-0.5 text-xl font-black sm:text-2xl ${styles[tone].value}`}
      >
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   PRODUCT CARD
========================================================= */

function ProductCard({
  product,
  deleting,
  onDelete,
}: {
  product: Product;
  deleting: boolean;
  onDelete: () => void;
}) {
  const stock =
    Number(product.stock) || 0;

  const purchase =
    Number(
      product.purchase_price
    ) || 0;

  const selling =
    Number(
      product.selling_price
    ) || 0;

  const profit =
    (selling - purchase) *
    stock;

  const rupture =
    stock <= 0;

  const faible =
    stock > 0 &&
    stock <= 5;

  return (
    <article className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md">

      <div className="p-3 sm:p-4">

        <div className="flex min-w-0 items-center gap-3">

          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              rupture
                ? "bg-red-50 text-red-500"
                : faible
                ? "bg-amber-50 text-amber-500"
                : "bg-indigo-50 text-indigo-600"
            }`}
          >
            {rupture ? (
              <AlertTriangle
                size={18}
              />
            ) : (
              <Package size={18} />
            )}
          </div>

          <div className="min-w-0 flex-1">

            <div className="flex min-w-0 flex-wrap items-center gap-1.5">

              <h3 className="min-w-0 break-words text-sm font-black text-slate-900 sm:text-base">
                {product.name ||
                  "Produit sans nom"}
              </h3>

              {rupture ? (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[8px] font-black text-red-600">
                  Rupture
                </span>
              ) : faible ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-black text-amber-600">
                  Faible
                </span>
              ) : (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-black text-emerald-600">
                  Disponible
                </span>
              )}

            </div>

            <p className="mt-0.5 truncate text-[10px] text-slate-500">
              {product.unit ||
                "Unité"}
            </p>

          </div>

          <div className="shrink-0 text-right">

            <p
              className={`text-lg font-black ${
                rupture
                  ? "text-red-500"
                  : faible
                  ? "text-amber-500"
                  : "text-slate-900"
              }`}
            >
              {stock}
            </p>

            <p className="text-[8px] font-bold text-slate-400">
              STOCK
            </p>

          </div>

        </div>

        <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-100">

          <div className="min-w-0 bg-slate-50 p-2.5">

            <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">
              Achat
            </p>

            <p className="mt-1 truncate text-[10px] font-black text-slate-700 sm:text-xs">
              {purchase.toLocaleString()}{" "}
              {product.currency}
            </p>

          </div>

          <div className="min-w-0 border-l border-slate-100 bg-emerald-50/50 p-2.5">

            <p className="text-[8px] font-black uppercase tracking-wide text-emerald-500">
              Vente
            </p>

            <p className="mt-1 truncate text-[10px] font-black text-emerald-700 sm:text-xs">
              {selling.toLocaleString()}{" "}
              {product.currency}
            </p>

          </div>

          <div className="min-w-0 border-l border-slate-100 bg-indigo-50/50 p-2.5">

            <p className="text-[8px] font-black uppercase tracking-wide text-indigo-500">
              Bénéfice
            </p>

            <p
              className={`mt-1 truncate text-[10px] font-black sm:text-xs ${
                profit >= 0
                  ? "text-indigo-700"
                  : "text-red-500"
              }`}
            >
              {profit.toLocaleString()}{" "}
              {product.currency}
            </p>

          </div>

        </div>

        <div className="mt-2.5 flex items-center gap-2">

          <Boxes
            size={14}
            className="shrink-0 text-slate-400"
          />

          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">

            <div
              className={`h-full rounded-full ${
                rupture
                  ? "bg-red-500"
                  : faible
                  ? "bg-amber-500"
                  : "bg-indigo-600"
              }`}
              style={{
                width:
                  stock <= 0
                    ? "0%"
                    : `${Math.min(
                        100,
                        Math.max(
                          8,
                          stock * 4
                        )
                      )}%`,
              }}
            />

          </div>

          <span className="shrink-0 text-[9px] font-bold text-slate-400">
            {product.unit ||
              "unité"}
          </span>

        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">

          <Link
            href={`/products/edit/${product.id}`}
            className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-2 text-[10px] font-black text-indigo-600 transition hover:bg-indigo-100"
          >

            <Edit size={14} />

            Modifier

            <ChevronRight
              size={13}
              className="hidden sm:block"
            />

          </Link>

          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-2 text-[10px] font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >

            {deleting ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : (
              <Trash2 size={14} />
            )}

            {deleting
              ? "Suppression..."
              : "Supprimer"}

          </button>

        </div>

      </div>
    </article>
  );
}

/* =========================================================
   MODAL SUPPRESSION
========================================================= */

function DeleteModal({
  product,
  deleting,
  onCancel,
  onConfirm,
}: {
  product: Product;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">

      <div
        className="w-full max-w-md overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
      >

        <div className="p-5 sm:p-6">

          <div className="flex items-start gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Trash2 size={20} />
            </div>

            <div className="min-w-0 flex-1">

              <h2
                id="delete-title"
                className="text-base font-black text-slate-900 sm:text-lg"
              >
                Supprimer ce produit ?
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Voulez-vous vraiment supprimer ce produit ?
                Cette action est irréversible.
              </p>

            </div>

            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>

          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                <Package size={18} />
              </div>

              <div className="min-w-0">

                <p className="break-words text-sm font-black text-slate-900">
                  {product.name ||
                    "Produit sans nom"}
                </p>

                <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                  Stock :{" "}
                  {Number(
                    product.stock
                  ) || 0}{" "}
                  {product.unit ||
                    "unité"}
                </p>

              </div>

            </div>

          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">

            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-red-600 px-3 text-xs font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {deleting ? (
                <>
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />

                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 size={15} />

                  Supprimer
                </>
              )}

            </button>

          </div>

        </div>
      </div>
    </div>
  );
}

/* =========================================================
   GUIDE ITEM
========================================================= */

function GuideItem({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">

      <div className="flex items-start gap-2.5">

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-black text-white">
          {number}
        </div>

        <div className="min-w-0">

          <h3 className="text-xs font-black text-slate-900">
            {title}
          </h3>

          <p className="mt-1 text-[10px] leading-5 text-slate-600 sm:text-xs">
            {text}
          </p>

        </div>

      </div>

    </div>
  );
}