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
  stock_before: number;
  stock_after: number;
  sale_synced: boolean;
  stock_synced: boolean;
  synced: boolean;
};

type ConnectionState = "online" | "offline" | "syncing";

/* =========================================================
   INDEXED DB
========================================================= */

const DB_NAME = "biso-commerce-products";
const DB_VERSION = 10;
const PRODUCTS_STORE = "products";
const OFFLINE_SALES_STORE = "offline_sales";
const DELETE_QUEUE_STORE = "delete_queue";

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
        new Error("IndexedDB n'est pas supporté par ce navigateur.")
      );
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const transaction = request.transaction;

      if (!transaction) return;

      let productsStore: IDBObjectStore;

      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
        productsStore = db.createObjectStore(PRODUCTS_STORE, {
          keyPath: "id",
        });
      } else {
        productsStore = transaction.objectStore(PRODUCTS_STORE);
      }

      if (!productsStore.indexNames.contains("user_id")) {
        productsStore.createIndex("user_id", "user_id", {
          unique: false,
        });
      }

      if (!productsStore.indexNames.contains("created_at")) {
        productsStore.createIndex("created_at", "created_at", {
          unique: false,
        });
      }

      if (!productsStore.indexNames.contains("synced")) {
        productsStore.createIndex("synced", "synced", {
          unique: false,
        });
      }

      let salesStore: IDBObjectStore;

      if (!db.objectStoreNames.contains(OFFLINE_SALES_STORE)) {
        salesStore = db.createObjectStore(OFFLINE_SALES_STORE, {
          keyPath: "id",
        });
      } else {
        salesStore = transaction.objectStore(OFFLINE_SALES_STORE);
      }

      if (!salesStore.indexNames.contains("user_id")) {
        salesStore.createIndex("user_id", "user_id", {
          unique: false,
        });
      }

      if (!salesStore.indexNames.contains("synced")) {
        salesStore.createIndex("synced", "synced", {
          unique: false,
        });
      }

      if (!salesStore.indexNames.contains("created_at")) {
        salesStore.createIndex("created_at", "created_at", {
          unique: false,
        });
      }

      if (!db.objectStoreNames.contains(DELETE_QUEUE_STORE)) {
        const deleteStore = db.createObjectStore(DELETE_QUEUE_STORE, {
          keyPath: "id",
        });

        deleteStore.createIndex("userId", "userId", {
          unique: false,
        });
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
          new Error("Impossible d'ouvrir IndexedDB.")
      );
    };

    request.onblocked = () => {
      console.warn("[BISO-COMMERCE] IndexedDB bloquée.");
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

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      PRODUCTS_STORE,
      "readonly"
    );

    const store = transaction.objectStore(PRODUCTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      db.close();

      const all = (request.result || []) as Product[];

      const products = all.filter(
        (product) =>
          String(product.user_id || "") === String(userId)
      );

      products.sort((a, b) =>
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
  });
}

/* =========================================================
   SAUVER PRODUIT LOCAL
========================================================= */

async function saveLocalProduct(
  product: Product
): Promise<void> {
  const db = await openSalesDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      PRODUCTS_STORE,
      "readwrite"
    );

    transaction
      .objectStore(PRODUCTS_STORE)
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

    transaction.onabort = () => {
      db.close();

      reject(
        transaction.error ||
          new Error("Transaction locale interrompue.")
      );
    };
  });
}

async function ensureLocalStock(
  productId: string,
  stockAfter: number,
  userId: string
) {
  try {
    const locals = await getLocalProducts(userId);

    const existing = locals.find(
      (p) => p.id === productId
    );

    if (
      existing &&
      Number(existing.stock) !== Number(stockAfter)
    ) {
      await saveLocalProduct({
        ...existing,
        stock: stockAfter,
        user_id: userId,
      });
    }
  } catch (e) {
    console.warn(
      "[BISO-COMMERCE] ensureLocalStock",
      e
    );
  }
}

/* =========================================================
   SAUVER VENTE HORS CONNEXION
========================================================= */

async function saveOfflineSale(
  sale: OfflineSale
): Promise<void> {
  const db = await openSalesDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [PRODUCTS_STORE, OFFLINE_SALES_STORE],
      "readwrite"
    );

    const productsStore =
      transaction.objectStore(PRODUCTS_STORE);

    const salesStore =
      transaction.objectStore(OFFLINE_SALES_STORE);

    salesStore.put(sale);

    const productRequest =
      productsStore.get(sale.product_id);

    productRequest.onsuccess = () => {
      const product =
        productRequest.result as Product | undefined;

      if (!product) return;

      const currentStock = Number(product.stock);

      if (currentStock !== sale.stock_after) {
        productsStore.put({
          ...product,
          stock: sale.stock_after,
        });
      }
    };

    productRequest.onerror = () => {};

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
            "La sauvegarde locale de la vente a été interrompue."
          )
      );
    };
  });
}

/* =========================================================
   VENTES EN ATTENTE
========================================================= */

async function getPendingOfflineSales(
  userId: string
): Promise<OfflineSale[]> {
  const db = await openSalesDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      OFFLINE_SALES_STORE,
      "readonly"
    );

    const store =
      transaction.objectStore(OFFLINE_SALES_STORE);

    const request = store.getAll();

    request.onsuccess = () => {
      db.close();

      const all = (request.result || []) as OfflineSale[];

      const pending = all
        .filter((sale) => {
          if (
            String(sale.user_id) !==
            String(userId)
          ) {
            return false;
          }

          const completelySynced =
            sale.synced === true ||
            (sale.sale_synced === true &&
              sale.stock_synced === true);

          return !completelySynced;
        })
        .map((sale) => ({
          ...sale,
          stock_before: Number.isFinite(
            Number(sale.stock_before)
          )
            ? Number(sale.stock_before)
            : 0,

          stock_after: Number.isFinite(
            Number(sale.stock_after)
          )
            ? Number(sale.stock_after)
            : Math.max(
                0,
                Number(sale.stock_before || 0) -
                  Number(sale.quantity || 0)
              ),

          sale_synced:
            sale.sale_synced === true,

          stock_synced:
            sale.stock_synced === true,

          synced: sale.synced === true,
        }));

      pending.sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
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
  });
}

/* =========================================================
   TOUTES LES VENTES LOCALES
========================================================= */

