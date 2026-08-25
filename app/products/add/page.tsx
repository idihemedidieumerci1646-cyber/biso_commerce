"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  PackagePlus,
  Loader2,
  CheckCircle,
  Info,
  Sparkles,
  Boxes,
  CircleDollarSign,
  TrendingUp,
  WifiOff,
  Cloud,
  CloudOff,
} from "lucide-react";

/* ============================================================
   TYPES
============================================================ */

type StockMode = "nouveau" | "existant";

type SuccessMessage =
  | "offline"
  | "local"
  | "syncing"
  | "success"
  | "error"
  | null;

type LocalProduct = {
  id: string;
  user_id: string | null;
  name: string;
  unit: string;
  stock: number;
  initial_stock: number;
  purchase_price: number;
  selling_price: number;
  currency: string;
  created_at: string;
  synced: boolean;
};

/* ============================================================
   INDEXED DB
============================================================ */

const DB_NAME = "biso-commerce-products";
const DB_VERSION = 10;
const STORE_NAME = "products";

/* ============================================================
   OUVRIR INDEXED DB
============================================================ */

function openProductsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(
        new Error("IndexedDB indisponible")
      );
      return;
    }

    if (!("indexedDB" in window)) {
      reject(
        new Error("IndexedDB non supporté")
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

      let productsStore: IDBObjectStore;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        productsStore =
          db.createObjectStore(
            STORE_NAME,
            {
              keyPath: "id",
            }
          );
      } else {
        productsStore =
          transaction.objectStore(
            STORE_NAME
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
            "Impossible d'ouvrir IndexedDB"
          )
      );
    };
  });
}

/* ============================================================
   ENREGISTRER PRODUIT LOCALEMENT
============================================================ */

function saveProductToIndexedDB(
  product: LocalProduct
): Promise<void> {
  return new Promise(
    async (resolve, reject) => {
      try {
        const db =
          await openProductsDB();

        const transaction =
          db.transaction(
            STORE_NAME,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            STORE_NAME
          );

        store.put(product);

        transaction.oncomplete = () => {
          db.close();
          resolve();
        };

        transaction.onerror = () => {
          db.close();

          reject(
            transaction.error ||
              new Error(
                "Impossible d'enregistrer le produit localement."
              )
          );
        };

        transaction.onabort = () => {
          db.close();

          reject(
            transaction.error ||
              new Error(
                "L'enregistrement local a été interrompu."
              )
          );
        };
      } catch (error) {
        reject(error);
      }
    }
  );
}

/* ============================================================
   RÉCUPÉRER PRODUITS LOCAUX
============================================================ */

function getProductsFromIndexedDB(): Promise<
  LocalProduct[]
