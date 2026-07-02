"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [unit, setUnit] = useState("Pièce");
  const [currency, setCurrency] = useState("FC");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadProduct();
  }, [id]);

  const loadProduct = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      alert("Erreur chargement produit: " + error.message);
      setLoading(false);
      return;
    }

    if (!data) {
      alert("Produit introuvable");
      setLoading(false);
      return;
    }

    setName(data.name || "");
    setStock(String(data.stock ?? 0));
    setPurchasePrice(String(data.purchase_price ?? 0));
    setSellingPrice(String(data.selling_price ?? 0));
    setUnit(data.unit || "Pièce");
    setCurrency(data.currency || "FC");

    setLoading(false);
  };

  const updateProduct = async () => {
    if (!name) {
      alert("Nom obligatoire");
      return;
    }

    const { error } = await supabase
      .from("products")
      .update({
        name,
        stock: Number(stock),
        purchase_price: Number(purchasePrice),
        selling_price: Number(sellingPrice),
        unit,
        currency,
      })
      .eq("id", id);

    if (error) {
      alert("Erreur update: " + error.message);
      return;
    }

    alert("Produit modifié ✅");
    router.push("/products");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-pulse text-green-500 font-bold">
            Chargement...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white p-4">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          ✏️ Modifier le produit
        </h1>
        <p className="text-xs text-slate-400">
          Mise à jour rapide du stock et des prix
        </p>
      </div>

      {/* FORM CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-lg">

        {/* NOM */}
        <div>
          <p className="text-xs text-slate-400 mb-1">
            Nom du produit
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-xl bg-black border border-slate-700 outline-none"
            placeholder="Nom du produit"
          />
        </div>

        {/* STOCK */}
        <div>
          <p className="text-xs text-slate-400 mb-1">
            Stock actuel
          </p>
          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-full p-3 rounded-xl bg-black border border-slate-700 outline-none"
            placeholder="Stock"
          />
        </div>

        {/* PRIX */}
        <div className="grid grid-cols-2 gap-3">

          <div>
            <p className="text-xs text-slate-400 mb-1">
              Prix achat
            </p>
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) =>
                setPurchasePrice(e.target.value)
              }
              className="w-full p-3 rounded-xl bg-black border border-slate-700 outline-none"
              placeholder="0"
            />
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">
              Prix vente
            </p>
            <input
              type="number"
              value={sellingPrice}
              onChange={(e) =>
                setSellingPrice(e.target.value)
              }
              className="w-full p-3 rounded-xl bg-black border border-slate-700 outline-none"
              placeholder="0"
            />
          </div>

        </div>

        {/* SELECTS */}
        <div className="grid grid-cols-2 gap-3">

          <div>
            <p className="text-xs text-slate-400 mb-1">
              Unité
            </p>
            <select
              value={unit}
              onChange={(e) =>
                setUnit(e.target.value)
              }
              className="w-full p-3 rounded-xl bg-black border border-slate-700"
            >
              <option>Pièce</option>
              <option>Carton</option>
              <option>Boîte</option>
              <option>Sachet</option>
              <option>Bouteille</option>
              <option>Sac</option>
              <option>Kg</option>
            </select>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">
              Devise
            </p>
            <select
              value={currency}
              onChange={(e) =>
                setCurrency(e.target.value)
              }
              className="w-full p-3 rounded-xl bg-black border border-slate-700"
            >
              <option value="FC">FC</option>
              <option value="$">USD ($)</option>
            </select>
          </div>

        </div>

        {/* BUTTON */}
        <button
          onClick={updateProduct}
          className="w-full bg-green-600 hover:bg-green-700 transition p-3 rounded-xl font-bold shadow-lg"
        >
          💾 Enregistrer les modifications
        </button>

      </div>

      {/* FOOTER TIP */}
      <p className="text-center text-xs text-slate-500 mt-4">
        
      </p>

    </main>
  );
}
