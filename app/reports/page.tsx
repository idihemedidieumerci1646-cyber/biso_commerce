"use client";

/* ======================================================================
   BISO-COMMERCE — PAGE RAPPORT
   ----------------------------------------------------------------------
   - Fonctionne avec ou sans Internet
   - Les ventes locales sont affichées immédiatement
   - Synchronisation automatique avec Supabase
   - Suppression en ligne ou hors connexion
   - PDF disponible hors connexion
   - Même structure générale du rapport
====================================================================== */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  Download,
  Search,
  Sparkles,
  Trash2,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  X,
  BarChart3,
  TrendingUp,
  Package,
  ShoppingCart,
  Wallet,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronUp,
  FileText,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  CheckCircle,
} from "lucide-react";

/* ======================================================
   TYPES
====================================================== */

type Sale = {
  id: string;
  user_id?: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  purchase_price?: number;
  selling_price?: number;
  total_sale: number;
  profit: number;
  currency: string;
  created_at: string;
};

type LocalSale = Sale & {
  user_id: string;
  synced: boolean;
};

type PendingSaleDelete = {
  id: string;
  userId: string;
  createdAt: number;
};

type DayReport = {
  fc: number;
  usd: number;
  profitFc: number;
  profitUsd: number;
  quantity: number;
};

type Notice = {
  type: "info" | "error" | "success";
  message: string;
} | null;

type SyncState =
  | "offline"
  | "online"
  | "syncing"
  | "error";

const EMPTY_DAY: DayReport = {
  fc: 0,
  usd: 0,
  profitFc: 0,
  profitUsd: 0,
  quantity: 0,
};

const PAGE_STEP = 5;

/* ======================================================
   INDEXED DB
====================================================== */

/*
  IMPORTANT :

  Cette base appartient UNIQUEMENT aux ventes.

  On utilise une version 4.
  Cela corrige notamment :
  - requested version less than existing version
  - object store not found
  - database connection is closing

  IMPORTANT :
  Aucun db.close() n'est utilisé dans les fonctions
  de lecture/écriture.
*/

const SALES_DB_NAME = "biso-commerce-sales";
const SALES_DB_VERSION = 4;

const SALES_STORE = "sales";
const SALES_DELETE_QUEUE_STORE = "sale_delete_queue";

let salesDBPromise: Promise<IDBDatabase> | null = null;

/* ======================================================
   OUVRIR LA BASE SALES
====================================================== */

function openSalesDB(): Promise<IDBDatabase> {
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

  if (salesDBPromise) {
    return salesDBPromise;
  }

  salesDBPromise = new Promise<IDBDatabase>(
    (resolve, reject) => {
      const request = indexedDB.open(
        SALES_DB_NAME,
        SALES_DB_VERSION
      );

      request.onupgradeneeded = () => {
        const db = request.result;
        const transaction =
          request.transaction;

        if (!transaction) {
          reject(
            new Error(
              "Transaction IndexedDB indisponible."
            )
          );
          return;
        }

        /* ==================================================
           STORE SALES
        ================================================== */

        let salesStore: IDBObjectStore;

        if (
          !db.objectStoreNames.contains(
            SALES_STORE
          )
        ) {
          salesStore =
            db.createObjectStore(
              SALES_STORE,
              {
                keyPath: "id",
              }
            );
        } else {
          salesStore =
            transaction.objectStore(
              SALES_STORE
            );
        }

        /* INDEX USER */

        if (
          !salesStore.indexNames.contains(
            "user_id"
          )
        ) {
          salesStore.createIndex(
            "user_id",
            "user_id",
            {
              unique: false,
            }
          );
        }

        /* INDEX CREATED_AT */

        if (
          !salesStore.indexNames.contains(
            "created_at"
          )
        ) {
          salesStore.createIndex(
            "created_at",
            "created_at",
            {
              unique: false,
            }
          );
        }

        /* INDEX SYNCED */

        if (
          !salesStore.indexNames.contains(
            "synced"
          )
        ) {
          salesStore.createIndex(
            "synced",
            "synced",
            {
              unique: false,
            }
          );
        }

        /* INDEX PRODUCT */

        if (
          !salesStore.indexNames.contains(
            "product_id"
          )
        ) {
          salesStore.createIndex(
            "product_id",
            "product_id",
            {
              unique: false,
            }
          );
        }

        /* ==================================================
           STORE FILE SUPPRESSION
        ================================================== */

        let deleteStore: IDBObjectStore;

        if (
          !db.objectStoreNames.contains(
            SALES_DELETE_QUEUE_STORE
          )
        ) {
          deleteStore =
            db.createObjectStore(
              SALES_DELETE_QUEUE_STORE,
              {
                keyPath: "id",
              }
            );
        } else {
          deleteStore =
            transaction.objectStore(
              SALES_DELETE_QUEUE_STORE
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

        db.onversionchange = () => {
          db.close();
          salesDBPromise = null;
        };

        resolve(db);
      };

      request.onerror = () => {
        salesDBPromise = null;

        reject(
          request.error ||
            new Error(
              "Impossible d'ouvrir la base locale des ventes."
            )
        );
      };

      request.onblocked = () => {
        console.warn(
          "La base locale des ventes est bloquée. Fermez les autres onglets BISO-COMMERCE."
        );
      };
    }
  );

  return salesDBPromise;
}

/* ======================================================
   MESSAGE ERREUR
====================================================== */

function getErrorMessage(
  error: unknown
): string {
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
    };

    if (e.message) return e.message;
    if (e.details) return e.details;
    if (e.hint) return e.hint;
    if (e.code) return `Erreur (${e.code})`;

    try {
      const json =
        JSON.stringify(error);

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

/* ======================================================
   USER ID
====================================================== */

function getStoredUserId(): string | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  const userId =
    localStorage.getItem("user_id");

  return userId
    ? String(userId)
    : null;
}

/* ======================================================
   NORMALISER UNE VENTE
====================================================== */

function normalizeSale(
  sale: Partial<Sale> & {
    id: string;
    product_name?: string | null;
    quantity?: number | string;
    total_sale?: number | string;
    profit?: number | string;
    currency?: string | null;
    created_at: string;
    user_id?: string | null;
    synced?: boolean;
  }
): LocalSale {
  return {
    id: String(sale.id),

    user_id:
      sale.user_id
        ? String(sale.user_id)
        : "",

    product_id:
      sale.product_id
        ? String(sale.product_id)
        : null,

    product_name:
      sale.product_name || "Produit inconnu",

    quantity:
      Number(sale.quantity || 0),

    purchase_price:
      Number(
        sale.purchase_price || 0
      ),

    selling_price:
      Number(
        sale.selling_price || 0
      ),

    total_sale:
      Number(sale.total_sale || 0),

    profit:
      Number(sale.profit || 0),

    currency:
      String(sale.currency || "FC"),

    created_at:
      sale.created_at,

    synced:
      sale.synced === true,
  };
}

/* ======================================================
   LIRE VENTES LOCALES
====================================================== */

async function getLocalSales(
  userId: string
): Promise<LocalSale[]> {
  const db =
    await openSalesDB();

  return new Promise(
    (resolve, reject) => {
      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            SALES_STORE,
            "readonly"
          );
      } catch (error) {
        reject(error);
        return;
      }

      const store =
        transaction.objectStore(
          SALES_STORE
        );

      const request =
        store.getAll();

      request.onsuccess = () => {
        const all =
          (request.result ||
            []) as LocalSale[];

        const result =
          all.filter(
            (sale) =>
              String(
                sale.user_id || ""
              ) ===
              String(userId)
          );

        result.sort(
          (a, b) =>
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
        );

        resolve(result);
      };

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Impossible de lire les ventes locales."
            )
        );
      };
    }
  );
}

/* ======================================================
   ENREGISTRER UNE VENTE LOCALE
====================================================== */

async function saveLocalSale(
  sale: LocalSale
): Promise<void> {
  const db =
    await openSalesDB();

  return new Promise(
    (resolve, reject) => {
      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            SALES_STORE,
            "readwrite"
          );
      } catch (error) {
        reject(error);
        return;
      }

      transaction
        .objectStore(
          SALES_STORE
        )
        .put(sale);

      transaction.oncomplete =
        () => resolve();

      transaction.onerror =
        () =>
          reject(
            transaction.error ||
              new Error(
                "Impossible d'enregistrer la vente localement."
              )
          );

      transaction.onabort =
        () =>
          reject(
            transaction.error ||
              new Error(
                "L'enregistrement local a été interrompu."
              )
          );
    }
  );
}

/* ======================================================
   ENREGISTRER PLUSIEURS VENTES
====================================================== */

async function saveLocalSales(
  sales: LocalSale[]
): Promise<void> {
  if (!sales.length) {
    return;
  }

  const db =
    await openSalesDB();

  return new Promise(
    (resolve, reject) => {
      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            SALES_STORE,
            "readwrite"
          );
      } catch (error) {
        reject(error);
        return;
      }

      const store =
        transaction.objectStore(
          SALES_STORE
        );

      for (const sale of sales) {
        store.put(sale);
      }

      transaction.oncomplete =
        () => resolve();

      transaction.onerror =
        () =>
          reject(
            transaction.error ||
              new Error(
                "Impossible de sauvegarder les ventes locales."
              )
          );
    }
  );
}

/* ======================================================
   SUPPRIMER VENTE LOCALE
====================================================== */

async function removeLocalSale(
  saleId: string
): Promise<void> {
  const db =
    await openSalesDB();

  return new Promise(
    (resolve, reject) => {
      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            SALES_STORE,
            "readwrite"
          );
      } catch (error) {
        reject(error);
        return;
      }

      transaction
        .objectStore(
          SALES_STORE
        )
        .delete(saleId);

      transaction.oncomplete =
        () => resolve();

      transaction.onerror =
        () =>
          reject(
            transaction.error ||
              new Error(
                "Impossible de supprimer la vente localement."
              )
          );
    }
  );
}

/* ======================================================
   FILE SUPPRESSION
====================================================== */

async function getSaleDeleteQueue(): Promise<
  PendingSaleDelete[]
