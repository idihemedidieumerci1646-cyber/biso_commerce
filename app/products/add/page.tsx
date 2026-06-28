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
    // Validation rapide pour éviter les erreurs de saisie
    if (!name || !quantity || !buyPrice || !sellPrice) {
      return alert("Merci de remplir tous les champs !");
    }

    setLoading(true);

    const { error } = await supabase.from("products").insert({
      name: name,
      unit: type,
      stock: Number(quantity),
      initial_stock: Number(quantity),
      purchase_price: Number(buyPrice),
      selling_price: Number(sellPrice),
      currency: currency,
    });

    setLoading(false);

    if (error) {
      alert("Erreur : " + error.message);
      return;
    }

    alert("Produit ajouté ✅");
    
    // Reset uniquement les champs variables pour enchaîner plus vite
    setName("");
    setQuantity("");
    setBuyPrice("");
    setSellPrice("");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📦 Ajouter un produit</h1>
        <div className="bg-white/10 p-6 rounded-3xl space-y-4">
          
          <input placeholder="Nom du produit (ex: Biscuit)" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-4 rounded-xl bg-white/10" />
          
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-4 rounded-xl text-black">
            <option>Pièce</option><option>Carton</option><option>Boîte</option><option>Sachet</option><option>Bouteille</option><option>Sac</option><option>Kg</option>
          </select>

          <input type="number" placeholder="Quantité en stock" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full p-4 rounded-xl bg-white/10" />
          
          <div className="grid grid-cols-2 gap-4">
            <input type="number" placeholder="Prix achat" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} className="p-4 rounded-xl bg-white/10" />
            <input type="number" placeholder="Prix vente" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} className="p-4 rounded-xl bg-white/10" />
          </div>

          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full p-4 rounded-xl text-black">
            <option value="FC">FC (Franc Congolais)</option>
            <option value="$">$ Dollar</option>
          </select>

          <button onClick={saveProduct} disabled={loading} className="w-full bg-green-600 p-4 rounded-xl font-bold hover:bg-green-500">
            {loading ? "Enregistrement..." : "Ajouter le produit"}
          </button>

        </div>
      </div>
    </main>
  );
}