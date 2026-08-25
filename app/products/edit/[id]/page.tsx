"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import { supabase } from "@/lib/supabase";

import {
  Package,
  Loader2,
  CheckCircle,
  Info,
  Sparkles,
  Boxes,
  CircleDollarSign,
  TrendingUp,
  AlertTriangle,
  RefreshCcw,
  Pencil,
  Plus,
  ArrowRight,
  PackagePlus,
  Calculator,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  X,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type Product = {
  id: string;
  user_id: string | null;
  name: string | null;
  unit: string | null;
  stock: number;
  initial_stock?: number | null;
  purchase_price: number;
  selling_price: number;
  currency: string;
  pieces_per_unit?: number | null;
  created_at?: string;
  synced?: boolean;
};

type SuccessMessage =
  | "offline"
  | "local"
  | "syncing"
  | "success"
  | "error"
  | null;

/* =========================================================
   INDEXED DB
========================================================= */

const DB_NAME = "biso-commerce-products";
const DB_VERSION = 12;

const PRODUCTS_STORE = "products";
const DELETE_QUEUE_STORE = "delete_queue";

let productsDBPromise:
  | Promise<IDBDatabase>
  | null = null;

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

  if (productsDBPromise) {
    return productsDBPromise;
  }

  productsDBPromise = new Promise<IDBDatabase>(
    (resolve, reject) => {
      const request = indexedDB.open(
        DB_NAME,
        DB_VERSION
      );

      request.onupgradeneeded = () => {
        const db = request.result;
        const transaction =
          request.transaction;

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
           STORE SUPPRESSION
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
          On garde cette connexion ouverte.
          On ne fait PAS db.close() après chaque transaction.
        */

        db.onversionchange = () => {
          db.close();
          productsDBPromise = null;
        };

        resolve(db);
      };

      request.onerror = () => {
        productsDBPromise = null;

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

  return productsDBPromise;
}

/* =========================================================
   NORMALISER PRODUIT
========================================================= */

function normalizeProduct(
  product: any
): Product {
  return {
    id: String(product?.id || ""),
    user_id:
      product?.user_id != null
        ? String(product.user_id)
        : null,

    name:
      product?.name != null
        ? String(product.name)
        : "",

    unit:
      product?.unit != null
        ? String(product.unit)
        : "Pièce",

    stock:
      Number(product?.stock) || 0,

    initial_stock:
      product?.initial_stock != null
        ? Number(product.initial_stock)
        : Number(product?.stock) || 0,

    purchase_price:
      Number(product?.purchase_price) || 0,

    selling_price:
      Number(product?.selling_price) || 0,

    currency:
      String(product?.currency || "FC"),

    pieces_per_unit:
      product?.pieces_per_unit != null
        ? Number(
            product.pieces_per_unit
          )
        : 1,

    created_at:
      product?.created_at ||
      undefined,

    synced:
      typeof product?.synced ===
      "boolean"
        ? product.synced
        : true,
  };
}

/* =========================================================
   USER ID LOCAL
========================================================= */

function getStoredUserId():
  string | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  const userId =
    localStorage.getItem(
      "user_id"
    );

  return userId
    ? String(userId)
    : null;
}

/* =========================================================
   RÉSOUDRE USER ID
========================================================= */

async function resolveUserId():
  Promise<string | null> {
  const saved =
    getStoredUserId();

  if (saved) {
    return saved;
  }

  if (
    typeof window !==
      "undefined" &&
    !navigator.onLine
  ) {
    return null;
  }

  const phone =
    typeof window !== "undefined"
      ? localStorage.getItem(
          "phone"
        )
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
      "Erreur résolution utilisateur :",
      error
    );

    return null;
  }
}

/* =========================================================
   LIRE PRODUIT LOCAL
========================================================= */

async function getLocalProduct(
  productId: string
): Promise<Product | null> {
  const db =
    await openProductsDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          PRODUCTS_STORE,
          "readonly"
        );

      const request =
        transaction
          .objectStore(
            PRODUCTS_STORE
          )
          .get(productId);

      request.onsuccess = () => {
        if (!request.result) {
          resolve(null);
          return;
        }

        resolve(
          normalizeProduct(
            request.result
          )
        );
      };

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Impossible de lire le produit localement."
            )
        );
      };
    }
  );
}

/* =========================================================
   SAUVEGARDER PRODUIT LOCAL
========================================================= */

async function saveProductLocal(
  product: Product
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
        .put(product);

      transaction.oncomplete =
        () =>
          resolve();

      transaction.onerror =
        () =>
          reject(
            transaction.error ||
              new Error(
                "Impossible d'enregistrer le produit localement."
              )
          );

      transaction.onabort =
        () =>
          reject(
            transaction.error ||
              new Error(
                "La sauvegarde locale a été interrompue."
              )
          );
    }
  );
}

/* =========================================================
   SUPPRIMER PRODUIT LOCAL
========================================================= */

async function removeProductLocal(
  productId: string
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
        .delete(productId);

      transaction.oncomplete =
        () =>
          resolve();

      transaction.onerror =
        () =>
          reject(
            transaction.error ||
              new Error(
                "Impossible de supprimer le produit localement."
              )
          );
    }
  );
}

/* =========================================================
   SYNCHRONISER UN PRODUIT
========================================================= */

async function syncProductToSupabase(
  product: Product
): Promise<Product> {
  const userId =
    product.user_id ||
    (await resolveUserId());

  if (!userId) {
    throw new Error(
      "Utilisateur non identifié."
    );
  }

  const productData = {
    id: product.id,

    user_id: userId,

    name:
      product.name ||
      "Produit",

    unit:
      product.unit ||
      "Pièce",

    stock:
      Number(product.stock) || 0,

    initial_stock:
      Number(
        product.initial_stock ??
          product.stock ??
          0
      ),

    purchase_price:
      Number(
        product.purchase_price
      ) || 0,

    selling_price:
      Number(
        product.selling_price
      ) || 0,

    currency:
      product.currency ||
      "FC",

    pieces_per_unit:
      Number(
        product.pieces_per_unit ||
          1
      ),

    created_at:
      product.created_at ||
      new Date().toISOString(),
  };

  const {
    data,
    error,
  } = await supabase
    .from("products")
    .upsert(
      productData,
      {
        onConflict:
          "id",
      }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const synchronized =
    normalizeProduct({
      ...data,
      synced: true,
    });

  await saveProductLocal(
    synchronized
  );

  window.dispatchEvent(
    new CustomEvent(
      "biso-products-updated",
      {
        detail: {
          product:
            synchronized,
          source:
            "edit-product-sync",
        },
      }
    )
  );

  return synchronized;
}

/* =========================================================
   SYNCHRONISER LES PRODUITS EN ATTENTE
========================================================= */

async function syncPendingProducts():
  Promise<void> {
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

  const db =
    await openProductsDB();

  const allProducts =
    await new Promise<any[]>(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            PRODUCTS_STORE,
            "readonly"
          );

        const request =
          transaction
            .objectStore(
              PRODUCTS_STORE
            )
            .getAll();

        request.onsuccess =
          () =>
            resolve(
              request.result || []
            );

        request.onerror =
          () =>
            reject(
              request.error
            );
      }
    );

  const pending =
    allProducts
      .map(
        normalizeProduct
      )
      .filter(
        (product) =>
          product.synced ===
            false &&
          String(
            product.user_id ||
              userId
          ) ===
            String(userId)
      );

  for (
    const product of pending
  ) {
    try {
      await syncProductToSupabase(
        product
      );
    } catch (error) {
      console.error(
        "Erreur synchronisation produit :",
        error
      );
    }
  }
}