> {
  const db =
    await openSalesDB();

  return new Promise(
    (resolve, reject) => {
      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            SALES_DELETE_QUEUE_STORE,
            "readonly"
          );
      } catch (error) {
        reject(error);
        return;
      }

      const request =
        transaction
          .objectStore(
            SALES_DELETE_QUEUE_STORE
          )
          .getAll();

      request.onsuccess = () => {
        resolve(
          (request.result ||
            []) as PendingSaleDelete[]
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

/* ======================================================
   AJOUTER SUPPRESSION
====================================================== */

async function addSaleDeleteToQueue(
  item: PendingSaleDelete
): Promise<void> {
  const db =
    await openSalesDB();

  return new Promise(
    (resolve, reject) => {
      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            SALES_DELETE_QUEUE_STORE,
            "readwrite"
          );
      } catch (error) {
        reject(error);
        return;
      }

      transaction
        .objectStore(
          SALES_DELETE_QUEUE_STORE
        )
        .put(item);

      transaction.oncomplete =
        () => resolve();

      transaction.onerror =
        () =>
          reject(
            transaction.error ||
              new Error(
                "Impossible d'ajouter la suppression à la file."
              )
          );
    }
  );
}

/* ======================================================
   RETIRER SUPPRESSION DE LA FILE
====================================================== */

async function removeSaleDeleteFromQueue(
  saleId: string
): Promise<void> {
  const db =
    await openSalesDB();

  return new Promise(
    (resolve, reject) => {
      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            SALES_DELETE_QUEUE_STORE,
            "readwrite"
          );
      } catch (error) {
        reject(error);
        return;
      }

      transaction
        .objectStore(
          SALES_DELETE_QUEUE_STORE
        )
        .delete(saleId);

      transaction.oncomplete =
        () => resolve();

      transaction.onerror =
        () =>
          reject(
            transaction.error ||
              new Error(
                "Impossible de retirer la suppression de la file."
              )
          );
    }
  );
}

/* ======================================================
   FORMATS
====================================================== */

const formatMoney = (
  value: number
) => {
  const number =
    Math.round(
      Number(value || 0)
    );

  return number
    .toString()
    .replace(
      /\B(?=(\d{3})+(?!\d))/g,
      " "
    );
};

