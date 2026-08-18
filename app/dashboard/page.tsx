
"use client";

/**
 * BISO-COMMERCE — Dashboard (fichier unique)
 * Next.js App Router : app/dashboard/page.tsx
 * Aucune dépendance externe hormis lucide-react + supabase.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ScanLine,
  Activity,
  CalendarClock,
  X,
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
  product_name: string;
  stock: number;
  price?: number | null;
  purchase_price?: number | null;
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
  amount: number;
  currency?: string | null;
  is_paid?: boolean | null;
  created_at: string;
};

type Money = { fc: number; usd: number };

const zero = (): Money => ({ fc: 0, usd: 0 });

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

const nf = new Intl.NumberFormat("fr-FR");

function fmt(n: number) {
  return nf.format(Math.round(Number(n) || 0));
}

function isUsd(currency?: string | null) {
  const c = (currency || "FC").toUpperCase();
  return c === "USD" || c === "$" || c === "DOLLAR";
}

function addTo(bucket: Money, currency: string | null | undefined, value: number) {
  const v = Number(value) || 0;
  if (isUsd(currency)) bucket.usd += v;
  else bucket.fc += v;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfWeek() {
  const d = startOfToday();
  const day = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - day);
  return d;
}
function startOfMonth() {
  const d = startOfToday();
  d.setDate(1);
  return d;
}

function greeting(h: number) {
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function relative(dateStr: string) {
  const date = new Date(dateStr);

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

/* ------------------------------------------------------------------ */
/* PETITS COMPOSANTS UI (glassmorphism)                                */
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
  icon: React.ComponentType<{ className?: string }>;
  tone?: "orange" | "green" | "blue" | "red" | "violet";
}) {
  const tones: Record<string, string> = {
    orange: "from-orange-500/25 to-amber-400/5 text-orange-300",
    green: "from-emerald-500/25 to-emerald-400/5 text-emerald-300",
    blue: "from-sky-500/25 to-cyan-400/5 text-sky-300",
    red: "from-rose-500/25 to-red-400/5 text-rose-300",
    violet: "from-violet-500/25 to-fuchsia-400/5 text-violet-300",
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

function BarChartMini({
  title,
  data,
  color,
  suffix = "",
}: {
  title: string;
  data: { label: string; value: number }[];
  color: string;
  suffix?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <GlassCard>
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-300">
        {title}
      </p>
      <div className="flex h-32 items-end gap-2">
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[9px] text-slate-400">
              {d.value ? fmt(d.value) : ""}
            </span>
            <div
              className="w-full rounded-t-lg transition-all duration-700"
              style={{
                height: `${Math.max(4, (d.value / max) * 90)}%`,
                background: color,
              }}
            />
            <span className="text-[9px] font-semibold text-slate-400">
              {d.label}
            </span>
          </div>
        ))}
      </div>
      {suffix ? (
        <p className="mt-2 text-[10px] text-slate-500">{suffix}</p>
      ) : null}
    </GlassCard>
  );
}

