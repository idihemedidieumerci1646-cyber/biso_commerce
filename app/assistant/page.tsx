"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  Bot,
  Sparkles,
  Send,
  TrendingUp,
  Package,
  Wallet,
  AlertTriangle,
  Lightbulb,
  MessageCircle,
  BarChart3,
  Receipt,
  CreditCard,
  CheckCircle2,
  Loader2,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCcw,
  X,
} from "lucide-react";

/* ======================================================
   TYPES
====================================================== */

type Sale = {
  id: string;
  user_id?: string;
  product_name: string;
  quantity: number;
  total_sale: number;
  profit: number;
  currency: string;
  created_at: string;
};

type Product = {
  id: string;
  user_id?: string;
  name: string;
  stock: number;
  unit: string;
  currency?: string;
};

type Expense = {
  id: string | number;
  user_id?: string;
  title: string;
  amount: number;
  currency: string;
  created_at?: string;
};

type Debt = {
  id: string;
  user_id?: string;
  client_name: string;
  total_amount: number;
  paid_amount: number;
  currency?: string;
};

type Notice = {
  type: "success" | "error" | "info";
  message: string;
} | null;

/* ======================================================
   CONFIGURATION LOCALE
====================================================== */

const PRODUCTS_DB_NAME =
  "biso-commerce-products";

const PRODUCTS_STORE_NAME =
  "products";

/*
  On ne dépend pas d'une version fixe pour les autres
  bases. On utilise indexedDB.databases() lorsque disponible
  afin d'éviter les erreurs du type :

  "The requested version is less than the existing version"
  "object stores not found"
  "database connection is closing"
*/

const isBrowser =
  typeof window !== "undefined";

/* ======================================================
   OUTILS
====================================================== */

function normalizeCurrency(
  currency: string | undefined
) {
  const value = String(
    currency || ""
  ).trim().toUpperCase();

  if (
    value === "USD" ||
    value === "$"
  ) {
    return "USD";
  }

  return "FC";
}

function formatMoney(value: number) {
  return Math.round(
    Number(value || 0)
  )
    .toString()
    .replace(
      /\B(?=(\d{3})+(?!\d))/g,
      " "
    );
}

function formatMoneyWithCurrency(
  value: number,
  currency: string
) {
  return `${formatMoney(
    value
  )} ${normalizeCurrency(currency) === "USD" ? "$" : "FC"}`;
}

/* ======================================================
   INDEXED DB — OUVERTURE PRODUITS
====================================================== */

function openProductsDB(): Promise<IDBDatabase> {
  return new Promise(
    (resolve, reject) => {
      if (!isBrowser) {
        reject(
          new Error(
            "IndexedDB indisponible."
          )
        );
        return;
      }

      if (
        !("indexedDB" in window)
      ) {
        reject(
          new Error(
            "IndexedDB non supporté."
          )
        );
        return;
      }

      const request =
        indexedDB.open(
          PRODUCTS_DB_NAME
        );

      request.onsuccess = () => {
        const db =
          request.result;

        db.onversionchange = () => {
          db.close();
        };

        resolve(db);
      };

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Impossible d'ouvrir la base produits."
            )
        );
      };
    }
  );
}

/* ======================================================
   PRODUITS LOCAUX
====================================================== */

async function getLocalProducts(): Promise<
  Product[]
> {
  try {
    const db =
      await openProductsDB();

    if (
      !db.objectStoreNames.contains(
        PRODUCTS_STORE_NAME
      )
    ) {
      db.close();
      return [];
    }

    return await new Promise(
      (resolve, reject) => {
        let completed = false;

        const transaction =
          db.transaction(
            PRODUCTS_STORE_NAME,
            "readonly"
          );

        const store =
          transaction.objectStore(
            PRODUCTS_STORE_NAME
          );

        const request =
          store.getAll();

        request.onsuccess =
          () => {
            completed = true;

            const rows =
              Array.isArray(
                request.result
              )
                ? request.result
                : [];

            const products =
              rows.map(
                (item: any) => ({
                  id: String(
                    item?.id || ""
                  ),

                  user_id:
                    item?.user_id
                      ? String(
                          item.user_id
                        )
                      : undefined,

                  name:
                    String(
                      item?.name ||
                        item?.product_name ||
                        "Produit"
                    ),

                  stock:
                    Number(
                      item?.stock || 0
                    ),

                  unit:
                    String(
                      item?.unit ||
                        "unité"
                    ),

                  currency:
                    item?.currency,
                })
              );

            resolve(
              products
            );
          };

        request.onerror =
          () => {
            if (!completed) {
              reject(
                request.error
              );
            }
          };

        transaction.oncomplete =
          () => {
            try {
              db.close();
            } catch {}
          };

        transaction.onerror =
          () => {
            try {
              db.close();
            } catch {}

            if (
              !completed
            ) {
              reject(
                transaction.error
              );
            }
          };

        transaction.onabort =
          () => {
            try {
              db.close();
            } catch {}

            if (
              !completed
            ) {
              reject(
                transaction.error ||
                  new Error(
                    "Transaction interrompue."
                  )
              );
            }
          };
      }
    );
  } catch (error) {
    console.error(
      "Lecture produits locaux :",
      error
    );

    return [];
  }
}

/* ======================================================
   TROUVER UNE BASE PAR NOM DE STORE
====================================================== */

async function findDatabaseContainingStore(
  possibleStores: string[]
): Promise<string | null> {
  if (
    !isBrowser ||
    !("indexedDB" in window)
  ) {
    return null;
  }

  /*
    indexedDB.databases() n'est pas disponible
    dans tous les navigateurs.
  */

  if (
    typeof indexedDB.databases !==
    "function"
  ) {
    return null;
  }

  try {
    const databases =
      await indexedDB.databases();

    for (
      const database of databases
    ) {
      if (!database.name) {
        continue;
      }

      try {
        const request =
          indexedDB.open(
            database.name
          );

        const db =
          await new Promise<IDBDatabase | null>(
            (resolve) => {
              request.onsuccess =
                () => {
                  resolve(
                    request.result
                  );
                };

              request.onerror =
                () => {
                  resolve(
                    null
                  );
                };

              request.onblocked =
                () => {
                  resolve(
                    null
                  );
                };
            }
          );

        if (!db) {
          continue;
        }

        const hasStore =
          possibleStores.some(
            (storeName) =>
              db.objectStoreNames.contains(
                storeName
              )
          );

        db.close();

        if (hasStore) {
          return database.name;
        }
      } catch {
        continue;
      }
    }
  } catch (error) {
    console.error(
      "Recherche bases locales :",
      error
    );
  }

  return null;
}