const getLocalDate = (
  date: Date
) => {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const prettyDate = (
  value: string
) => {
  if (!value) return "";

  const [y, m, d] =
    value.split("-");

  return `${d}/${m}/${y}`;
};

const isFC = (
  currency: string
) =>
  String(currency || "")
    .trim()
    .toUpperCase() === "FC";

const isUSD = (
  currency: string
) => {
  const value =
    String(currency || "")
      .trim()
      .toUpperCase();

  return (
    value === "$" ||
    value === "USD"
  );
};

const cleanPDF = (
  text: string
) =>
  String(text || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^\x20-\x7E]/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

const variation = (
  current: number,
  previous: number
) => {
  if (!previous) {
    return current > 0
      ? 100
      : 0;
  }

  return (
    ((current - previous) /
      previous) *
    100
  );
};

const calculateDayReport = (
  sales: Sale[],
  targetDate: string
): DayReport => {
  let fc = 0;
  let usd = 0;
  let profitFc = 0;
  let profitUsd = 0;
  let quantity = 0;

  for (const sale of sales) {
    const saleDate =
      sale.created_at.split(
        "T"
      )[0];

    if (
      saleDate !== targetDate
    ) {
      continue;
    }

    const amount =
      Number(
        sale.total_sale || 0
      );

    const profit =
      Number(
        sale.profit || 0
      );

    quantity +=
      Number(
        sale.quantity || 0
      );

    if (
      isFC(sale.currency)
    ) {
      fc += amount;
      profitFc += profit;
    }

    if (
      isUSD(sale.currency)
    ) {
      usd += amount;
      profitUsd += profit;
    }
  }

  return {
    fc,
    usd,
    profitFc,
    profitUsd,
    quantity,
  };
};

/* ======================================================
   CARTE JOURNALIÈRE
====================================================== */

function ReportCard({
  icon,
  title,
  value,
  secondaryValue,
  subtitle,
  trend,
  trendLabel,
  extra,
  tone = "indigo",
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  secondaryValue: string;
  subtitle: string;
  trend?: number;
  trendLabel?: string;
  extra?: string;
  tone?:
    | "indigo"
    | "slate"
    | "amber";
}) {
  const toneConfig = {
    indigo: {
      card:
        "border-indigo-100/80 bg-gradient-to-br from-white via-white to-indigo-50/70",
      icon:
        "bg-indigo-100 text-indigo-600",
      badge:
        "bg-indigo-50 text-indigo-700 border-indigo-100",
      accent:
        "bg-indigo-600",
      amount:
        "text-indigo-700",
      soft:
        "bg-indigo-50/70",
    },

    slate: {
      card:
        "border-blue-100/80 bg-gradient-to-br from-white via-white to-blue-50/60",
      icon:
        "bg-blue-100 text-blue-600",
      badge:
        "bg-blue-50 text-blue-700 border-blue-100",
      accent:
        "bg-blue-500",
      amount:
        "text-blue-700",
      soft:
        "bg-blue-50/70",
    },

    amber: {
      card:
        "border-amber-100/90 bg-gradient-to-br from-white via-white to-amber-50/60",
      icon:
        "bg-amber-100 text-amber-600",
      badge:
        "bg-amber-50 text-amber-700 border-amber-100",
      accent:
        "bg-amber-500",
      amount:
        "text-amber-700",
      soft:
        "bg-amber-50/70",
    },
  };

  const config =
    toneConfig[tone];

  const positive =
    typeof trend === "number" &&
    trend >= 0;

  return (
    <article
      className={`
        relative
        min-w-0
        overflow-hidden
        rounded-[26px]
        border
        ${config.card}
        p-4
        shadow-[0_6px_24px_rgba(15,23,42,0.045)]
        transition
        duration-200
        hover:-translate-y-[1px]
        hover:shadow-[0_10px_30px_rgba(15,23,42,0.07)]
        sm:p-5
      `}
    >
      <div
        className={`
          absolute
          left-0
          top-6
          h-14
          w-1
          rounded-r-full
          ${config.accent}
        `}
      />

      <div className="flex items-start justify-between gap-3">
        <div
          className={`
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-2xl
            ${config.icon}
          `}
        >
          {icon}
        </div>

        {typeof trend ===
          "number" && (
          <div
            className={`
              inline-flex
              shrink-0
              items-center
              gap-1
              rounded-full
              border
              px-2
              py-1
              text-[10px]
              font-black
              ${
                positive
                  ? "border-green-100 bg-green-50 text-green-700"
                  : "border-red-100 bg-red-50 text-red-600"
              }
            `}
          >
            {positive ? (
              <ArrowUp size={11} />
            ) : (
              <ArrowDown size={11} />
            )}

            {Math.abs(
              trend
            ).toFixed(1)}
            %
          </div>
        )}
      </div>

      <div className="mt-4 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            {title}
          </p>

          {trendLabel && (
            <span
              className={`
                rounded-full
                border
                px-2
                py-0.5
                text-[9px]
                font-bold
                ${config.badge}
              `}
            >
              {trendLabel}
            </span>
          )}
        </div>

        <div className="mt-2 flex min-w-0 items-baseline gap-2">
          <p
            className={`
              min-w-0
              truncate
              text-[27px]
              font-black
              tracking-tight
              ${config.amount}
              sm:text-[30px]
            `}
          >
            {value}
          </p>
        </div>

        <div
          className={`
            mt-1
            inline-flex
            max-w-full
            items-center
            rounded-xl
            px-2.5
            py-1
            ${config.soft}
          `}
        >
          <span className="truncate text-xs font-extrabold text-slate-700 sm:text-sm">
            {secondaryValue}
          </span>
        </div>

        <div className="mt-4 flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <TrendingUp size={14} />
          </div>

          <p className="min-w-0 truncate text-[11px] font-bold text-slate-500 sm:text-xs">
            {subtitle}
          </p>
        </div>

        {extra && (
          <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
            <ShoppingCart
              size={13}
              className="shrink-0 text-slate-400"
            />

            <span className="truncate text-[11px] font-bold text-slate-500">
              {extra}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

/* ======================================================
   MINI STAT
====================================================== */

function MiniStat({
  label,
  value,
  tone = "slate",
  hint,
}: {
  label: string;
  value: string;
  tone?:
    | "indigo"
    | "green"
    | "blue"
    | "slate";
  hint?: string;
}) {
  const styles = {
    indigo: {
      box:
        "border-indigo-100 bg-indigo-50/60",
      icon:
        "bg-indigo-100 text-indigo-600",
      value:
        "text-indigo-700",
    },

    green: {
      box:
        "border-green-100 bg-green-50/60",
      icon:
        "bg-green-100 text-green-600",
      value:
        "text-green-700",
    },

    blue: {
      box:
        "border-blue-100 bg-blue-50/60",
      icon:
        "bg-blue-100 text-blue-600",
      value:
        "text-blue-700",
    },

    slate: {
      box:
        "border-slate-200 bg-slate-50/70",
      icon:
        "bg-white text-slate-500",
      value:
        "text-slate-800",
    },
  };

  const style =
    styles[tone];

  return (
    <div
      className={`
        min-w-0
        rounded-2xl
        border
        ${style.box}
        p-3.5
        transition
        hover:shadow-sm
        sm:p-4
      `}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div
          className={`
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-xl
            ${style.icon}
          `}
        >
          <Wallet size={14} />
        </div>

        <p className="min-w-0 truncate text-[10px] font-black uppercase tracking-wide text-slate-500 sm:text-[11px]">
          {label}
        </p>
      </div>

      <p
        className={`
          mt-3
          truncate
          text-base
          font-black
          ${style.value}
          sm:text-lg
        `}
      >
        {value}
      </p>

      {hint && (
        <p className="mt-1 text-[10px] font-bold text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

/* ======================================================
   PAGE
====================================================== */

export default function ReportsPage() {
  const [salesHistory, setSalesHistory] =
    useState<Sale[]>([]);

  const [filteredSales, setFilteredSales] =
    useState<Sale[]>([]);

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [productQuery, setProductQuery] =
    useState("");

  const [showAll, setShowAll] =
    useState(false);

  const [showGuide, setShowGuide] =
    useState(false);

  const [showTopButton, setShowTopButton] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [isOnline, setIsOnline] =
    useState(true);

  const [syncState, setSyncState] =
    useState<SyncState>(
      "online"
    );

  const [notice, setNotice] =
    useState<Notice>(null);

  /* ======================================================
     SYNC LOCAL SALES
  ====================================================== */

  const syncLocalSales =
    useCallback(
      async () => {
        if (
          typeof window ===
            "undefined" ||
          !navigator.onLine
        ) {
          return;
        }

        const userId =
          getStoredUserId();

        if (!userId) {
          return;
        }

        setSyncState(
          "syncing"
        );

        try {
          const localSales =
            await getLocalSales(
              userId
            );

          const pending =
            localSales.filter(
              (sale) =>
                sale.synced === false
            );

          for (const sale of pending) {
            try {
              const payload = {
                id: sale.id,
                user_id:
                  userId,
                product_id:
                  sale.product_id ||
                  null,
                product_name:
                  sale.product_name,
                quantity:
                  sale.quantity,
                purchase_price:
                  sale.purchase_price ||
                  0,
                selling_price:
                  sale.selling_price ||
                  0,
                total_sale:
                  sale.total_sale,
                profit:
                  sale.profit,
                currency:
                  sale.currency,
                created_at:
                  sale.created_at,
              };

              const {
                error,
              } =
                await supabase
                  .from("sales")
                  .upsert(
                    payload,
                    {
                      onConflict:
                        "id",
                    }
                  );

              if (error) {
                console.error(
                  "Erreur synchronisation vente :",
                  error
                );
                continue;
              }

              await saveLocalSale({
                ...sale,
                user_id:
                  userId,
                synced: true,
              });
            } catch (error) {
              console.error(
                "Erreur vente locale :",
                error
              );
            }
          }

          await syncPendingSaleDeletes();

          const {
            data,
            error,
          } =
            await supabase
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
              );

          if (error) {
            throw error;
          }

         const remoteSales =
  (
    (data ||
      []) as Partial<Sale>[]
  ).map(
    (sale) =>
      normalizeSale({
        ...sale,
        id: String(sale.id),
        created_at: String(
          sale.created_at ||
            new Date().toISOString()
        ),
        user_id: userId,
        synced: true,
      })
  );

/*
  IMPORTANT :
  On reconstruit le stockage local avec
  les ventes réellement présentes sur Supabase.

  On conserve uniquement les ventes locales
  qui ne sont pas encore synchronisées.
*/

const currentLocalSales =
  await getLocalSales(userId);

const pendingLocalSales =
  currentLocalSales.filter(
    (sale) =>
      sale.synced === false
  );

const remoteIds = new Set(
  remoteSales.map(
    (sale) => sale.id
  )
);

/*
  Les ventes supprimées du serveur ne sont
  plus conservées localement.
*/
const finalLocalSales = [
  ...pendingLocalSales,
  ...remoteSales.filter(
    (sale) =>
      !pendingLocalSales.some(
        (pending) =>
          pending.id === sale.id
      )
  ),
];

/*
  On supprime d'abord les anciennes ventes
  synchronisées qui ne sont plus sur le serveur.
*/
const db =
  await openSalesDB();

await new Promise<void>(
  (resolve, reject) => {
    let transaction: IDBTransaction;

    try {
      transaction =
        db.transaction(
          SALES_STORE,
          "readwrite"
        );
    } catch (error) {
      reject(error);
      return;
    }

    const store =
      transaction.objectStore(
        SALES_STORE
      );

    for (
      const localSale of currentLocalSales
    ) {
      if (
        localSale.synced === true &&
        !remoteIds.has(
          localSale.id
        )
      ) {
        store.delete(
          localSale.id
        );
      }
    }

    transaction.oncomplete =
      () => resolve();

    transaction.onerror =
      () =>
        reject(
          transaction.error ||
            new Error(
              "Impossible de nettoyer les ventes locales supprimées."
            )
        );

    transaction.onabort =
      () =>
        reject(
          transaction.error ||
            new Error(
              "Nettoyage des ventes locales interrompu."
            )
        );
  }
);

/*
  On enregistre les ventes réellement
  présentes sur le serveur.
*/
await saveLocalSales(
  finalLocalSales
);
          setSyncState(
            "online"
          );

          setNotice(
            null
          );
        } catch (error) {
          console.error(
            "Erreur synchronisation rapports :",
            error
          );

          setSyncState(
            "error"
          );
        }
      },
      []
    );

  /* ======================================================
     FILE DES SUPPRESSIONS
  ====================================================== */

  const syncPendingSaleDeletes =
    useCallback(
      async () => {
        if (
          typeof window ===
            "undefined" ||
          !navigator.onLine
        ) {
          return;
        }

        const userId =
          getStoredUserId();

        if (!userId) {
          return;
        }

        const queue =
          await getSaleDeleteQueue();

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
            } =
              await supabase
                .from("sales")
                .delete()
                .eq(
                  "id",
                  item.id
                )
                .eq(
                  "user_id",
                  userId
                );

            /*
              Une vente déjà supprimée
              côté serveur est considérée
              comme terminée.
            */

            if (error) {
              throw error;
            }

            await removeSaleDeleteFromQueue(
              item.id
            );
          } catch (error) {
            console.error(
              "Erreur suppression vente synchronisée :",
              error
            );
          }
        }
      },
      []
    );

  /* ======================================================
     LOAD REPORTS
  ====================================================== */

  const loadReports =
    useCallback(
      async () => {
        setLoading(true);

        const userId =
          getStoredUserId();

        if (!userId) {
          setNotice({
            type: "error",
            message:
              "Utilisateur non connecté. Reconnectez-vous pour voir vos rapports.",
          });

          setLoading(false);
          return;
        }

        try {
          /* ================================================
             1. LIRE D'ABORD LE LOCAL
          ================================================== */

          let localSales: LocalSale[] =
            [];

          try {
            localSales =
              await getLocalSales(
                userId
              );

            setSalesHistory(
              localSales
            );

            setFilteredSales(
              localSales
            );
          } catch (error) {
            console.error(
              "Erreur lecture locale :",
              error
            );
          }

          /* ================================================
             2. HORS CONNEXION
          ================================================== */

          if (
            !navigator.onLine
          ) {
            setIsOnline(
              false
            );

            setSyncState(
              "offline"
            );

            setStartDate("");
            setEndDate("");
            setProductQuery("");
            setShowAll(false);

            setLoading(false);

            return;
          }

          /* ================================================
             3. EN LIGNE
          ================================================== */

          setIsOnline(
            true
          );

          await syncLocalSales();

          /* ================================================
             4. RELIRE LE LOCAL APRÈS SYNC
          ================================================== */

          const finalSales =
            await getLocalSales(
              userId
            );

          setSalesHistory(
            finalSales
          );

          setFilteredSales(
            finalSales
          );

          setStartDate("");
          setEndDate("");
          setProductQuery("");
          setShowAll(false);

          setSyncState(
            "online"
          );

          setNotice(
            null
          );
        } catch (error) {
          console.error(
            "Erreur chargement rapports :",
            error
          );

          /*
            On ne vide surtout pas
            les données locales.
          */

          try {
            const fallback =
              await getLocalSales(
                userId
              );

            setSalesHistory(
              fallback
            );

            setFilteredSales(
              fallback
            );
          } catch {
            // Rien
          }

          setSyncState(
            navigator.onLine
              ? "error"
              : "offline"
          );

          if (
            navigator.onLine
          ) {
            setNotice({
              type: "error",
              message:
                "Le serveur n'est pas disponible. Les données locales restent affichées.",
            });
          }
        } finally {
          setLoading(false);
        }
      },
      [syncLocalSales]
    );

  /* ======================================================
     INITIALISATION
  ====================================================== */

  useEffect(() => {
    let mounted = true;

    const init =
      async () => {
        try {
          await openSalesDB();

          if (!mounted) {
            return;
          }

          setIsOnline(
            navigator.onLine
          );

          await loadReports();
        } catch (error) {
          console.error(
            "Erreur initialisation rapports :",
            error
          );

          if (mounted) {
            setLoading(
              false
            );

            setSyncState(
              "error"
            );

            setNotice({
              type: "error",
              message:
                getErrorMessage(
                  error
                ),
            });
          }
        }
      };

    void init();

    return () => {
      mounted = false;
    };
  }, [loadReports]);

  /* ======================================================
     ONLINE / OFFLINE
  ====================================================== */

  useEffect(() => {
    const handleOnline =
      async () => {
        setIsOnline(
          true
        );

        setSyncState(
          "syncing"
        );

        await loadReports();
      };

    const handleOffline =
      () => {
        setIsOnline(
          false
        );

        setSyncState(
          "offline"
        );

        setNotice({
          type: "info",
          message:
            "Vous êtes hors connexion. Les rapports continuent d'utiliser les données enregistrées sur cet appareil.",
        });
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
  }, [loadReports]);

  /* ======================================================
     RETOUR EN HAUT
  ====================================================== */

  useEffect(() => {
    const handleScroll =
      () => {
        setShowTopButton(
          window.scrollY >
            300
        );
      };

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      }
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  const scrollToTop =
    () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

  /* ======================================================
     RAPPORTS JOURNALIERS
  ====================================================== */

  const {
    today,
    yesterday,
    beforeYesterday,
  } = useMemo(() => {
    const now =
      new Date();

    const d1 =
      new Date(now);

    d1.setDate(
      d1.getDate() - 1
    );

    const d2 =
      new Date(now);

    d2.setDate(
      d2.getDate() - 2
    );

    return {
      today:
        calculateDayReport(
          salesHistory,
          getLocalDate(now)
        ),

      yesterday:
        calculateDayReport(
          salesHistory,
          getLocalDate(d1)
        ),

      beforeYesterday:
        calculateDayReport(
          salesHistory,
          getLocalDate(d2)
        ),
    };
  }, [salesHistory]);

  /* ======================================================
     RÉSUMÉ
  ====================================================== */

  const summary =
    useMemo(() => {
      let totalFc = 0;
      let totalUsd = 0;

      let profitFc = 0;
      let profitUsd = 0;

      let quantity = 0;

      for (
        const sale of filteredSales
      ) {
        const amount =
          Number(
            sale.total_sale ||
              0
          );

        const profit =
          Number(
            sale.profit ||
              0
          );

        quantity +=
          Number(
            sale.quantity ||
              0
          );

        if (
          isFC(
            sale.currency
          )
        ) {
          totalFc +=
            amount;
          profitFc +=
            profit;
        }

        if (
          isUSD(
            sale.currency
          )
        ) {
          totalUsd +=
            amount;
          profitUsd +=
            profit;
        }
      }

      const count =
        filteredSales.length;

      return {
        count,
        quantity,
        totalFc,
        totalUsd,
        profitFc,
        profitUsd,

        averageFc:
          count
            ? totalFc /
              count
            : 0,

        averageUsd:
          count
            ? totalUsd /
              count
            : 0,

        marginFc:
          totalFc
            ? (profitFc /
                totalFc) *
              100
            : 0,

        marginUsd:
          totalUsd
            ? (profitUsd /
                totalUsd) *
              100
            : 0,
      };
    }, [filteredSales]);

  const dayVariationFc =
    useMemo(
      () =>
        variation(
          today.fc,
          yesterday.fc
        ),
      [
        today.fc,
        yesterday.fc,
      ]
    );

  const dayVariationUsd =
    useMemo(
      () =>
        variation(
          today.usd,
          yesterday.usd
        ),
      [
        today.usd,
        yesterday.usd,
      ]
    );

  /* ======================================================
     FILTRE PRODUIT
  ====================================================== */

  const applyProductQuery =
    useCallback(
      (list: Sale[]) => {
        const query =
          productQuery
            .trim()
            .toLowerCase();

        if (!query) {
          return list;
        }

        return list.filter(
          (sale) =>
            (
              sale.product_name ||
              ""
            )
              .toLowerCase()
              .includes(
                query
              )
        );
      },
      [productQuery]
    );

  /* ======================================================
     FILTRE PÉRIODE
  ====================================================== */

  const filterByPeriod =
    () => {
      if (
        !startDate ||
        !endDate
      ) {
        setNotice({
          type: "info",
          message:
            "Choisissez la date de début et la date de fin.",
        });

        return;
      }

      if (
        startDate >
        endDate
      ) {
        setNotice({
          type: "info",
          message:
            "La date de début doit être avant la date de fin.",
        });

        return;
      }

      const result =
        salesHistory.filter(
          (sale) => {
            const saleDate =
              sale.created_at.split(
                "T"
              )[0];

            return (
              saleDate >=
                startDate &&
              saleDate <=
                endDate
            );
          }
        );

      setFilteredSales(
        applyProductQuery(
          result
        )
      );

      setShowAll(
        false
      );

      setNotice(
        null
      );
    };

  /* ======================================================
     RECHERCHE PRODUIT
  ====================================================== */

  const searchProduct =
    (value: string) => {
      setProductQuery(
        value
      );

      let base =
        salesHistory;

      if (
        startDate &&
        endDate
      ) {
        base =
          base.filter(
            (sale) => {
              const saleDate =
                sale.created_at.split(
                  "T"
                )[0];

              return (
                saleDate >=
                  startDate &&
                saleDate <=
                  endDate
              );
            }
          );
      }

      const query =
        value
          .trim()
          .toLowerCase();

      const result =
        query
          ? base.filter(
              (sale) =>
                (
                  sale.product_name ||
                  ""
                )
                  .toLowerCase()
                  .includes(
                    query
                  )
            )
          : base;

      setFilteredSales(
        result
      );

      setShowAll(
        false
      );

      setNotice(
        null
      );
    };

  /* ======================================================
     TOUTES LES VENTES
  ====================================================== */

  const showEverything =
    () => {
      const result =
        applyProductQuery(
          salesHistory
        );

      setStartDate("");
      setEndDate("");

      setFilteredSales(
        result
      );

      setShowAll(
        true
      );

      setNotice(
        null
      );
    };

  /* ======================================================
     RESET
  ====================================================== */

  const resetFilters =
    () => {
      setStartDate("");
      setEndDate("");
      setProductQuery("");

      setFilteredSales(
        salesHistory
      );

      setShowAll(
        false
      );

      setNotice(
        null
      );
    };

  /* ======================================================
   SUPPRESSION DÉFINITIVE D'UNE VENTE
====================================================== */

const deleteSale = async (saleId: string) => {
  const confirmed = window.confirm(
    "Voulez-vous vraiment supprimer cette vente ? Cette action est irréversible."
  );

  if (!confirmed) return;

  const userId = getStoredUserId();

  if (!userId) {
    setNotice({
      type: "error",
      message: "Utilisateur non connecté.",
    });
    return;
  }

  try {
    /*
     * 1. SUPPRESSION IMMÉDIATE DE L'INTERFACE
     */
    setSalesHistory((current) =>
      current.filter((sale) => sale.id !== saleId)
    );

    setFilteredSales((current) =>
      current.filter((sale) => sale.id !== saleId)
    );

    /*
     * 2. SUPPRESSION DU CACHE LOCAL
     */
    await removeLocalSale(saleId);

    /*
     * 3. HORS CONNEXION
     *
     * On enregistre la suppression dans la file.
     * Elle sera envoyée à Supabase au retour d'Internet.
     */
    if (!navigator.onLine) {
      await addSaleDeleteToQueue({
        id: saleId,
        userId,
        createdAt: Date.now(),
      });

      setSyncState("offline");

      setNotice({
        type: "success",
        message:
          "Vente supprimée de cet appareil. La suppression sera synchronisée dès le retour d'Internet.",
      });

      return;
    }

    /*
     * 4. EN LIGNE
     *
     * Suppression DIRECTE dans Supabase.
     */
    setSyncState("syncing");

    const { data, error } = await supabase
      .from("sales")
      .delete()
      .eq("id", saleId)
      .eq("user_id", userId)
      .select("id");

    /*
     * Supabase a rencontré une vraie erreur.
     */
    if (error) {
      console.error(
        "Erreur Supabase suppression vente :",
        error
      );

      /*
       * La suppression n'est pas perdue :
       * on la remet dans la file.
       */
      await addSaleDeleteToQueue({
        id: saleId,
        userId,
        createdAt: Date.now(),
      });

      setSyncState("error");

      setNotice({
        type: "error",
        message:
          "La vente a été supprimée de l'écran, mais la suppression serveur est en attente de synchronisation.",
      });

      return;
    }

    /*
     * Si aucune ligne n'a été supprimée,
     * Supabase n'a probablement pas autorisé
     * la suppression (souvent RLS).
     */
    if (!data || data.length === 0) {
      console.error(
        "Aucune vente supprimée dans Supabase.",
        {
          saleId,
          userId,
        }
      );

      await addSaleDeleteToQueue({
        id: saleId,
        userId,
        createdAt: Date.now(),
      });

      setSyncState("error");

      setNotice({
        type: "error",
        message:
          "La vente n'a pas été supprimée du serveur. Vérifiez les permissions RLS de la table sales.",
      });

      return;
    }

    /*
     * 5. SUPPRESSION SERVEUR CONFIRMÉE
     */
    setSyncState("online");

    setNotice({
      type: "success",
      message: "Vente supprimée définitivement.",
    });

  } catch (error) {
    console.error(
      "Erreur suppression vente :",
      error
    );

    /*
     * En cas de problème inattendu,
     * on conserve la suppression dans la file.
     */
    try {
      await addSaleDeleteToQueue({
        id: saleId,
        userId,
        createdAt: Date.now(),
      });

      setSyncState(
        navigator.onLine
          ? "error"
          : "offline"
      );

      setNotice({
        type: "success",
        message:
          "Vente supprimée localement. La suppression sera synchronisée automatiquement.",
      });

    } catch (queueError) {
      console.error(
        "Erreur file de suppression :",
        queueError
      );

      setSyncState("error");

      setNotice({
        type: "error",
        message:
          "Impossible d'enregistrer la suppression. Veuillez réessayer.",
      });
    }
  }
};

  /* ======================================================
     VENTES AFFICHÉES
  ====================================================== */

  const displayedSales =
    showAll
      ? filteredSales
      : filteredSales.slice(
          0,
          PAGE_STEP
        );

  /* ======================================================
     LABEL PÉRIODE
  ====================================================== */

  const periodLabel =
    startDate &&
    endDate
      ? `Du ${prettyDate(
          startDate
        )} au ${prettyDate(
          endDate
        )}`
      : "Toutes les ventes";

  /* ======================================================
     DONNÉES PDF
  ====================================================== */

  const getExportData =
    (): Sale[] => {
      let data =
        salesHistory;

      if (
        startDate &&
        endDate
      ) {
        data =
          data.filter(
            (sale) => {
              const saleDate =
                sale.created_at.split(
                  "T"
                )[0];

              return (
                saleDate >=
                  startDate &&
                saleDate <=
                  endDate
              );
            }
          );
      }

      return applyProductQuery(
        data
      );
    };

  const exportFileBase =
    startDate &&
    endDate
      ? `Rapport-BISO-COMMERCE-${startDate}-${endDate}`
      : productQuery
      ? `Rapport-BISO-COMMERCE-${productQuery
          .trim()
          .replace(
            /[^a-zA-Z0-9-_]/g,
            "-"
          )}`
      : "Rapport-BISO-COMMERCE-complet";

  /* ======================================================
     PDF
  ====================================================== */

  const downloadPDF =
    () => {
      const data =
        getExportData();

      if (!data.length) {
        setNotice({
          type: "info",
          message:
            "Aucune vente trouvée pour la sélection actuelle.",
        });
      }

      const doc =
        new jsPDF({
          orientation:
            "portrait",
          unit: "mm",
          format: "a4",
          putOnlyUsedFonts:
            true,
          compress: true,
        });

      const ORANGE: [
        number,
        number,
        number
      ] = [
        234,
        88,
        12,
      ];

      const DARK: [
        number,
        number,
        number
      ] = [
        15,
        23,
        42,
      ];

      const DARKER: [
        number,
        number,
        number
      ] = [
        10,
        15,
        28,
      ];

      const GREEN: [
        number,
        number,
        number
      ] = [
        22,
        163,
        74,
      ];

      const BLUE: [
        number,
        number,
        number
      ] = [
        37,
        99,
        235,
      ];

      const GREY: [
        number,
        number,
        number
      ] = [
        100,
        116,
        139,
      ];

      const LIGHT: [
        number,
        number,
        number
      ] = [
        248,
        250,
        252,
      ];

      const BORDER: [
        number,
        number,
        number
      ] = [
        226,
        232,
        240,
      ];

      const WHITE: [
        number,
        number,
        number
      ] = [
        255,
        255,
        255,
      ];

      const generatedAt =
        new Date().toLocaleString(
          "fr-FR",
          {
            dateStyle:
              "long",
            timeStyle:
              "short",
          }
        );

      let totalFc = 0;
      let totalUsd = 0;
      let profitFc = 0;
      let profitUsd = 0;
      let totalQuantity = 0;

      data.forEach(
        sale => {
          const amount =
            Number(
              sale.total_sale ||
                0
            );

          const profit =
            Number(
              sale.profit ||
                0
            );

          totalQuantity +=
            Number(
              sale.quantity ||
                0
            );

          if (
            isFC(
              sale.currency
            )
          ) {
            totalFc +=
              amount;
            profitFc +=
              profit;
          }

          if (
            isUSD(
              sale.currency
            )
          ) {
            totalUsd +=
              amount;
            profitUsd +=
              profit;
          }
        }
      );

      const margeFc =
        totalFc > 0
          ? (profitFc /
              totalFc) *
            100
          : 0;

      const margeUsd =
        totalUsd > 0
          ? (profitUsd /
              totalUsd) *
            100
          : 0;

      const periodeTexte =
        startDate &&
        endDate
          ? `Du ${prettyDate(
              startDate
            )} au ${prettyDate(
              endDate
            )}`
          : productQuery
          ? `Produit : ${productQuery}`
          : "Toutes les ventes";

      const addPageHeader =
        (
          title: string,
          subtitle?: string
        ) => {
          doc.setFillColor(
            DARKER[0],
            DARKER[1],
            DARKER[2]
          );

          doc.rect(
            0,
            0,
            210,
            28,
            "F"
          );

          doc.setTextColor(
            WHITE[0],
            WHITE[1],
            WHITE[2]
          );

          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(
            17
          );

          doc.text(
            "BISO-COMMERCE",
            15,
            12
          );

          doc.setFontSize(
            9
          );

          doc.setFont(
            "helvetica",
            "normal"
          );

          doc.text(
            "GESTION COMMERCIALE",
            15,
            19
          );

          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(
            14
          );

          doc.text(
            cleanPDF(title),
            195,
            12,
            {
              align:
                "right",
            }
          );

          if (
            subtitle
          ) {
            doc.setFont(
              "helvetica",
              "normal"
            );

            doc.setFontSize(
              8
            );

            doc.text(
              cleanPDF(
                subtitle
              ),
              195,
              19,
              {
                align:
                  "right",
              }
            );
          }
        };

      const addFooter =
        () => {
          const pageCount =
            doc.getNumberOfPages();

          for (
            let page = 1;
            page <=
            pageCount;
            page++
          ) {
            doc.setPage(
              page
            );

            const height =
              doc.internal
                .pageSize
                .height;

            doc.setDrawColor(
              BORDER[0],
              BORDER[1],
              BORDER[2]
            );

            doc.line(
              15,
              height - 15,
              195,
              height - 15
            );

            doc.setFont(
              "helvetica",
              "normal"
            );

            doc.setFontSize(
              7
            );

            doc.setTextColor(
              GREY[0],
              GREY[1],
              GREY[2]
            );

            doc.text(
              "https://bisocommerce.vercel.app",
              15,
              height - 9
            );

            doc.text(
              `Page ${page} / ${pageCount}`,
              195,
              height - 9,
              {
                align:
                  "right",
              }
            );
          }
        };

      const addSectionTitle =
        (
          title: string,
          y: number
        ) => {
          doc.setFillColor(
            ORANGE[0],
            ORANGE[1],
            ORANGE[2]
          );

          doc.roundedRect(
            15,
            y - 5,
            3,
            9,
            1,
            1,
            "F"
          );

          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(
            13
          );

          doc.setTextColor(
            DARK[0],
            DARK[1],
            DARK[2]
          );

          doc.text(
            cleanPDF(title),
            22,
            y + 2
          );
        };

      /* ====================================================
         PAGE 1
      ==================================================== */

      doc.setFillColor(
        DARKER[0],
        DARKER[1],
        DARKER[2]
      );

      doc.rect(
        0,
        0,
        210,
        42,
        "F"
      );

      doc.setTextColor(
        WHITE[0],
        WHITE[1],
        WHITE[2]
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        25
      );

      doc.text(
        "BISO-COMMERCE",
        20,
        19
      );

      doc.setFontSize(
        10
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.text(
        "RAPPORT COMMERCIAL",
        20,
        27
      );

      doc.setFontSize(
        8
      );

      doc.text(
        cleanPDF(
          `Genere le ${generatedAt}`
        ),
        20,
        34
      );

      doc.setFillColor(
        ORANGE[0],
        ORANGE[1],
        ORANGE[2]
      );

      doc.roundedRect(
        145,
        12,
        45,
        18,
        4,
        4,
        "F"
      );

      doc.setTextColor(
        WHITE[0],
        WHITE[1],
        WHITE[2]
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        9
      );

      doc.text(
        cleanPDF(
          periodeTexte
        ),
        167.5,
        23,
        {
          align:
            "center",
          maxWidth:
            38,
        }
      );

      doc.setTextColor(
        DARK[0],
        DARK[1],
        DARK[2]
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        16
      );

      doc.text(
        "Synthese financiere",
        15,
        57
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(
        9
      );

      doc.setTextColor(
        GREY[0],
        GREY[1],
        GREY[2]
      );

      doc.text(
        cleanPDF(
          "Vue generale de l'activite commerciale pour la periode selectionnee."
        ),
        15,
        64
      );

      const cards = [
        {
          x: 15,
          y: 72,
          title:
            "VENTES FC",
          value:
            `${formatMoney(
              totalFc
            )} FC`,
          color:
            ORANGE,
        },

        {
          x: 108,
          y: 72,
          title:
            "VENTES USD",
          value:
            `${formatMoney(
              totalUsd
            )} $`,
          color:
            BLUE,
        },

        {
          x: 15,
          y: 95,
          title:
            "BENEFICE FC",
          value:
            `${formatMoney(
              profitFc
            )} FC`,
          color:
            GREEN,
        },

        {
          x: 108,
          y: 95,
          title:
            "BENEFICE USD",
          value:
            `${formatMoney(
              profitUsd
            )} $`,
          color:
            GREEN,
        },
      ];

      cards.forEach(
        card => {
          doc.setFillColor(
            LIGHT[0],
            LIGHT[1],
            LIGHT[2]
          );

          doc.setDrawColor(
            BORDER[0],
            BORDER[1],
            BORDER[2]
          );

          doc.roundedRect(
            card.x,
            card.y,
            87,
            18,
            3,
            3,
            "FD"
          );

          doc.setFillColor(
            card.color[0],
            card.color[1],
            card.color[2]
          );

          doc.roundedRect(
            card.x,
            card.y,
            3,
            18,
            1.5,
            1.5,
            "F"
          );

          doc.setTextColor(
            GREY[0],
            GREY[1],
            GREY[2]
          );

          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(
            7
          );

          doc.text(
            card.title,
            card.x + 8,
            card.y + 6
          );

          doc.setTextColor(
            DARK[0],
            DARK[1],
            DARK[2]
          );

          doc.setFontSize(
            11
          );

          doc.text(
            cleanPDF(
              card.value
            ),
            card.x + 8,
            card.y + 13
          );
        }
      );

      addSectionTitle(
        "Indicateurs principaux",
        127
      );

      autoTable(
        doc,
        {
          startY: 135,

          head: [
            [
              "Indicateur",
              "Valeur",
              "Indication",
            ],
          ],

          body: [
            [
              "Nombre de ventes",
              String(
                data.length
              ),
              "Transactions",
            ],

            [
              "Quantite vendue",
              String(
                totalQuantity
              ),
              "Articles",
            ],

            [
              "Panier moyen FC",
              `${formatMoney(
                data.length
                  ? totalFc /
                    data.length
                  : 0
              )} FC`,
              "Moyenne",
            ],

            [
              "Panier moyen USD",
              `${formatMoney(
                data.length
                  ? totalUsd /
                    data.length
                  : 0
              )} $`,
              "Moyenne",
            ],

            [
              "Marge FC",
              `${margeFc.toFixed(
                1
              )} %`,
              "Rentabilite",
            ],

            [
              "Marge USD",
              `${margeUsd.toFixed(
                1
              )} %`,
              "Rentabilite",
            ],
          ],

          theme:
            "grid",

          styles: {
            font:
              "helvetica",
            fontSize: 9,
            cellPadding: 4,
            textColor:
              DARK,
            lineColor:
              BORDER,
            lineWidth:
              0.2,
          },

          headStyles: {
            fillColor:
              DARK,
            textColor:
              WHITE,
            fontStyle:
              "bold",
            fontSize: 8,
          },

          alternateRowStyles: {
            fillColor:
              LIGHT,
          },

          margin: {
            left: 15,
            right: 15,
          },
        }
      );

      /* ====================================================
         PAGE 2
      ==================================================== */

      doc.addPage();

      addPageHeader(
        "Suivi journalier",
        periodeTexte
      );

      const perDay: Record<
        string,
        DayReport
      > = {};

      data.forEach(
        sale => {
          const day =
            sale.created_at.split(
              "T"
            )[0];

          if (
            !perDay[day]
          ) {
            perDay[day] = {
              ...EMPTY_DAY,
            };
          }

          const amount =
            Number(
              sale.total_sale ||
                0
            );

          const profit =
            Number(
              sale.profit ||
                0
            );

          perDay[
            day
          ].quantity +=
            Number(
              sale.quantity ||
                0
            );

          if (
            isFC(
              sale.currency
            )
          ) {
            perDay[
              day
            ].fc += amount;

            perDay[
              day
            ].profitFc +=
              profit;
          }

          if (
            isUSD(
              sale.currency
            )
          ) {
            perDay[
              day
            ].usd += amount;

            perDay[
              day
            ].profitUsd +=
              profit;
          }
        }
      );

      const dayRows =
        Object.keys(
          perDay
        )
          .sort((a, b) =>
            a < b ? 1 : -1
          )
          .map(
            day => [
              prettyDate(day),

              String(
                perDay[day]
                  .quantity
              ),

              `${formatMoney(
                perDay[day].fc
              )} FC`,

              `${formatMoney(
                perDay[day].usd
              )} $`,

              `${formatMoney(
                perDay[day]
                  .profitFc
              )} FC`,

              `${formatMoney(
                perDay[day]
                  .profitUsd
              )} $`,
            ]
          );

      addSectionTitle(
        "Performance par jour",
        40
      );

      if (
        dayRows.length >
        0
      ) {
        autoTable(
          doc,
          {
            startY: 48,

            head: [
              [
                "Date",
                "Qte",
                "Ventes FC",
                "Ventes USD",
                "Benefice FC",
                "Benefice USD",
              ],
            ],

            body:
              dayRows,

            theme:
              "grid",

            styles: {
              font:
                "helvetica",
              fontSize: 8,
              cellPadding:
                3.5,
              textColor:
                DARK,
              lineColor:
                BORDER,
              lineWidth:
                0.2,
            },

            headStyles: {
              fillColor:
                ORANGE,
              fontStyle:
                "bold",
              textColor:
                WHITE,
              fontSize:
                8,
            },

            alternateRowStyles: {
              fillColor:
                LIGHT,
            },

            columnStyles: {
              0: {
                cellWidth:
                  27,
              },

              1: {
                halign:
                  "center",
                cellWidth:
                  18,
              },

              2: {
                halign:
                  "right",
              },

              3: {
                halign:
                  "right",
              },

              4: {
                halign:
                  "right",
              },

              5: {
                halign:
                  "right",
              },
            },

            margin: {
              left: 12,
              right: 12,
            },
          }
        );
      } else {
        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(
          10
        );

        doc.setTextColor(
          GREY[0],
          GREY[1],
          GREY[2]
        );

        doc.text(
          "Aucune donnee disponible pour cette periode.",
          15,
          52
        );
      }
            /* ====================================================
         PAGE 3 — DETAIL DES VENTES
      ==================================================== */

      doc.addPage();

      addPageHeader(
        "Detail des ventes",
        `${data.length} vente${
          data.length > 1
            ? "s"
            : ""
        }`
      );

      addSectionTitle(
        "Liste des ventes",
        40
      );

      const salesRows =
        data.map(
          sale => {
            const saleDate =
              new Date(
                sale.created_at
              ).toLocaleDateString(
                "fr-FR"
              );

            return [
              saleDate,

              cleanPDF(
                sale.product_name ||
                  "Produit inconnu"
              ),

              `x${Number(
                sale.quantity ||
                  0
              )}`,

              `${formatMoney(
                Number(
                  sale.total_sale ||
                    0
                )
              )} ${cleanPDF(
                sale.currency ||
                  ""
              )}`,

              `${formatMoney(
                Number(
                  sale.profit ||
                    0
                )
              )} ${cleanPDF(
                sale.currency ||
                  ""
              )}`,
            ];
          }
        );

      if (
        salesRows.length >
        0
      ) {
        autoTable(
          doc,
          {
            startY: 48,

            head: [
              [
                "Date",
                "Produit",
                "Qte",
                "Vente",
                "Benefice",
              ],
            ],

            body:
              salesRows,

            theme:
              "grid",

            styles: {
              font:
                "helvetica",
              fontSize: 8,
              cellPadding: 3,
              textColor:
                DARK,
              lineColor:
                BORDER,
              lineWidth:
                0.2,
              overflow:
                "linebreak",
            },

            headStyles: {
              fillColor:
                DARK,
              textColor:
                WHITE,
              fontStyle:
                "bold",
              fontSize:
                8,
            },

            alternateRowStyles: {
              fillColor:
                LIGHT,
            },

            columnStyles: {
              0: {
                cellWidth:
                  24,
              },

              1: {
                cellWidth:
                  68,
              },

              2: {
                cellWidth:
                  16,
                halign:
                  "center",
              },

              3: {
                halign:
                  "right",
              },

              4: {
                halign:
                  "right",
              },
            },

            margin: {
              left: 12,
              right: 12,
            },
          }
        );
      } else {
        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(
          10
        );

        doc.setTextColor(
          GREY[0],
          GREY[1],
          GREY[2]
        );

        doc.text(
          "Aucune vente a afficher.",
          15,
          52
        );
      }

      /* ====================================================
         PAGE 4 — ANALYSE COMMERCIALE
      ==================================================== */

      doc.addPage();

      addPageHeader(
        "Analyse commerciale",
        periodeTexte
      );

      addSectionTitle(
        "Analyse de l'activite",
        42
      );

      const analyseRows = [
        [
          "Quantite totale vendue",
          String(
            totalQuantity
          ),
          "articles",
        ],

        [
          "Nombre total de ventes",
          String(
            data.length
          ),
          "transactions",
        ],

        [
          "Total ventes FC",
          `${formatMoney(
            totalFc
          )} FC`,
          "chiffre d'affaires",
        ],

        [
          "Total ventes USD",
          `${formatMoney(
            totalUsd
          )} $`,
          "chiffre d'affaires",
        ],

        [
          "Benefice total FC",
          `${formatMoney(
            profitFc
          )} FC`,
          "benefice",
        ],

        [
          "Benefice total USD",
          `${formatMoney(
            profitUsd
          )} $`,
          "benefice",
        ],

        [
          "Marge FC",
          `${margeFc.toFixed(
            1
          )} %`,
          "rentabilite",
        ],

        [
          "Marge USD",
          `${margeUsd.toFixed(
            1
          )} %`,
          "rentabilite",
        ],
      ];

      autoTable(
        doc,
        {
          startY: 50,

          head: [
            [
              "Indicateur",
              "Resultat",
              "Type",
            ],
          ],

          body:
            analyseRows,

          theme:
            "grid",

          styles: {
            font:
              "helvetica",
            fontSize: 9,
            cellPadding:
              4.5,
            textColor:
              DARK,
            lineColor:
              BORDER,
            lineWidth:
              0.2,
          },

          headStyles: {
            fillColor:
              ORANGE,
            textColor:
              WHITE,
            fontStyle:
              "bold",
          },

          alternateRowStyles: {
            fillColor:
              LIGHT,
          },

          columnStyles: {
            1: {
              fontStyle:
                "bold",
              halign:
                "right",
            },

            2: {
              textColor:
                GREY,
            },
          },

          margin: {
            left: 15,
            right: 15,
          },
        }
      );

      const lastAutoTable =
        (
          doc as unknown as {
            lastAutoTable?: {
              finalY?: number;
            };
          }
        ).lastAutoTable;

      const interpretationY =
        lastAutoTable?.finalY
          ? lastAutoTable.finalY +
            15
          : 155;

      addSectionTitle(
        "Lecture du rapport",
        interpretationY
      );

      const observations: string[] =
        [];

      if (
        data.length ===
        0
      ) {
        observations.push(
          "Aucune vente n'a ete enregistree pour la selection actuelle."
        );
      } else {
        observations.push(
          `L'activite comprend ${data.length} vente${
            data.length >
            1
              ? "s"
              : ""
          } pour une quantite totale de ${totalQuantity} article${
            totalQuantity >
            1
              ? "s"
              : ""
          }.`
        );

        if (
          totalFc > 0
        ) {
          observations.push(
            `Le chiffre d'affaires en FC s'eleve a ${formatMoney(
              totalFc
            )} FC, avec un benefice de ${formatMoney(
              profitFc
            )} FC.`
          );
        }

        if (
          totalUsd > 0
        ) {
          observations.push(
            `Le chiffre d'affaires en USD s'eleve a ${formatMoney(
              totalUsd
            )} $, avec un benefice de ${formatMoney(
              profitUsd
            )} $.`
          );
        }

        if (
          totalFc > 0 &&
          totalUsd > 0
        ) {
          observations.push(
            `Les marges calculees sont de ${margeFc.toFixed(
              1
            )} % en FC et ${margeUsd.toFixed(
              1
            )} % en USD.`
          );
        }
      }

      let observationY =
        interpretationY +
        12;

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(
        9
      );

      doc.setTextColor(
        DARK[0],
        DARK[1],
        DARK[2]
      );

      observations.forEach(
        text => {
          const lines =
            doc.splitTextToSize(
              cleanPDF(text),
              170
            );

          doc.text(
            lines,
            20,
            observationY
          );

          observationY +=
            lines.length *
              5 +
            5;
        }
      );

      const signatureY =
        Math.min(
          observationY + 8,
          255
        );

      doc.setDrawColor(
        BORDER[0],
        BORDER[1],
        BORDER[2]
      );

      doc.line(
        20,
        signatureY,
        190,
        signatureY
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        8
      );

      doc.setTextColor(
        DARK[0],
        DARK[1],
        DARK[2]
      );

      doc.text(
        "BISO-COMMERCE",
        20,
        signatureY + 8
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setTextColor(
        GREY[0],
        GREY[1],
        GREY[2]
      );

      doc.text(
        "Rapport genere automatiquement par la plateforme.",
        20,
        signatureY + 14
      );

      addFooter();

      doc.save(
        `${exportFileBase}.pdf`
      );
    };

  /* ======================================================
     JSX
  ====================================================== */

  return (
    <main
      className="
        min-h-screen
        w-full
        min-w-0
        overflow-x-hidden
        bg-[#f5f7fb]
        px-3
        py-4
        sm:px-5
        sm:py-6
        lg:px-8
        lg:py-8
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-7xl
          min-w-0
          space-y-5
          sm:space-y-6
        "
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <section
          className="
            relative
            w-full
            min-w-0
            overflow-hidden
            rounded-[26px]
            border
            border-slate-200/80
            bg-white
            p-4
            shadow-[0_5px_25px_rgba(15,23,42,0.045)]
            sm:p-6
          "
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-100/50 blur-3xl" />

          <div
            className="
              relative
              flex
              min-w-0
              flex-col
              gap-5
              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-indigo-600
                  text-white
                  shadow-lg
                  shadow-indigo-600/15
                  sm:h-14
                  sm:w-14
                "
              >
                <BarChart3
                  size={25}
                  strokeWidth={2.2}
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
                    Rapport
                  </h1>

                  <span
                    className="
                      rounded-full
                      bg-indigo-50
                      px-2.5
                      py-1
                      text-[10px]
                      font-black
                      uppercase
                      tracking-wide
                      text-indigo-600
                    "
                  >
                    Commerce
                  </span>
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                  Analyse complète de votre activité commerciale
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <button
                type="button"
                onClick={() =>
                  void loadReports()
                }
                disabled={
                  loading
                }
                className="
                  inline-flex
                  min-h-[46px]
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  px-3
                  text-xs
                  font-extrabold
                  text-slate-700
                  shadow-sm
                  transition
                  hover:border-indigo-200
                  hover:bg-indigo-50
                  hover:text-indigo-700
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  sm:px-4
                "
              >
                <RefreshCw
                  size={16}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />

                Actualiser
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowGuide(
                    !showGuide
                  )
                }
                className="
                  inline-flex
                  min-h-[46px]
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-indigo-600
                  px-3
                  text-xs
                  font-extrabold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-indigo-700
                  active:scale-[0.98]
                  sm:px-4
                "
              >
                <Sparkles size={16} />
                Guide
              </button>
            </div>
          </div>

          {/* STATUT CONNEXION */}

          <div className="relative mt-5 flex flex-wrap gap-2">
            <span
              className={`
                inline-flex
                items-center
                gap-1.5
                rounded-full
                px-3
                py-1.5
                text-[11px]
                font-black
                ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }
              `}
            >
              {isOnline ? (
                <Wifi size={13} />
              ) : (
                <WifiOff size={13} />
              )}

              {isOnline
                ? "En ligne"
                : "Hors connexion"}
            </span>

            <span
              className={`
                inline-flex
                items-center
                gap-1.5
                rounded-full
                px-3
                py-1.5
                text-[11px]
                font-bold
                ${
                  syncState ===
                  "syncing"
                    ? "bg-indigo-50 text-indigo-700"
                    : syncState ===
                      "error"
                    ? "bg-red-50 text-red-700"
                    : "bg-slate-100 text-slate-600"
                }
              `}
            >
              {syncState ===
              "syncing" ? (
                <Loader2
                  size={13}
                  className="animate-spin"
                />
              ) : (
                <Cloud size={13} />
              )}

              {syncState ===
              "syncing"
                ? "Synchronisation..."
                : syncState ===
                  "error"
                ? "Synchronisation à vérifier"
                : syncState ===
                  "offline"
                ? "Données locales"
                : "Données à jour"}
            </span>

            <span
              className="
                inline-flex
                max-w-full
                items-center
                gap-1.5
                rounded-full
                bg-slate-100
                px-3
                py-1.5
                text-[11px]
                font-bold
                text-slate-600
              "
            >
              <CalendarDays
                size={13}
                className="shrink-0 text-indigo-500"
              />

              <span className="truncate">
                {periodLabel}
              </span>
            </span>

            <span
              className="
                inline-flex
                items-center
                gap-1.5
                rounded-full
                bg-indigo-50
                px-3
                py-1.5
                text-[11px]
                font-bold
                text-indigo-700
              "
            >
              <ShoppingCart
                size={13}
              />

              {summary.count} vente
              {summary.count >
              1
                ? "s"
                : ""}
            </span>
          </div>

          {/* GUIDE */}

          {showGuide && (
            <div
              className="
                mt-5
                overflow-hidden
                rounded-2xl
                border
                border-indigo-100
                bg-indigo-50/60
                p-4
                sm:p-5
              "
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                  <Sparkles size={17} />
                </div>

                <div className="min-w-0">
                  <h3 className="font-black text-slate-900">
                    Comment utiliser les rapports ?
                  </h3>

                  <div className="mt-3 space-y-2.5 text-xs leading-5 text-slate-600 sm:text-sm">
                    <p>
                      <span className="font-bold text-slate-800">
                        1.
                      </span>{" "}
                      Consultez les ventes d'aujourd'hui et d'hier avec les montants en FC et USD, les bénéfices et les quantités.
                    </p>

                    <p>
                      <span className="font-bold text-slate-800">
                        2.
                      </span>{" "}
                      Utilisez « Du » et « Au » pour analyser une période précise.
                    </p>

                    <p>
                      <span className="font-bold text-slate-800">
                        3.
                      </span>{" "}
                      Les 5 dernières ventes sont affichées en premier.
                    </p>

                    <p>
                      <span className="font-bold text-slate-800">
                        4.
                      </span>{" "}
                      Une vente peut être supprimée même hors connexion.
                    </p>

                    <p>
                      <span className="font-bold text-slate-800">
                        5.
                      </span>{" "}
                      Le PDF peut être créé même hors connexion à partir des données locales.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowGuide(
                    false
                  )
                }
                className="
                  mt-4
                  inline-flex
                  min-h-[44px]
                  w-full
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-indigo-200
                  bg-white
                  px-4
                  text-sm
                  font-extrabold
                  text-indigo-700
                  transition
                  hover:bg-indigo-50
                "
              >
                Fermer le guide
              </button>
            </div>
          )}
        </section>

        {/* MESSAGE */}

        {notice && (
          <div
            className={`
              flex
              w-full
              min-w-0
              items-start
              gap-3
              rounded-2xl
              border
              p-3.5
              shadow-sm
              sm:p-4
              ${
                notice.type ===
                "error"
                  ? "border-red-100 bg-red-50 text-red-700"
                  : notice.type ===
                    "success"
                  ? "border-green-100 bg-green-50 text-green-700"
                  : "border-indigo-100 bg-indigo-50 text-indigo-700"
              }
            `}
            role="status"
          >
            <div
              className={`
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-white
                shadow-sm
                ${
                  notice.type ===
                  "error"
                    ? "text-red-600"
                    : notice.type ===
                      "success"
                    ? "text-green-600"
                    : "text-indigo-600"
                }
              `}
            >
              {notice.type ===
              "success" ? (
                <CheckCircle size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
            </div>

            <p className="min-w-0 flex-1 break-words pt-1 text-xs font-bold leading-5 sm:text-sm">
              {notice.message}
            </p>

            <button
              type="button"
              onClick={() =>
                setNotice(null)
              }
              className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-lg
                text-slate-400
                transition
                hover:bg-white
                hover:text-slate-700
              "
              aria-label="Fermer le message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* STATISTIQUES JOURNALIÈRES */}

        <section
          className="
            grid
            w-full
            min-w-0
            grid-cols-1
            gap-3
            sm:grid-cols-2
            sm:gap-4
            lg:gap-5
          "
        >
          <ReportCard
            icon={<BarChart3 size={19} />}
            title="Aujourd'hui"
            value={`${formatMoney(
              today.fc
            )} FC`}
            secondaryValue={`${formatMoney(
              today.usd
            )} $`}
            subtitle={`Bénéfice : ${formatMoney(
              today.profitFc
            )} FC • ${formatMoney(
              today.profitUsd
            )} $`}
            trend={
              dayVariationFc ||
              dayVariationUsd
            }
            trendLabel="vs hier"
            extra={`${today.quantity} article${
              today.quantity > 1
                ? "s"
                : ""
            } vendu${
              today.quantity > 1
                ? "s"
                : ""
            }`}
            tone="indigo"
          />

          <ReportCard
            icon={
              <CalendarDays size={19} />
            }
            title="Hier"
            value={`${formatMoney(
              yesterday.fc
            )} FC`}
            secondaryValue={`${formatMoney(
              yesterday.usd
            )} $`}
            subtitle={`Bénéfice : ${formatMoney(
              yesterday.profitFc
            )} FC • ${formatMoney(
              yesterday.profitUsd
            )} $`}
            extra={`${yesterday.quantity} article${
              yesterday.quantity > 1
                ? "s"
                : ""
            } vendu${
              yesterday.quantity > 1
                ? "s"
                : ""
            }`}
            tone="slate"
          />
        </section>

        {/* RÉSUMÉ */}

        <section
          className="
            w-full
            min-w-0
            overflow-hidden
            rounded-[26px]
            border
            border-slate-200/80
            bg-white
            p-4
            shadow-[0_5px_25px_rgba(15,23,42,0.045)]
            sm:p-6
          "
        >
          <div className="mb-5 flex min-w-0 items-center gap-3">
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
              <Wallet size={19} />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-900 sm:text-xl">
                Résumé de la sélection
              </h2>

              <p className="mt-0.5 truncate text-xs text-slate-500">
                {periodLabel}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat
              label="Ventes FC"
              value={`${formatMoney(
                summary.totalFc
              )} FC`}
              tone="indigo"
            />

            <MiniStat
              label="Ventes USD"
              value={`${formatMoney(
                summary.totalUsd
              )} $`}
              tone="indigo"
            />

            <MiniStat
              label="Bénéfice FC"
              value={`${formatMoney(
                summary.profitFc
              )} FC`}
              tone="green"
              hint={`Marge ${summary.marginFc.toFixed(
                1
              )} %`}
            />

            <MiniStat
              label="Bénéfice USD"
              value={`${formatMoney(
                summary.profitUsd
              )} $`}
              tone="green"
              hint={`Marge ${summary.marginUsd.toFixed(
                1
              )} %`}
            />

            <MiniStat
              label="Nombre de ventes"
              value={String(
                summary.count
              )}
              tone="blue"
            />

            <MiniStat
              label="Quantité vendue"
              value={String(
                summary.quantity
              )}
              tone="blue"
            />
          </div>
        </section>
                {/* RECHERCHE */}

        <section
          className="
            w-full
            min-w-0
            overflow-hidden
            rounded-[26px]
            border
            border-slate-200/80
            bg-white
            p-4
            shadow-[0_5px_25px_rgba(15,23,42,0.045)]
            sm:p-6
          "
        >
          <div className="min-w-0">
            <span className="mb-3 block text-xs font-extrabold text-slate-700 sm:text-sm">
              Rechercher une période
            </span>

            <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">

              {/* DU */}

              <div className="min-w-0">
                <label
                  htmlFor="start-date"
                  className="mb-2 block text-[11px] font-bold text-slate-500"
                >
                  Du
                </label>

                <div className="relative min-w-0">
                  <CalendarDays
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500"
                  />

                  <input
                    id="start-date"
                    type="date"
                    value={
                      startDate
                    }
                    onChange={e =>
                      setStartDate(
                        e.target.value
                      )
                    }
                    className="
                      block
                      min-h-[48px]
                      w-full
                      min-w-0
                      rounded-2xl
                      border
                      border-slate-200
                      bg-slate-50
                      p-3
                      pl-10
                      text-[16px]
                      text-slate-900
                      outline-none
                      transition
                      focus:border-indigo-400
                      focus:bg-white
                      focus:ring-4
                      focus:ring-indigo-50
                      [color-scheme:light]
                    "
                  />
                </div>
              </div>

              {/* AU */}

              <div className="min-w-0">
                <label
                  htmlFor="end-date"
                  className="mb-2 block text-[11px] font-bold text-slate-500"
                >
                  Au
                </label>

                <div className="relative min-w-0">
                  <CalendarDays
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500"
                  />

                  <input
                    id="end-date"
                    type="date"
                    value={
                      endDate
                    }
                    onChange={e =>
                      setEndDate(
                        e.target.value
                      )
                    }
                    className="
                      block
                      min-h-[48px]
                      w-full
                      min-w-0
                      rounded-2xl
                      border
                      border-slate-200
                      bg-slate-50
                      p-3
                      pl-10
                      text-[16px]
                      text-slate-900
                      outline-none
                      transition
                      focus:border-indigo-400
                      focus:bg-white
                      focus:ring-4
                      focus:ring-indigo-50
                      [color-scheme:light]
                    "
                  />
                </div>
              </div>

              {/* BOUTON */}

              <button
                type="button"
                onClick={
                  filterByPeriod
                }
                className="
                  inline-flex
                  min-h-[48px]
                  w-full
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
                  shadow-indigo-600/10
                  transition
                  hover:bg-indigo-700
                  active:scale-[0.98]
                  lg:w-auto
                "
              >
                <CalendarDays
                  size={17}
                />

                Voir la période
              </button>
            </div>
          </div>

          {/* RECHERCHE PRODUIT */}

          <div className="mt-5">
            <label
              htmlFor="product-search"
              className="mb-2 block text-[11px] font-bold text-slate-500"
            >
              Rechercher un produit
            </label>

            <div
              className="
                flex
                min-h-[48px]
                items-center
                gap-2
                rounded-2xl
                border
                border-slate-200
                bg-slate-50
                px-3
              "
            >
              <Search
                size={17}
                className="shrink-0 text-slate-400"
              />

              <input
                id="product-search"
                value={
                  productQuery
                }
                onChange={e =>
                  searchProduct(
                    e.target.value
                  )
                }
                placeholder="Chercher un produit"
                className="
                  min-w-0
                  flex-1
                  bg-transparent
                  py-2
                  text-sm
                  text-slate-900
                  outline-none
                  placeholder:text-slate-400
                "
              />

              {productQuery && (
                <button
                  type="button"
                  onClick={() =>
                    searchProduct("")
                  }
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* ACTIONS */}

          <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={
                resetFilters
              }
              className="
                inline-flex
                min-h-[48px]
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                border
                border-slate-200
                bg-white
                px-5
                py-3
                text-sm
                font-extrabold
                text-slate-600
                shadow-sm
                transition
                hover:bg-slate-50
                hover:text-slate-900
              "
            >
              <X size={17} />
              Réinitialiser
            </button>

            <button
              type="button"
              onClick={
                downloadPDF
              }
              className="
                inline-flex
                min-h-[48px]
                w-full
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
                shadow-indigo-600/10
                transition
                hover:bg-indigo-700
                active:scale-[0.98]
              "
            >
              <FileText size={17} />
              Créer le PDF
            </button>
          </div>
        </section>

        {/* RÉSULTAT */}

        {(startDate ||
          endDate ||
          productQuery) && (
          <section
            className="
              w-full
              min-w-0
              overflow-hidden
              rounded-2xl
              border
              border-indigo-100
              bg-indigo-50
              p-4
            "
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                <Search size={17} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-black text-indigo-900">
                  {productQuery
                    ? `Résultat pour « ${productQuery} »`
                    : startDate &&
                      endDate
                    ? `Résultat du ${prettyDate(
                        startDate
                      )} au ${prettyDate(
                        endDate
                      )}`
                    : "Sélection incomplète"}
                </p>

                <p className="mt-1 text-xs font-medium text-indigo-700/70">
                  {
                    filteredSales.length
                  }{" "}
                  vente
                  {filteredSales.length >
                  1
                    ? "s"
                    : ""}{" "}
                  trouvée
                  {filteredSales.length >
                  1
                    ? "s"
                    : ""}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* DERNIÈRES VENTES */}

        <section
          className="
            w-full
            min-w-0
            overflow-hidden
            rounded-[26px]
            border
            border-slate-200/80
            bg-white
            p-4
            shadow-[0_4px_20px_rgba(15,23,42,0.04)]
            sm:p-6
          "
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <ShoppingCart size={19} />
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-black text-slate-900 sm:text-xl">
                  Dernières ventes
                </h2>

                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  Vos 5 dernières ventes
                </p>
              </div>
            </div>

            <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-600">
              {Math.min(
                filteredSales.length,
                5
              )}
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <Loader2
                className="animate-spin text-indigo-600"
                size={28}
              />
            </div>
          ) : displayedSales.length ===
            0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <ShoppingCart
                size={30}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-sm font-bold text-slate-500">
                Aucune vente trouvée
              </p>

              {!isOnline && (
                <p className="mt-2 text-xs text-amber-600">
                  Hors connexion : seules les ventes enregistrées sur cet appareil peuvent être affichées.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedSales.map(
                sale => (
                  <div
                    key={
                      sale.id
                    }
                    className="
                      flex
                      min-w-0
                      flex-col
                      gap-4
                      rounded-2xl
                      border
                      border-slate-100
                      bg-slate-50/70
                      p-4
                      transition
                      hover:border-indigo-100
                      hover:bg-indigo-50/30
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                        <Package size={19} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">
                          {sale.product_name ||
                            "Produit inconnu"}
                        </p>

                        <p className="mt-1 text-xs font-medium text-slate-500">
                          Quantité :{" "}
                          <span className="font-black text-slate-700">
                            {
                              sale.quantity
                            }
                          </span>

                          {" • "}

                          {new Date(
                            sale.created_at
                          ).toLocaleDateString(
                            "fr-FR"
                          )}

                          {!(
                            sale as LocalSale
                          ).synced && (
                            <>
                              {" • "}
                              <span className="font-bold text-amber-600">
                                En attente
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p
                          className={`text-base font-black ${
                            isFC(
                              sale.currency
                            )
                              ? "text-indigo-700"
                              : "text-emerald-600"
                          }`}
                        >
                          {formatMoney(
                            Number(
                              sale.total_sale ||
                                0
                            )
                          )}{" "}
                          {isFC(
                            sale.currency
                          )
                            ? "FC"
                            : "$"}
                        </p>

                        <p className="mt-0.5 text-xs font-bold text-emerald-600">
                          +
                          {formatMoney(
                            Number(
                              sale.profit ||
                                0
                            )
                          )}{" "}
                          {isFC(
                            sale.currency
                          )
                            ? "FC"
                            : "$"}{" "}
                          bénéfice
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void deleteSale(
                            sale.id
                          )
                        }
                        className="
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-red-50
                          text-red-600
                          transition
                          hover:bg-red-100
                          active:scale-95
                        "
                        title="Supprimer la vente"
                        aria-label="Supprimer la vente"
                      >
                        <Trash2
                          size={17}
                        />
                      </button>
                    </div>
                  </div>
                )
              )}

              {filteredSales.length >
                5 &&
                !showAll && (
                  <button
                    type="button"
                    onClick={
                      showEverything
                    }
                    className="
                      mt-4
                      flex
                      min-h-[48px]
                      w-full
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
                    Voir toutes les ventes
                  </button>
                )}

              {showAll &&
                filteredSales.length >
                  5 && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowAll(
                        false
                      )
                    }
                    className="
                      mt-4
                      flex
                      min-h-[48px]
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-2xl
                      border
                      border-slate-200
                      bg-white
                      px-5
                      py-3
                      text-sm
                      font-black
                      text-slate-700
                      transition
                      hover:bg-slate-50
                    "
                  >
                    <ChevronUp size={17} />
                    Afficher seulement les 5 dernières
                  </button>
                )}
            </div>
          )}
        </section>

      </div>

      {/* RETOUR EN HAUT */}

      {showTopButton && (
        <button
          type="button"
          onClick={
            scrollToTop
          }
          aria-label="Retour en haut"
          title="Retour en haut"
          className="
            fixed
            bottom-5
            right-5
            z-50
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-2xl
            bg-indigo-600
            text-white
            shadow-lg
            shadow-indigo-600/25
            transition
            duration-200
            hover:-translate-y-1
            hover:bg-indigo-700
            active:scale-95
            sm:bottom-7
            sm:right-7
            sm:h-14
            sm:w-14
          "
        >
          <ArrowUp
            size={21}
            strokeWidth={2.5}
          />
        </button>
      )}
    </main>
  );
}