"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  Search,
  ShoppingCart,
  Package,
  Sparkles,
  CheckCircle,
  Plus,
  Minus,
  TrendingUp,
  AlertTriangle,
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
  user_id?: string | null;
  name: string;
  stock: number;
  initial_stock: number;
  purchase_price: number;
  selling_price: number;
  currency: string;
  pieces_per_unit?: number;
  unit?: string | null;
  created_at?: string;
  updated_at?: string;
};

type OfflineSale = {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  total_sale: number;
  profit: number;
  currency: string;
  created_at: string;
  synced: boolean;
};

type ConnectionState =
  | "online"
  | "offline"
  | "syncing";

/* =========================================================
   INDEXED DB
========================================================= */

const DB_NAME = "biso-commerce-products";

/*
 * IMPORTANT :
 * La page Produits utilise déjà la base
 * "biso-commerce-products".
 *
 * On passe à la version 5 pour ajouter
 * le store des ventes hors connexion.
 *
 * Une version IndexedDB ne doit jamais
 * redescendre.
 */
const DB_VERSION = 5;

const PRODUCTS_STORE = "products";
const OFFLINE_SALES_STORE = "offline_sales";

/* =========================================================
   OUVRIR INDEXED DB
========================================================= */

function openSalesDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(
        new Error(
          "IndexedDB est disponible uniquement dans le navigateur."
        )
      );
      return;
    }

    if (!("indexedDB" in window)) {
      reject(
        new Error(
          "IndexedDB n'est pas supporté par ce navigateur."
        )
      );
      return;
    }

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
         PRODUITS
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

      if (
        !productsStore.indexNames.contains(
          "synced"
        )
      ) {
        productsStore.createIndex(
          "synced",
          "synced",
          {
            unique: false,
          }
        );
      }

      /* =====================================================
         VENTES HORS CONNEXION
      ===================================================== */

      if (
        !db.objectStoreNames.contains(
          OFFLINE_SALES_STORE
        )
      ) {
        const salesStore =
          db.createObjectStore(
            OFFLINE_SALES_STORE,
            {
              keyPath: "id",
            }
          );

        salesStore.createIndex(
          "user_id",
          "user_id",
          {
            unique: false,
          }
        );

        salesStore.createIndex(
          "synced",
          "synced",
          {
            unique: false,
          }
        );

        salesStore.createIndex(
          "created_at",
          "created_at",
          {
            unique: false,
          }
        );
      }

      /* =====================================================
         FILE DE SUPPRESSION EXISTANTE
      ===================================================== */

      if (
        !db.objectStoreNames.contains(
          "delete_queue"
        )
      ) {
        const deleteStore =
          db.createObjectStore(
            "delete_queue",
            {
              keyPath: "id",
            }
          );

        deleteStore.createIndex(
          "userId",
          "userId",
          {
            unique: false,
          }
        );
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onversionchange = () => {
        db.close();
      };

      resolve(db);
    };

    request.onerror = () => {
      reject(
        request.error ||
          new Error(
            "Impossible d'ouvrir IndexedDB."
          )
      );
    };
  });
}

/* =========================================================
   LIRE PRODUITS LOCAUX
========================================================= */

async function getLocalProducts(
  userId: string
): Promise<Product[]> {
  const db = await openSalesDB();

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
        db.close();

        const all =
          (request.result ||
            []) as Product[];

        const products =
          all.filter(
            (product) =>
              String(
                product.user_id ||
                  ""
              ) ===
              String(userId)
          );

        products.sort(
          (a, b) =>
            (a.name || "").localeCompare(
              b.name || "",
              "fr"
            )
        );

        resolve(products);
      };

      request.onerror = () => {
        db.close();

        reject(
          request.error ||
            new Error(
              "Impossible de récupérer les produits locaux."
            )
        );
      };
    }
  );
}

/* =========================================================
   SAUVER PRODUIT LOCAL
========================================================= */

async function saveLocalProduct(
  product: Product
): Promise<void> {
  const db = await openSalesDB();

  return new Promise(
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
        .put(product);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();

        reject(
          transaction.error ||
            new Error(
              "Impossible de mettre à jour le produit localement."
            )
        );
      };
    }
  );
}

/* =========================================================
   SAUVER VENTE LOCALE
========================================================= */

async function saveOfflineSale(
  sale: OfflineSale
): Promise<void> {
  const db = await openSalesDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          [
            PRODUCTS_STORE,
            OFFLINE_SALES_STORE,
          ],
          "readwrite"
        );

      const productsStore =
        transaction.objectStore(
          PRODUCTS_STORE
        );

      const salesStore =
        transaction.objectStore(
          OFFLINE_SALES_STORE
        );

      /*
       * Enregistrer la vente.
       */
      salesStore.put(sale);

      /*
       * Mettre immédiatement à jour
       * le stock local.
       */
      const productRequest =
        productsStore.get(
          sale.product_id
        );

      productRequest.onsuccess = () => {
        const product =
          productRequest.result as
            | Product
            | undefined;

        if (!product) {
          transaction.abort();

          return;
        }

        const updatedProduct: Product =
          {
            ...product,
            stock:
              Number(product.stock) -
              sale.quantity,
          };

        productsStore.put(
          updatedProduct
        );
      };

      productRequest.onerror =
        () => {
          transaction.abort();
        };

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();

        reject(
          transaction.error ||
            new Error(
              "Impossible d'enregistrer la vente hors connexion."
            )
        );
      };

      transaction.onabort = () => {
        db.close();

        reject(
          transaction.error ||
            new Error(
              "La vente locale a été interrompue."
            )
        );
      };
    }
  );
}

/* =========================================================
   LIRE VENTES EN ATTENTE
========================================================= */

