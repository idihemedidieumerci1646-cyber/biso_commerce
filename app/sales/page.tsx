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

  useEffect(() => {
    loadProducts();
  }, []);

  // CHARGER LES PRODUITS

  const loadProducts = async () => {
    try {
      const userId = localStorage.getItem("user_id");

      if (!userId) return;

      if (navigator.onLine) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("user_id", userId)
          .order("name");

        if (!error && data) {
          setProducts(data);
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const selectedProduct = products.find(
    (p) => p.id === productId
  );

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const increaseQty = () => {
    setQuantity(String(Number(quantity || 0) + 1));
  };

  const decreaseQty = () => {
    const value = Number(quantity || 0);

    if (value > 1) {
      setQuantity(String(value - 1));
    }
  };

  const totalPreview = selectedProduct
    ? selectedProduct.selling_price * Number(quantity || 0)
    : 0;

  const profitPreview = selectedProduct
    ? (selectedProduct.selling_price -
        selectedProduct.purchase_price) *
      Number(quantity || 0)
    : 0;

  const stockAfterSale = selectedProduct
    ? selectedProduct.stock - Number(quantity || 0)
    : 0;

  const saveSale = async () => {
    if (!selectedProduct || !quantity) {
      alert(
        "Sélectionnez un produit et une quantité avant de continuer."
      );

      return;
    }

    const qty = Number(quantity);

    if (qty <= 0) {
      alert("La quantité doit être supérieure à zéro.");
      return;
    }

    if (qty > selectedProduct.stock) {
      alert(
        `Stock insuffisant !\nDisponible : ${selectedProduct.stock}`
      );

      return;
    }

    const userId = localStorage.getItem("user_id");

    if (!userId) {
      alert("Utilisateur non connecté");
      return;
    }

    setLoading(true);

    const prixVente = Number(
      selectedProduct.selling_price
    );

    const prixAchat = Number(
      selectedProduct.purchase_price
    );

    const totalSale = prixVente * qty;

    const profit = (prixVente - prixAchat) * qty;

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
      created_at: new Date().toISOString().slice(0, 19),
    };

    if (!navigator.onLine) {
      setLoading(false);

      alert("Pas de connexion Internet.");

      return;
    }

    // ENREGISTRER LA VENTE

    const { error } = await supabase
      .from("sales")
      .insert(saleData);

    if (error) {
      setLoading(false);

      alert(error.message);

      return;
    }

    // DIMINUER LE STOCK

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
      setLoading(false);

      alert(updateError.message);

      return;
    }

    // STOCK PRESQUE VIDE

    if (nouveauStock <= 5) {
      alert(
        `⚠️ Attention !\n\n${selectedProduct.name} est presque épuisé.\nStock restant : ${nouveauStock}`
      );
    }

    // OUVRIR MESSAGE SUCCÈS

    setShowSuccess(true);

    setLoading(false);

    setQuantity("");

    setProductId("");

    setSearchTerm("");

    loadProducts();
  };

  return (
    <main
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-[#f5f7fb]
        px-4
        py-6
        pb-28
        text-slate-900
        sm:px-6
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
        {/* HEADER */}

        <div
          className="
            mb-6
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <div>
            <h1
              className="
                text-3xl
                font-black
                tracking-tight
                text-slate-900
              "
            >
              💰 Caisse{" "}
              <span className="text-indigo-600">
                vente
              </span>
            </h1>

            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              Enregistrez vos ventes rapidement avec
              BISO-COMMERCE
            </p>
          </div>

          <button
            onClick={() =>
              setShowGuide(!showGuide)
            }
            className="
              shrink-0
              rounded-2xl
              border
              border-indigo-100
              bg-white
              px-4
              py-2
              text-xs
              font-bold
              text-indigo-600
              shadow-sm
              transition
              hover:bg-indigo-50
            "
          >
            <Sparkles
              size={14}
              className="mr-1 inline"
            />

            {showGuide ? "Fermer" : "Guide"}
          </button>
        </div>

        {/* GUIDE */}

        {showGuide && (
          <div
            className="
              mb-5
              rounded-[26px]
              border
              border-slate-100
              bg-white
              p-5
              shadow-[0_8px_30px_rgba(15,23,42,0.06)]
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
              <div
                className="
                  flex
                  h-10
                  w-10
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
                  font-black
                  text-slate-900
                "
              >
                Guide de vente BISO-COMMERCE
              </h2>
            </div>

            <div
              className="
                space-y-3
                text-sm
                text-slate-600
              "
            >
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
                    font-bold
                    text-slate-900
                  "
                >
                  1️⃣ Rechercher un produit
                </h3>

                <p>
                  Cherchez le produit dans votre stock
                  puis sélectionnez-le.
                </p>
              </div>

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
                    font-bold
                    text-slate-900
                  "
                >
                  2️⃣ Choisir la quantité
                </h3>

                <p>
                  Indiquez combien de produits vous
                  vendez. Le système vérifie
                  automatiquement le stock disponible.
                </p>
              </div>

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
                    font-bold
                    text-slate-900
                  "
                >
                  3️⃣ Vérifier le résumé
                </h3>

                <ul
                  className="
                    space-y-1
                    text-xs
                  "
                >
                  <li>✅ Montant total de la vente</li>
                  <li>✅ Bénéfice estimé</li>
                  <li>✅ Stock restant</li>
                </ul>
              </div>

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
                    font-bold
                    text-indigo-700
                  "
                >
                  4️⃣ Valider la vente
                </h3>

                <p className="mt-1">
                  Cliquez sur "Valider la vente".
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
                  <li>✅ La vente</li>
                  <li>✅ Le bénéfice</li>
                  <li>✅ La diminution du stock</li>
                  <li>✅ La mise à jour du Dashboard</li>
                </ul>
              </div>

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
                    font-bold
                    text-green-700
                  "
                >
                  5️⃣ Après la vente
                </h3>

                <p className="mt-1">
                  Un message de succès apparaît.
                  Cliquez sur OK pour aller
                  automatiquement au Dashboard.
                </p>
              </div>

              {/* BOUTON FERMER EN BAS */}

              <button
                onClick={() =>
                  setShowGuide(false)
                }
                className="
                  mt-5
                  w-full
                  rounded-2xl
                  bg-indigo-600
                  py-3
                  font-black
                  text-white
                  shadow-sm
                  transition
                  hover:bg-indigo-700
                "
              >
                Fermer le guide
              </button>
            </div>
          </div>
        )}

        {/* CARTE CAISSE */}

        <div
          className="
            space-y-5
            rounded-[26px]
            border
            border-slate-100
            bg-white
            p-5
            shadow-[0_8px_30px_rgba(15,23,42,0.06)]
            sm:p-6
          "
        >
          {/* RECHERCHE PRODUIT */}

          <div>
            <label
              className="
                mb-2
                block
                text-xs
                font-bold
                text-slate-500
              "
            >
              Produit
            </label>

            {/* RECHERCHE RESTE NOIRE */}

            <div
              className="
                flex
                items-center
                gap-3
                rounded-2xl
                border
                border-slate-800
                bg-black
                px-4
              "
            >
              <Search
                size={18}
                className="text-indigo-400"
              />

              <input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
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

            {searchTerm && !productId && (
              <div
                className="
                  mt-3
                  max-h-60
                  overflow-y-auto
                  rounded-2xl
                  border
                  border-slate-800
                  bg-black
                  shadow-lg
                "
              >
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProductId(p.id);
                      setSearchTerm(p.name);
                    }}
                    className="
                      flex
                      w-full
                      items-center
                      justify-between
                      border-b
                      border-white/10
                      px-4
                      py-3
                      text-left
                      text-white
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
                      <div
                        className="
                          flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-xl
                          bg-indigo-500/15
                          text-indigo-400
                        "
                      >
                        <Package size={18} />
                      </div>

                      <span>{p.name}</span>
                    </div>

                    <span
                      className="
                        text-xs
                        text-slate-400
                      "
                    >
                      Stock : {p.stock}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* QUANTITE */}

          <div>
            <label
              className="
                mb-2
                block
                text-xs
                font-bold
                text-slate-500
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
                onClick={decreaseQty}
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
                  hover:bg-slate-100
                "
              >
                <Minus size={18} />
              </button>

              <input
                type="number"
                value={quantity}
                onChange={(e) =>
                  setQuantity(e.target.value)
                }
                placeholder="Ex : 5"
                className="
                  flex-1
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  p-3
                  text-center
                  text-slate-900
                  outline-none
                  focus:border-indigo-300
                  focus:ring-2
                  focus:ring-indigo-100
                "
              />

              <button
                onClick={increaseQty}
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
                  hover:bg-indigo-700
                "
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* RESUME VENTE */}

          {selectedProduct &&
            Number(quantity) > 0 && (
              <div
                className="
                  rounded-2xl
                  border
                  border-indigo-100
                  bg-indigo-50
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
                  <div
                    className="
                      flex
                      h-9
                      w-9
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
                      font-bold
                      text-indigo-800
                    "
                  >
                    Résumé de la vente
                  </p>
                </div>

                <p
                  className="
                    text-sm
                    text-slate-600
                  "
                >
                  Produit :
                  <span
                    className="
                      font-bold
                      text-slate-900
                    "
                  >
                    {" "}
                    {selectedProduct.name}
                  </span>
                </p>

                <p
                  className="
                    mt-2
                    text-sm
                    text-slate-600
                  "
                >
                  Prix unité :
                  <span
                    className="
                      font-bold
                      text-slate-900
                    "
                  >
                    {" "}
                    {selectedProduct.selling_price}{" "}
                    {selectedProduct.currency}
                  </span>
                </p>

                <div
                  className="
                    mt-4
                    rounded-xl
                    bg-white
                    p-3
                    shadow-sm
                  "
                >
                  <p
                    className="
                      text-xs
                      font-medium
                      text-slate-500
                    "
                  >
                    Total client
                  </p>

                  <p
                    className="
                      text-3xl
                      font-black
                      text-indigo-600
                    "
                  >
                    {totalPreview}{" "}
                    {selectedProduct.currency}
                  </p>
                </div>

                <div
                  className="
                    mt-3
                    flex
                    items-center
                    gap-2
                    text-sm
                    font-medium
                    text-green-600
                  "
                >
                  <TrendingUp size={16} />

                  Bénéfice estimé : {profitPreview}{" "}
                  {selectedProduct.currency}
                </div>

                {stockAfterSale <= 5 && (
                  <div
                    className="
                      mt-3
                      flex
                      items-center
                      gap-2
                      rounded-xl
                      border
                      border-red-100
                      bg-red-50
                      p-3
                      text-xs
                      text-red-600
                    "
                  >
                    <AlertTriangle size={16} />

                    Attention : stock presque épuisé (
                    {stockAfterSale})
                  </div>
                )}
              </div>
            )}

          {/* BOUTON VALIDATION */}

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
              bg-indigo-600
              py-4
              font-black
              text-white
              shadow-sm
              transition
              hover:bg-indigo-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {loading ? (
              "Enregistrement..."
            ) : (
              <>
                <CheckCircle size={20} />

                Valider la vente
              </>
            )}
          </button>
        </div>

        {/* POPUP SUCCES */}

        {showSuccess && (
          <div
            className="
              fixed
              inset-0
              z-50
              flex
              items-center
              justify-center
              bg-slate-900/50
              px-5
              backdrop-blur-sm
            "
          >
            <div
              className="
                w-full
                max-w-sm
                rounded-[26px]
                border
                border-slate-100
                bg-white
                p-6
                text-center
                shadow-[0_20px_60px_rgba(15,23,42,0.15)]
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
                <CheckCircle size={40} />
              </div>

              <h2
                className="
                  text-2xl
                  font-black
                  text-slate-900
                "
              >
                Vente réussie ✅
              </h2>

              <p
                className="
                  mt-3
                  text-sm
                  text-slate-500
                "
              >
                Votre vente a été enregistrée.
              </p>

              <button
                onClick={() => {
                  setShowSuccess(false);
                  window.location.href =
                    "/dashboard";
                }}
                className="
                  mt-6
                  w-full
                  rounded-2xl
                  bg-green-600
                  py-3
                  font-black
                  text-white
                  shadow-sm
                  transition
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