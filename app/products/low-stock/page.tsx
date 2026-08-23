"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

import {
  AlertTriangle,
  Package,
  Trash2,
  ArrowRight,
  Sparkles,
  RefreshCcw,
  XCircle,
  Boxes,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  stock: number;
  unit: string;
};

export default function LowStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);

    const phone = localStorage.getItem("phone");

    if (!phone) {
      setLoading(false);
      return;
    }

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id);

    setProducts(
      (data || []).map((p) => ({
        id: p.id,
        name: p.name || p.product_name,
        stock: Number(p.stock) || 0,
        unit: p.unit || "unité",
      }))
    );

    setLoading(false);
  }

  async function handleDelete(id: string) {
    const confirmDelete = confirm("Supprimer ce produit ?");

    if (!confirmDelete) return;

    const phone = localStorage.getItem("phone");

    if (!phone) return;

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    if (!user) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      alert("Erreur suppression");
      return;
    }

    loadProducts();
  }

  const outOfStock = products.filter(
    (p) => p.stock <= 0
  );

  const almostEmpty = products.filter(
    (p) => p.stock > 0 && p.stock <= 5
  );

  return (
    <main
      className="
        min-h-screen
        w-full
        min-w-0
        overflow-x-hidden
        bg-[#f5f7fb]
        text-slate-900
        px-3
        py-4
        pb-24
        sm:px-6
        sm:py-6
        lg:px-8
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-6xl
          min-w-0
        "
      >
        {/* =========================================================
            HEADER
        ========================================================= */}

        <div
          className="
            mb-5
            w-full
            min-w-0
            overflow-hidden
            rounded-[24px]
            border
            border-slate-200
            bg-white
            p-4
            shadow-sm
            sm:mb-6
            sm:rounded-[26px]
            sm:p-7
          "
        >
          <div
            className="
              flex
              min-w-0
              flex-col
              gap-5
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div className="min-w-0">
              <div
                className="
                  mb-4
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-2xl
                  bg-indigo-50
                  sm:h-12
                  sm:w-12
                "
              >
                <AlertTriangle
                  className="text-indigo-600"
                  size={24}
                />
              </div>

              <h1
                className="
                  break-words
                  text-xl
                  font-black
                  tracking-tight
                  text-slate-900
                  sm:text-3xl
                "
              >
                Gestion du stock
              </h1>

              <p
                className="
                  mt-2
                  max-w-2xl
                  text-xs
                  leading-5
                  text-slate-500
                  sm:text-sm
                  sm:leading-6
                "
              >
                Retrouvez rapidement les produits à
                réapprovisionner avant de perdre des ventes.
              </p>
            </div>

            <Link
              href="/products"
              className="
                flex
                min-h-[46px]
                w-full
                shrink-0
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
                sm:w-auto
                sm:py-3.5
              "
            >
              <Package size={18} />

              <span>Produits</span>
            </Link>
          </div>
        </div>

        {/* =========================================================
            RESUME STOCK
            MOBILE = 1 COLONNE
            TABLETTE / PC = 2 COLONNES
        ========================================================= */}

        <div
          className="
            mb-5
            grid
            w-full
            min-w-0
            grid-cols-1
            gap-3
            sm:mb-6
            sm:grid-cols-2
            sm:gap-4
          "
        >
          {/* =====================================================
              RUPTURE
          ===================================================== */}

          <div
            className="
              min-w-0
              overflow-hidden
              rounded-[22px]
              border
              border-slate-200
              bg-white
              p-4
              shadow-sm
              sm:rounded-[26px]
              sm:p-5
            "
          >
            <div
              className="
                flex
                min-w-0
                items-start
                justify-between
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-red-50
                  sm:h-11
                  sm:w-11
                  sm:rounded-2xl
                "
              >
                <XCircle
                  className="text-red-500"
                  size={21}
                />
              </div>

              <span
                className="
                  shrink-0
                  rounded-full
                  bg-red-50
                  px-2.5
                  py-1
                  text-[10px]
                  font-bold
                  text-red-600
                  sm:px-3
                  sm:py-1.5
                  sm:text-xs
                "
              >
                Attention
              </span>
            </div>

            <p
              className="
                mt-4
                break-words
                text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-slate-500
                sm:mt-5
                sm:text-xs
              "
            >
              Produits en rupture
            </p>

            <p
              className="
                mt-1
                text-3xl
                font-black
                text-red-600
                sm:text-4xl
              "
            >
              {outOfStock.length}
            </p>

            <p
              className="
                mt-1
                text-[10px]
                leading-4
                text-slate-500
                sm:text-xs
                sm:leading-5
              "
            >
              Stock totalement vide
            </p>
          </div>

          {/* =====================================================
              PRESQUE FINI
          ===================================================== */}

          <div
            className="
              min-w-0
              overflow-hidden
              rounded-[22px]
              border
              border-slate-200
              bg-white
              p-4
              shadow-sm
              sm:rounded-[26px]
              sm:p-5
            "
          >
            <div
              className="
                flex
                min-w-0
                items-start
                justify-between
                gap-3
              "
            >
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
                  sm:h-11
                  sm:w-11
                  sm:rounded-2xl
                "
              >
                <Boxes
                  className="text-indigo-600"
                  size={21}
                />
              </div>

              <span
                className="
                  shrink-0
                  rounded-full
                  bg-indigo-50
                  px-2.5
                  py-1
                  text-[10px]
                  font-bold
                  text-indigo-600
                  sm:px-3
                  sm:py-1.5
                  sm:text-xs
                "
              >
                À surveiller
              </span>
            </div>

            <p
              className="
                mt-4
                break-words
                text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-slate-500
                sm:mt-5
                sm:text-xs
              "
            >
              Presque fini
            </p>

            <p
              className="
                mt-1
                text-3xl
                font-black
                text-indigo-600
                sm:text-4xl
              "
            >
              {almostEmpty.length}
            </p>

            <p
              className="
                mt-1
                text-[10px]
                leading-4
                text-slate-500
                sm:text-xs
                sm:leading-5
              "
            >
              Entre 1 et 5 unités
            </p>
          </div>
        </div>

        {/* =========================================================
            CHARGEMENT
        ========================================================= */}

        {loading ? (
          <div
            className="
              w-full
              min-w-0
              overflow-hidden
              rounded-[24px]
              border
              border-slate-200
              bg-white
              px-5
              py-10
              text-center
              shadow-sm
              sm:rounded-[26px]
              sm:px-6
              sm:py-12
            "
          >
            <div
              className="
                mx-auto
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                bg-indigo-50
              "
            >
              <RefreshCcw
                className="
                  animate-spin
                  text-indigo-600
                "
                size={25}
              />
            </div>

            <p
              className="
                mt-4
                font-bold
                text-slate-900
              "
            >
              Chargement du stock...
            </p>

            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              Récupération de vos produits
            </p>
          </div>
        ) : (
          <div className="w-full min-w-0 space-y-7">

            {/* =====================================================
                PRODUITS EN RUPTURE + PRESQUE EPUISES

                MOBILE : 1 COLONNE
                TABLETTE / PC : 2 COLONNES
            ===================================================== */}

            {(outOfStock.length > 0 ||
              almostEmpty.length > 0) && (
              <div
                className="
                  grid
                  w-full
                  min-w-0
                  grid-cols-1
                  gap-6
                  sm:grid-cols-2
                  sm:gap-5
                "
              >
                {/* =================================================
                    PRODUITS EN RUPTURE
                ================================================= */}

                {outOfStock.length > 0 && (
                  <section className="min-w-0">
                    <div
                      className="
                        mb-3
                        flex
                        min-w-0
                        items-center
                        gap-2
                        sm:mb-4
                        sm:gap-3
                      "
                    >
                      <div
                        className="
                          flex
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-red-50
                          sm:h-10
                          sm:w-10
                        "
                      >
                        <XCircle
                          className="text-red-500"
                          size={19}
                        />
                      </div>

                      <div className="min-w-0">
                        <h2
                          className="
                            break-words
                            text-sm
                            font-black
                            leading-5
                            text-slate-900
                            sm:text-lg
                            sm:leading-6
                          "
                        >
                          Produits en rupture
                        </h2>

                        <p
                          className="
                            mt-0.5
                            hidden
                            text-xs
                            text-slate-500
                            sm:block
                          "
                        >
                          Ces produits ne sont plus disponibles.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      {outOfStock.map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          danger
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* =================================================
                    PRODUITS PRESQUE ÉPUISÉS
                ================================================= */}

                {almostEmpty.length > 0 && (
                  <section className="min-w-0">
                    <div
                      className="
                        mb-3
                        flex
                        min-w-0
                        items-center
                        gap-2
                        sm:mb-4
                        sm:gap-3
                      "
                    >
                      <div
                        className="
                          flex
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-indigo-50
                          sm:h-10
                          sm:w-10
                        "
                      >
                        <AlertTriangle
                          className="text-indigo-600"
                          size={19}
                        />
                      </div>

                      <div className="min-w-0">
                        <h2
                          className="
                            break-words
                            text-sm
                            font-black
                            leading-5
                            text-slate-900
                            sm:text-lg
                            sm:leading-6
                          "
                        >
                          Presque épuisés
                        </h2>

                        <p
                          className="
                            mt-0.5
                            hidden
                            text-xs
                            text-slate-500
                            sm:block
                          "
                        >
                          Pensez à les réapprovisionner.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      {almostEmpty.map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* =====================================================
                STOCK NORMAL
            ===================================================== */}

            {outOfStock.length === 0 &&
              almostEmpty.length === 0 && (
                <div
                  className="
                    w-full
                    min-w-0
                    overflow-hidden
                    rounded-[24px]
                    border
                    border-slate-200
                    bg-white
                    p-6
                    text-center
                    shadow-sm
                    sm:rounded-[26px]
                    sm:p-8
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
                      rounded-2xl
                      bg-green-50
                    "
                  >
                    <Sparkles
                      className="text-green-600"
                      size={32}
                    />
                  </div>

                  <p
                    className="
                      mt-4
                      text-lg
                      font-black
                      text-slate-900
                      sm:text-xl
                    "
                  >
                    Excellent stock ✅
                  </p>

                  <p
                    className="
                      mx-auto
                      mt-2
                      max-w-sm
                      text-sm
                      leading-6
                      text-slate-500
                    "
                  >
                    Aucun produit en rupture ou presque épuisé.
                    Votre stock est actuellement bien surveillé.
                  </p>

                  <Link
                    href="/products"
                    className="
                      mt-6
                      inline-flex
                      min-h-[46px]
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
                    Voir mes produits

                    <ArrowRight size={17} />
                  </Link>
                </div>
              )}
          </div>
        )}
      </div>
    </main>
  );
}

/* =========================================================
   PRODUCT CARD
========================================================= */

function ProductCard({
  product,
  danger = false,
  onDelete,
}: {
  product: Product;
  danger?: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className="
        w-full
        min-w-0
        overflow-hidden
        rounded-[22px]
        border
        border-slate-200
        bg-white
        p-3
        shadow-sm
        transition
        hover:shadow-md
        sm:rounded-[26px]
        sm:p-5
      "
    >
      {/* =========================================================
          INFORMATIONS PRODUIT
      ========================================================= */}

      <div className="min-w-0">
        <div
          className="
            flex
            min-w-0
            items-start
            justify-between
            gap-2
          "
        >
          <div
            className="
              flex
              min-w-0
              flex-1
              items-start
              gap-2
              sm:gap-3
            "
          >
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-indigo-50
                sm:h-11
                sm:w-11
                sm:rounded-2xl
              "
            >
              <Package
                size={18}
                className="
                  text-indigo-600
                  sm:h-[21px]
                  sm:w-[21px]
                "
              />
            </div>

            <div className="min-w-0 flex-1">
              <h3
                className="
                  break-words
                  text-sm
                  font-black
                  leading-5
                  text-slate-900
                  sm:text-lg
                  sm:leading-6
                "
              >
                {product.name}
              </h3>

              <p
                className="
                  mt-0.5
                  hidden
                  text-xs
                  text-slate-500
                  sm:block
                "
              >
                Gestion du stock
              </p>
            </div>
          </div>

          {/* =====================================================
              STATUT
          ===================================================== */}

          <span
            className={`
              shrink-0
              rounded-full
              px-2
              py-1
              text-[8px]
              font-black
              tracking-wide
              sm:px-3
              sm:py-1.5
              sm:text-[10px]
              ${
                danger
                  ? "bg-red-50 text-red-600 ring-1 ring-red-100"
                  : "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"
              }
            `}
          >
            {danger
              ? "RUPTURE"
              : "FAIBLE"}
          </span>
        </div>

        {/* =========================================================
            STOCK
        ========================================================= */}

        <div
          className={`
            mt-3
            w-full
            rounded-xl
            border
            p-3
            sm:mt-5
            sm:rounded-2xl
            sm:p-4
            ${
              danger
                ? "border-red-100 bg-red-50/60"
                : "border-indigo-100 bg-indigo-50/60"
            }
          `}
        >
          <p
            className="
              text-[9px]
              font-bold
              uppercase
              tracking-wider
              text-slate-500
              sm:text-xs
            "
          >
            Stock actuel
          </p>

          <div
            className="
              mt-1
              flex
              min-w-0
              items-end
              gap-1.5
              sm:gap-2
            "
          >
            <span
              className={`
                text-2xl
                font-black
                leading-none
                sm:text-3xl
                ${
                  danger
                    ? "text-red-600"
                    : "text-indigo-600"
                }
              `}
            >
              {product.stock}
            </span>

            <span
              className="
                mb-0.5
                min-w-0
                max-w-[65%]
                break-words
                text-[10px]
                font-bold
                leading-4
                text-slate-500
                sm:mb-1
                sm:max-w-none
                sm:text-sm
              "
            >
              {product.unit}
            </span>
          </div>

          <p
            className="
              mt-1
              hidden
              text-xs
              text-slate-500
              sm:block
            "
          >
            Quantité actuellement disponible
          </p>
        </div>
      </div>

      {/* =========================================================
          MESSAGE
      ========================================================= */}

      <div
        className={`
          mt-3
          flex
          min-w-0
          items-start
          gap-2
          rounded-xl
          border
          p-3
          sm:mt-4
          sm:gap-3
          sm:rounded-2xl
          sm:p-4
          ${
            danger
              ? "border-red-100 bg-red-50/60"
              : "border-indigo-100 bg-indigo-50/60"
          }
        `}
      >
        {danger ? (
          <XCircle
            size={16}
            className="
              mt-0.5
              shrink-0
              text-red-500
              sm:h-[18px]
              sm:w-[18px]
            "
          />
        ) : (
          <AlertTriangle
            size={16}
            className="
              mt-0.5
              shrink-0
              text-indigo-600
              sm:h-[18px]
              sm:w-[18px]
            "
          />
        )}

        <p
          className="
            min-w-0
            break-words
            text-[10px]
            leading-4
            text-slate-600
            sm:text-sm
            sm:leading-5
          "
        >
          {danger
            ? "Ce produit est complètement épuisé. Réapprovisionnez-le pour pouvoir continuer à le vendre."
            : "Ce produit possède un stock faible. Pensez à le réapprovisionner prochainement."}
        </p>
      </div>

      {/* =========================================================
          ACTIONS
          MOBILE : TOUJOURS LISIBLES
      ========================================================= */}

      <div
        className="
          mt-3
          grid
          w-full
          min-w-0
          grid-cols-2
          gap-2
          sm:mt-5
          sm:gap-3
        "
      >
        {/* SUPPRIMER */}

        <button
          type="button"
          onClick={() =>
            onDelete(product.id)
          }
          className="
            flex
            min-w-0
            min-h-[44px]
            items-center
            justify-center
            gap-1
            rounded-xl
            bg-red-600
            px-2
            py-2.5
            text-[10px]
            font-bold
            text-white
            shadow-sm
            transition
            hover:bg-red-700
            active:scale-[0.98]
            sm:gap-2
            sm:rounded-2xl
            sm:px-4
            sm:py-3.5
            sm:text-sm
          "
        >
          <Trash2
            size={15}
            className="
              shrink-0
              sm:h-[17px]
              sm:w-[17px]
            "
          />

          <span className="truncate">
            Supprimer
          </span>
        </button>

        {/* RÉAPPROVISIONNER */}

        <Link
          href={`/products/edit/${product.id}`}
          className="
            flex
            min-w-0
            min-h-[44px]
            items-center
            justify-center
            gap-1
            rounded-xl
            bg-green-50
            px-2
            py-2.5
            text-[10px]
            font-bold
            text-green-700
            ring-1
            ring-green-200
            transition
            hover:bg-green-100
            active:scale-[0.98]
            sm:gap-2
            sm:rounded-2xl
            sm:px-4
            sm:py-3.5
            sm:text-sm
          "
        >
          <span className="truncate">
            Réapprovisionner
          </span>

          <ArrowRight
            size={15}
            className="
              shrink-0
              sm:h-[17px]
              sm:w-[17px]
            "
          />
        </Link>
      </div>
    </div>
  );
}