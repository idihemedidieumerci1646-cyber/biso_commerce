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
    // ✅ CORRECTION ICI
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
      .eq("user_id", user.id);

    const lowStock =
  (data || []).filter((p) => Number(p.stock) <= 5);

    setProducts(lowStock);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;

    // ✅ CORRECTION ICI AUSSI
    const phone = localStorage.getItem("phone");

    if (!phone) return;

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    if (!user) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (!error) {
      loadProducts();
    } else {
      alert("Erreur suppression");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white">

      {/* HEADER */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            ⚠️ Stock faible
          </h1>
          <p className="text-xs text-slate-400">
            Produits à réapprovisionner rapidement
          </p>
        </div>

        <Link
          href="/products"
          className="text-xs bg-green-600 px-3 py-2 rounded-xl font-bold"
        >
          + Produits
        </Link>
      </div>

      {/* SUMMARY */}
      <div className="px-4 mb-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-sm text-slate-300">
            Produits en alerte
          </p>

          <p className="text-2xl font-bold text-red-400">
            {products.length}
          </p>

          <p className="text-xs text-slate-500">
            seuil ≤ 5 en stock
          </p>
        </div>
      </div>

      {/* LIST */}
      <div className="px-4 pb-10">

        {products.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
            <p className="text-green-400 font-bold">
              ✅ Aucun produit critique
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Stock bien géré
            </p>
          </div>
        ) : (
          <div className="space-y-3">

            {products.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between"
              >

                <div>
                  <p className="font-bold text-sm">
                    {p.name}
                  </p>

                  <p className="text-xs text-slate-400">
                    Stock actuel :
                    <span className="text-red-400 font-bold ml-1">
                      {p.stock} {p.unit}
                    </span>
                  </p>
                </div>

                <div className="flex flex-col gap-2 items-end">

                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-xs bg-red-600 px-3 py-1 rounded-lg font-bold hover:bg-red-700"
                  >
                    Supprimer
                  </button>

                  <Link
                    href="/products"
                    className="text-xs text-green-400 underline"
                  >
                    Réapprovisionner
                  </Link>

                </div>

              </div>
            ))}

          </div>
        )}

      </div>
    </main>
  );
}