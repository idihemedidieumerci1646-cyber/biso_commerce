"use client";

/**
 * BISO-COMMERCE — Dashboard
 * Next.js App Router : app/dashboard/page.tsx
 *
 * Fonctionnement :
 * - Dashboard visible hors connexion
 * - Données mises en cache dans localStorage
 * - Synchronisation automatique dès que la connexion revient
 * - Compteur d'abonnement calculé localement
 * - Après 30 jours : abonnement expiré
 * - Design conservé
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import {
  Package,
  PlusCircle,
  BarChart3,
  CreditCard,
  Banknote,
  FileText,
  Crown,
  Zap,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Clock,
  Users,
  Boxes,
  Activity,
  CalendarClock,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* TYPES                                                               */
/* ------------------------------------------------------------------ */

type Sale = {
  id?: string;
  total_sale: number;
  profit: number;
  currency: string;
  product_name: string;
  quantity: number;
  created_at: string;
  category?: string | null;
};

type Product = {
  id?: string;
  product_name?: string | null;
  name?: string | null;
  stock: number;
  price?: number | null;
  purchase_price?: number | null;
  selling_price?: number | null;
  currency?: string | null;
  expiry_date?: string | null;
  created_at?: string | null;
};

type Expense = {
  id?: string;
  amount: number;
  currency?: string | null;
  label?: string | null;
  description?: string | null;
  title?: string | null;
  created_at: string;
};

type Debt = {
  id?: string;
  client_name?: string | null;

  /*
    Compatibilité avec différentes structures
    de ta table debts.
  */

  amount?: number | null;
  total_amount?: number | null;

  paid_amount?: number | null;

  currency?: string | null;

  is_paid?: boolean | null;

  created_at: string;
};

type Money = {
  fc: number;
  usd: number;
};

type CachedDashboard = {
  sales: Sale[];
  products: Product[];
  expenses: Expense[];
  debts: Debt[];
  clientsCount: number;
  savedAt: string;
};

type CachedSubscription = {
  start_date: string;
  end_date: string;
  is_active: boolean;
  savedAt: string;
};

const zero = (): Money => ({
  fc: 0,
  usd: 0,
});

/* ------------------------------------------------------------------ */
/* CACHE LOCAL                                                         */
/* ------------------------------------------------------------------ */

const DASHBOARD_CACHE_PREFIX =
  "biso-dashboard-cache-";

const SUBSCRIPTION_CACHE_PREFIX =
  "biso-subscription-cache-";

function getDashboardCacheKey(
  userId: string
) {
  return `${DASHBOARD_CACHE_PREFIX}${userId}`;
}

function getSubscriptionCacheKey(
  userId: string
) {
  return `${SUBSCRIPTION_CACHE_PREFIX}${userId}`;
}

/* ------------------------------------------------------------------ */
/* SAUVEGARDER DASHBOARD LOCAL                                         */
/* ------------------------------------------------------------------ */

function saveDashboardCache(
  userId: string,
  data: CachedDashboard
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    localStorage.setItem(
      getDashboardCacheKey(userId),
      JSON.stringify(data)
    );
  } catch (error) {
    console.error(
      "Erreur sauvegarde cache Dashboard :",
      error
    );
  }
}

/* ------------------------------------------------------------------ */
/* LIRE DASHBOARD LOCAL                                                */
/* ------------------------------------------------------------------ */

function getDashboardCache(
  userId: string
): CachedDashboard | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  try {
    const raw =
      localStorage.getItem(
        getDashboardCacheKey(userId)
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);

    return {
      sales: Array.isArray(
        parsed.sales
      )
        ? parsed.sales
        : [],

      products: Array.isArray(
        parsed.products
      )
        ? parsed.products
        : [],

      expenses: Array.isArray(
        parsed.expenses
      )
        ? parsed.expenses
        : [],

      debts: Array.isArray(
        parsed.debts
      )
        ? parsed.debts
        : [],

      clientsCount:
        Number(
          parsed.clientsCount
        ) || 0,

      savedAt:
        parsed.savedAt ||
        new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      "Erreur lecture cache Dashboard :",
      error
    );

    return null;
  }
}

/* ------------------------------------------------------------------ */
/* SAUVEGARDER ABONNEMENT LOCAL                                       */
/* ------------------------------------------------------------------ */

function saveSubscriptionCache(
  userId: string,
  subscription: CachedSubscription
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    localStorage.setItem(
      getSubscriptionCacheKey(
        userId
      ),
      JSON.stringify(subscription)
    );
  } catch (error) {
    console.error(
      "Erreur sauvegarde cache abonnement :",
      error
    );
  }
}

/* ------------------------------------------------------------------ */
/* LIRE ABONNEMENT LOCAL                                               */
/* ------------------------------------------------------------------ */

function getSubscriptionCache(
  userId: string
): CachedSubscription | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  try {
    const raw =
      localStorage.getItem(
        getSubscriptionCacheKey(
          userId
        )
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);

    if (
      !parsed?.start_date ||
      !parsed?.end_date
    ) {
      return null;
    }

    return {
      start_date:
        parsed.start_date,

      end_date:
        parsed.end_date,

      is_active:
        parsed.is_active === true,

      savedAt:
        parsed.savedAt ||
        new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      "Erreur lecture cache abonnement :",
      error
    );

    return null;
  }
}

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

const nf =
  new Intl.NumberFormat("fr-FR");

function fmt(n: number) {
  return nf.format(
    Math.round(
      Number(n) || 0
    )
  );
}

function isUsd(
  currency?: string | null
) {
  const c =
    (
      currency ||
      "FC"
    ).toUpperCase();

  return (
    c === "USD" ||
    c === "$" ||
    c === "DOLLAR"
  );
}

function addTo(
  bucket: Money,
  currency:
    | string
    | null
    | undefined,
  value: number
) {
  const v =
    Number(value) || 0;

  if (
    isUsd(currency)
  ) {
    bucket.usd += v;
  } else {
    bucket.fc += v;
  }
}

function startOfToday() {
  const d = new Date();

  d.setHours(
    0,
    0,
    0,
    0
  );

  return d;
}

function startOfWeek() {
  const d =
    startOfToday();

  const day =
    (d.getDay() + 6) % 7;

  d.setDate(
    d.getDate() - day
  );

  return d;
}

function startOfMonth() {
  const d =
    startOfToday();

  d.setDate(1);

  return d;
}

function greeting(h: number) {
  if (h < 12) {
    return "Bonjour";
  }

  if (h < 18) {
    return "Bon après-midi";
  }

  return "Bonsoir";
}

function relative(
  dateStr: string
) {
  const date =
    new Date(dateStr);

  return date.toLocaleString(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );
}

function daysBetween(
  a: Date,
  b: Date
) {
  return Math.floor(
    (
      a.getTime() -
      b.getTime()
    ) /
      86400000
  );
}

function getProductName(
  product: Product
) {
  return (
    product.product_name ||
    product.name ||
    "Produit sans nom"
  );
}

function getDebtRemaining(
  debt: Debt
) {
  const total =
    Number(
      debt.total_amount ??
        debt.amount ??
        0
    );

  const paid =
    Number(
      debt.paid_amount || 0
    );

  return Math.max(
    0,
    total - paid
  );
}

function isDebtPaid(
  debt: Debt
) {
  return (
    debt.is_paid === true ||
    getDebtRemaining(
      debt
    ) <= 0
  );
}