/* ======================================================
   LIRE UN STORE DYNAMIQUE
====================================================== */

async function readDynamicStore<T>(
  databaseName: string,
  storeName: string
): Promise<T[]> {
  return new Promise(
    (resolve) => {
      if (
        !isBrowser
      ) {
        resolve([]);
        return;
      }

      const request =
        indexedDB.open(
          databaseName
        );

      request.onsuccess =
        () => {
          const db =
            request.result;

          if (
            !db.objectStoreNames.contains(
              storeName
            )
          ) {
            db.close();
            resolve([]);
            return;
          }

          try {
            const transaction =
              db.transaction(
                storeName,
                "readonly"
              );

            const store =
              transaction.objectStore(
                storeName
              );

            const getAllRequest =
              store.getAll();

            getAllRequest.onsuccess =
              () => {
                const result =
                  Array.isArray(
                    getAllRequest.result
                  )
                    ? getAllRequest.result
                    : [];

                try {
                  db.close();
                } catch {}

                resolve(
                  result as T[]
                );
              };

            getAllRequest.onerror =
              () => {
                try {
                  db.close();
                } catch {}

                resolve([]);
              };

            transaction.onerror =
              () => {
                try {
                  db.close();
                } catch {}

                resolve([]);
              };

            transaction.onabort =
              () => {
                try {
                  db.close();
                } catch {}

                resolve([]);
              };
          } catch {
            try {
              db.close();
            } catch {}

            resolve([]);
          }
        };

      request.onerror =
        () => {
          resolve([]);
        };

      request.onblocked =
        () => {
          resolve([]);
        };
    }
  );
}

/* ======================================================
   VENTES LOCALES
====================================================== */

async function getLocalSales(
  userId: string | null
): Promise<Sale[]> {
  try {
    const databaseName =
      await findDatabaseContainingStore(
        [
          "sales",
          "sale",
          "ventes",
        ]
      );

    if (!databaseName) {
      return [];
    }

    let storeName =
      "sales";

    /*
      Vérification des noms possibles.
    */

    const candidateStores = [
      "sales",
      "sale",
      "ventes",
    ];

    for (
      const candidate of candidateStores
    ) {
      const rows =
        await readDynamicStore<any>(
          databaseName,
          candidate
        );

      if (
        rows.length > 0 ||
        candidate ===
          "sales"
      ) {
        storeName =
          candidate;
        break;
      }
    }

    const rows =
      await readDynamicStore<any>(
        databaseName,
        storeName
      );

    return rows
      .map(
        (item) => ({
          id: String(
            item?.id || ""
          ),

          user_id:
            item?.user_id
              ? String(
                  item.user_id
                )
              : undefined,

          product_name:
            String(
              item?.product_name ||
                item?.productName ||
                "Produit"
            ),

          quantity:
            Number(
              item?.quantity || 0
            ),

          total_sale:
            Number(
              item?.total_sale ??
                item?.totalSale ??
                0
            ),

          profit:
            Number(
              item?.profit || 0
            ),

          currency:
            String(
              item?.currency ||
                "FC"
            ),

          created_at:
            String(
              item?.created_at ||
                new Date().toISOString()
            ),
        })
      )
      .filter(
        (sale) =>
          !userId ||
          !sale.user_id ||
          String(
            sale.user_id
          ) ===
            String(userId)
      );
  } catch (error) {
    console.error(
      "Lecture ventes locales :",
      error
    );

    return [];
  }
}

/* ======================================================
   DETTES LOCALES
====================================================== */

async function getLocalDebts(
  userId: string | null
): Promise<Debt[]> {
  try {
    const databaseName =
      await findDatabaseContainingStore(
        [
          "debts",
          "debt",
        ]
      );

    if (!databaseName) {
      return [];
    }

    const storeName =
      (
        await readDynamicStore<any>(
          databaseName,
          "debts"
        )
      ).length >= 0
        ? "debts"
        : "debt";

    let rows =
      await readDynamicStore<any>(
        databaseName,
        storeName
      );

    if (
      rows.length === 0 &&
      storeName ===
        "debts"
    ) {
      rows =
        await readDynamicStore<any>(
          databaseName,
          "debt"
        );
    }

    return rows
      .map(
        (item) => ({
          id: String(
            item?.id || ""
          ),

          user_id:
            item?.user_id
              ? String(
                  item.user_id
                )
              : undefined,

          client_name:
            String(
              item?.client_name ||
                item?.clientName ||
                "Client"
            ),

          total_amount:
            Number(
              item?.total_amount ||
                item?.totalAmount ||
                0
            ),

          paid_amount:
            Number(
              item?.paid_amount ||
                item?.paidAmount ||
                0
            ),

          currency:
            String(
              item?.currency ||
                "FC"
            ),
        })
      )
      .filter(
        (debt) =>
          !userId ||
          !debt.user_id ||
          String(
            debt.user_id
          ) ===
            String(userId)
      );
  } catch (error) {
    console.error(
      "Lecture dettes locales :",
      error
    );

    return [];
  }
}

/* ======================================================
   DÉPENSES LOCALES
====================================================== */

async function getLocalExpenses(
  userId: string | null
): Promise<Expense[]> {
  try {
    const databaseName =
      await findDatabaseContainingStore(
        [
          "expenses",
          "expense",
          "depenses",
        ]
      );

    if (!databaseName) {
      return [];
    }

    const candidates = [
      "expenses",
      "expense",
      "depenses",
    ];

    let rows: any[] =
      [];

    let selectedStore =
      "";

    for (
      const candidate of candidates
    ) {
      const test =
        await readDynamicStore<any>(
          databaseName,
          candidate
        );

      if (
        test.length > 0
      ) {
        rows =
          test;
        selectedStore =
          candidate;
        break;
      }
    }

    if (
      !selectedStore
    ) {
      rows =
        await readDynamicStore<any>(
          databaseName,
          "expenses"
        );
    }

    return rows
      .map(
        (item) => ({
          id:
            item?.id ??
            String(
              Math.random()
            ),

          user_id:
            item?.user_id
              ? String(
                  item.user_id
                )
              : undefined,

          title:
            String(
              item?.title ||
                item?.name ||
                item?.description ||
                "Dépense"
            ),

          amount:
            Number(
              item?.amount || 0
            ),

          currency:
            String(
              item?.currency ||
                "FC"
            ),

          created_at:
            item?.created_at,
        })
      )
      .filter(
        (expense) =>
          !userId ||
          !expense.user_id ||
          String(
            expense.user_id
          ) ===
            String(userId)
      );
  } catch (error) {
    console.error(
      "Lecture dépenses locales :",
      error
    );

    return [];
  }
}