async function getAllOfflineSales(
  userId: string
): Promise<OfflineSale[]> {
  const db = await openSalesDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      OFFLINE_SALES_STORE,
      "readonly"
    );

    const store =
      transaction.objectStore(OFFLINE_SALES_STORE);

    const request = store.getAll();

    request.onsuccess = () => {
      db.close();

      const all = (request.result || []) as OfflineSale[];

      resolve(
        all.filter(
          (sale) =>
            String(sale.user_id) === String(userId)
        )
      );
    };

    request.onerror = () => {
      db.close();

      reject(
        request.error ||
          new Error(
            "Impossible de lire les ventes locales."
          )
      );
    };
  });
}

/* =========================================================
   METTRE À JOUR VENTE LOCALE
========================================================= */

async function updateOfflineSale(
  sale: OfflineSale
): Promise<void> {
  const db = await openSalesDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      OFFLINE_SALES_STORE,
      "readwrite"
    );

    transaction
      .objectStore(OFFLINE_SALES_STORE)
      .put(sale);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();

      reject(
        transaction.error ||
          new Error(
            "Impossible de mettre à jour la vente locale."
          )
      );
    };

    transaction.onabort = () => {
      db.close();

      reject(
        transaction.error ||
          new Error(
            "Transaction de vente locale interrompue."
          )
      );
    };
  });
}

/* =========================================================
   SUPPRIMER VENTE LOCALE
========================================================= */

async function removeOfflineSale(
  saleId: string
): Promise<void> {
  const db = await openSalesDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      OFFLINE_SALES_STORE,
      "readwrite"
    );

    transaction
      .objectStore(OFFLINE_SALES_STORE)
      .delete(saleId);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();

      reject(
        transaction.error ||
          new Error(
            "Impossible de supprimer la vente locale."
          )
      );
    };

    transaction.onabort = () => {
      db.close();

      reject(
        transaction.error ||
          new Error("Suppression locale interrompue.")
      );
    };
  });
}

/* =========================================================
   NETTOYAGE DES VENTES SYNCHRONISÉES
========================================================= */

