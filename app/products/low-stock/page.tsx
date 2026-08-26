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
  WifiOff,
  X,
  Info,
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

  // ======================================================
  // CONNEXION
  // ======================================================

  const [isOnline, setIsOnline] = useState(true);
  const [showConnectionModal, setShowConnectionModal] =
    useState(false);

  // ======================================================
  // POPUP SUPPRESSION
  // ======================================================

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [productToDelete, setProductToDelete] =
    useState<Product | null>(null);

  const [deleting, setDeleting] = useState(false);

  // ======================================================
  // CHARGEMENT INITIAL
  // ======================================================

  useEffect(() => {
    const initialOnline =
      typeof navigator !== "undefined"
        ? navigator.onLine
        : true;

    setIsOnline(initialOnline);

    loadProducts();

    const handleOnline = () => {
      setIsOnline(true);
      setShowConnectionModal(false);
      loadProducts();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

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

  // ======================================================
  // CHARGER LES PRODUITS
  // ======================================================

  async function loadProducts() {
    setLoading(true);

    try {
      const cached =
        localStorage.getItem(
          "biso-low-stock-products"
        );

      if (!navigator.onLine) {
        setIsOnline(false);

        if (cached) {
          try {
            setProducts(
              JSON.parse(cached) as Product[]
            );
          } catch {
            setProducts([]);
          }
        } else {
          setProducts([]);
        }

        return;
      }

      setIsOnline(true);

      const phone =
        localStorage.getItem("phone");

      if (!phone) {
        if (cached) {
          try {
            setProducts(
              JSON.parse(cached) as Product[]
            );
          } catch {
            setProducts([]);
          }
        }

        return;
      }

      const { data: user, error: userError } =
        await supabase
          .from("users")
          .select("id")
          .eq("phone", phone)
          .single();

      if (userError || !user) {
        if (cached) {
          try {
            setProducts(
              JSON.parse(cached) as Product[]
            );
          } catch {
            setProducts([]);
          }
        }

        return;
      }

      const { data, error } =
        await supabase
          .from("products")
          .select("*")
          .eq("user_id", user.id);

      if (error) {
        console.error(
          "Erreur chargement produits :",
          error
        );

        if (cached) {
          try {
            setProducts(
              JSON.parse(cached) as Product[]
            );
          } catch {
            setProducts([]);
          }
        }

        return;
      }

      const normalizedProducts =
        (data || []).map((p) => ({
          id: p.id,
          name:
            p.name ||
            p.product_name ||
            "Produit sans nom",
          stock: Number(p.stock) || 0,
          unit: p.unit || "unité",
        })) as Product[];

      setProducts(normalizedProducts);

      localStorage.setItem(
        "biso-low-stock-products",
        JSON.stringify(normalizedProducts)
      );
    } catch (error) {
      console.error(
        "Erreur chargement produits :",
        error
      );

      const cached =
        localStorage.getItem(
          "biso-low-stock-products"
        );

      if (cached) {
        try {
          setProducts(
            JSON.parse(cached) as Product[]
          );
        } catch {
          setProducts([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  // ======================================================
  // SUPPRESSION — OUVRIR POPUP
  // ======================================================

  function askDelete(product: Product) {
    if (!navigator.onLine) {
      setIsOnline(false);
      setShowConnectionModal(true);
      return;
    }

    setProductToDelete(product);
    setShowDeleteModal(true);
  }

  // ======================================================
  // SUPPRIMER LE PRODUIT
  // ======================================================

  async function handleDelete() {
    if (!productToDelete) return;

    if (!navigator.onLine) {
      setIsOnline(false);
      setShowDeleteModal(false);
      setShowConnectionModal(true);
      return;
    }

    const phone =
      localStorage.getItem("phone");

    if (!phone) {
      setShowDeleteModal(false);
      setShowConnectionModal(true);
      return;
    }

    setDeleting(true);

    try {
      const { data: user, error: userError } =
        await supabase
          .from("users")
          .select("id")
          .eq("phone", phone)
          .single();

      if (userError || !user) {
        setShowDeleteModal(false);
        setShowConnectionModal(true);
        return;
      }

      const { error } =
        await supabase
          .from("products")
          .delete()
          .eq("id", productToDelete.id)
          .eq("user_id", user.id);

      if (error) {
        console.error(
          "Erreur suppression :",
          error
        );

        return;
      }

      const updatedProducts =
        products.filter(
          (product) =>
            product.id !==
            productToDelete.id
        );

      setProducts(updatedProducts);

      localStorage.setItem(
        "biso-low-stock-products",
        JSON.stringify(updatedProducts)
      );

      setShowDeleteModal(false);
      setProductToDelete(null);
    } catch (error) {
      console.error(
        "Erreur suppression :",
        error
      );
    } finally {
      setDeleting(false);
    }
  }

  // ======================================================
  // LISTES
  // ======================================================

  const outOfStock =
    products.filter(
      (p) => p.stock <= 0
    );

  const almostEmpty =
    products.filter(
      (p) =>
        p.stock > 0 &&
        p.stock <= 5
    );

  // ======================================================
  // AFFICHAGE
  // ======================================================

  return (
    <>
      <main
        className="
          relative
          min-h-screen
          overflow-x-hidden
          bg-[#050b16]
          px-3
          py-4
          pb-28
          text-white
          sm:px-5
          sm:py-6
        "
      >
        {/* HALO */}

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.18),transparent_35%)]
          "
        />

        <div
          className="
            relative
            z-10
            mx-auto
            w-full
            max-w-xl
          "
        >
          {/* ==================================================
              HEADER
          ================================================== */}

          <header
            className="
              mb-5
              flex
              min-w-0
              items-start
              justify-between
              gap-3
            "
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <AlertTriangle
                  size={23}
                  className="shrink-0 text-orange-400"
                />

                <h1
                  className="
                    truncate
                    text-2xl
                    font-black
                    tracking-tight
                    sm:text-3xl
                  "
                >
                  Gestion du stock
                </h1>
              </div>

              <p
                className="
                  mt-1
                  break-words
                  text-xs
                  leading-5
                  text-slate-400
                  sm:text-sm
                "
              >
                Produits à réapprovisionner rapidement.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`
                  inline-flex
                  h-9
                  items-center
                  rounded-full
                  px-3
                  text-[10px]
                  font-black
                  ${
                    isOnline
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }
                `}
              >
                <span
                  className={`
                    mr-1.5
                    h-1.5
                    w-1.5
                    rounded-full
                    ${
                      isOnline
                        ? "bg-green-400"
                        : "bg-red-400"
                    }
                  `}
                />

                {isOnline
                  ? "En ligne"
                  : "Hors ligne"}
              </span>

              <Link
                href="/products"
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-gradient-to-r
                  from-orange-500
                  to-yellow-400
                  text-black
                  shadow-lg
                  transition
                  active:scale-95
                "
                title="Produits"
                aria-label="Produits"
              >
                <Package size={18} />
              </Link>
            </div>
          </header>

          {/* ==================================================
              MESSAGE HORS CONNEXION
          ================================================== */}

          {!isOnline && (
            <div
              className="
                mb-5
                flex
                items-start
                gap-3
                rounded-2xl
                border
                border-orange-400/20
                bg-orange-500/10
                p-4
              "
            >
              <WifiOff
                size={19}
                className="
                  mt-0.5
                  shrink-0
                  text-orange-400
                "
              />

              <div className="min-w-0">
                <p className="text-sm font-black text-orange-300">
                  Hors connexion
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Les produits déjà chargés restent visibles.
                  Les actions importantes nécessitent Internet.
                </p>
              </div>
            </div>
          )}

          {/* ==================================================
              RESUME STOCK
          ================================================== */}

          <section
            className="
              mb-5
              grid
              grid-cols-2
              gap-3
            "
          >
            <div
              className="
                min-w-0
                overflow-hidden
                rounded-3xl
                border
                border-red-400/20
                bg-red-500/10
                p-4
                backdrop-blur-xl
              "
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-bold text-slate-300">
                  Rupture
                </p>

                <XCircle
                  size={19}
                  className="shrink-0 text-red-400"
                />
              </div>

              <p className="mt-2 text-3xl font-black text-red-400">
                {outOfStock.length}
              </p>

              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                Stock vide
              </p>
            </div>

            <div
              className="
                min-w-0
                overflow-hidden
                rounded-3xl
                border
                border-orange-400/20
                bg-orange-500/10
                p-4
                backdrop-blur-xl
              "
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-bold text-slate-300">
                  Presque fini
                </p>

                <Boxes
                  size={19}
                  className="shrink-0 text-orange-300"
                />
              </div>

              <p className="mt-2 text-3xl font-black text-orange-300">
                {almostEmpty.length}
              </p>

              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                5 unités ou moins
              </p>
            </div>
          </section>

          {/* ==================================================
              CHARGEMENT
          ================================================== */}

          {loading ? (
            <div
              className="
                flex
                items-center
                justify-center
                rounded-3xl
                border
                border-white/10
                bg-white/[0.04]
                p-10
                text-sm
                text-slate-400
              "
            >
              <RefreshCcw
                size={19}
                className="mr-2 animate-spin"
              />

              Chargement...
            </div>
          ) : (
            <div className="space-y-7">
              {/* ==================================================
                  RUPTURE
              ================================================== */}

              {outOfStock.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <XCircle
                      size={19}
                      className="text-red-400"
                    />

                    <h2
                      className="
                        text-base
                        font-black
                        text-red-300
                        sm:text-lg
                      "
                    >
                      Produits en rupture
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {outOfStock.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        danger
                        onDelete={askDelete}
                        onRestock={() => {
                          window.location.href =
                            `/products/edit/${p.id}`;
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* ==================================================
                  PRESQUE ÉPUISÉS
              ================================================== */}

              {almostEmpty.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle
                      size={19}
                      className="text-orange-400"
                    />

                    <h2
                      className="
                        text-base
                        font-black
                        text-orange-300
                        sm:text-lg
                      "
                    >
                      Produits presque épuisés
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {almostEmpty.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        onDelete={askDelete}
                        onRestock={() => {
                          window.location.href =
                            `/products/edit/${p.id}`;
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* ==================================================
                  AUCUNE ALERTE
              ================================================== */}

              {outOfStock.length === 0 &&
                almostEmpty.length === 0 && (
                  <div
                    className="
                      overflow-hidden
                      rounded-3xl
                      border
                      border-green-400/20
                      bg-green-500/10
                      p-6
                      text-center
                    "
                  >
                    <Sparkles
                      size={31}
                      className="
                        mx-auto
                        mb-3
                        text-green-400
                      "
                    />

                    <p className="font-black text-green-300">
                      Stock en bon état ✅
                    </p>

                    <p
                      className="
                        mt-2
                        text-xs
                        leading-5
                        text-slate-400
                      "
                    >
                      Aucun produit en rupture ou presque épuisé.
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </main>

      {/* ======================================================
          POPUP CONNEXION
      ====================================================== */}

      {showConnectionModal && (
        <div
          className="
            fixed
            inset-0
            z-[9999]
            flex
            items-center
            justify-center
            bg-black/75
            px-4
            backdrop-blur-md
          "
          onClick={() =>
            setShowConnectionModal(false)
          }
        >
          <div
            className="
              relative
              w-full
              max-w-sm
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-[#0f172a]
              shadow-2xl
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

            <button
              type="button"
              onClick={() =>
                setShowConnectionModal(false)
              }
              className="
                absolute
                right-4
                top-4
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-xl
                bg-white/5
                text-slate-400
                transition
                hover:bg-white/10
                hover:text-white
              "
              aria-label="Fermer"
            >
              <X size={18} />
            </button>

            <div className="p-6 text-center">
              <div
                className="
                  mx-auto
                  mb-5
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-3xl
                  bg-orange-500/10
                  text-orange-400
                  ring-1
                  ring-orange-500/20
                "
              >
                <WifiOff size={30} />
              </div>

              <h2 className="text-xl font-black text-white">
                Connexion requise
              </h2>

              <p
                className="
                  mt-3
                  text-sm
                  leading-6
                  text-slate-400
                "
              >
                Cette action nécessite une connexion
                Internet pour modifier vos données.
              </p>

              <div
                className="
                  mt-5
                  rounded-2xl
                  border
                  border-orange-500/20
                  bg-orange-500/5
                  p-4
                  text-left
                "
              >
                <div className="flex gap-3">
                  <Info
                    size={18}
                    className="
                      mt-0.5
                      shrink-0
                      text-orange-400
                    "
                  />

                  <p
                    className="
                      text-xs
                      leading-5
                      text-slate-300
                    "
                  >
                    Connectez votre téléphone à Internet,
                    puis réessayez.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (navigator.onLine) {
                    setIsOnline(true);
                    setShowConnectionModal(false);
                    loadProducts();
                  }
                }}
                className="
                  mt-5
                  flex
                  min-h-[50px]
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-gradient-to-r
                  from-orange-500
                  to-yellow-400
                  px-4
                  py-3
                  text-sm
                  font-black
                  text-black
                  shadow-lg
                  transition
                  active:scale-[0.98]
                "
              >
                <RefreshCcw size={18} />
                Vérifier la connexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          POPUP SUPPRESSION
      ====================================================== */}

      {showDeleteModal && productToDelete && (
        <div
          className="
            fixed
            inset-0
            z-[10000]
            flex
            items-center
            justify-center
            bg-black/75
            px-4
            backdrop-blur-md
          "
          onClick={() => {
            if (!deleting) {
              setShowDeleteModal(false);
            }
          }}
        >
          <div
            className="
              relative
              w-full
              max-w-sm
              overflow-hidden
              rounded-3xl
              border
              border-red-400/20
              bg-[#0f172a]
              shadow-2xl
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="h-1 w-full bg-gradient-to-r from-red-500 to-orange-500" />

            <button
              type="button"
              disabled={deleting}
              onClick={() =>
                setShowDeleteModal(false)
              }
              className="
                absolute
                right-4
                top-4
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-xl
                bg-white/5
                text-slate-400
                transition
                hover:bg-white/10
                hover:text-white
                disabled:opacity-50
              "
              aria-label="Fermer"
            >
              <X size={18} />
            </button>

            <div className="p-6">
              <div
                className="
                  mx-auto
                  mb-5
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-3xl
                  bg-red-500/10
                  text-red-400
                  ring-1
                  ring-red-500/20
                "
              >
                <Trash2 size={28} />
              </div>

              <h2
                className="
                  text-center
                  text-xl
                  font-black
                  text-white
                "
              >
                Supprimer ce produit ?
              </h2>

              <p
                className="
                  mt-3
                  text-center
                  text-sm
                  leading-6
                  text-slate-400
                "
              >
                Vous êtes sur le point de supprimer :
              </p>

              <div
                className="
                  mt-4
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/20
                  p-4
                  text-center
                "
              >
                <p className="break-words font-black text-white">
                  {productToDelete.name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Stock : {productToDelete.stock}{" "}
                  {productToDelete.unit}
                </p>
              </div>

              <p
                className="
                  mt-4
                  text-center
                  text-xs
                  leading-5
                  text-red-300
                "
              >
                Cette action est définitive.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() =>
                    setShowDeleteModal(false)
                  }
                  className="
                    min-h-[50px]
                    rounded-2xl
                    border
                    border-white/10
                    bg-white/5
                    px-4
                    py-3
                    text-sm
                    font-black
                    text-slate-300
                    transition
                    hover:bg-white/10
                    disabled:opacity-50
                  "
                >
                  Annuler
                </button>

                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="
                    flex
                    min-h-[50px]
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-red-600
                    px-4
                    py-3
                    text-sm
                    font-black
                    text-white
                    transition
                    hover:bg-red-500
                    active:scale-[0.98]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {deleting ? (
                    <>
                      <RefreshCcw
                        size={17}
                        className="animate-spin"
                      />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 size={17} />
                      Supprimer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ======================================================
// CARTE PRODUIT
// ======================================================

function ProductCard({
  product,
  danger = false,
  onDelete,
  onRestock,
}: {
  product: Product;
  danger?: boolean;
  onDelete: (product: Product) => void;
  onRestock: () => void;
}) {
  return (
    <article
      className="
        overflow-hidden
        rounded-3xl
        border
        border-white/10
        bg-white/[0.04]
        p-4
        shadow-xl
        backdrop-blur-xl
        sm:p-5
      "
    >
      {/* ==================================================
          INFOS
      ================================================== */}

      <div
        className="
          flex
          min-w-0
          items-start
          justify-between
          gap-3
        "
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-orange-500/10
              "
            >
              <Package
                size={19}
                className="text-orange-400"
              />
            </div>

            <div className="min-w-0">
              <h3
                className="
                  break-words
                  text-base
                  font-black
                  text-white
                  sm:text-lg
                "
              >
                {product.name}
              </h3>

              <p
                className="
                  mt-1
                  break-words
                  text-xs
                  text-slate-500
                "
              >
                Stock actuel :
                <span
                  className={`
                    ml-1
                    font-black
                    ${
                      danger
                        ? "text-red-400"
                        : "text-orange-300"
                    }
                  `}
                >
                  {product.stock}{" "}
                  {product.unit}
                </span>
              </p>
            </div>
          </div>
        </div>

        <span
          className={`
            shrink-0
            rounded-full
            px-2.5
            py-1
            text-[10px]
            font-black
            ${
              danger
                ? "bg-red-500/15 text-red-300"
                : "bg-orange-500/15 text-orange-300"
            }
          `}
        >
          {danger
            ? "RUPTURE"
            : "FAIBLE"}
        </span>
      </div>

      {/* ==================================================
          ACTIONS
      ================================================== */}

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() =>
            onDelete(product)
          }
          className="
            flex
            min-h-[48px]
            min-w-0
            items-center
            justify-center
            gap-2
            rounded-2xl
            bg-red-600
            px-3
            py-3
            text-xs
            font-black
            text-white
            transition
            hover:bg-red-500
            active:scale-[0.98]
            sm:text-sm
          "
        >
          <Trash2 size={16} />
          Supprimer
        </button>

        <button
          type="button"
          onClick={onRestock}
          className="
            flex
            min-h-[48px]
            min-w-0
            items-center
            justify-center
            gap-2
            rounded-2xl
            border
            border-green-400/20
            bg-green-500/10
            px-3
            py-3
            text-xs
            font-black
            text-green-300
            transition
            hover:bg-green-500/20
            active:scale-[0.98]
            sm:text-sm
          "
        >
          <span className="truncate">
            Réapprovisionner
          </span>

          <ArrowRight
            size={16}
            className="shrink-0"
          />
        </button>
      </div>
    </article>
  );
}