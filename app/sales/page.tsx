"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  Search,
  ShoppingCart,
  Package,
  Sparkles,
  CheckCircle,
  Plus,
  Minus,
  AlertTriangle,
  Wifi,
  WifiOff,
  X,
  Info,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  stock: number;
  initial_stock: number;
  purchase_price: number;
  selling_price: number;
  currency: string;
  pieces_per_unit?: number;
  unit?: string;
};

const REAL_CONNECTIVITY_TIMEOUT = 1500;

async function checkRealInternetConnection(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  const controller = new AbortController();

  const timeout = window.setTimeout(() => {
    controller.abort();
  }, REAL_CONNECTIVITY_TIMEOUT);

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?select=id&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        cache: "no-store",
        signal: controller.signal,
      }
    );

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Connexion
  const [isOnline, setIsOnline] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] =
    useState(true);

  const [showConnectionPopup, setShowConnectionPopup] =
    useState(false);

  // Stock faible
  const [lowStockMessage, setLowStockMessage] = useState("");

  // ==========================================================
  // DÉTECTION CONNEXION RÉELLE
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const verifyConnection = async (
      initialCheck = false
    ) => {
      if (initialCheck) {
        setIsCheckingConnection(true);
      }

      const connected =
        await checkRealInternetConnection();

      if (!cancelled) {
        setIsOnline(connected);

        if (initialCheck) {
          setIsCheckingConnection(false);
        }
      }
    };

    // Vérification réelle au chargement
    verifyConnection(true);

    // Les événements du navigateur servent uniquement
    // à déclencher une nouvelle vérification réelle.
    const handleOnline = () => {
      verifyConnection();
    };

    const handleOffline = () => {
      verifyConnection();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Vérification périodique de la vraie connexion
    const interval = window.setInterval(() => {
      verifyConnection();
    }, 5000);

    return () => {
      cancelled = true;

      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );

      window.clearInterval(interval);
    };
  }, []);

  // ==========================================================
  // CHARGER LES PRODUITS
  // ==========================================================

  useEffect(() => {
    loadProducts();

    const handleOnline = async () => {
      const connected =
        await checkRealInternetConnection();

      setIsOnline(connected);

      if (connected) {
        loadProducts();
      }
    };

    const handleOffline = async () => {
      const connected =
        await checkRealInternetConnection();

      setIsOnline(connected);

      if (!connected) {
        setProducts([]);
      }
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

  // ==========================================================
  // CHARGEMENT PRODUITS DEPUIS SUPABASE
  // ==========================================================

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);

      const userId = localStorage.getItem("user_id");

      if (!userId) {
        setProducts([]);
        return;
      }

      // Vérification réelle d'Internet
      const connected =
        await checkRealInternetConnection();

      setIsOnline(connected);

      if (!connected) {
        setProducts([]);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });

      if (error) {
        console.error(
          "Erreur chargement produits :",
          error
        );

        setProducts([]);
        return;
      }

      if (data) {
        setProducts(data as Product[]);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error(
        "Erreur chargement produits :",
        error
      );

      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // ==========================================================
  // PRODUITS QUI ONT RÉELLEMENT DU STOCK
  // ==========================================================

  const productsInStock = useMemo(() => {
    return products.filter((product) => {
      const stock = Number(product.stock);

      return (
        Number.isFinite(stock) &&
        stock > 0
      );
    });
  }, [products]);

  // ==========================================================
  // PRODUIT SÉLECTIONNÉ
  // ==========================================================

  const selectedProduct = products.find(
    (product) => product.id === productId
  );

  // ==========================================================
  // RECHERCHE
  // IMPORTANT :
  // ON CHERCHE UNIQUEMENT PARMI LES PRODUITS EN STOCK
  // ==========================================================

  const filteredProducts = useMemo(() => {
    const term = searchTerm
      .trim()
      .toLowerCase();

    if (!term) {
      return [];
    }

    return productsInStock.filter((product) =>
      product.name
        .toLowerCase()
        .includes(term)
    );
  }, [productsInStock, searchTerm]);

  // ==========================================================
  // QUANTITÉ
  // ==========================================================

  const increaseQty = () => {
    if (!selectedProduct) {
      const current = Number(quantity || 0);

      if (current < 999999) {
        setQuantity(String(current + 1));
      }

      return;
    }

    const current = Number(quantity || 0);
    const stock = Number(selectedProduct.stock);

    if (current < stock) {
      setQuantity(String(current + 1));
    }
  };

  const decreaseQty = () => {
    const value = Number(quantity || 0);

    if (value > 1) {
      setQuantity(String(value - 1));
    }
  };

  // ==========================================================
  // QUANTITÉ NUMÉRIQUE
  // ==========================================================

  const quantityNumber = Number(quantity || 0);

  // ==========================================================
  // CALCULS DE LA VENTE
  // ==========================================================

  const totalPreview = selectedProduct
    ? Number(selectedProduct.selling_price) *
      quantityNumber
    : 0;

  const purchaseTotalPreview = selectedProduct
    ? Number(selectedProduct.purchase_price) *
      quantityNumber
    : 0;

  const profitPreview =
    totalPreview - purchaseTotalPreview;

  const stockAfterSale = selectedProduct
    ? Number(selectedProduct.stock) -
      quantityNumber
    : 0;

  // ==========================================================
  // VALIDATION GLOBALE
  // ==========================================================

  const saleBlocked =
    loading ||
    isCheckingConnection ||
    !isOnline ||
    !selectedProduct ||
    !quantity ||
    quantityNumber <= 0 ||
    !Number.isInteger(quantityNumber) ||
    (!!selectedProduct &&
      quantityNumber >
        Number(selectedProduct.stock));

  // ==========================================================
  // CONNEXION OBLIGATOIRE
  // ==========================================================

  const requireConnection = async () => {
    const connected =
      await checkRealInternetConnection();

    setIsOnline(connected);

    if (!connected) {
      setShowConnectionPopup(true);
      return false;
    }

    return true;
  };

  // ==========================================================
  // SÉLECTION PRODUIT
  // ==========================================================

  const selectProduct = (product: Product) => {
    if (Number(product.stock) <= 0) {
      return;
    }

    setProductId(product.id);
    setSearchTerm(product.name);
    setQuantity("");
    setLowStockMessage("");
  };

  // ==========================================================
  // NETTOYER PRODUIT
  // ==========================================================

  const clearSelectedProduct = () => {
    setProductId("");
    setSearchTerm("");
    setQuantity("");
    setLowStockMessage("");
  };

  // ==========================================================
  // ENREGISTRER LA VENTE
  // ==========================================================

  const saveSale = async () => {
    if (loading) {
      return;
    }

    // ========================================================
    // INTERNET OBLIGATOIRE
    // ========================================================

    if (!(await requireConnection())) {
      return;
    }

    // ========================================================
    // PRODUIT OBLIGATOIRE
    // ========================================================

    if (!selectedProduct) {
      alert(
        "Sélectionnez un produit disponible en stock avant de continuer."
      );

      return;
    }

    // ========================================================
    // QUANTITÉ OBLIGATOIRE
    // ========================================================

    if (!quantity || quantity.trim() === "") {
      alert(
        "Indiquez une quantité avant de continuer."
      );

      return;
    }

    const qty = Number(quantity);

    // ========================================================
    // QUANTITÉ VALIDE
    // ========================================================

    if (!Number.isFinite(qty) || qty <= 0) {
      alert(
        "La quantité doit être un nombre supérieur à zéro."
      );

      return;
    }

    if (!Number.isInteger(qty)) {
      alert(
        "La quantité doit être un nombre entier."
      );

      return;
    }

    // ========================================================
    // STOCK LOCAL
    // ========================================================

    const currentStock = Number(
      selectedProduct.stock
    );

    if (
      !Number.isFinite(currentStock) ||
      currentStock <= 0
    ) {
      alert(
        "Ce produit est épuisé. Sélectionnez un autre produit."
      );

      await loadProducts();

      return;
    }

    if (qty > currentStock) {
      alert(
        `Stock insuffisant !\n\nDisponible : ${currentStock}\nDemandé : ${qty}`
      );

      return;
    }

    // ========================================================
    // UTILISATEUR
    // ========================================================

    const userId =
      localStorage.getItem("user_id");

    if (!userId) {
      alert(
        "Utilisateur non connecté. Veuillez vous reconnecter."
      );

      return;
    }

    setLoading(true);

    try {
      // ======================================================
      // VÉRIFICATION INTERNET AVANT INSERTION
      // ======================================================

      const connectedBeforeSale =
        await checkRealInternetConnection();

      setIsOnline(connectedBeforeSale);

      if (!connectedBeforeSale) {
        setShowConnectionPopup(true);
        setLoading(false);

        return;
      }

      // ======================================================
      // PRIX
      // ======================================================

      const prixVente = Number(
        selectedProduct.selling_price
      );

      const prixAchat = Number(
        selectedProduct.purchase_price
      );

      if (
        !Number.isFinite(prixVente) ||
        prixVente < 0
      ) {
        alert("Prix de vente invalide.");
        setLoading(false);

        return;
      }

      if (
        !Number.isFinite(prixAchat) ||
        prixAchat < 0
      ) {
        alert("Prix d'achat invalide.");
        setLoading(false);

        return;
      }

      // ======================================================
      // CALCULS
      // ======================================================

      const totalSale =
        prixVente * qty;

      const totalPurchase =
        prixAchat * qty;

      const profit =
        totalSale - totalPurchase;

      // ======================================================
      // ID UNIQUE
      // ======================================================

      const saleId =
        crypto.randomUUID();

      // ======================================================
      // DATE
      // ======================================================

      const createdAt =
        new Date().toISOString();

      // ======================================================
      // DONNÉES VENTE
      // ======================================================

      const saleData = {
        id: saleId,
        user_id: userId,
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: qty,
        purchase_price: prixAchat,
        selling_price: prixVente,
        total_sale: totalSale,
        profit: profit,
        currency: selectedProduct.currency,
        created_at: createdAt,
      };

      // ======================================================
      // ENREGISTRER LA VENTE
      // ======================================================

      const {
        error: saleError,
      } = await supabase
        .from("sales")
        .insert(saleData);

      if (saleError) {
        console.error(
          "Erreur vente :",
          saleError
        );

        alert(
          `Impossible d'enregistrer la vente.\n\n${saleError.message}`
        );

        setLoading(false);

        return;
      }

      // ======================================================
      // VÉRIFIER INTERNET APRÈS INSERTION
      // ======================================================

      const connectedAfterSale =
        await checkRealInternetConnection();

      setIsOnline(connectedAfterSale);

      if (!connectedAfterSale) {
        alert(
          "La connexion Internet a été interrompue pendant l'opération. Vérifiez le stock et la vente."
        );

        await loadProducts();

        setLoading(false);

        return;
      }

      // ======================================================
      // NOUVEAU STOCK
      // ======================================================

      const nouveauStock =
        currentStock - qty;

      // ======================================================
      // METTRE À JOUR LE STOCK
      // ======================================================

      const {
        error: updateError,
      } = await supabase
        .from("products")
        .update({
          stock: nouveauStock,
        })
        .eq("id", selectedProduct.id)
        .eq("user_id", userId);

      if (updateError) {
        console.error(
          "Erreur mise à jour stock :",
          updateError
        );

        alert(
          `La vente a été enregistrée, mais le stock n'a pas pu être mis à jour.\n\n${updateError.message}`
        );

        setLoading(false);

        await loadProducts();

        return;
      }

      // ======================================================
      // MISE À JOUR IMMÉDIATE DE L'ÉCRAN
      // ======================================================

      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === selectedProduct.id
            ? {
                ...product,
                stock: nouveauStock,
              }
            : product
        )
      );

      // ======================================================
      // STOCK FAIBLE
      // ======================================================

      if (nouveauStock <= 5) {
        setLowStockMessage(
          `${selectedProduct.name} est presque épuisé. Stock restant : ${nouveauStock}`
        );
      } else {
        setLowStockMessage("");
      }

      // ======================================================
      // NETTOYAGE
      // ======================================================

      setQuantity("");
      setProductId("");
      setSearchTerm("");

      // ======================================================
      // SUCCÈS
      // ======================================================

      setShowSuccess(true);

      // ======================================================
      // RECHARGEMENT SERVEUR
      // ======================================================

      await loadProducts();
    } catch (error) {
      console.error(
        "Erreur pendant l'enregistrement :",
        error
      );

      const connected =
        await checkRealInternetConnection();

      setIsOnline(connected);

      if (!connected) {
        setShowConnectionPopup(true);
      } else {
        alert(
          "Une erreur est survenue pendant l'enregistrement de la vente."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // RENDU
  // ==========================================================

  return (
    <main
      className="
        relative
        min-h-screen
        overflow-x-hidden
        bg-[#081221]
        px-3
        py-4
        pb-28
        text-white
        sm:px-5
        sm:py-6
      "
    >
      <div
        className="
          relative
          z-10
          mx-auto
          w-full
          max-w-xl
        "
      >
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div
          className="
            mb-5
            flex
            items-start
            justify-between
            gap-3
            sm:mb-6
          "
        >
          <div className="min-w-0">
            <h1
              className="
                text-2xl
                font-black
                tracking-tight
                sm:text-3xl
              "
            >
              💰 Caisse
              <span className="text-orange-400">
                {" "}vente
              </span>
            </h1>

            <p
              className="
                mt-1
                text-xs
                leading-5
                text-slate-400
                sm:text-sm
              "
            >
              Enregistrez rapidement vos ventes.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowGuide(!showGuide)
            }
            className="
              flex
              min-h-11
              shrink-0
              items-center
              gap-1.5
              rounded-full
              border
              border-orange-400/30
              bg-orange-500/10
              px-3
              text-xs
              font-bold
              text-orange-300
              transition
              active:scale-95
            "
          >
            <Sparkles size={14} />

            {showGuide
              ? "Fermer"
              : "Guide"}
          </button>
        </div>

        {/* ======================================================
            ÉTAT CONNEXION
        ====================================================== */}

        {!isCheckingConnection &&
          !isOnline && (
            <div
              className="
                mb-5
                flex
                items-start
                gap-3
                rounded-2xl
                border
                border-red-400/30
                bg-red-500/10
                p-4
              "
            >
              <WifiOff
                size={21}
                className="
                  mt-0.5
                  shrink-0
                  text-red-400
                "
              />

              <div className="min-w-0">
                <p className="text-sm font-black text-red-300">
                  Connexion Internet requise
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  La vente est temporairement désactivée.
                  Connectez-vous à Internet pour charger
                  les produits et enregistrer une vente.
                </p>
              </div>
            </div>
          )}

        {/* ======================================================
            GUIDE
        ====================================================== */}

        {showGuide && (
          <div
            className="
              mb-5
              rounded-3xl
              border
              border-orange-400/20
              bg-white/5
              p-4
              shadow-xl
              backdrop-blur-xl
              sm:p-5
            "
          >
            <div className="mb-4 flex items-center gap-2">
              <Sparkles
                size={20}
                className="text-orange-400"
              />

              <h2 className="font-bold text-orange-300">
                Guide rapide
              </h2>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <div
                className="
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/30
                  p-4
                "
              >
                <h3 className="mb-1 font-bold text-white">
                  1️⃣ Sélectionner le produit
                </h3>

                <p className="text-xs leading-5 text-slate-400">
                  Recherchez un produit qui possède
                  encore du stock.
                </p>
              </div>

              <div
                className="
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/30
                  p-4
                "
              >
                <h3 className="mb-1 font-bold text-white">
                  2️⃣ Indiquer la quantité
                </h3>

                <p className="text-xs leading-5 text-slate-400">
                  La quantité ne peut jamais dépasser
                  le stock disponible.
                </p>
              </div>

              <div
                className="
                  rounded-2xl
                  border
                  border-orange-400/20
                  bg-orange-500/10
                  p-4
                "
              >
                <h3 className="mb-1 font-bold text-orange-200">
                  3️⃣ Vérifier le total
                </h3>

                <p className="text-xs leading-5 text-slate-400">
                  Vérifiez le montant du client,
                  le bénéfice et le stock restant.
                </p>
              </div>

              <div
                className="
                  rounded-2xl
                  border
                  border-green-400/20
                  bg-green-500/10
                  p-4
                "
              >
                <h3 className="mb-1 font-bold text-green-300">
                  4️⃣ Valider
                </h3>

                <p className="text-xs leading-5 text-slate-400">
                  La vente est enregistrée et le stock
                  est diminué.
                </p>
              </div>

              <div
                className="
                  rounded-2xl
                  border
                  border-blue-400/20
                  bg-blue-500/10
                  p-4
                "
              >
                <h3 className="mb-1 font-bold text-blue-300">
                  💡 Important
                </h3>

                <p className="text-xs leading-5 text-slate-400">
                  Une connexion Internet est nécessaire
                  pour enregistrer une vente.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowGuide(false)
              }
              className="
                mt-4
                min-h-11
                w-full
                rounded-2xl
                bg-orange-500
                px-4
                py-3
                font-black
                text-black
                transition
                active:scale-[0.98]
              "
            >
              J'ai compris
            </button>
          </div>
        )}

        {/* ======================================================
            AUCUN PRODUIT
        ====================================================== */}

        {!loadingProducts &&
          !isCheckingConnection &&
          isOnline &&
          products.length === 0 && (
            <div
              className="
                mb-5
                rounded-3xl
                border
                border-yellow-400/20
                bg-yellow-500/10
                p-5
              "
            >
              <div className="flex gap-3">
                <Info
                  size={22}
                  className="
                    mt-0.5
                    shrink-0
                    text-yellow-400
                  "
                />

                <div>
                  <p className="font-black text-yellow-300">
                    Aucun produit enregistré
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Vous devez d'abord créer un produit
                    dans votre stock avant de pouvoir
                    effectuer une vente.
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* ======================================================
            PRODUITS EXISTANTS MAIS STOCK VIDE
        ====================================================== */}

        {!loadingProducts &&
          !isCheckingConnection &&
          isOnline &&
          products.length > 0 &&
          productsInStock.length === 0 && (
            <div
              className="
                mb-5
                rounded-3xl
                border
                border-red-400/20
                bg-red-500/10
                p-5
              "
            >
              <div className="flex gap-3">
                <AlertTriangle
                  size={22}
                  className="
                    mt-0.5
                    shrink-0
                    text-red-400
                  "
                />

                <div>
                  <p className="font-black text-red-300">
                    Stock épuisé
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Vos produits sont enregistrés,
                    mais aucun ne possède actuellement
                    de stock disponible pour une vente.
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* ======================================================
            STOCK FAIBLE
        ====================================================== */}

        {lowStockMessage && (
          <div
            className="
              mb-5
              flex
              items-start
              gap-3
              rounded-2xl
              border
              border-orange-400/30
              bg-orange-500/10
              p-4
            "
          >
            <AlertTriangle
              size={20}
              className="
                mt-0.5
                shrink-0
                text-orange-400
              "
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-orange-200">
                Stock faible
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                {lowStockMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setLowStockMessage("")
              }
              className="
                shrink-0
                text-slate-500
              "
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* ======================================================
            CARTE CAISSE
        ====================================================== */}

        <div
          className="
            space-y-5
            rounded-3xl
            border
            border-white/10
            bg-white/5
            p-4
            shadow-2xl
            backdrop-blur-xl
            sm:p-5
          "
        >
          {/* ==================================================
              RECHERCHE PRODUIT
          ================================================== */}

          <div>
            <label
              className="
                mb-2
                block
                text-xs
                font-bold
                text-slate-400
              "
            >
              Produit
            </label>

            <div
              className="
                flex
                min-h-12
                items-center
                gap-3
                rounded-2xl
                border
                border-white/10
                bg-black/30
                px-4
                focus-within:border-orange-400/40
              "
            >
              <Search
                size={18}
                className="
                  shrink-0
                  text-orange-400
                "
              />

              <input
                value={searchTerm}
                disabled={
                  isCheckingConnection ||
                  !isOnline ||
                  productsInStock.length === 0
                }
                onChange={(e) => {
                  const value =
                    e.target.value;

                  setSearchTerm(value);
                  setProductId("");

                  if (!value.trim()) {
                    setQuantity("");
                  }
                }}
                placeholder={
                  isCheckingConnection
                    ? "Vérification de la connexion..."
                    : !isOnline
                    ? "Connexion Internet requise"
                    : productsInStock.length === 0
                    ? "Aucun produit en stock"
                    : "Rechercher un produit..."
                }
                className="
                  min-w-0
                  w-full
                  bg-transparent
                  py-3
                  text-sm
                  text-white
                  outline-none
                  placeholder:text-slate-500
                  disabled:cursor-not-allowed
                "
              />
            </div>

            {/* ==================================================
                LISTE PRODUITS
            ================================================== */}

            {searchTerm &&
              !productId &&
              !isCheckingConnection &&
              isOnline && (
                <div
                  className="
                    mt-3
                    max-h-64
                    overflow-y-auto
                    rounded-2xl
                    border
                    border-white/10
                    bg-[#0b1424]
                    shadow-xl
                  "
                >
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(
                      (product) => (
                        <button
                          type="button"
                          key={product.id}
                          onClick={() =>
                            selectProduct(product)
                          }
                          className="
                            flex
                            min-h-14
                            w-full
                            items-center
                            justify-between
                            gap-3
                            border-b
                            border-white/5
                            px-4
                            py-3
                            text-left
                            transition
                            hover:bg-white/10
                            active:bg-white/10
                          "
                        >
                          <div
                            className="
                              flex
                              min-w-0
                              items-center
                              gap-3
                            "
                          >
                            <Package
                              size={18}
                              className="
                                shrink-0
                                text-orange-400
                              "
                            />

                            <div className="min-w-0">
                              <span
                                className="
                                  block
                                  truncate
                                  text-sm
                                  font-semibold
                                "
                              >
                                {product.name}
                              </span>

                              <span
                                className="
                                  mt-0.5
                                  block
                                  text-[11px]
                                  text-slate-500
                                "
                              >
                                Disponible
                              </span>
                            </div>
                          </div>

                          <span
                            className="
                              shrink-0
                              rounded-lg
                              bg-green-500/10
                              px-2
                              py-1
                              text-xs
                              font-bold
                              text-green-400
                            "
                          >
                            {product.stock}
                          </span>
                        </button>
                      )
                    )
                  ) : (
                    <div className="p-5 text-center">
                      <Package
                        size={25}
                        className="
                          mx-auto
                          mb-2
                          text-slate-600
                        "
                      />

                      <p className="text-sm text-slate-400">
                        Aucun produit en stock trouvé.
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        Essayez un autre nom.
                      </p>
                    </div>
                  )}
                </div>
              )}

            {/* ==================================================
                PRODUIT SÉLECTIONNÉ
            ================================================== */}

            {selectedProduct && (
              <div
                className="
                  mt-3
                  flex
                  items-center
                  justify-between
                  gap-3
                  rounded-2xl
                  border
                  border-orange-400/20
                  bg-orange-500/10
                  p-3
                "
              >
                <div
                  className="
                    flex
                    min-w-0
                    items-center
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
                      bg-orange-500/15
                    "
                  >
                    <Package
                      size={19}
                      className="text-orange-400"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">
                      {selectedProduct.name}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      Stock disponible :{" "}
                      {selectedProduct.stock}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    clearSelectedProduct
                  }
                  className="
                    shrink-0
                    rounded-lg
                    p-2
                    text-slate-500
                    transition
                    hover:bg-white/10
                    hover:text-white
                  "
                  aria-label="Changer de produit"
                >
                  <X size={17} />
                </button>
              </div>
            )}
          </div>

          {/* ==================================================
              QUANTITÉ
          ================================================== */}

          <div>
            <label
              className="
                mb-2
                block
                text-xs
                font-bold
                text-slate-400
              "
            >
              Quantité vendue
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={decreaseQty}
                disabled={
                  !quantity ||
                  Number(quantity) <= 1 ||
                  isCheckingConnection ||
                  !isOnline
                }
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-white/10
                  transition
                  active:scale-95
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
                aria-label="Diminuer"
              >
                <Minus size={18} />
              </button>

              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                disabled={
                  !selectedProduct ||
                  isCheckingConnection ||
                  !isOnline
                }
                onChange={(e) => {
                  const value =
                    e.target.value;

                  if (value === "") {
                    setQuantity("");
                    return;
                  }

                  const numberValue =
                    Number(value);

                  if (
                    Number.isInteger(
                      numberValue
                    ) &&
                    numberValue >= 0
                  ) {
                    setQuantity(value);
                  }
                }}
                placeholder="Ex : 5"
                className="
                  min-w-0
                  flex-1
                  rounded-xl
                  border
                  border-white/10
                  bg-black/30
                  p-3
                  text-center
                  text-base
                  font-bold
                  text-white
                  outline-none
                  focus:border-orange-400/40
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              />

              <button
                type="button"
                onClick={increaseQty}
                disabled={
                  !selectedProduct ||
                  isCheckingConnection ||
                  !isOnline ||
                  (!!selectedProduct &&
                    quantityNumber >=
                      Number(
                        selectedProduct.stock
                      ))
                }
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-orange-500/20
                  text-orange-300
                  transition
                  active:scale-95
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
                aria-label="Augmenter"
              >
                <Plus size={18} />
              </button>
            </div>

            {selectedProduct &&
              quantityNumber >
                Number(
                  selectedProduct.stock
                ) && (
                <p className="mt-2 text-xs font-bold text-red-400">
                  Quantité supérieure au stock disponible.
                </p>
              )}
          </div>

          {/* ==================================================
              RÉSUMÉ
          ================================================== */}

          {selectedProduct &&
            quantityNumber > 0 && (
              <div
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-orange-400/30
                  bg-orange-500/10
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                    border-b
                    border-white/10
                    p-4
                  "
                >
                  <ShoppingCart
                    size={19}
                    className="text-orange-400"
                  />

                  <p className="font-bold text-orange-200">
                    Résumé de la vente
                  </p>
                </div>

                <div className="space-y-3 p-4">
                  {/* PRODUIT */}

                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-slate-400">
                      Produit
                    </span>

                    <span className="max-w-[60%] text-right text-sm font-bold text-white">
                      {selectedProduct.name}
                    </span>
                  </div>

                  {/* QUANTITÉ */}

                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-slate-400">
                      Quantité
                    </span>

                    <span className="text-sm font-bold text-white">
                      {quantityNumber}
                    </span>
                  </div>

                  {/* PRIX */}

                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-slate-400">
                      Prix unitaire
                    </span>

                    <span className="text-sm font-bold text-white">
                      {Number(
                        selectedProduct.selling_price
                      ).toLocaleString(
                        "fr-FR"
                      )}{" "}
                      {selectedProduct.currency}
                    </span>
                  </div>

                  <div className="border-t border-white/10" />

                  {/* TOTAL */}

                  <div
                    className="
                      rounded-xl
                      bg-black/30
                      p-4
                    "
                  >
                    <p className="text-xs text-slate-400">
                      Total client
                    </p>

                    <p
                      className="
                        mt-1
                        break-words
                        text-2xl
                        font-black
                        text-orange-400
                        sm:text-3xl
                      "
                    >
                      {totalPreview.toLocaleString(
                        "fr-FR"
                      )}{" "}
                      {selectedProduct.currency}
                    </p>
                  </div>

                  {/* ALERT STOCK */}

                  {stockAfterSale <= 5 &&
                    stockAfterSale >= 0 && (
                      <div
                        className="
                          flex
                          items-center
                          gap-2
                          rounded-xl
                          bg-orange-500/10
                          p-3
                          text-xs
                          text-orange-300
                        "
                      >
                        <AlertTriangle
                          size={16}
                          className="shrink-0"
                        />

                        <span>
                          Attention : stock presque épuisé.
                        </span>
                      </div>
                    )}
                </div>
              </div>
            )}

          {/* ==================================================
              MESSAGE AVANT VENTE
          ================================================== */}

          {!isCheckingConnection &&
            !isOnline && (
              <div
                className="
                  flex
                  items-start
                  gap-3
                  rounded-2xl
                  border
                  border-red-400/20
                  bg-red-500/10
                  p-4
                "
              >
                <WifiOff
                  size={19}
                  className="
                    mt-0.5
                    shrink-0
                    text-red-400
                  "
                />

                <div>
                  <p className="text-sm font-bold text-red-300">
                    Vente désactivée
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Cette page nécessite une connexion
                    Internet pour enregistrer les ventes.
                  </p>
                </div>
              </div>
            )}

          {!isCheckingConnection &&
            isOnline &&
            products.length === 0 &&
            !loadingProducts && (
              <div
                className="
                  flex
                  items-start
                  gap-3
                  rounded-2xl
                  border
                  border-yellow-400/20
                  bg-yellow-500/10
                  p-4
                "
              >
                <Info
                  size={19}
                  className="
                    mt-0.5
                    shrink-0
                    text-yellow-400
                  "
                />

                <div>
                  <p className="text-sm font-bold text-yellow-300">
                    Aucun produit à vendre
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Créez d'abord un produit dans votre
                    stock.
                  </p>
                </div>
              </div>
            )}

          {/* ==================================================
              BOUTON VALIDATION
          ================================================== */}

          <button
            type="button"
            onClick={saveSale}
            disabled={saleBlocked}
            className="
              flex
              min-h-14
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              bg-gradient-to-r
              from-orange-500
              to-yellow-400
              px-4
              py-4
              text-sm
              font-black
              text-black
              shadow-lg
              transition
              active:scale-[0.98]
              disabled:cursor-not-allowed
              disabled:opacity-40
              disabled:grayscale
            "
          >
            {loading ? (
              <>
                <span
                  className="
                    h-5
                    w-5
                    animate-spin
                    rounded-full
                    border-2
                    border-black/30
                    border-t-black
                  "
                />

                Enregistrement...
              </>
            ) : isCheckingConnection ? (
              <>
                <span
                  className="
                    h-5
                    w-5
                    animate-spin
                    rounded-full
                    border-2
                    border-black/30
                    border-t-black
                  "
                />

                Vérification de la connexion...
              </>
            ) : !isOnline ? (
              <>
                <WifiOff size={20} />
                Connexion Internet requise
              </>
            ) : !selectedProduct ? (
              <>
                <Package size={20} />
                Sélectionnez un produit
              </>
            ) : !quantity ? (
              <>
                <ShoppingCart size={20} />
                Indiquez une quantité
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                Valider la vente
              </>
            )}
          </button>

          <p className="pb-1 text-center text-[11px] leading-5 text-slate-500">
            Vérifiez le produit, la quantité, le total
            et le stock avant de valider.
          </p>
        </div>
      </div>

      {/* ======================================================
          POPUP CONNEXION
      ====================================================== */}

      {showConnectionPopup && (
        <div
          className="
            fixed
            inset-0
            z-[60]
            flex
            items-center
            justify-center
            bg-black/75
            px-4
            backdrop-blur-sm
          "
        >
          <div
            className="
              w-full
              max-w-sm
              rounded-3xl
              border
              border-orange-400/20
              bg-[#081221]
              p-6
              text-center
              shadow-2xl
            "
          >
            <div
              className="
                mx-auto
                mb-4
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                bg-orange-500/10
                text-orange-400
              "
            >
              <Wifi size={27} />
            </div>

            <h2 className="text-xl font-black text-white">
              Connexion Internet requise
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Cette opération nécessite une connexion
              Internet. Connectez-vous à Internet puis
              réessayez.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowConnectionPopup(false)
              }
              className="
                mt-6
                min-h-12
                w-full
                rounded-2xl
                bg-orange-500
                px-4
                py-3
                font-black
                text-black
                transition
                active:scale-[0.98]
              "
            >
              Compris
            </button>
          </div>
        </div>
      )}

      {/* ======================================================
          POPUP SUCCÈS
      ====================================================== */}

      {showSuccess && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/75
            px-4
            backdrop-blur-sm
          "
        >
          <div
            className="
              w-full
              max-w-sm
              rounded-3xl
              border
              border-green-400/30
              bg-[#081221]
              p-6
              text-center
              shadow-2xl
            "
          >
            <CheckCircle
              size={55}
              className="
                mx-auto
                mb-4
                text-green-400
              "
            />

            <h2
              className="
                text-2xl
                font-black
                text-white
              "
            >
              Vente réussie ✅
            </h2>

            <p
              className="
                mt-3
                text-sm
                leading-6
                text-slate-300
              "
            >
              Votre vente a été enregistrée,
              le bénéfice a été calculé et le stock
              a été mis à jour.
            </p>

            <button
              type="button"
              onClick={() => {
                setShowSuccess(false);
                window.location.href =
                  "/dashboard";
              }}
              className="
                mt-6
                min-h-12
                w-full
                rounded-2xl
                bg-green-500
                px-4
                py-3
                font-black
                text-black
                transition
                active:scale-[0.98]
              "
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}