async function cleanupCompletedOfflineSales(
  userId: string
): Promise<number> {
  try {
    const all = await getAllOfflineSales(userId);

    let removed = 0;

    for (const sale of all) {
      const alreadyComplete =
        sale.synced === true ||
        (sale.sale_synced === true &&
          sale.stock_synced === true);

      if (alreadyComplete) {
        await removeOfflineSale(sale.id);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(
        `[BISO-COMMERCE] ${removed} ancienne(s) vente(s) synchronisée(s) supprimée(s)`
      );
    }

    return removed;
  } catch (error) {
    console.error(
      "[BISO-COMMERCE] Nettoyage ventes terminées :",
      error
    );

    return 0;
  }
}

/* =========================================================
   SYNCHRONISER UNE VENTE
========================================================= */

async function syncOneOfflineSale(
  sale: OfflineSale
): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !navigator.onLine
  ) {
    return false;
  }

  try {
    const stockBefore = Number(
      sale.stock_before
    );

    const stockAfter = Number(
      sale.stock_after
    );

    const quantity = Number(
      sale.quantity
    );

    if (
      !Number.isFinite(stockBefore) ||
      !Number.isFinite(stockAfter) ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      console.error(
        "[BISO-COMMERCE] Vente locale invalide :",
        sale
      );

      return false;
    }

    /* -------------------------------------------------------
       VÉRIFIER SI LA VENTE EXISTE DÉJÀ
    ------------------------------------------------------- */

    const {
      data: existingSale,
      error: existingSaleError,
    } = await supabase
      .from("sales")
      .select("id")
      .eq("id", sale.id)
      .eq("user_id", sale.user_id)
      .maybeSingle();

    if (existingSaleError) {
      console.error(
        "[BISO-COMMERCE] Vérification vente :",
        existingSaleError
      );

      return false;
    }

    /* -------------------------------------------------------
       CRÉER LA VENTE SI ELLE N'EXISTE PAS
    ------------------------------------------------------- */

    if (!existingSale) {
      const { error: saleError } =
        await supabase.from("sales").insert({
          id: sale.id,
          user_id: sale.user_id,
          product_id: sale.product_id,
          product_name: sale.product_name,
          quantity: sale.quantity,
          purchase_price: sale.purchase_price,
          selling_price: sale.selling_price,
          total_sale: sale.total_sale,
          profit: sale.profit,
          currency: sale.currency,
          created_at: sale.created_at,
        });

      if (saleError) {
        console.error(
          "[BISO-COMMERCE] Création vente échouée :",
          saleError
        );

        return false;
      }
    }

    sale.sale_synced = true;

    await updateOfflineSale({
      ...sale,
      sale_synced: true,
    });

    /* -------------------------------------------------------
       RÉCUPÉRER LE STOCK SERVEUR
    ------------------------------------------------------- */

    const {
      data: serverProduct,
      error: productError,
    } = await supabase
      .from("products")
      .select("id, stock")
      .eq("id", sale.product_id)
      .eq("user_id", sale.user_id)
      .maybeSingle();

    if (productError) {
      console.error(
        "[BISO-COMMERCE] Lecture stock serveur :",
        productError
      );

      return false;
    }

    if (!serverProduct) {
      console.error(
        "[BISO-COMMERCE] Produit serveur introuvable :",
        sale.product_id
      );

      return false;
    }

    const serverStock = Number(
      serverProduct.stock
    );

    /* -------------------------------------------------------
       VENTE ET STOCK DÉJÀ SYNCHRONISÉS
    ------------------------------------------------------- */

    if (
      existingSale &&
      serverStock === stockAfter
    ) {
      console.log(
        "[BISO-COMMERCE] Vente déjà complètement synchronisée :",
        sale.id
      );

      await ensureLocalStock(
        sale.product_id,
        stockAfter,
        sale.user_id
      );

      await removeOfflineSale(sale.id);

      window.dispatchEvent(
        new CustomEvent("biso-products-updated")
      );

      window.dispatchEvent(
        new CustomEvent("biso-sales-updated")
      );

      window.dispatchEvent(
        new CustomEvent(
          "biso-offline-sales-synced",
          {
            detail: {
              saleId: sale.id,
              remaining: 0,
            },
          }
        )
      );

      return true;
    }

    /* -------------------------------------------------------
       STOCK DÉJÀ AU BON NIVEAU
    ------------------------------------------------------- */

    if (serverStock === stockAfter) {
      sale.stock_synced = true;
    }

    /* -------------------------------------------------------
       STOCK SERVEUR = STOCK AVANT
       DONC ON PEUT APPLIQUER LA VENTE
    ------------------------------------------------------- */

    else if (serverStock === stockBefore) {
      const {
        data: updatedProducts,
        error: stockUpdateError,
      } = await supabase
        .from("products")
        .update({
          stock: stockAfter,
        })
        .eq("id", sale.product_id)
        .eq("user_id", sale.user_id)
        .eq("stock", stockBefore)
        .select("id, stock");

      if (stockUpdateError) {
        console.error(
          "[BISO-COMMERCE] Mise à jour stock :",
          stockUpdateError
        );

        return false;
      }

      /* -----------------------------------------------------
         CONFLIT / AUCUNE LIGNE MODIFIÉE
      ----------------------------------------------------- */

      if (
        !updatedProducts ||
        updatedProducts.length === 0
      ) {
        const {
          data: retryProduct,
          error: retryError,
        } = await supabase
          .from("products")
          .select("id, stock")
          .eq("id", sale.product_id)
          .eq("user_id", sale.user_id)
          .maybeSingle();

        if (
          retryError ||
          !retryProduct
        ) {
          console.error(
            "[BISO-COMMERCE] Vérification stock après conflit :",
            retryError
          );

          return false;
        }

        if (
          Number(retryProduct.stock) ===
          stockAfter
        ) {
          sale.stock_synced = true;
        } else {
          console.warn(
            "[BISO-COMMERCE] Conflit de stock :",
            {
              produit: sale.product_name,
              stockAvant: stockBefore,
              stockAprès: stockAfter,
              stockServeur: retryProduct.stock,
            }
          );

          return false;
        }
      } else {
        const returnedStock = Number(
          updatedProducts[0].stock
        );

        if (
          returnedStock !== stockAfter
        ) {
          console.error(
            "[BISO-COMMERCE] Stock incorrect après mise à jour :",
            {
              attendu: stockAfter,
              serveur: returnedStock,
            }
          );

          return false;
        }

        sale.stock_synced = true;
      }
    }

    /* -------------------------------------------------------
       STOCK SERVEUR INATTENDU
    ------------------------------------------------------- */

    else {
      console.warn(
        "[BISO-COMMERCE] Stock serveur différent de l'état attendu.",
        {
          produit: sale.product_name,
          stockBefore,
          stockAfter,
          serverStock,
        }
      );

      return false;
    }

    /* -------------------------------------------------------
       TOUT EST SYNCHRONISÉ
    ------------------------------------------------------- */

    if (
      sale.sale_synced === true &&
      sale.stock_synced === true
    ) {
      sale.synced = true;

      const {
        data: finalSale,
        error: finalSaleError,
      } = await supabase
        .from("sales")
        .select("id")
        .eq("id", sale.id)
        .eq("user_id", sale.user_id)
        .maybeSingle();

      if (
        finalSaleError ||
        !finalSale
      ) {
        console.error(
          "[BISO-COMMERCE] Vérification finale vente échouée :",
          finalSaleError
        );

        return false;
      }

      const {
        data: finalProduct,
        error: finalProductError,
      } = await supabase
        .from("products")
        .select("stock")
        .eq("id", sale.product_id)
        .eq("user_id", sale.user_id)
        .maybeSingle();

      if (
        finalProductError ||
        !finalProduct ||
        Number(finalProduct.stock) !==
          stockAfter
      ) {
        console.error(
          "[BISO-COMMERCE] Vérification finale stock échouée :",
          finalProductError
        );

        return false;
      }

      await ensureLocalStock(
        sale.product_id,
        stockAfter,
        sale.user_id
      );

      await removeOfflineSale(
        sale.id
      );

      window.dispatchEvent(
        new CustomEvent("biso-products-updated")
      );

      window.dispatchEvent(
        new CustomEvent("biso-sales-updated")
      );

      window.dispatchEvent(
        new CustomEvent(
          "biso-offline-sales-synced",
          {
            detail: {
              saleId: sale.id,
              remaining: 0,
            },
          }
        )
      );

      return true;
    }

    /* -------------------------------------------------------
       ENCORE PARTIELLEMENT SYNCHRONISÉE
    ------------------------------------------------------- */

    await updateOfflineSale({
      ...sale,
      sale_synced:
        sale.sale_synced === true,
      stock_synced:
        sale.stock_synced === true,
      synced:
        sale.sale_synced === true &&
        sale.stock_synced === true,
    });

    return false;
  } catch (error) {
    console.error(
      "[BISO-COMMERCE] Vente encore en attente :",
      sale.id,
      error
    );

    return false;
  }
}

/* =========================================================
   SYNCHRONISER TOUTES LES VENTES
========================================================= */

async function syncOfflineSales(
  userId: string
): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !navigator.onLine
  ) {
    return false;
  }

  try {
    await cleanupCompletedOfflineSales(
      userId
    );

    const pendingSales =
      await getPendingOfflineSales(userId);

    if (pendingSales.length === 0) {
      window.dispatchEvent(
        new CustomEvent(
          "biso-offline-sales-synced",
          {
            detail: {
              remaining: 0,
            },
          }
        )
      );

      return true;
    }

    let allSynced = true;

    for (const sale of pendingSales) {
      if (!navigator.onLine) {
        allSynced = false;
        break;
      }

      const success =
        await syncOneOfflineSale(sale);

      if (!success) {
        allSynced = false;
      }
    }

    await cleanupCompletedOfflineSales(
      userId
    );

    const remainingSales =
      await getPendingOfflineSales(userId);

    const completelySynced =
      remainingSales.length === 0;

    window.dispatchEvent(
      new CustomEvent("biso-products-updated")
    );

    window.dispatchEvent(
      new CustomEvent("biso-sales-updated")
    );

    window.dispatchEvent(
      new CustomEvent(
        "biso-offline-sales-synced",
        {
          detail: {
            remaining:
              remainingSales.length,
          },
        }
      )
    );

    return (
      allSynced &&
      completelySynced
    );
  } catch (error) {
    console.error(
      "[BISO-COMMERCE] Erreur synchronisation :",
      error
    );

    return false;
  }
}

