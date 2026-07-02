"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Product = {
  id: string;
  name: string | null;
  stock: number;
  unit: string | null;
  purchase_price: number;
  selling_price: number;
  currency: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = async () => {
    try {
      setLoading(true);

      const phone = localStorage.getItem("phone");

      if (!phone) {
        setLoading(false);
        return;
      }

      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("phone", phone)
        .single();

      if (userError || !user) {
        console.error(userError);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        alert(error.message);
      } else {
        setProducts(data || []);
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  const deleteProduct = async (id: string) => {
    const ok = confirm("Voulez-vous supprimer ce produit ?");
    if (!ok) return;

    try {
      const phone = localStorage.getItem("phone");

      if (!phone) {
        alert("Utilisateur non connecté");
        return;
      }

      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("phone", phone)
        .single();

      if (userError || !user) {
        alert("Utilisateur introuvable");
        return;
      }

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        alert("Erreur : " + error.message);
        return;
      }

      await fetchProducts();
      alert("Produit supprimé ✅");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((p) =>
    (p.name || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white p-4 pb-24">

      <div className="mb-5">
        <h1 className="text-2xl font-bold">📦 Produits</h1>
        <p className="text-xs text-slate-400">
          Gestion stock & prix en temps réel
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Rechercher un produit..."
          className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <Link
          href="/products/add"
          className="bg-green-600 px-4 py-3 rounded-xl font-bold"
        >
          +
        </Link>
      </div>

      <div className="space-y-3">

        {loading ? (
          <div className="text-center text-slate-400 py-10">
            Chargement...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center text-slate-400 py-10">
            Aucun produit trouvé
          </div>
        ) : (
          filteredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
            >
              <div className="flex justify-between items-start mb-2">

                <div>
                  <p className="font-bold text-lg">
                    {p.name || "Produit sans nom"}
                  </p>

                  <p className="text-xs text-slate-400">
                    Stock: {p.stock} {p.unit || ""}
                  </p>
                </div>

                <div
                  className={`text-xs px-2 py-1 rounded-full font-bold ${
                    p.stock === 0
                      ? "bg-red-600"
                      : p.stock <= 3
                      ? "bg-yellow-600"
                      : "bg-green-600"
                  }`}
                >
                  {p.stock === 0
                    ? "ÉPUISÉ"
                    : p.stock <= 3
                    ? "FAIBLE"
                    : "OK"}
                </div>

              </div>

              <div className="flex gap-2">

                <Link
                  href={`/products/edit/${p.id}`}
                  className="flex-1 bg-blue-600 text-center py-2 rounded-xl text-sm font-bold"
                >
                  Modifier/réapprovi
                </Link>

                <button
                  onClick={() => deleteProduct(p.id)}
                  className="flex-1 bg-red-600 py-2 rounded-xl text-sm font-bold"
                >
                  Supprimer
                </button>

              </div>

            </div>
          ))
        )}

      </div>

    </main>
  );
}
