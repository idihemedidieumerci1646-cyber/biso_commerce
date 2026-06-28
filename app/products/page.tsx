"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  stock: number;
  unit: string;
  purchase_price: number;
  selling_price: number;
  currency: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🔍 Ajout de l'état pour la recherche
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  };

  const deleteProduct = async (id: string) => {
    const ok = confirm("Voulez-vous supprimer ce produit ?");

    if (!ok) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Erreur : " + error.message);
      return;
    }

    await fetchProducts();

    alert("Produit supprimé ✅");
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 🔍 Logique de filtrage des produits
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        <div className="flex justify-between items-center mb-8">

          <div>
            <h1 className="text-3xl font-bold">
              📦 Produits
            </h1>

            <p className="text-slate-400 mt-2">
              Gestion de votre stock
            </p>
          </div>

          <a
            href="/products/add"
            className="bg-green-600 px-5 py-3 rounded-xl"
          >
            + Ajouter produit
          </a>

        </div>

        {/* 🔍 BARRE DE RECHERCHE */}
        <input
          type="text"
          placeholder="Rechercher un produit par son nom..."
          className="w-full p-4 mb-6 bg-slate-900 border border-white/10 rounded-xl text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="bg-white/10 rounded-2xl overflow-hidden">

          <div className="grid grid-cols-6 p-4 text-slate-300 border-b border-white/10">
            <span>Nom</span>
            <span>Stock</span>
            <span>Achat</span>
            <span>Vente</span>
            <span>Devise</span>
            <span>Action</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">
              Chargement...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              Aucun produit trouvé
            </div>
          ) : (
            filteredProducts.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-6 p-4 border-b border-white/10"
              >
                <span>{p.name}</span>

                <span>
                  {p.stock} {p.unit}
                </span>

                <span>
                  {p.purchase_price} {p.currency}
                </span>

                <span>
                  {p.selling_price} {p.currency}
                </span>

                <span>{p.currency}</span>

                <div className="flex gap-3">
                  <a
                    href={`/products/edit/${p.id}`}
                    className="text-blue-400"
                  >
                    modifier/réap..

                  </a>

                  <button
                    onClick={() => deleteProduct(p.id)}
                    className="text-red-400"
                  >
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