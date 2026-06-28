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
    if (id) {
      loadProduct();
    }
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
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Chargement...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">

      <div className="max-w-xl mx-auto">

        <h1 className="text-3xl font-bold mb-6">
          ✏️ Modifier le produit
        </h1>

        <div className="bg-white/10 p-6 rounded-3xl space-y-5">

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-4 rounded-xl bg-white/10"
            placeholder="Nom du produit"
          />

          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-full p-4 rounded-xl bg-white/10"
            placeholder="Stock"
          />

          <input
            type="number"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            className="w-full p-4 rounded-xl bg-white/10"
            placeholder="Prix d'achat"
          />

          <input
            type="number"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            className="w-full p-4 rounded-xl bg-white/10"
            placeholder="Prix de vente"
          />

          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full p-4 rounded-xl text-black"
          >
            <option>Pièce</option>
            <option>Carton</option>
            <option>Boîte</option>
            <option>Sachet</option>
            <option>Bouteille</option>
            <option>Sac</option>
            <option>Kg</option>
          </select>

          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full p-4 rounded-xl text-black"
          >
            <option value="FC">FC</option>
            <option value="$">$</option>
          </select>

          <button
            onClick={updateProduct}
            className="w-full bg-green-600 p-4 rounded-xl font-bold"
          >
            Enregistrer les modifications
          </button>

        </div>

      </div>

    </main>
  );
}