function RankList({
  title,
  items,
  color,
}: {
  title: string;
  items: { label: string; value: number }[];
  color: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <GlassCard>
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-300">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-500">Aucune donnée pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.label}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="truncate pr-2 font-semibold text-slate-200">
                  {i.label}
                </span>
                <span className="text-slate-400">{fmt(i.value)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(i.value / max) * 100}%`,
                    background: color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-[#050b16] p-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="h-24 animate-pulse rounded-[1.6rem] bg-white/5" />
        <div className="h-28 animate-pulse rounded-[1.6rem] bg-white/5" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-[1.6rem] bg-white/5"
            />
          ))}
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
  const router = useRouter();

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
const [showAllSales, setShowAllSales] = useState(false);
const [showAllProducts, setShowAllProducts] = useState(false);
const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  const [daysUsed, setDaysUsed] = useState(0);
  const [daysLeft, setDaysLeft] = useState(30);
  const [status, setStatus] = useState<"active" | "expired">("active");

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [clientsCount, setClientsCount] = useState(0);

  const userIdRef = useRef<string | null>(null);

  /* ---------------- horloge temps réel ---------------- */
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---------------- abonnement ---------------- */
  const checkSubscription = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    const sub = data?.[0];
    if (!sub) {
      setStatus("expired");
      return false;
    }

    const start = new Date(sub.start_date);
    const end = new Date(sub.end_date);
    const current = new Date();

    const diffDays = daysBetween(current, start);
    const used = diffDays < 0 ? 0 : diffDays;

    setDaysUsed(used);
    setDaysLeft(Math.max(0, 30 - used));

    const active = sub.is_active === true && end > current;
    setStatus(active ? "active" : "expired");
    return active;
  }, []);

  /* ---------------- données ---------------- */
  const loadDashboard = useCallback(async (userId: string) => {
    const monthStart = startOfMonth();
    // on prend 30 jours glissants minimum pour les graphiques
    const chartStart = new Date(
      Math.min(monthStart.getTime(), Date.now() - 29 * 86400000),
    );

    const [salesRes, productsRes, expensesRes, debtsRes] = await Promise.all([
      supabase
        .from("sales")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", chartStart.toISOString())
        .order("created_at", { ascending: false }),

      supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),

      supabase
        .from("expenses")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", chartStart.toISOString())
        .order("created_at", { ascending: false }),

      supabase
        .from("debts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    setSales((salesRes.data as Sale[]) || []);
    setProducts((productsRes.data as Product[]) || []);
    setExpenses((expensesRes.data as Expense[]) || []);

    const debtRows = (debtsRes.data as Debt[]) || [];
    setDebts(debtRows);

    const uniqueClients = new Set(
      debtRows.map((d) => (d.client_name || "").trim().toLowerCase()).filter(Boolean),
    );
    setClientsCount(uniqueClients.size);

    setLastSync(new Date());
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const phone =
        typeof window !== "undefined" ? localStorage.getItem("phone") : null;

      if (!phone) {
        router.replace("/login");
        return;
      }

      const { data: user, error } = await supabase
        .from("users")
        .select("id")
        .eq("phone", phone)
        .single();

      if (error || !user) {
        router.replace("/login");
        return;
      }

      userIdRef.current = user.id;

      // 1️⃣ Charger immédiatement le Dashboard
      setInitialLoading(false);
loadDashboard(user.id);

      // 2️⃣ Vérifier abonnement après ouverture
      const ok = await checkSubscription(user.id);
      if (!ok) setStatus("expired");
    } catch (e) {
      console.log("Erreur dashboard :", e);
      setInitialLoading(false);
    }
  }, [router, loadDashboard, checkSubscription]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refresh = useCallback(async () => {
    if (!userIdRef.current || refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        loadDashboard(userIdRef.current),
        checkSubscription(userIdRef.current),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, loadDashboard, checkSubscription]);

  /* ---------------- calculs mémoïsés ---------------- */
  const stats = useMemo(() => {const productSales: Record<string, number> = {};

for (const s of sales) {
  const name = s.product_name || "Inconnu";
  productSales[name] =
    (productSales[name] || 0) + (Number(s.quantity) || 0);
}

const bestProduct = Object.entries(productSales)
  .sort((a, b) => b[1] - a[1])[0];
    const dayStart = startOfToday().getTime();
    const weekStart = startOfWeek().getTime();
    const monthStart = startOfMonth().getTime();

    const salesToday = zero();
    const salesWeek = zero();
    const salesMonth = zero();
    const profitToday = zero();
    const profitWeek = zero();
    const profitMonth = zero();
    const expToday = zero();
    const expMonth = zero();

    let qtyToday = 0;
    let countToday = 0;
    let countWeek = 0;
    let countMonth = 0;

    for (const s of sales) {
      const t = new Date(s.created_at).getTime();
      if (Number.isNaN(t)) continue;
      if (t >= monthStart) {
        countMonth++;
        addTo(salesMonth, s.currency, s.total_sale);
        addTo(profitMonth, s.currency, s.profit);
      }
      if (t >= weekStart) {
        countWeek++;
        addTo(salesWeek, s.currency, s.total_sale);
        addTo(profitWeek, s.currency, s.profit);
      }
      if (t >= dayStart) {
        countToday++;
        qtyToday += Number(s.quantity) || 0;
        addTo(salesToday, s.currency, s.total_sale);
        addTo(profitToday, s.currency, s.profit);
      }
    }

    for (const e of expenses) {
      const t = new Date(e.created_at).getTime();
      if (Number.isNaN(t)) continue;
      if (t >= monthStart) addTo(expMonth, e.currency, e.amount);
      if (t >= dayStart) addTo(expToday, e.currency, e.amount);
    }

    const stockValue = zero();
    for (const p of products) {
      const unit = Number(p.purchase_price ?? p.price ?? 0);
      addTo(stockValue, p.currency, unit * (Number(p.stock) || 0));
    }

    const outOfStock = products.filter((p) => Number(p.stock) <= 0);
    const lowStock = products.filter(
      (p) => Number(p.stock) > 0 && Number(p.stock) <= 5,
    );

    const today = startOfToday();
    const soon = new Date(today.getTime() + 7 * 86400000);
    const expired = products.filter(
      (p) => p.expiry_date && new Date(p.expiry_date) < today,
    );
    const expiringSoon = products.filter(
      (p) =>
        p.expiry_date &&
        new Date(p.expiry_date) >= today &&
        new Date(p.expiry_date) <= soon,
    );

    const unpaidDebts = debts.filter((d) => !d.is_paid);
    const debtTotal = zero();
    for (const d of unpaidDebts) addTo(debtTotal, d.currency, d.amount);

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
  }, [sales, products, expenses, debts]);

  const charts = useMemo(() => {
    const days: { key: string; label: string }[] = [];
    const labels = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday().getTime() - i * 86400000);
      days.push({
        key: d.toISOString().slice(0, 10),
        label: labels[d.getDay()],
      });
    }

    const salesMap: Record<string, number> = {};
    const profitMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};
    const productMap: Record<string, number> = {};
    const categoryMap: Record<string, number> = {};

    for (const s of sales) {
      const key = (s.created_at || "").slice(0, 10);
      const amount = Number(s.total_sale) || 0;
      const factor = isUsd(s.currency) ? 2800 : 1; // normalisation d'affichage
      salesMap[key] = (salesMap[key] || 0) + amount * factor;
      profitMap[key] =
        (profitMap[key] || 0) + (Number(s.profit) || 0) * factor;

      const name = s.product_name || "Inconnu";
      productMap[name] = (productMap[name] || 0) + (Number(s.quantity) || 0);

      const cat = s.category || "Sans catégorie";

    }

    for (const e of expenses) {
      const key = (e.created_at || "").slice(0, 10);
      const factor = isUsd(e.currency) ? 2800 : 1;
      expenseMap[key] = (expenseMap[key] || 0) + (Number(e.amount) || 0) * factor;
    }

    const top = (m: Record<string, number>) =>
      Object.entries(m)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, value]) => ({ label, value }));

    return {
      salesSeries: days.map((d) => ({ label: d.label, value: salesMap[d.key] || 0 })),
      profitSeries: days.map((d) => ({
        label: d.label,
        value: profitMap[d.key] || 0,
      })),
      expenseSeries: days.map((d) => ({
        label: d.label,
        value: expenseMap[d.key] || 0,
      })),
      topProducts: top(productMap),
      topCategories: top(categoryMap),
    };
  }, [sales, expenses]);

  const recentSales = useMemo(() => sales.slice(0, 5), [sales]);
  const recentProducts = useMemo(() => products.slice(0, 5), [products]);
  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses]);
  const recentPayments = useMemo(
    () => debts.filter((d) => d.is_paid).slice(0, 5),
    [debts],
  );

  const percentUsed = Math.min(100, Math.round((daysUsed / 30) * 100));

  /* ---------------- écrans d'état ---------------- */



  if (status === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050b16] p-5">
        <GlassCard className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 w-fit rounded-2xl bg-gradient-to-br from-rose-500/30 to-orange-400/10 p-4">
            <ShieldCheck className="h-8 w-8 text-rose-300" />
          </div>
          <h1 className="text-2xl font-black text-white">Abonnement expiré</h1>
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
        </GlassCard>
      </div>
    );
  }

  /* ---------------- dashboard ---------------- */

  const dateLabel = now
    ? now.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const timeLabel = now
    ? now.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--";

  const quickAccess = [
    { label: "Produits", icon: Package, href: "/products" },
  { label: "Ajouter Produit", icon: PlusCircle, href: "/products/add" },
  { label: "Nouvelle Vente", icon: ShoppingCart, href: "/sales" },
  { label: "Rapports", icon: FileText, href: "/reports" },
  { label: "Dépenses", icon: Banknote, href: "/expenses" },
  { label: "Dettes", icon: CreditCard, href: "/debts" },
  { label: "Assistant IA", icon: Sparkles, href: "/assistant" },
  { label: "Abonnement", icon: Crown, href: "/subscription" },
  ];

  const alerts = [
    stats.lowStock.length > 0 && {
      key: "low",
      icon: AlertTriangle,
      text: `${stats.lowStock.length} produit(s) presque épuisé(s)`,
      href: "/products/low-stock",
      tone: "text-amber-300",
    },
    stats.outOfStock.length > 0 && {
      key: "out",
      icon: Boxes,
      text: `${stats.outOfStock.length} produit(s) en rupture`,
      href: "/products/low-stock",
      tone: "text-rose-300",
    },
    stats.expired.length > 0 && {
      key: "exp",
      icon: CalendarClock,
      text: `${stats.expired.length} produit(s) expiré(s)`,
      href: "/products",
      tone: "text-rose-300",
    },
    stats.expiringSoon.length > 0 && {
      key: "soon",
      icon: CalendarClock,
      text: `${stats.expiringSoon.length} produit(s) expirent bientôt`,
      href: "/products",
      tone: "text-amber-300",
    },
    stats.unpaidDebts.length > 0 && {
      key: "debt",
      icon: CreditCard,
      text: `${stats.unpaidDebts.length} dette(s) à récupérer — ${fmt(stats.debtTotal.fc)} FC / ${fmt(stats.debtTotal.usd)} $`,
      href: "/debts",
      tone: "text-sky-300",
    },
    daysLeft <= 5 && {
      key: "sub",
      icon: Crown,
      text: `Abonnement : ${daysLeft} jour(s) restant(s)`,
      href: "/subscription",
      tone: "text-orange-300",
    },
  ].filter(Boolean) as {
    key: string;
    icon: React.ComponentType<{ className?: string }>;
    text: string;
    href: string;
    tone: string;
  }[];

  return (
    <div className="min-h-screen bg-[#050b16] pb-16 text-white">
      {/* halos décoratifs */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(249,115,22,0.18),transparent)]" />

      <div className="relative mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
        {/* HEADER */}
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
                {now ? greeting(now.getHours()) : "Bonjour"}, PDG 👋
              </p>
              <p className="text-[11px] capitalize text-slate-400">{dateLabel}</p>
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-sm font-black tabular-nums text-orange-300">
                <Clock className="h-4 w-4" />
                {timeLabel}
              </div>
              <button
                onClick={refresh}
                disabled={refreshing}
                className="mt-2 inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
                Actualiser
              </button>
            </div>
          </div>

          <p className="mt-3 text-[10px] text-slate-500">
            Dernière synchronisation :{" "}
            {lastSync
              ? lastSync.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </p>
        </GlassCard>

        {/* SUBSCRIPTION CARD */}
        <GlassCard className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-orange-300" />
              <p className="text-sm font-bold">Abonnement actif</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-slate-200">
              {daysUsed}/30 jours
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-700"
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Temps restant</span>
            <span className="font-bold text-orange-300">{daysLeft} jours</span>
          </div>
        </GlassCard>

        {/* INFORMATION BUTTON */}
<div className="flex justify-center">
  <button
    onClick={() => setShowInfo(true)}
    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-bold text-white shadow-sm transition hover:border-white/40 hover:bg-white/20 active:scale-95"
  >
    
    ✨ Clique ici pour en savoir plus sur Biso-commerce
  </button>
</div>

        {/* QUICK SALE */}
        <Link
          href="/sales"
          className="flex items-center justify-between rounded-[1.6rem] bg-gradient-to-r from-orange-500 to-yellow-400 p-5 shadow-[0_20px_45px_-20px_rgba(249,115,22,0.9)] transition active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-black/15 p-3">
              <ShoppingCart className="h-6 w-6 text-black" />
            </span>
            <div>
              <p className="text-base font-black text-black">Nouvelle vente</p>
              <p className="text-[11px] font-semibold text-black/70">
                Ouvrir la caisse rapidement
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-black" />
        </Link>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <StatCard
            label="Ventes aujourd'hui"
            value={`${fmt(stats.salesToday.fc)} FC`}
            hint={`${fmt(stats.salesToday.usd)} $ • ${stats.countToday} vente(s)`}
            icon={ShoppingCart}
            tone="orange"
          />
          
          <StatCard
            label="Bénéfice aujourd'hui"
            value={`${fmt(stats.profitToday.fc)} FC`}
            hint={`${fmt(stats.profitToday.usd)} $`}
            icon={Wallet}
            tone="green"
          />
    
        
          <StatCard
            label="Dépenses aujourd'hui"
            value={`${fmt(stats.expToday.fc)} FC`}
            hint={`${fmt(stats.expToday.usd)} $`}
            icon={TrendingDown}
            tone="red"
          />
    
          <StatCard
            label="Total produits"
            value={fmt(products.length)}
            hint={`${stats.qtyToday} article(s) vendu(s) aujourd'hui`}
            icon={Package}
            tone="blue"
          />
          
          <StatCard
            label="Ruptures"
            value={fmt(stats.outOfStock.length)}
            hint={`${stats.lowStock.length} presque épuisé(s)`}
            icon={AlertTriangle}
            tone="red"
          />
          <StatCard
            label="Clients / Dettes"
            value={`${fmt(clientsCount)} / ${fmt(stats.unpaidDebts.length)}`}
             hint="N'oubliez pas les dettes de vos clients"
            icon={Users}
            tone="orange"
          />
        </div>
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
    {stats.bestProduct ? stats.bestProduct[0] : "Aucun"}
  </p>

  <p className="mt-1 text-xs font-bold text-emerald-300">
    {stats.bestProduct
      ? `${stats.bestProduct[1]} article(s) vendu(s)`
      : "Pas encore de vente"}
  </p>
</GlassCard>

      

        {/* ALERTES */}
        {alerts.length > 0 && (
          <GlassCard>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-300">
              Alertes
            </p>
            <div className="space-y-2">
              {alerts.map((a) => {
                const Icon = a.icon;
                return (
                  <Link
                    key={a.key}
                    href={a.href}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.07]"
                  >
                    <span className="flex items-center gap-2 text-[12px] font-semibold text-slate-200">
                      <Icon className={`h-4 w-4 ${a.tone}`} />
                      {a.text}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                  </Link>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* ACCÈS RAPIDE */}
        <div>
          <p className="mb-3 px-1 text-xs font-bold uppercase tracking-wide text-slate-300">
            Accès rapide
          </p>
          <div className="grid grid-cols-4 gap-3">
            {quickAccess.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
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
            })}
          </div>
        </div>

        {/* ACTIVITÉ RÉCENTE */}
        <GlassCard>
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300">
            <Activity className="h-4 w-4 text-orange-300" />
            Activité récente
          </p>

          <div className="space-y-4">
            <section>
              <div className="mb-2 flex items-center justify-between">
  <p className="text-[11px] font-bold text-slate-400">
    Dernières ventes
  </p>

  <button
    onClick={() => setShowAllSales(true)}
    className="text-[11px] font-bold text-orange-400 hover:text-orange-300"
  >
    Voir tout
  </button>
</div>
              
              {recentSales.length === 0 ? (
                <p className="text-[11px] text-slate-500">Aucune vente.</p>
              ) : (
                recentSales.map((s, i) => (
                  <div
                    key={s.id ?? `${s.created_at}-${i}`}
                    className="flex items-center justify-between border-b border-white/5 py-2 last:border-0"
                  >
                    <div>
                      <p className="text-[12px] font-black text-orange-300">
  {s.product_name}
</p>
                      <p className="text-[10px] text-slate-500">
                         {relative(s.created_at)} • Quantité : x{s.quantity}
                      </p>
                    </div>
                    <p className="text-[12px] font-black text-orange-300">
                      {fmt(s.total_sale)} {isUsd(s.currency) ? "$" : "FC"}
                    </p>
                  </div>
                ))
              )}
            </section>

            

            <section>
              <div className="mb-2 flex items-center justify-between">
  <p className="text-[11px] font-bold text-slate-400">
    Dernières dépenses
  </p>

  <button
    onClick={() => setShowAllExpenses(true)}
    className="text-[11px] font-bold text-orange-400 hover:text-orange-300"
  >
    Voir tout
  </button>
</div>
              {recentExpenses.length === 0 ? (
                <p className="text-[11px] text-slate-500">Aucune dépense.</p>
              ) : (
                recentExpenses.map((e, i) => (
                  <div
                    key={e.id ?? `${e.created_at}-${i}`}
                    className="flex items-center justify-between border-b border-white/5 py-2 last:border-0"
                  >
                    <div>
                      <p className="text-[12px] font-black text-rose-300">
{e.title || e.label || e.description || "Dépense"}
</p>
                      <p className="text-[10px] text-slate-500">
                        {relative(e.created_at)}
                      </p>
                    </div>
                    <p className="text-[12px] font-black text-rose-300">
                      -{fmt(e.amount)} {isUsd(e.currency) ? "$" : "FC"}
                    </p>
                  </div>
                ))
              )}
            </section>

            
          </div>
        </GlassCard>

        {/* FOOTER */}
        <p className="pt-2 text-center text-[10px] text-slate-500">
          ⚡ BISO-COMMERCE ( PDG DIEUMERCI IDI )
        </p>
      </div>
{/* MODAL INFORMATION */}
{showInfo && (
  <div
    onClick={() => setShowInfo(false)}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-white/10 bg-[#07111f] shadow-[0_25px_80px_-20px_rgba(0,0,0,0.9)]"
    >
      {/* HEADER */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#07111f]/95 px-5 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-black tracking-tight text-white">
              BISO-
              <span className="bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent">
                COMMERCE
              </span>
            </p>

            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Votre commerce, simplement mieux géré
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowInfo(false)}
            className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CONTENU */}
      <div className="space-y-5 p-5">

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
            Biso-Commerce est une solution digitale conçue pour vous aider à
            gérer vos produits, vos ventes, vos bénéfices, vos dépenses et les
            dettes de vos clients depuis votre téléphone.
          </p>
        </div>

        {/* FONCTIONNALITÉS */}
        <div>
          <div className="mb-3">
            <p className="text-sm font-black text-white">
              Tout ce dont votre commerce a besoin
            </p>

            <p className="mt-1 text-[11px] text-slate-500">
              Retrouvez l'essentiel au même endroit.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              {
                icon: "📦",
                title: "Produits",
                text: "Gérez votre stock",
              },
              {
                icon: "🛒",
                title: "Ventes",
                text: "Enregistrez vos ventes",
              },
              {
                icon: "📈",
                title: "Bénéfices",
                text: "Suivez vos résultats",
              },
              {
                icon: "💰",
                title: "Dépenses",
                text: "Contrôlez vos dépenses",
              },
              {
                icon: "🤝",
                title: "Dettes",
                text: "Suivez vos clients",
              },
              {
                icon: "📊",
                title: "Rapports",
                text: "Analysez votre activité",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-orange-400/20 hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>
                  <p className="text-xs font-black text-white">
                    {item.title}
                  </p>
                </div>

                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* POURQUOI */}
        <div className="rounded-[1.5rem] border border-emerald-400/15 bg-emerald-500/[0.04] p-4">
          <p className="text-sm font-black text-white">
            🎯 Pourquoi utiliser Biso-Commerce ?
          </p>

          <div className="mt-3 space-y-2">
            {[
              "Gagnez du temps dans la gestion quotidienne",
              "Réduisez les erreurs de calcul",
              "Connaissez rapidement vos ventes et bénéfices",
              "Gardez un œil sur votre stock",
              "Prenez de meilleures décisions pour votre commerce",
            ].map((text) => (
              <div
                key={text}
                className="flex items-start gap-2 text-xs leading-relaxed text-slate-300"
              >
                <span className="mt-0.5 text-emerald-400">✓</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* INSTALLATION */}
        <div className="rounded-[1.5rem] border border-sky-400/15 bg-sky-500/[0.04] p-4">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-sky-500/10 p-2 text-lg">
              📱
            </span>

            <div>
              <p className="text-sm font-black text-white">
                Installer Biso-Commerce
              </p>

              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Utilisez Biso-Commerce directement depuis votre téléphone,
                comme une application.
              </p>
            </div>
          </div>

          {/* LIEN UNIQUEMENT POUR L'INSTALLATION */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Adresse de Biso-Commerce
            </p>

            <a
              href="https://bisocommerce.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block break-all text-xs font-bold text-orange-300 underline decoration-orange-300/40 underline-offset-2 transition hover:text-yellow-300"
            >
              https://bisocommerce.vercel.app
            </a>
          </div>

          {/* ANDROID */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs font-black text-orange-300">
              🤖 Android
            </p>

            <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
              1️⃣ Ouvrez le lien avec <strong>Google Chrome</strong>.<br />
              2️⃣ Attendez que Biso-Commerce soit chargé.<br />
              3️⃣ Appuyez sur <strong>⋮</strong> en haut à droite.<br />
              4️⃣ Choisissez <strong>« Installer l'application »</strong> ou
              <strong> « Ajouter à l'écran d'accueil »</strong>.<br />
              5️⃣ Confirmez l'installation.
            </p>
          </div>

          {/* IPHONE */}
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs font-black text-orange-300">
              🍎 iPhone
            </p>

            <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
              1️⃣ Ouvrez le lien avec <strong>Safari</strong>.<br />
              2️⃣ Appuyez sur <strong>Partager ⬆️</strong>.<br />
              3️⃣ Sélectionnez <strong>« Sur l'écran d'accueil »</strong>.<br />
              4️⃣ Appuyez sur <strong>« Ajouter »</strong>.
            </p>
          </div>

          <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-500">
            💡 Une fois installé, vous pourrez ouvrir Biso-Commerce depuis
            l'icône présente sur votre écran d'accueil.
          </p>
        </div>

        {/* AIDE / WHATSAPP */}
        <div className="rounded-[1.5rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.02] p-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-emerald-500/15 p-2.5 text-lg">
              💬
            </span>

            <div>
              <p className="text-sm font-black text-white">
                Besoin d'aide ?
              </p>

              <p className="mt-0.5 text-[11px] text-slate-400">
                Notre support est disponible sur WhatsApp.
              </p>
            </div>
          </div>

          <a
            href="https://wa.me/243994864173?text=Bonjour%20Biso-Commerce%2C%20j%27ai%20besoin%20d%27aide."
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-500/10 transition hover:brightness-110 active:scale-[0.98]"
          >
            <span className="text-lg">💬</span>
            Contacter le support WhatsApp
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
            Commencez par ajouter vos produits avec leur prix d'achat, leur
            prix de vente et leur quantité en stock. Vous pourrez ensuite
            enregistrer vos ventes et laisser Biso-Commerce vous aider à
            suivre votre activité.
          </p>
        </div>

        {/* SIGNATURE */}
        <div className="border-t border-white/10 pt-4 text-center">
          <p className="text-xs font-bold text-slate-300">
            Merci d'utiliser Biso-Commerce 💚
          </p>

          <p className="mt-1 text-[10px] text-slate-500">
            Une solution pensée pour simplifier la gestion de votre commerce.
          </p>

          <p className="mt-2 text-[10px] font-bold text-slate-600">
            PDG DIEUMERCI IDI
          </p>
        </div>
      </div>

      {/* BOUTON FERMER */}
      <div className="sticky bottom-0 border-t border-white/10 bg-[#07111f]/95 p-4 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setShowInfo(false)}
          className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 p-4 text-sm font-black text-black shadow-lg shadow-orange-500/10 transition hover:brightness-110 active:scale-[0.98]"
        >
          J'ai compris  🚀
        </button>
      </div>
    </div>
  </div>
)}
      
      {/* Fenêtre : Toutes les ventes */}
      {showAllSales && (
        <div
          onClick={() => setShowAllSales(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-[#081221] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">
                Toutes les ventes
              </h2>

              <button onClick={() => setShowAllSales(false)}>
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {sales.length === 0 ? (
              <p className="text-slate-400">Aucune vente.</p>
            ) : (
              sales.map((s, i) => (
                <div
                  key={s.id ?? i}
                  className="border-b border-white/10 py-3"
                >
                  <p className="font-bold text-orange-400">
                    {s.product_name}
                  </p>

                  <p className="text-xs text-slate-400">
                     {relative(s.created_at)} • Quantité : x{s.quantity}
                  </p>

                  <p className="font-bold text-white">
                    {fmt(s.total_sale)} {isUsd(s.currency) ? "$" : "FC"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

           {/* Fenêtre : Toutes les ventes */}
      {showAllSales && (
        <div
          onClick={() => setShowAllSales(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-[#081221] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">
                Toutes les ventes
              </h2>

              <button
                type="button"
                onClick={() => setShowAllSales(false)}
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {sales.length === 0 ? (
              <p className="text-slate-400">Aucune vente.</p>
            ) : (
              sales.map((s, i) => (
                <div
                  key={s.id ?? i}
                  className="border-b border-white/10 py-3"
                >
                  <p className="font-bold text-orange-400">
                    {s.product_name}
                  </p>

                  <p className="text-xs text-slate-400">
                     {relative(s.created_at)} • Quantité : x{s.quantity}
                  </p>

                  <p className="font-bold text-white">
                    {fmt(s.total_sale)} {isUsd(s.currency) ? "$" : "FC"}
                  </p>
                </div>
              ))
            )}

            <button
              type="button"
              onClick={() => setShowAllSales(false)}
              className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 p-4 font-bold text-white hover:bg-white/10"
            >
              ← Retour au dashboard
            </button>

          </div>
        </div>
      )}


      {/* Fenêtre : Toutes les dépenses */}
      {showAllExpenses && (
        <div
          onClick={() => setShowAllExpenses(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-[#081221] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">
                Toutes les dépenses
              </h2>

              <button
                type="button"
                onClick={() => setShowAllExpenses(false)}
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {expenses.length === 0 ? (
              <p className="text-slate-400">Aucune dépense.</p>
            ) : (
              expenses.map((e, i) => (
                <div
                  key={e.id ?? i}
                  className="border-b border-white/10 py-3"
                >
                  <p className="font-bold text-red-400">
                    {e.title || e.label || e.description || "Dépense"}
                  </p>

                  <p className="text-xs text-slate-400">
                    {relative(e.created_at)}
                  </p>

                  <p className="font-bold text-white">
                    -{fmt(e.amount)} {isUsd(e.currency) ? "$" : "FC"}
                  </p>
                </div>
              ))
            )}

            <button
              type="button"
              onClick={() => setShowAllExpenses(false)}
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