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
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts(data || []);
  };

  const selectedProduct = products.find((p) => p.id === productId);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const saveSale = async () => {
    if (!productId || !quantity) {
      alert("Remplissez tous les champs");
      return;
    }

    const product = selectedProduct;
    if (!product) return;

    const qty = Number(quantity);
    if (qty <= 0) { alert("Quantité invalide"); return; }
    if (qty > product.stock) { alert("Stock insuffisant"); return; }

    setLoading(true);

    const unitPurchasePrice = Number(product.purchase_price) / Number(product.initial_stock || 1);
    const profit = (Number(product.selling_price) - unitPurchasePrice) * qty;
    const totalSale = Number(product.selling_price) * qty;

    const { error: saleError } = await supabase.from("sales").insert({
      product_id: product.id,
      product_name: product.name,
      quantity: qty,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      total_sale: totalSale,
      profit: profit,
      currency: product.currency,
    });

    if (saleError) { alert(saleError.message); setLoading(false); return; }

    const { error: stockError } = await supabase
      .from("products")
      .update({ stock: product.stock - qty })
      .eq("id", product.id);

    if (stockError) { alert(stockError.message); setLoading(false); return; }

    alert("Vente enregistrée ✅");
    
    setQuantity("");
    setProductId("");
    setSearchTerm("");
    await loadProducts();
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">💰 Nouvelle vente</h1>

        <div className="bg-white/10 p-6 rounded-3xl space-y-5">
          
          {/* Barre de recherche optimisée */}
          <div>
            <p className="mb-2">Chercher le produit</p>
            <input
              type="text"
              placeholder="Tapez le nom du produit..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setProductId(""); 
              }}
              className="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 focus:border-green-500 outline-none"
            />
            {searchTerm && !productId && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl mt-2 overflow-hidden max-h-60 overflow-y-auto shadow-2xl">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    className="w-full p-4 text-white text-left hover:bg-slate-700 border-b border-slate-700 transition-colors flex justify-between"
                    onClick={() => {
                      setProductId(p.id);
                      setSearchTerm(p.name);
                    }}
                  >
                    <span>{p.name}</span>
                    <span className="text-slate-400 text-sm">Stock: {p.stock}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p>Quantité vendue</p>
            <input
              type="number"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full p-4 rounded-xl bg-white/10 border border-white/20 focus:border-green-500 outline-none"
            />
          </div>

          {/* Résumé dynamique */}
          {selectedProduct && quantity && Number(quantity) > 0 && (
            <div className="p-4 bg-green-600/20 border border-green-500/50 rounded-xl">
              <p className="text-sm text-green-300">
                Prix unitaire : {selectedProduct.selling_price} {selectedProduct.currency}
              </p>
              <p className="text-2xl font-bold">
                Total : {Number(selectedProduct.selling_price) * Number(quantity)} {selectedProduct.currency}
              </p>
            </div>
          )}

          <button
            onClick={saveSale}
            disabled={loading}
            className="w-full bg-green-600 p-4 rounded-xl font-bold hover:bg-green-500 transition-all active:scale-95"
          >
            {loading ? "Enregistrement..." : "Enregistrer la vente"}
          </button>
        </div>
      </div>
    </main>
  );
}