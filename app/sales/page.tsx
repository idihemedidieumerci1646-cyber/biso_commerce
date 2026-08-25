"use client";

import { useEffect, useState } from "react";
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
  WifiOff,
  X,
  Info,
  ShieldAlert,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

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

type PopupType =
  | "success"
  | "error"
  | "warning"
  | "offline"
  | "info";

type PopupData = {
  type: PopupType;
  title: string;
  message: string;
};

/* =========================================================
   PAGE
========================================================= */

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);

  const [productId, setProductId] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [quantity, setQuantity] = useState("");

  const [loading, setLoading] = useState(false);

  const [showGuide, setShowGuide] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);

  const [isOnline, setIsOnline] = useState(true);

  const [popup, setPopup] = useState<PopupData | null>(null);

  /* =========================================================
     POPUP
  ========================================================= */

  const showPopup = (
    type: PopupType,
    title: string,
    message: string
  ) => {
    setPopup({
      type,
      title,
      message,
    });
  };

  const closePopup = () => {
    setPopup(null);
  };

  /* =========================================================
     CHARGER PRODUITS
  ========================================================= */

  useEffect(() => {
    loadProducts();

    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);

        loadProducts();
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

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
    }
  }, []);

  /* =========================================================
     CHARGER LES PRODUITS
  ========================================================= */

  const loadProducts = async () => {
    try {
      const userId =
        localStorage.getItem("user_id");

      if (!userId) return;

      /*
        -------------------------------------------------------
        CACHE LOCAL
        -------------------------------------------------------
      */

      const cacheKey =
        `biso-sales-products-${userId}`;

      const cachedProducts =
        localStorage.getItem(cacheKey);

      if (cachedProducts) {
        try {
          const parsed =
            JSON.parse(cachedProducts);

          if (Array.isArray(parsed)) {
            setProducts(parsed);
          }
        } catch {
          console.log(
            "Cache produits invalide."
          );
        }
      }

      /*
        -------------------------------------------------------
        HORS CONNEXION
        -------------------------------------------------------
      */

      if (!navigator.onLine) {
        return;
      }

      /*
        -------------------------------------------------------
        SERVEUR
        -------------------------------------------------------
      */

      const {
        data,
        error,
      } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("name");

      if (error) {
        console.log(
          "Erreur chargement produits :",
          error
        );

        return;
      }

      if (data) {
        setProducts(data);

        /*
          Sauvegarde locale pour permettre
          l'ouverture de la caisse hors connexion.
        */

        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify(data)
          );
        } catch {
          console.log(
            "Impossible de sauvegarder le cache produits."
          );
        }
      }
    } catch (error) {
      console.log(
        "Erreur loadProducts :",
        error
      );
    }
  };

  /* =========================================================
     PRODUIT SÉLECTIONNÉ
  ========================================================= */

  const selectedProduct =
    products.find(
      (p) => p.id === productId
    );

  /* =========================================================
     RECHERCHE
  ========================================================= */

  const filteredProducts =
    products.filter((p) =>
      p.name
        .toLowerCase()
        .includes(
          searchTerm.toLowerCase()
        )
    );

  /* =========================================================
     QUANTITÉ +
  ========================================================= */

  const increaseQty = () => {
    const current =
      Number(quantity || 0);

    setQuantity(
      String(current + 1)
    );
  };

  /* =========================================================
     QUANTITÉ -
  ========================================================= */

  const decreaseQty = () => {
    const value =
      Number(quantity || 0);

    if (value > 1) {
      setQuantity(
        String(value - 1)
      );
    }
  };

  /* =========================================================
     TOTAL
  ========================================================= */

  const totalPreview =
    selectedProduct
      ? selectedProduct.selling_price *
        Number(quantity || 0)
      : 0;

  /* =========================================================
     BÉNÉFICE
  ========================================================= */

  const profitPreview =
    selectedProduct
      ? (
          selectedProduct.selling_price -
          selectedProduct.purchase_price
        ) *
        Number(quantity || 0)
      : 0;

  /* =========================================================
     STOCK APRÈS VENTE
  ========================================================= */

  const stockAfterSale =
    selectedProduct
      ? selectedProduct.stock -
        Number(quantity || 0)
      : 0;

  /* =========================================================
     ENREGISTRER VENTE
  ========================================================= */

  const saveSale = async () => {
    /*
      -------------------------------------------------------
      PRODUIT
      -------------------------------------------------------
    */

    if (!selectedProduct) {
      showPopup(
        "warning",
        "Produit manquant",
        "Veuillez sélectionner un produit avant de continuer."
      );

      return;
    }

    /*
      -------------------------------------------------------
      QUANTITÉ
      -------------------------------------------------------
    */

    if (!quantity) {
      showPopup(
        "warning",
        "Quantité manquante",
        "Veuillez indiquer la quantité que vous souhaitez vendre."
      );

      return;
    }

    const qty =
      Number(quantity);

    /*
      -------------------------------------------------------
      QUANTITÉ VALIDE
      -------------------------------------------------------
    */

    if (
      !Number.isFinite(qty) ||
      qty <= 0
    ) {
      showPopup(
        "warning",
        "Quantité invalide",
        "La quantité doit être supérieure à zéro."
      );

      return;
    }

    /*
      -------------------------------------------------------
      STOCK INSUFFISANT
      -------------------------------------------------------
    */

    if (
      qty >
      selectedProduct.stock
    ) {
      showPopup(
        "error",
        "Stock insuffisant",
        `Vous souhaitez vendre ${qty} unité(s), mais il ne reste que ${selectedProduct.stock} unité(s) en stock.`
      );

      return;
    }

    /*
      -------------------------------------------------------
      CONNEXION INTERNET
      -------------------------------------------------------
    */

    if (
      typeof window !==
        "undefined" &&
      !navigator.onLine
    ) {
      showPopup(
        "offline",
        "Connexion Internet requise",
        "La caisse peut être consultée hors connexion, mais l'enregistrement d'une vente nécessite une connexion Internet."
      );

      return;
    }

    /*
      -------------------------------------------------------
      UTILISATEUR
      -------------------------------------------------------
    */

    const userId =
      localStorage.getItem(
        "user_id"
      );

    if (!userId) {
      showPopup(
        "error",
        "Utilisateur non connecté",
        "Votre session utilisateur est introuvable. Veuillez vous reconnecter."
      );

      return;
    }

    setLoading(true);

    try {
      /*
        -----------------------------------------------------
        PRIX
        -----------------------------------------------------
      */

      const prixVente =
        Number(
          selectedProduct.selling_price
        );

      const prixAchat =
        Number(
          selectedProduct.purchase_price
        );

      const totalSale =
        prixVente * qty;

      const profit =
        (prixVente - prixAchat) *
        qty;

      /*
        -----------------------------------------------------
        DONNÉES VENTE
        -----------------------------------------------------
      */

      const saleData = {
        id: crypto.randomUUID(),

        user_id: userId,

        product_id:
          selectedProduct.id,

        product_name:
          selectedProduct.name,

        quantity: qty,

        purchase_price:
          prixAchat,

        selling_price:
          prixVente,

        total_sale:
          totalSale,

        profit,

        currency:
          selectedProduct.currency,

        created_at:
          new Date()
            .toISOString()
            .slice(0, 19),
      };

      /*
        -----------------------------------------------------
        VÉRIFICATION INTERNET JUSTE AVANT INSERTION
        -----------------------------------------------------
      */

      if (!navigator.onLine) {
        setLoading(false);

        showPopup(
          "offline",
          "Connexion perdue",
          "Internet vient d'être interrompu. La vente n'a pas été enregistrée."
        );

        return;
      }

      /*
        -----------------------------------------------------
        ENREGISTRER LA VENTE
        -----------------------------------------------------
      */

      const {
        error,
      } = await supabase
        .from("sales")
        .insert(saleData);

      if (error) {
        setLoading(false);

        showPopup(
          "error",
          "Vente non enregistrée",
          error.message ||
            "Une erreur est survenue pendant l'enregistrement de la vente."
        );

        return;
      }

      /*
        -----------------------------------------------------
        DIMINUER LE STOCK
        -----------------------------------------------------
      */

      const nouveauStock =
        selectedProduct.stock -
        qty;

      const {
        error: updateError,
      } = await supabase
        .from("products")
        .update({
          stock: nouveauStock,
        })
        .eq(
          "id",
          selectedProduct.id
        )
        .eq(
          "user_id",
          userId
        );

      if (updateError) {
        setLoading(false);

        showPopup(
          "error",
          "Stock non mis à jour",
          updateError.message ||
            "La vente a été enregistrée mais le stock n'a pas pu être mis à jour."
        );

        return;
      }

      /*
        -----------------------------------------------------
        METTRE À JOUR LE PRODUIT LOCAL
        -----------------------------------------------------
      */

      const updatedProducts =
        products.map((product) =>
          product.id ===
          selectedProduct.id
            ? {
                ...product,
                stock:
                  nouveauStock,
              }
            : product
        );

      setProducts(
        updatedProducts
      );

      try {
        localStorage.setItem(
          `biso-sales-products-${userId}`,
          JSON.stringify(
            updatedProducts
          )
        );
      } catch {
        console.log(
          "Cache produit non sauvegardé."
        );
      }

      /*
        -----------------------------------------------------
        STOCK PRESQUE VIDE
        -----------------------------------------------------
      */

      if (
        nouveauStock <= 5
      ) {
        setLoading(false);

        showPopup(
          "warning",
          "Vente enregistrée",
          `${selectedProduct.name} est presque épuisé. Il reste seulement ${nouveauStock} unité(s) en stock.`
        );

        setShowSuccess(true);
      } else {
        setLoading(false);

        setShowSuccess(true);
      }

      /*
        -----------------------------------------------------
        RESET
        -----------------------------------------------------
      */

      setQuantity("");

      setProductId("");

      setSearchTerm("");

      /*
        Actualiser depuis Supabase.
      */

      void loadProducts();
    } catch (error) {
      console.error(
        "Erreur vente :",
        error
      );

      setLoading(false);

      showPopup(
        "error",
        "Une erreur est survenue",
        "Impossible d'enregistrer la vente pour le moment. Vérifiez votre connexion puis réessayez."
      );
    }
  };

  /* =========================================================
     COULEUR POPUP
  ========================================================= */

  const popupIcon =
    popup?.type === "success"
      ? CheckCircle
      : popup?.type === "offline"
      ? WifiOff
      : popup?.type === "warning"
      ? AlertTriangle
      : popup?.type === "info"
      ? Info
      : ShieldAlert;

  const PopupIcon =
    popupIcon;

  /* =========================================================
     RETURN
  ========================================================= */

  return (
    <main
      className="
      relative
      min-h-screen
      overflow-hidden
      bg-[#081221]
      text-white
      px-4
      py-6
      pb-28
      "
    >
      {/* =====================================================
          FOND
      ===================================================== */}

      <div
        className="
        pointer-events-none
        absolute
        -left-32
        -top-32
        h-72
        w-72
        rounded-full
        bg-orange-500/10
        blur-3xl
        "
      />

      <div
        className="
        pointer-events-none
        absolute
        -bottom-40
        -right-32
        h-80
        w-80
        rounded-full
        bg-yellow-400/5
        blur-3xl
        "
      />

      <div
        className="
        relative
        z-10
        mx-auto
        max-w-xl
        "
      >
        {/* ===================================================
            HEADER
        =================================================== */}

        <div
          className="
          mb-6
          flex
          items-center
          justify-between
          gap-3
          "
        >
          <div>
            <h1
              className="
              text-3xl
              font-black
              tracking-tight
              "
            >
              💰 Caisse
              <span
                className="
                text-orange-400
                "
              >
                {" "}
                vente
              </span>
            </h1>

            <p
              className="
              mt-1
              text-sm
              text-slate-400
              "
            >
              Enregistrez vos ventes
              rapidement avec
              BISO-COMMERCE
            </p>
          </div>

          <button
            onClick={() =>
              setShowGuide(
                !showGuide
              )
            }
            className="
            shrink-0
            rounded-full
            border
            border-orange-400/30
            bg-orange-500/10
            px-4
            py-2
            text-xs
            font-bold
            text-orange-300
            transition
            hover:bg-orange-500/20
            "
          >
            <Sparkles
              size={14}
              className="mr-1 inline"
            />

            {showGuide
              ? "Fermer"
              : "Guide"}
          </button>
        </div>

        {/* ===================================================
            INDICATEUR HORS CONNEXION
        =================================================== */}

        {!isOnline && (
          <div
            className="
            mb-5
            flex
            items-center
            gap-3
            rounded-2xl
            border
            border-red-400/30
            bg-red-500/10
            p-4
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
              bg-red-500/15
              "
            >
              <WifiOff
                size={20}
                className="text-red-300"
              />
            </div>

            <div>
              <p
                className="
                text-sm
                font-black
                text-red-200
                "
              >
                Hors connexion
              </p>

              <p
                className="
                mt-0.5
                text-xs
                text-red-300/80
                "
              >
                La caisse reste
                consultable, mais
                une vente nécessite
                Internet.
              </p>
            </div>
          </div>
        )}

        {/* ===================================================
            GUIDE
        =================================================== */}

        {showGuide && (
          <div
            className="
            mb-5
            rounded-3xl
            border
            border-orange-400/20
            bg-white/5
            p-5
            shadow-xl
            backdrop-blur-xl
            "
          >
            <div
              className="
              mb-5
              flex
              items-center
              gap-2
              "
            >
              <Sparkles
                className="text-orange-400"
              />

              <h2
                className="
                font-bold
                text-orange-300
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
              text-slate-300
              "
            >
              <div
                className="
                rounded-2xl
                border
                border-white/10
                bg-black/30
                p-4
                "
              >
                <h3
                  className="
                  mb-2
                  font-bold
                  text-white
                  "
                >
                  1️⃣ Rechercher un
                  produit
                </h3>

                <p>
                  Cherchez le produit
                  dans votre stock puis
                  sélectionnez-le.
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
                <h3
                  className="
                  mb-2
                  font-bold
                  text-white
                  "
                >
                  2️⃣ Choisir la
                  quantité
                </h3>

                <p>
                  Indiquez combien de
                  produits vous vendez.
                  Le système vérifie
                  automatiquement le
                  stock disponible.
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
                <h3
                  className="
                  mb-2
                  font-bold
                  text-white
                  "
                >
                  3️⃣ Vérifier le
                  résumé
                </h3>

                <ul
                  className="
                  space-y-1
                  text-xs
                  "
                >
                  <li>
                    ✅ Montant total
                    de la vente
                  </li>

                  <li>
                    ✅ Bénéfice estimé
                  </li>

                  <li>
                    ✅ Stock restant
                  </li>
                </ul>
              </div>

              <div
                className="
                rounded-2xl
                border
                border-orange-400/30
                bg-orange-500/10
                p-4
                "
              >
                <h3
                  className="
                  font-bold
                  text-orange-200
                  "
                >
                  4️⃣ Valider la vente
                </h3>

                <p>
                  Cliquez sur
                  « Valider la vente ».
                  BISO-COMMERCE enregistre
                  automatiquement :
                </p>

                <ul
                  className="
                  mt-2
                  space-y-1
                  text-xs
                  "
                >
                  <li>
                    ✅ La vente
                  </li>

                  <li>
                    ✅ Le bénéfice
                  </li>

                  <li>
                    ✅ La diminution
                    du stock
                  </li>

                  <li>
                    ✅ La mise à jour
                    du Dashboard
                  </li>
                </ul>
              </div>

              <div
                className="
                rounded-2xl
                border
                border-blue-400/30
                bg-blue-500/10
                p-4
                "
              >
                <h3
                  className="
                  font-bold
                  text-blue-300
                  "
                >
                  🌐 Connexion
                </h3>

                <p>
                  La caisse peut être
                  ouverte hors connexion,
                  mais l'enregistrement
                  d'une vente nécessite
                  Internet.
                </p>
              </div>

              <div
                className="
                rounded-2xl
                border
                border-green-400/30
                bg-green-500/10
                p-4
                "
              >
                <h3
                  className="
                  font-bold
                  text-green-300
                  "
                >
                  5️⃣ Après la vente
                </h3>

                <p>
                  Un message de succès
                  apparaît après
                  l'enregistrement.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowGuide(false)
                }
                className="
                mt-2
                w-full
                rounded-2xl
                bg-orange-500
                py-3
                font-black
                text-black
                transition
                hover:bg-orange-400
                "
              >
                Fermer le guide
              </button>
            </div>
          </div>
        )}

        {/* ===================================================
            CARTE CAISSE
        =================================================== */}

        <div
          className="
          space-y-5
          rounded-3xl
          border
          border-white/10
          bg-white/5
          p-5
          shadow-2xl
          backdrop-blur-xl
          "
        >
          {/* =================================================
              RECHERCHE
          ================================================= */}

          <div>
            <label
              className="
              mb-2
              block
              text-xs
              text-slate-400
              "
            >
              Produit
            </label>

            <div
              className="
              flex
              items-center
              gap-3
              rounded-2xl
              border
              border-white/10
              bg-black/30
              px-4
              "
            >
              <Search
                size={18}
                className="text-orange-400"
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
                className="
                w-full
                bg-transparent
                py-3
                text-white
                outline-none
                placeholder:text-slate-500
                "
              />
            </div>

            {searchTerm &&
              !productId && (
                <div
                  className="
                  mt-3
                  max-h-60
                  overflow-y-auto
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/70
                  shadow-xl
                  "
                >
                  {filteredProducts.length >
                  0 ? (
                    filteredProducts.map(
                      (p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setProductId(
                              p.id
                            );

                            setSearchTerm(
                              p.name
                            );
                          }}
                          className="
                          flex
                          w-full
                          items-center
                          justify-between
                          border-b
                          border-white/5
                          px-4
                          py-3
                          text-left
                          transition
                          hover:bg-white/10
                          "
                        >
                          <div
                            className="
                            flex
                            items-center
                            gap-3
                            "
                          >
                            <Package
                              size={18}
                              className="text-orange-400"
                            />

                            <span>
                              {p.name}
                            </span>
                          </div>

                          <span
                            className="
                            text-xs
                            text-slate-400
                            "
                          >
                            Stock :{" "}
                            {p.stock}
                          </span>
                        </button>
                      )
                    )
                  ) : (
                    <div
                      className="
                      p-5
                      text-center
                      text-sm
                      text-slate-400
                      "
                    >
                      Aucun produit
                      trouvé.
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* =================================================
              PRODUIT SÉLECTIONNÉ
          ================================================= */}

          {selectedProduct && (
            <div
              className="
              rounded-2xl
              border
              border-orange-400/20
              bg-orange-500/5
              p-4
              "
            >
              <div
                className="
                flex
                items-center
                justify-between
                gap-3
                "
              >
                <div>
                  <p
                    className="
                    text-xs
                    text-slate-400
                    "
                  >
                    Produit sélectionné
                  </p>

                  <p
                    className="
                    mt-1
                    font-black
                    text-white
                    "
                  >
                    {selectedProduct.name}
                  </p>
                </div>

                <div
                  className="
                  rounded-xl
                  bg-orange-500/10
                  px-3
                  py-2
                  text-right
                  "
                >
                  <p
                    className="
                    text-[10px]
                    text-slate-400
                    "
                  >
                    Stock
                  </p>

                  <p
                    className="
                    font-black
                    text-orange-300
                    "
                  >
                    {selectedProduct.stock}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              QUANTITÉ
          ================================================= */}

          <div>
            <label
              className="
              mb-2
              block
              text-xs
              text-slate-400
              "
            >
              Quantité vendue
            </label>

            <div
              className="
              flex
              items-center
              gap-3
              "
            >
              <button
                onClick={
                  decreaseQty
                }
                className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-xl
                bg-white/10
                transition
                hover:bg-white/15
                "
              >
                <Minus size={18} />
              </button>

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    e.target.value
                  )
                }
                placeholder="Ex : 5"
                className="
                flex-1
                rounded-xl
                border
                border-white/10
                bg-black/30
                p-3
                text-center
                outline-none
                "
              />

              <button
                onClick={
                  increaseQty
                }
                className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-xl
                bg-orange-500/20
                text-orange-300
                transition
                hover:bg-orange-500/30
                "
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* =================================================
              RÉSUMÉ
          ================================================= */}

          {selectedProduct &&
            Number(quantity) >
              0 && (
              <div
                className="
                rounded-2xl
                border
                border-orange-400/30
                bg-orange-500/10
                p-5
                "
              >
                <div
                  className="
                  mb-3
                  flex
                  items-center
                  gap-2
                  "
                >
                  <ShoppingCart
                    className="text-orange-400"
                  />

                  <p
                    className="
                    font-bold
                    text-orange-200
                    "
                  >
                    Résumé de la
                    vente
                  </p>
                </div>

                <p
                  className="
                  text-sm
                  text-slate-300
                  "
                >
                  Produit :
                  <span
                    className="
                    font-bold
                    text-white
                    "
                  >
                    {" "}
                    {
                      selectedProduct.name
                    }
                  </span>
                </p>

                <p
                  className="
                  mt-2
                  text-sm
                  text-slate-300
                  "
                >
                  Prix unité :
                  <span
                    className="
                    font-bold
                    text-white
                    "
                  >
                    {" "}
                    {
                      selectedProduct.selling_price
                    }{" "}
                    {
                      selectedProduct.currency
                    }
                  </span>
                </p>

                <div
                  className="
                  mt-4
                  rounded-xl
                  bg-black/30
                  p-3
                  "
                >
                  <p
                    className="
                    text-xs
                    text-slate-400
                    "
                  >
                    Total client
                  </p>

                  <p
                    className="
                    text-3xl
                    font-black
                    text-orange-400
                    "
                  >
                    {totalPreview}{" "}
                    {
                      selectedProduct.currency
                    }
                  </p>
                </div>

                <div
                  className="
                  mt-3
                  flex
                  items-center
                  gap-2
                  text-sm
                  text-green-300
                  "
                >
                  <TrendingUp
                    size={16}
                  />

                  Bénéfice estimé :
                  {" "}
                  {profitPreview}{" "}
                  {
                    selectedProduct.currency
                  }
                </div>

                {stockAfterSale <=
                  5 && (
                  <div
                    className="
                    mt-3
                    flex
                    items-center
                    gap-2
                    rounded-xl
                    bg-red-500/10
                    p-3
                    text-xs
                    text-red-300
                    "
                  >
                    <AlertTriangle
                      size={16}
                    />

                    Attention : stock
                    presque épuisé (
                    {stockAfterSale})
                  </div>
                )}
              </div>
            )}

          {/* =================================================
              BOUTON VALIDATION
          ================================================= */}

          <button
            onClick={saveSale}
            disabled={loading}
            className="
            flex
            w-full
            items-center
            justify-center
            gap-2
            rounded-2xl
            bg-gradient-to-r
            from-orange-500
            to-yellow-400
            py-4
            font-black
            text-black
            shadow-lg
            transition
            hover:scale-[1.02]
            disabled:cursor-not-allowed
            disabled:opacity-50
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
            ) : (
              <>
                <CheckCircle
                  size={20}
                />

                Valider la vente
              </>
            )}
          </button>

          {/* =================================================
              INFORMATION HORS CONNEXION
          ================================================= */}

          {!isOnline && (
            <div
              className="
              flex
              items-start
              gap-3
              rounded-2xl
              border
              border-red-400/20
              bg-red-500/5
              p-4
              "
            >
              <WifiOff
                size={18}
                className="
                mt-0.5
                shrink-0
                text-red-300
                "
              />

              <div>
                <p
                  className="
                  text-sm
                  font-bold
                  text-red-200
                  "
                >
                  Vente temporairement
                  indisponible
                </p>

                <p
                  className="
                  mt-1
                  text-xs
                  leading-5
                  text-slate-400
                  "
                >
                  Vous pouvez consulter
                  les produits et préparer
                  la vente, mais vous devez
                  être connecté à Internet
                  pour la valider.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================
            POPUP ERREUR / INFO
        =================================================== */}

        {popup && (
          <div
            className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/75
            px-5
            backdrop-blur-sm
            "
          >
            <div
              className="
              w-full
              max-w-sm
              overflow-hidden
              rounded-[2rem]
              border
              border-white/10
              bg-[#081221]
              shadow-[0_25px_80px_rgba(0,0,0,0.65)]
              "
            >
              <div
                className="
                p-6
                text-center
                "
              >
                <button
                  onClick={
                    closePopup
                  }
                  className="
                  absolute
                  "
                  aria-label="Fermer"
                />

                <div
                  className={`
                  mx-auto
                  mb-5
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  ${
                    popup.type ===
                    "offline"
                      ? "bg-red-500/15 text-red-300"
                      : popup.type ===
                        "error"
                      ? "bg-red-500/15 text-red-300"
                      : popup.type ===
                        "warning"
                      ? "bg-orange-500/15 text-orange-300"
                      : popup.type ===
                        "success"
                      ? "bg-green-500/15 text-green-300"
                      : "bg-blue-500/15 text-blue-300"
                  }
                  `}
                >
                  <PopupIcon
                    size={32}
                  />
                </div>

                <h2
                  className="
                  text-xl
                  font-black
                  text-white
                  "
                >
                  {popup.title}
                </h2>

                <p
                  className="
                  mt-3
                  text-sm
                  leading-6
                  text-slate-400
                  "
                >
                  {popup.message}
                </p>

                <button
                  onClick={
                    closePopup
                  }
                  className={`
                  mt-6
                  w-full
                  rounded-2xl
                  py-3.5
                  font-black
                  text-black
                  transition
                  ${
                    popup.type ===
                    "offline"
                      ? "bg-red-400 hover:bg-red-300"
                      : popup.type ===
                        "error"
                      ? "bg-red-400 hover:bg-red-300"
                      : popup.type ===
                        "warning"
                      ? "bg-orange-400 hover:bg-orange-300"
                      : "bg-orange-400 hover:bg-orange-300"
                  }
                  `}
                >
                  Compris
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            POPUP SUCCÈS
        =================================================== */}

        {showSuccess && (
          <div
            className="
            fixed
            inset-0
            z-[90]
            flex
            items-center
            justify-center
            bg-black/75
            px-5
            backdrop-blur-sm
            "
          >
            <div
              className="
              w-full
              max-w-sm
              rounded-[2rem]
              border
              border-green-400/20
              bg-[#081221]
              p-6
              text-center
              shadow-[0_25px_80px_rgba(0,0,0,0.65)]
              "
            >
              <div
                className="
                mx-auto
                mb-5
                flex
                h-20
                w-20
                items-center
                justify-center
                rounded-full
                bg-green-500/10
                "
              >
                <CheckCircle
                  size={48}
                  className="
                  text-green-400
                  "
                />
              </div>

              <h2
                className="
                text-2xl
                font-black
                text-white
                "
              >
                Vente réussie
                ✅
              </h2>

              <p
                className="
                mt-3
                text-sm
                leading-6
                text-slate-300
                "
              >
                Votre vente a été
                enregistrée avec
                succès.
              </p>

              <button
                onClick={() => {
                  setShowSuccess(
                    false
                  );

                  window.location.href =
                    "/dashboard";
                }}
                className="
                mt-6
                w-full
                rounded-2xl
                bg-green-500
                py-3.5
                font-black
                text-black
                transition
                hover:bg-green-400
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