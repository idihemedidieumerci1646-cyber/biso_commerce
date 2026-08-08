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

  const refreshProducts = async () => {

    setRefreshing(true);

    await fetchProducts();

    setRefreshing(false);
  };

  const deleteProduct = async (id: string) => {

    const ok = confirm(
      "Voulez-vous supprimer ce produit ?"
    );

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

  useEffect(() => {

    fetchProducts();

  }, []);

  /*
  ==========================================
  STATISTIQUES
  ==========================================
  */

  const stats = useMemo(() => {

    const rupture =
      products.filter(
        p => Number(p.stock) <= 0
      ).length;

    const faible =
      products.filter(
        p =>
          Number(p.stock) > 0 &&
          Number(p.stock) <= 5
      ).length;

    /*
    ==========================================
    VALEUR STOCK FC
    ==========================================
    */

    const valeurFC = products.reduce(
      (total, p) => {

        const currency =
          String(p.currency || "")
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

    /*
    ==========================================
    VALEUR STOCK DOLLAR
    ==========================================
    */

    const valeurUSD = products.reduce(
      (total, p) => {

        const currency =
          String(p.currency || "")
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

    /*
    ==========================================
    BENEFICE FC
    ==========================================
    */

    const beneficeFC = products.reduce(
      (total, p) => {

        const currency =
          String(p.currency || "")
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

    /*
    ==========================================
    BENEFICE DOLLAR
    ==========================================
    */

    const beneficeUSD = products.reduce(
      (total, p) => {

        const currency =
          String(p.currency || "")
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

  /*
  ==========================================
  RECHERCHE
  ==========================================
  */

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
        ) return -1;

        if (
          bStock === 0 &&
          aStock !== 0
        ) return 1;

        // Stock faible ensuite
        if (
          aStock <= 5 &&
          bStock > 5
        ) return -1;

        if (
          bStock <= 5 &&
          aStock > 5
        ) return 1;

        return 0;

      });

  }, [products, searchTerm]);

  return (

    <main
      className="
      relative
      min-h-screen
      overflow-hidden
      bg-[#050b16]
      pb-24
      text-white
      "
    >

      {/* LUMIÈRE ARRIÈRE */}

      <div
        className="
        pointer-events-none
        absolute
        inset-0
        bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.20),transparent_35%)]
        "
      />

      <div
        className="
        relative
        z-10
        mx-auto
        max-w-xl
        p-5
        "
      >

        {/* =========================================
            HEADER
        ========================================= */}

        <div
          className="
          mb-7
          flex
          items-center
          justify-between
          "
        >

          <div>

            <div
              className="
              flex
              items-center
              gap-2
              "
            >

              <span
                className="
                rounded-2xl
                bg-gradient-to-br
                from-orange-500
                to-yellow-400
                p-2
                "
              >

                <Package
                  className="text-black"
                  size={22}
                />

              </span>

              <h1
                className="
                text-3xl
                font-black
                "
              >
                Produits
              </h1>

            </div>

            <p
              className="
              mt-2
              text-xs
              text-slate-400
              "
            >
              Gérez votre stock facilement avec BISO-COMMERCE
            </p>

          </div>

          <button
            onClick={refreshProducts}
            className="
            rounded-2xl
            border
            border-white/10
            bg-white/5
            p-3
            "
          >

            <RefreshCcw
              size={20}
              className={
                refreshing
                  ? "animate-spin text-orange-400"
                  : "text-slate-400"
              }
            />

          </button>

        </div>

        {/* =========================================
            GUIDE
        ========================================= */}

        <div
          className="
          mb-6
          rounded-3xl
          border
          border-orange-500/20
          bg-orange-500/5
          p-5
          "
        >

          <div
            className="
            flex
            items-start
            justify-between
            gap-4
            "
          >

            <div className="flex-1">

              <div
                className="
                mb-2
                flex
                items-center
                gap-2
                "
              >

                <Info
                  size={21}
                  className="text-orange-400"
                />

                <h2
                  className="
                  text-lg
                  font-black
                  "
                >
                  Guide des produits
                </h2>

              </div>

              <p
                className="
                text-sm
                leading-6
                text-slate-400
                "
              >
                Vous ne savez pas comment utiliser cette
                page ? Le guide vous explique simplement
                comment ajouter, comprendre et gérer vos
                produits.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowGuide(!showGuide)
              }
              className="
              shrink-0
              rounded-xl
              bg-orange-500
              px-4
              py-2
              text-xs
              font-black
              text-black
              "
            >

              {showGuide
                ? "Fermer"
                : "Voir le guide"}

            </button>

          </div>

          {showGuide && (

            <div
              className="
              mt-6
              space-y-5
              "
            >

              {/* INTRODUCTION */}

              <div
                className="
                rounded-2xl
                border
                border-white/10
                bg-black/20
                p-4
                "
              >

                <div
                  className="
                  mb-2
                  flex
                  items-center
                  gap-2
                  "
                >

                  <Sparkles
                    size={19}
                    className="text-orange-400"
                  />

                  <h3 className="font-black">
                    👋 Bienvenue dans vos produits
                  </h3>

                </div>

                <p
                  className="
                  text-sm
                  leading-7
                  text-slate-400
                  "
                >
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

              {/* ETAPE 1 */}

              <div
                className="
                rounded-2xl
                border
                border-white/10
                bg-black/20
                p-4
                "
              >

                <h3
                  className="
                  mb-2
                  text-base
                  font-black
                  "
                >
                  1️⃣ Ajouter un produit
                </h3>

                <p
                  className="
                  text-sm
                  leading-7
                  text-slate-400
                  "
                >
                  Pour ajouter un nouveau produit, appuyez
                  sur le bouton{" "}
                  <strong className="text-orange-300">
                    +
                  </strong>{" "}
                  situé à côté de la barre de recherche.

                  <br />
                  <br />

                  Vous pourrez ensuite renseigner le nom,
                  la quantité, le prix d'achat, le prix de
                  vente et la monnaie.
                </p>

              </div>

              {/* ETAPE 2 */}

              <div
                className="
                rounded-2xl
                border
                border-white/10
                bg-black/20
                p-4
                "
              >

                <h3
                  className="
                  mb-2
                  text-base
                  font-black
                  "
                >
                  2️⃣ Comprendre le stock
                </h3>

                <p
                  className="
                  text-sm
                  leading-7
                  text-slate-400
                  "
                >
                  À côté de chaque produit, vous trouverez
                  la quantité disponible.

                  <br />
                  <br />

                  🟢{" "}
                  <strong className="text-green-300">
                    Disponible
                  </strong>{" "}
                  : le produit est disponible.

                  <br />

                  🟠{" "}
                  <strong className="text-orange-300">
                    Faible
                  </strong>{" "}
                  : il reste 5 unités ou moins.

                  <br />

                  🔴{" "}
                  <strong className="text-red-300">
                    Rupture
                  </strong>{" "}
                  : le stock est à zéro.
                </p>

              </div>

              {/* ETAPE 3 */}

              <div
                className="
                rounded-2xl
                border
                border-green-400/20
                bg-green-500/5
                p-4
                "
              >

                <h3
                  className="
                  mb-2
                  text-base
                  font-black
                  "
                >
                  3️⃣ Comprendre FC et Dollar
                </h3>

                <p
                  className="
                  text-sm
                  leading-7
                  text-slate-400
                  "
                >
                  BISO-COMMERCE garde les monnaies séparées.

                  <br />
                  <br />

                  🇨🇩 Un produit enregistré en{" "}
                  <strong className="text-white">
                    FC
                  </strong>{" "}
                  reste en FC.

                  <br />
                  <br />

                  🇺🇸 Un produit enregistré en{" "}
                  <strong className="text-white">
                    $
                  </strong>{" "}
                  reste en dollars.

                  <br />
                  <br />

                  La valeur totale du stock affiche donc
                  séparément :

                  <br />
                  <br />

                  <strong className="text-green-300">
                    Valeur stock en FC
                  </strong>

                  <br />

                  <strong className="text-green-300">
                    Valeur stock en $
                  </strong>

                  <br />
                  <br />

                  Il n'y a aucun mélange entre les deux
                  monnaies.
                </p>

              </div>

              {/* ETAPE 4 */}

              <div
                className="
                rounded-2xl
                border
                border-blue-400/20
                bg-blue-500/5
                p-4
                "
              >

                <h3
                  className="
                  mb-2
                  text-base
                  font-black
                  "
                >
                  4️⃣ Modifier un produit
                </h3>

                <p
                  className="
                  text-sm
                  leading-7
                  text-slate-400
                  "
                >
                  Si vous avez fait une erreur dans un
                  produit ou si son prix change, appuyez
                  sur le bouton{" "}
                  <strong className="text-blue-300">
                    Modifier
                  </strong>.
                </p>

              </div>

              {/* ETAPE 5 */}

              <div
                className="
                rounded-2xl
                border
                border-red-400/20
                bg-red-500/5
                p-4
                "
              >

                <h3
                  className="
                  mb-2
                  text-base
                  font-black
                  "
                >
                  5️⃣ Supprimer un produit
                </h3>

                <p
                  className="
                  text-sm
                  leading-7
                  text-slate-400
                  "
                >
                  Si vous n'avez plus besoin d'un produit,
                  vous pouvez appuyer sur{" "}
                  <strong className="text-red-300">
                    Supprimer
                  </strong>.

                  <br />
                  <br />

                  Une confirmation sera demandée avant la
                  suppression.
                </p>

              </div>

              {/* ETAPE 6 */}

              <div
                className="
                rounded-2xl
                border
                border-yellow-400/20
                bg-yellow-500/5
                p-4
                "
              >

                <h3
                  className="
                  mb-2
                  text-base
                  font-black
                  "
                >
                  6️⃣ Valeur du stock
                </h3>

                <p
                  className="
                  text-sm
                  leading-7
                  text-slate-400
                  "
                >
                  La valeur du stock correspond à la valeur
                  d'achat de vos produits encore disponibles.

                  <br />
                  <br />

                  Exemple :

                  <br />

                  Vous avez 100 produits.

                  <br />

                  Le coût d'achat d'un produit est de
                  1 000 FC.

                  <br />
                  <br />

                  Votre valeur stock est :

                  <br />

                  <strong className="text-white">
                    100 × 1 000 FC = 100 000 FC
                  </strong>

                  <br />
                  <br />

                  Si vous avez également des produits en
                  dollars, leur valeur sera calculée
                  séparément en dollars.
                </p>

              </div>

              {/* ETAPE 7 */}

              <div
                className="
                rounded-2xl
                border
                border-purple-400/20
                bg-purple-500/5
                p-4
                "
              >

                <h3
                  className="
                  mb-2
                  text-base
                  font-black
                  "
                >
                  7️⃣ Bénéfice potentiel
                </h3>

                <p
                  className="
                  text-sm
                  leading-7
                  text-slate-400
                  "
                >
                  BISO-COMMERCE calcule également le bénéfice
                  potentiel de votre stock.

                  <br />
                  <br />

                  Le bénéfice est calculé à partir de la
                  différence entre le prix de vente et le
                  prix d'achat.

                  <br />
                  <br />

                  Le bénéfice en FC reste en FC.

                  <br />

                  Le bénéfice en dollars reste en dollars.
                </p>

              </div>

              {/* FERMER */}

              <button
                type="button"
                onClick={() =>
                  setShowGuide(false)
                }
                className="
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-orange-500
                p-4
                font-black
                text-black
                transition
                hover:scale-[1.01]
                "
              >

                <X size={18} />

                Fermer le guide

              </button>

            </div>

          )}

        </div>

        {/* =========================================
            STATISTIQUES
        ========================================= */}

        <div
          className="
          mb-4
          grid
          grid-cols-2
          gap-3
          "
        >

          {/* TOTAL */}

          <div
            className="
            rounded-3xl
            border
            border-white/10
            bg-white/[0.05]
            p-4
            backdrop-blur-xl
            "
          >

            <Package
              className="mb-2 text-orange-400"
            />

            <p className="text-xs text-slate-400">
              Total produits
            </p>

            <p className="text-3xl font-black">
              {stats.total}
            </p>

          </div>

          {/* RUPTURE */}

          <div
            className="
            rounded-3xl
            border
            border-red-400/20
            bg-red-500/10
            p-4
            "
          >

            <AlertTriangle
              className="mb-2 text-red-400"
            />

            <p className="text-xs text-slate-400">
              Rupture
            </p>

            <p
              className="
              text-3xl
              font-black
              text-red-400
              "
            >
              {stats.rupture}
            </p>

          </div>

          {/* FAIBLE */}

          <div
            className="
            rounded-3xl
            border
            border-orange-400/20
            bg-orange-500/10
            p-4
            "
          >

            <Boxes
              className="mb-2 text-orange-300"
            />

            <p className="text-xs text-slate-400">
              Stock faible
            </p>

            <p
              className="
              text-3xl
              font-black
              text-orange-300
              "
            >
              {stats.faible}
            </p>

          </div>

          {/* VALEUR STOCK */}

          <div
            className="
            rounded-3xl
            border
            border-green-400/20
            bg-green-500/10
            p-4
            "
          >

            <CircleDollarSign
              className="mb-2 text-green-400"
            />

            <p className="text-xs text-slate-400">
              Valeur stock
            </p>

            <div className="mt-2 space-y-2">

              <div>

                <p
                  className="
                  text-[10px]
                  uppercase
                  text-slate-400
                  "
                >
                  Franc Congolais
                </p>

                <p
                  className="
                  text-sm
                  font-black
                  text-green-300
                  "
                >
                  {stats.valeurFC.toLocaleString()} FC
                </p>

              </div>

              <div>

                <p
                  className="
                  text-[10px]
                  uppercase
                  text-slate-400
                  "
                >
                  Dollar
                </p>

                <p
                  className="
                  text-sm
                  font-black
                  text-green-300
                  "
                >
                  {stats.valeurUSD.toLocaleString()} $
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* =========================================
            BENEFICE
        ========================================= */}

        <div
          className="
          mb-6
          rounded-3xl
          border
          border-purple-400/20
          bg-purple-500/10
          p-5
          "
        >

          <div
            className="
            mb-4
            flex
            items-center
            gap-2
            "
          >

            <TrendingUp
              className="text-purple-300"
              size={22}
            />

            <p className="font-black">
              Bénéfice potentiel du stock
            </p>

          </div>

          <div
            className="
            grid
            grid-cols-2
            gap-3
            "
          >

            <div
              className="
              rounded-2xl
              bg-black/20
              p-4
              "
            >

              <p className="text-xs text-slate-400">
                Bénéfice FC
              </p>

              <p
                className="
                mt-2
                text-base
                font-black
                text-white
                "
              >
                {stats.beneficeFC.toLocaleString()} FC
              </p>

            </div>

            <div
              className="
              rounded-2xl
              bg-black/20
              p-4
              "
            >

              <p className="text-xs text-slate-400">
                Bénéfice $
              </p>

              <p
                className="
                mt-2
                text-base
                font-black
                text-white
                "
              >
                {stats.beneficeUSD.toLocaleString()} $
              </p>

            </div>

          </div>

        </div>

        {/* =========================================
            RECHERCHE + AJOUT
        ========================================= */}

        <div
          className="
          mb-6
          flex
          gap-3
          "
        >

          <div
            className="
            flex
            flex-1
            items-center
            gap-2
            rounded-2xl
            border
            border-white/10
            bg-white/[0.06]
            px-4
            "
          >

            <Search
              size={18}
              className="text-slate-400"
            />

            <input
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              placeholder="Chercher un produit"
              className="
              w-full
              bg-transparent
              py-3
              text-sm
              text-white
              outline-none
              placeholder:text-slate-400
              "
              style={{
                color: "#ffffff",
                WebkitTextFillColor: "#ffffff",
                caretColor: "#ffffff",
              }}
            />

          </div>

          <Link
            href="/products/add"
            className="
            flex
            items-center
            justify-center
            rounded-2xl
            bg-gradient-to-r
            from-orange-500
            to-yellow-400
            px-5
            text-black
            "
          >

            <Plus size={24} />

          </Link>

        </div>

        {/* =========================================
            LISTE PRODUITS
        ========================================= */}

        <div className="space-y-4">

          {loading ? (

            <div
              className="
              flex
              justify-center
              py-10
              text-slate-400
              "
            >

              <RefreshCcw
                className="mr-2 animate-spin"
              />

              Chargement des produits...

            </div>

          ) : filteredProducts.length === 0 ? (

            <div
              className="
              rounded-3xl
              border
              border-white/10
              bg-white/[0.05]
              p-8
              text-center
              backdrop-blur-xl
              "
            >

              <Sparkles
                className="
                mx-auto
                mb-3
                text-orange-400
                "
                size={35}
              />

              <p
                className="
                font-bold
                text-slate-200
                "
              >
                Aucun produit trouvé
              </p>

              <p
                className="
                mt-2
                text-sm
                text-slate-400
                "
              >
                Ajoutez un produit ou modifiez votre recherche.
              </p>

            </div>

          ) : (

            filteredProducts.map((p) => (

              <div
                key={p.id}
                className="
                rounded-[1.8rem]
                border
                border-white/10
                bg-white/[0.05]
                p-5
                backdrop-blur-xl
                shadow-[0_20px_50px_-25px_rgba(0,0,0,0.8)]
                transition
                hover:-translate-y-1
                hover:border-orange-400/30
                "
              >

                <div
                  className="
                  flex
                  items-start
                  justify-between
                  gap-3
                  "
                >

                  <div>

                    <h2
                      className="
                      text-lg
                      font-black
                      text-white
                      "
                    >
                      {p.name || "Produit sans nom"}
                    </h2>

                    <p
                      className="
                      mt-2
                      text-xs
                      text-slate-400
                      "
                    >

                      Stock :

                      <span
                        className="
                        ml-1
                        font-bold
                        text-white
                        "
                      >
                        {p.stock} {p.unit || "unité"}
                      </span>

                    </p>

                    <p
                      className="
                      mt-2
                      text-xs
                      text-slate-400
                      "
                    >

                      Achat :

                      <span
                        className="
                        font-bold
                        text-slate-200
                        "
                      >
                        {" "}
                        {Number(
                          p.purchase_price || 0
                        ).toLocaleString()}{" "}
                        {p.currency}
                      </span>

                      {" • "}

                      Vente :

                      <span
                        className="
                        font-bold
                        text-green-300
                        "
                      >
                        {" "}
                        {Number(
                          p.selling_price || 0
                        ).toLocaleString()}{" "}
                        {p.currency}
                      </span>

                    </p>

                  </div>

                  {/* STATUT */}

                  {Number(p.stock) === 0 ? (

                    <span
                      className="
                      flex
                      items-center
                      gap-1
                      rounded-full
                      bg-red-500/20
                      px-3
                      py-1
                      text-xs
                      font-black
                      text-red-300
                      "
                    >

                      <AlertTriangle size={13} />

                      Rupture

                    </span>

                  ) : Number(p.stock) <= 5 ? (

                    <span
                      className="
                      flex
                      items-center
                      gap-1
                      rounded-full
                      bg-orange-500/20
                      px-3
                      py-1
                      text-xs
                      font-black
                      text-orange-300
                      "
                    >

                      <AlertTriangle size={13} />

                      Faible

                    </span>

                  ) : (

                    <span
                      className="
                      flex
                      items-center
                      gap-1
                      rounded-full
                      bg-green-500/20
                      px-3
                      py-1
                      text-xs
                      font-black
                      text-green-300
                      "
                    >

                      <CheckCircle size={13} />

                      Disponible

                    </span>

                  )}

                </div>

                {/* ACTIONS */}

                <div
                  className="
                  mt-5
                  flex
                  gap-3
                  "
                >

                  <Link
                    href={`/products/edit/${p.id}`}
                    className="
                    flex
                    flex-1
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-blue-500/20
                    py-3
                    text-sm
                    font-bold
                    text-blue-300
                    transition
                    hover:bg-blue-500/30
                    "
                  >

                    <Edit size={16} />

                    Modifier

                  </Link>

                  <button
                    onClick={() =>
                      deleteProduct(p.id)
                    }
                    className="
                    flex
                    flex-1
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-red-500/20
                    py-3
                    text-sm
                    font-bold
                    text-red-300
                    transition
                    hover:bg-red-500/30
                    "
                  >

                    <Trash2 size={16} />

                    Supprimer

                  </button>

                </div>

              </div>

            ))

          )}

        </div>

      </div>

    </main>
  );
}