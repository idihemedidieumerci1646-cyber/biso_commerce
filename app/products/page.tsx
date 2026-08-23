"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

import {
  Package,
  Plus,
  Search,
  Trash2,
  Edit,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  RefreshCcw,
  Boxes,
  TrendingUp,
  Info,
  X,
  CircleDollarSign,
  ChevronRight,
  BarChart3,
  ShoppingBag,
  Wallet,
} from "lucide-react";

type Product = {
  id: string;
  name: string | null;
  stock: number;
  unit: string | null;
  purchase_price: number;
  selling_price: number;
  currency: string;
  created_at?: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // GUIDE
  const [showGuide, setShowGuide] = useState(false);

  /* =========================================================
     CHARGER LES PRODUITS
  ========================================================= */

  const fetchProducts = async () => {
    try {
      setLoading(true);

      const userId = localStorage.getItem("user_id");

      if (!userId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        alert(error.message);
      } else {
        setProducts(data || []);
      }
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  };

  /* =========================================================
     ACTUALISER
  ========================================================= */

  const refreshProducts = async () => {
    setRefreshing(true);

    await fetchProducts();

    setRefreshing(false);
  };

  /* =========================================================
     SUPPRIMER
  ========================================================= */

  const deleteProduct = async (id: string) => {
    const ok = confirm("Voulez-vous supprimer ce produit ?");

    if (!ok) return;

    const userId = localStorage.getItem("user_id");

    if (!userId) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
    } else {
      await fetchProducts();
    }
  };

  /* =========================================================
     CHARGEMENT INITIAL
  ========================================================= */

  useEffect(() => {
    fetchProducts();
  }, []);

  /* =========================================================
     STATISTIQUES
  ========================================================= */

  const stats = useMemo(() => {
    const rupture = products.filter(
      (p) => Number(p.stock) <= 0
    ).length;

    const faible = products.filter(
      (p) =>
        Number(p.stock) > 0 &&
        Number(p.stock) <= 5
    ).length;

    /* ---------------------------------------------------------
       VALEUR STOCK FC
    --------------------------------------------------------- */

    const valeurFC = products.reduce(
      (total, p) => {
        const currency = String(
          p.currency || ""
        )
          .trim()
          .toUpperCase();

        if (
          currency === "FC" ||
          currency === "CDF" ||
          currency === "FRANC CONGOLAIS"
        ) {
          return (
            total +
            (Number(p.purchase_price) || 0) *
              (Number(p.stock) || 0)
          );
        }

        return total;
      },
      0
    );

    /* ---------------------------------------------------------
       VALEUR STOCK USD
    --------------------------------------------------------- */

    const valeurUSD = products.reduce(
      (total, p) => {
        const currency = String(
          p.currency || ""
        )
          .trim()
          .toUpperCase();

        if (
          currency === "$" ||
          currency === "USD" ||
          currency === "DOLLAR"
        ) {
          return (
            total +
            (Number(p.purchase_price) || 0) *
              (Number(p.stock) || 0)
          );
        }

        return total;
      },
      0
    );

    /* ---------------------------------------------------------
       BENEFICE FC
    --------------------------------------------------------- */

    const beneficeFC = products.reduce(
      (total, p) => {
        const currency = String(
          p.currency || ""
        )
          .trim()
          .toUpperCase();

        if (
          currency === "FC" ||
          currency === "CDF" ||
          currency === "FRANC CONGOLAIS"
        ) {
          return (
            total +
            (
              (Number(p.selling_price) || 0) -
              (Number(p.purchase_price) || 0)
            ) *
              (Number(p.stock) || 0)
          );
        }

        return total;
      },
      0
    );

    /* ---------------------------------------------------------
       BENEFICE USD
    --------------------------------------------------------- */

    const beneficeUSD = products.reduce(
      (total, p) => {
        const currency = String(
          p.currency || ""
        )
          .trim()
          .toUpperCase();

        if (
          currency === "$" ||
          currency === "USD" ||
          currency === "DOLLAR"
        ) {
          return (
            total +
            (
              (Number(p.selling_price) || 0) -
              (Number(p.purchase_price) || 0)
            ) *
              (Number(p.stock) || 0)
          );
        }

        return total;
      },
      0
    );

    return {
      total: products.length,
      rupture,
      faible,
      valeurFC,
      valeurUSD,
      beneficeFC,
      beneficeUSD,
    };
  }, [products]);

  /* =========================================================
     RECHERCHE
  ========================================================= */

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) =>
        (p.name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const aStock = Number(a.stock);
        const bStock = Number(b.stock);

        // Rupture en premier
        if (
          aStock === 0 &&
          bStock !== 0
        )
          return -1;

        if (
          bStock === 0 &&
          aStock !== 0
        )
          return 1;

        // Stock faible ensuite
        if (
          aStock <= 5 &&
          bStock > 5
        )
          return -1;

        if (
          bStock <= 5 &&
          aStock > 5
        )
          return 1;

        return 0;
      });
  }, [products, searchTerm]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef2f7] pb-24 text-slate-900">

      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute right-0 top-80 h-96 w-96 rounded-full bg-cyan-200/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
                <Package size={27} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                    Produits
                  </h1>

                  <span className="hidden rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-600 sm:inline-flex">
                    STOCK
                  </span>
                </div>

                <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                  Gérez vos produits et votre stock simplement.
                </p>
              </div>

            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={refreshProducts}
                disabled={refreshing}
                className="
                  flex
                  min-h-[46px]
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  px-4
                  text-xs
                  font-black
                  text-slate-700
                  transition
                  hover:bg-slate-100
                  disabled:opacity-60
                "
              >
                <RefreshCcw
                  size={16}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                <span className="hidden sm:inline">
                  Actualiser
                </span>
              </button>

              <Link
                href="/products/add"
                className="
                  flex
                  min-h-[46px]
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-slate-900
                  px-4
                  text-xs
                  font-black
                  text-white
                  shadow-lg
                  shadow-slate-900/10
                  transition
                  hover:bg-slate-800
                "
              >
                <Plus size={17} />
                Ajouter
              </Link>

            </div>

          </div>

        </header>

        {/* =====================================================
            STATISTIQUES
        ===================================================== */}

        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

          {/* TOTAL */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

            <div className="mb-4 flex items-center justify-between">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <ShoppingBag size={19} />
              </div>

              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Catalogue
              </span>

            </div>

            <p className="text-xs font-semibold text-slate-500">
              Total produits
            </p>

            <p className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
              {stats.total}
            </p>

          </div>

          {/* RUPTURE */}

          <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm sm:p-5">

            <div className="mb-4 flex items-center justify-between">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
                <AlertTriangle size={19} />
              </div>

              <span className="text-[9px] font-black uppercase tracking-wider text-red-400">
                Attention
              </span>

            </div>

            <p className="text-xs font-semibold text-slate-500">
              Rupture
            </p>

            <p className="mt-1 text-2xl font-black text-red-500 sm:text-3xl">
              {stats.rupture}
            </p>

          </div>

          {/* FAIBLE */}

          <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm sm:p-5">

            <div className="mb-4 flex items-center justify-between">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                <Boxes size={19} />
              </div>

              <span className="text-[9px] font-black uppercase tracking-wider text-amber-500">
                Surveiller
              </span>

            </div>

            <p className="text-xs font-semibold text-slate-500">
              Stock faible
            </p>

            <p className="mt-1 text-2xl font-black text-amber-500 sm:text-3xl">
              {stats.faible}
            </p>

          </div>

          {/* VALEUR STOCK */}

          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">

            <div className="mb-4 flex items-center justify-between">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CircleDollarSign size={19} />
              </div>

              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500">
                Valeur
              </span>

            </div>

            <p className="text-xs font-semibold text-slate-500">
              Valeur du stock
            </p>

            <div className="mt-2 space-y-1">

              <p className="text-sm font-black text-emerald-600">
                {stats.valeurFC.toLocaleString()} FC
              </p>

              <p className="text-sm font-black text-emerald-600">
                {stats.valeurUSD.toLocaleString()} $
              </p>

            </div>

          </div>

        </section>

        {/* =====================================================
            BÉNÉFICE
        ===================================================== */}

        <section className="mb-6 overflow-hidden rounded-[24px] border border-indigo-100 bg-white shadow-sm">

          <div className="border-b border-slate-100 p-5 sm:p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <TrendingUp size={21} />
              </div>

              <div>
                <h2 className="font-black text-slate-900">
                  Bénéfice potentiel
                </h2>

                <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                  Estimation basée sur le stock actuellement disponible.
                </p>
              </div>

            </div>

          </div>

          <div className="grid grid-cols-2 gap-px bg-slate-100">

            <div className="bg-white p-5 sm:p-6">

              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Bénéfice FC
              </p>

              <p className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
                {stats.beneficeFC.toLocaleString()} FC
              </p>

            </div>

            <div className="bg-white p-5 sm:p-6">

              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Bénéfice USD
              </p>

              <p className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
                {stats.beneficeUSD.toLocaleString()} $
              </p>

            </div>

          </div>

        </section>

        {/* =====================================================
            GUIDE
        ===================================================== */}

        <section className="mb-6 overflow-hidden rounded-[24px] border border-indigo-100 bg-white shadow-sm">

          <div className="p-5 sm:p-6">

            <div className="flex items-start justify-between gap-4">

              <div className="flex min-w-0 items-start gap-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Info size={21} />
                </div>

                <div>
                  <h2 className="font-black text-slate-900">
                    Guide des produits
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                    Découvrez rapidement comment utiliser cette page.
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowGuide(!showGuide)
                }
                className="
                  shrink-0
                  rounded-xl
                  bg-indigo-600
                  px-3
                  py-2
                  text-[11px]
                  font-black
                  text-white
                  transition
                  hover:bg-indigo-700
                "
              >
                {showGuide
                  ? "Fermer"
                  : "Voir le guide"}
              </button>

            </div>

            {showGuide && (
              <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">

                {/* INTRODUCTION */}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                  <div className="mb-2 flex items-center gap-2">

                    <Sparkles
                      size={18}
                      className="text-indigo-600"
                    />

                    <h3 className="text-sm font-black text-slate-900">
                      👋 Bienvenue dans vos produits
                    </h3>

                  </div>

                  <p className="text-sm leading-7 text-slate-600">
                    Cette page contient tous les produits
                    enregistrés dans votre commerce.
                    <br />
                    <br />
                    Vous pouvez voir la quantité disponible,
                    le prix d'achat, le prix de vente et la
                    monnaie utilisée.
                    <br />
                    <br />
                    Vous pouvez également modifier ou supprimer
                    un produit.
                  </p>

                </div>

                {/* ÉTAPE 1 */}

                <GuideItem
                  number="1"
                  title="Ajouter un produit"
                  text={
                    <>
                      Pour ajouter un nouveau produit, appuyez
                      sur le bouton{" "}
                      <strong className="text-indigo-600">
                        +
                      </strong>{" "}
                      situé à côté de la barre de recherche.
                      <br />
                      <br />
                      Vous pourrez renseigner le nom,
                      la quantité, le prix d'achat, le prix
                      de vente et la monnaie.
                    </>
                  }
                />

                {/* ÉTAPE 2 */}

                <GuideItem
                  number="2"
                  title="Comprendre le stock"
                  text={
                    <>
                      À côté de chaque produit, vous trouverez
                      la quantité disponible.
                      <br />
                      <br />
                      🟢{" "}
                      <strong className="text-emerald-600">
                        Disponible
                      </strong>{" "}
                      : le produit est disponible.
                      <br />
                      <br />
                      🟠{" "}
                      <strong className="text-amber-600">
                        Faible
                      </strong>{" "}
                      : il reste 5 unités ou moins.
                      <br />
                      <br />
                      🔴{" "}
                      <strong className="text-red-600">
                        Rupture
                      </strong>{" "}
                      : le stock est à zéro.
                    </>
                  }
                />

                {/* ÉTAPE 3 */}

                <GuideItem
                  number="3"
                  title="Comprendre FC et Dollar"
                  text={
                    <>
                      BISO-COMMERCE garde les monnaies séparées.
                      <br />
                      <br />
                      🇨🇩 Un produit enregistré en{" "}
                      <strong className="text-slate-900">
                        FC
                      </strong>{" "}
                      reste en FC.
                      <br />
                      <br />
                      🇺🇸 Un produit enregistré en{" "}
                      <strong className="text-slate-900">
                        $
                      </strong>{" "}
                      reste en dollars.
                      <br />
                      <br />
                      La valeur totale du stock est donc
                      calculée séparément en FC et en dollars.
                    </>
                  }
                />

                {/* ÉTAPE 4 */}

                <GuideItem
                  number="4"
                  title="Modifier un produit"
                  text={
                    <>
                      Si vous avez fait une erreur ou si le prix
                      d'un produit change, appuyez sur le bouton{" "}
                      <strong className="text-indigo-600">
                        Modifier
                      </strong>.
                    </>
                  }
                />

                {/* ÉTAPE 5 */}

                <GuideItem
                  number="5"
                  title="Supprimer un produit"
                  text={
                    <>
                      Si vous n'avez plus besoin d'un produit,
                      appuyez sur{" "}
                      <strong className="text-red-600">
                        Supprimer
                      </strong>.
                      <br />
                      <br />
                      Une confirmation sera demandée avant
                      la suppression.
                    </>
                  }
                />

                {/* ÉTAPE 6 */}

                <GuideItem
                  number="6"
                  title="Valeur du stock"
                  text={
                    <>
                      La valeur du stock correspond à la valeur
                      d'achat de vos produits encore disponibles.
                      <br />
                      <br />
                      Exemple :
                      <br />
                      <br />
                      Vous avez 100 produits.
                      <br />
                      Le coût d'achat d'un produit est de
                      1 000 FC.
                      <br />
                      <br />
                      <strong className="text-slate-900">
                        100 × 1 000 FC = 100 000 FC
                      </strong>
                      <br />
                      <br />
                      Les produits en dollars sont calculés
                      séparément.
                    </>
                  }
                />

                {/* ÉTAPE 7 */}

                <GuideItem
                  number="7"
                  title="Bénéfice potentiel"
                  text={
                    <>
                      BISO-COMMERCE calcule également le bénéfice
                      potentiel de votre stock.
                      <br />
                      <br />
                      Le bénéfice correspond à la différence
                      entre le prix de vente et le prix d'achat,
                      multipliée par le stock disponible.
                      <br />
                      <br />
                      Le bénéfice FC reste en FC et le bénéfice
                      en dollars reste en dollars.
                    </>
                  }
                />

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
                    gap-2
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    text-xs
                    font-black
                    text-slate-700
                    transition
                    hover:bg-slate-100
                  "
                >
                  <X size={16} />
                  Fermer le guide
                </button>

              </div>
            )}

          </div>

        </section>

        {/* =====================================================
            RECHERCHE + AJOUT
        ===================================================== */}

        <section className="mb-5 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">

          <div className="flex gap-2">

            <div className="flex min-h-[50px] flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4">

              <Search
                size={18}
                className="shrink-0 text-slate-400"
              />

              <input
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
                placeholder="Chercher un produit"
                className="
                  w-full
                  bg-transparent
                  py-2
                  text-sm
                  font-medium
                  text-slate-900
                  outline-none
                  placeholder:text-slate-400
                "
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchTerm("")
                  }
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <X size={15} />
                </button>
              )}

            </div>

            <Link
              href="/products/add"
              className="
                flex
                min-h-[50px]
                w-[50px]
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-indigo-600
                text-white
                shadow-md
                transition
                hover:bg-indigo-700
              "
              aria-label="Ajouter un produit"
            >
              <Plus size={22} />
            </Link>

          </div>

        </section>

        {/* =====================================================
            TITRE LISTE
        ===================================================== */}

        <div className="mb-3 flex items-center justify-between px-1">

          <div>
            <h2 className="text-lg font-black text-slate-900">
              Inventaire
            </h2>

            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              {filteredProducts.length} produit
              {filteredProducts.length !== 1
                ? "s"
                : ""}{" "}
              affiché
              {filteredProducts.length !== 1
                ? "s"
                : ""}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <BarChart3 size={14} />
            Stock
          </div>

        </div>

        {/* =====================================================
            LISTE PRODUITS
        ===================================================== */}

        <section className="space-y-3">

          {loading ? (
            <div className="rounded-[24px] border border-slate-200 bg-white p-12 text-center shadow-sm">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <RefreshCcw
                  size={23}
                  className="animate-spin"
                />
              </div>

              <p className="mt-4 text-sm font-black text-slate-700">
                Chargement des produits...
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Récupération de votre inventaire.
              </p>

            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-[24px] border border-slate-200 bg-white p-10 text-center shadow-sm">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Package size={25} />
              </div>

              <p className="mt-4 font-black text-slate-800">
                Aucun produit trouvé
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Ajoutez un produit ou modifiez votre recherche.
              </p>

              {!searchTerm && (
                <Link
                  href="/products/add"
                  className="
                    mx-auto
                    mt-5
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    bg-slate-900
                    px-4
                    py-3
                    text-xs
                    font-black
                    text-white
                  "
                >
                  <Plus size={16} />
                  Ajouter un produit
                </Link>
              )}

            </div>
          ) : (
            filteredProducts.map((p) => {

              const stock = Number(p.stock) || 0;

              const purchasePrice =
                Number(
                  p.purchase_price || 0
                );

              const sellingPrice =
                Number(
                  p.selling_price || 0
                );

              const profit =
                (sellingPrice -
                  purchasePrice) *
                stock;

              const isRupture =
                stock <= 0;

              const isFaible =
                stock > 0 &&
                stock <= 5;

              return (
                <article
                  key={p.id}
                  className="
                    overflow-hidden
                    rounded-[24px]
                    border
                    border-slate-200
                    bg-white
                    shadow-sm
                    transition
                    hover:border-indigo-200
                    hover:shadow-md
                  "
                >

                  {/* =================================================
                      PRODUIT HEADER
                  ================================================= */}

                  <div className="p-4 sm:p-5">

                    <div className="flex items-start justify-between gap-3">

                      <div className="flex min-w-0 items-center gap-3">

                        <div
                          className={`
                            flex
                            h-11
                            w-11
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            ${
                              isRupture
                                ? "bg-red-50 text-red-500"
                                : isFaible
                                ? "bg-amber-50 text-amber-500"
                                : "bg-indigo-50 text-indigo-600"
                            }
                          `}
                        >
                          {isRupture ? (
                            <AlertTriangle size={19} />
                          ) : (
                            <Package size={19} />
                          )}
                        </div>

                        <div className="min-w-0">

                          <h3 className="truncate text-base font-black text-slate-900 sm:text-lg">
                            {p.name || "Produit sans nom"}
                          </h3>

                          <p className="mt-1 text-[11px] font-medium text-slate-500">
                            {p.unit || "Unité"} • Stock actuel
                          </p>

                        </div>

                      </div>

                      {/* STATUT */}

                      {isRupture ? (
                        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-2.5 py-1.5 text-[9px] font-black text-red-600">
                          <AlertTriangle size={12} />
                          Rupture
                        </span>
                      ) : isFaible ? (
                        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[9px] font-black text-amber-600">
                          <AlertTriangle size={12} />
                          Faible
                        </span>
                      ) : (
                        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[9px] font-black text-emerald-600">
                          <CheckCircle size={12} />
                          Disponible
                        </span>
                      )}

                    </div>

                    {/* =================================================
                        STOCK
                    ================================================= */}

                    <div className="mt-5 rounded-2xl bg-slate-50 p-4">

                      <div className="flex items-center justify-between gap-3">

                        <div className="flex items-center gap-2">

                          <Boxes
                            size={16}
                            className="text-slate-400"
                          />

                          <span className="text-xs font-bold text-slate-500">
                            Stock disponible
                          </span>

                        </div>

                        <span
                          className={`
                            text-lg
                            font-black
                            ${
                              isRupture
                                ? "text-red-500"
                                : isFaible
                                ? "text-amber-500"
                                : "text-slate-900"
                            }
                          `}
                        >
                          {stock}{" "}
                          <span className="text-xs font-bold text-slate-400">
                            {p.unit || "unité"}
                          </span>
                        </span>

                      </div>

                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">

                        <div
                          className={`
                            h-full
                            rounded-full
                            transition-all
                            ${
                              isRupture
                                ? "w-0 bg-red-500"
                                : isFaible
                                ? "bg-amber-500"
                                : "bg-indigo-600"
                            }
                          `}
                          style={{
                            width:
                              stock <= 0
                                ? "0%"
                                : `${Math.min(
                                    100,
                                    Math.max(
                                      10,
                                      stock * 4
                                    )
                                  )}%`,
                          }}
                        />

                      </div>

                    </div>

                    {/* =================================================
                        PRIX
                    ================================================= */}

                    <div className="mt-3 grid grid-cols-2 gap-2">

                      <div className="rounded-2xl border border-slate-100 bg-white p-3">

                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Prix achat
                        </p>

                        <p className="mt-1 text-sm font-black text-slate-700">
                          {purchasePrice.toLocaleString()}{" "}
                          {p.currency}
                        </p>

                      </div>

                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">

                        <p className="text-[9px] font-black uppercase tracking-wider text-emerald-500">
                          Prix vente
                        </p>

                        <p className="mt-1 text-sm font-black text-emerald-700">
                          {sellingPrice.toLocaleString()}{" "}
                          {p.currency}
                        </p>

                      </div>

                    </div>

                    {/* =================================================
                        BENEFICE
                    ================================================= */}

                    <div className="mt-3 flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/50 px-3 py-3">

                      <div className="flex items-center gap-2">

                        <Wallet
                          size={15}
                          className="text-indigo-500"
                        />

                        <span className="text-[10px] font-bold text-slate-500">
                          Bénéfice potentiel
                        </span>

                      </div>

                      <span
                        className={`
                          text-xs
                          font-black
                          ${
                            profit >= 0
                              ? "text-indigo-600"
                              : "text-red-500"
                          }
                        `}
                      >
                        {profit.toLocaleString()}{" "}
                        {p.currency}
                      </span>

                    </div>

                    {/* =================================================
                        ACTIONS
                    ================================================= */}

                    <div className="mt-4 grid grid-cols-2 gap-2">

                      <Link
                        href={`/products/edit/${p.id}`}
                        className="
                          flex
                          min-h-[46px]
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          border
                          border-indigo-100
                          bg-indigo-50
                          text-xs
                          font-black
                          text-indigo-600
                          transition
                          hover:bg-indigo-100
                        "
                      >
                        <Edit size={15} />
                        Modifier
                        <ChevronRight size={14} />
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          deleteProduct(p.id)
                        }
                        className="
                          flex
                          min-h-[46px]
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          border
                          border-red-100
                          bg-red-50
                          text-xs
                          font-black
                          text-red-600
                          transition
                          hover:bg-red-100
                        "
                      >
                        <Trash2 size={15} />
                        Supprimer
                      </button>

                    </div>

                  </div>

                </article>
              );
            })
          )}

        </section>

      </div>

    </main>
  );
}

/* =========================================================
   GUIDE ITEM
========================================================= */

function GuideItem({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex items-start gap-3">

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-black text-white">
          {number}
        </div>

        <div className="min-w-0">

          <h3 className="mb-2 text-sm font-black text-slate-900">
            {title}
          </h3>

          <p className="text-sm leading-7 text-slate-600">
            {text}
          </p>

        </div>

      </div>

    </div>
  );
}