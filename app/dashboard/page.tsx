"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  Package,
  PlusCircle,
  BarChart3,
  CreditCard,
  Banknote,
  FileText,
  Crown,
  Zap,
} from "lucide-react";

// --- TYPES ---
type Sale = {
  total_sale: number;
  profit: number;
  currency: string;
  product_name: string;
  quantity: number;
  created_at: string;
};

type Product = {
  product_name: string;
  stock: number;
};

type Subscription = {
  start_date: string;
  end_date: string;
  is_active: boolean;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [daysUsed, setDaysUsed] = useState(0);
  const [daysLeft, setDaysLeft] = useState(30);
  const [status, setStatus] = useState<"active" | "expired">("active");

  const [todaySalesFc, setTodaySalesFc] = useState(0);
  const [todaySalesDollar, setTodaySalesDollar] = useState(0);
  const [todayProfitFc, setTodayProfitFc] = useState(0);
  const [todayProfitDollar, setTodayProfitDollar] = useState(0);
  const [todayProductsSold, setTodayProductsSold] = useState(0);

  const [exhaustedProducts, setExhaustedProducts] = useState<Product[]>([]);
  const [lastSales, setLastSales] = useState<Sale[]>([]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const ok = await checkSubscription();

    if (ok) {
      await loadDashboard();
    }

    setLoading(false);
  };

  // 🔐 CHECK ABONNEMENT (CORRIGÉ SIMPLE)
  const checkSubscription = async () => {
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      setStatus("expired");
      return false;
    }

    const sub: Subscription = data;

    const start = new Date(sub.start_date);
    const end = new Date(sub.end_date);
    const now = new Date();

    const diffDays = Math.floor(
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    const used = diffDays < 0 ? 0 : diffDays;

    setDaysUsed(used);
    setDaysLeft(Math.max(0, 30 - used));

    // ✅ LOGIQUE SIMPLE
    const isActive =
      sub.is_active === true &&
      sub.end_date &&
      end > now;

    if (isActive) {
      setStatus("active");
      return true;
    }

    setStatus("expired");
    return false;
  };

  // 📊 DASHBOARD DATA
  const loadDashboard = async () => {
    const { data: sales } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: products } = await supabase
      .from("products")
      .select("*");

    let todayFc = 0;
    let todayDollar = 0;
    let todayBenefFc = 0;
    let todayBenefDollar = 0;
    let soldToday = 0;

    const today = new Date().toISOString().split("T")[0];

    sales?.forEach((sale: Sale) => {
      const saleDate = sale.created_at?.split("T")[0];

      if (saleDate === today) {
        soldToday += Number(sale.quantity || 0);

        if (sale.currency === "FC") {
          todayFc += Number(sale.total_sale || 0);
          todayBenefFc += Number(sale.profit || 0);
        } else {
          todayDollar += Number(sale.total_sale || 0);
          todayBenefDollar += Number(sale.profit || 0);
        }
      }
    });

    setTodaySalesFc(todayFc);
    setTodaySalesDollar(todayDollar);
    setTodayProfitFc(todayBenefFc);
    setTodayProfitDollar(todayBenefDollar);
    setTodayProductsSold(soldToday);

    const exhausted =
      products?.filter((p: Product) => Number(p.stock) === 0) || [];

    setExhaustedProducts(exhausted);
    setLastSales(sales?.slice(0, 5) || []);
  };

  // ❌ EXPIRÉ
  if (!loading && status === "expired") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white p-6">
        <div className="text-center space-y-4">

          <h1 className="text-3xl font-bold text-red-500">
            ❌ Abonnement expiré
          </h1>

          <p className="text-slate-400">
            Votre accès est bloqué.
          </p>

          <a
            href="/subscription"
            className="inline-block bg-green-600 px-6 py-3 rounded-xl font-bold"
          >
            💳 Renouveler
          </a>

        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Chargement...
      </div>
    );
  }

  const percentUsed = Math.round((daysUsed / 30) * 100);

  return (
    <main className="min-h-screen bg-black text-white p-3 sm:p-4">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Biso Gestion</h1>

        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-green-500" />
          <div className="w-10 h-10 bg-white rounded-full text-black flex items-center justify-center text-xs">
            PDG
          </div>
        </div>
      </div>

      {/* ABONNEMENT */}
      <div className="bg-slate-900 p-5 rounded-3xl mb-6 shadow">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-green-500 font-bold">
              Abonnement actif
            </p>

            <p className="text-sm text-gray-400">
              {daysUsed}/30 jours • {daysLeft} restants
            </p>
          </div>

          <div className="text-green-500 font-bold">
            {percentUsed}%
          </div>
        </div>
      </div>

      {/* MENU */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">

        {[
          { label: "Produits", icon: Package, href: "/products" },
          { label: "Ajouter", icon: PlusCircle, href: "/products/add" },
          { label: "Ventes", icon: BarChart3, href: "/sales" },
          { label: "Dettes", icon: CreditCard, href: "/debts" },
          { label: "Dépenses", icon: Banknote, href: "/expenses" },
          { label: "Rapports", icon: FileText, href: "/reports" },
          { label: "Abonnement", icon: Crown, href: "/subscription" },
        ].map((item, i) => (
          <Link key={i} href={item.href}>
            <div className="bg-slate-900 p-4 rounded-2xl shadow text-center">
              <item.icon className="mx-auto mb-2 text-green-500" />
              <p className="text-sm font-bold">{item.label}</p>
            </div>
          </Link>
        ))}
      </div>
      
      {/* STATS */}
      <div className="grid grid-cols-2 gap-3 mb-6">

        <div className="bg-slate-900 p-4 rounded-2xl">
          <p className="text-sm text-gray-400">Ventes FC</p>
          <p className="font-bold">{todaySalesFc}</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl">
          <p className="text-sm text-gray-400">Ventes USD</p>
          <p className="font-bold">{todaySalesDollar}</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl">
          <p className="text-sm text-gray-400">Bénéfice FC</p>
          <p className="font-bold">{todayProfitFc}</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl">
          <p className="text-sm text-gray-400">Bénéfice USD</p>
          <p className="font-bold">{todayProfitDollar}</p>
        </div>

      </div>

{/* 🚨 ALERTE PRODUITS ÉPUISÉS */}
{exhaustedProducts.length > 0 && (
  <Link href="/products/low-stock">
    <div className="bg-red-600 text-white p-4 rounded-2xl mb-4 font-bold text-center shadow-lg cursor-pointer hover:bg-red-700 transition animate-pulse">
      🚨 {exhaustedProducts.length} produit(s) épuisé(s) - Cliquez pour voir
    </div>
  </Link>
)}

      {/* STOCK */}
      <div className="bg-slate-900 p-4 rounded-2xl mb-6">
        <h2 className="font-bold mb-2">Stock épuisé</h2>

        {exhaustedProducts.length === 0 ? (
          <p className="text-gray-400">Aucun produit</p>
        ) : (
          exhaustedProducts.map((p, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-slate-800">
              <span>{p.product_name}</span>
              <span className="text-red-500 font-bold">Épuisé</span>
            </div>
          ))
        )}
      </div>

      {/* VENTES */}
      <div className="bg-slate-900 p-4 rounded-2xl">
        <h2 className="font-bold mb-2">Dernières ventes</h2>

        {lastSales.map((s, i) => (
          <p key={i}>
            {s.product_name} - {s.quantity}
          </p>
        ))}
      </div>

    </main>
  );
}
