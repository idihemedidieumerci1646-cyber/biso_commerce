"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  Search,
  ShoppingCart,
  Package,
  Sparkles,
  CheckCircle,
  Plus,
  Minus,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  stock: number;
  initial_stock: number;
  purchase_price: number;
  selling_price: number;
  currency: string;
  pieces_per_unit: number;
};

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const quantityInputRef =
    useRef<HTMLInputElement>(null);

  const summaryRef =
    useRef<HTMLDivElement>(null);

  /* =========================================================
     CHARGER LES PRODUITS
  ========================================================= */

  const loadProducts = async () => {
    try {
      const userId =
        localStorage.getItem("user_id");

      if (!userId) return;

      if (!navigator.onLine) {
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("name");

      if (error) {
        console.log(error);
        return;
      }

      if (data) {
        setProducts(data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  /* =========================================================
     PRODUIT SÉLECTIONNÉ
  ========================================================= */

  const selectedProduct = products.find(
    (p) => p.id === productId
  );

  /* =========================================================
     RECHERCHE
  ========================================================= */

  const filteredProducts = products.filter((p) =>
    p.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  /* =========================================================
     QUANTITÉ
  ========================================================= */

  const increaseQty = () => {
    const current =
      Number(quantity || 0);

    const next = current + 1;

    if (
      selectedProduct &&
      next > Number(selectedProduct.stock)
    ) {
      setQuantity(
        String(Number(selectedProduct.stock))
      );
      return;
    }

    setQuantity(String(next));
  };

  const decreaseQty = () => {
    const value =
      Number(quantity || 0);

    if (value > 1) {
      setQuantity(String(value - 1));
    }
  };

  /* =========================================================
     CALCULS
     ========================================================= */

  const totalPreview = selectedProduct
    ? selectedProduct.selling_price *
      Number(quantity || 0)
    : 0;

  const profitPreview = selectedProduct
    ? (
        selectedProduct.selling_price -
        selectedProduct.purchase_price
      ) *
      Number(quantity || 0)
    : 0;

  const stockAfterSale = selectedProduct
    ? selectedProduct.stock -
      Number(quantity || 0)
    : 0;

  /* =========================================================
     CLAVIER MOBILE
  ========================================================= */

  const handleQuantityFocus = () => {
    setTimeout(() => {
      quantityInputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 300);
  };

  /* =========================================================
     RÉSUMÉ
     
     On ne force PAS le scroll à chaque changement
     de quantité afin d'éviter les mouvements gênants
     sur téléphone.
  ========================================================= */

  useEffect(() => {
    if (
      selectedProduct &&
      Number(quantity) > 0
    ) {
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    }
  }, [selectedProduct]);

  /* =========================================================
     ENREGISTRER LA VENTE
  ========================================================= */

  const saveSale = async () => {
    if (!selectedProduct || !quantity) {
      alert(
        "Sélectionnez un produit et une quantité avant de continuer."
      );
      return;
    }

    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty <= 0) {
      alert(
        "La quantité doit être un nombre entier supérieur à zéro."
      );
      return;
    }

    if (qty > selectedProduct.stock) {
      alert(
        `Stock insuffisant !\nDisponible : ${selectedProduct.stock}`
      );
      return;
    }

    const userId =
      localStorage.getItem("user_id");

    if (!userId) {
      alert("Utilisateur non connecté");
      return;
    }

    if (!navigator.onLine) {
      alert(
        "Pas de connexion Internet."
      );
      return;
    }

    setLoading(true);

    try {
      /* =====================================================
         PRIX DE VENTE
      ===================================================== */

      const prixVente = Number(
        selectedProduct.selling_price
      );

      /* =====================================================
         PRIX D'ACHAT
      ===================================================== */

      const prixAchat = Number(
        selectedProduct.purchase_price
      );

      /* =====================================================
         TOTAL
      ===================================================== */

      const totalSale =
        prixVente * qty;

      /* =====================================================
         BÉNÉFICE
      ===================================================== */

      const profit =
        (prixVente - prixAchat) * qty;

      /* =====================================================
         DONNÉES VENTE
      ===================================================== */

      const saleData = {
        id: crypto.randomUUID(),
        user_id: userId,
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: qty,
        purchase_price: prixAchat,
        selling_price: prixVente,
        total_sale: totalSale,
        profit: profit,
        currency: selectedProduct.currency,
        created_at: new Date()
          .toISOString()
          .slice(0, 19),
      };

      /* =====================================================
         ENREGISTRER LA VENTE
      ===================================================== */

      const { error } =
        await supabase
          .from("sales")
          .insert(saleData);

      if (error) {
        alert(error.message);
        return;
      }

      /* =====================================================
         DIMINUER LE STOCK
      ===================================================== */

      const nouveauStock =
        selectedProduct.stock - qty;

      const { error: updateError } =
        await supabase
          .from("products")
          .update({
            stock: nouveauStock,
          })
          .eq("id", selectedProduct.id)
          .eq("user_id", userId);

      if (updateError) {
        alert(updateError.message);
        return;
      }

      /* =====================================================
         STOCK PRESQUE VIDE
      ===================================================== */

      if (nouveauStock <= 5) {
        alert(
          `⚠️ Attention !\n\n${selectedProduct.name} est presque épuisé.\nStock restant : ${nouveauStock}`
        );
      }

      /* =====================================================
         SUCCÈS
      ===================================================== */

      setShowSuccess(true);

      setQuantity("");
      setProductId("");
      setSearchTerm("");

      await loadProducts();
    } catch (error) {
      console.log(error);

      alert(
        "Une erreur est survenue pendant l'enregistrement de la vente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="
        relative
        min-h-[100dvh]
        w-full
        overflow-x-hidden
        bg-[#f5f7fb]
        px-3
        py-4
        pb-32
        text-slate-900
        sm:px-6
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

        {/* =====================================================
            HEADER
        ===================================================== */}

        <header
          className="
            mb-4
            rounded-[22px]
            border
            border-slate-100
            bg-white
            p-4
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
            sm:mb-6
            sm:rounded-[26px]
            sm:p-6
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

              <div className="flex items-center gap-2">
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
                    text-indigo-600
                    sm:h-11
                    sm:w-11
                  "
                >
                  <ShoppingCart
                    size={20}
                  />
                </div>

                <h1
                  className="
                    truncate
                    text-xl
                    font-black
                    tracking-tight
                    text-slate-900
                    sm:text-3xl
                  "
                >
                  Caisse{" "}
                  <span className="text-indigo-600">
                    vente
                  </span>
                </h1>
              </div>

              <p
                className="
                  mt-2
                  text-xs
                  leading-5
                  text-slate-500
                  sm:text-sm
                "
              >
                Enregistrez vos ventes rapidement
                avec BISO-COMMERCE.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowGuide(!showGuide)
              }
              className="
                flex
                min-h-[42px]
                shrink-0
                items-center
                justify-center
                gap-1.5
                rounded-xl
                border
                border-indigo-100
                bg-indigo-50
                px-3
                text-[11px]
                font-black
                text-indigo-600
                shadow-sm
                transition
                active:scale-95
                sm:px-4
              "
            >
              <Sparkles size={14} />

              <span>
                {showGuide
                  ? "Fermer"
                  : "Guide"}
              </span>
            </button>
          </div>
        </header>

        {/* =====================================================
            GUIDE
        ===================================================== */}

        {showGuide && (
          <section
            className="
              mb-4
              overflow-hidden
              rounded-[22px]
              border
              border-slate-100
              bg-white
              p-4
              shadow-[0_8px_30px_rgba(15,23,42,0.06)]
              sm:mb-5
              sm:rounded-[26px]
              sm:p-5
            "
          >
            <div
              className="
                mb-4
                flex
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
                  bg-indigo-50
                  text-indigo-600
                "
              >
                <Sparkles size={19} />
              </div>

              <h2
                className="
                  text-sm
                  font-black
                  leading-5
                  text-slate-900
                  sm:text-base
                "
              >
                Guide de vente
                BISO-COMMERCE
              </h2>
            </div>

            <div
              className="
                space-y-3
                text-sm
                text-slate-600
              "
            >

              {/* 1 */}

              <div
                className="
                  rounded-2xl
                  border
                  border-slate-100
                  bg-slate-50
                  p-4
                "
              >
                <h3
                  className="
                    mb-2
                    text-sm
                    font-black
                    text-slate-900
                  "
                >
                  1️⃣ Rechercher un produit
                </h3>

                <p className="text-xs leading-6 sm:text-sm">
                  Cherchez le produit dans votre
                  stock puis sélectionnez-le.
                </p>
              </div>

              {/* 2 */}

              <div
                className="
                  rounded-2xl
                  border
                  border-slate-100
                  bg-slate-50
                  p-4
                "
              >
                <h3
                  className="
                    mb-2
                    text-sm
                    font-black
                    text-slate-900
                  "
                >
                  2️⃣ Choisir la quantité
                </h3>

                <p className="text-xs leading-6 sm:text-sm">
                  Indiquez combien de produits
                  vous vendez. Le système vérifie
                  automatiquement le stock.
                </p>
              </div>

              {/* 3 */}

              <div
                className="
                  rounded-2xl
                  border
                  border-slate-100
                  bg-slate-50
                  p-4
                "
              >
                <h3
                  className="
                    mb-2
                    text-sm
                    font-black
                    text-slate-900
                  "
                >
                  3️⃣ Vérifier le résumé
                </h3>

                <ul
                  className="
                    space-y-2
                    text-xs
                    leading-5
                  "
                >
                  <li>
                    ✅ Montant total de la vente
                  </li>

                  <li>
                    ✅ Bénéfice estimé
                  </li>

                  <li>
                    ✅ Stock restant
                  </li>
                </ul>
              </div>

              {/* 4 */}

              <div
                className="
                  rounded-2xl
                  border
                  border-indigo-100
                  bg-indigo-50
                  p-4
                "
              >
                <h3
                  className="
                    font-black
                    text-indigo-700
                  "
                >
                  4️⃣ Valider la vente
                </h3>

                <p className="mt-1 text-xs leading-6 sm:text-sm">
                  Cliquez sur « Valider la vente ».
                  BISO-COMMERCE enregistre
                  automatiquement la vente,
                  le bénéfice et la diminution
                  du stock.
                </p>
              </div>

              {/* 5 */}

              <div
                className="
                  rounded-2xl
                  border
                  border-green-100
                  bg-green-50
                  p-4
                "
              >
                <h3
                  className="
                    font-black
                    text-green-700
                  "
                >
                  5️⃣ Après la vente
                </h3>

                <p className="mt-1 text-xs leading-6 sm:text-sm">
                  Un message de succès apparaît.
                  Cliquez sur OK pour retourner
                  au Dashboard.
                </p>
              </div>

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
                  rounded-xl
                  bg-indigo-600
                  px-4
                  py-3
                  text-xs
                  font-black
                  text-white
                  transition
                  active:scale-[0.99]
                  hover:bg-indigo-700
                "
              >
                Fermer le guide
              </button>

            </div>
          </section>
        )}

        {/* =====================================================
            CARTE CAISSE
        ===================================================== */}

        <section
          className="
            space-y-5
            rounded-[22px]
            border
            border-slate-100
            bg-white
            p-4
            shadow-[0_8px_30px_rgba(15,23,42,0.06)]
            sm:rounded-[26px]
            sm:p-6
          "
        >

          {/* ===================================================
              RECHERCHE
          =================================================== */}

          <div>
            <label
              className="
                mb-2
                block
                text-xs
                font-black
                text-slate-500
              "
            >
              Produit
            </label>

            <div
              className="
                flex
                min-h-[52px]
                items-center
                gap-3
                rounded-2xl
                border
                border-slate-800
                bg-black
                px-3
                sm:px-4
              "
            >
              <Search
                size={18}
                className="shrink-0 text-indigo-400"
              />

              <input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(
                    e.target.value
                  );
                  setProductId("");
                }}
                placeholder="Rechercher un produit..."
                autoComplete="off"
                className="
                  min-w-0
                  flex-1
                  bg-transparent
                  py-3
                  text-sm
                  text-white
                  outline-none
                  placeholder:text-slate-500
                "
              />
            </div>

            {/* LISTE RECHERCHE */}

            {searchTerm &&
              !productId && (
                <div
                  className="
                    mt-2
                    max-h-[45vh]
                    overflow-y-auto
                    overscroll-contain
                    rounded-2xl
                    border
                    border-slate-800
                    bg-black
                    shadow-xl
                  "
                >
                  {filteredProducts.length ===
                  0 ? (
                    <div
                      className="
                        p-5
                        text-center
                        text-xs
                        text-slate-400
                      "
                    >
                      Aucun produit trouvé.
                    </div>
                  ) : (
                    filteredProducts.map(
                      (p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setProductId(
                              p.id
                            );
                            setSearchTerm(
                              p.name
                            );

                            setTimeout(() => {
                              quantityInputRef.current?.focus();
                            }, 150);
                          }}
                          className="
                            flex
                            min-h-[58px]
                            w-full
                            items-center
                            justify-between
                            gap-3
                            border-b
                            border-white/10
                            px-3
                            py-3
                            text-left
                            text-white
                            transition
                            active:bg-white/10
                            sm:px-4
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
                                h-9
                                w-9
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-indigo-500/15
                                text-indigo-400
                              "
                            >
                              <Package
                                size={17}
                              />
                            </div>

                            <span
                              className="
                                min-w-0
                                truncate
                                text-sm
                                font-semibold
                              "
                            >
                              {p.name}
                            </span>
                          </div>

                          <span
                            className="
                              shrink-0
                              text-[10px]
                              font-medium
                              text-slate-400
                            "
                          >
                            Stock : {p.stock}
                          </span>
                        </button>
                      )
                    )
                  )}
                </div>
              )}

            {/* PRODUIT SÉLECTIONNÉ */}

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
                  border-indigo-100
                  bg-indigo-50
                  px-3
                  py-3
                "
              >
                <div className="flex min-w-0 items-center gap-2">
                  <CheckCircle
                    size={16}
                    className="
                      shrink-0
                      text-indigo-600
                    "
                  />

                  <span
                    className="
                      min-w-0
                      truncate
                      text-xs
                      font-black
                      text-indigo-700
                    "
                  >
                    {selectedProduct.name}
                  </span>
                </div>

                <span
                  className="
                    shrink-0
                    text-[10px]
                    font-bold
                    text-indigo-500
                  "
                >
                  {selectedProduct.stock} en stock
                </span>
              </div>
            )}
          </div>

          {/* ===================================================
              QUANTITÉ
          =================================================== */}

          <div>
            <label
              className="
                mb-2
                block
                text-xs
                font-black
                text-slate-500
              "
            >
              Quantité vendue
            </label>

            <div
              className="
                grid
                grid-cols-[48px_minmax(0,1fr)_48px]
                items-center
                gap-2
                sm:grid-cols-[52px_minmax(0,1fr)_52px]
              "
            >

              {/* MOINS */}

              <button
                type="button"
                onClick={decreaseQty}
                disabled={
                  !quantity ||
                  Number(quantity) <= 1
                }
                aria-label="Diminuer la quantité"
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  text-slate-700
                  transition
                  active:scale-95
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                  sm:h-[52px]
                  sm:w-[52px]
                "
              >
                <Minus size={18} />
              </button>

              {/* INPUT */}

              <input
                ref={quantityInputRef}
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="1"
                step="1"
                max={
                  selectedProduct
                    ? selectedProduct.stock
                    : undefined
                }
                value={quantity}
                onChange={(e) => {
                  const value =
                    e.target.value;

                  if (value === "") {
                    setQuantity("");
                    return;
                  }

                  const numericValue =
                    Number(value);

                  if (
                    !Number.isInteger(
                      numericValue
                    )
                  ) {
                    return;
                  }

                  if (
                    selectedProduct &&
                    numericValue >
                      selectedProduct.stock
                  ) {
                    setQuantity(
                      String(
                        selectedProduct.stock
                      )
                    );
                    return;
                  }

                  setQuantity(value);
                }}
                onFocus={handleQuantityFocus}
                placeholder="0"
                className="
                  h-12
                  min-w-0
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  px-2
                  text-center
                  text-lg
                  font-black
                  text-slate-900
                  outline-none
                  focus:border-indigo-300
                  focus:ring-2
                  focus:ring-indigo-100
                  sm:h-[52px]
                "
              />

              {/* PLUS */}

              <button
                type="button"
                onClick={increaseQty}
                disabled={
                  !!selectedProduct &&
                  Number(quantity || 0) >=
                    Number(
                      selectedProduct.stock
                    )
                }
                aria-label="Augmenter la quantité"
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-xl
                  bg-indigo-600
                  text-white
                  shadow-sm
                  transition
                  active:scale-95
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                  sm:h-[52px]
                  sm:w-[52px]
                "
              >
                <Plus size={18} />
              </button>
            </div>

            {selectedProduct && (
              <p
                className="
                  mt-2
                  text-center
                  text-[10px]
                  font-medium
                  text-slate-400
                "
              >
                Maximum disponible :{" "}
                {selectedProduct.stock}
              </p>
            )}
          </div>

          {/* ===================================================
              RÉSUMÉ
          =================================================== */}

          {selectedProduct &&
            Number(quantity) > 0 && (
              <div
                ref={summaryRef}
                className="
                  scroll-mt-6
                  overflow-hidden
                  rounded-2xl
                  border
                  border-indigo-100
                  bg-indigo-50
                  p-4
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
                  <div
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-indigo-100
                      text-indigo-600
                    "
                  >
                    <ShoppingCart size={18} />
                  </div>

                  <p
                    className="
                      text-sm
                      font-black
                      text-indigo-800
                    "
                  >
                    Résumé de la vente
                  </p>
                </div>

                {/* PRODUIT */}

                <div
                  className="
                    flex
                    items-start
                    justify-between
                    gap-3
                    border-b
                    border-indigo-100
                    pb-3
                  "
                >
                  <span
                    className="
                      text-xs
                      text-slate-500
                    "
                  >
                    Produit
                  </span>

                  <span
                    className="
                      max-w-[65%]
                      break-words
                      text-right
                      text-xs
                      font-black
                      text-slate-900
                    "
                  >
                    {selectedProduct.name}
                  </span>
                </div>

                {/* QUANTITÉ */}

                <div
                  className="
                    mt-3
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >
                  <span
                    className="
                      text-xs
                      text-slate-500
                    "
                  >
                    Quantité
                  </span>

                  <span
                    className="
                      text-xs
                      font-black
                      text-slate-900
                    "
                  >
                    {quantity}
                  </span>
                </div>

                {/* PRIX UNITÉ */}

                <div
                  className="
                    mt-3
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >
                  <span
                    className="
                      text-xs
                      text-slate-500
                    "
                  >
                    Prix unité
                  </span>

                  <span
                    className="
                      text-xs
                      font-black
                      text-slate-900
                    "
                  >
                    {selectedProduct.selling_price.toLocaleString()}{" "}
                    {selectedProduct.currency}
                  </span>
                </div>

                {/* TOTAL */}

                <div
                  className="
                    mt-4
                    rounded-xl
                    bg-white
                    p-4
                    shadow-sm
                  "
                >
                  <p
                    className="
                      text-[10px]
                      font-black
                      uppercase
                      tracking-wider
                      text-slate-400
                    "
                  >
                    Total client
                  </p>

                  <p
                    className="
                      mt-1
                      break-words
                      text-2xl
                      font-black
                      text-indigo-600
                      sm:text-3xl
                    "
                  >
                    {totalPreview.toLocaleString()}{" "}
                    {selectedProduct.currency}
                  </p>
                </div>

                {/* BÉNÉFICE */}

                <div
                  className="
                    mt-3
                    flex
                    items-start
                    gap-2
                    rounded-xl
                    bg-white/60
                    p-3
                    text-xs
                    font-bold
                    text-green-600
                  "
                >
                  <TrendingUp
                    size={16}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    Bénéfice estimé :{" "}
                    {profitPreview.toLocaleString()}{" "}
                    {selectedProduct.currency}
                  </span>
                </div>

                {/* STOCK */}

                {stockAfterSale <= 5 && (
                  <div
                    className="
                      mt-3
                      flex
                      items-start
                      gap-2
                      rounded-xl
                      border
                      border-red-100
                      bg-red-50
                      p-3
                      text-xs
                      font-medium
                      leading-5
                      text-red-600
                    "
                  >
                    <AlertTriangle
                      size={16}
                      className="mt-0.5 shrink-0"
                    />

                    <span>
                      Attention : stock presque
                      épuisé (
                      {stockAfterSale})
                    </span>
                  </div>
                )}
              </div>
            )}

          {/* ===================================================
              VALIDATION
          =================================================== */}

          <button
            type="button"
            onClick={saveSale}
            disabled={loading}
            className="
              flex
              min-h-[54px]
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              bg-indigo-600
              px-4
              py-4
              text-sm
              font-black
              text-white
              shadow-md
              shadow-indigo-600/10
              transition
              active:scale-[0.99]
              hover:bg-indigo-700
              disabled:cursor-not-allowed
              disabled:opacity-50
              sm:text-base
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
                    border-white/30
                    border-t-white
                  "
                />

                Enregistrement...
              </>
            ) : (
              <>
                <CheckCircle size={20} />

                Valider la vente
              </>
            )}
          </button>

        </section>

        {/* =====================================================
            POPUP SUCCÈS
        ===================================================== */}

        {showSuccess && (
          <div
            className="
              fixed
              inset-0
              z-50
              flex
              items-center
              justify-center
              overflow-y-auto
              bg-slate-900/50
              px-4
              py-6
              backdrop-blur-sm
              sm:px-5
              sm:py-8
            "
          >
            <div
              className="
                my-auto
                w-full
                max-w-sm
                rounded-[24px]
                border
                border-slate-100
                bg-white
                p-5
                text-center
                shadow-[0_20px_60px_rgba(15,23,42,0.15)]
                sm:rounded-[26px]
                sm:p-6
              "
            >
              <div
                className="
                  mx-auto
                  mb-4
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  bg-green-50
                  text-green-600
                "
              >
                <CheckCircle size={38} />
              </div>

              <h2
                className="
                  text-xl
                  font-black
                  text-slate-900
                  sm:text-2xl
                "
              >
                Vente réussie ✅
              </h2>

              <p
                className="
                  mt-3
                  text-xs
                  leading-5
                  text-slate-500
                  sm:text-sm
                "
              >
                Votre vente a été enregistrée
                avec succès.
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
                  flex
                  min-h-[50px]
                  w-full
                  items-center
                  justify-center
                  rounded-2xl
                  bg-green-600
                  px-4
                  py-3
                  text-sm
                  font-black
                  text-white
                  shadow-sm
                  transition
                  active:scale-[0.99]
                  hover:bg-green-700
                "
              >
                OK
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}