> {
  return new Promise(
    async (resolve, reject) => {
      try {
        const db =
          await openProductsDB();

        const transaction =
          db.transaction(
            STORE_NAME,
            "readonly"
          );

        const store =
          transaction.objectStore(
            STORE_NAME
          );

        const request =
          store.getAll();

        request.onsuccess = () => {
          db.close();

          const products =
            (request.result as LocalProduct[]) ||
            [];

          products.sort(
            (a, b) =>
              new Date(
                b.created_at
              ).getTime() -
              new Date(
                a.created_at
              ).getTime()
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
      } catch (error) {
        reject(error);
      }
    }
  );
}

/* ============================================================
   METTRE À JOUR PRODUIT LOCAL
============================================================ */

function updateProductInIndexedDB(
  product: LocalProduct
): Promise<void> {
  return saveProductToIndexedDB(
    product
  );
}

/* ============================================================
   RÉCUPÉRER USER ID
============================================================ */

async function resolveUserId(): Promise<
  string | null
> {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const savedUserId =
    localStorage.getItem(
      "user_id"
    );

  if (savedUserId) {
    return String(savedUserId);
  }

  if (!navigator.onLine) {
    return null;
  }

  const phone =
    localStorage.getItem(
      "phone"
    );

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
  } catch {
    return null;
  }
}

/* ============================================================
   SYNCHRONISER PRODUITS AVEC SUPABASE
============================================================ */

async function syncProductsWithSupabase() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  if (!navigator.onLine) {
    return;
  }

  try {
    const products =
      await getProductsFromIndexedDB();

    let userId =
      localStorage.getItem(
        "user_id"
      );

    if (!userId) {
      userId =
        await resolveUserId();
    }

    const pendingProducts =
      products.filter(
        (product) =>
          product.synced === false
      );

    if (
      pendingProducts.length ===
      0
    ) {
      window.dispatchEvent(
        new CustomEvent(
          "biso-products-updated"
        )
      );

      return;
    }

    for (
      const product of pendingProducts
    ) {
      try {
        const productUserId =
          product.user_id ||
          userId;

        if (!productUserId) {
          continue;
        }

        const productData = {
          id:
            product.id,

          user_id:
            productUserId,

          name:
            product.name,

          unit:
            product.unit,

          stock:
            product.stock,

          initial_stock:
            product.initial_stock,

          purchase_price:
            product.purchase_price,

          selling_price:
            product.selling_price,

          currency:
            product.currency,

          created_at:
            product.created_at,
        };

        const {
          error,
        } = await supabase
          .from("products")
          .upsert(
            productData,
            {
              onConflict:
                "id",
            }
          );

        if (error) {
          console.error(
            "Erreur Supabase synchronisation :",
            error
          );

          continue;
        }

        const synchronizedProduct: LocalProduct =
          {
            ...product,

            user_id:
              productUserId,

            synced:
              true,
          };

        await updateProductInIndexedDB(
          synchronizedProduct
        );

        window.dispatchEvent(
          new CustomEvent(
            "biso-products-updated",
            {
              detail: {
                product:
                  synchronizedProduct,

                source:
                  "sync",
              },
            }
          )
        );

        window.dispatchEvent(
          new CustomEvent(
            "biso-product-added",
            {
              detail:
                synchronizedProduct,
            }
          )
        );
      } catch (error) {
        console.error(
          "Erreur synchronisation produit :",
          error
        );
      }
    }

    window.dispatchEvent(
      new CustomEvent(
        "biso-products-updated"
      )
    );
  } catch (error) {
    console.error(
      "Erreur synchronisation produits :",
      error
    );
  }
}

/* ============================================================
   COMPOSANT PRINCIPAL
============================================================ */