/* =========================================================
   RÉCUPÉRER PRODUITS SUPABASE
========================================================= */

async function fetchProductsOnline(
  userId: string
): Promise<Product[]> {
  const {
    data,
    error,
  } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", userId)
    .order("name");

  if (error) {
    throw error;
  }

  return ((data || []) as Product[]).map(
    (product) => ({
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
        Number(product.initial_stock) || 0,

      purchase_price:
        Number(product.purchase_price) || 0,

      selling_price:
        Number(product.selling_price) || 0,

      currency:
        String(product.currency || ""),

      pieces_per_unit:
        Number(product.pieces_per_unit) || 1,
    })
  );
}

/* =========================================================
   CACHE PRODUITS
========================================================= */

async function cacheProducts(
  products: Product[]
): Promise<void> {
  const db = await openSalesDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      PRODUCTS_STORE,
      "readwrite"
    );

    const store =
      transaction.objectStore(PRODUCTS_STORE);

    for (const product of products) {
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

    transaction.onabort = () => {
      db.close();

      reject(
        transaction.error ||
          new Error(
            "Mise en cache interrompue."
          )
      );
    };
  });
}

/* =========================================================
   PAGE
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

  const [successOffline, setSuccessOffline] =
    useState(false);

  const [isOnline, setIsOnline] =
    useState(true);

  const [connectionState, setConnectionState] =
    useState<ConnectionState>("online");

  const [pendingSalesCount, setPendingSalesCount] =
    useState(0);

  const quantityInputRef =
    useRef<HTMLInputElement>(null);

  const summaryRef =
    useRef<HTMLDivElement>(null);

  /* =======================================================
     USER ID
  ======================================================= */

  const getUserId = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem(
      "user_id"
    );
  }, []);

  /* =======================================================
     COMPTEUR VENTES EN ATTENTE
  ======================================================= */

  const refreshPendingSalesCount =
    useCallback(async () => {
      const userId = getUserId();

      if (!userId) {
        setPendingSalesCount(0);
        return;
      }

      try {
        await cleanupCompletedOfflineSales(
          userId
        );

        const pending =
          await getPendingOfflineSales(
            userId
          );

        setPendingSalesCount(
          pending.length
        );
      } catch (error) {
        console.error(
          "[BISO-COMMERCE] Compteur :",
          error
        );

        setPendingSalesCount(0);
      }
    }, [getUserId]);

  /* =======================================================
     CHARGER PRODUITS
  ======================================================= */

  const loadProducts =
    useCallback(
      async (silent = false) => {
        try {
          const userId =
            getUserId();

          if (!userId) {
            setProducts([]);
            setPendingSalesCount(0);
            return;
          }

          /* -----------------------------------------------
             1. CACHE IMMÉDIAT
          ------------------------------------------------ */

          const cached =
            await getLocalProducts(
              userId
            );

          setProducts(cached);

          await refreshPendingSalesCount();

          /* -----------------------------------------------
             MODE OFFLINE
          ------------------------------------------------ */

          if (
            typeof navigator !==
              "undefined" &&
            !navigator.onLine
          ) {
            setIsOnline(false);
            setConnectionState(
              "offline"
            );

            return;
          }

          if (!silent) {
            setConnectionState(
              "syncing"
            );
          }

          /* -----------------------------------------------
             2. SYNCHRONISER D'ABORD
          ------------------------------------------------ */

          await syncOfflineSales(
            userId
          );

          const pendingAfterSync =
            await getPendingOfflineSales(
              userId
            );

          await refreshPendingSalesCount();

          /* -----------------------------------------------
             3. RÉCUPÉRER SERVEUR
          ------------------------------------------------ */

          if (
            typeof navigator !==
              "undefined" &&
            navigator.onLine
          ) {
            const onlineProducts =
              await fetchProductsOnline(
                userId
              );

            let finalProducts: Product[];

            /* ---------------------------------------------
               NE PAS ÉCRASER LE STOCK LOCAL
               S'IL RESTE DES VENTES EN ATTENTE
            ---------------------------------------------- */

            if (
              pendingAfterSync.length >
              0
            ) {
              const localAfterSync =
                await getLocalProducts(
                  userId
                );

              const localMap =
                new Map(
                  localAfterSync.map(
                    (p) => [
                      p.id,
                      p,
                    ]
                  )
                );

              finalProducts =
                onlineProducts.map(
                  (op) => {
                    const hasPending =
                      pendingAfterSync.some(
                        (s) =>
                          s.product_id ===
                          op.id
                      );

                    if (hasPending) {
                      const local =
                        localMap.get(
                          op.id
                        );

                      if (local) {
                        return {
                          ...op,
                          stock:
                            local.stock,
                        };
                      }
                    }

                    return op;
                  }
                );
            } else {
              finalProducts =
                onlineProducts;
            }

            await cacheProducts(
              finalProducts
            );

            setProducts(
              finalProducts
            );

            setIsOnline(true);
            setConnectionState(
              "online"
            );
          }
        } catch (error) {
          console.error(
            "[BISO-COMMERCE] Chargement produits :",
            error
          );

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
              "[BISO-COMMERCE] Cache :",
              cacheError
            );
          }

          setConnectionState(
            typeof navigator !==
                "undefined" &&
              navigator.onLine
              ? "online"
              : "offline"
          );

          await refreshPendingSalesCount();
        }
      },
      [
        getUserId,
        refreshPendingSalesCount,
      ]
    );

  /* =======================================================
     PREMIER CHARGEMENT
  ======================================================= */

  useEffect(() => {
    const online =
      navigator.onLine;

    setIsOnline(online);

    setConnectionState(
      online
        ? "online"
        : "offline"
    );

    void loadProducts();
  }, [loadProducts]);
  /* =======================================================
     ONLINE / OFFLINE
  ======================================================= */

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setConnectionState("syncing");

      try {
        /*
         * Quand Internet revient :
         * 1. syncOfflineSales() sera appelé par loadProducts()
         * 2. les ventes seront envoyées vers Supabase
         * 3. le stock sera synchronisé
         * 4. les ventes complètement synchronisées seront supprimées
         *    d'IndexedDB
         * 5. les produits seront ensuite rechargés depuis Supabase
         */
        await loadProducts(false);

        setIsOnline(true);
        setConnectionState("online");
      } catch (error) {
        console.error(
          "[BISO-COMMERCE] Erreur au retour de connexion :",
          error
        );

        setIsOnline(
          typeof navigator !== "undefined"
            ? navigator.onLine
            : true
        );

        setConnectionState(
          typeof navigator !== "undefined" &&
            navigator.onLine
            ? "online"
            : "offline"
        );
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionState("offline");

      /*
       * On recharge immédiatement le cache local.
       * Ainsi, si l'utilisateur perd Internet,
       * il continue à voir les produits déjà enregistrés.
       */
      void (async () => {
        const userId = getUserId();

        if (!userId) {
          return;
        }

        try {
          const cached =
            await getLocalProducts(userId);

          setProducts(cached);
        } catch (error) {
          console.error(
            "[BISO-COMMERCE] Chargement cache après passage offline :",
            error
          );
        }
      })();
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

  /* =======================================================
     APRÈS SYNCHRONISATION
  ======================================================= */

  useEffect(() => {
    const handleOfflineSalesSynced =
      async () => {
        try {
          await refreshPendingSalesCount();

          const userId =
            getUserId();

          if (!userId) {
            return;
          }

          /*
           * Après une synchronisation réussie,
           * on recharge les produits serveur.
           *
           * Si certaines ventes restent en attente,
           * loadProducts() sait déjà préserver
           * le stock local correspondant.
           */
          if (
            typeof navigator !==
              "undefined" &&
            navigator.onLine
          ) {
            await loadProducts(true);
          } else {
            const cached =
              await getLocalProducts(
                userId
              );

            setProducts(cached);

            setIsOnline(false);
            setConnectionState(
              "offline"
            );
          }
        } catch (error) {
          console.error(
            "[BISO-COMMERCE] Actualisation après sync :",
            error
          );
        }
      };

    window.addEventListener(
      "biso-offline-sales-synced",
      handleOfflineSalesSynced
    );

    return () => {
      window.removeEventListener(
        "biso-offline-sales-synced",
        handleOfflineSalesSynced
      );
    };
  }, [
    getUserId,
    refreshPendingSalesCount,
    loadProducts,
  ]);

  /* =======================================================
     PRODUITS MIS À JOUR
  ======================================================= */

  useEffect(() => {
    const handleUpdated =
      async () => {
        const userId =
          getUserId();

        if (!userId) {
          return;
        }

        try {
          /*
           * Toujours privilégier IndexedDB ici.
           * C'est important pour que le stock diminué
           * hors connexion reste immédiatement visible.
           */
          const cached =
            await getLocalProducts(
              userId
            );

          setProducts(cached);

          await refreshPendingSalesCount();
        } catch (error) {
          console.error(
            "[BISO-COMMERCE] Actualisation locale :",
            error
          );
        }
      };

    window.addEventListener(
      "biso-products-updated",
      handleUpdated
    );

    window.addEventListener(
      "biso-sales-updated",
      handleUpdated
    );

    return () => {
      window.removeEventListener(
        "biso-products-updated",
        handleUpdated
      );

      window.removeEventListener(
        "biso-sales-updated",
        handleUpdated
      );
    };
  }, [
    getUserId,
    refreshPendingSalesCount,
  ]);

  /* =======================================================
     PRODUIT SÉLECTIONNÉ
  ======================================================= */

  const selectedProduct =
    products.find(
      (p) =>
        p.id === productId
    );

  const filteredProducts =
    products.filter((p) =>
      p.name
        .toLowerCase()
        .includes(
          searchTerm.toLowerCase()
        )
    );

  /* =======================================================
     QUANTITÉ
  ======================================================= */

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

  /* =======================================================
     CALCULS
  ======================================================= */

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

  /* =======================================================
     FOCUS QUANTITÉ
  ======================================================= */

  const handleQuantityFocus =
    () => {
      setTimeout(() => {
        quantityInputRef.current?.scrollIntoView(
          {
            behavior:
              "smooth",
            block:
              "center",
          }
        );
      }, 300);
    };

  /* =======================================================
     SCROLL RÉSUMÉ
  ======================================================= */

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
            block:
              "nearest",
          }
        );
      }, 100);
    }
  }, [
    selectedProduct,
    quantity,
  ]);

  /* =======================================================
     ENREGISTRER VENTE
  ======================================================= */

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
      !Number.isInteger(qty) ||
      qty <= 0
    ) {
      alert(
        "La quantité doit être un nombre entier supérieur à zéro."
      );

      return;
    }

    const currentStock =
      Number(
        selectedProduct.stock
      );

    if (
      qty >
      currentStock
    ) {
      alert(
        `Stock insuffisant!\nDisponible : ${currentStock}`
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
        (prixVente -
          prixAchat) *
        qty;

      const stockBefore =
        currentStock;

      const stockAfter =
        Math.max(
          0,
          stockBefore - qty
        );

      const saleId =
        typeof crypto !==
          "undefined" &&
        typeof crypto.randomUUID ===
          "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`;

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

          stock_before:
            stockBefore,

          stock_after:
            stockAfter,

          sale_synced:
            false,

          stock_synced:
            false,

          synced:
            false,
        };

      /* =====================================================
         MODE HORS CONNEXION
      ===================================================== */

      if (
        typeof navigator !==
          "undefined" &&
        !navigator.onLine
      ) {
        /*
         * saveOfflineSale() fait deux choses
         * dans UNE transaction IndexedDB :
         *
         * 1. enregistre la vente
         * 2. diminue le stock local
         */
        await saveOfflineSale(
          saleData
        );

        const updatedProduct: Product =
          {
            ...selectedProduct,
            stock:
              stockAfter,
            user_id:
              userId,
          };

        /*
         * On garde aussi le state React
         * synchronisé immédiatement.
         */
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

        /*
         * Prévenir le dashboard et les autres pages.
         */
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

        return;
      }

      /* =====================================================
         MODE EN LIGNE
      ===================================================== */

      setConnectionState(
        "syncing"
      );

      /*
       * On crée d'abord la vente.
       *
       * L'id est généré localement afin que,
       * si Internet tombe ensuite, la même vente
       * puisse être reprise sans doublon.
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

      /* =====================================================
         SI LA VENTE SERVEUR ÉCHOUE
         → FILE OFFLINE
      ===================================================== */

      if (saleError) {
        console.error(
          "[BISO-COMMERCE] Vente serveur refusée :",
          saleError
        );

        /*
         * La vente n'a pas pu être enregistrée sur Supabase.
         * On la conserve localement.
         */
        await saveOfflineSale(
          saleData
        );

        const updatedProduct: Product =
          {
            ...selectedProduct,
            stock:
              stockAfter,
            user_id:
              userId,
          };

        await saveLocalProduct(
          updatedProduct
        );

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

        setSuccessOffline(
          true
        );

        setShowSuccess(
          true
        );

        setConnectionState(
          navigator.onLine
            ? "syncing"
            : "offline"
        );

        setQuantity("");

        setProductId("");

        setSearchTerm("");

        await refreshPendingSalesCount();

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

        return;
      }

      /*
       * À partir d'ici, la vente existe bien
       * dans Supabase.
       */
      saleData.sale_synced =
        true;

      /* =====================================================
         METTRE À JOUR STOCK SERVEUR
      ===================================================== */

      const {
        data: updatedProducts,
        error: stockError,
      } = await supabase
        .from("products")
        .update({
          stock:
            stockAfter,
        })
        .eq(
          "id",
          selectedProduct.id
        )
        .eq(
          "user_id",
          userId
        )
        .eq(
          "stock",
          stockBefore
        )
        .select(
          "id, stock"
        );

      /* =====================================================
         STOCK NON SYNCHRONISÉ
      ===================================================== */

      if (stockError) {
        console.error(
          "[BISO-COMMERCE] Stock serveur non synchronisé :",
          stockError
        );

        /*
         * IMPORTANT :
         * La vente existe déjà sur Supabase.
         *
         * On NE remet donc PAS sale_synced à false.
         *
         * Au prochain passage online,
         * syncOneOfflineSale() vérifiera d'abord
         * si la vente existe déjà et ne la réinsérera pas.
         */
        await saveOfflineSale({
          ...saleData,
          sale_synced:
            true,
          stock_synced:
            false,
          synced:
            false,
        });

        const updatedProduct: Product =
          {
            ...selectedProduct,
            stock:
              stockAfter,
            user_id:
              userId,
          };

        await saveLocalProduct(
          updatedProduct
        );

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

        setSuccessOffline(
          true
        );

        setShowSuccess(
          true
        );

        setConnectionState(
          "syncing"
        );

        setQuantity("");

        setProductId("");

        setSearchTerm("");

        await refreshPendingSalesCount();

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

        return;
      }

      /* =====================================================
         AUCUNE LIGNE MODIFIÉE
      ===================================================== */

      if (
        !updatedProducts ||
        updatedProducts.length === 0
      ) {
        const {
          data:
            currentServerProduct,
          error:
            currentServerProductError,
        } = await supabase
          .from("products")
          .select(
            "id, stock"
          )
          .eq(
            "id",
            selectedProduct.id
          )
          .eq(
            "user_id",
            userId
          )
          .maybeSingle();

        if (
          currentServerProductError ||
          !currentServerProduct
        ) {
          /*
           * La vente existe déjà sur le serveur,
           * mais le stock n'est pas confirmé.
           */
          await saveOfflineSale({
            ...saleData,
            sale_synced:
              true,
            stock_synced:
              false,
            synced:
              false,
          });

          await saveLocalProduct({
            ...selectedProduct,
            stock:
              stockAfter,
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
                          stockAfter,
                      }
                    : product
              )
          );

          setSuccessOffline(
            true
          );

          setShowSuccess(
            true
          );

          setConnectionState(
            "syncing"
          );

          setQuantity("");

          setProductId("");

          setSearchTerm("");

          await refreshPendingSalesCount();

          return;
        }

        /*
         * Le stock serveur est déjà exactement
         * celui attendu.
         */
        if (
          Number(
            currentServerProduct.stock
          ) === stockAfter
        ) {
          saleData.stock_synced =
            true;

          saleData.synced =
            true;
        } else {
          /*
           * Le serveur possède une autre valeur.
           * On ne force surtout pas le stock :
           * on conserve la vente pour une synchronisation
           * contrôlée ultérieurement.
           */
          await saveOfflineSale({
            ...saleData,
            sale_synced:
              true,
            stock_synced:
              false,
            synced:
              false,
          });

          await saveLocalProduct({
            ...selectedProduct,
            stock:
              stockAfter,
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
                          stockAfter,
                      }
                    : product
              )
          );

          setSuccessOffline(
            true
          );

          setShowSuccess(
            true
          );

          setConnectionState(
            "syncing"
          );

          setQuantity("");

          setProductId("");

          setSearchTerm("");

          await refreshPendingSalesCount();

          return;
        }
      } else {
        const returnedStock =
          Number(
            updatedProducts[0]
              .stock
          );

        if (
          returnedStock ===
          stockAfter
        ) {
          saleData.stock_synced =
            true;

          saleData.synced =
            true;
        }
      }

      /* =====================================================
         TOUT EST SYNCHRONISÉ
      ===================================================== */

      if (
        saleData.sale_synced ===
          true &&
        saleData.stock_synced ===
          true
      ) {
        saleData.synced =
          true;

        await saveLocalProduct({
          ...selectedProduct,
          stock:
            stockAfter,
          user_id:
            userId,
        });

        /*
         * La vente est présente dans Supabase
         * ET le stock est confirmé.
         *
         * On peut donc supprimer la file locale.
         */
        await removeOfflineSale(
          saleData.id
        );

        setProducts(
          (current) =>
            current.map(
              (product) =>
                product.id ===
                selectedProduct.id
                  ? {
                      ...product,
                      stock:
                        stockAfter,
                    }
                  : product
            )
        );

        await refreshPendingSalesCount();

        setIsOnline(true);

        setConnectionState(
          "online"
        );

        setSuccessOffline(
          false
        );

        setShowSuccess(
          true
        );

        setQuantity("");

        setProductId("");

        setSearchTerm("");

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

        window.dispatchEvent(
          new CustomEvent(
            "biso-offline-sales-synced",
            {
              detail: {
                saleId:
                  saleData.id,
                remaining:
                  0,
              },
            }
          )
        );

        return;
      }

      /* =====================================================
         ENREGISTRER POUR SYNCHRONISATION FUTURE
      ===================================================== */

      await saveOfflineSale(
        saleData
      );

      await refreshPendingSalesCount();

      setConnectionState(
        "syncing"
      );

      setQuantity("");

      setProductId("");

      setSearchTerm("");
    } catch (error) {
      console.error(
        "[BISO-COMMERCE] Erreur vente :",
        error
      );

      /* =====================================================
         SECOURS OFFLINE
      ===================================================== */

      if (
        typeof navigator !==
          "undefined" &&
        !navigator.onLine
      ) {
        try {
          const qtyValue =
            Number(quantity);

          if (
            selectedProduct &&
            Number.isInteger(
              qtyValue
            ) &&
            qtyValue > 0 &&
            qtyValue <=
              Number(
                selectedProduct.stock
              )
          ) {
            const before =
              Number(
                selectedProduct.stock
              );

            const after =
              Math.max(
                0,
                before -
                  qtyValue
              );

            const prixVente =
              Number(
                selectedProduct.selling_price
              );

            const prixAchat =
              Number(
                selectedProduct.purchase_price
              );

            const offlineSale: OfflineSale =
              {
                id:
                  typeof crypto !==
                    "undefined" &&
                  typeof crypto.randomUUID ===
                    "function"
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2)}`,

                user_id:
                  userId,

                product_id:
                  selectedProduct.id,

                product_name:
                  selectedProduct.name,

                quantity:
                  qtyValue,

                purchase_price:
                  prixAchat,

                selling_price:
                  prixVente,

                total_sale:
                  prixVente *
                  qtyValue,

                profit:
                  (prixVente -
                    prixAchat) *
                  qtyValue,

                currency:
                  selectedProduct.currency,

                created_at:
                  new Date().toISOString(),

                stock_before:
                  before,

                stock_after:
                  after,

                sale_synced:
                  false,

                stock_synced:
                  false,

                synced:
                  false,
              };

            await saveOfflineSale(
              offlineSale
            );

            const updatedProduct: Product =
              {
                ...selectedProduct,
                stock:
                  after,
                user_id:
                  userId,
              };

            await saveLocalProduct(
              updatedProduct
            );

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

            return;
          }
        } catch (offlineError) {
          console.error(
            "[BISO-COMMERCE] Sauvegarde offline échouée :",
            offlineError
          );
        }
      }

      alert(
        "La vente n'a pas pu être enregistrée. Vérifiez votre connexion puis réessayez."
      );

      setConnectionState(
        typeof navigator !==
            "undefined" &&
          navigator.onLine
          ? "online"
          : "offline"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     INTERFACE
  ======================================================= */

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#f5f7fb] px-3 py-4 pb-32 text-slate-900 sm:px-6 sm:py-6">
      <div className="relative z-10 mx-auto w-full max-w-xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="mb-4 rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:mb-6 sm:p-6">
          <div className="flex items-start justify-between gap-3">

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:h-11 sm:w-11">
                  <ShoppingCart size={20} />
                </div>

                <h1 className="truncate text-xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  Caisse{" "}
                  <span className="text-indigo-600">
                    vente
                  </span>
                </h1>

              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500 sm:text-sm">
                Enregistrez vos ventes rapidement avec BISO-COMMERCE.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowGuide(
                  !showGuide
                )
              }
              className="flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-xs font-black text-indigo-600 shadow-sm transition active:scale-95 sm:px-4"
            >
              <Sparkles size={14} />

              <span>
                {showGuide
                  ? "Fermer"
                  : "Guide"}
              </span>
            </button>

          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">

            <div
              className={`inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 text-xs font-black ${
                isOnline
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-amber-100 bg-amber-50 text-amber-700"
              }`}
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
                className={`h-1.5 w-1.5 rounded-full ${
                  isOnline
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
              />
            </div>

            {connectionState ===
              "syncing" && (
              <div className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-xs font-black text-indigo-700">
                <Loader2
                  size={15}
                  className="animate-spin"
                />

                Synchronisation...
              </div>
            )}

            {pendingSalesCount >
              0 && (
              <div className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 text-xs font-black text-amber-700">
                <CloudOff size={15} />

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

        {/* =================================================
            GUIDE
        ================================================= */}

        {showGuide && (
          <section className="mb-4 overflow-hidden rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:mb-5 sm:p-5">

            <div className="mb-4 flex items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Sparkles size={19} />
              </div>

              <h2 className="text-sm font-black leading-5 text-slate-900 sm:text-base">
                Guide de vente BISO-COMMERCE
              </h2>

            </div>

            <div className="space-y-3 text-sm text-slate-600">

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="mb-2 text-sm font-black text-slate-900">
                  1️⃣ Rechercher un produit
                </h3>

                <p className="text-xs leading-6 sm:text-sm">
                  Cherchez le produit dans votre stock puis sélectionnez-le.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="mb-2 text-sm font-black text-slate-900">
                  2️⃣ Choisir la quantité
                </h3>

                <p className="text-xs leading-6 sm:text-sm">
                  Indiquez combien de produits vous vendez.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="mb-2 text-sm font-black text-slate-900">
                  3️⃣ Vérifier le résumé
                </h3>

                <ul className="space-y-2 text-xs leading-5">
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

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <h3 className="font-black text-indigo-700">
                  4️⃣ Valider la vente
                </h3>

                <p className="mt-1 text-xs leading-6 sm:text-sm">
                  Même sans Internet, la vente est enregistrée sur l'appareil et le stock est diminué immédiatement.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <h3 className="font-black text-emerald-700">
                  5️⃣ Synchronisation
                </h3>

                <p className="mt-1 text-xs leading-6 sm:text-sm">
                  Dès que la connexion revient, BISO-COMMERCE synchronise automatiquement les ventes.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowGuide(false)
                }
                className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-xs font-black text-white transition active:scale-[0.99] hover:bg-indigo-700"
              >
                Fermer le guide
              </button>

            </div>
          </section>
        )}

        {/* =================================================
            CAISSE
        ================================================= */}

        <section className="space-y-5 rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-6">

          {/* PRODUIT */}

          <div>

            <label className="mb-2 block text-xs font-black text-slate-500">
              Produit
            </label>

            <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-800 bg-black px-3 sm:px-4">

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
                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />

            </div>

            {searchTerm &&
              !productId && (
                <div className="mt-2 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-slate-800 bg-black shadow-xl">

                  {filteredProducts.length ===
                  0 ? (
                    <div className="p-5 text-center text-xs text-slate-400">
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
                          className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-white/10 px-3 py-3 text-left text-white transition active:bg-white/10 sm:px-4"
                        >

                          <div className="flex min-w-0 items-center gap-3">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                              <Package
                                size={17}
                              />
                            </div>

                            <span className="min-w-0 truncate text-sm font-semibold">
                              {p.name}
                            </span>

                          </div>

                          <span className="shrink-0 text-xs font-medium text-slate-400">
                            Stock :{" "}
                            {p.stock}
                          </span>

                        </button>
                      )
                    )
                  )}

                </div>
              )}

            {selectedProduct && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-3">

                <div className="flex min-w-0 items-center gap-2">

                  <CheckCircle
                    size={16}
                    className="shrink-0 text-indigo-600"
                  />

                  <span className="min-w-0 truncate text-xs font-black text-indigo-700">
                    {
                      selectedProduct.name
                    }
                  </span>

                </div>

                <span className="shrink-0 text-xs font-bold text-indigo-500">
                  {
                    selectedProduct.stock
                  }{" "}
                  en stock
                </span>

              </div>
            )}

          </div>

          {/* QUANTITÉ */}

          <div>

            <label className="mb-2 block text-xs font-black text-slate-500">
              Quantité vendue
            </label>

            <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 sm:grid-cols-[52px_minmax(0,1fr)_52px]">

              <button
                type="button"
                onClick={
                  decreaseQty
                }
                disabled={
                  !quantity ||
                  Number(
                    quantity
                  ) <= 1
                }
                aria-label="Diminuer la quantité"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus size={18} />
              </button>

              <input
                ref={
                  quantityInputRef
                }
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
                    e.target
                      .value;

                  if (
                    value === ""
                  ) {
                    setQuantity(
                      ""
                    );

                    return;
                  }

                  const numericValue =
                    Number(
                      value
                    );

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
                className="h-12 min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-center text-lg font-black text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />

              <button
                type="button"
                onClick={
                  increaseQty
                }
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
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={18} />
              </button>

            </div>

            {selectedProduct && (
              <p className="mt-2 text-center text-xs font-medium text-slate-400">
                Maximum disponible :{" "}
                {
                  selectedProduct.stock
                }
              </p>
            )}

          </div>

          {/* RÉSUMÉ */}

          {selectedProduct &&
            Number(quantity) >
              0 && (
              <div
                ref={summaryRef}
                className="scroll-mt-6 overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50 p-4 sm:p-5"
              >

                <div className="mb-4 flex items-center gap-2">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                    <ShoppingCart
                      size={18}
                    />
                  </div>

                  <p className="text-sm font-black text-indigo-800">
                    Résumé de la vente
                  </p>

                </div>

                <div className="flex items-start justify-between gap-3 border-b border-indigo-100 pb-3">

                  <span className="text-xs text-slate-500">
                    Produit
                  </span>

                  <span className="max-w-[65%] break-words text-right text-xs font-black text-slate-900">
                    {
                      selectedProduct.name
                    }
                  </span>

                </div>

                <div className="mt-3 flex items-center justify-between gap-3">

                  <span className="text-xs text-slate-500">
                    Quantité
                  </span>

                  <span className="text-xs font-black text-slate-900">
                    {quantity}
                  </span>

                </div>

                <div className="mt-3 flex items-center justify-between gap-3">

                  <span className="text-xs text-slate-500">
                    Prix unité
                  </span>

                  <span className="text-xs font-black text-slate-900">
                    {Number(
                      selectedProduct.selling_price
                    ).toLocaleString()}{" "}
                    {
                      selectedProduct.currency
                    }
                  </span>

                </div>

                <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">

                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Total client
                  </p>

                  <p className="mt-1 break-words text-2xl font-black text-indigo-600 sm:text-3xl">
                    {totalPreview.toLocaleString()}{" "}
                    {
                      selectedProduct.currency
                    }
                  </p>

                </div>

                <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/60 p-3 text-xs font-bold text-emerald-600">

                  <TrendingUp
                    size={16}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    Bénéfice estimé :{" "}
                    {profitPreview.toLocaleString()}{" "}
                    {
                      selectedProduct.currency
                    }
                  </span>

                </div>

                {stockAfterSale <=
                  5 && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs font-medium leading-5 text-amber-700">

                    <AlertTriangle
                      size={16}
                      className="mt-0.5 shrink-0"
                    />

                    <span>
                      Attention : stock restant{" "}
                      <strong>
                        {
                          stockAfterSale
                        }
                      </strong>
                    </span>

                  </div>
                )}

              </div>
            )}

          {/* BOUTON VENTE */}

          <button
            type="button"
            onClick={
              saveSale
            }
            disabled={
              loading ||
              !selectedProduct ||
              !quantity
            }
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-4 text-sm font-black text-white shadow-md shadow-indigo-600/10 transition active:scale-[0.99] hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
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
                <CheckCircle
                  size={20}
                />

                {isOnline
                  ? "Valider la vente"
                  : "Enregistrer la vente hors connexion"}
              </>
            )}

          </button>

        </section>

        {/* =================================================
            MODAL SUCCÈS
        ================================================= */}

        {showSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">

            <div className="w-full max-w-sm overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.18)]">

              <div
                className={`p-6 text-center ${
                  successOffline
                    ? "bg-amber-50"
                    : "bg-emerald-50"
                }`}
              >

                <div
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
                    successOffline
                      ? "bg-amber-100 text-amber-600"
                      : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  <CheckCircle
                    size={38}
                  />
                </div>

                <h2 className="mt-4 text-xl font-black text-slate-900 sm:text-2xl">
                  Vente enregistrée ✅
                </h2>

                <p className="mt-3 text-xs leading-6 text-slate-600 sm:text-sm">
                  {successOffline
                    ? "La vente a été enregistrée sur cet appareil. Le stock a été diminué immédiatement. Elle sera automatiquement synchronisée dès que la connexion Internet reviendra."
                    : "Votre vente a été enregistrée avec succès et le stock a été mis à jour."}
                </p>

                {successOffline && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-100 bg-white px-3 py-2.5 text-left">

                    <CloudOff
                      size={16}
                      className="shrink-0 text-amber-600"
                    />

                    <span className="text-xs font-bold leading-5 text-amber-700">
                      En attente de connexion pour synchronisation.
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
                  className="mt-6 flex min-h-11 w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-sm transition active:scale-[0.99] hover:bg-indigo-700"
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