
"use client";

import { useEffect, useState } from "react";
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
  Wallet,
  AlertTriangle,
  LogOut,
  ArrowRight,
} from "lucide-react";

// ---------------- TYPES ----------------

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
  const router = useRouter();

  const [initialLoading, setInitialLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false); // Ajout state modal

  const [daysUsed, setDaysUsed] = useState(0);
  const [daysLeft, setDaysLeft] = useState(30);

  const [status, setStatus] =
    useState<"active" | "expired">("active");

  const [todaySalesFc, setTodaySalesFc] = useState(0);
  const [todaySalesDollar, setTodaySalesDollar] = useState(0);

  const [todayProfitFc, setTodayProfitFc] = useState(0);
  const [todayProfitDollar, setTodayProfitDollar] = useState(0);

  const [todayProductsSold, setTodayProductsSold] = useState(0);

  const [exhaustedProducts, setExhaustedProducts] =
    useState<Product[]>([]);

  const [lastSales, setLastSales] =
    useState<Sale[]>([]);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (exhaustedProducts.length > 0) {
      alert(
        "🚨 " +
          exhaustedProducts.length +
          " produit(s) épuisé(s)"
      );
    }
  }, [exhaustedProducts]);

  async function loadAll() {
    const phone = localStorage.getItem("phone");

    if (!phone) {
      window.location.replace("/login");
      return;
    }

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .single();

    if (!user) {
      window.location.replace("/login");
      return;
    }

    const ok = await checkSubscription(user.id);

    if (!ok) {
  router.replace("/subscription");
  return;
}

if (!ok) {
  router.replace("/subscription");
  setInitialLoading(false);
  return;
}

    await loadDashboard(user.id);

    setInitialLoading(false);
  }

  async function checkSubscription(userId: string) {
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
    const now = new Date();

    const diffDays = Math.floor(
      (now.getTime() - start.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const used = diffDays < 0 ? 0 : diffDays;

    setDaysUsed(used);

    setDaysLeft(Math.max(0, 30 - used));

    const isActive =
      sub.is_active === true &&
      sub.end_date &&
      end > now;

    setStatus(
      isActive ? "active" : "expired"
    );

    return isActive;
  }

  async function loadDashboard(userId: string) {
    const today =
      new Date().toISOString().split("T")[0];

    const [salesRes, productsRes] =
      await Promise.all([
        supabase
          .from("sales")
          .select("*")
          .eq("user_id", userId),

        supabase
          .from("products")
          .select("*")
          .eq("user_id", userId),
      ]);

    const sales = salesRes.data || [];
    const products = productsRes.data || [];

    let todayFc = 0;
    let todayDollar = 0;

    let todayBenefFc = 0;
    let todayBenefDollar = 0;

    let soldToday = 0;

    sales.forEach((sale: Sale) => {
      const saleDate =
        sale.created_at?.split("T")[0];

      if (saleDate === today) {
        soldToday += Number(sale.quantity || 0);

        if (sale.currency === "FC") {
          todayFc += Number(sale.total_sale || 0);
          todayBenefFc += Number(sale.profit || 0);
        } else {
          todayDollar += Number(
            sale.total_sale || 0
          );

          todayBenefDollar += Number(
            sale.profit || 0
          );
        }
      }
    });

    setTodaySalesFc(todayFc);
    setTodaySalesDollar(todayDollar);

    setTodayProfitFc(todayBenefFc);
    setTodayProfitDollar(todayBenefDollar);

    setTodayProductsSold(soldToday);

    setExhaustedProducts(
      products.filter(
        (p: Product) => Number(p.stock) === 0
      )
    );

    setLastSales(sales.slice(0, 5));
  }

  if (!initialLoading && status === "expired")
 {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-5">

          <h1 className="text-3xl font-bold text-red-500">
            ❌ Abonnement expiré
          </h1>

          <p className="text-slate-400">
            Votre accès est bloqué.
          </p>

          <Link
            href="/subscription"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 px-7 py-3 rounded-2xl font-bold"
          >
            <Crown size={18} />
            Renouveler
          </Link>

        </div>
      </main>
    );
  }

  {initialLoading && (
  <div className="text-center text-slate-400 py-3">
    Chargement des données...
  </div>
)}

  const percentUsed = Math.round(
    (daysUsed / 30) * 100
  );
    return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white pb-28">

      {/* HEADER PRO */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-wide">
            💼 Biso Gestion
          </h1>
          <p className="text-xs text-slate-400">
            Mode caisse pro • vente rapide
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Zap className="text-green-500" />
          <div className="w-9 h-9 rounded-full bg-green-500 text-black flex items-center justify-center font-bold text-xs">
            PDG
          </div>
        </div>
      </div>

      {/* ABONNEMENT CARD */}
      <div className="px-4 mb-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">

          <div className="flex justify-between items-center mb-2">
            <p className="text-green-400 font-bold">
              Abonnement actif
            </p>

            <p className="text-xs text-slate-400">
              {daysUsed}/30 jours
            </p>
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500"
           style={{ width: percentUsed + "%" }}
            />
          </div>

          <p className="text-xs text-slate-400 mt-2">
            {daysLeft} jours restants
          </p>
        </div>
      </div>

      {/* BOUTON PRO */}
      <div className="px-4 mb-3">
        <button
          onClick={() => setShowInfo(true)}
          className="text-xs text-slate-400 hover:text-green-400 transition underline"
        >
          👉 Clique ici pour en savoir plus sur Biso-Commerce
        </button>
      </div>

      {/* QUICK ACTION CAISSE */}
      <div className="px-4 mb-5">
        <Link
          href="/sales"
          className="flex items-center justify-between bg-green-600 hover:bg-green-700 transition p-4 rounded-2xl shadow-lg"
        >
          <div className="flex items-center gap-3">
            <ShoppingCart />
            <div>
              <p className="font-bold">Nouvelle vente</p>
              <p className="text-xs opacity-80">
                Accès rapide caisse
              </p>
            </div>
          </div>

          <ArrowRight />
        </Link>
      </div>

      {/* STATS GRID */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-5">

        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800">
          <p className="text-xs text-slate-400">
            Ventes FC
          </p>
          <p className="text-lg font-bold text-green-400">
            {todaySalesFc}
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800">
          <p className="text-xs text-slate-400">
            Ventes USD
          </p>
          <p className="text-lg font-bold text-blue-400">
            {todaySalesDollar}
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800">
          <p className="text-xs text-slate-400">
            Bénéfice FC
          </p>
          <p className="text-lg font-bold text-green-300">
            {todayProfitFc}
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800">
          <p className="text-xs text-slate-400">
            Bénéfice USD
          </p>
          <p className="text-lg font-bold text-blue-300">
            {todayProfitDollar}
          </p>
        </div>

      </div>

      {/* SHORTCUT MENU */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-4 gap-3">

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
              <div className="bg-slate-900 hover:bg-slate-800 transition rounded-xl p-3 text-center border border-slate-800">
                <item.icon className="mx-auto mb-1 text-green-400" size={18} />
                <p className="text-[10px] text-slate-300">
                  {item.label}
                </p>
              </div>
            </Link>
          ))}

        </div>
      </div>

      {/* WARNING STOCK */}
      {exhaustedProducts.length > 0 && (
        <div className="px-4 mb-5">
          <Link href="/products/low-stock">
            <div className="bg-red-600/90 animate-pulse text-white p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle />
                <p className="font-bold text-sm">
                  {exhaustedProducts.length} produit(s) épuisé(s)
                </p>
              </div>

              <ArrowRight />
            </div>
          </Link>
        </div>
      )}
            {/* STOCK EPUISE DETAIL */}
      <div className="px-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">

          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm">
              Stock épuisé
            </h2>

            <span className="text-xs text-slate-400">
              {exhaustedProducts.length} article(s)
            </span>
          </div>

          {exhaustedProducts.length === 0 ? (
            <p className="text-xs text-slate-500">
              Aucun produit en rupture
            </p>
          ) : (
            <div className="space-y-2">
              {exhaustedProducts.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-slate-800"
                >
                  <span className="text-sm">
                    {p.product_name}
                  </span>
                  <span className="text-xs text-red-400 font-bold">
                    ÉPUISÉ
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LAST SALES */}
      <div className="px-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">

          <h2 className="font-bold text-sm mb-3">
            Dernières ventes
          </h2>

          {lastSales.length === 0 ? (
            <p className="text-xs text-slate-500">
              Aucune vente récente
            </p>
          ) : (
            <div className="space-y-2">
              {lastSales.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-slate-800"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {s.product_name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Qté: {s.quantity}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-green-400">
                      {s.total_sale} {s.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LOGOUT */}
      <div className="px-4 mb-10">
        <button
          onClick={() => {
            localStorage.removeItem("phone");
            router.push("/login");
          }}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 transition text-white font-bold p-4 rounded-2xl"
        >
          <LogOut size={18} />
          Se déconnecter
        </button>
      </div>

      {/* MODAL ULTRA PRO */}
      {showInfo && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-[fadeIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-green-400 font-bold text-lg">
                Biso-Commerce
              </h2>
              <button
                onClick={() => setShowInfo(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* TEXT */}
            <p className="text-sm text-slate-300 leading-8">

<span className="text-green-400 font-bold text-lg">
<p className="text-sm text-slate-300 leading-4">

<span className="text-green-400 font-bold text-lg">
📖 BIENVENUE SUR BISO-COMMERCE
</span>

<br /><br />

<b>Qu'est-ce que Biso-Commerce ?</b>

<br /><br />

Biso-Commerce est une caisse digitale qui vous permet de gérer facilement votre commerce depuis votre téléphone.

Vous pouvez enregistrer vos ventes, suivre vos bénéfices, gérer votre stock, vos dépenses, les dettes de vos clients et consulter vos rapports en temps réel.

<br /><br />

<b>Comment utiliser Biso-Commerce ?</b>

<br /><br />

• Ajoutez d'abord vos produits.

• Enregistrez vos ventes chaque jour.

• Ajoutez vos dépenses.

• Gérez les dettes de vos clients.

• Consultez vos rapports pour suivre votre commerce.

<br /><br />

<b>Installer l'application</b>

<br /><br />

📱 <b>Android :</b> Chrome → ⋮ → <b>Installer l'application</b>.

<br /><br />

🍎 <b>iPhone :</b> Safari → <b>Partager</b> → <b>Sur l'écran d'accueil</b> → <b>Ajouter</b>.

<br /><br />

<span className="text-green-400 font-semibold">
Merci d'utiliser Biso-Commerce 💚 PDG DIEUMERCI IDI
</span>

</p>
</span>

</p>

            {/* CTA */}
            <button
              onClick={() => setShowInfo(false)}
              className="mt-5 w-full bg-green-600 hover:bg-green-700 transition p-3 rounded-xl font-bold"
            >
              J’ai compris
            </button>
          </div>
        </div>
      )}

    </main>
  );
}