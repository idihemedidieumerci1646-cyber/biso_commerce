"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AddProductPage() {
  const [name, setName] = useState("");
  const [type, setType] = useState("Pièce");
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [currency, setCurrency] = useState("FC");
  const [loading, setLoading] = useState(false);

  const saveProduct = async () => {
    if (!name || !quantity || !buyPrice || !sellPrice) {
      alert("Remplis tous les champs");
      return;
    }

    const phone = localStorage.getItem("phone");

    if (!phone) {
      alert("Non connecté");
      return;
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    // ✅ CORRECTION ICI
    if (userError || !user?.id) {
      alert("Utilisateur introuvable");
      return;
    }

    const userId = user.id;

    setLoading(true);

    const { error } = await supabase.from("products").insert({
      user_id: userId,
      name,
      unit: type,
      stock: Number(quantity),
      initial_stock: Number(quantity),
      purchase_price: Number(buyPrice),
      selling_price: Number(sellPrice),
      currency,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Produit ajouté ✅");

    setName("");
    setQuantity("");
    setBuyPrice("");
    setSellPrice("");
  };

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-xl mx-auto">

        <h1 className="text-2xl font-bold mb-4">
          ➕ Nouveau produit
        </h1>

        <div className="bg-slate-900 p-4 rounded-2xl space-y-3">

          <input
            className="w-full p-3 rounded-xl bg-black border border-white/10"
            placeholder="Nom produit"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <select
            className="w-full p-3 rounded-xl bg-black border border-white/10"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option>Pièce</option>
            <option>Carton</option>
            <option>Boîte</option>
            <option>Sachet</option>
            <option>Kg</option>
          </select>

          <input
            type="number"
            className="w-full p-3 rounded-xl bg-black border border-white/10"
            placeholder="Stock"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              className="p-3 rounded-xl bg-black border border-white/10"
              placeholder=" Prix d'Achat"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
            />

            <input
              type="number"
              className="p-3 rounded-xl bg-black border border-white/10"
              placeholder="Prix de Vente"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
            />
          </div>

          <select
            className="w-full p-3 rounded-xl bg-black border border-white/10"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="FC">FC</option>
            <option value="$">$ USD</option>
          </select>

          <button
            onClick={saveProduct}
            disabled={loading}
            className="w-full bg-green-600 p-3 rounded-xl font-bold"
          >
            {loading ? "..." : "Ajouter"}
          </button>

        </div>
      </div>
    </main>
  );
}