/* ------------------------------------------------------------------ */
/* PETITS COMPOSANTS UI                                                */
/* ------------------------------------------------------------------ */

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_50px_-25px_rgba(0,0,0,0.9)] backdrop-blur-xl " +
        className
      }
    >
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "orange",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  tone?:
    | "orange"
    | "green"
    | "blue"
    | "red"
    | "violet";
}) {
  const tones: Record<
    string,
    string
  > = {
    orange:
      "from-orange-500/25 to-amber-400/5 text-orange-300",

    green:
      "from-emerald-500/25 to-emerald-400/5 text-emerald-300",

    blue:
      "from-sky-500/25 to-cyan-400/5 text-sky-300",

    red:
      "from-rose-500/25 to-red-400/5 text-rose-300",

    violet:
      "from-violet-500/25 to-fuchsia-400/5 text-violet-300",
  };

  return (
    <GlassCard className="relative overflow-hidden p-3 transition duration-300 hover:-translate-y-0.5 hover:border-white/20">
      <div
        className={`pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-gradient-to-br blur-2xl ${tones[tone]}`}
      />

      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <span
          className={`rounded-xl bg-gradient-to-br p-2 ${tones[tone]}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-2">
        <p className="text-lg font-black leading-none text-white">
          {value}
        </p>

        {hint ? (
          <p className="mt-2 text-sm font-bold text-emerald-300">
            {hint}
          </p>
        ) : null}
      </div>
    </GlassCard>
  );
}

/* ------------------------------------------------------------------ */
/* SKELETON                                                            */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="min-h-screen bg-[#050b16] p-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="h-24 animate-pulse rounded-[1.6rem] bg-white/5" />

        <div className="h-28 animate-pulse rounded-[1.6rem] bg-white/5" />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({
            length: 6,
          }).map(
            (_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-[1.6rem] bg-white/5"
              />
            )
          )}
        </div>

        <div className="h-40 animate-pulse rounded-[1.6rem] bg-white/5" />

        <p className="pt-2 text-center text-xs text-slate-500">
          Chargement du tableau de bord...
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const router =
    useRouter();

  const [
    initialLoading,
    setInitialLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    showInfo,
    setShowInfo,
  ] = useState(false);

  const [
    showAllSales,
    setShowAllSales,
  ] = useState(false);

  const [
    showAllExpenses,
    setShowAllExpenses,
  ] = useState(false);

  const [
    lastSync,
    setLastSync,
  ] =
    useState<Date | null>(
      null
    );

  const [
    now,
    setNow,
  ] = useState<Date | null>(
    null
  );

  const [
    isOnline,
    setIsOnline,
  ] = useState(true);

  const [
    daysUsed,
    setDaysUsed,
  ] = useState(0);

  const [
    daysLeft,
    setDaysLeft,
  ] = useState(30);

  const [
    status,
    setStatus,
  ] = useState<
    "active" | "expired"
  >("active");

  const [
    sales,
    setSales,
  ] = useState<Sale[]>(
    []
  );

  const [
    products,
    setProducts,
  ] = useState<Product[]>(
    []
  );

  const [
    expenses,
    setExpenses,
  ] = useState<Expense[]>(
    []
  );

  const [
    debts,
    setDebts,
  ] = useState<Debt[]>(
    []
  );

  const [
    clientsCount,
    setClientsCount,
  ] = useState(0);

  const userIdRef =
    useRef<string | null>(
      null
    );

      /* =========================================================
     CHARGER LES VENTES POUR LE DASHBOARD
  ========================================================= */

  const loadDashboardSales =
    useCallback(async () => {
      const userId =
        userIdRef.current ||
        localStorage.getItem("user_id");

      if (!userId) {
        return;
      }

      try {
        const {
          data,
          error,
        } = await supabase
          .from("sales")
          .select(`
            id,
            user_id,
            product_id,
            product_name,
            quantity,
            purchase_price,
            selling_price,
            total_sale,
            profit,
            currency,
            created_at
          `)
          .eq(
            "user_id",
            userId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (error) {
          console.error(
            "[BISO-COMMERCE] Erreur chargement ventes Dashboard :",
            error
          );

          return;
        }

        setSales(
          (data || []) as Sale[]
        );

      } catch (error) {
        console.error(
          "[BISO-COMMERCE] Erreur ventes Dashboard :",
          error
        );
      }
    }, []);

    useEffect(() => {
  void loadDashboardSales();

  const handleSalesUpdated = () => {
    void loadDashboardSales();
  };

  const handleOfflineSalesSynced = () => {
    void loadDashboardSales();
  };

  window.addEventListener(
    "biso-sales-updated",
    handleSalesUpdated
  );

  window.addEventListener(
    "biso-offline-sales-synced",
    handleOfflineSalesSynced
  );

  return () => {
    window.removeEventListener(
      "biso-sales-updated",
      handleSalesUpdated
    );

    window.removeEventListener(
      "biso-offline-sales-synced",
      handleOfflineSalesSynced
    );
  };
}, [loadDashboardSales]);


  /* ============================================================
     HORLOGE
  ============================================================ */

  useEffect(() => {
    setNow(
      new Date()
    );

    const timer =
      window.setInterval(
        () => {
          setNow(
            new Date()
          );
        },
        1000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, []);

  /* ============================================================
     ABONNEMENT
  ============================================================ */

  const checkSubscription =
    useCallback(
      async (
        userId: string
      ) => {
        /*
          ----------------------------------------------------
          HORS CONNEXION
          ----------------------------------------------------
        */

        if (
          typeof window !==
            "undefined" &&
          !navigator.onLine
        ) {
          const cached =
            getSubscriptionCache(
              userId
            );

          if (cached) {
            const start =
              new Date(
                cached.start_date
              );

            const end =
              new Date(
                cached.end_date
              );

            const current =
              new Date();

            const diffDays =
              Math.floor(
                (
                  current.getTime() -
                  start.getTime()
                ) /
                  86400000
              );

            const used =
              diffDays < 0
                ? 0
                : diffDays;

            const active =
              cached.is_active ===
                true &&
              end >
                current;

            setDaysUsed(
              Math.min(
                30,
                used
              )
            );

            setDaysLeft(
              Math.max(
                0,
                Math.min(
                  30,
                  30 - used
                )
              )
            );

            setStatus(
              active
                ? "active"
                : "expired"
            );

            return active;
          }

          /*
            S'il n'y a encore aucun cache,
            on laisse le Dashboard visible.
          */

          setStatus(
            "active"
          );

          setDaysUsed(0);
          setDaysLeft(30);

          return true;
        }

        /*
          ----------------------------------------------------
          EN LIGNE
          ----------------------------------------------------
        */

        try {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                "subscriptions"
              )
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
              )
              .limit(1);

          if (error) {
            console.error(
              "Erreur abonnement :",
              error
            );

            const cached =
              getSubscriptionCache(
                userId
              );

            if (
              cached
            ) {
              const start =
                new Date(
                  cached.start_date
                );

              const end =
                new Date(
                  cached.end_date
                );

              const current =
                new Date();

              const diffDays =
                Math.floor(
                  (
                    current.getTime() -
                    start.getTime()
                  ) /
                    86400000
                );

              const used =
                diffDays < 0
                  ? 0
                  : diffDays;

              const active =
                cached.is_active ===
                  true &&
                end >
                  current;

              setDaysUsed(
                Math.min(
                  30,
                  used
                )
              );

              setDaysLeft(
                Math.max(
                  0,
                  Math.min(
                    30,
                    30 - used
                  )
                )
              );

              setStatus(
                active
                  ? "active"
                  : "expired"
              );

              return active;
            }

            setStatus(
              "active"
            );

            return true;
          }

          const sub =
            data?.[0];

          if (!sub) {
            setStatus(
              "expired"
            );

            setDaysUsed(
              30
            );

            setDaysLeft(
              0
            );

            return false;
          }

          /*
            Sauvegarder la vraie
            information serveur localement.
          */

          saveSubscriptionCache(
            userId,
            {
              start_date:
                sub.start_date,

              end_date:
                sub.end_date,

              is_active:
                sub.is_active ===
                true,

              savedAt:
                new Date().toISOString(),
            }
          );

          const start =
            new Date(
              sub.start_date
            );

          const end =
            new Date(
              sub.end_date
            );

          const current =
            new Date();

          const diffDays =
            Math.floor(
              (
                current.getTime() -
                start.getTime()
              ) /
                86400000
            );

          const used =
            diffDays < 0
              ? 0
              : diffDays;

          setDaysUsed(
            Math.min(
              30,
              used
            )
          );

          setDaysLeft(
            Math.max(
              0,
              Math.min(
                30,
                30 - used
              )
            )
          );

          const active =
            sub.is_active ===
              true &&
            end >
              current;

          setStatus(
            active
              ? "active"
              : "expired"
          );

          return active;
        } catch (error) {
          console.error(
            "Erreur checkSubscription :",
            error
          );

          const cached =
            getSubscriptionCache(
              userId
            );

          if (
            cached
          ) {
            const start =
              new Date(
                cached.start_date
              );

            const end =
              new Date(
                cached.end_date
              );

            const current =
              new Date();

            const diffDays =
              Math.floor(
                (
                  current.getTime() -
                  start.getTime()
                ) /
                  86400000
              );

            const used =
              diffDays < 0
                ? 0
                : diffDays;

            const active =
              cached.is_active ===
                true &&
              end >
                current;

            setDaysUsed(
              Math.min(
                30,
                used
              )
            );

            setDaysLeft(
              Math.max(
                0,
                Math.min(
                  30,
                  30 - used
                )
              )
            );

            setStatus(
              active
                ? "active"
                : "expired"
            );

            return active;
          }

          setStatus(
            "active"
          );

          return true;
        }
      },
      []
    );

  /* ============================================================
     CHARGEMENT DES DONNÉES
  ============================================================ */

  const loadDashboard =
    useCallback(
      async (
        userId: string
      ) => {
        /*
          ----------------------------------------------------
          HORS CONNEXION
          ----------------------------------------------------
        */

        if (
          typeof window !==
            "undefined" &&
          !navigator.onLine
        ) {
          const cached =
            getDashboardCache(
              userId
            );

          if (
            cached
          ) {
            setSales(
              cached.sales
            );

            setProducts(
              cached.products
            );

            setExpenses(
              cached.expenses
            );

            setDebts(
              cached.debts
            );

            setClientsCount(
              cached.clientsCount
            );

            const savedAt =
              new Date(
                cached.savedAt
              );

            if (
              !Number.isNaN(
                savedAt.getTime()
              )
            ) {
              setLastSync(
                savedAt
              );
            }

            return;
          }

          /*
            Aucun cache :
            Dashboard vide mais ouvert.
          */

          setSales([]);
          setProducts([]);
          setExpenses([]);
          setDebts([]);
          setClientsCount(0);

          return;
        }

        /*
          ----------------------------------------------------
          EN LIGNE
          ----------------------------------------------------
        */

        try {
          const monthStart =
            startOfMonth();

          const chartStart =
            new Date(
              Math.min(
                monthStart.getTime(),
                Date.now() -
                  29 *
                    86400000
              )
            );

          const [
            salesRes,
            productsRes,
            expensesRes,
            debtsRes,
          ] =
            await Promise.all(
              [
                supabase
                  .from(
                    "sales"
                  )
                  .select("*")
                  .eq(
                    "user_id",
                    userId
                  )
                  .gte(
                    "created_at",
                    chartStart.toISOString()
                  )
                  .order(
                    "created_at",
                    {
                      ascending:
                        false,
                    }
                  ),

                supabase
                  .from(
                    "products"
                  )
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
                  .from(
                    "expenses"
                  )
                  .select("*")
                  .eq(
                    "user_id",
                    userId
                  )
                  .gte(
                    "created_at",
                    chartStart.toISOString()
                  )
                  .order(
                    "created_at",
                    {
                      ascending:
                        false,
                    }
                  ),

                supabase
                  .from(
                    "debts"
                  )
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
              ]
            );

          const salesData =
            (salesRes.data as Sale[]) ||
            [];

          const productsData =
            (productsRes.data as Product[]) ||
            [];

          const expensesData =
            (expensesRes.data as Expense[]) ||
            [];

          const debtRows =
            (debtsRes.data as Debt[]) ||
            [];

          const uniqueClients =
            new Set(
              debtRows
                .map(
                  (d) =>
                    (
                      d.client_name ||
                      ""
                    )
                      .trim()
                      .toLowerCase()
                )
                .filter(Boolean)
            );

          const clients =
            uniqueClients.size;

          setSales(
            salesData
          );

          setProducts(
            productsData
          );

          setExpenses(
            expensesData
          );

          setDebts(
            debtRows
          );

          setClientsCount(
            clients
          );

          const syncDate =
            new Date();

          setLastSync(
            syncDate
          );

          /*
            CACHE
          */

          saveDashboardCache(
            userId,
            {
              sales:
                salesData,

              products:
                productsData,

              expenses:
                expensesData,

              debts:
                debtRows,

              clientsCount:
                clients,

              savedAt:
                syncDate.toISOString(),
            }
          );
        } catch (error) {
          console.error(
            "Erreur loadDashboard :",
            error
          );

          /*
            En cas d'erreur réseau :
            récupérer le dernier cache.
          */

          const cached =
            getDashboardCache(
              userId
            );

          if (
            cached
          ) {
            setSales(
              cached.sales
            );

            setProducts(
              cached.products
            );

            setExpenses(
              cached.expenses
            );

            setDebts(
              cached.debts
            );

            setClientsCount(
              cached.clientsCount
            );

            const savedAt =
              new Date(
                cached.savedAt
              );

            if (
              !Number.isNaN(
                savedAt.getTime()
              )
            ) {
              setLastSync(
                savedAt
              );
            }
          }
        }
      },
      []
    );

  /* ============================================================
     CHARGEMENT GLOBAL
  ============================================================ */

  const loadAll =
    useCallback(
      async () => {
        try {
          if (
            typeof window ===
            "undefined"
          ) {
            return;
          }

          const phone =
            localStorage.getItem(
              "phone"
            );

          if (
            !phone
          ) {
            router.replace(
              "/login"
            );

            return;
          }

          let userId =
            localStorage.getItem(
              "user_id"
            );

          /*
            --------------------------------------------------
            HORS CONNEXION
            --------------------------------------------------
          */

          if (
            !navigator.onLine
          ) {
            if (
              !userId
            ) {
              /*
                Le user_id doit normalement
                avoir été sauvegardé au login.

                On ne redirige pas vers Supabase
                puisqu'il n'y a pas Internet.
              */

              setInitialLoading(
                false
              );

              return;
            }

            userIdRef.current =
              userId;

            /*
              AFFICHAGE LOCAL IMMÉDIAT
            */

            setInitialLoading(
              false
            );

            await loadDashboard(
              userId
            );

            await checkSubscription(
              userId
            );

            return;
          }

          /*
            --------------------------------------------------
            EN LIGNE
            --------------------------------------------------
          */

          if (
            !userId
          ) {
            const {
              data: user,
              error,
            } =
              await supabase
                .from(
                  "users"
                )
                .select(
                  "id"
                )
                .eq(
                  "phone",
                  phone
                )
                .single();

            if (
              error ||
              !user
            ) {
              console.error(
                "Erreur utilisateur :",
                error
              );

              setInitialLoading(
                false
              );

              return;
            }

            userId =
              String(
                user.id
              );

            localStorage.setItem(
              "user_id",
              userId
            );
          }

          userIdRef.current =
            userId;

          /*
            --------------------------------------------------
            CACHE IMMÉDIAT
            --------------------------------------------------
          */

          const cached =
            getDashboardCache(
              userId
            );

          if (
            cached
          ) {
            setSales(
              cached.sales
            );

            setProducts(
              cached.products
            );

            setExpenses(
              cached.expenses
            );

            setDebts(
              cached.debts
            );

            setClientsCount(
              cached.clientsCount
            );

            const savedAt =
              new Date(
                cached.savedAt
              );

            if (
              !Number.isNaN(
                savedAt.getTime()
              )
            ) {
              setLastSync(
                savedAt
              );
            }
          }

          /*
            Dashboard visible immédiatement.
          */

          setInitialLoading(
            false
          );

          /*
            Synchronisation serveur.
          */

          await Promise.all(
            [
              loadDashboard(
                userId
              ),

              checkSubscription(
                userId
              ),
            ]
          );
        } catch (error) {
          console.error(
            "Erreur dashboard :",
            error
          );

          setInitialLoading(
            false
          );
        }
      },
      [
        router,
        loadDashboard,
        checkSubscription,
      ]
    );

  /* ============================================================
     REFRESH
  ============================================================ */

  const refresh =
    useCallback(
      async () => {
        if (
          !userIdRef.current ||
          refreshing
        ) {
          return;
        }

        setRefreshing(
          true
        );

        try {
          await Promise.all(
            [
              loadDashboard(
                userIdRef.current
              ),

              checkSubscription(
                userIdRef.current
              ),
            ]
          );
        } finally {
          setRefreshing(
            false
          );
        }
      },
      [
        refreshing,
        loadDashboard,
        checkSubscription,
      ]
    );

  /* ============================================================
     INTERNET
  ============================================================ */

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
        setIsOnline(
          true
        );

        /*
          Resynchronisation
          dès le retour Internet.
        */

        if (
          userIdRef.current
        ) {
          window.setTimeout(
            () => {
              void refresh();
            },
            300
          );
        }
      };

    const handleOffline =
      () => {
        setIsOnline(
          false
        );

        /*
          Recharger immédiatement
          depuis le cache.
        */

        if (
          userIdRef.current
        ) {
          void loadDashboard(
            userIdRef.current
          );

          void checkSubscription(
            userIdRef.current
          );
        }
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
    refresh,
    loadDashboard,
    checkSubscription,
  ]);

  /* ============================================================
     INITIALISATION
  ============================================================ */

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  /* ============================================================
     STATISTIQUES
  ============================================================ */

  const stats =
    useMemo(() => {
      const productSales: Record<
        string,
        number
      > = {};

      for (
        const s of sales
      ) {
        const name =
          s.product_name ||
          "Inconnu";

        productSales[name] =
          (
            productSales[name] ||
            0
          ) +
          (
            Number(
              s.quantity
            ) || 0
          );
      }

      const bestProduct =
        Object.entries(
          productSales
        ).sort(
          (
            a,
            b
          ) =>
            b[1] -
            a[1]
        )[0];

      const dayStart =
        startOfToday().getTime();

      const weekStart =
        startOfWeek().getTime();

      const monthStart =
        startOfMonth().getTime();

      const salesToday =
        zero();

      const salesWeek =
        zero();

      const salesMonth =
        zero();

      const profitToday =
        zero();

      const profitWeek =
        zero();

      const profitMonth =
        zero();

      const expToday =
        zero();

      const expMonth =
        zero();

      let qtyToday = 0;
      let countToday = 0;
      let countWeek = 0;
      let countMonth = 0;

      for (
        const s of sales
      ) {
        const t =
          new Date(
            s.created_at
          ).getTime();

        if (
          Number.isNaN(t)
        ) {
          continue;
        }

        if (
          t >=
          monthStart
        ) {
          countMonth++;

          addTo(
            salesMonth,
            s.currency,
            s.total_sale
          );

          addTo(
            profitMonth,
            s.currency,
            s.profit
          );
        }

        if (
          t >=
          weekStart
        ) {
          countWeek++;

          addTo(
            salesWeek,
            s.currency,
            s.total_sale
          );

          addTo(
            profitWeek,
            s.currency,
            s.profit
          );
        }

        if (
          t >=
          dayStart
        ) {
          countToday++;

          qtyToday +=
            Number(
              s.quantity
            ) || 0;

          addTo(
            salesToday,
            s.currency,
            s.total_sale
          );

          addTo(
            profitToday,
            s.currency,
            s.profit
          );
        }
      }

      for (
        const e of expenses
      ) {
        const t =
          new Date(
            e.created_at
          ).getTime();

        if (
          Number.isNaN(t)
        ) {
          continue;
        }

        if (
          t >=
          monthStart
        ) {
          addTo(
            expMonth,
            e.currency,
            e.amount
          );
        }

        if (
          t >=
          dayStart
        ) {
          addTo(
            expToday,
            e.currency,
            e.amount
          );
        }
      }

      const stockValue =
        zero();

      for (
        const p of products
      ) {
        const unit =
          Number(
            p.purchase_price ??
              p.price ??
              0
          );

        addTo(
          stockValue,
          p.currency,
          unit *
            (
              Number(
                p.stock
              ) || 0
            )
        );
      }

      const outOfStock =
        products.filter(
          (p) =>
            Number(
              p.stock
            ) <= 0
        );

      const lowStock =
        products.filter(
          (p) =>
            Number(
              p.stock
            ) > 0 &&
            Number(
              p.stock
            ) <= 5
        );

      const today =
        startOfToday();

      const soon =
        new Date(
          today.getTime() +
            7 *
              86400000
        );

      const expired =
        products.filter(
          (p) =>
            p.expiry_date &&
            new Date(
              p.expiry_date
            ) < today
        );

      const expiringSoon =
        products.filter(
          (p) =>
            p.expiry_date &&
            new Date(
              p.expiry_date
            ) >=
              today &&
            new Date(
              p.expiry_date
            ) <=
              soon
        );

      const unpaidDebts =
        debts.filter(
          (d) =>
            !isDebtPaid(d)
        );

      const debtTotal =
        zero();

      for (
        const d of unpaidDebts
      ) {
        addTo(
          debtTotal,
          d.currency,
          getDebtRemaining(
            d
          )
        );
      }

      return {
        salesToday,
        salesWeek,
        salesMonth,
        bestProduct,
        profitToday,
        profitWeek,
        profitMonth,
        expToday,
        expMonth,
        qtyToday,
        countToday,
        countWeek,
        countMonth,
        stockValue,
        outOfStock,
        lowStock,
        expired,
        expiringSoon,
        unpaidDebts,
        debtTotal,
      };
    }, [
      sales,
      products,
      expenses,
      debts,
    ]);

  /* ============================================================
     CHARTS / DONNÉES VISUELLES
  ============================================================ */

  const charts =
    useMemo(() => {
      const days: {
        key: string;
        label: string;
      }[] = [];

      const labels = [
        "dim",
        "lun",
        "mar",
        "mer",
        "jeu",
        "ven",
        "sam",
      ];

      for (
        let i = 6;
        i >= 0;
        i--
      ) {
        const d =
          new Date(
            startOfToday().getTime() -
              i *
                86400000
          );

        days.push({
          key: d
            .toISOString()
            .slice(0, 10),

          label:
            labels[
              d.getDay()
            ],
        });
      }

      const salesMap: Record<
        string,
        number
      > = {};

      const profitMap: Record<
        string,
        number
      > = {};

      const expenseMap: Record<
        string,
        number
      > = {};

      const productMap: Record<
        string,
        number
      > = {};

      const categoryMap: Record<
        string,
        number
      > = {};

      for (
        const s of sales
      ) {
        const key =
          (
            s.created_at ||
            ""
          ).slice(0, 10);

        const amount =
          Number(
            s.total_sale
          ) || 0;

        const factor =
          isUsd(
            s.currency
          )
            ? 2800
            : 1;

        salesMap[key] =
          (
            salesMap[key] ||
            0
          ) +
          amount *
            factor;

        profitMap[key] =
          (
            profitMap[key] ||
            0
          ) +
          (
            Number(
              s.profit
            ) || 0
          ) *
            factor;

        const name =
          s.product_name ||
          "Inconnu";

        productMap[name] =
          (
            productMap[
              name
            ] || 0
          ) +
          (
            Number(
              s.quantity
            ) || 0
          );

        const cat =
          s.category ||
          "Sans catégorie";

        categoryMap[cat] =
          (
            categoryMap[
              cat
            ] || 0
          ) + 1;
      }

      for (
        const e of expenses
      ) {
        const key =
          (
            e.created_at ||
            ""
          ).slice(0, 10);

        const factor =
          isUsd(
            e.currency
          )
            ? 2800
            : 1;

        expenseMap[key] =
          (
            expenseMap[key] ||
            0
          ) +
          (
            Number(
              e.amount
            ) || 0
          ) *
            factor;
      }

      const top = (
        m: Record<
          string,
          number
        >
      ) =>
        Object.entries(
          m
        )
          .sort(
            (
              a,
              b
            ) =>
              b[1] -
              a[1]
          )
          .slice(
            0,
            5
          )
          .map(
            ([
              label,
              value,
            ]) => ({
              label,
              value,
            })
          );

      return {
        salesSeries:
          days.map(
            (d) => ({
              label:
                d.label,
              value:
                salesMap[
                  d.key
                ] || 0,
            })
          ),

        profitSeries:
          days.map(
            (d) => ({
              label:
                d.label,
              value:
                profitMap[
                  d.key
                ] || 0,
            })
          ),

        expenseSeries:
          days.map(
            (d) => ({
              label:
                d.label,
              value:
                expenseMap[
                  d.key
                ] || 0,
            })
          ),

        topProducts:
          top(
            productMap
          ),

        topCategories:
          top(
            categoryMap
          ),
      };
    }, [
      sales,
      expenses,
    ]);

  const recentSales =
    useMemo(
      () =>
        sales.slice(
          0,
          5
        ),
      [sales]
    );

  const recentExpenses =
    useMemo(
      () =>
        expenses.slice(
          0,
          5
        ),
      [expenses]
    );

  const percentUsed =
    Math.min(
      100,
      Math.round(
        (daysUsed / 30) *
          100
      )
    );

  /* ============================================================
     CHARGEMENT
  ============================================================ */

  if (
    initialLoading
  ) {
    return (
      <Skeleton />
    );
  }

  /* ============================================================
     EXPIRÉ
  ============================================================ */

  if (
    status ===
    "expired"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050b16] p-5">
        <GlassCard className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 w-fit rounded-2xl bg-gradient-to-br from-rose-500/30 to-orange-400/10 p-4">
            <ShieldCheck className="h-8 w-8 text-rose-300" />
          </div>

          <h1 className="text-2xl font-black text-white">
            Abonnement expiré
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Votre période gratuite ou votre abonnement est terminé.
            <br />
            Renouvelez votre accès pour continuer à gérer votre commerce.
          </p>

          <Link
            href="/subscription"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 p-4 font-black text-black"
          >
            <Crown className="h-5 w-5" />
            Renouveler abonnement
          </Link>

          <a
            href="https://wa.me/243994864173"
            className="mt-3 block w-full rounded-2xl border border-white/10 p-4 text-sm font-semibold text-slate-300"
          >
            Contacter le support WhatsApp
          </a>

          <div className="mt-5 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5 text-[10px] font-black text-rose-300">
              {isOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5" />
                  En ligne
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  Hors connexion
                </>
              )}
            </span>
          </div>
        </GlassCard>
      </div>
    );
  }

  /* ============================================================
     LABELS
  ============================================================ */

  const dateLabel =
    now
      ? now.toLocaleDateString(
          "fr-FR",
          {
            weekday:
              "long",
            day: "numeric",
            month:
              "long",
            year:
              "numeric",
          }
        )
      : "";

  const timeLabel =
    now
      ? now.toLocaleTimeString(
          "fr-FR",
          {
            hour:
              "2-digit",
            minute:
              "2-digit",
            second:
              "2-digit",
          }
        )
      : "--:--:--";

  /* ============================================================
     ACCÈS RAPIDE
  ============================================================ */

  const quickAccess = [
    {
      label: "Produits",
      icon: Package,
      href: "/products",
    },

    {
      label: "Ajouter Produit",
      icon: PlusCircle,
      href: "/products/add",
    },

    {
      label: "Nouvelle Vente",
      icon: ShoppingCart,
      href: "/sales",
    },

    {
      label: "Rapports",
      icon: FileText,
      href: "/reports",
    },

    {
      label: "Dépenses",
      icon: Banknote,
      href: "/expenses",
    },

    {
      label: "Dettes",
      icon: CreditCard,
      href: "/debts",
    },

    {
      label: "Assistant IA",
      icon: Sparkles,
      href: "/assistant",
    },

    {
      label: "Abonnement",
      icon: Crown,
      href: "/subscription",
    },
  ];

  /* ============================================================
     ALERTES
  ============================================================ */

  const alerts = [
    stats.lowStock.length >
      0 && {
      key: "low",
      icon:
        AlertTriangle,
      text:
        `${stats.lowStock.length} produit(s) presque épuisé(s)`,
      href:
        "/products/low-stock",
      tone:
        "text-amber-300",
    },

    stats.outOfStock
      .length > 0 && {
      key: "out",
      icon: Boxes,
      text:
        `${stats.outOfStock.length} produit(s) en rupture`,
      href:
        "/products/low-stock",
      tone:
        "text-rose-300",
    },

    stats.expired.length >
      0 && {
      key: "exp",
      icon:
        CalendarClock,
      text:
        `${stats.expired.length} produit(s) expiré(s)`,
      href:
        "/products",
      tone:
        "text-rose-300",
    },

    stats.expiringSoon
      .length > 0 && {
      key: "soon",
      icon:
        CalendarClock,
      text:
        `${stats.expiringSoon.length} produit(s) expirent bientôt`,
      href:
        "/products",
      tone:
        "text-amber-300",
    },

    stats.unpaidDebts
      .length > 0 && {
      key: "debt",
      icon:
        CreditCard,
      text:
        `${stats.unpaidDebts.length} dette(s) à récupérer — ${fmt(
          stats.debtTotal.fc
        )} FC / ${fmt(
          stats.debtTotal.usd
        )} $`,
      href:
        "/debts",
      tone:
        "text-sky-300",
    },

    daysLeft <= 5 && {
      key: "sub",
      icon: Crown,
      text:
        `Abonnement : ${daysLeft} jour(s) restant(s)`,
      href:
        "/subscription",
      tone:
        "text-orange-300",
    },
  ].filter(Boolean) as {
    key: string;

    icon: React.ComponentType<{
      className?: string;
    }>;

    text: string;
    href: string;
    tone: string;
  }[];

  /* ============================================================
     DASHBOARD
  ============================================================ */

  return (
    <div className="min-h-screen bg-[#050b16] pb-16 text-white">

      {/* HALO */}

      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(249,115,22,0.18),transparent)]" />

      <div className="relative mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">

        {/* ========================================================
            HEADER
        ======================================================== */}

        <GlassCard>
          <div className="flex items-start justify-between gap-3">

            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-gradient-to-br from-orange-500 to-yellow-400 p-2">
                  <Zap className="h-4 w-4 text-black" />
                </span>

                <h1 className="text-lg font-black tracking-tight">
                  BISO-
                  <span className="bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent">
                    COMMERCE
                  </span>
                </h1>
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-200">
                {now
                  ? greeting(
                      now.getHours()
                    )
                  : "Bonjour"}
                , PDG 👋
              </p>

              <p className="text-[11px] capitalize text-slate-400">
                {dateLabel}
              </p>

              {/* ÉTAT INTERNET */}

              <div className="mt-3 flex flex-wrap items-center gap-2">

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black ${
                    isOnline
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-amber-500/10 text-amber-300"
                  }`}
                >
                  {isOnline ? (
                    <>
                      <Wifi className="h-3.5 w-3.5" />
                      En ligne
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3.5 w-3.5" />
                      Hors connexion
                    </>
                  )}
                </span>

                {!isOnline && (
                  <span className="text-[10px] font-medium text-slate-500">
                    Données locales utilisées
                  </span>
                )}

              </div>
            </div>

            <div className="text-right">

              <div className="flex items-center justify-end gap-1 text-sm font-black tabular-nums text-orange-300">
                <Clock className="h-4 w-4" />
                {timeLabel}
              </div>

              <button
                type="button"
                onClick={refresh}
                disabled={
                  refreshing
                }
                className="mt-2 inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    refreshing
                      ? "animate-spin"
                      : ""
                  }`}
                />

                Actualiser
              </button>

            </div>
          </div>

          <p className="mt-3 text-[10px] text-slate-500">
            Dernière synchronisation :{" "}
            {lastSync
              ? lastSync.toLocaleTimeString(
                  "fr-FR",
                  {
                    hour:
                      "2-digit",
                    minute:
                      "2-digit",
                  }
                )
              : "—"}

           {!isOnline &&
  " • Hors connexion — Synchronisation automatique dès le retour de la connexion."}
</p>
</GlassCard>

        {/* ========================================================
            ABONNEMENT
        ======================================================== */}

        <GlassCard className="relative overflow-hidden">

          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/20 blur-3xl" />

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-orange-300" />

              <p className="text-sm font-bold">
                Abonnement actif
              </p>
            </div>

            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-slate-200">
              {daysUsed}/30 jours
            </span>

          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">

            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-700"
              style={{
                width: `${percentUsed}%`,
              }}
            />

          </div>

          <div className="mt-2 flex items-center justify-between text-[11px]">

            <span className="text-slate-400">
              Temps restant
            </span>

            <span className="font-bold text-orange-300">
              {daysLeft} jours
            </span>

          </div>

          {!isOnline && (
            <p className="mt-3 rounded-xl bg-amber-500/10 p-2.5 text-[10px] font-semibold text-amber-300">
              
            </p>
          )}

        </GlassCard>

        {/* ========================================================
            INFORMATION
        ======================================================== */}

        <div className="flex justify-center">

          <button
            type="button"
            onClick={() =>
              setShowInfo(true)
            }
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-bold text-white shadow-sm transition hover:border-white/40 hover:bg-white/20 active:scale-95"
          >
            ✨ Clique ici pour en savoir plus sur Biso-commerce
          </button>

        </div>

        {/* ========================================================
            NOUVELLE VENTE
        ======================================================== */}

        <Link
          href="/sales"
          className="flex items-center justify-between rounded-[1.6rem] bg-gradient-to-r from-orange-500 to-yellow-400 p-5 shadow-[0_20px_45px_-20px_rgba(249,115,22,0.9)] transition active:scale-[0.98]"
        >

          <div className="flex items-center gap-3">

            <span className="rounded-2xl bg-black/15 p-3">
              <ShoppingCart className="h-6 w-6 text-black" />
            </span>

            <div>

              <p className="text-base font-black text-black">
                Nouvelle vente
              </p>

              <p className="text-[11px] font-semibold text-black/70">
                Ouvrir la caisse rapidement
              </p>

            </div>

          </div>

          <ArrowRight className="h-5 w-5 text-black" />

        </Link>

        {/* ========================================================
            STATS
        ======================================================== */}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">

          <StatCard
            label="Ventes aujourd'hui"
            value={`${fmt(
              stats.salesToday.fc
            )} FC`}
            hint={`${fmt(
              stats.salesToday.usd
            )} $ • ${stats.countToday} vente(s)`}
            icon={
              ShoppingCart
            }
            tone="orange"
          />

          <StatCard
            label="Bénéfice aujourd'hui"
            value={`${fmt(
              stats.profitToday.fc
            )} FC`}
            hint={`${fmt(
              stats.profitToday.usd
            )} $`}
            icon={Wallet}
            tone="green"
          />

          <StatCard
            label="Dépenses aujourd'hui"
            value={`${fmt(
              stats.expToday.fc
            )} FC`}
            hint={`${fmt(
              stats.expToday.usd
            )} $`}
            icon={
              TrendingDown
            }
            tone="red"
          />

          <StatCard
            label="Total produits"
            value={fmt(
              products.length
            )}
            hint={`${stats.qtyToday} article(s) vendu(s) aujourd'hui`}
            icon={Package}
            tone="blue"
          />

          <StatCard
            label="Ruptures"
            value={fmt(
              stats.outOfStock
                .length
            )}
            hint={`${stats.lowStock.length} presque épuisé(s)`}
            icon={
              AlertTriangle
            }
            tone="red"
          />

          <StatCard
            label="Clients / Dettes"
            value={`${fmt(
              clientsCount
            )} / ${fmt(
              stats
                .unpaidDebts
                .length
            )}`}
            hint="N'oubliez pas les dettes de vos clients"
            icon={Users}
            tone="orange"
          />

        </div>

        {/* ========================================================
            PRODUIT LE PLUS VENDU
        ======================================================== */}

        <GlassCard className="p-3">

          <div className="flex items-center justify-between">

            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Produit le plus vendu
            </p>

            <span className="rounded-xl bg-gradient-to-br from-emerald-500/25 to-emerald-400/5 p-2 text-emerald-300">
              <TrendingUp className="h-4 w-4" />
            </span>

          </div>

          <p className="mt-2 truncate text-sm font-black text-white">
            {stats.bestProduct
              ? stats.bestProduct[0]
              : "Aucun"}
          </p>

          <p className="mt-1 text-xs font-bold text-emerald-300">
            {stats.bestProduct
              ? `${stats.bestProduct[1]} article(s) vendu(s)`
              : "Pas encore de vente"}
          </p>

        </GlassCard>

        {/* ========================================================
            ALERTES
        ======================================================== */}

        {alerts.length > 0 && (
          <GlassCard>

            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-300">
              Alertes
            </p>

            <div className="space-y-2">

              {alerts.map(
                (a) => {
                  const Icon =
                    a.icon;

                  return (
                    <Link
                      key={
                        a.key
                      }
                      href={
                        a.href
                      }
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.07]"
                    >

                      <span className="flex items-center gap-2 text-[12px] font-semibold text-slate-200">

                        <Icon
                          className={`h-4 w-4 ${a.tone}`}
                        />

                        {a.text}

                      </span>

                      <ArrowRight className="h-4 w-4 text-slate-500" />

                    </Link>
                  );
                }
              )}

            </div>

          </GlassCard>
        )}

        {/* ========================================================
            ACCÈS RAPIDE
        ======================================================== */}

        <div>

          <p className="mb-3 px-1 text-xs font-bold uppercase tracking-wide text-slate-300">
            Accès rapide
          </p>

          <div className="grid grid-cols-4 gap-3">

            {quickAccess.map(
              (item) => {
                const Icon =
                  item.icon;

                return (
                  <Link
                    key={
                      item.label
                    }
                    href={
                      item.href
                    }
                    className="flex flex-col items-center gap-2 rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4 text-center backdrop-blur-xl transition active:scale-95 hover:border-orange-400/40 hover:bg-white/[0.08]"
                  >

                    <span className="rounded-xl bg-gradient-to-br from-orange-500/25 to-yellow-400/5 p-2.5">
                      <Icon className="h-5 w-5 text-orange-300" />
                    </span>

                    <span className="text-[11px] font-bold text-slate-200">
                      {item.label}
                    </span>

                  </Link>
                );
              }
            )}

          </div>

        </div>

        {/* ========================================================
            ACTIVITÉ RÉCENTE
        ======================================================== */}

        <GlassCard>

          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300">
            <Activity className="h-4 w-4 text-orange-300" />
            Activité récente
          </p>

          <div className="space-y-4">

            {/* VENTES */}

            <section>

              <div className="mb-2 flex items-center justify-between">

                <p className="text-[11px] font-bold text-slate-400">
                  Dernières ventes
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setShowAllSales(
                      true
                    )
                  }
                  className="text-[11px] font-bold text-orange-400 hover:text-orange-300"
                >
                  Voir tout
                </button>

              </div>

              {recentSales.length ===
              0 ? (
                <p className="text-[11px] text-slate-500">
                  Aucune vente.
                </p>
              ) : (
                recentSales.map(
                  (s, i) => (
                    <div
                      key={
                        s.id ??
                        `${s.created_at}-${i}`
                      }
                      className="flex items-center justify-between border-b border-white/5 py-2 last:border-0"
                    >

                      <div>

                        <p className="text-[12px] font-black text-orange-300">
                          {
                            s.product_name
                          }
                        </p>

                        <p className="text-[10px] text-slate-500">
                          {
                            relative(
                              s.created_at
                            )
                          }{" "}
                          • Quantité :
                          x
                          {
                            s.quantity
                          }
                        </p>

                      </div>

                      <p className="text-[12px] font-black text-orange-300">
                        {
                          fmt(
                            s.total_sale
                          )
                        }{" "}
                        {
                          isUsd(
                            s.currency
                          )
                            ? "$"
                            : "FC"
                        }
                      </p>

                    </div>
                  )
                )
              )}

            </section>

            {/* DEPENSES */}

            <section>

              <div className="mb-2 flex items-center justify-between">

                <p className="text-[11px] font-bold text-slate-400">
                  Dernières dépenses
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setShowAllExpenses(
                      true
                    )
                  }
                  className="text-[11px] font-bold text-orange-400 hover:text-orange-300"
                >
                  Voir tout
                </button>

              </div>

              {recentExpenses.length ===
              0 ? (
                <p className="text-[11px] text-slate-500">
                  Aucune dépense.
                </p>
              ) : (
                recentExpenses.map(
                  (
                    e,
                    i
                  ) => (
                    <div
                      key={
                        e.id ??
                        `${e.created_at}-${i}`
                      }
                      className="flex items-center justify-between border-b border-white/5 py-2 last:border-0"
                    >

                      <div>

                        <p className="text-[12px] font-black text-rose-300">
                          {e.title ||
                            e.label ||
                            e.description ||
                            "Dépense"}
                        </p>

                        <p className="text-[10px] text-slate-500">
                          {
                            relative(
                              e.created_at
                            )
                          }
                        </p>

                      </div>

                      <p className="text-[12px] font-black text-rose-300">
                        -
                        {fmt(
                          e.amount
                        )}{" "}
                        {
                          isUsd(
                            e.currency
                          )
                            ? "$"
                            : "FC"
                        }
                      </p>

                    </div>
                  )
                )
              )}

            </section>

          </div>
        </GlassCard>

        {/* ========================================================
            FOOTER
        ======================================================== */}

        <p className="pt-2 text-center text-[10px] text-slate-500">
          ⚡ BISO-COMMERCE ( PDG DIEUMERCI IDI )
        </p>

      </div>

      {/* ==========================================================
          MODAL INFORMATION
      ========================================================== */}

      {showInfo && (
        <div
          onClick={() =>
            setShowInfo(false)
          }
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        >

          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-[#07111f] shadow-[0_25px_80px_-20px_rgba(0,0,0,0.9)]"
          >

            {/* HEADER */}

            <div className="border-b border-white/10 bg-[#07111f] px-5 py-4">

              <div className="flex items-center justify-between gap-3">

                <div>

                  <p className="text-lg font-black tracking-tight text-white">
                    BISO-
                    <span className="bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent">
                      COMMERCE
                    </span>
                  </p>

                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Votre commerce, simplement mieux géré
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowInfo(false)
                  }
                  className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>

              </div>

            </div>

            {/* CONTENU */}

            <div className="max-h-[82vh] overflow-y-auto p-5">

              <div className="space-y-5">

                {/* BIENVENUE */}

                <div className="overflow-hidden rounded-[1.5rem] border border-orange-400/20 bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-yellow-400/5 p-5">

                  <div className="mb-3 flex items-center gap-2">

                    <span className="rounded-xl bg-gradient-to-br from-orange-500 to-yellow-400 p-2">
                      <Zap className="h-4 w-4 text-black" />
                    </span>

                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-300">
                      Bienvenue
                    </span>

                  </div>

                  <h2 className="text-xl font-black leading-tight text-white">
                    Gérez votre commerce
                    <br />
                    <span className="bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent">
                      avec plus de simplicité.
                    </span>
                  </h2>

                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    Biso-Commerce est une solution digitale conçue pour vous aider à gérer votre commerce directement depuis votre téléphone.
                  </p>

                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    Gérez vos produits, vos ventes, vos bénéfices, vos dépenses et les dettes de vos clients au même endroit.
                  </p>

                </div>

                {/* FONCTIONNALITÉS */}

                <div>

                  <p className="text-sm font-black text-white">
                    Tout ce dont votre commerce a besoin
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500">
                    Retrouvez les outils essentiels au même endroit.
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2.5">

                    {[
                      [
                        "📦",
                        "Produits",
                        "Ajoutez et gérez facilement vos produits et votre stock.",
                      ],
                      [
                        "🛒",
                        "Ventes",
                        "Enregistrez vos ventes rapidement.",
                      ],
                      [
                        "📈",
                        "Bénéfices",
                        "Suivez automatiquement vos résultats.",
                      ],
                      [
                        "💰",
                        "Dépenses",
                        "Gardez le contrôle de vos dépenses.",
                      ],
                      [
                        "🤝",
                        "Dettes",
                        "Suivez les dettes de vos clients.",
                      ],
                      [
                        "📊",
                        "Rapports",
                        "Analysez votre activité commerciale.",
                      ],
                    ].map(
                      (
                        item
                      ) => (
                        <div
                          key={
                            item[1]
                          }
                          className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                        >

                          <div className="flex items-center gap-2">

                            <span className="text-base">
                              {
                                item[0]
                              }
                            </span>

                            <p className="text-xs font-black text-white">
                              {
                                item[1]
                              }
                            </p>

                          </div>

                          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                            {
                              item[2]
                            }
                          </p>

                        </div>
                      )
                    )}

                  </div>

                </div>

                {/* POURQUOI */}

                <div className="rounded-[1.5rem] border border-emerald-400/15 bg-emerald-500/[0.04] p-4">

                  <p className="text-sm font-black text-white">
                    🎯 Pourquoi utiliser Biso-Commerce ?
                  </p>

                  <div className="mt-3 space-y-2.5">

                    {[
                      "Gagnez du temps dans la gestion quotidienne.",
                      "Réduisez les erreurs de calcul.",
                      "Connaissez vos ventes et vos bénéfices.",
                      "Gardez un œil sur votre stock.",
                      "Prenez de meilleures décisions pour votre commerce.",
                    ].map(
                      (
                        item
                      ) => (
                        <div
                          key={
                            item
                          }
                          className="flex items-start gap-2"
                        >
                          <span className="font-black text-emerald-400">
                            ✓
                          </span>

                          <p className="text-xs leading-relaxed text-slate-300">
                            {
                              item
                            }
                          </p>
                        </div>
                      )
                    )}

                  </div>

                </div>

                {/* HORS CONNEXION */}

                <div className="rounded-[1.5rem] border border-amber-400/15 bg-amber-500/[0.04] p-4">

                  <div className="flex items-start gap-3">

                    <span className="rounded-xl bg-amber-500/10 p-2.5 text-lg">
                      {isOnline
                        ? "🌐"
                        : "📴"}
                    </span>

                    <div>

                      <p className="text-sm font-black text-white">
                        Fonctionnement hors connexion
                      </p>

                      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                        Le Dashboard peut continuer à s'ouvrir sans Internet grâce aux données enregistrées localement sur votre appareil.
                      </p>

                    </div>

                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">

                    <p className="text-[10px] font-bold text-amber-300">
                      {isOnline
                        ? "Vous êtes actuellement en ligne."
                        : "Vous êtes actuellement hors connexion."}
                    </p>

                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                      Les dernières données connues restent accessibles et l'abonnement continue à être calculé localement.
                    </p>

                  </div>

                </div>

                {/* INSTALLATION */}

                <div className="rounded-[1.5rem] border border-sky-400/15 bg-sky-500/[0.04] p-4">

                  <div className="flex items-start gap-3">

                    <span className="rounded-xl bg-sky-500/10 p-2.5 text-lg">
                      📱
                    </span>

                    <div>

                      <p className="text-sm font-black text-white">
                        Installer Biso-Commerce
                      </p>

                      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                        Installez Biso-Commerce sur votre téléphone pour l'utiliser facilement comme une application.
                      </p>

                    </div>

                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">

                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Ouvrir Biso-Commerce
                    </p>

                    <a
                      href="https://bisocommerce.vercel.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 block break-all rounded-xl border border-orange-400/20 bg-orange-500/5 p-3 text-center text-xs font-black text-orange-300 underline decoration-orange-300/40 underline-offset-2"
                    >
                      https://bisocommerce.vercel.app
                    </a>

                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">

                    <p className="text-xs font-black text-orange-300">
                      🤖 Android
                    </p>

                    <div className="mt-3 space-y-2 text-[11px] leading-[1.75] text-slate-300">

                      <p>
                        Ouvrez le lien avec Google Chrome.
                      </p>

                      <p>
                        Appuyez sur les trois points ⋮.
                      </p>

                      <p>
                        Choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil ».
                      </p>

                    </div>

                  </div>

                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">

                    <p className="text-xs font-black text-orange-300">
                      🍎 iPhone
                    </p>

                    <div className="mt-3 space-y-2 text-[11px] leading-[1.75] text-slate-300">

                      <p>
                        Ouvrez le lien avec Safari.
                      </p>

                      <p>
                        Appuyez sur Partager ⬆️.
                      </p>

                      <p>
                        Choisissez « Sur l'écran d'accueil » puis « Ajouter ».
                      </p>

                    </div>

                  </div>

                </div>

                {/* SUPPORT */}

                <div className="rounded-[1.5rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.02] p-4">

                  <div className="flex items-center gap-3">

                    <span className="rounded-xl bg-emerald-500/15 p-2.5 text-lg">
                      💬
                    </span>

                    <div>

                      <p className="text-sm font-black text-white">
                        Vous avez un problème ?
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        Notre support peut vous aider directement sur WhatsApp.
                      </p>

                    </div>

                  </div>

                  <a
                    href="https://wa.me/243994864173?text=Bonjour%20Biso-Commerce%2C%20j%27ai%20besoin%20d%27aide."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3.5 text-sm font-black text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]"
                  >
                    💬 Écrire au support WhatsApp
                  </a>

                  <p className="mt-2 text-center text-[10px] text-slate-500">
                    +243 994 864 173
                  </p>

                </div>

                {/* CONSEIL */}

                <div className="rounded-2xl border border-orange-400/10 bg-orange-500/[0.03] p-4">

                  <p className="text-xs font-black text-orange-300">
                    💡 Conseil pour commencer
                  </p>

                  <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                    Commencez par ajouter vos produits avec leur prix d'achat, leur prix de vente et leur quantité en stock. Ensuite, enregistrez vos ventes pour commencer à suivre votre activité et vos résultats.
                  </p>

                </div>

                {/* FINAL */}

                <div className="border-t border-white/10 pt-5 text-center">

                  <div className="mx-auto mb-3 flex w-fit items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-yellow-400/10 p-3">
                    <Zap className="h-5 w-5 text-orange-300" />
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Merci d'utiliser Biso-Commerce et de nous faire confiance.
                  </p>

                  <p className="mt-2 text-[10px] font-bold text-slate-600">
                    PDG DIEUMERCI IDI
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowInfo(
                      false
                    )
                  }
                  className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 p-4 text-sm font-black text-black shadow-[0_15px_35px_-15px_rgba(249,115,22,0.8)] transition hover:brightness-110 active:scale-[0.98]"
                >
                  J'ai compris 🚀
                </button>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          TOUTES LES VENTES
      ========================================================== */}

      {showAllSales && (
        <div
          onClick={() =>
            setShowAllSales(
              false
            )
          }
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >

          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-[#081221] p-5"
          >

            <div className="mb-4 flex items-center justify-between">

              <h2 className="text-lg font-black text-white">
                Toutes les ventes
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowAllSales(
                    false
                  )
                }
                className="rounded-xl p-2 hover:bg-white/5"
              >
                <X className="h-5 w-5 text-white" />
              </button>

            </div>

            {sales.length ===
            0 ? (
              <p className="text-slate-400">
                Aucune vente.
              </p>
            ) : (
              sales.map(
                (
                  s,
                  i
                ) => (
                  <div
                    key={
                      s.id ??
                      i
                    }
                    className="border-b border-white/10 py-3"
                  >

                    <p className="font-bold text-orange-400">
                      {
                        s.product_name
                      }
                    </p>

                    <p className="text-xs text-slate-400">
                      {
                        relative(
                          s.created_at
                        )
                      }{" "}
                      • Quantité :
                      x
                      {
                        s.quantity
                      }
                    </p>

                    <p className="font-bold text-white">
                      {
                        fmt(
                          s.total_sale
                        )
                      }{" "}
                      {
                        isUsd(
                          s.currency
                        )
                          ? "$"
                          : "FC"
                      }
                    </p>

                  </div>
                )
              )
            )}

            <button
              type="button"
              onClick={() =>
                setShowAllSales(
                  false
                )
              }
              className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 p-4 font-bold text-white hover:bg-white/10"
            >
              ← Retour au dashboard
            </button>

          </div>
        </div>
      )}

      {/* ==========================================================
          TOUTES LES DEPENSES
      ========================================================== */}

      {showAllExpenses && (
        <div
          onClick={() =>
            setShowAllExpenses(
              false
            )
          }
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >

          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-[#081221] p-5"
          >

            <div className="mb-4 flex items-center justify-between">

              <h2 className="text-lg font-black text-white">
                Toutes les dépenses
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowAllExpenses(
                    false
                  )
                }
                className="rounded-xl p-2 hover:bg-white/5"
              >
                <X className="h-5 w-5 text-white" />
              </button>

            </div>

            {expenses.length ===
            0 ? (
              <p className="text-slate-400">
                Aucune dépense.
              </p>
            ) : (
              expenses.map(
                (
                  e,
                  i
                ) => (
                  <div
                    key={
                      e.id ??
                      i
                    }
                    className="border-b border-white/10 py-3"
                  >

                    <p className="font-bold text-red-400">
                      {e.title ||
                        e.label ||
                        e.description ||
                        "Dépense"}
                    </p>

                    <p className="text-xs text-slate-400">
                      {
                        relative(
                          e.created_at
                        )
                      }
                    </p>

                    <p className="font-bold text-white">
                      -
                      {
                        fmt(
                          e.amount
                        )
                      }{" "}
                      {
                        isUsd(
                          e.currency
                        )
                          ? "$"
                          : "FC"
                      }
                    </p>

                  </div>
                )
              )
            )}

            <button
              type="button"
              onClick={() =>
                setShowAllExpenses(
                  false
                )
              }
              className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 p-4 font-bold text-white hover:bg-white/10"
            >
              ← Retour au dashboard
            </button>

          </div>
        </div>
      )}

    </div>
  );
}