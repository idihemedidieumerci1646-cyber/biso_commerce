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
  WifiOff,
  RotateCcw,
  AlertCircle,
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

  // CONNEXION
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflinePopup, setShowOfflinePopup] = useState(false);

  // ERREUR
  const [errorMessage, setErrorMessage] = useState("");

  // ACTION EN COURS
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

  /*
  ==========================================
  UTILITAIRE CONNEXION
  ==========================================
  */

  const requireConnection = () => {
    if (
      typeof navigator !== "undefined" &&
      !navigator.onLine
    ) {
      setIsOnline(false);
      setShowOfflinePopup(true);
      return false;
    }

    return true;
  };

  /*
  ==========================================
  FERMER ERREUR
  ==========================================
  */

  const closeError = () => {
    setErrorMessage("");
  };

  /*
  ==========================================
  RECUPERATION PRODUITS
  ==========================================
  */

  const fetchProducts = async () => {
    try {
      if (
        typeof navigator !== "undefined" &&
        !navigator.onLine
      ) {
        setIsOnline(false);
        setLoading(false);
        setShowOfflinePopup(true);
        return;
      }

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
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setProducts(data || []);
      }
    } catch (err) {
      console.log(err);

      if (
        typeof navigator !== "undefined" &&
        !navigator.onLine
      ) {
        setIsOnline(false);
        setShowOfflinePopup(true);
      } else {
        setErrorMessage(
          "Impossible de charger les produits."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /*
  ==========================================
  ACTUALISER
  ==========================================
  */

  const refreshProducts = async () => {
    if (!requireConnection()) return;

    if (refreshing) return;

    setRefreshing(true);

    try {
      await fetchProducts();
    } finally {
      setRefreshing(false);
    }
  };

  /*
  ==========================================
  SUPPRIMER PRODUIT
  ==========================================
  */

  const deleteProduct = async (id: string) => {
    if (!requireConnection()) return;

    if (deletingId) return;

    const ok = confirm(
      "Voulez-vous supprimer ce produit ?"
    );

    if (!ok) return;

    const userId = localStorage.getItem("user_id");

    if (!userId) return;

    setDeletingId(id);

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        setErrorMessage(error.message);
      } else {
        await fetchProducts();
      }
    } catch (err) {
      console.log(err);

      if (
        typeof navigator !== "undefined" &&
        !navigator.onLine
      ) {
        setIsOnline(false);
        setShowOfflinePopup(true);
      } else {
        setErrorMessage(
          "Impossible de supprimer ce produit."
        );
      }
    } finally {
      setDeletingId(null);
    }
  };

  /*
  ==========================================
  DETECTION CONNEXION
  ==========================================
  */

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setShowOfflinePopup(false);

      // Recharge automatiquement les produits
      await fetchProducts();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflinePopup(true);
    };

    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }

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

  /*
  ==========================================
  CHARGEMENT INITIAL
  ==========================================
  */

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
        (p) => Number(p.stock) <= 0
      ).length;

    const faible =
      products.filter(
        (p) =>
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

  /*
  ==========================================
  RENDU
  ==========================================
  */

  return (
    <main
      className="
        relative
        min-h-screen
        overflow-x-hidden
        bg-[#050b16]
        pb-24
        text-white
      "
    >
      {/* =========================================
          LUMIERE ARRIERE
      ========================================= */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.20),transparent_35%)]
        "
      />

      {/* =========================================
          POPUP HORS CONNEXION
      ========================================= */}

      {showOfflinePopup && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/75
            px-4
            backdrop-blur-md
          "
        >
          <div
            className="
              relative
              w-full
              max-w-sm
              overflow-hidden
              rounded-[2rem]
              border
              border-white/10
              bg-[#0b1424]
              p-6
              shadow-[0_30px_100px_-20px_rgba(0,0,0,0.95)]
            "
          >
            {/* FERMER */}

            <button
              type="button"
              onClick={() =>
                setShowOfflinePopup(false)
              }
              aria-label="Fermer"
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
                active:scale-95
              "
            >
              <X size={17} />
            </button>

            {/* ICON */}

            <div className="flex justify-center pt-2">
              <div
                className="
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  bg-orange-500/15
                  ring-1
                  ring-orange-400/20
                "
              >
                <WifiOff
                  size={30}
                  className="text-orange-400"
                />
              </div>
            </div>

            {/* TEXTE */}

            <div className="mt-5 text-center">
              <h2
                className="
                  text-xl
                  font-black
                  tracking-tight
                "
              >
                Connexion requise
              </h2>

              <p
                className="
                  mt-3
                  text-sm
                  leading-6
                  text-slate-300
                "
              >
                Cher client, cette requête
                nécessite une connexion Internet.
              </p>

              <p
                className="
                  mt-2
                  text-xs
                  leading-5
                  text-slate-500
                "
              >
                Vérifiez votre connexion puis
                réessayez.
              </p>
            </div>

            {/* BOUTONS */}

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={async () => {
                  if (
                    typeof navigator !==
                      "undefined" &&
                    navigator.onLine
                  ) {
                    setIsOnline(true);
                    setShowOfflinePopup(false);
                    await fetchProducts();
                  }
                }}
                className="
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
                  text-sm
                  font-black
                  text-black
                  shadow-lg
                  shadow-orange-500/10
                  transition
                  hover:brightness-105
                  active:scale-[0.98]
                "
              >
                <RotateCcw size={17} />
                Réessayer
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowOfflinePopup(false)
                }
                className="
                  flex
                  min-h-[50px]
                  w-full
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-white/10
                  bg-white/5
                  px-4
                  text-sm
                  font-bold
                  text-slate-300
                  transition
                  hover:bg-white/10
                  active:scale-[0.98]
                "
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          POPUP ERREUR
      ========================================= */}

      {errorMessage && (
        <div
          className="
            fixed
            inset-0
            z-[110]
            flex
            items-center
            justify-center
            bg-black/70
            px-4
            backdrop-blur-md
          "
        >
          <div
            className="
              relative
              w-full
              max-w-sm
              rounded-[2rem]
              border
              border-red-400/20
              bg-[#0b1424]
              p-6
              shadow-[0_30px_100px_-20px_rgba(0,0,0,0.95)]
            "
          >
            <button
              type="button"
              onClick={closeError}
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
              "
            >
              <X size={17} />
            </button>

            <div className="flex justify-center pt-2">
              <div
                className="
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-2xl
                  bg-red-500/15
                  ring-1
                  ring-red-400/20
                "
              >
                <AlertCircle
                  size={27}
                  className="text-red-400"
                />
              </div>
            </div>

            <div className="mt-5 text-center">
              <h2 className="text-lg font-black">
                Une erreur est survenue
              </h2>

              <p
                className="
                  mt-3
                  break-words
                  text-sm
                  leading-6
                  text-slate-400
                "
              >
                {errorMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={closeError}
              className="
                mt-6
                flex
                min-h-[48px]
                w-full
                items-center
                justify-center
                rounded-2xl
                bg-white/10
                text-sm
                font-bold
                text-white
                transition
                hover:bg-white/15
                active:scale-[0.98]
              "
            >
              Compris
            </button>
          </div>
        </div>
      )}

      <div
        className="
          relative
          z-10
          mx-auto
          w-full
          max-w-xl
          px-3
          py-4
          min-[390px]:px-4
          sm:px-5
        "
      >
        {/* =========================================
            HEADER
        ========================================= */}

        <div
          className="
            mb-6
            flex
            items-center
            justify-between
            gap-3
            sm:mb-7
          "
        >
          <div className="min-w-0 flex-1">
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <span
                className="
                  flex
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-gradient-to-br
                  from-orange-500
                  to-yellow-400
                  p-2
                  shadow-lg
                  shadow-orange-500/10
                "
              >
                <Package
                  className="text-black"
                  size={21}
                />
              </span>

              <h1
                className="
                  truncate
                  text-2xl
                  font-black
                  tracking-tight
                  min-[390px]:text-3xl
                "
              >
                Produits
              </h1>
            </div>

            <p
              className="
                mt-2
                max-w-[280px]
                text-[11px]
                leading-5
                text-slate-400
                min-[390px]:text-xs
              "
            >
              Gérez votre stock avec
              BISO-COMMERCE
            </p>
          </div>

          <button
            type="button"
            onClick={refreshProducts}
            disabled={refreshing}
            aria-label="Actualiser"
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-2xl
              border
              border-white/10
              bg-white/5
              transition
              hover:bg-white/10
              active:scale-95
              disabled:cursor-not-allowed
              disabled:opacity-60
              min-[390px]:h-12
              min-[390px]:w-12
            "
          >
            <RefreshCcw
              size={19}
              className={
                refreshing
                  ? "animate-spin text-orange-400"
                  : "text-slate-400"
              }
            />
          </button>
        </div>

        {/* =========================================
            INDICATEUR HORS CONNEXION
        ========================================= */}

        {!isOnline && (
          <button
            type="button"
            onClick={() =>
              setShowOfflinePopup(true)
            }
            className="
              mb-5
              flex
              w-full
              items-center
              gap-3
              rounded-2xl
              border
              border-orange-400/20
              bg-orange-500/10
              px-4
              py-3
              text-left
              transition
              active:scale-[0.99]
            "
          >
            <WifiOff
              size={18}
              className="shrink-0 text-orange-400"
            />

            <span className="min-w-0 flex-1">
              <span
                className="
                  block
                  text-xs
                  font-black
                  text-orange-300
                "
              >
                Hors connexion
              </span>

              <span
                className="
                  mt-0.5
                  block
                  text-[11px]
                  text-slate-400
                "
              >
                Internet requis pour cette page
              </span>
            </span>
          </button>
        )}

        {/* =========================================
            GUIDE
        ========================================= */}

        <div
          className="
            mb-6
            rounded-[1.7rem]
            border
            border-orange-500/20
            bg-orange-500/5
            p-4
            shadow-lg
            shadow-black/10
            sm:rounded-3xl
            sm:p-5
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
            <div className="min-w-0 flex-1">
              <div
                className="
                  mb-2
                  flex
                  items-center
                  gap-2
                "
              >
                <Info
                  size={19}
                  className="shrink-0 text-orange-400"
                />

                <h2
                  className="
                    text-base
                    font-black
                    min-[390px]:text-lg
                  "
                >
                  Guide
                </h2>
              </div>

              <p
                className="
                  text-xs
                  leading-5
                  text-slate-400
                  sm:text-sm
                  sm:leading-6
                "
              >
                Découvrez comment ajouter,
                comprendre et gérer vos produits.
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
                px-3
                py-2
                text-[11px]
                font-black
                text-black
                transition
                active:scale-95
                min-[390px]:px-4
                min-[390px]:text-xs
              "
            >
              {showGuide
                ? "Fermer"
                : "Guide"}
            </button>
          </div>

          {showGuide && (
            <div
              className="
                mt-5
                space-y-4
                sm:mt-6
                sm:space-y-5
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
                    size={18}
                    className="text-orange-400"
                  />

                  <h3 className="text-sm font-black sm:text-base">
                    👋 Bienvenue
                  </h3>
                </div>

                <p
                  className="
                    text-xs
                    leading-6
                    text-slate-400
                    sm:text-sm
                    sm:leading-7
                  "
                >
                  Cette page contient tous les
                  produits enregistrés dans votre
                  commerce.

                  <br />
                  <br />

                  Vous pouvez voir le stock, les prix
                  d'achat et de vente ainsi que la
                  monnaie.

                  <br />
                  <br />

                  Vous pouvez aussi modifier ou
                  supprimer un produit.
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
                    text-sm
                    font-black
                    sm:text-base
                  "
                >
                  1️⃣ Ajouter un produit
                </h3>

                <p
                  className="
                    text-xs
                    leading-6
                    text-slate-400
                    sm:text-sm
                    sm:leading-7
                  "
                >
                  Appuyez sur le bouton{" "}
                  <strong className="text-orange-300">
                    +
                  </strong>{" "}
                  à côté de la recherche.

                  <br />
                  <br />

                  Renseignez le nom, la quantité, le
                  prix d'achat, le prix de vente et
                  la monnaie.
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
                    text-sm
                    font-black
                    sm:text-base
                  "
                >
                  2️⃣ Comprendre le stock
                </h3>

                <p
                  className="
                    text-xs
                    leading-6
                    text-slate-400
                    sm:text-sm
                    sm:leading-7
                  "
                >
                  🟢{" "}
                  <strong className="text-green-300">
                    Disponible
                  </strong>{" "}
                  : produit disponible.

                  <br />

                  🟠{" "}
                  <strong className="text-orange-300">
                    Faible
                  </strong>{" "}
                  : 5 unités ou moins.

                  <br />

                  🔴{" "}
                  <strong className="text-red-300">
                    Rupture
                  </strong>{" "}
                  : stock à zéro.
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
                    text-sm
                    font-black
                    sm:text-base
                  "
                >
                  3️⃣ FC et Dollar
                </h3>

                <p
                  className="
                    text-xs
                    leading-6
                    text-slate-400
                    sm:text-sm
                    sm:leading-7
                  "
                >
                  BISO-COMMERCE garde les monnaies
                  séparées.

                  <br />
                  <br />

                  🇨🇩{" "}
                  <strong className="text-white">
                    FC
                  </strong>{" "}
                  reste en FC.

                  <br />

                  🇺🇸{" "}
                  <strong className="text-white">
                    $
                  </strong>{" "}
                  reste en dollars.

                  <br />
                  <br />

                  Les valeurs sont calculées
                  séparément.
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
                    text-sm
                    font-black
                    sm:text-base
                  "
                >
                  4️⃣ Modifier
                </h3>

                <p
                  className="
                    text-xs
                    leading-6
                    text-slate-400
                    sm:text-sm
                    sm:leading-7
                  "
                >
                  Appuyez sur{" "}
                  <strong className="text-blue-300">
                    Modifier
                  </strong>{" "}
                  pour corriger un produit ou changer
                  son prix.
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
                    text-sm
                    font-black
                    sm:text-base
                  "
                >
                  5️⃣ Supprimer
                </h3>

                <p
                  className="
                    text-xs
                    leading-6
                    text-slate-400
                    sm:text-sm
                    sm:leading-7
                  "
                >
                  Appuyez sur{" "}
                  <strong className="text-red-300">
                    Supprimer
                  </strong>
                  . Une confirmation sera demandée.
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
                    text-sm
                    font-black
                    sm:text-base
                  "
                >
                  6️⃣ Valeur du stock
                </h3>

                <p
                  className="
                    text-xs
                    leading-6
                    text-slate-400
                    sm:text-sm
                    sm:leading-7
                  "
                >
                  La valeur du stock correspond à la
                  valeur d'achat des produits encore
                  disponibles.

                  <br />
                  <br />

                  Exemple :

                  <br />

                  100 produits × 1 000 FC ={" "}
                  <strong className="text-white">
                    100 000 FC
                  </strong>

                  <br />
                  <br />

                  Les produits en dollars sont calculés
                  séparément.
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
                    text-sm
                    font-black
                    sm:text-base
                  "
                >
                  7️⃣ Bénéfice potentiel
                </h3>

                <p
                  className="
                    text-xs
                    leading-6
                    text-slate-400
                    sm:text-sm
                    sm:leading-7
                  "
                >
                  Le bénéfice est calculé avec la
                  différence entre le prix de vente et
                  le prix d'achat.

                  <br />
                  <br />

                  Le FC reste en FC et le dollar reste
                  en dollars.
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
                  min-h-[48px]
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-orange-500
                  p-4
                  text-sm
                  font-black
                  text-black
                  transition
                  hover:scale-[1.01]
                  active:scale-[0.98]
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
            gap-2.5
            sm:gap-3
          "
        >
          {/* TOTAL */}

          <div
            className="
              min-w-0
              rounded-[1.5rem]
              border
              border-white/10
              bg-white/[0.05]
              p-3.5
              backdrop-blur-xl
              sm:rounded-3xl
              sm:p-4
            "
          >
            <Package
              size={20}
              className="mb-2 text-orange-400"
            />

            <p className="truncate text-[11px] text-slate-400 sm:text-xs">
              Produits
            </p>

            <p className="mt-1 text-2xl font-black sm:text-3xl">
              {stats.total}
            </p>
          </div>

          {/* RUPTURE */}

          <div
            className="
              min-w-0
              rounded-[1.5rem]
              border
              border-red-400/20
              bg-red-500/10
              p-3.5
              sm:rounded-3xl
              sm:p-4
            "
          >
            <AlertTriangle
              size={20}
              className="mb-2 text-red-400"
            />

            <p className="truncate text-[11px] text-slate-400 sm:text-xs">
              Rupture
            </p>

            <p
              className="
                mt-1
                text-2xl
                font-black
                text-red-400
                sm:text-3xl
              "
            >
              {stats.rupture}
            </p>
          </div>

          {/* FAIBLE */}

          <div
            className="
              min-w-0
              rounded-[1.5rem]
              border
              border-orange-400/20
              bg-orange-500/10
              p-3.5
              sm:rounded-3xl
              sm:p-4
            "
          >
            <Boxes
              size={20}
              className="mb-2 text-orange-300"
            />

            <p className="truncate text-[11px] text-slate-400 sm:text-xs">
              Stock faible
            </p>

            <p
              className="
                mt-1
                text-2xl
                font-black
                text-orange-300
                sm:text-3xl
              "
            >
              {stats.faible}
            </p>
          </div>

          {/* VALEUR STOCK */}

          <div
            className="
              min-w-0
              rounded-[1.5rem]
              border
              border-green-400/20
              bg-green-500/10
              p-3.5
              sm:rounded-3xl
              sm:p-4
            "
          >
            <CircleDollarSign
              size={20}
              className="mb-2 text-green-400"
            />

            <p className="truncate text-[11px] text-slate-400 sm:text-xs">
              Valeur stock
            </p>

            <div className="mt-2 space-y-2">
              <div className="min-w-0">
                <p
                  className="
                    truncate
                    text-[9px]
                    uppercase
                    tracking-wide
                    text-slate-400
                    sm:text-[10px]
                  "
                >
                  FC
                </p>

                <p
                  className="
                    truncate
                    text-xs
                    font-black
                    text-green-300
                    sm:text-sm
                  "
                >
                  {stats.valeurFC.toLocaleString()} FC
                </p>
              </div>

              <div className="min-w-0">
                <p
                  className="
                    truncate
                    text-[9px]
                    uppercase
                    tracking-wide
                    text-slate-400
                    sm:text-[10px]
                  "
                >
                  Dollar
                </p>

                <p
                  className="
                    truncate
                    text-xs
                    font-black
                    text-green-300
                    sm:text-sm
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
            mb-5
            rounded-[1.7rem]
            border
            border-purple-400/20
            bg-purple-500/10
            p-4
            sm:mb-6
            sm:rounded-3xl
            sm:p-5
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
              className="shrink-0 text-purple-300"
              size={21}
            />

            <p
              className="
                text-sm
                font-black
                sm:text-base
              "
            >
              Bénéfice potentiel
            </p>
          </div>

          <div
            className="
              grid
              grid-cols-2
              gap-2.5
              sm:gap-3
            "
          >
            <div
              className="
                min-w-0
                rounded-2xl
                bg-black/20
                p-3.5
                sm:p-4
              "
            >
              <p className="text-[10px] text-slate-400 sm:text-xs">
                Bénéfice FC
              </p>

              <p
                className="
                  mt-2
                  truncate
                  text-sm
                  font-black
                  text-white
                  sm:text-base
                "
              >
                {stats.beneficeFC.toLocaleString()} FC
              </p>
            </div>

            <div
              className="
                min-w-0
                rounded-2xl
                bg-black/20
                p-3.5
                sm:p-4
              "
            >
              <p className="text-[10px] text-slate-400 sm:text-xs">
                Bénéfice $
              </p>

              <p
                className="
                  mt-2
                  truncate
                  text-sm
                  font-black
                  text-white
                  sm:text-base
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
            mb-5
            flex
            gap-2.5
            sm:mb-6
            sm:gap-3
          "
        >
          <div
            className="
              flex
              min-w-0
              flex-1
              items-center
              gap-2
              rounded-2xl
              border
              border-white/10
              bg-white/[0.06]
              px-3.5
              transition
              focus-within:border-orange-400/40
              focus-within:bg-white/[0.08]
              sm:px-4
            "
          >
            <Search
              size={18}
              className="shrink-0 text-slate-400"
            />

            <input
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              placeholder="Rechercher..."
              className="
                min-w-0
                w-full
                bg-transparent
                py-3.5
                text-sm
                text-white
                outline-none
                placeholder:text-slate-500
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
            aria-label="Ajouter un produit"
            onClick={(e) => {
              if (!requireConnection()) {
                e.preventDefault();
              }
            }}
            className="
              flex
              h-[50px]
              w-[50px]
              shrink-0
              items-center
              justify-center
              rounded-2xl
              bg-gradient-to-r
              from-orange-500
              to-yellow-400
              text-black
              shadow-lg
              shadow-orange-500/10
              transition
              hover:scale-[1.02]
              active:scale-95
              sm:h-[52px]
              sm:w-[52px]
            "
          >
            <Plus size={23} />
          </Link>
        </div>

        {/* =========================================
            LISTE PRODUITS
        ========================================= */}

        <div className="space-y-3.5 sm:space-y-4">
          {loading ? (
            <div
              className="
                flex
                flex-col
                items-center
                justify-center
                rounded-3xl
                border
                border-white/10
                bg-white/[0.04]
                px-5
                py-12
                text-center
                text-slate-400
              "
            >
              <RefreshCcw
                className="mb-3 animate-spin text-orange-400"
                size={25}
              />

              <span className="text-sm">
                Chargement...
              </span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div
              className="
                rounded-[1.7rem]
                border
                border-white/10
                bg-white/[0.05]
                p-7
                text-center
                backdrop-blur-xl
                sm:rounded-3xl
                sm:p-8
              "
            >
              <Sparkles
                className="
                  mx-auto
                  mb-3
                  text-orange-400
                "
                size={33}
              />

              <p
                className="
                  text-sm
                  font-bold
                  text-slate-200
                  sm:text-base
                "
              >
                Aucun produit
              </p>

              <p
                className="
                  mt-2
                  text-xs
                  leading-5
                  text-slate-400
                  sm:text-sm
                "
              >
                Ajoutez un produit ou modifiez la
                recherche.
              </p>
            </div>
          ) : (
            filteredProducts.map((p) => (
              <div
                key={p.id}
                className="
                  overflow-hidden
                  rounded-[1.7rem]
                  border
                  border-white/10
                  bg-white/[0.05]
                  p-4
                  backdrop-blur-xl
                  shadow-[0_20px_50px_-25px_rgba(0,0,0,0.8)]
                  transition
                  hover:-translate-y-1
                  hover:border-orange-400/30
                  sm:rounded-[1.8rem]
                  sm:p-5
                "
              >
                {/* =====================================
                    PRODUIT
                ===================================== */}

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
                    <h2
                      className="
                        truncate
                        text-base
                        font-black
                        text-white
                        sm:text-lg
                      "
                    >
                      {p.name || "Produit sans nom"}
                    </h2>

                    <p
                      className="
                        mt-2
                        text-[11px]
                        text-slate-400
                        sm:text-xs
                      "
                    >
                      Stock :{" "}
                      <span className="font-bold text-white">
                        {p.stock} {p.unit || "unité"}
                      </span>
                    </p>

                    {/* PRIX COTE A COTE */}

                    <div
                      className="
                        mt-2
                        flex
                        min-w-0
                        flex-wrap
                        items-center
                        gap-x-2
                        gap-y-1
                        text-[10px]
                        text-slate-400
                        sm:text-xs
                      "
                    >
                      <span className="whitespace-nowrap">
                        Achat :{" "}
                        <strong className="text-slate-200">
                          {Number(
                            p.purchase_price || 0
                          ).toLocaleString()}{" "}
                          {p.currency}
                        </strong>
                      </span>

                      <span className="text-slate-600">
                        •
                      </span>

                      <span className="whitespace-nowrap">
                        Vente :{" "}
                        <strong className="text-green-300">
                          {Number(
                            p.selling_price || 0
                          ).toLocaleString()}{" "}
                          {p.currency}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* =====================================
                      STATUT
                  ===================================== */}

                  {Number(p.stock) === 0 ? (
                    <span
                      className="
                        flex
                        shrink-0
                        items-center
                        gap-1
                        rounded-full
                        bg-red-500/20
                        px-2.5
                        py-1.5
                        text-[10px]
                        font-black
                        text-red-300
                        sm:px-3
                        sm:text-xs
                      "
                    >
                      <AlertTriangle size={12} />

                      <span className="hidden min-[370px]:inline">
                        Rupture
                      </span>

                      <span className="min-[370px]:hidden">
                        0
                      </span>
                    </span>
                  ) : Number(p.stock) <= 5 ? (
                    <span
                      className="
                        flex
                        shrink-0
                        items-center
                        gap-1
                        rounded-full
                        bg-orange-500/20
                        px-2.5
                        py-1.5
                        text-[10px]
                        font-black
                        text-orange-300
                        sm:px-3
                        sm:text-xs
                      "
                    >
                      <AlertTriangle size={12} />

                      <span className="hidden min-[370px]:inline">
                        Faible
                      </span>

                      <span className="min-[370px]:hidden">
                        !
                      </span>
                    </span>
                  ) : (
                    <span
                      className="
                        flex
                        shrink-0
                        items-center
                        gap-1
                        rounded-full
                        bg-green-500/20
                        px-2.5
                        py-1.5
                        text-[10px]
                        font-black
                        text-green-300
                        sm:px-3
                        sm:text-xs
                      "
                    >
                      <CheckCircle size={12} />

                      <span className="hidden min-[370px]:inline">
                        Disponible
                      </span>

                      <span className="min-[370px]:hidden">
                        OK
                      </span>
                    </span>
                  )}
                </div>

                {/* =====================================
                    ACTIONS
                ===================================== */}

                <div
                  className="
                    mt-4
                    grid
                    grid-cols-2
                    gap-2.5
                    sm:mt-5
                    sm:gap-3
                  "
                >
                  <Link
                    href={`/products/edit/${p.id}`}
                    onClick={(e) => {
                      if (!requireConnection()) {
                        e.preventDefault();
                      }
                    }}
                    className="
                      flex
                      min-h-[48px]
                      items-center
                      justify-center
                      gap-1.5
                      rounded-2xl
                      bg-blue-500/20
                      px-2
                      py-3
                      text-xs
                      font-bold
                      text-blue-300
                      transition
                      hover:bg-blue-500/30
                      active:scale-[0.98]
                      sm:gap-2
                      sm:text-sm
                    "
                  >
                    <Edit size={15} />

                    <span>
                      Modifier
                    </span>
                  </Link>

                  <button
                    type="button"
                    disabled={
                      deletingId === p.id ||
                      deletingId !== null
                    }
                    onClick={() =>
                      deleteProduct(p.id)
                    }
                    className="
                      flex
                      min-h-[48px]
                      items-center
                      justify-center
                      gap-1.5
                      rounded-2xl
                      bg-red-500/20
                      px-2
                      py-3
                      text-xs
                      font-bold
                      text-red-300
                      transition
                      hover:bg-red-500/30
                      active:scale-[0.98]
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                      sm:gap-2
                      sm:text-sm
                    "
                  >
                    {deletingId === p.id ? (
                      <>
                        <RefreshCcw
                          size={15}
                          className="animate-spin"
                        />

                        <span>
                          Suppression...
                        </span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={15} />

                        <span>
                          Supprimer
                        </span>
                      </>
                    )}
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