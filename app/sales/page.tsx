"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  stock: number;
  initial_stock: number;
  purchase_price: number;
  selling_price: number;
  currency: string;
};

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const phone = localStorage.getItem("phone");

    if (!phone) return;

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    if (!user) return;

    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    setProducts(data || []);
  };

  const selectedProduct = products.find((p) => p.id === productId);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const saveSale = async () => {
    if (!productId || !quantity) {
      alert("Remplis les champs");
      return;
    }

    const product = selectedProduct;
    if (!product) return;

    const qty = Number(quantity);
    if (qty <= 0) {
      alert("Quantité invalide");
      return;
    }

    if (qty > product.stock) {
      alert("Stock insuffisant");
      return;
    }

    const phone = localStorage.getItem("phone");

    if (!phone) {
      alert("Utilisateur non connecté");
      return;
    }

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    if (!user) {
      alert("Utilisateur introuvable");
      return;
    }

    setLoading(true);

    const totalSale =
  Number(product.selling_price) * qty;

const profit =
  (Number(product.selling_price) -
    Number(product.purchase_price)) *
  qty;


    await supabase.from("sales").insert({
      user_id: user.id,
      product_id: product.id,
      product_name: product.name,
      quantity: qty,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      total_sale: totalSale,
      profit: profit,
      currency: product.currency,
    });

    await supabase
      .from("products")
      .update({ stock: product.stock - qty })
      .eq("id", product.id)
      .eq("user_id", user.id);

    setLoading(false);

    alert("Vente enregistrée ✅");

    setQuantity("");
    setProductId("");
    setSearchTerm("");
    loadProducts();
  };

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-xl mx-auto">

        {/* HEADER CAISSE */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">💰 Caisse de vente</h1>
          <p className="text-gray-400 text-sm">
            Sélectionnez un produit et enregistrez une vente
          </p>
        </div>

        {/* CARD PRINCIPALE */}
        <div className="bg-slate-900 rounded-2xl p-4 space-y-4">

          {/* SEARCH */}
          <div>
            <p className="text-sm text-gray-400 mb-2">Produit</p>

            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setProductId("");
              }}
              placeholder="Rechercher un produit..."
              className="w-full p-3 rounded-xl bg-black border border-white/10 focus:border-green-500 outline-none"
            />

            {searchTerm && !productId && (
              <div className="mt-2 bg-black border border-white/10 rounded-xl max-h-56 overflow-y-auto">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProductId(p.id);
                      setSearchTerm(p.name);
                    }}
                    className="w-full flex justify-between p-3 hover:bg-white/5 border-b border-white/5"
                  >
                    <span>{p.name}</span>
                    <span className="text-gray-400 text-sm">
                      {p.stock} en stock
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* QUANTITY */}
          <div>
            <p className="text-sm text-gray-400 mb-2">Quantité</p>

            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full p-3 rounded-xl bg-black border border-white/10 focus:border-green-500 outline-none"
              placeholder="0"
            />
          </div>

          {/* RESUME CAISSE */}
          {selectedProduct && quantity && Number(quantity) > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
              <p className="text-green-300 text-sm">
                Prix unitaire
              </p>

              <p className="text-lg font-bold">
                {selectedProduct.selling_price} {selectedProduct.currency}
              </p>

              <p className="text-sm text-gray-300 mt-1">
                Total estimé
              </p>

              <p className="text-xl font-bold text-green-400">
                {Number(selectedProduct.selling_price) *
                  Number(quantity)}{" "}
                {selectedProduct.currency}
              </p>
            </div>
          )}

          {/* BUTTON */}
          <button
            onClick={saveSale}
            disabled={loading}
            className="w-full bg-green-600 py-3 rounded-xl font-bold active:scale-95 transition"
          >
            {loading ? "Enregistrement..." : "Valider la vente"}
          </button>
        </div>
      </div>
    </main>
  );
}