async function getPendingOfflineSales(
  userId: string
): Promise<OfflineSale[]> {
  const db = await openSalesDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          OFFLINE_SALES_STORE,
          "readonly"
        );

      const store =
        transaction.objectStore(
          OFFLINE_SALES_STORE
        );

      const request =
        store.getAll();

      request.onsuccess = () => {
        db.close();

        const all =
          (request.result ||
            []) as OfflineSale[];

        const pending =
          all.filter(
            (sale) =>
              String(
                sale.user_id
              ) ===
                String(userId) &&
              sale.synced === false
          );

        pending.sort(
          (a, b) =>
            new Date(
              a.created_at
            ).getTime() -
            new Date(
              b.created_at
            ).getTime()
        );

        resolve(pending);
      };

      request.onerror = () => {
        db.close();

        reject(
          request.error ||
            new Error(
              "Impossible de lire les ventes en attente."
            )
        );
      };
    }
  );
}

/* =========================================================
   MARQUER VENTE SYNCHRONISÉE
========================================================= */

async function markSaleAsSynced(
  sale: OfflineSale
): Promise<void> {
  const db = await openSalesDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          OFFLINE_SALES_STORE,
          "readwrite"
        );

      transaction
        .objectStore(
          OFFLINE_SALES_STORE
        )
        .put({
          ...sale,
          synced: true,
        });

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();

        reject(
          transaction.error ||
            new Error(
              "Impossible de confirmer la synchronisation."
            )
        );
      };
    }
  );
}

/* =========================================================
   RÉCUPÉRER LES PRODUITS SUPABASE
========================================================= */

async function fetchProductsOnline(
  userId: string
): Promise<Product[]> {
  const { data, error } =
    await supabase
      .from("products")
      .select("*")
      .eq("user_id", userId)
      .order("name");

  if (error) {
    throw error;
  }

  return (
    (data || []) as Product[]
  ).map((product) => ({
    ...product,
    id: String(product.id),
    user_id: product.user_id
      ? String(product.user_id)
      : userId,
    name:
      product.name ||
      "Produit sans nom",
    stock:
      Number(product.stock) || 0,
    initial_stock:
      Number(
        product.initial_stock
      ) || 0,
    purchase_price:
      Number(
        product.purchase_price
      ) || 0,
    selling_price:
      Number(
        product.selling_price
      ) || 0,
    currency:
      String(
        product.currency || ""
      ),
    pieces_per_unit:
      Number(
        product.pieces_per_unit
      ) || 1,
  }));
}

/* =========================================================
   METTRE TOUS LES PRODUITS EN CACHE
========================================================= */

async function cacheProducts(
  products: Product[]
): Promise<void> {
  const db = await openSalesDB();

  return new Promise(
    (resolve, reject) => {
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
        const product of products
      ) {
        store.put(product);
      }

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();

        reject(
          transaction.error ||
            new Error(
              "Impossible de mettre les produits en cache."
            )
        );
      };
    }
  );
}

/* =========================================================
   SYNCHRONISATION DES VENTES
========================================================= */

async function syncOfflineSales(
  userId: string
): Promise<boolean> {
  if (
    typeof window ===
      "undefined" ||
    !navigator.onLine
  ) {
    return false;
  }

  try {
    const pendingSales =
      await getPendingOfflineSales(
        userId
      );

    if (!pendingSales.length) {
      return true;
    }

    for (
      const sale of pendingSales
    ) {
      try {
        /*
         * 1. Créer la vente sur Supabase.
         *
         * UPSERT évite le doublon si la vente
         * a déjà été envoyée avant une coupure.
         */
        const { error: saleError } =
          await supabase
            .from("sales")
            .upsert(
              {
                id: sale.id,
                user_id: sale.user_id,
                product_id:
                  sale.product_id,
                product_name:
                  sale.product_name,
                quantity: sale.quantity,
                purchase_price:
                  sale.purchase_price,
                selling_price:
                  sale.selling_price,
                total_sale:
                  sale.total_sale,
                profit: sale.profit,
                currency: sale.currency,
                created_at:
                  sale.created_at,
              },
              {
                onConflict: "id",
              }
            );

        if (saleError) {
          console.error(
            "Erreur synchronisation vente :",
            saleError
          );

          break;
        }

        /*
         * 2. Récupérer le stock actuellement
         * présent sur le serveur.
         */
        const {
          data: serverProduct,
          error:
            productReadError,
        } = await supabase
          .from("products")
          .select("stock")
          .eq(
            "id",
            sale.product_id
          )
          .eq(
            "user_id",
            userId
          )
          .single();

        if (productReadError) {
          console.error(
            "Impossible de récupérer le stock serveur :",
            productReadError
          );

          break;
        }

        /*
         * IMPORTANT :
         * La vente a déjà été enregistrée.
         * On ne fait pas de deuxième vente.
         *
         * On applique uniquement la diminution
         * du stock.
         */
        const serverStock =
          Number(
            serverProduct?.stock
          ) || 0;

        /*
         * Pour une utilisation mono-appareil,
         * on retire la quantité vendue localement.
         */
        const newServerStock =
          Math.max(
            0,
            serverStock -
              sale.quantity
          );

        const {
          error:
            stockError,
        } = await supabase
          .from("products")
          .update({
            stock: newServerStock,
          })
          .eq(
            "id",
            sale.product_id
          )
          .eq(
            "user_id",
            userId
          );

        if (stockError) {
          console.error(
            "Erreur mise à jour stock serveur :",
            stockError
          );

          break;
        }

        /*
         * 3. Vente complètement synchronisée.
         */
        await markSaleAsSynced(
          sale
        );
      } catch (error) {
        console.error(
          "Erreur synchronisation vente hors connexion :",
          error
        );

        break;
      }
    }

    window.dispatchEvent(
      new CustomEvent(
        "biso-products-updated"
      )
    );

    window.dispatchEvent(
      new CustomEvent(
        "biso-sales-updated"
      )
    );

    return true;
  } catch (error) {
    console.error(
      "Erreur synchronisation ventes :",
      error
    );

    return false;
  }
}

/* =========================================================
   CHARGER PRODUITS
========================================================= */