/* ======================================================
   ASSISTANT PAGE
====================================================== */

export default function AssistantPage() {
  const [sales, setSales] =
    useState<Sale[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [debts, setDebts] =
    useState<Debt[]>([]);

  const [question, setQuestion] =
    useState("");

  const [answer, setAnswer] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [loadingData, setLoadingData] =
    useState(true);

  const [isOnline, setIsOnline] =
    useState(true);

  const [syncing, setSyncing] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice>(null);

  /* ====================================================
     CONNEXION
  ==================================================== */

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    setIsOnline(
      navigator.onLine
    );

    const handleOnline =
      () => {
        setIsOnline(true);

        /*
          On recharge les données
          depuis Supabase.
        */

        void loadData();
      };

    const handleOffline =
      () => {
        setIsOnline(false);

        /*
          Relecture locale immédiate.
        */

        void loadData();
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
  }, []);

  /* ====================================================
     CHARGEMENT INITIAL
  ==================================================== */

  useEffect(() => {
    void loadData();
  }, []);

  /* ====================================================
     CHARGER LES DONNÉES
  ==================================================== */

  async function loadData() {
    setLoadingData(true);
    setSyncing(
      isBrowser &&
        navigator.onLine
    );

    try {
      const savedUserId =
        isBrowser
          ? localStorage.getItem(
              "user_id"
            )
          : null;

      const savedPhone =
        isBrowser
          ? localStorage.getItem(
              "phone"
            )
          : null;

      let userId =
        savedUserId;

      /*
        --------------------------------------------------
        1. DONNÉES LOCALES IMMÉDIATES
        --------------------------------------------------
      */

      const [
        localProducts,
        localSales,
        localExpenses,
        localDebts,
      ] = await Promise.all([
        getLocalProducts(),

        getLocalSales(
          userId
        ),

        getLocalExpenses(
          userId
        ),

        getLocalDebts(
          userId
        ),
      ]);

      /*
        On affiche les données locales
        immédiatement si elles existent.
      */

      if (
        localProducts.length
      ) {
        setProducts(
          localProducts
        );
      }

      if (
        localSales.length
      ) {
        setSales(
          localSales
        );
      }

      if (
        localExpenses.length
      ) {
        setExpenses(
          localExpenses
        );
      }

      if (
        localDebts.length
      ) {
        setDebts(
          localDebts
        );
      }

      /*
        --------------------------------------------------
        2. SI HORS LIGNE
        --------------------------------------------------
      */

      if (
        !isBrowser ||
        !navigator.onLine
      ) {
        setNotice({
          type: "info",
          message:
            "Assistant Biso fonctionne hors connexion avec les données disponibles sur cet appareil.",
        });

        return;
      }

      /*
        --------------------------------------------------
        3. TROUVER L'UTILISATEUR
        --------------------------------------------------
      */

      if (
        !userId &&
        savedPhone
      ) {
        try {
          const {
            data: user,
            error,
          } = await supabase
            .from("users")
            .select("id")
            .eq(
              "phone",
              savedPhone
            )
            .single();

          if (
            !error &&
            user?.id
          ) {
            userId =
              String(
                user.id
              );

            localStorage.setItem(
              "user_id",
              userId
            );
          }
        } catch (
          userError
        ) {
          console.error(
            "Erreur utilisateur assistant :",
            userError
          );
        }
      }

      if (
        !userId
      ) {
        setNotice({
          type: "error",
          message:
            "Impossible d'identifier votre compte.",
        });

        return;
      }

      /*
        --------------------------------------------------
        4. SUPABASE
        --------------------------------------------------
      */

      const [
        salesResult,
        productsResult,
        expensesResult,
        debtsResult,
      ] = await Promise.all([
        supabase
          .from("sales")
          .select("*")
          .eq(
            "user_id",
            userId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          ),

        supabase
          .from("products")
          .select("*")
          .eq(
            "user_id",
            userId
          )
          .order(
            "name"
          ),

        supabase
          .from("expenses")
          .select("*")
          .eq(
            "user_id",
            userId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          ),

        supabase
          .from("debts")
          .select("*")
          .eq(
            "user_id",
            userId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          ),
      ]);

      if (
        !salesResult.error
      ) {
        setSales(
          (salesResult.data ||
            []) as Sale[]
        );
      }

      if (
        !productsResult.error
      ) {
        setProducts(
          (productsResult.data ||
            []) as Product[]
        );
      }

      if (
        !expensesResult.error
      ) {
        setExpenses(
          (expensesResult.data ||
            []) as Expense[]
        );
      }

      if (
        !debtsResult.error
      ) {
        setDebts(
          (debtsResult.data ||
            []) as Debt[]
        );
      }

      setNotice({
        type: "success",
        message:
          "Les données de votre commerce sont à jour.",
      });
    } catch (error) {
      console.error(
        "Erreur chargement assistant :",
        error
      );

      /*
        Même si Supabase échoue,
        on garde les données locales.
      */

      setNotice({
        type: "info",
        message:
          "Impossible de contacter le serveur. Assistant Biso utilise les données disponibles localement.",
      });
    } finally {
      setLoadingData(false);
      setSyncing(false);
    }
  }

  /* ====================================================
     STATISTIQUES
  ==================================================== */

  const stockFaibleCount =
    useMemo(
      () =>
        products.filter(
          (p) =>
            Number(
              p.stock
            ) <= 5
        ).length,
      [products]
    );

  const remainingDebtCount =
    useMemo(
      () =>
        debts.filter(
          (d) =>
            Number(
              d.total_amount ||
                0
            ) -
              Number(
                d.paid_amount ||
                  0
              ) >
            0
        ).length,
      [debts]
    );

  /* ====================================================
     ANALYSE VENTES
  ==================================================== */

  function analyseCommerce(
    type: string
  ) {
    let totalVentesFc =
      0;

    let totalVentesUsd =
      0;

    let totalProfitFc =
      0;

    let totalProfitUsd =
      0;

    let totalDepensesFc =
      0;

    let totalDepensesUsd =
      0;

    let totalDettesFc =
      0;

    let totalDettesUsd =
      0;

    sales.forEach(
      (sale) => {
        const currency =
          normalizeCurrency(
            sale.currency
          );

        const amount =
          Number(
            sale.total_sale || 0
          );

        const profit =
          Number(
            sale.profit || 0
          );

        if (
          currency ===
          "USD"
        ) {
          totalVentesUsd +=
            amount;

          totalProfitUsd +=
            profit;
        } else {
          totalVentesFc +=
            amount;

          totalProfitFc +=
            profit;
        }
      }
    );

    expenses.forEach(
      (expense) => {
        const currency =
          normalizeCurrency(
            expense.currency
          );

        const amount =
          Number(
            expense.amount ||
              0
          );

        if (
          currency ===
          "USD"
        ) {
          totalDepensesUsd +=
            amount;
        } else {
          totalDepensesFc +=
            amount;
        }
      }
    );

    debts.forEach(
      (debt) => {
        const currency =
          normalizeCurrency(
            debt.currency
          );

        const remaining =
          Math.max(
            0,
            Number(
              debt.total_amount ||
                0
            ) -
              Number(
                debt.paid_amount ||
                  0
              )
          );

        if (
          currency ===
          "USD"
        ) {
          totalDettesUsd +=
            remaining;
        } else {
          totalDettesFc +=
            remaining;
        }
      }
    );

    const stockFaible =
      products.filter(
        (p) =>
          Number(
            p.stock
          ) <= 5
      );

    const produits: Record<
      string,
      number
    > = {};

    sales.forEach(
      (sale) => {
        const key =
          sale.product_name ||
          "Produit";

        produits[key] =
          (produits[key] ||
            0) +
          Number(
            sale.quantity || 0
          );
      }
    );

    const meilleurProduit =
      Object.entries(
        produits
      )
        .sort(
          (a, b) =>
            b[1] - a[1]
        )[0];

    /* ==================================================
       VENTES
    ================================================== */

    if (
      type ===
      "ventes"
    ) {
      return `
📊 ANALYSE DES VENTES

💰 Chiffre d'affaires FC
${formatMoney(totalVentesFc)} FC

💵 Chiffre d'affaires USD
${formatMoney(totalVentesUsd)} $

🛒 Nombre de ventes
${sales.length}

🏆 Produit le plus vendu
${meilleurProduit?.[0] || "Aucun produit vendu"}

📦 Quantité du produit principal
${meilleurProduit?.[1] || 0}

💡 CONSEIL

Continuez à développer les produits qui attirent le plus vos clients.
      `.trim();
    }

    /* ==================================================
       BÉNÉFICE
    ================================================== */

    if (
      type ===
      "benefice"
    ) {
      return `
📈 ANALYSE DU BÉNÉFICE

🇨🇩 Bénéfice FC
${formatMoney(totalProfitFc)} FC

🇺🇸 Bénéfice USD
${formatMoney(totalProfitUsd)} $

💰 Ventes FC
${formatMoney(totalVentesFc)} FC

💵 Ventes USD
${formatMoney(totalVentesUsd)} $

💸 Dépenses FC
${formatMoney(totalDepensesFc)} FC

💵 Dépenses USD
${formatMoney(totalDepensesUsd)} $

💡 CONSEIL

Favorisez les produits possédant une bonne marge et surveillez régulièrement vos dépenses.
      `.trim();
    }

    /* ==================================================
       STOCK
    ================================================== */

    if (
      type ===
      "stock"
    ) {
      return `
📦 ANALYSE DU STOCK

⚠️ Produits en alerte
${stockFaible.length}

${
  stockFaible.length
    ? stockFaible
        .map(
          (p) =>
            `• ${p.name} : ${p.stock} ${p.unit}`
        )
        .join("\n")
    : "✅ Aucun produit en rupture ou en stock faible."
}

💡 CONSEIL

Réapprovisionnez les produits faibles avant de perdre des ventes.
      `.trim();
    }

    /* ==================================================
       DETTES
    ================================================== */

    if (
      type ===
      "dettes"
    ) {
      return `
💳 ANALYSE DES DETTES CLIENTS

🇨🇩 Montant restant FC
${formatMoney(totalDettesFc)} FC

🇺🇸 Montant restant USD
${formatMoney(totalDettesUsd)} $

👥 Clients débiteurs
${remainingDebtCount}

💡 CONSEIL

Relancez en priorité les clients ayant les plus grandes dettes afin d'améliorer votre trésorerie.
      `.trim();
    }

    /* ==================================================
       GLOBAL
    ================================================== */

    return `
📊 RAPPORT GLOBAL BISO-COMMERCE

🇨🇩 Chiffre d'affaires FC
${formatMoney(totalVentesFc)} FC

🇺🇸 Chiffre d'affaires USD
${formatMoney(totalVentesUsd)} $

📈 Bénéfice FC
${formatMoney(totalProfitFc)} FC

📈 Bénéfice USD
${formatMoney(totalProfitUsd)} $

💸 Dépenses FC
${formatMoney(totalDepensesFc)} FC

💸 Dépenses USD
${formatMoney(totalDepensesUsd)} $

📦 Nombre de produits
${products.length}

⚠️ Stock faible
${stockFaible.length}

💳 Dettes restantes FC
${formatMoney(totalDettesFc)} FC

💳 Dettes restantes USD
${formatMoney(totalDettesUsd)} $

🛒 Nombre de ventes
${sales.length}

🔎 PRIORITÉS

1️⃣ Surveiller les produits en stock faible.

2️⃣ Suivre régulièrement les dettes clients.

3️⃣ Favoriser les produits rentables.

4️⃣ Contrôler les dépenses du commerce.
    `.trim();
  }

  /* ====================================================
     TOP PRODUITS
  ==================================================== */

  function analyseTopProduits() {
    const classement: Record<
      string,
      number
    > = {};

    sales.forEach(
      (sale) => {
        const key =
          sale.product_name ||
          "Produit";

        classement[key] =
          (classement[key] ||
            0) +
          Number(
            sale.quantity ||
              0
          );
      }
    );

    const top =
      Object.entries(
        classement
      )
        .sort(
          (a, b) =>
            b[1] - a[1]
        )
        .slice(0, 5);

    return `
🏆 TOP PRODUITS

${
  top.length ===
  0
    ? "Aucune vente disponible."
    : top
        .map(
          (
            item,
            index
          ) =>
            `${index + 1}️⃣ ${item[0]} : ${item[1]} vendu(s)`
        )
        .join("\n")
}

💡 CONSEIL

Mettez davantage en avant les produits qui se vendent rapidement.
    `.trim();
  }

  /* ====================================================
     DÉPENSES
  ==================================================== */

  function analyseDepenses() {
    let totalFc = 0;
    let totalUsd = 0;

    expenses.forEach(
      (expense) => {
        const amount =
          Number(
            expense.amount ||
              0
          );

        if (
          normalizeCurrency(
            expense.currency
          ) ===
          "USD"
        ) {
          totalUsd +=
            amount;
        } else {
          totalFc +=
            amount;
        }
      }
    );

    return `
💸 ANALYSE DES DÉPENSES

🇨🇩 Total dépenses FC
${formatMoney(totalFc)} FC

🇺🇸 Total dépenses USD
${formatMoney(totalUsd)} $

🧾 Nombre de dépenses
${expenses.length}

💡 CONSEIL

Contrôlez régulièrement vos sorties d'argent afin de protéger vos bénéfices.
    `.trim();
  }

  /* ====================================================
     CONSEILS
  ==================================================== */

  function analyseConseils() {
    const faible =
      products.filter(
        (p) =>
          Number(
            p.stock
          ) <= 5
      );

    return `
🚀 CONSEILS POUR VOTRE COMMERCE

${
  faible.length
    ? "⚠️ Certains produits doivent être réapprovisionnés."
    : "✅ Votre stock est actuellement bien surveillé."
}

💳 Suivez régulièrement les dettes clients.

📈 Analysez les produits qui rapportent le plus.

💰 Réinvestissez une partie des bénéfices.

📊 Consultez vos rapports chaque semaine.

💡 Une bonne gestion du stock et de la trésorerie permet de mieux protéger les bénéfices.
    `.trim();
  }

  /* ====================================================
     QUESTION ASSISTANT
  ==================================================== */

  async function askAssistant(
    text?: string
  ) {
    const userQuestion =
      (
        text ||
        question
      )
        .toLowerCase()
        .trim();

    if (
      !userQuestion
    ) {
      return;
    }

    setLoading(true);
    setNotice(null);

    /*
      Petite attente visuelle,
      sans bloquer longtemps.
    */

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          220
        )
    );

    let result =
      "";

    /* ==================================================
       TOP PRODUITS
    ================================================== */

    if (
      userQuestion.includes(
        "produit le plus vendu"
      ) ||
      userQuestion.includes(
        "plus vendu"
      ) ||
      userQuestion.includes(
        "top produit"
      ) ||
      userQuestion.includes(
        "top produits"
      ) ||
      userQuestion.includes(
        "produit populaire"
      ) ||
      userQuestion.includes(
        "vend le plus"
      ) ||
      userQuestion.includes(
        "meilleur produit"
      )
    ) {
      result =
        analyseTopProduits();
    }

    /* ==================================================
       VENTES
    ================================================== */

    else if (
      userQuestion.includes(
        "vente"
      ) ||
      userQuestion.includes(
        "vendu"
      ) ||
      userQuestion.includes(
        "chiffre"
      ) ||
      userQuestion.includes(
        " ca "
      ) ||
      userQuestion ===
        "ca" ||
      userQuestion.includes(
        "revenu"
      ) ||
      userQuestion.includes(
        "aujourd'hui"
      ) ||
      userQuestion.includes(
        "aujourd’hui"
      )
    ) {
      result =
        analyseCommerce(
          "ventes"
        );
    }

    /* ==================================================
       BÉNÉFICE
    ================================================== */

    else if (
      userQuestion.includes(
        "bénéfice"
      ) ||
      userQuestion.includes(
        "benefice"
      ) ||
      userQuestion.includes(
        "profit"
      ) ||
      userQuestion.includes(
        "gain"
      ) ||
      userQuestion.includes(
        "marge"
      ) ||
      userQuestion.includes(
        "rentable"
      ) ||
      userQuestion.includes(
        "argent gagné"
      ) ||
      userQuestion.includes(
        "argent gagne"
      )
    ) {
      result =
        analyseCommerce(
          "benefice"
        );
    }

    /* ==================================================
       STOCK
    ================================================== */

    else if (
      userQuestion.includes(
        "stock"
      ) ||
      userQuestion.includes(
        "rupture"
      ) ||
      userQuestion.includes(
        "manque"
      ) ||
      userQuestion.includes(
        "vide"
      ) ||
      userQuestion.includes(
        "reste"
      ) ||
      userQuestion.includes(
        "disponible"
      ) ||
      userQuestion.includes(
        "acheter"
      ) ||
      userQuestion.includes(
        "réapprovisionner"
      ) ||
      userQuestion.includes(
        "recommander"
      )
    ) {
      result =
        analyseCommerce(
          "stock"
        );
    }

    /* ==================================================
       DETTES
    ================================================== */

    else if (
      userQuestion.includes(
        "dette"
      ) ||
      userQuestion.includes(
        "doit"
      ) ||
      userQuestion.includes(
        "client"
      ) ||
      userQuestion.includes(
        "impayé"
      ) ||
      userQuestion.includes(
        "impaye"
      ) ||
      userQuestion.includes(
        "crédit"
      ) ||
      userQuestion.includes(
        "credit"
      ) ||
      userQuestion.includes(
        "argent dû"
      ) ||
      userQuestion.includes(
        "argent du"
      ) ||
      userQuestion.includes(
        "qui me doit"
      )
    ) {
      result =
        analyseCommerce(
          "dettes"
        );
    }

    /* ==================================================
       DÉPENSES
    ================================================== */

    else if (
      userQuestion.includes(
        "dépense"
      ) ||
      userQuestion.includes(
        "depense"
      ) ||
      userQuestion.includes(
        "dépensé"
      )
    ) {
      result =
        analyseDepenses();
    }

    /* ==================================================
       CONSEILS
    ================================================== */

    else if (
      userQuestion.includes(
        "conseil"
      ) ||
      userQuestion.includes(
        "aide"
      ) ||
      userQuestion.includes(
        "améliorer"
      ) ||
      userQuestion.includes(
        "ameliorer"
      )
    ) {
      result =
        analyseConseils();
    }

    /* ==================================================
       RAPPORT GLOBAL
    ================================================== */

    else if (
      userQuestion.includes(
        "résumé"
      ) ||
      userQuestion.includes(
        "resume"
      ) ||
      userQuestion.includes(
        "rapport"
      ) ||
      userQuestion.includes(
        "commerce"
      )
    ) {
      result =
        analyseCommerce(
          "global"
        );
    }

    /* ==================================================
       AJOUT PRODUIT
    ================================================== */

    else if (
      userQuestion.includes(
        "ajouter un produit"
      ) ||
      userQuestion.includes(
        "comment ajouter"
      ) ||
      userQuestion.includes(
        "créer un produit"
      ) ||
      userQuestion.includes(
        "creer un produit"
      ) ||
      userQuestion.includes(
        "nouveau produit"
      )
    ) {
      result = `
📦 AJOUTER UN PRODUIT SUR BISO-COMMERCE

1️⃣ Ouvrez le menu :

📦 Produits

Puis cliquez sur :

➕ Ajouter un produit

2️⃣ Entrez le nom du produit.

Exemples :

• Paracétamol
• Riz 25Kg
• Coca-Cola
• Savon

3️⃣ Choisissez l'unité :

✅ Pièce
✅ Carton
✅ Boîte
✅ Sachet

4️⃣ Entrez la quantité.

5️⃣ Ajoutez le prix d'achat et le prix de vente.

6️⃣ Cliquez sur :

✅ Ajouter le produit

💡 CONSEIL DU PDG

Même sans connexion Internet, votre produit peut être enregistré localement puis synchronisé automatiquement lorsque la connexion revient.
      `.trim();
    }

    /* ==================================================
       INSTALLATION
    ================================================== */

    else if (
      userQuestion.includes(
        "installer l'application"
      ) ||
      userQuestion.includes(
        "installation"
      ) ||
      userQuestion.includes(
        "installer"
      )
    ) {
      result = `
📱 INSTALLATION DE BISO-COMMERCE

🌐 Ouvrez :

https://bisocommerce.vercel.app

━━━━━━━━━━━━━━━━━━
🤖 ANDROID
━━━━━━━━━━━━━━━━━━

1️⃣ Ouvrez le lien avec Google Chrome.

2️⃣ Appuyez sur les trois points ⋮.

3️⃣ Choisissez :

📲 Installer l'application

ou

📲 Ajouter à l'écran d'accueil.

━━━━━━━━━━━━━━━━━━
🍎 IPHONE
━━━━━━━━━━━━━━━━━━

1️⃣ Ouvrez le lien avec Safari.

2️⃣ Appuyez sur Partager.

3️⃣ Choisissez :

"Sur l'écran d'accueil"

4️⃣ Appuyez sur Ajouter.

💡 ASTUCE

Après l'installation, utilisez l'icône Biso-Commerce comme une application normale.
      `.trim();
    }

    /* ==================================================
       SUPPORT
    ================================================== */

    else if (
      userQuestion.includes(
        "problème"
      ) ||
      userQuestion.includes(
        "probleme"
      ) ||
      userQuestion.includes(
        "support"
      ) ||
      userQuestion.includes(
        "question"
      )
    ) {
      result = `
🛠️ BESOIN D'ASSISTANCE ?

BISO-COMMERCE peut vous aider concernant :

✅ Installation

✅ Produits

✅ Ventes

✅ Stock

✅ Dettes

✅ Rapports

✅ Abonnement

✅ Problèmes techniques

📲 Service client WhatsApp :

+243 994 864 173

🚀 Merci d'utiliser BISO-COMMERCE.
      `.trim();
    }

    /* ==================================================
       RÉPONSE PAR DÉFAUT
    ================================================== */

    else {
      result = `
🤖 ASSISTANT BISO

Je peux analyser votre commerce à partir des données disponibles sur cet appareil.

Essayez par exemple :

• Mes ventes aujourd'hui
• Quel produit est le plus vendu ?
• Quel est mon bénéfice ?
• Quels produits sont en rupture ?
• Qui me doit de l'argent ?
• Combien ai-je dépensé ?
• Donne-moi un rapport complet
• Donne-moi des conseils
• Comment ajouter un produit ?
• Comment installer l'application ?
      `.trim();
    }

    setAnswer(
      result
    );

    setQuestion(
      ""
    );

    setLoading(
      false
    );
  }

  /* ====================================================
     QUESTIONS RAPIDES
  ==================================================== */

  const quickQuestions =
    [
      {
        label:
          "Mes ventes",
        icon: (
          <TrendingUp
            size={18}
          />
        ),
      },
      {
        label:
          "Mon bénéfice",
        icon: (
          <BarChart3
            size={18}
          />
        ),
      },
      {
        label:
          "Produit le plus vendu",
        icon: (
          <Package
            size={18}
          />
        ),
      },
      {
        label:
          "Stock faible",
        icon: (
          <AlertTriangle
            size={18}
          />
        ),
      },
      {
        label:
          "Mes dettes clients",
        icon: (
          <CreditCard
            size={18}
          />
        ),
      },
      {
        label:
          "Mes dépenses",
        icon: (
          <Receipt
            size={18}
          />
        ),
      },
      {
        label:
          "Résumé commerce",
        icon: (
          <Wallet
            size={18}
          />
        ),
      },
      {
        label:
          "Donne-moi des conseils",
        icon: (
          <Lightbulb
            size={18}
          />
        ),
      },
      {
        label:
          "Comment installer ?",
        icon: (
          <Sparkles
            size={18}
          />
        ),
      },
    ];

  /* ====================================================
     AFFICHAGE
  ==================================================== */

  return (
    <main
      className="
        min-h-screen
        w-full
        overflow-x-hidden
        bg-[#f5f7fb]
        px-4
        py-5
        pb-28
        text-slate-900
        sm:px-6
        sm:py-7
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-6xl
          space-y-5
        "
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <section
          className="
            w-full
            overflow-hidden
            rounded-[26px]
            border
            border-slate-200
            bg-white
            p-5
            shadow-[0_8px_30px_rgba(15,23,42,0.04)]
            sm:p-7
          "
        >

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">

              <div
                className="
                  shrink-0
                  rounded-2xl
                  bg-indigo-50
                  p-3
                  sm:p-4
                "
              >
                <Bot
                  size={32}
                  className="text-indigo-600 sm:h-9 sm:w-9"
                />
              </div>

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">

                  <h1
                    className="
                      text-2xl
                      font-black
                      tracking-tight
                      text-slate-900
                      sm:text-3xl
                    "
                  >
                    Assistant Biso
                  </h1>

                  <span
                    className="
                      rounded-full
                      bg-indigo-50
                      px-3
                      py-1
                      text-[11px]
                      font-black
                      text-indigo-600
                    "
                  >
                    INTELLIGENT
                  </span>

                </div>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Votre conseiller intelligent pour comprendre
                  et améliorer votre commerce.
                </p>

              </div>
            </div>

            {/* ÉTAT INTERNET */}

            <div
              className={`
                inline-flex
                w-fit
                items-center
                gap-2
                rounded-2xl
                px-3
                py-2
                text-[11px]
                font-black
                ${
                  syncing
                    ? "bg-indigo-50 text-indigo-600"
                    : isOnline
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-700"
                }
              `}
            >

              {syncing ? (
                <>
                  <RefreshCcw
                    size={15}
                    className="animate-spin"
                  />

                  Synchronisation...
                </>
              ) : isOnline ? (
                <>
                  <Cloud
                    size={15}
                  />

                  En ligne
                </>
              ) : (
                <>
                  <CloudOff
                    size={15}
                  />

                  Hors connexion
                </>
              )}

            </div>

          </div>

        </section>

        {/* ==================================================
            MESSAGE
        ================================================== */}

        {notice && (
          <div
            className={`
              flex
              items-start
              gap-3
              rounded-[24px]
              border
              p-4
              ${
                notice.type ===
                "success"
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : notice.type ===
                    "error"
                  ? "border-red-100 bg-red-50 text-red-700"
                  : "border-indigo-100 bg-indigo-50 text-indigo-700"
              }
            `}
          >

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">

              {notice.type ===
              "success" ? (
                <CheckCircle2
                  size={17}
                />
              ) : notice.type ===
                "error" ? (
                <AlertTriangle
                  size={17}
                />
              ) : (
                <WifiOff
                  size={17}
                />
              )}

            </div>

            <p className="flex-1 pt-1 text-xs font-bold leading-5 sm:text-sm">
              {notice.message}
            </p>

            <button
              type="button"
              onClick={() =>
                setNotice(null)
              }
              className="rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
            >
              <X
                size={16}
              />
            </button>

          </div>
        )}

        {/* ==================================================
            CHARGEMENT
        ================================================== */}

        {loadingData && (
          <div
            className="
              flex
              items-center
              gap-3
              rounded-[26px]
              border
              border-indigo-100
              bg-indigo-50
              p-4
              text-sm
              font-bold
              text-indigo-700
            "
          >

            <Loader2
              size={20}
              className="animate-spin"
            />

            Analyse des données de votre commerce...
          </div>
        )}

        {/* ==================================================
            STATISTIQUES
        ================================================== */}

        <section
          className="
            grid
            grid-cols-1
            gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >

          <StatCard
            title="Ventes"
            value={
              sales.length
            }
            description="Ventes enregistrées"
            icon={
              <TrendingUp
                size={23}
                className="text-indigo-600"
              />
            }
            iconClassName="bg-indigo-50"
          />

          <StatCard
            title="Produits"
            value={
              products.length
            }
            description="Produits dans le stock"
            icon={
              <Package
                size={23}
                className="text-indigo-600"
              />
            }
            iconClassName="bg-indigo-50"
          />

          <StatCard
            title="Dettes"
            value={
              remainingDebtCount
            }
            description="Clients débiteurs"
            icon={
              <CreditCard
                size={23}
                className="text-indigo-600"
              />
            }
            iconClassName="bg-indigo-50"
          />

          <StatCard
            title="Stock faible"
            value={
              stockFaibleCount
            }
            description="Produits à surveiller"
            icon={
              <AlertTriangle
                size={23}
                className="text-red-600"
              />
            }
            iconClassName="bg-red-50"
          />

        </section>

        {/* ==================================================
            QUESTIONS RAPIDES
        ================================================== */}

        <section
          className="
            w-full
            overflow-hidden
            rounded-[26px]
            border
            border-slate-200
            bg-white
            p-5
            shadow-[0_8px_30px_rgba(15,23,42,0.04)]
            sm:p-6
          "
        >

          <div className="mb-5 flex items-center gap-3">

            <div
              className="
                rounded-2xl
                bg-indigo-50
                p-2.5
              "
            >
              <Sparkles
                size={20}
                className="text-indigo-600"
              />
            </div>

            <div>

              <h2 className="font-black text-slate-900">
                Questions rapides
              </h2>

              <p className="mt-0.5 text-xs text-slate-400">
                Obtenez rapidement une analyse
              </p>

            </div>

          </div>

          <div
            className="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
              lg:grid-cols-3
            "
          >

            {quickQuestions.map(
              (item) => (
                <button
                  key={
                    item.label
                  }
                  type="button"
                  onClick={() =>
                    askAssistant(
                      item.label
                    )
                  }
                  disabled={
                    loading
                  }
                  className="
                    flex
                    min-h-[56px]
                    items-center
                    gap-3
                    rounded-2xl
                    border
                    border-slate-200
                    bg-slate-50
                    px-4
                    py-3
                    text-left
                    text-sm
                    font-bold
                    text-slate-700
                    transition
                    hover:border-indigo-200
                    hover:bg-indigo-50
                    hover:text-indigo-700
                    active:scale-[0.99]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >

                  <span
                    className="
                      flex
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-white
                      p-2
                      text-indigo-600
                      shadow-sm
                    "
                  >
                    {item.icon}
                  </span>

                  <span className="min-w-0">
                    {
                      item.label
                    }
                  </span>

                </button>
              )
            )}

          </div>

        </section>

        {/* ==================================================
            QUESTION PERSONNALISÉE
        ================================================== */}

        <section
          className="
            w-full
            overflow-hidden
            rounded-[26px]
            border
            border-slate-200
            bg-white
            p-5
            shadow-[0_8px_30px_rgba(15,23,42,0.04)]
            sm:p-6
          "
        >

          <div className="mb-5 flex items-center gap-3">

            <div
              className="
                rounded-2xl
                bg-indigo-50
                p-2.5
              "
            >
              <MessageCircle
                size={20}
                className="text-indigo-600"
              />
            </div>

            <div>

              <h2 className="font-black text-slate-900">
                Posez votre question
              </h2>

              <p className="mt-0.5 text-xs text-slate-400">
                Demandez une analyse de votre commerce
              </p>

            </div>

          </div>

          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
            "
          >

            <input
              value={
                question
              }
              onChange={(e) =>
                setQuestion(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key ===
                    "Enter" &&
                  !loading
                ) {
                  void askAssistant();
                }
              }}
              placeholder="Ex : Est-ce que mon commerce progresse ?"
              className="
                min-h-[54px]
                min-w-0
                flex-1
                rounded-2xl
                border
                border-slate-200
                bg-slate-50
                px-4
                text-sm
                font-medium
                text-slate-900
                outline-none
                transition
                placeholder:text-slate-400
                focus:border-indigo-400
                focus:bg-white
                focus:ring-4
                focus:ring-indigo-100
              "
            />

            <button
              type="button"
              onClick={() =>
                void askAssistant()
              }
              disabled={
                loading ||
                !question.trim()
              }
              className="
                flex
                min-h-[54px]
                shrink-0
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-indigo-600
                px-6
                font-black
                text-white
                shadow-sm
                transition
                hover:bg-indigo-700
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >

              {loading ? (
                <>
                  <Loader2
                    size={19}
                    className="animate-spin"
                  />

                  Analyse...
                </>
              ) : (
                <>
                  <Send
                    size={19}
                  />

                  Analyser
                </>
              )}

            </button>

          </div>

        </section>

        {/* ==================================================
            REPONSE
        ================================================== */}

        {answer && (
          <section
            className="
              w-full
              overflow-hidden
              rounded-[26px]
              border
              border-indigo-100
              bg-white
              shadow-[0_10px_35px_rgba(79,70,229,0.07)]
            "
          >

            <div
              className="
                border-b
                border-indigo-100
                bg-indigo-50/70
                p-5
                sm:p-6
              "
            >

              <div className="flex items-start gap-3">

                <div
                  className="
                    shrink-0
                    rounded-2xl
                    bg-indigo-600
                    p-3
                    shadow-sm
                  "
                >
                  <Lightbulb
                    size={22}
                    className="text-white"
                  />
                </div>

                <div className="min-w-0">

                  <div className="flex flex-wrap items-center gap-2">

                    <h2
                      className="
                        text-lg
                        font-black
                        text-slate-900
                      "
                    >
                      Analyse Assistant
                    </h2>

                    <span
                      className="
                        flex
                        items-center
                        gap-1
                        rounded-full
                        bg-green-100
                        px-2.5
                        py-1
                        text-[10px]
                        font-black
                        text-green-700
                      "
                    >
                      <CheckCircle2
                        size={12}
                      />

                      ANALYSE TERMINÉE
                    </span>

                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Voici les informations disponibles
                    concernant votre commerce.
                  </p>

                </div>

              </div>

            </div>

            <div className="p-5 sm:p-7">

              <div
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-slate-200
                  bg-slate-50
                "
              >

                <div
                  className="
                    whitespace-pre-line
                    break-words
                    p-5
                    text-[15px]
                    font-medium
                    leading-7
                    text-slate-700
                    sm:p-6
                  "
                >
                  {answer}
                </div>

              </div>

              <div
                className="
                  mt-4
                  flex
                  items-start
                  gap-3
                  rounded-2xl
                  border
                  border-indigo-100
                  bg-indigo-50/60
                  p-4
                "
              >

                {isOnline ? (
                  <Cloud
                    size={19}
                    className="
                      mt-0.5
                      shrink-0
                      text-indigo-600
                    "
                  />
                ) : (
                  <CloudOff
                    size={19}
                    className="
                      mt-0.5
                      shrink-0
                      text-amber-600
                    "
                  />
                )}

                <p className="text-xs leading-5 text-indigo-700">
                  {isOnline
                    ? "L'Assistant Biso analyse les données disponibles dans votre commerce. Les données locales sont également conservées pour permettre le travail hors connexion."
                    : "Vous êtes hors connexion. L'Assistant Biso analyse les données déjà disponibles sur cet appareil. Les nouvelles données seront prises en compte après synchronisation."}
                </p>

              </div>

            </div>

          </section>
        )}

        {/* ==================================================
            AUCUNE REPONSE
        ================================================== */}

        {!answer &&
          !loading && (
            <section
              className="
                w-full
                rounded-[26px]
                border
                border-slate-200
                bg-white
                p-8
                text-center
                shadow-[0_8px_30px_rgba(15,23,42,0.04)]
                sm:p-10
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
                  rounded-3xl
                  bg-indigo-50
                "
              >

                <Bot
                  size={30}
                  className="text-indigo-600"
                />

              </div>

              <h2
                className="
                  mt-4
                  text-lg
                  font-black
                  text-slate-900
                "
              >
                Comment puis-je vous aider ?
              </h2>

              <p
                className="
                  mx-auto
                  mt-2
                  max-w-xl
                  text-sm
                  leading-6
                  text-slate-500
                "
              >
                Posez une question ci-dessus ou utilisez
                l'une des questions rapides pour obtenir une
                analyse de votre commerce.
              </p>

            </section>
          )}

      </div>
    </main>
  );
}

/* ======================================================
   STAT CARD
====================================================== */

function StatCard({
  title,
  value,
  description,
  icon,
  iconClassName,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  iconClassName: string;
}) {
  return (
    <div
      className="
        w-full
        rounded-[26px]
        border
        border-slate-200
        bg-white
        p-5
        shadow-[0_8px_30px_rgba(15,23,42,0.04)]
      "
    >

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <p className="text-sm font-bold text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>

        </div>

        <div
          className={`
            shrink-0
            rounded-2xl
            p-3
            ${iconClassName}
          `}
        >
          {icon}
        </div>

      </div>
    </div>
  );
}