export default function AddProductPage() {
  const [name, setName] =
    useState("");

  const [type, setType] =
    useState("Pièce");

  const [quantity, setQuantity] =
    useState("");

  const [
    piecesPerUnit,
    setPiecesPerUnit,
  ] = useState("1");

  const [
    buyPrice,
    setBuyPrice,
  ] = useState("");

  const [
    sellPrice,
    setSellPrice,
  ] = useState("");

  const [
    currency,
    setCurrency,
  ] = useState("FC");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    stockMode,
    setStockMode,
  ] = useState<StockMode>(
    "nouveau"
  );

  const [
    showGuide,
    setShowGuide,
  ] = useState(false);

  const [
    isOnline,
    setIsOnline,
  ] = useState(true);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<SuccessMessage>(
    null
  );

  const [
    showSuccessModal,
    setShowSuccessModal,
  ] = useState(false);

  /* ==========================================================
     CONNEXION INTERNET
  ========================================================== */

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    setIsOnline(
      navigator.onLine
    );

    const handleOnline =
      () => {
        setIsOnline(true);

        setTimeout(() => {
          void syncProductsWithSupabase();
        }, 300);
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
      void syncProductsWithSupabase();
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
  }, []);

  /* ==========================================================
     CALCUL AUTOMATIQUE
  ========================================================== */

  const totalPieces =
    type !== "Pièce"
      ? Number(
          quantity || 0
        ) *
        Number(
          piecesPerUnit || 1
        )
      : Number(
          quantity || 0
        );

  const pricePerPiece =
    totalPieces > 0
      ? Number(
          buyPrice || 0
        ) /
        totalPieces
      : 0;

  const profitPerPiece =
    Number(
      sellPrice || 0
    ) -
    pricePerPiece;

  const totalProfit =
    profitPerPiece *
    totalPieces;

  /* ==========================================================
     ENREGISTRER LE PRODUIT
  ========================================================== */

  const saveProduct =
    async () => {
      if (loading) {
        return;
      }

      setSuccessMessage(null);
      setShowSuccessModal(false);

      /* ------------------------------------------------------
         VALIDATION
      ------------------------------------------------------ */

      if (
        !name.trim() ||
        !quantity ||
        !buyPrice ||
        !sellPrice
      ) {
        alert(
          "Veuillez remplir tous les champs obligatoires."
        );
        return;
      }

      const nPieces =
        type !== "Pièce"
          ? Number(
              piecesPerUnit || 1
            )
          : 1;

      if (
        Number(quantity) <=
        0
      ) {
        alert(
          "La quantité doit être supérieure à 0."
        );
        return;
      }

      if (
        nPieces <= 0
      ) {
        alert(
          "Le nombre de pièces dans l'unité doit être supérieur à 0."
        );
        return;
      }

      if (
        Number(buyPrice) <
          0 ||
        Number(sellPrice) <
          0
      ) {
        alert(
          "Les prix ne peuvent pas être négatifs."
        );
        return;
      }

      const totalStock =
        Number(quantity) *
        nPieces;

      if (
        totalStock <=
        0
      ) {
        alert(
          "Le stock doit être supérieur à 0."
        );
        return;
      }

      const unitCost =
        Number(buyPrice) /
        totalStock;

      setLoading(true);

      try {
        /* ----------------------------------------------------
           USER ID
        ---------------------------------------------------- */

        const userId =
          await resolveUserId();

        /* ----------------------------------------------------
           CRÉER PRODUIT
        ---------------------------------------------------- */

        const productId =
          crypto.randomUUID();

        const createdAt =
          new Date().toISOString();

        const localProduct: LocalProduct =
          {
            id:
              productId,

            user_id:
              userId,

            name:
              name.trim(),

            unit:
              type,

            stock:
              totalStock,

            initial_stock:
              totalStock,

            purchase_price:
              unitCost,

            selling_price:
              Number(
                sellPrice
              ),

            currency:
              currency,

            created_at:
              createdAt,

            synced:
              false,
          };

        /* ----------------------------------------------------
           1. SAUVEGARDE LOCALE
        ---------------------------------------------------- */

        await saveProductToIndexedDB(
          localProduct
        );

        /*
          À partir de cette ligne,
          le produit est réellement enregistré
          sur l'appareil.
        */

        /* ----------------------------------------------------
           2. DÉTERMINER LE MESSAGE
        ---------------------------------------------------- */

        let message: SuccessMessage;

        if (!navigator.onLine) {
          message = "offline";
        } else if (!userId) {
          message = "local";
        } else {
          message = "syncing";
        }

        setSuccessMessage(message);

        /* ----------------------------------------------------
           3. INFORMER LES PAGES PRODUITS
        ---------------------------------------------------- */

        window.dispatchEvent(
          new CustomEvent(
            "biso-products-updated",
            {
              detail: {
                product:
                  localProduct,

                source:
                  "add-product",
              },
            }
          )
        );

        window.dispatchEvent(
          new CustomEvent(
            "biso-product-added",
            {
              detail:
                localProduct,
            }
          )
        );

        /* ----------------------------------------------------
           4. AFFICHER LA FENÊTRE
        ---------------------------------------------------- */

        setShowSuccessModal(true);

        /* ----------------------------------------------------
           5. VIDER LE FORMULAIRE
        ---------------------------------------------------- */

        setName("");
        setQuantity("");
        setBuyPrice("");
        setSellPrice("");
        setPiecesPerUnit("1");
        setStockMode("nouveau");

        /* ----------------------------------------------------
           6. SYNCHRONISATION EN ARRIÈRE-PLAN
        ---------------------------------------------------- */

        if (
          navigator.onLine
        ) {
          void syncProductsWithSupabase()
            .then(
              async () => {
                try {
                  const products =
                    await getProductsFromIndexedDB();

                  const savedProduct =
                    products.find(
                      (
                        product
                      ) =>
                        product.id ===
                        productId
                    );

                  if (
                    savedProduct?.synced
                  ) {
                    setSuccessMessage(
                      "success"
                    );
                  } else {
                    setSuccessMessage(
                      "syncing"
                    );
                  }
                } catch {
                  setSuccessMessage(
                    "syncing"
                  );
                }
              }
            )
            .catch(() => {
              setSuccessMessage(
                "syncing"
              );
            });
        }
      } catch (error) {
        console.error(
          "Erreur ajout produit :",
          error
        );

        setSuccessMessage(
          "error"
        );

        setShowSuccessModal(true);
      } finally {
        setLoading(false);
      }
    };

  /* ==========================================================
     AFFICHAGE
  ========================================================== */

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">

      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-5 sm:py-6">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="mb-4">

          <div className="flex items-center justify-between gap-3">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <PackagePlus
                  size={21}
                />
              </div>

              <div className="min-w-0">

                <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                  Nouveau produit
                </h1>

                <p className="mt-0.5 text-xs text-slate-500">
                  Ajoutez un produit à votre stock
                </p>

              </div>

            </div>

            {/* ÉTAT INTERNET */}

            <div
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-black ${
                isOnline
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >

              {isOnline ? (
                <>
                  <Cloud
                    size={14}
                  />

                  En ligne
                </>
              ) : (
                <>
                  <CloudOff
                    size={14}
                  />

                  Hors ligne
                </>
              )}

            </div>

          </div>

          {/* MESSAGE HORS LIGNE */}

          {!isOnline && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50 p-3">

              <WifiOff
                size={17}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>

                <p className="text-xs font-black text-amber-700">
                  Mode hors connexion
                </p>

                <p className="mt-1 text-[11px] leading-4 text-amber-700/80">
                  Vous pouvez continuer à ajouter
                  des produits. Ils seront conservés
                  sur votre appareil puis synchronisés
                  automatiquement lorsque Internet
                  reviendra.
                </p>

              </div>

            </div>
          )}

        </div>

        {/* ====================================================
            GUIDE
        ==================================================== */}

        <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between gap-2 p-3">

            <div className="flex min-w-0 items-center gap-2">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Info
                  size={19}
                />
              </div>

              <div className="min-w-0">

                <h2 className="text-sm font-black text-slate-900">
                  Guide d'ajout
                </h2>

                <p className="truncate text-[11px] text-slate-500">
                  Comment ajouter votre stock
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
              className="shrink-0 rounded-xl bg-indigo-600 px-3 py-2 text-[11px] font-black text-white transition active:scale-95"
            >
              {showGuide
                ? "Fermer"
                : "Voir le guide"}
            </button>

          </div>

          {showGuide && (
            <div className="border-t border-slate-100 p-3">

              {/* INTRODUCTION */}

              <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3">

                <div className="flex gap-2.5">

                  <Sparkles
                    className="mt-0.5 shrink-0 text-indigo-600"
                    size={18}
                  />

                  <div>

                    <h3 className="text-sm font-black text-slate-900">
                      Bienvenue
                    </h3>

                    <p className="mt-1.5 text-xs leading-5 text-slate-600">
                      Ce guide vous explique simplement comment
                      ajouter un produit et enregistrer correctement
                      votre stock.
                    </p>

                  </div>

                </div>

              </div>

              {/* SITUATION */}

              <GuideStep
                number="1"
                color="indigo"
                title="Choisissez votre situation"
              >

                <div className="space-y-2">

                  <div className="rounded-xl bg-indigo-50 p-3">

                    <p className="text-sm font-black text-slate-900">
                      🆕 Nouveau stock
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Vous venez d'acheter le produit auprès
                      de votre fournisseur.
                    </p>

                    <div className="mt-2 rounded-lg bg-white p-2.5">

                      <p className="text-[11px] font-bold text-indigo-600">
                        Exemple
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        5 cartons × 24 bouteilles = 120 bouteilles.
                      </p>

                    </div>

                  </div>

                  <div className="rounded-xl bg-emerald-50 p-3">

                    <p className="text-sm font-black text-slate-900">
                      📦 Stock déjà existant
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Le produit était déjà dans votre boutique
                      avant BISO-COMMERCE.
                    </p>

                    <div className="mt-2 rounded-lg bg-white p-2.5">

                      <p className="text-[11px] font-bold text-emerald-600">
                        Exemple
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Vous avez actuellement 50 bouteilles.
                        Vous devez inscrire 50.
                      </p>

                    </div>

                  </div>

                </div>

              </GuideStep>

              {/* NOM */}

              <GuideStep
                number="2"
                color="purple"
                title="Nom du produit"
              >

                <p className="text-xs leading-5 text-slate-600">
                  Écrivez un nom facile à reconnaître.
                </p>

                <div className="mt-2 rounded-xl bg-slate-50 p-3">

                  <p className="text-xs text-slate-600">
                    🥤 Coca-Cola 33cl
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    💊 Paracétamol 500mg
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    🍚 Riz 25kg
                  </p>

                </div>

              </GuideStep>

              {/* UNITÉ */}

              <GuideStep
                number="3"
                color="indigo"
                title="Type d'unité"
              >

                <div className="space-y-2">

                  <div className="rounded-xl bg-slate-50 p-3">

                    <p className="text-xs font-bold text-slate-900">
                      🧴 Pièce
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      Exemple : 20 bouteilles.
                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">

                    <p className="text-xs font-bold text-slate-900">
                      📦 Carton
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      Exemple : 1 carton = 24 bouteilles.
                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">

                    <p className="text-xs font-bold text-slate-900">
                      📦 Boîte
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      Exemple : 1 boîte = 100 comprimés.
                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">

                    <p className="text-xs font-bold text-slate-900">
                      🛍️ Sachet
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      Exemple : 1 sachet contient plusieurs pièces.
                    </p>

                  </div>

                </div>

              </GuideStep>

              {/* QUANTITÉ */}

              <GuideStep
                number="4"
                color="emerald"
                title="Quantité"
              >

                <div className="space-y-2">

                  <div className="rounded-xl bg-indigo-50 p-3">

                    <p className="text-xs font-black text-indigo-600">
                      🆕 Nouveau stock
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Écrivez la quantité que vous venez d'acheter.
                    </p>

                    <p className="mt-1.5 text-xs font-black text-slate-900">
                      Exemple : 5 cartons → quantité = 5
                    </p>

                  </div>

                  <div className="rounded-xl bg-emerald-50 p-3">

                    <p className="text-xs font-black text-emerald-600">
                      📦 Stock existant
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Écrivez uniquement ce qu'il vous reste
                      aujourd'hui.
                    </p>

                    <p className="mt-1.5 text-xs font-black text-slate-900">
                      Exemple : 50 bouteilles → quantité = 50
                    </p>

                  </div>

                </div>

              </GuideStep>

              {/* PRIX */}

              <GuideStep
                number="5"
                color="purple"
                title="Prix"
              >

                <p className="text-xs leading-5 text-slate-600">
                  Indiquez le montant total payé pour le stock
                  et le prix auquel vous vendrez une pièce.
                </p>

                <div className="mt-2 rounded-xl bg-slate-50 p-3">

                  <p className="text-xs text-slate-600">
                    Achat total :{" "}
                    <strong>
                      100000 FC
                    </strong>
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Vente / pièce :{" "}
                    <strong>
                      2000 FC
                    </strong>
                  </p>

                </div>

              </GuideStep>

              {/* RAPPEL */}

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">

                <div className="flex gap-2.5">

                  <CheckCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />

                  <div>

                    <p className="text-sm font-black text-slate-900">
                      Vous êtes prêt
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Remplissez simplement le formulaire.
                      BISO-COMMERCE calculera automatiquement
                      votre stock et votre bénéfice.
                    </p>

                  </div>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowGuide(false)
                }
                className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-3 text-xs font-black text-white active:scale-[0.99]"
              >
                ✓ J'ai compris
              </button>

            </div>
          )}

        </div>

        {/* ====================================================
            FORMULAIRE
        ==================================================== */}

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">

          {/* NOM */}

          <div>

            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Nom du produit
            </label>

            <input
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              placeholder="Exemple : Coca-Cola 33cl"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            />

            <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
              Utilisez un nom simple pour retrouver facilement
              le produit.
            </p>

          </div>

          {/* SITUATION */}

          <div>

            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Situation du stock
            </label>

            <div className="grid grid-cols-2 gap-2">

              <button
                type="button"
                onClick={() =>
                  setStockMode(
                    "nouveau"
                  )
                }
                className={`rounded-xl border p-3 text-left transition active:scale-[0.99] ${
                  stockMode ===
                  "nouveau"
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >

                <div className="flex items-start gap-2">

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      stockMode ===
                      "nouveau"
                        ? "bg-indigo-100"
                        : "bg-white"
                    }`}
                  >
                    🆕
                  </div>

                  <div className="min-w-0">

                    <p className="text-xs font-black text-slate-900">
                      Nouveau
                    </p>

                    <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                      Je viens de l'acheter
                    </p>

                  </div>

                </div>

              </button>

              <button
                type="button"
                onClick={() =>
                  setStockMode(
                    "existant"
                  )
                }
                className={`rounded-xl border p-3 text-left transition active:scale-[0.99] ${
                  stockMode ===
                  "existant"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >

                <div className="flex items-start gap-2">

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      stockMode ===
                      "existant"
                        ? "bg-emerald-100"
                        : "bg-white"
                    }`}
                  >
                    📦
                  </div>

                  <div className="min-w-0">

                    <p className="text-xs font-black text-slate-900">
                      Existant
                    </p>

                    <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                      Je l'avais déjà
                    </p>

                  </div>

                </div>

              </button>

            </div>

            {stockMode ===
              "nouveau" && (
              <div className="mt-2.5 rounded-xl border border-indigo-100 bg-indigo-50 p-3">

                <div className="flex gap-2">

                  <span className="text-lg">
                    🆕
                  </span>

                  <div>

                    <p className="text-xs font-black text-indigo-600">
                      Vous venez d'acheter ce produit
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-slate-600">
                      Indiquez la quantité achetée, le prix d'achat
                      total et votre prix de vente par pièce.
                    </p>

                    <p className="mt-2 text-[11px] font-black text-slate-900">
                      Exemple : 5 cartons × 24 = 120 bouteilles
                    </p>

                  </div>

                </div>

              </div>
            )}

            {stockMode ===
              "existant" && (
              <div className="mt-2.5 overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50">

                <div className="p-3">

                  <div className="flex gap-2">

                    <span className="text-lg">
                      📦
                    </span>

                    <div>

                      <p className="text-xs font-black text-emerald-600">
                        Produit déjà présent
                      </p>

                      <p className="mt-1 text-[11px] leading-4 text-slate-600">
                        Indiquez uniquement la quantité que vous
                        avez actuellement dans votre boutique.
                      </p>

                    </div>

                  </div>

                </div>

                <div className="border-t border-emerald-100 bg-white/70 p-3">

                  <p className="text-[11px] font-bold text-emerald-600">
                    Exemple
                  </p>

                  <p className="mt-1 text-[11px] leading-4 text-slate-600">
                    Vous aviez 200 bouteilles et vous en avez
                    vendu 150.
                  </p>

                  <p className="mt-1.5 text-xs font-black text-slate-900">
                    Il reste 50 → inscrivez 50.
                  </p>

                </div>

              </div>
            )}

          </div>

          {/* TYPE + QUANTITÉ */}

          <div className="grid grid-cols-2 gap-2">

            <div>

              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Type d'unité
              </label>

              <select
                value={type}
                onChange={(e) =>
                  setType(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
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

              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                {stockMode ===
                "existant"
                  ? "Stock actuel"
                  : "Quantité"}
              </label>

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    e.target.value
                  )
                }
                placeholder="Exemple : 50"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />

            </div>

          </div>

          {stockMode ===
          "existant" ? (
            <p className="text-[11px] leading-4 text-emerald-600">
              💡 Indiquez uniquement ce qu'il vous reste
              actuellement.
            </p>
          ) : (
            <p className="text-[11px] leading-4 text-slate-400">
              💡 Indiquez combien d'unités vous venez d'acheter.
            </p>
          )}

          {/* PIÈCES PAR UNITÉ */}

          {type !==
            "Pièce" && (
            <div>

              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Pièces dans 1{" "}
                {type.toLowerCase()}
              </label>

              <input
                type="number"
                min="1"
                value={
                  piecesPerUnit
                }
                onChange={(e) =>
                  setPiecesPerUnit(
                    e.target.value
                  )
                }
                placeholder="Exemple : 24"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />

              <div className="mt-2 rounded-xl bg-indigo-50 p-2.5">

                <p className="text-[11px] font-bold text-indigo-600">
                  Calcul automatique
                </p>

                <p className="mt-1 text-xs font-black text-slate-900">
                  {Number(
                    quantity ||
                      0
                  )}{" "}
                  ×{" "}
                  {Number(
                    piecesPerUnit ||
                      1
                  )}{" "}
                  ={" "}
                  {totalPieces}{" "}
                  pièce(s)
                </p>

              </div>

            </div>
          )}

          {/* PRIX */}

          <div className="grid grid-cols-2 gap-2">

            <div>

              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Achat total
              </label>

              <input
                type="number"
                min="0"
                value={
                  buyPrice
                }
                onChange={(e) =>
                  setBuyPrice(
                    e.target.value
                  )
                }
                placeholder="100000"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />

            </div>

            <div>

              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Vente / pièce
              </label>

              <input
                type="number"
                min="0"
                value={
                  sellPrice
                }
                onChange={(e) =>
                  setSellPrice(
                    e.target.value
                  )
                }
                placeholder="2000"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />

            </div>

          </div>

          <p className="text-[11px] leading-4 text-slate-400">
            💡 Achat total = montant payé au fournisseur.
            Vente / pièce = prix auquel vous vendrez une pièce.
          </p>

          {/* MONNAIE */}

          <div>

            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Monnaie
            </label>

            <select
              value={
                currency
              }
              onChange={(e) =>
                setCurrency(
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            >

              <option value="FC">
                Franc congolais (FC)
              </option>

              <option value="USD">
                Dollar américain (USD)
              </option>

            </select>

          </div>

          {/* RÉSUMÉ */}

          <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/50">

            <div className="border-b border-indigo-100 p-3">

              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <TrendingUp
                    size={18}
                  />
                </div>

                <div>

                  <h2 className="text-sm font-black text-slate-900">
                    Résumé automatique
                  </h2>

                  <p className="text-[11px] text-slate-500">
                    Calculé automatiquement
                  </p>

                </div>

              </div>

            </div>

            <div className="grid grid-cols-2 gap-2 p-3">

              <SummaryCard
                icon={
                  <Boxes
                    size={15}
                  />
                }
                title="Stock réel"
              >

                <p className="text-lg font-black text-slate-900">
                  {
                    totalPieces
                  }
                </p>

                <p className="text-[11px] text-slate-500">
                  pièce(s)
                </p>

              </SummaryCard>

              <SummaryCard
                icon={
                  <CircleDollarSign
                    size={15}
                  />
                }
                title="Coût / pièce"
              >

                <p className="text-lg font-black text-slate-900">
                  {Math.round(
                    pricePerPiece
                  )}{" "}
                  {
                    currency
                  }
                </p>

              </SummaryCard>

              <SummaryCard
                icon={
                  <TrendingUp
                    size={15}
                  />
                }
                title="Bénéfice / pièce"
              >

                <p
                  className={`text-lg font-black ${
                    profitPerPiece >=
                    0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {Math.round(
                    profitPerPiece
                  )}{" "}
                  {
                    currency
                  }
                </p>

              </SummaryCard>

              <SummaryCard
                icon={
                  <Sparkles
                    size={15}
                  />
                }
                title="Bénéfice total"
              >

                <p
                  className={`text-lg font-black ${
                    totalProfit >=
                    0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {Math.round(
                    totalProfit
                  )}{" "}
                  {
                    currency
                  }
                </p>

                <p className="text-[10px] text-slate-500">
                  si tout est vendu
                </p>

              </SummaryCard>

            </div>

            <div className="mx-3 mb-3 rounded-xl border border-slate-200 bg-white p-3">

              <div className="flex gap-2.5">

                <CheckCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <div>

                  <p className="text-xs font-bold text-slate-900">
                    Avant de confirmer
                  </p>

                  <p className="mt-1 text-[11px] leading-4 text-slate-500">
                    Vérifiez le nom, le stock, la quantité,
                    les prix et la monnaie.
                  </p>

                  {stockMode ===
                    "existant" && (
                    <p className="mt-1.5 text-[11px] font-bold leading-4 text-emerald-600">
                      📦 Stock existant : la quantité doit être
                      celle que vous avez actuellement.
                    </p>
                  )}

                </div>

              </div>

            </div>

          </div>

          {/* BOUTON */}

          <button
            type="button"
            onClick={
              saveProduct
            }
            disabled={
              loading
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >

            {loading ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />

                Enregistrement...
              </>
            ) : (
              <>
                <PackagePlus
                  size={18}
                />

                Ajouter le produit
              </>
            )}

          </button>

          {/* RAPPEL */}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">

            <div className="flex items-start gap-2.5">

              <Info
                size={17}
                className="mt-0.5 shrink-0 text-indigo-600"
              />

              <div>

                <p className="text-xs font-bold text-slate-900">
                  Un doute ?
                </p>

                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Vérifiez que la quantité correspond bien au
                  stock réellement présent dans votre boutique.
                </p>

              </div>

            </div>

          </div>

          <p className="pb-1 text-center text-[10px] text-slate-400">
            Vérifiez les informations avant de confirmer.
          </p>

        </div>

      </div>

      {/* ====================================================
          MODAL DE CONFIRMATION
      ==================================================== */}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

          <div
            className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-title"
          >

            <div className="p-6 sm:p-7">

              {/* ICÔNE */}

              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
                  successMessage === "error"
                    ? "bg-red-50 text-red-600"
                    : successMessage === "offline"
                    ? "bg-amber-50 text-amber-600"
                    : successMessage === "syncing"
                    ? "bg-indigo-50 text-indigo-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >

                {successMessage ===
                "syncing" ? (
                  <Loader2
                    size={32}
                    className="animate-spin"
                  />
                ) : successMessage ===
                  "error" ? (
                  <Info
                    size={32}
                  />
                ) : (
                  <CheckCircle
                    size={32}
                  />
                )}

              </div>

              {/* TITRE */}

              <h2
                id="success-title"
                className="mt-5 text-center text-xl font-black text-slate-900"
              >
                {successMessage ===
                  "offline" &&
                  "Produit bien enregistré"}

                {successMessage ===
                  "local" &&
                  "Produit bien enregistré"}

                {successMessage ===
                  "syncing" &&
                  "Produit bien enregistré"}

                {successMessage ===
                  "success" &&
                  "Produit enregistré avec succès"}

                {successMessage ===
                  "error" &&
                  "Enregistrement impossible"}

                {!successMessage &&
                  "Produit enregistré"}
              </h2>

              {/* MESSAGE */}

              <p className="mt-3 text-center text-sm leading-6 text-slate-600">

                {successMessage ===
                  "offline" && (
                  <>
                    Votre produit est bien enregistré sur votre
                    appareil.
                    <br />
                    Il est déjà disponible dans votre liste
                    Produits.
                    <br />
                    Dès que la connexion reviendra, il sera
                    automatiquement synchronisé avec
                    BISO-COMMERCE.
                  </>
                )}

                {successMessage ===
                  "local" && (
                  <>
                    Votre produit est bien enregistré sur votre
                    appareil.
                    <br />
                    Il reste disponible localement et sera
                    synchronisé automatiquement lorsque votre
                    compte pourra être identifié.
                  </>
                )}

                {successMessage ===
                  "syncing" && (
                  <>
                    Votre produit est bien enregistré.
                    <br />
                    Il est disponible immédiatement dans votre
                    catalogue.
                    <br />
                    La synchronisation avec le serveur est en
                    cours.
                  </>
                )}

                {successMessage ===
                  "success" && (
                  <>
                    Votre produit est bien enregistré et
                    synchronisé avec BISO-COMMERCE.
                    <br />
                    Il est maintenant disponible dans votre
                    catalogue.
                  </>
                )}

                {successMessage ===
                  "error" && (
                  <>
                    Une erreur est survenue pendant
                    l'enregistrement de votre produit.
                    <br />
                    Vérifiez les informations puis réessayez.
                  </>
                )}

                {!successMessage && (
                  <>
                    Votre produit a été enregistré avec succès.
                  </>
                )}

              </p>

              {/* INFORMATION HORS CONNEXION */}

              {(successMessage ===
                "offline" ||
                successMessage ===
                  "local") && (

                <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-3">

                  <div className="flex items-start gap-2.5">

                    <CloudOff
                      size={18}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />

                    <div>

                      <p className="text-xs font-black text-amber-800">
                        Synchronisation en attente
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-amber-700">
                        Vous pouvez continuer à travailler sans
                        connexion. Le produit sera synchronisé
                        automatiquement dès qu'Internet sera
                        disponible.
                      </p>

                    </div>

                  </div>

                </div>

              )}

              {/* SYNCHRONISATION */}

              {successMessage ===
                "syncing" && (

                <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-3">

                  <div className="flex items-center gap-2.5">

                    <Loader2
                      size={18}
                      className="animate-spin text-indigo-600"
                    />

                    <p className="text-[11px] font-bold text-indigo-700">
                      Synchronisation avec BISO-COMMERCE en cours...
                    </p>

                  </div>

                </div>

              )}

              {/* BOUTON OK */}

              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessMessage(null);
                }}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.98]"
              >

                <CheckCircle
                  size={18}
                />

                OK, compris

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

/* ============================================================
   COMPOSANT GUIDE
============================================================ */

function GuideStep({
  number,
  color,
  title,
  children,
}: {
  number: string;
  color:
    | "indigo"
    | "purple"
    | "emerald";
  title: string;
  children: React.ReactNode;
}) {
  const colorClass = {
    indigo:
      "bg-indigo-50 text-indigo-600",

    purple:
      "bg-purple-50 text-purple-600",

    emerald:
      "bg-emerald-50 text-emerald-600",
  }[color];

  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">

      <div className="mb-2.5 flex items-center gap-2.5">

        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${colorClass}`}
        >
          {number}
        </div>

        <h3 className="text-sm font-black text-slate-900">
          {title}
        </h3>

      </div>

      {children}

    </div>
  );
}

/* ============================================================
   CARTE RÉSUMÉ
============================================================ */

function SummaryCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">

      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-500">

        {icon}

        {title}

      </div>

      {children}

    </div>
  );
}