/* =========================================================
   CHARGER DEPUIS SUPABASE
========================================================= */

async function fetchProductFromSupabase(
  productId: string,
  userId: string
): Promise<Product | null> {
  const {
    data,
    error,
  } = await supabase
    .from("products")
    .select("*")
    .eq(
      "id",
      productId
    )
    .eq(
      "user_id",
      userId
    )
    .single();

  if (
    error ||
    !data
  ) {
    return null;
  }

  return normalizeProduct({
    ...data,
    synced: true,
  });
}

/* =========================================================
   PAGE
========================================================= */

export default function EditProductPage() {
  const params =
    useParams();

  const router =
    useRouter();

  const productId =
    String(params.id);

  /* =======================================================
     ÉTATS
  ======================================================= */

  const [loadingProduct, setLoadingProduct] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [loadingRestock, setLoadingRestock] =
    useState(false);

  const [product, setProduct] =
    useState<Product | null>(
      null
    );

  const [mode, setMode] =
    useState<
      "edit" | "restock"
    >("edit");

  /* =======================================================
     FORMULAIRE MODIFICATION
  ======================================================= */

  const [name, setName] =
    useState("");

  const [type, setType] =
    useState("Pièce");

  const [quantity, setQuantity] =
    useState("");

  const [piecesPerUnit, setPiecesPerUnit] =
    useState("1");

  const [buyPrice, setBuyPrice] =
    useState("");

  const [sellPrice, setSellPrice] =
    useState("");

  const [currency, setCurrency] =
    useState("FC");

  /* =======================================================
     RÉAPPROVISIONNEMENT
  ======================================================= */

  const [restockQuantity, setRestockQuantity] =
    useState("");

  const [restockPiecesPerUnit, setRestockPiecesPerUnit] =
    useState("1");

  const [restockBuyPrice, setRestockBuyPrice] =
    useState("");

  const [showGuide, setShowGuide] =
    useState(false);

  /* =======================================================
     CONNEXION
  ======================================================= */

  const [isOnline, setIsOnline] =
    useState(true);

  const [syncing, setSyncing] =
    useState(false);

  /* =======================================================
     MESSAGE
  ======================================================= */

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<SuccessMessage>(
      null
    );

  const [
    showSuccessModal,
    setShowSuccessModal,
  ] =
    useState(false);

  /* =======================================================
     INITIALISATION INTERNET
  ======================================================= */

  useEffect(() => {
    if (
      typeof window === "undefined"
    ) {
      return;
    }

    setIsOnline(
      navigator.onLine
    );

    const handleOnline =
      async () => {
        setIsOnline(true);
        setSyncing(true);

        try {
          await syncPendingProducts();

          if (
            productId
          ) {
            const userId =
              await resolveUserId();

            if (
              userId
            ) {
              const fresh =
                await fetchProductFromSupabase(
                  productId,
                  userId
                );

              if (
                fresh
              ) {
                setProduct(
                  fresh
                );
              }
            }
          }

          window.dispatchEvent(
            new CustomEvent(
              "biso-products-updated"
            )
          );
        } catch (error) {
          console.error(
            "Erreur synchronisation au retour Internet :",
            error
          );
        } finally {
          setSyncing(false);
        }
      };

    const handleOffline =
      () => {
        setIsOnline(false);
      };

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    if (
      navigator.onLine
    ) {
      void syncPendingProducts();
    }

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
  }, [productId]);

  /* =======================================================
     CHARGER PRODUIT
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadProduct =
      async () => {
        try {
          setLoadingProduct(
            true
          );

          /*
            --------------------------------------------------
            1. CHARGEMENT LOCAL EN PREMIER
            --------------------------------------------------
          */

          let localProduct:
            | Product
            | null =
            null;

          try {
            localProduct =
              await getLocalProduct(
                productId
              );
          } catch (error) {
            console.error(
              "Erreur lecture produit local :",
              error
            );
          }

          if (
            localProduct &&
            !cancelled
          ) {
            setProduct(
              localProduct
            );

            setName(
              localProduct.name ||
                ""
            );

            const loadedType =
              localProduct.unit ||
              "Pièce";

            setType(
              loadedType
            );

            setCurrency(
              localProduct.currency ||
                "FC"
            );

            setSellPrice(
              String(
                Number(
                  localProduct.selling_price ||
                    0
                )
              )
            );

            const savedPiecesPerUnit =
              Number(
                localProduct.pieces_per_unit ||
                  1
              );

            const normalizedPieces =
              savedPiecesPerUnit >
              0
                ? savedPiecesPerUnit
                : 1;

            setPiecesPerUnit(
              String(
                normalizedPieces
              )
            );

            setRestockPiecesPerUnit(
              String(
                normalizedPieces
              )
            );

            const currentStock =
              Number(
                localProduct.stock ||
                  0
              );

            const currentUnitCost =
              Number(
                localProduct.purchase_price ||
                  0
              );

            if (
              loadedType ===
              "Pièce"
            ) {
              setQuantity(
                String(
                  currentStock
                )
              );
            } else {
              const displayedQuantity =
                normalizedPieces >
                0
                  ? currentStock /
                    normalizedPieces
                  : currentStock;

              setQuantity(
                String(
                  Number(
                    displayedQuantity.toFixed(
                      2
                    )
                  )
                )
              );
            }

            const currentTotalPurchase =
              currentUnitCost *
              currentStock;

            setBuyPrice(
              String(
                Number(
                  currentTotalPurchase.toFixed(
                    2
                  )
                )
              )
            );
          }

          /*
            --------------------------------------------------
            2. SI INTERNET : SYNCHRO + SERVEUR
            --------------------------------------------------
          */

          if (
            navigator.onLine
          ) {
            const userId =
              await resolveUserId();

            if (
              userId
            ) {
              await syncPendingProducts();

              const serverProduct =
                await fetchProductFromSupabase(
                  productId,
                  userId
                );

              /*
                On remplace le cache seulement
                lorsqu'un produit serveur est trouvé.
              */

              if (
                serverProduct &&
                !cancelled
              ) {
                await saveProductLocal(
                  serverProduct
                );

                setProduct(
                  serverProduct
                );

                setName(
                  serverProduct.name ||
                    ""
                );

                const loadedType =
                  serverProduct.unit ||
                  "Pièce";

                setType(
                  loadedType
                );

                setCurrency(
                  serverProduct.currency ||
                    "FC"
                );

                setSellPrice(
                  String(
                    Number(
                      serverProduct.selling_price ||
                        0
                    )
                  )
                );

                const savedPiecesPerUnit =
                  Number(
                    serverProduct.pieces_per_unit ||
                      1
                  );

                const normalizedPieces =
                  savedPiecesPerUnit >
                  0
                    ? savedPiecesPerUnit
                    : 1;

                setPiecesPerUnit(
                  String(
                    normalizedPieces
                  )
                );

                setRestockPiecesPerUnit(
                  String(
                    normalizedPieces
                  )
                );

                const currentStock =
                  Number(
                    serverProduct.stock ||
                      0
                  );

                const currentUnitCost =
                  Number(
                    serverProduct.purchase_price ||
                      0
                  );

                if (
                  loadedType ===
                  "Pièce"
                ) {
                  setQuantity(
                    String(
                      currentStock
                    )
                  );
                } else {
                  const displayedQuantity =
                    normalizedPieces >
                    0
                      ? currentStock /
                        normalizedPieces
                      : currentStock;

                  setQuantity(
                    String(
                      Number(
                        displayedQuantity.toFixed(
                          2
                        )
                      )
                    )
                  );
                }

                const currentTotalPurchase =
                  currentUnitCost *
                  currentStock;

                setBuyPrice(
                  String(
                    Number(
                      currentTotalPurchase.toFixed(
                        2
                      )
                    )
                  )
                );
              }
            }
          }

          /*
            --------------------------------------------------
            3. AUCUN PRODUIT
            --------------------------------------------------
          */

          if (
            !localProduct &&
            navigator.onLine
          ) {
            const userId =
              await resolveUserId();

            if (
              userId
            ) {
              const serverProduct =
                await fetchProductFromSupabase(
                  productId,
                  userId
                );

              if (
                !serverProduct
              ) {
                if (
                  !cancelled
                ) {
                  setProduct(
                    null
                  );
                }

                return;
              }
            }
          }
        } catch (error) {
          console.error(
            "Erreur chargement produit :",
            error
          );
        } finally {
          if (
            !cancelled
          ) {
            setLoadingProduct(
              false
            );
          }
        }
      };

    if (
      productId
    ) {
      void loadProduct();
    }

    return () => {
      cancelled = true;
    };
  }, [productId]);

  /* =======================================================
     CALCULS
  ======================================================= */

  const totalPieces =
    useMemo(() => {
      const q =
        Number(
          quantity || 0
        );

      if (
        type === "Pièce"
      ) {
        return q;
      }

      const pieces =
        Number(
          piecesPerUnit ||
            1
        );

      return (
        q * pieces
      );
    }, [
      quantity,
      piecesPerUnit,
      type,
    ]);

  const pricePerPiece =
    useMemo(() => {
      const total =
        Number(
          buyPrice || 0
        );

      if (
        totalPieces <=
        0
      ) {
        return 0;
      }

      return (
        total /
        totalPieces
      );
    }, [
      buyPrice,
      totalPieces,
    ]);

  const profitPerPiece =
    useMemo(() => {
      return (
        Number(
          sellPrice || 0
        ) -
        pricePerPiece
      );
    }, [
      sellPrice,
      pricePerPiece,
    ]);

  const totalProfit =
    useMemo(() => {
      return (
        profitPerPiece *
        totalPieces
      );
    }, [
      profitPerPiece,
      totalPieces,
    ]);

  const currentStock =
    Number(
      product?.stock || 0
    );

  const restockPieces =
    useMemo(() => {
      const q =
        Number(
          restockQuantity ||
            0
        );

      if (
        product?.unit ===
        "Pièce"
      ) {
        return q;
      }

      const pieces =
        Number(
          restockPiecesPerUnit ||
            1
        );

      return (
        q * pieces
      );
    }, [
      restockQuantity,
      restockPiecesPerUnit,
      product,
    ]);

  const newStockAfterRestock =
    useMemo(() => {
      return (
        currentStock +
        restockPieces
      );
    }, [
      currentStock,
      restockPieces,
    ]);

  const restockUnitCost =
    useMemo(() => {
      const total =
        Number(
          restockBuyPrice ||
            0
        );

      if (
        restockPieces <=
        0
      ) {
        return 0;
      }

      return (
        total /
        restockPieces
      );
    }, [
      restockBuyPrice,
      restockPieces,
    ]);

  const newAverageCost =
    useMemo(() => {
      const oldCost =
        Number(
          product?.purchase_price ||
            0
        );

      const oldValue =
        currentStock *
        oldCost;

      const newValue =
        restockPieces *
        restockUnitCost;

      if (
        newStockAfterRestock <=
        0
      ) {
        return 0;
      }

      return (
        (oldValue +
          newValue) /
        newStockAfterRestock
      );
    }, [
      product,
      currentStock,
      restockPieces,
      restockUnitCost,
      newStockAfterRestock,
    ]);

  /* =======================================================
     CRÉER PRODUIT LOCAL MODIFIÉ
  ======================================================= */

  const buildUpdatedProduct =
    (
      updatedData: Partial<Product>
    ): Product => {
      return normalizeProduct({
        ...(product || {}),
        ...updatedData,
        id:
          product?.id ||
          productId,
        user_id:
          product?.user_id ||
          getStoredUserId(),
        created_at:
          product?.created_at ||
          new Date().toISOString(),
        synced: false,
      });
    };

  /* =======================================================
     MODIFIER
  ======================================================= */

  const updateProduct =
    async () => {
      if (!product) {
        return;
      }

      setSuccessMessage(
        null
      );

      if (
        !name.trim()
      ) {
        alert(
          "Veuillez entrer le nom du produit."
        );
        return;
      }

      if (
        quantity === ""
      ) {
        alert(
          "Veuillez entrer la quantité."
        );
        return;
      }

      if (
        Number(quantity) < 0
      ) {
        alert(
          "La quantité ne peut pas être négative."
        );
        return;
      }

      const nPieces =
        type !==
        "Pièce"
          ? Number(
              piecesPerUnit ||
                0
            )
          : 1;

      if (
        nPieces <=
        0
      ) {
        alert(
          "Le nombre de pièces dans l'unité doit être supérieur à 0."
        );
        return;
      }

      if (
        Number(
          buyPrice || 0
        ) < 0
      ) {
        alert(
          "Le prix d'achat ne peut pas être négatif."
        );
        return;
      }

      if (
        Number(
          sellPrice || 0
        ) < 0
      ) {
        alert(
          "Le prix de vente ne peut pas être négatif."
        );
        return;
      }

      if (
        totalPieces <
        0
      ) {
        alert(
          "Le stock réel ne peut pas être négatif."
        );
        return;
      }

      const confirmed =
        window.confirm(
          "Voulez-vous vraiment modifier ce produit ?\n\nCette opération remplacera le stock actuel par la nouvelle quantité indiquée."
        );

      if (!confirmed) {
        return;
      }

      const userId =
        await resolveUserId();

      if (
        !userId &&
        navigator.onLine
      ) {
        alert(
          "Utilisateur non connecté."
        );
        return;
      }

      setLoading(true);

      try {
        let unitCost =
          0;

        if (
          totalPieces >
          0
        ) {
          unitCost =
            Number(
              buyPrice || 0
            ) /
            totalPieces;
        } else {
          unitCost =
            Number(
              product.purchase_price ||
                0
            );
        }

        const updatedData =
          {
            name:
              name.trim(),

            unit:
              type,

            stock:
              totalPieces,

            initial_stock:
              Number(
                product.initial_stock ??
                  product.stock ??
                  totalPieces
              ),

            purchase_price:
              unitCost,

            selling_price:
              Number(
                sellPrice || 0
              ),

            currency:
              currency,

            pieces_per_unit:
              nPieces,
          };

        /*
          ----------------------------------------------
          TOUJOURS SAUVER LOCALEMENT D'ABORD
          ----------------------------------------------
        */

        const localUpdated =
          buildUpdatedProduct(
            updatedData
          );

        await saveProductLocal(
          localUpdated
        );

        setProduct(
          localUpdated
        );

        window.dispatchEvent(
          new CustomEvent(
            "biso-products-updated",
            {
              detail: {
                product:
                  localUpdated,
                source:
                  "edit-product",
              },
            }
          )
        );

        /*
          ----------------------------------------------
          MESSAGE
          ----------------------------------------------
        */

        if (
          !navigator.onLine
        ) {
          setSuccessMessage(
            "offline"
          );
        } else if (
          !userId
        ) {
          setSuccessMessage(
            "local"
          );
        } else {
          setSuccessMessage(
            "syncing"
          );
        }

        setShowSuccessModal(
          true
        );

        /*
          ----------------------------------------------
          SYNCHRONISATION ONLINE
          ----------------------------------------------
        */

        if (
          navigator.onLine &&
          userId
        ) {
          try {
            const synced =
              await syncProductToSupabase(
                localUpdated
              );

            setProduct(
              synced
            );

            setSuccessMessage(
              "success"
            );
          } catch (syncError) {
            console.error(
              "Erreur synchronisation modification :",
              syncError
            );

            /*
              Le produit reste local
              avec synced=false.
            */

            setSuccessMessage(
              "syncing"
            );
          }
        }

        /*
          On garde la page ouverte.
        */
      } catch (error) {
        console.error(
          "Erreur modification :",
          error
        );

        setSuccessMessage(
          "error"
        );

        setShowSuccessModal(
          true
        );
      } finally {
        setLoading(false);
      }
    };

  /* =======================================================
     RÉAPPROVISIONNER
  ======================================================= */

  const restockProduct =
    async () => {
      if (!product) {
        return;
      }

      setSuccessMessage(
        null
      );

      if (
        restockQuantity ===
          "" ||
        Number(
          restockQuantity
        ) <= 0
      ) {
        alert(
          "Veuillez entrer une quantité à ajouter supérieure à 0."
        );
        return;
      }

      if (
        product.unit !==
          "Pièce" &&
        Number(
          restockPiecesPerUnit ||
            0
        ) <= 0
      ) {
        alert(
          `Le nombre de pièces dans ${
            product.unit ||
            "l'unité"
          } doit être supérieur à 0.`
        );
        return;
      }

      if (
        Number(
          restockBuyPrice ||
            0
        ) < 0
      ) {
        alert(
          "Le prix d'achat du nouvel arrivage ne peut pas être négatif."
        );
        return;
      }

      if (
        restockPieces <=
        0
      ) {
        alert(
          "La quantité reçue doit être supérieure à 0."
        );
        return;
      }

      const confirmed =
        window.confirm(
          "Voulez-vous vraiment réapprovisionner ce produit ?\n\n" +
            `Stock actuel : ${currentStock} pièce(s)\n` +
            `Nouvel arrivage : ${restockPieces} pièce(s)\n` +
            `Nouveau stock : ${newStockAfterRestock} pièce(s)\n\n` +
            "L'ancien stock ne sera pas remplacé. La nouvelle quantité sera ajoutée."
        );

      if (!confirmed) {
        return;
      }

      const userId =
        await resolveUserId();

      if (
        !userId &&
        navigator.onLine
      ) {
        alert(
          "Utilisateur non connecté."
        );
        return;
      }

      setLoadingRestock(
        true
      );

      try {
        const oldStock =
          Number(
            product.stock ||
              0
          );

        const oldUnitCost =
          Number(
            product.purchase_price ||
              0
          );

        const incomingTotal =
          Number(
            restockBuyPrice ||
              0
          );

        const incomingUnitCost =
          restockPieces >
          0
            ? incomingTotal /
              restockPieces
            : 0;

        const oldStockValue =
          oldStock *
          oldUnitCost;

        const incomingStockValue =
          restockPieces *
          incomingUnitCost;

        const totalStockValue =
          oldStockValue +
          incomingStockValue;

        const averageCost =
          newStockAfterRestock >
          0
            ? totalStockValue /
              newStockAfterRestock
            : 0;

        const updatedData =
          {
            stock:
              newStockAfterRestock,

            purchase_price:
              averageCost,

            pieces_per_unit:
              product.unit !==
              "Pièce"
                ? Number(
                    restockPiecesPerUnit ||
                      1
                  )
                : 1,
          };

        /*
          ----------------------------------------------
          SAUVEGARDE LOCALE D'ABORD
          ----------------------------------------------
        */

        const localUpdated =
          buildUpdatedProduct(
            updatedData
          );

        await saveProductLocal(
          localUpdated
        );

        setProduct(
          localUpdated
        );

        window.dispatchEvent(
          new CustomEvent(
            "biso-products-updated",
            {
              detail: {
                product:
                  localUpdated,
                source:
                  "restock-product",
              },
            }
          )
        );

        /*
          ----------------------------------------------
          MESSAGE
          ----------------------------------------------
        */

        if (
          !navigator.onLine
        ) {
          setSuccessMessage(
            "offline"
          );
        } else if (
          !userId
        ) {
          setSuccessMessage(
            "local"
          );
        } else {
          setSuccessMessage(
            "syncing"
          );
        }

        setShowSuccessModal(
          true
        );

        /*
          ----------------------------------------------
          SYNCHRONISATION
          ----------------------------------------------
        */

        if (
          navigator.onLine &&
          userId
        ) {
          try {
            const synced =
              await syncProductToSupabase(
                localUpdated
              );

            setProduct(
              synced
            );

            setSuccessMessage(
              "success"
            );
          } catch (syncError) {
            console.error(
              "Erreur synchronisation réapprovisionnement :",
              syncError
            );

            setSuccessMessage(
              "syncing"
            );
          }
        }

        /*
          Réinitialiser le formulaire
          du réapprovisionnement.
        */

        setRestockQuantity(
          ""
        );

        setRestockBuyPrice(
          ""
        );
      } catch (error) {
        console.error(
          "Erreur réapprovisionnement :",
          error
        );

        setSuccessMessage(
          "error"
        );

        setShowSuccessModal(
          true
        );
      } finally {
        setLoadingRestock(
          false
        );
      }
    };

  /* =======================================================
     MODAL SUCCÈS
  ======================================================= */

  const closeSuccessModal =
    () => {
      setShowSuccessModal(
        false
      );
    };

  const goToProducts =
    () => {
      setShowSuccessModal(
        false
      );

      router.push(
        "/products"
      );
    };

  /* =======================================================
     CHARGEMENT
  ======================================================= */

  if (
    loadingProduct
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">

        <div className="flex w-full max-w-sm items-center justify-center gap-3 rounded-[24px] bg-white px-5 py-5 text-sm font-semibold text-slate-600 shadow-sm">

          <Loader2
            size={21}
            className="shrink-0 animate-spin text-indigo-600"
          />

          <span>
            Chargement du produit...
          </span>

        </div>
      </div>
    );
  }

  if (
    !product
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">

        <div className="w-full max-w-md rounded-[26px] bg-white p-6 text-center shadow-sm sm:p-8">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">

            <AlertTriangle
              size={28}
            />

          </div>

          <p className="mt-4 text-xl font-black text-slate-900">
            Produit introuvable
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Le produit demandé n'existe pas ou
            n'est plus disponible sur cet appareil.
          </p>

          <button
            onClick={() =>
              router.push(
                "/products"
              )
            }
            className="mt-6 w-full rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
          >
            Retour aux produits
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     JSX
  ======================================================= */

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f7fb] text-slate-900">

      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-5 lg:px-8">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="mb-5">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 sm:h-12 sm:w-12">

                <Package
                  size={22}
                />

              </div>

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">

                  <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    Gestion du produit
                  </h1>

                  <div
                    className={`
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-xl
                      px-2.5
                      py-1.5
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
                          size={12}
                          className="animate-spin"
                        />
                        Synchronisation
                      </>
                    ) : isOnline ? (
                      <>
                        <Cloud
                          size={12}
                        />
                        En ligne
                      </>
                    ) : (
                      <>
                        <CloudOff
                          size={12}
                        />
                        Hors connexion
                      </>
                    )}
                  </div>

                </div>

                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  Modifier ou ajouter du stock
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/products"
                )
              }
              disabled={
                loading ||
                loadingRestock
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto sm:px-5"
            >
              Retour aux produits
            </button>

          </div>

          {!isOnline && (
            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3.5">

              <WifiOff
                size={18}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>

                <p className="text-xs font-black text-amber-800">
                  Mode hors connexion
                </p>

                <p className="mt-1 text-[11px] leading-5 text-amber-700">
                  Vous pouvez modifier le produit et
                  réapprovisionner le stock normalement.
                  Les changements resteront enregistrés
                  sur cet appareil puis seront synchronisés
                  automatiquement lorsque Internet reviendra.
                </p>

              </div>

            </div>
          )}

        </div>

        {/* ======================================================
            PRODUIT ACTUEL
        ====================================================== */}

        <div className="mb-5 rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm sm:mb-6 sm:rounded-[26px] sm:p-6">

          <div className="flex items-start gap-3 sm:gap-5">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 sm:h-14 sm:w-14">

              <Package
                size={24}
              />

            </div>

            <div className="min-w-0 flex-1">

              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-xs">
                Produit sélectionné
              </p>

              <h2 className="mt-0.5 truncate text-lg font-black text-slate-900 sm:text-xl">
                {product.name ||
                  "Produit sans nom"}
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-4 sm:gap-3">

                <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">

                  <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                    Unité
                  </p>

                  <p className="mt-1 truncate text-sm font-black text-slate-900 sm:text-base">
                    {product.unit ||
                      "Pièce"}
                  </p>

                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">

                  <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                    Stock réel
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-900 sm:text-base">
                    {currentStock}
                  </p>

                  <p className="text-[10px] text-slate-400 sm:text-[11px]">
                    pièces
                  </p>

                </div>

                <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">

                  <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                    Coût / pièce
                  </p>

                  <p className="mt-1 truncate text-sm font-black text-slate-900 sm:text-base">
                    {Math.round(
                      Number(
                        product.purchase_price ||
                          0
                      )
                    )}{" "}
                    {product.currency}
                  </p>

                </div>

                <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">

                  <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                    Vente / pièce
                  </p>

                  <p className="mt-1 truncate text-sm font-black text-slate-900 sm:text-base">
                    {Math.round(
                      Number(
                        product.selling_price ||
                          0
                      )
                    )}{" "}
                    {product.currency}
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* ======================================================
            GUIDE
        ====================================================== */}

        <div className="mb-5 rounded-[24px] border border-slate-100 bg-white shadow-sm sm:mb-6 sm:rounded-[26px]">

          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">

                <Info
                  size={19}
                />

              </div>

              <div className="min-w-0">

                <h2 className="truncate font-black text-slate-900">
                  Guide de gestion du stock
                </h2>

                <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                  Comprendre les deux opérations
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowGuide(
                  !showGuide
                )
              }
              className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-black text-white shadow-sm transition hover:bg-indigo-700 sm:w-auto"
            >
              {showGuide
                ? "Fermer le guide"
                : "Voir le guide"}
            </button>

          </div>

          {showGuide && (
            <div className="border-t border-slate-100 p-4 sm:p-6">

              <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5">

                  <div className="flex gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">

                      <Pencil
                        size={18}
                      />

                    </div>

                    <div className="min-w-0">

                      <h3 className="font-black text-slate-900">
                        Modifier le produit
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                        Utilisez cette option pour
                        corriger le nom, l'unité, les
                        prix ou remplacer volontairement
                        la quantité du stock.
                      </p>

                      <p className="mt-2 text-xs font-bold text-indigo-600">
                        La quantité devient le nouveau
                        stock.
                      </p>

                    </div>

                  </div>

                </div>

                <div className="rounded-2xl border border-green-100 bg-green-50/60 p-4 sm:p-5">

                  <div className="flex gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600">

                      <RefreshCcw
                        size={18}
                      />

                    </div>

                    <div className="min-w-0">

                      <h3 className="font-black text-slate-900">
                        Réapprovisionner
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                        Utilisez cette option lorsque
                        vous recevez une nouvelle
                        marchandise.
                      </p>

                      <p className="mt-2 text-xs font-bold text-green-600">
                        La nouvelle quantité est ajoutée
                        au stock existant.
                      </p>

                    </div>

                  </div>

                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5">

                  <div className="flex gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">

                      <Boxes
                        size={18}
                      />

                    </div>

                    <div className="min-w-0">

                      <h3 className="font-black text-slate-900">
                        Exemple avec des cartons
                      </h3>

                      <div className="mt-3 space-y-2 text-xs text-slate-600 sm:text-sm">

                        <p>
                          Stock actuel :
                          <strong className="text-slate-900">
                            {" "}5 cartons
                          </strong>
                        </p>

                        <p>
                          1 carton =
                          <strong className="text-slate-900">
                            {" "}24 pièces
                          </strong>
                        </p>

                        <p>
                          Nouvel arrivage :
                          <strong className="text-slate-900">
                            {" "}10 cartons
                          </strong>
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-white p-3">

                          <span className="font-black text-slate-900">
                            5 cartons
                          </span>

                          <Plus
                            size={14}
                            className="text-green-600"
                          />

                          <span className="font-black text-slate-900">
                            10 cartons
                          </span>

                          <ArrowRight
                            size={14}
                            className="text-indigo-600"
                          />

                          <span className="font-black text-green-600">
                            15 cartons
                          </span>

                        </div>

                        <p>
                          Stock réel :
                          <strong className="text-green-600">
                            {" "}15 × 24 = 360 pièces
                          </strong>
                        </p>

                      </div>

                    </div>

                  </div>

                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5">

                  <div className="flex gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">

                      <CircleDollarSign
                        size={18}
                      />

                    </div>

                    <div className="min-w-0">

                      <h3 className="font-black text-slate-900">
                        Prix du nouvel arrivage
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                        Indiquez le prix total payé pour
                        la nouvelle marchandise.
                        L'application calcule automatiquement
                        le coût moyen du stock.
                      </p>

                    </div>

                  </div>

                </div>

              </div>

              <div className="mt-3 rounded-2xl border border-green-100 bg-green-50 p-4 sm:mt-4">

                <div className="flex gap-3">

                  <CheckCircle
                    size={19}
                    className="mt-0.5 shrink-0 text-green-600"
                  />

                  <div>

                    <p className="font-black text-slate-900">
                      Produit sans stock
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                      Un produit peut avoir un stock de
                      0. Vous pourrez ensuite le
                      réapprovisionner normalement.
                    </p>

                  </div>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowGuide(false)
                }
                className="mt-4 w-full rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
              >
                ✓ J'ai compris
              </button>

            </div>
          )}

        </div>

        {/* ======================================================
            CHOIX DU MODE
        ====================================================== */}

        <div className="mb-5 rounded-[24px] border border-slate-100 bg-white p-2.5 shadow-sm sm:mb-6 sm:rounded-[26px] sm:p-3">

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">

            <button
              type="button"
              onClick={() =>
                setMode("edit")
              }
              className={`min-w-0 rounded-2xl border p-3 text-left transition sm:p-4 ${
                mode ===
                "edit"
                  ? "border-indigo-200 bg-indigo-50"
                  : "border-transparent bg-slate-50 hover:bg-slate-100"
              }`}
            >

              <div className="flex items-center gap-2.5 sm:gap-3">

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    mode ===
                    "edit"
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-white text-slate-500"
                  }`}
                >
                  <Pencil
                    size={18}
                  />
                </div>

                <div className="min-w-0">

                  <p className="truncate text-sm font-black text-slate-900 sm:text-base">
                    Modifier
                  </p>

                  <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
                    Corriger le produit
                  </p>

                </div>

              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setMode(
                  "restock"
                )
              }
              className={`min-w-0 rounded-2xl border p-3 text-left transition sm:p-4 ${
                mode ===
                "restock"
                  ? "border-green-200 bg-green-50"
                  : "border-transparent bg-slate-50 hover:bg-slate-100"
              }`}
            >

              <div className="flex items-center gap-2.5 sm:gap-3">

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    mode ===
                    "restock"
                      ? "bg-green-100 text-green-600"
                      : "bg-white text-slate-500"
                  }`}
                >

                  <RefreshCcw
                    size={18}
                  />

                </div>

                <div className="min-w-0">

                  <p className="truncate text-sm font-black text-slate-900 sm:text-base">
                    Réapprovisionner
                  </p>

                  <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
                    Ajouter du stock
                  </p>

                </div>

              </div>
            </button>

          </div>
        </div>

        {/* ======================================================
            MODE MODIFICATION
        ====================================================== */}

        {mode ===
          "edit" && (
          <div className="space-y-5 sm:space-y-6">

            <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm sm:rounded-[26px] sm:p-6">

              <div className="mb-5 flex items-center gap-3 sm:mb-6">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 sm:h-11 sm:w-11">
                  <Pencil
                    size={19}
                  />
                </div>

                <div>

                  <h2 className="font-black text-slate-900">
                    Informations du produit
                  </h2>

                  <p className="text-[11px] text-slate-500 sm:text-xs">
                    Modifiez les informations nécessaires
                  </p>

                </div>

              </div>

              <div className="space-y-4 sm:space-y-5">

                <div>

                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    Nom du produit
                  </label>

                  <input
                    value={name}
                    onChange={(e) =>
                      setName(
                        e.target
                          .value
                      )
                    }
                    placeholder="Exemple : Coca-Cola 33cl"
                    className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 sm:text-sm"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    Type d'unité
                  </label>

                  <select
                    value={type}
                    onChange={(e) =>
                      setType(
                        e.target.value
                      )
                    }
                    className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 sm:text-sm"
                  >

                    <option value="Pièce">
                      Pièce
                    </option>

                    <option value="Carton">
                      Carton
                    </option>

                    <option value="Boîte">
                      Boîte
                    </option>

                    <option value="Sachet">
                      Sachet
                    </option>

                  </select>

                </div>

                <div>

                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    Nouvelle quantité en stock
                  </label>

                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        e.target.value
                      )
                    }
                    placeholder={
                      type ===
                      "Pièce"
                        ? "Exemple : 50"
                        : `Nombre de ${type}(s)`
                    }
                    className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 sm:text-sm"
                  />

                  <p className="mt-2 text-[11px] leading-5 text-slate-400 sm:text-xs">
                    Cette quantité remplacera le stock
                    actuel. Pour ajouter une livraison,
                    utilisez plutôt{" "}
                    <strong className="text-green-600">
                      Réapprovisionner
                    </strong>
                    .
                  </p>

                </div>

                {type !==
                  "Pièce" && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5 sm:p-4">

                    <label className="mb-2 block text-xs font-bold text-slate-600">
                      Nombre de pièces dans{" "}
                      {type}
                    </label>

                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={
                        piecesPerUnit
                      }
                      onChange={(e) =>
                        setPiecesPerUnit(
                          e.target
                            .value
                        )
                      }
                      placeholder="Exemple : 24"
                      className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 sm:text-sm"
                    />

                    <div className="mt-3 flex items-start gap-3 rounded-2xl bg-white p-3.5 sm:p-4">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Calculator
                          size={17}
                        />
                      </div>

                      <div className="min-w-0">

                        <p className="text-[11px] font-semibold text-slate-400 sm:text-xs">
                          Nouveau stock réel
                        </p>

                        <p className="mt-1 break-words text-sm font-black text-indigo-600 sm:text-base">
                          {Number(
                            quantity ||
                              0
                          )}
                          {" × "}
                          {Number(
                            piecesPerUnit ||
                              1
                          )}
                          {" = "}
                          {totalPieces}{" "}
                          pièce(s)
                        </p>

                      </div>
                    </div>
                  </div>
                )}

                <div>

                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    Prix d'achat total
                  </label>

                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={buyPrice}
                    onChange={(e) =>
                      setBuyPrice(
                        e.target.value
                      )
                    }
                    placeholder="Exemple : 100000"
                    className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 sm:text-sm"
                  />

                  <p className="mt-2 text-[11px] text-slate-400 sm:text-xs">
                    Montant total correspondant à la
                    nouvelle quantité.
                  </p>

                </div>

                <div>

                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    Prix de vente par pièce
                  </label>

                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={sellPrice}
                    onChange={(e) =>
                      setSellPrice(
                        e.target.value
                      )
                    }
                    placeholder="Exemple : 2000"
                    className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 sm:text-sm"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    Monnaie
                  </label>

                  <select
                    value={
                      currency
                    }
                    onChange={(e) =>
                      setCurrency(
                        e.target
                          .value
                      )
                    }
                    className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 sm:text-sm"
                  >

                    <option value="FC">
                      Franc congolais (FC)
                    </option>

                    <option value="USD">
                      Dollar américain (USD)
                    </option>

                  </select>

                </div>

              </div>
            </div>

            {/* STATISTIQUES */}

            <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm sm:rounded-[26px] sm:p-6">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 sm:h-11 sm:w-11">
                  <TrendingUp
                    size={19}
                  />
                </div>

                <div>

                  <h2 className="font-black text-slate-900">
                    Nouveau résumé
                  </h2>

                  <p className="text-[11px] text-slate-500 sm:text-xs">
                    Résultat après modification
                  </p>

                </div>

              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3">

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 sm:p-4">

                  <div className="flex items-center gap-2.5 sm:gap-3">

                    <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm sm:flex">
                      <Boxes
                        size={18}
                      />
                    </div>

                    <div className="min-w-0">

                      <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                        Stock réel
                      </p>

                      <p className="text-lg font-black text-slate-900 sm:text-xl">
                        {totalPieces}
                      </p>

                      <p className="text-[10px] text-slate-400 sm:text-[11px]">
                        pièce(s)
                      </p>

                    </div>

                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 sm:p-4">

                  <div className="flex items-center gap-2.5 sm:gap-3">

                    <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm sm:flex">
                      <CircleDollarSign
                        size={18}
                      />
                    </div>

                    <div className="min-w-0">

                      <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                        Coût / pièce
                      </p>

                      <p className="truncate text-lg font-black text-slate-900 sm:text-xl">
                        {Math.round(
                          pricePerPiece
                        )}{" "}
                        {currency}
                      </p>

                    </div>

                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 sm:p-4">

                  <div className="flex items-center gap-2.5 sm:gap-3">

                    <div
                      className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex ${
                        profitPerPiece >=
                        0
                          ? "bg-green-50 text-green-600"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <TrendingUp
                        size={18}
                      />
                    </div>

                    <div className="min-w-0">

                      <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                        Bénéfice / pièce
                      </p>

                      <p
                        className={`truncate text-lg font-black sm:text-xl ${
                          profitPerPiece >=
                          0
                            ? "text-green-600"
                            : "text-slate-600"
                        }`}
                      >
                        {Math.round(
                          profitPerPiece
                        )}{" "}
                        {currency}
                      </p>

                    </div>

                  </div>
                </div>

                <div className="rounded-2xl border border-green-100 bg-green-50 p-3.5 sm:p-4">

                  <div className="flex items-center gap-2.5 sm:gap-3">

                    <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-green-600 shadow-sm sm:flex">
                      <Sparkles
                        size={18}
                      />
                    </div>

                    <div className="min-w-0">

                      <p className="text-[10px] font-semibold text-slate-500 sm:text-xs">
                        Bénéfice potentiel
                      </p>

                      <p
                        className={`truncate text-lg font-black sm:text-xl ${
                          totalProfit >=
                          0
                            ? "text-green-600"
                            : "text-slate-600"
                        }`}
                      >
                        {Math.round(
                          totalProfit
                        )}{" "}
                        {currency}
                      </p>

                    </div>

                  </div>
                </div>

              </div>
            </div>

            <button
              type="button"
              onClick={
                updateProduct
              }
              disabled={
                loading
              }
              className="flex min-h-[54px] w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-4 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[56px]"
            >

              {loading ? (
                <>
                  <Loader2
                    size={20}
                    className="animate-spin"
                  />

                  Modification en cours...
                </>
              ) : (
                <>
                  <Pencil
                    size={19}
                  />

                  Enregistrer les modifications
                </>
              )}

            </button>

          </div>
        )}

        {/* ======================================================
            MODE RÉAPPROVISIONNEMENT
        ====================================================== */}

        {mode ===
          "restock" && (
          <div className="space-y-5 sm:space-y-6">

            <div className="rounded-[24px] border border-green-100 bg-white p-4 shadow-sm sm:rounded-[26px] sm:p-6">

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-600 sm:h-11 sm:w-11">

                  <PackagePlus
                    size={20}
                  />

                </div>

                <div className="min-w-0">

                  <h2 className="font-black text-slate-900">
                    Réapprovisionner le stock
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                    La quantité indiquée sera{" "}
                    <strong className="text-green-600">
                      ajoutée
                    </strong>{" "}
                    au stock actuel.
                  </p>

                </div>

              </div>
            </div>

            <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm sm:rounded-[26px] sm:p-6">

              <div className="space-y-4 sm:space-y-5">

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 sm:p-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">

                      <Boxes
                        size={19}
                      />

                    </div>

                    <div>

                      <p className="text-[10px] font-bold text-slate-400 sm:text-xs">
                        Stock actuellement disponible
                      </p>

                      <p className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                        {currentStock}
                      </p>

                      <p className="text-[11px] text-slate-400 sm:text-xs">
                        pièce(s) réelles
                      </p>

                    </div>

                  </div>

                </div>

                <div>

                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    Quantité reçue
                  </label>

                  <input
                    type="number"
                    min="1"
                    inputMode="decimal"
                    value={
                      restockQuantity
                    }
                    onChange={(e) =>
                      setRestockQuantity(
                        e.target
                          .value
                      )
                    }
                    placeholder={
                      product.unit ===
                      "Pièce"
                        ? "Exemple : 50"
                        : `Nombre de ${
                            product.unit ||
                            "unités"
                          } reçus`
                    }
                    className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-50 sm:text-sm"
                  />

                </div>

                {product.unit !==
                  "Pièce" && (
                  <div className="rounded-2xl border border-green-100 bg-green-50/50 p-3.5 sm:p-4">

                    <label className="mb-2 block text-xs font-bold text-slate-600">
                      Nombre de pièces dans{" "}
                      {product.unit}
                    </label>

                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={
                        restockPiecesPerUnit
                      }
                      onChange={(e) =>
                        setRestockPiecesPerUnit(
                          e.target
                            .value
                        )
                      }
                      placeholder="Exemple : 24"
                      className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition focus:border-green-400 focus:ring-4 focus:ring-green-50 sm:text-sm"
                    />

                    <div className="mt-3 flex items-start gap-3 rounded-2xl bg-white p-3.5 sm:p-4">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">

                        <Calculator
                          size={17}
                        />

                      </div>

                      <div className="min-w-0">

                        <p className="text-[11px] font-semibold text-slate-400 sm:text-xs">
                          Nouvelle marchandise
                        </p>

                        <p className="mt-1 break-words text-sm font-black text-green-600 sm:text-base">
                          {Number(
                            restockQuantity ||
                              0
                          )}
                          {" × "}
                          {Number(
                            restockPiecesPerUnit ||
                              1
                          )}
                          {" = "}
                          {
                            restockPieces
                          }{" "}
                          pièce(s)
                        </p>

                      </div>

                    </div>
                  </div>
                )}

                <div>

                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    Prix d'achat total du nouvel arrivage
                  </label>

                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={
                      restockBuyPrice
                    }
                    onChange={(e) =>
                      setRestockBuyPrice(
                        e.target
                          .value
                      )
                    }
                    placeholder="Exemple : 240000"
                    className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-50 sm:text-sm"
                  />

                  <p className="mt-2 text-[11px] leading-5 text-slate-400 sm:text-xs">
                    Indiquez le montant total payé
                    pour cette nouvelle marchandise.
                  </p>

                </div>

              </div>
            </div>

            <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm sm:rounded-[26px] sm:p-6">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-600 sm:h-11 sm:w-11">

                  <RefreshCcw
                    size={19}
                  />

                </div>

                <div className="min-w-0">

                  <h2 className="font-black text-slate-900">
                    Aperçu du réapprovisionnement
                  </h2>

                  <p className="text-[11px] text-slate-500 sm:text-xs">
                    Voici ce qui sera enregistré
                  </p>

                </div>

              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3">

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">

                  <p className="text-[10px] font-bold text-slate-400 sm:text-xs">
                    Stock actuel
                  </p>

                  <p className="mt-1.5 text-lg font-black text-slate-900 sm:mt-2 sm:text-2xl">
                    {currentStock}
                  </p>

                  <p className="text-[10px] text-slate-400 sm:text-xs">
                    pièces
                  </p>

                </div>

                <div className="rounded-2xl border border-green-100 bg-green-50 p-3 sm:p-4">

                  <p className="text-[10px] font-bold text-slate-400 sm:text-xs">
                    Nouvel arrivage
                  </p>

                  <p className="mt-1.5 text-lg font-black text-green-600 sm:mt-2 sm:text-2xl">
                    +{restockPieces}
                  </p>

                  <p className="text-[10px] text-slate-400 sm:text-xs">
                    pièces
                  </p>

                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3 sm:p-4">

                  <p className="text-[10px] font-bold text-slate-400 sm:text-xs">
                    Nouveau stock
                  </p>

                  <p className="mt-1.5 text-lg font-black text-indigo-600 sm:mt-2 sm:text-2xl">
                    {
                      newStockAfterRestock
                    }
                  </p>

                  <p className="text-[10px] text-slate-400 sm:text-xs">
                    pièces
                  </p>

                </div>

              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:grid-cols-2">

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 sm:p-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm sm:h-10 sm:w-10">

                      <CircleDollarSign
                        size={17}
                      />

                    </div>

                    <div className="min-w-0">

                      <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                        Coût ancien
                      </p>

                      <p className="mt-1 truncate text-lg font-black text-slate-900 sm:text-xl">
                        {Math.round(
                          Number(
                            product.purchase_price ||
                              0
                          )
                        )}{" "}
                        {
                          product.currency
                        }
                      </p>

                    </div>

                  </div>
                </div>

                <div className="rounded-2xl border border-green-100 bg-green-50 p-3.5 sm:p-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-green-600 shadow-sm sm:h-10 sm:w-10">

                      <TrendingUp
                        size={17}
                      />

                    </div>

                    <div className="min-w-0">

                      <p className="text-[10px] font-semibold text-slate-500 sm:text-xs">
                        Nouveau coût moyen
                      </p>

                      <p className="mt-1 truncate text-lg font-black text-green-600 sm:text-xl">
                        {Math.round(
                          newAverageCost
                        )}{" "}
                        {
                          product.currency
                        }
                      </p>

                    </div>

                  </div>
                </div>

              </div>

              <div className="mt-3 rounded-2xl border border-green-100 bg-green-50 p-3.5 sm:mt-4 sm:p-4">

                <div className="flex gap-3">

                  <CheckCircle
                    size={19}
                    className="mt-0.5 shrink-0 text-green-600"
                  />

                  <div className="min-w-0">

                    <p className="text-sm font-black text-slate-900">
                      Rien ne sera perdu
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-xs">
                      Le stock actuel de{" "}
                      <strong className="text-slate-900">
                        {currentStock}
                      </strong>{" "}
                      pièce(s) sera conservé.
                      Les{" "}
                      <strong className="text-green-600">
                        {restockPieces}
                      </strong>{" "}
                      nouvelles pièces seront
                      ajoutées.
                    </p>

                  </div>

                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={
                restockProduct
              }
              disabled={
                loadingRestock
              }
              className="flex min-h-[54px] w-full items-center justify-center gap-3 rounded-2xl bg-green-600 px-4 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[56px]"
            >

              {loadingRestock ? (
                <>
                  <Loader2
                    size={20}
                    className="animate-spin"
                  />

                  Réapprovisionnement en cours...
                </>
              ) : (
                <>
                  <RefreshCcw
                    size={19}
                  />

                  Ajouter au stock
                </>
              )}

            </button>

          </div>
        )}

        {/* ======================================================
            ANNULER
        ====================================================== */}

        <button
          type="button"
          onClick={() =>
            router.push(
              "/products"
            )
          }
          disabled={
            loading ||
            loadingRestock
          }
          className="mt-5 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:mt-6"
        >
          Annuler
        </button>

        <div className="px-2 py-5 text-center sm:py-6">
          <p className="text-[10px] leading-5 text-slate-400 sm:text-xs">
            BISO-COMMERCE
          </p>
        </div>

      </div>

      {/* ======================================================
          MODAL SUCCÈS
      ====================================================== */}

      {showSuccessModal && (
        <div
          className="
            fixed
            inset-0
            z-[9999]
            flex
            items-center
            justify-center
            bg-slate-950/50
            px-4
            backdrop-blur-sm
          "
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeSuccessModal();
            }
          }}
        >

          <div
            className="
              w-full
              max-w-md
              overflow-hidden
              rounded-[28px]
              border
              border-slate-200
              bg-white
              shadow-2xl
            "
          >

            <div
              className={`
                p-6
                ${
                  successMessage ===
                  "error"
                    ? "bg-red-50"
                    : successMessage ===
                      "offline"
                    ? "bg-amber-50"
                    : successMessage ===
                      "syncing"
                    ? "bg-indigo-50"
                    : "bg-emerald-50"
                }
              `}
            >

              <div className="flex items-start justify-between gap-3">

                <div
                  className={`
                    flex
                    h-14
                    w-14
                    shrink-0
                    items-center
                    justify-center
                    rounded-2xl
                    ${
                      successMessage ===
                      "error"
                        ? "bg-red-100 text-red-600"
                        : successMessage ===
                          "offline"
                        ? "bg-amber-100 text-amber-600"
                        : successMessage ===
                          "syncing"
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-emerald-100 text-emerald-600"
                    }
                  `}
                >

                  {successMessage ===
                  "syncing" ? (
                    <Loader2
                      size={28}
                      className="animate-spin"
                    />
                  ) : successMessage ===
                    "error" ? (
                    <AlertTriangle
                      size={28}
                    />
                  ) : (
                    <CheckCircle
                      size={28}
                    />
                  )}

                </div>

                <button
                  type="button"
                  onClick={
                    closeSuccessModal
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-slate-400 transition hover:bg-white hover:text-slate-700"
                  aria-label="Fermer"
                >
                  <X
                    size={18}
                  />
                </button>

              </div>

              <div className="mt-5">

                <h2
                  className={`
                    text-xl
                    font-black
                    ${
                      successMessage ===
                      "error"
                        ? "text-red-800"
                        : successMessage ===
                          "offline"
                        ? "text-amber-800"
                        : successMessage ===
                          "syncing"
                        ? "text-indigo-800"
                        : "text-emerald-800"
                    }
                  `}
                >

                  {successMessage ===
                    "offline" &&
                    "Modification bien enregistrée"}

                  {successMessage ===
                    "local" &&
                    "Modification enregistrée localement"}

                  {successMessage ===
                    "syncing" &&
                    "Modification enregistrée"}

                  {successMessage ===
                    "success" &&
                    "Produit enregistré avec succès"}

                  {successMessage ===
                    "error" &&
                    "Enregistrement impossible"}

                </h2>

                <p
                  className={`
                    mt-2
                    text-sm
                    leading-6
                    ${
                      successMessage ===
                      "error"
                        ? "text-red-700"
                        : successMessage ===
                          "offline"
                        ? "text-amber-700"
                        : successMessage ===
                          "syncing"
                        ? "text-indigo-700"
                        : "text-emerald-700"
                    }
                  `}
                >

                  {successMessage ===
                    "offline" &&
                    "Le changement est enregistré sur cet appareil. Vous pouvez continuer à travailler sans Internet. Il sera synchronisé automatiquement dès que la connexion reviendra."}

                  {successMessage ===
                    "local" &&
                    "Le changement est enregistré localement. Il sera synchronisé dès que votre compte pourra être identifié."}

                  {successMessage ===
                    "syncing" &&
                    "Le changement est enregistré sur votre appareil et la synchronisation avec BISO-COMMERCE est en cours ou sera réessayée automatiquement."}

                  {successMessage ===
                    "success" &&
                    "La modification du produit a été enregistrée et synchronisée avec BISO-COMMERCE."}

                  {successMessage ===
                    "error" &&
                    "Le changement n'a pas pu être enregistré correctement. Le produit local précédent reste conservé."}

                </p>

              </div>

            </div>

            <div className="grid grid-cols-2 gap-2 p-5">

              

              <button
                type="button"
                onClick={
                  goToProducts
                }
                className="
                  flex
                  min-h-[50px]
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-indigo-600
                  px-4
                  py-3
                  text-sm
                  font-black
                  text-white
                  shadow-sm
                  transition
                  hover:bg-indigo-700
                "
              >
                OK
                <ArrowRight
                  size={16}
                />
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}