export default function SalesPage() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [productId, setProductId] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [quantity, setQuantity] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [showGuide, setShowGuide] =
    useState(false);

  const [showSuccess, setShowSuccess] =
    useState(false);

  const [
    successOffline,
    setSuccessOffline,
  ] = useState(false);

  const [isOnline, setIsOnline] =
    useState(true);

  const [
    connectionState,
    setConnectionState,
  ] =
    useState<ConnectionState>(
      "online"
    );

  const [
    pendingSalesCount,
    setPendingSalesCount,
  ] = useState(0);

  const quantityInputRef =
    useRef<HTMLInputElement>(null);

  const summaryRef =
    useRef<HTMLDivElement>(null);

  /* =========================================================
     USER ID
  ========================================================= */

  const getUserId =
    useCallback(() => {
      if (
        typeof window ===
        "undefined"
      ) {
        return null;
      }

      return localStorage.getItem(
        "user_id"
      );
    }, []);

  /* =========================================================
     COMPTER VENTES EN ATTENTE
  ========================================================= */

  const refreshPendingSalesCount =
    useCallback(async () => {
      const userId =
        getUserId();

      if (!userId) {
        setPendingSalesCount(0);
        return;
      }

      try {
        const pending =
          await getPendingOfflineSales(
            userId
          );

        setPendingSalesCount(
          pending.length
        );
      } catch (error) {
        console.error(
          "Erreur compteur ventes :",
          error
        );
      }
    }, [getUserId]);

  /* =========================================================
     CHARGEMENT DES PRODUITS
  ========================================================= */

  const loadProducts =
    useCallback(
      async (
        silent = false
      ) => {
        try {
          const userId =
            getUserId();

          if (!userId) {
            setProducts([]);
            return;
          }

          /*
           * 1. CACHE IMMÉDIAT
           */
          const cached =
            await getLocalProducts(
              userId
            );

          setProducts(
            cached
          );

          /*
           * 2. SI HORS CONNEXION
           */
          if (!navigator.onLine) {
            setIsOnline(false);
            setConnectionState(
              "offline"
            );
            return;
          }

          /*
           * 3. INTERNET
           */
          if (!silent) {
            setConnectionState(
              "syncing"
            );
          }

          /*
           * Synchroniser d'abord
           * les ventes en attente.
           */
          await syncOfflineSales(
            userId
          );

          /*
           * Puis récupérer les produits
           * du serveur.
           */
          const onlineProducts =
            await fetchProductsOnline(
              userId
            );

          await cacheProducts(
            onlineProducts
          );

          setProducts(
            onlineProducts
          );

          setIsOnline(true);
          setConnectionState(
            "online"
          );

          await refreshPendingSalesCount();
        } catch (error) {
          console.error(
            "Erreur chargement produits :",
            error
          );

          /*
           * On garde le cache local.
           */
          try {
            const userId =
              getUserId();

            if (userId) {
              const cached =
                await getLocalProducts(
                  userId
                );

              setProducts(cached);
            }
          } catch (cacheError) {
            console.error(
              "Erreur cache :",
              cacheError
            );
          }

          setConnectionState(
            navigator.onLine
              ? "online"
              : "offline"
          );
        } finally {
          await refreshPendingSalesCount();
        }
      },
      [
        getUserId,
        refreshPendingSalesCount,
      ]
    );

  /* =========================================================
     INITIALISATION
  ========================================================= */

  useEffect(() => {
    const initialOnline =
      navigator.onLine;

    setIsOnline(
      initialOnline
    );

    setConnectionState(
      initialOnline
        ? "online"
        : "offline"
    );

    void loadProducts();
  }, [loadProducts]);

  /* =========================================================
     INTERNET
  ========================================================= */

  useEffect(() => {
    const handleOnline =
      async () => {
        setIsOnline(true);
        setConnectionState(
          "syncing"
        );

        const userId =
          getUserId();

        if (userId) {
          await syncOfflineSales(
            userId
          );
        }

        await loadProducts(
          true
        );

        setConnectionState(
          "online"
        );
      };

    const handleOffline =
      () => {
        setIsOnline(false);
        setConnectionState(
          "offline"
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
  }, [
    getUserId,
    loadProducts,
  ]);

  /* =========================================================
     ÉVÉNEMENTS DES PRODUITS
  ========================================================= */

  useEffect(() => {
    const handleProductsUpdated =
      async () => {
        const userId =
          getUserId();

        if (!userId) {
          return;
        }

        try {
          const cached =
            await getLocalProducts(
              userId
            );

          setProducts(
            cached
          );
        } catch (error) {
          console.error(
            "Erreur mise à jour locale :",
            error
          );
        }
      };

    window.addEventListener(
      "biso-products-updated",
      handleProductsUpdated
    );

    window.addEventListener(
      "biso-sales-updated",
      handleProductsUpdated
    );

    return () => {
      window.removeEventListener(
        "biso-products-updated",
        handleProductsUpdated
      );

      window.removeEventListener(
        "biso-sales-updated",
        handleProductsUpdated
      );
    };
  }, [getUserId]);

  /* =========================================================
     PRODUIT SÉLECTIONNÉ
  ========================================================= */

  const selectedProduct =
    products.find(
      (p) => p.id === productId
    );

  /* =========================================================
     RECHERCHE
  ========================================================= */

  const filteredProducts =
    products.filter(
      (p) =>
        p.name
          .toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          )
    );

  /* =========================================================
     QUANTITÉ
  ========================================================= */

  const increaseQty = () => {
    const current =
      Number(quantity || 0);

    const next =
      current + 1;

    if (
      selectedProduct &&
      next >
        Number(
          selectedProduct.stock
        )
    ) {
      setQuantity(
        String(
          Number(
            selectedProduct.stock
          )
        )
      );

      return;
    }

    setQuantity(
      String(next)
    );
  };

  const decreaseQty = () => {
    const value =
      Number(quantity || 0);

    if (value > 1) {
      setQuantity(
        String(value - 1)
      );
    }
  };

  /* =========================================================
     CALCULS
  ========================================================= */

  const totalPreview =
    selectedProduct
      ? Number(
          selectedProduct.selling_price
        ) *
        Number(
          quantity || 0
        )
      : 0;

  const profitPreview =
    selectedProduct
      ? (
          Number(
            selectedProduct.selling_price
          ) -
          Number(
            selectedProduct.purchase_price
          )
        ) *
        Number(
          quantity || 0
        )
      : 0;

  const stockAfterSale =
    selectedProduct
      ? Number(
          selectedProduct.stock
        ) -
        Number(
          quantity || 0
        )
      : 0;

  /* =========================================================
     FOCUS QUANTITÉ
  ========================================================= */

  const handleQuantityFocus =
    () => {
      setTimeout(() => {
        quantityInputRef.current?.scrollIntoView(
          {
            behavior:
              "smooth",
            block: "center",
          }
        );
      }, 300);
    };

  /* =========================================================
     RÉSUMÉ
  ========================================================= */

  useEffect(() => {
    if (
      selectedProduct &&
      Number(quantity) > 0
    ) {
      setTimeout(() => {
        summaryRef.current?.scrollIntoView(
          {
            behavior:
              "smooth",
            block: "nearest",
          }
        );
      }, 100);
    }
  }, [selectedProduct]);

  /* =========================================================
     ENREGISTRER VENTE
  ========================================================= */

  const saveSale = async () => {
    if (
      !selectedProduct ||
      !quantity
    ) {
      alert(
        "Sélectionnez un produit et une quantité avant de continuer."
      );

      return;
    }

    const qty =
      Number(quantity);

    if (
      !Number.isInteger(
        qty
      ) ||
      qty <= 0
    ) {
      alert(
        "La quantité doit être un nombre entier supérieur à zéro."
      );

      return;
    }

    if (
      qty >
      Number(
        selectedProduct.stock
      )
    ) {
      alert(
        `Stock insuffisant !\nDisponible : ${selectedProduct.stock}`
      );

      return;
    }

    const userId =
      getUserId();

    if (!userId) {
      alert(
        "Utilisateur non connecté."
      );

      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const prixVente =
        Number(
          selectedProduct.selling_price
        );

      const prixAchat =
        Number(
          selectedProduct.purchase_price
        );

      const totalSale =
        prixVente * qty;

      const profit =
        (
          prixVente -
          prixAchat
        ) * qty;

      const saleId =
        crypto.randomUUID();

      const createdAt =
        new Date().toISOString();

      const saleData: OfflineSale =
        {
          id: saleId,
          user_id: userId,
          product_id:
            selectedProduct.id,
          product_name:
            selectedProduct.name,
          quantity: qty,
          purchase_price:
            prixAchat,
          selling_price:
            prixVente,
          total_sale:
            totalSale,
          profit,
          currency:
            selectedProduct.currency,
          created_at:
            createdAt,
          synced: false,
        };

      /* =====================================================
         HORS CONNEXION
      ===================================================== */

      if (!navigator.onLine) {
        /*
         * Vente + diminution du stock
         * dans IndexedDB.
         */
        await saveOfflineSale(
          saleData
        );

        /*
         * Mettre l'interface à jour
         * immédiatement.
         */
        const updatedProduct: Product =
          {
            ...selectedProduct,
            stock:
              Number(
                selectedProduct.stock
              ) - qty,
          };

        setProducts(
          (current) =>
            current.map(
              (product) =>
                product.id ===
                updatedProduct.id
                  ? updatedProduct
                  : product
            )
        );

        setIsOnline(false);
        setConnectionState(
          "offline"
        );

        setSuccessOffline(
          true
        );

        setShowSuccess(
          true
        );

        setQuantity("");
        setProductId("");
        setSearchTerm("");

        await refreshPendingSalesCount();

        return;
      }

      /* =====================================================
         EN LIGNE
      ===================================================== */

      setConnectionState(
        "syncing"
      );

      /*
       * Enregistrer directement la vente.
       */
      const {
        error: saleError,
      } = await supabase
        .from("sales")
        .insert({
          id: saleData.id,
          user_id:
            saleData.user_id,
          product_id:
            saleData.product_id,
          product_name:
            saleData.product_name,
          quantity:
            saleData.quantity,
          purchase_price:
            saleData.purchase_price,
          selling_price:
            saleData.selling_price,
          total_sale:
            saleData.total_sale,
          profit:
            saleData.profit,
          currency:
            saleData.currency,
          created_at:
            saleData.created_at,
        });

      if (saleError) {
        /*
         * Même si l'insertion serveur échoue,
         * on transforme la vente en vente locale
         * pour ne pas la perdre.
         */
        await saveOfflineSale(
          saleData
        );

        setSuccessOffline(
          true
        );

        setShowSuccess(
          true
        );

        setConnectionState(
          "offline"
        );

        setQuantity("");
        setProductId("");
        setSearchTerm("");

        await refreshPendingSalesCount();

        return;
      }

      /* =====================================================
         DIMINUER STOCK SERVEUR
      ===================================================== */

      const nouveauStock =
        Number(
          selectedProduct.stock
        ) - qty;

      const {
        error: updateError,
      } = await supabase
        .from("products")
        .update({
          stock: nouveauStock,
        })
        .eq(
          "id",
          selectedProduct.id
        )
        .eq(
          "user_id",
          userId
        );

      if (updateError) {
        /*
         * La vente existe déjà.
         * On ne la réinsère pas.
         *
         * On informe simplement
         * l'utilisateur que le stock
         * doit être synchronisé.
         */
        console.error(
          "Erreur mise à jour stock :",
          updateError
        );
      }

      /* =====================================================
         METTRE LE PRODUIT À JOUR LOCALEMENT
      ===================================================== */

      await saveLocalProduct({
        ...selectedProduct,
        stock:
          nouveauStock,
        user_id:
          userId,
      });

      setProducts(
        (current) =>
          current.map(
            (product) =>
              product.id ===
              selectedProduct.id
                ? {
                    ...product,
                    stock:
                      nouveauStock,
                  }
                : product
          )
      );

      /* =====================================================
         STOCK PRESQUE VIDE
      ===================================================== */

      if (
        nouveauStock <= 5
      ) {
        console.warn(
          `Stock faible : ${selectedProduct.name} → ${nouveauStock}`
        );
      }

      /* =====================================================
         SUCCÈS
      ===================================================== */

     
      setIsOnline(true);
      setConnectionState("online");

      setSuccessOffline(false);
      setShowSuccess(true);

      setQuantity("");
      setProductId("");
      setSearchTerm("");

      try {
        await refreshPendingSalesCount();
      } catch (refreshError) {
        console.warn(
          "Compteur des ventes en attente non actualisé :",
          refreshError
        );
      }
    } catch (error) {
      console.error("Erreur vente :", error);

      /*
       * On essaie de conserver la vente localement
       * uniquement si le téléphone est réellement
       * hors connexion.
       */
      if (
        typeof navigator !== "undefined" &&
        !navigator.onLine
      ) {
        try {
          if (selectedProduct) {
            const qty = Number(quantity);

            if (
              Number.isInteger(qty) &&
              qty > 0 &&
              qty <= Number(selectedProduct.stock)
            ) {
              const prixVente = Number(
                selectedProduct.selling_price
              );

              const prixAchat = Number(
                selectedProduct.purchase_price
              );

              const saleData: OfflineSale = {
                id:
                  typeof crypto !== "undefined" &&
                  typeof crypto.randomUUID === "function"
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2)}`,

                user_id: userId,

                product_id:
                  selectedProduct.id,

                product_name:
                  selectedProduct.name,

                quantity: qty,

                purchase_price:
                  prixAchat,

                selling_price:
                  prixVente,

                total_sale:
                  prixVente * qty,

                profit:
                  (prixVente - prixAchat) * qty,

                currency:
                  selectedProduct.currency,

                created_at:
                  new Date().toISOString(),

                synced: false,
              };

              await saveOfflineSale(
                saleData
              );

              const updatedProduct: Product = {
                ...selectedProduct,
                stock:
                  Number(
                    selectedProduct.stock
                  ) - qty,
                user_id: userId,
              };

              await saveLocalProduct(
                updatedProduct
              );

              setProducts((current) =>
                current.map((product) =>
                  product.id ===
                  updatedProduct.id
                    ? updatedProduct
                    : product
                )
              );

              setIsOnline(false);
              setConnectionState("offline");

              setSuccessOffline(true);
              setShowSuccess(true);

              setQuantity("");
              setProductId("");
              setSearchTerm("");

              try {
                await refreshPendingSalesCount();
              } catch (refreshError) {
                console.warn(
                  "Impossible d'actualiser le compteur :",
                  refreshError
                );
              }

              return;
            }
          }
        } catch (offlineError) {
          console.error(
            "Erreur sauvegarde hors connexion :",
            offlineError
          );
        }
      }

      /*
       * Si on arrive ici, la vente n'a réellement
       * pas pu être enregistrée.
       */
      alert(
        "La vente n'a pas pu être enregistrée. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  };


  /* =========================================================
     AFFICHAGE
  ========================================================= */

  return (
    <main
      className="
        relative
        min-h-[100dvh]
        w-full
        overflow-x-hidden
        bg-[#f5f7fb]
        px-3
        py-4
        pb-32
        text-slate-900
        sm:px-6
        sm:py-6
      "
    >
      <div
        className="
          relative
          z-10
          mx-auto
          w-full
          max-w-xl
        "
      >

        {/* =====================================================
            HEADER
        ===================================================== */}

        <header
          className="
            mb-4
            rounded-[22px]
            border
            border-slate-100
            bg-white
            p-4
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
            sm:mb-6
            sm:rounded-[26px]
            sm:p-6
          "
        >

          <div
            className="
              flex
              items-start
              justify-between
              gap-3
            "
          >

            <div className="min-w-0 flex-1">

              <div className="flex items-center gap-2">

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
                    text-indigo-600
                    sm:h-11
                    sm:w-11
                  "
                >
                  <ShoppingCart
                    size={20}
                  />
                </div>

                <h1
                  className="
                    truncate
                    text-xl
                    font-black
                    tracking-tight
                    text-slate-900
                    sm:text-3xl
                  "
                >
                  Caisse{" "}
                  <span className="text-indigo-600">
                    vente
                  </span>
                </h1>

              </div>

              <p
                className="
                  mt-2
                  text-xs
                  leading-5
                  text-slate-500
                  sm:text-sm
                "
              >
                Enregistrez vos ventes rapidement
                avec BISO-COMMERCE.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowGuide(
                  !showGuide
                )
              }
              className="
                flex
                min-h-[42px]
                shrink-0
                items-center
                justify-center
                gap-1.5
                rounded-xl
                border
                border-indigo-100
                bg-indigo-50
                px-3
                text-[11px]
                font-black
                text-indigo-600
                shadow-sm
                transition
                active:scale-95
                sm:px-4
              "
            >
              <Sparkles size={14} />

              <span>
                {showGuide
                  ? "Fermer"
                  : "Guide"}
              </span>
            </button>

          </div>

          {/* =================================================
              STATUT CONNEXION
          ================================================= */}

          <div className="mt-4 flex flex-wrap items-center gap-2">

            <div
              className={`
                inline-flex
                min-h-[38px]
                items-center
                gap-2
                rounded-xl
                border
                px-3
                text-[10px]
                font-black
                ${
                  isOnline
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-amber-100 bg-amber-50 text-amber-700"
                }
              `}
            >

              {isOnline ? (
                <Wifi size={15} />
              ) : (
                <WifiOff size={15} />
              )}

              <span>
                {isOnline
                  ? "En ligne"
                  : "Hors connexion"}
              </span>

              <span
                className={`
                  h-1.5
                  w-1.5
                  rounded-full
                  ${
                    isOnline
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }
                `}
              />

            </div>

            {connectionState ===
              "syncing" && (
              <div
                className="
                  inline-flex
                  min-h-[38px]
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-indigo-100
                  bg-indigo-50
                  px-3
                  text-[10px]
                  font-black
                  text-indigo-700
                "
              >
                <Loader2
                  size={15}
                  className="animate-spin"
                />

                Synchronisation...
              </div>
            )}

            {pendingSalesCount >
              0 && (
              <div
                className="
                  inline-flex
                  min-h-[38px]
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-amber-100
                  bg-amber-50
                  px-3
                  text-[10px]
                  font-black
                  text-amber-700
                "
              >
                <CloudOff
                  size={15}
                />

                {pendingSalesCount} vente
                {pendingSalesCount >
                1
                  ? "s"
                  : ""}{" "}
                en attente
              </div>
            )}

          </div>

        </header>

        {/* =====================================================
            GUIDE
        ===================================================== */}

        {showGuide && (
          <section
            className="
              mb-4
              overflow-hidden
              rounded-[22px]
              border
              border-slate-100
              bg-white
              p-4
              shadow-[0_8px_30px_rgba(15,23,42,0.06)]
              sm:mb-5
              sm:rounded-[26px]
              sm:p-5
            "
          >

            <div
              className="
                mb-4
                flex
                items-center
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
                  text-indigo-600
                "
              >
                <Sparkles size={19} />
              </div>

              <h2
                className="
                  text-sm
                  font-black
                  leading-5
                  text-slate-900
                  sm:text-base
                "
              >
                Guide de vente
                BISO-COMMERCE
              </h2>

            </div>

            <div
              className="
                space-y-3
                text-sm
                text-slate-600
              "
            >

              <div
                className="
                  rounded-2xl
                  border
                  border-slate-100
                  bg-slate-50
                  p-4
                "
              >
                <h3
                  className="
                    mb-2
                    text-sm
                    font-black
                    text-slate-900
                  "
                >
                  1️⃣ Rechercher un produit
                </h3>

                <p className="text-xs leading-6 sm:text-sm">
                  Cherchez le produit dans votre
                  stock puis sélectionnez-le.
                </p>
              </div>

              <div
                className="
                  rounded-2xl
                  border
                  border-slate-100
                  bg-slate-50
                  p-4
                "
              >
                <h3
                  className="
                    mb-2
                    text-sm
                    font-black
                    text-slate-900
                  "
                >
                  2️⃣ Choisir la quantité
                </h3>

                <p className="text-xs leading-6 sm:text-sm">
                  Indiquez combien de produits
                  vous vendez.
                </p>
              </div>

              <div
                className="
                  rounded-2xl
                  border
                  border-slate-100
                  bg-slate-50
                  p-4
                "
              >
                <h3
                  className="
                    mb-2
                    text-sm
                    font-black
                    text-slate-900
                  "
                >
                  3️⃣ Vérifier le résumé
                </h3>

                <ul
                  className="
                    space-y-2
                    text-xs
                    leading-5
                  "
                >
                  <li>
                    ✅ Montant total de la vente
                  </li>

                  <li>
                    ✅ Bénéfice estimé
                  </li>

                  <li>
                    ✅ Stock restant
                  </li>
                </ul>
              </div>

              <div
                className="
                  rounded-2xl
                  border
                  border-indigo-100
                  bg-indigo-50
                  p-4
                "
              >
                <h3
                  className="
                    font-black
                    text-indigo-700
                  "
                >
                  4️⃣ Valider la vente
                </h3>

                <p className="mt-1 text-xs leading-6 sm:text-sm">
                  Même sans Internet, la vente est
                  enregistrée sur l'appareil et le
                  stock est diminué immédiatement.
                </p>
              </div>

              <div
                className="
                  rounded-2xl
                  border
                  border-emerald-100
                  bg-emerald-50
                  p-4
                "
              >
                <h3
                  className="
                    font-black
                    text-emerald-700
                  "
                >
                  5️⃣ Synchronisation
                </h3>

                <p className="mt-1 text-xs leading-6 sm:text-sm">
                  Dès que la connexion revient,
                  BISO-COMMERCE synchronise
                  automatiquement les ventes
                  enregistrées hors connexion.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowGuide(false)
                }
                className="
                  mt-2
                  flex
                  min-h-[46px]
                  w-full
                  items-center
                  justify-center
                  rounded-xl
                  bg-indigo-600
                  px-4
                  py-3
                  text-xs
                  font-black
                  text-white
                  transition
                  active:scale-[0.99]
                  hover:bg-indigo-700
                "
              >
                Fermer le guide
              </button>

            </div>

          </section>
        )}

        {/* =====================================================
            CAISSE
        ===================================================== */}

        <section
          className="
            space-y-5
            rounded-[22px]
            border
            border-slate-100
            bg-white
            p-4
            shadow-[0_8px_30px_rgba(15,23,42,0.06)]
            sm:rounded-[26px]
            sm:p-6
          "
        >

          {/* ===================================================
              RECHERCHE
          =================================================== */}

          <div>

            <label
              className="
                mb-2
                block
                text-xs
                font-black
                text-slate-500
              "
            >
              Produit
            </label>

            <div
              className="
                flex
                min-h-[52px]
                items-center
                gap-3
                rounded-2xl
                border
                border-slate-800
                bg-black
                px-3
                sm:px-4
              "
            >

              <Search
                size={18}
                className="shrink-0 text-indigo-400"
              />

              <input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(
                    e.target.value
                  );

                  setProductId("");
                }}
                placeholder="Rechercher un produit..."
                autoComplete="off"
                className="
                  min-w-0
                  flex-1
                  bg-transparent
                  py-3
                  text-sm
                  text-white
                  outline-none
                  placeholder:text-slate-500
                "
              />

            </div>

            {/* LISTE */}

            {searchTerm &&
              !productId && (
                <div
                  className="
                    mt-2
                    max-h-[45vh]
                    overflow-y-auto
                    overscroll-contain
                    rounded-2xl
                    border
                    border-slate-800
                    bg-black
                    shadow-xl
                  "
                >

                  {filteredProducts.length ===
                  0 ? (
                    <div
                      className="
                        p-5
                        text-center
                        text-xs
                        text-slate-400
                      "
                    >
                      Aucun produit trouvé.
                    </div>
                  ) : (
                    filteredProducts.map(
                      (p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setProductId(
                              p.id
                            );

                            setSearchTerm(
                              p.name
                            );

                            setTimeout(
                              () => {
                                quantityInputRef.current?.focus();
                              },
                              150
                            );
                          }}
                          className="
                            flex
                            min-h-[58px]
                            w-full
                            items-center
                            justify-between
                            gap-3
                            border-b
                            border-white/10
                            px-3
                            py-3
                            text-left
                            text-white
                            transition
                            active:bg-white/10
                            sm:px-4
                          "
                        >

                          <div
                            className="
                              flex
                              min-w-0
                              items-center
                              gap-3
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
                                bg-indigo-500/15
                                text-indigo-400
                              "
                            >
                              <Package
                                size={17}
                              />
                            </div>

                            <span
                              className="
                                min-w-0
                                truncate
                                text-sm
                                font-semibold
                              "
                            >
                              {p.name}
                            </span>

                          </div>

                          <span
                            className="
                              shrink-0
                              text-[10px]
                              font-medium
                              text-slate-400
                            "
                          >
                            Stock : {p.stock}
                          </span>

                        </button>
                      )
                    )
                  )}

                </div>
              )}

            {/* PRODUIT SÉLECTIONNÉ */}

            {selectedProduct && (
              <div
                className="
                  mt-3
                  flex
                  items-center
                  justify-between
                  gap-3
                  rounded-2xl
                  border
                  border-indigo-100
                  bg-indigo-50
                  px-3
                  py-3
                "
              >

                <div className="flex min-w-0 items-center gap-2">

                  <CheckCircle
                    size={16}
                    className="shrink-0 text-indigo-600"
                  />

                  <span
                    className="
                      min-w-0
                      truncate
                      text-xs
                      font-black
                      text-indigo-700
                    "
                  >
                    {selectedProduct.name}
                  </span>

                </div>

                <span
                  className="
                    shrink-0
                    text-[10px]
                    font-bold
                    text-indigo-500
                  "
                >
                  {selectedProduct.stock} en stock
                </span>

              </div>
            )}

          </div>

          {/* ===================================================
              QUANTITÉ
          =================================================== */}

          <div>

            <label
              className="
                mb-2
                block
                text-xs
                font-black
                text-slate-500
              "
            >
              Quantité vendue
            </label>

            <div
              className="
                grid
                grid-cols-[48px_minmax(0,1fr)_48px]
                items-center
                gap-2
                sm:grid-cols-[52px_minmax(0,1fr)_52px]
              "
            >

              <button
                type="button"
                onClick={decreaseQty}
                disabled={
                  !quantity ||
                  Number(quantity) <=
                    1
                }
                aria-label="Diminuer la quantité"
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  text-slate-700
                  transition
                  active:scale-95
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                  sm:h-[52px]
                  sm:w-[52px]
                "
              >
                <Minus size={18} />
              </button>

              <input
                ref={quantityInputRef}
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="1"
                step="1"
                max={
                  selectedProduct
                    ? selectedProduct.stock
                    : undefined
                }
                value={quantity}
                onChange={(e) => {
                  const value =
                    e.target.value;

                  if (
                    value === ""
                  ) {
                    setQuantity("");
                    return;
                  }

                  const numericValue =
                    Number(value);

                  if (
                    !Number.isInteger(
                      numericValue
                    )
                  ) {
                    return;
                  }

                  if (
                    selectedProduct &&
                    numericValue >
                      selectedProduct.stock
                  ) {
                    setQuantity(
                      String(
                        selectedProduct.stock
                      )
                    );

                    return;
                  }

                  setQuantity(
                    value
                  );
                }}
                onFocus={
                  handleQuantityFocus
                }
                placeholder="0"
                className="
                  h-12
                  min-w-0
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  px-2
                  text-center
                  text-lg
                  font-black
                  text-slate-900
                  outline-none
                  focus:border-indigo-300
                  focus:ring-2
                  focus:ring-indigo-100
                  sm:h-[52px]
                "
              />

              <button
                type="button"
                onClick={increaseQty}
                disabled={
                  !!selectedProduct &&
                  Number(
                    quantity || 0
                  ) >=
                    Number(
                      selectedProduct.stock
                    )
                }
                aria-label="Augmenter la quantité"
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-xl
                  bg-indigo-600
                  text-white
                  shadow-sm
                  transition
                  active:scale-95
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                  sm:h-[52px]
                  sm:w-[52px]
                "
              >
                <Plus size={18} />
              </button>

            </div>

            {selectedProduct && (
              <p
                className="
                  mt-2
                  text-center
                  text-[10px]
                  font-medium
                  text-slate-400
                "
              >
                Maximum disponible :{" "}
                {selectedProduct.stock}
              </p>
            )}

          </div>

          {/* ===================================================
              RÉSUMÉ
          =================================================== */}

          {selectedProduct &&
            Number(quantity) > 0 && (
              <div
                ref={summaryRef}
                className="
                  scroll-mt-6
                  overflow-hidden
                  rounded-2xl
                  border
                  border-indigo-100
                  bg-indigo-50
                  p-4
                  sm:p-5
                "
              >

                <div
                  className="
                    mb-4
                    flex
                    items-center
                    gap-2
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
                      bg-indigo-100
                      text-indigo-600
                    "
                  >
                    <ShoppingCart size={18} />
                  </div>

                  <p
                    className="
                      text-sm
                      font-black
                      text-indigo-800
                    "
                  >
                    Résumé de la vente
                  </p>

                </div>

                <div
                  className="
                    flex
                    items-start
                    justify-between
                    gap-3
                    border-b
                    border-indigo-100
                    pb-3
                  "
                >

                  <span className="text-xs text-slate-500">
                    Produit
                  </span>

                  <span
                    className="
                      max-w-[65%]
                      break-words
                      text-right
                      text-xs
                      font-black
                      text-slate-900
                    "
                  >
                    {selectedProduct.name}
                  </span>

                </div>

                <div
                  className="
                    mt-3
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >

                  <span className="text-xs text-slate-500">
                    Quantité
                  </span>

                  <span className="text-xs font-black text-slate-900">
                    {quantity}
                  </span>

                </div>

                <div
                  className="
                    mt-3
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >

                  <span className="text-xs text-slate-500">
                    Prix unité
                  </span>

                  <span className="text-xs font-black text-slate-900">
                    {Number(
                      selectedProduct.selling_price
                    ).toLocaleString()}{" "}
                    {selectedProduct.currency}
                  </span>

                </div>

                <div
                  className="
                    mt-4
                    rounded-xl
                    bg-white
                    p-4
                    shadow-sm
                  "
                >

                  <p
                    className="
                      text-[10px]
                      font-black
                      uppercase
                      tracking-wider
                      text-slate-400
                    "
                  >
                    Total client
                  </p>

                  <p
                    className="
                      mt-1
                      break-words
                      text-2xl
                      font-black
                      text-indigo-600
                      sm:text-3xl
                    "
                  >
                    {totalPreview.toLocaleString()}{" "}
                    {selectedProduct.currency}
                  </p>

                </div>

                <div
                  className="
                    mt-3
                    flex
                    items-start
                    gap-2
                    rounded-xl
                    bg-white/60
                    p-3
                    text-xs
                    font-bold
                    text-emerald-600
                  "
                >

                  <TrendingUp
                    size={16}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    Bénéfice estimé :{" "}
                    {profitPreview.toLocaleString()}{" "}
                    {selectedProduct.currency}
                  </span>

                </div>

                {stockAfterSale <=
                  5 && (
                  <div
                    className="
                      mt-3
                      flex
                      items-start
                      gap-2
                      rounded-xl
                      border
                      border-amber-100
                      bg-amber-50
                      p-3
                      text-xs
                      font-medium
                      leading-5
                      text-amber-700
                    "
                  >

                    <AlertTriangle
                      size={16}
                      className="mt-0.5 shrink-0"
                    />

                    <span>
                      Attention : stock restant{" "}
                      <strong>
                        {stockAfterSale}
                      </strong>
                    </span>

                  </div>
                )}

              </div>
            )}

          {/* ===================================================
              VALIDATION
          =================================================== */}

          <button
            type="button"
            onClick={saveSale}
            disabled={
              loading ||
              !selectedProduct ||
              !quantity
            }
            className="
              flex
              min-h-[54px]
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              bg-indigo-600
              px-4
              py-4
              text-sm
              font-black
              text-white
              shadow-md
              shadow-indigo-600/10
              transition
              active:scale-[0.99]
              hover:bg-indigo-700
              disabled:cursor-not-allowed
              disabled:opacity-50
              sm:text-base
            "
          >

            {loading ? (
              <>
                <Loader2
                  size={20}
                  className="animate-spin"
                />

                Enregistrement...
              </>
            ) : (
              <>
                <CheckCircle size={20} />

                {isOnline
                  ? "Valider la vente"
                  : "Enregistrer la vente hors connexion"}
              </>
            )}

          </button>

        </section>

        {/* =====================================================
            POPUP SUCCÈS
        ===================================================== */}

        {showSuccess && (
          <div
            className="
              fixed
              inset-0
              z-[100]
              flex
              items-center
              justify-center
              bg-slate-950/50
              px-4
              py-6
              backdrop-blur-sm
            "
          >

            <div
              className="
                w-full
                max-w-sm
                overflow-hidden
                rounded-[28px]
                border
                border-slate-100
                bg-white
                shadow-[0_25px_80px_rgba(15,23,42,0.18)]
              "
            >

              <div
                className={`
                  p-6
                  text-center
                  ${
                    successOffline
                      ? "bg-amber-50"
                      : "bg-emerald-50"
                  }
                `}
              >

                <div
                  className={`
                    mx-auto
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-2xl
                    ${
                      successOffline
                        ? "bg-amber-100 text-amber-600"
                        : "bg-emerald-100 text-emerald-600"
                    }
                  `}
                >
                  <CheckCircle
                    size={38}
                  />
                </div>

                <h2
                  className="
                    mt-4
                    text-xl
                    font-black
                    text-slate-900
                    sm:text-2xl
                  "
                >
                  Vente enregistrée ✅
                </h2>

                <p
                  className="
                    mt-3
                    text-xs
                    leading-6
                    text-slate-600
                    sm:text-sm
                  "
                >
                  {successOffline
                    ? "La vente a été enregistrée sur cet appareil. Le stock a été diminué immédiatement. Elle sera automatiquement synchronisée dès que la connexion Internet reviendra."
                    : "Votre vente a été enregistrée avec succès et le stock a été mis à jour."}
                </p>

                {successOffline && (
                  <div
                    className="
                      mt-4
                      flex
                      items-center
                      gap-2
                      rounded-xl
                      border
                      border-amber-100
                      bg-white
                      px-3
                      py-2.5
                      text-left
                    "
                  >
                    <CloudOff
                      size={16}
                      className="shrink-0 text-amber-600"
                    />

                    <span className="text-[11px] font-bold leading-5 text-amber-700">
                      En attente de connexion pour
                      synchronisation.
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowSuccess(
                      false
                    );

                    window.location.href =
                      "/dashboard";
                  }}
                  className="
                    mt-6
                    flex
                    min-h-[50px]
                    w-full
                    items-center
                    justify-center
                    rounded-2xl
                    bg-indigo-600
                    px-4
                    py-3
                    text-sm
                    font-black
                    text-white
                    shadow-sm
                    transition
                    active:scale-[0.99]
                    hover:bg-indigo-700
                  "
                >
                  OK 
                </button>

              </div>

            </div>

          </div>
        )}

      </div>
    </main>
  );
}