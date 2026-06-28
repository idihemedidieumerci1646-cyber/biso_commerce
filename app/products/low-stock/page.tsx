"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  stock: number;
  unit: string;
};

export default function LowStockPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*");

    const lowStock =
      data?.filter(
        (p) => Number(p.stock) <= 5
      ) || [];

    setProducts(lowStock);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (!error) {
        loadProducts();
      } else {
        alert("Erreur lors de la suppression");
      }
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">

      <div className="max-w-4xl mx-auto">

        <h1 className="text-3xl font-bold mb-6">
          ⚠️ Produits à réapprovisionner
        </h1>

        <div className="bg-white/10 rounded-2xl overflow-hidden">

          <div className="grid grid-cols-3 p-4 border-b border-white/10 text-slate-300">
            <span>Produit</span>
            <span>Stock</span>
            <span>Action</span>
          </div>

          {products.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              Aucun produit en stock faible ✅
            </div>
          ) : (
            products.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-3 p-4 border-b border-white/10 items-center"
              >
                <span>{p.name}</span>

                <span>
                  {p.stock} {p.unit}
                </span>

                <span className="flex items-center gap-4">
                  <button 
                    onClick={() => handleDelete(p.id)}
                    className="font-bold"
                    style={{ color: '#dc2626' }}
                  >
                    Supprimer
                  </button>

                  <Link
                    href="/products"
                    style={{ color: '#16a34a', fontWeight: 'bold', textDecoration: 'underline' }}
                  >
                    Clique ici pour réapprovisionner
                  </Link>
                </span>
              </div>
            ))
          )}

        </div>

      </div>

    </main>
  );
}