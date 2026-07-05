"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AddProductPage() {
  const [name, setName] = useState("");
  const [type, setType] = useState("Pièce");
  const [quantity, setQuantity] = useState("");
  const [piecesPerUnit, setPiecesPerUnit] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [currency, setCurrency] = useState("FC");
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const saveProduct = async () => {
    // Logique intelligente : 
    // Si c'est une pièce ou si le champ est vide, on considère 1 unité.
    // Sinon, on calcule le stock total en pièces.
    const nPieces = (type !== "Pièce" && piecesPerUnit) ? Number(piecesPerUnit) : 1;
    const totalStock = Number(quantity) * nPieces;
    const unitCost = Number(buyPrice) / totalStock;

    if (!name || !quantity || !buyPrice || !sellPrice) {
      alert("Veuillez remplir tous les champs.");
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

    if (userError || !user?.id) {
      alert("Utilisateur introuvable");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("products").insert({
      user_id: user.id,
      name,
      unit: type,
      stock: totalStock,
      initial_stock: totalStock,
      purchase_price: unitCost,
      selling_price: Number(sellPrice),
      currency,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Produit ajouté avec succès ✅");

    setName("");
    setQuantity("");
    setBuyPrice("");
    setSellPrice("");
    setPiecesPerUnit("");
  };

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">➕ Nouveau produit</h1>
          <button 
            onClick={() => setShowGuide(!showGuide)}
            className="text-xs bg-green-600 px-3 py-1 rounded-full font-bold"
          >
            {showGuide ? "Fermer l'aide" : "Comment ajouter ?"}
          </button>
        </div>

        {/* GUIDE DE L'UTILISATEUR */}
        {showGuide && (
          <div className="bg-slate-800 p-5 rounded-2xl mb-6 text-sm border border-green-500/30">
            <h3 className="font-bold text-green-400 mb-2">Guide d'utilisation :</h3>
            <ul className="list-decimal pl-4 space-y-2 text-slate-300">
              <li><b>Quantité :</b> Indiquez le nombre de cartons ou boîtes achetés.</li>
              <li><b>Combien dedans ? :</b> Si vous vendez au détail, tapez le nombre de pièces contenues dans 1 carton. <i>Laissez vide si vous vendez uniquement le carton entier.</i></li>
              <li><b>Prix d'achat TOTAL :</b> Le prix payé pour la totalité des cartons achetés.</li>
              <li><b>Prix de vente :</b> Le prix de vente d'une seule unité (ou du carton).</li>
            </ul>
          </div>
        )}

        <div className="bg-slate-900 p-4 rounded-2xl space-y-3">
          <input
            className="w-full p-3 rounded-xl bg-black border border-white/10 text-white placeholder:text-slate-400"
            style={{ color: "#fff", WebkitTextFillColor: "#fff", caretColor: "#fff" }}
            placeholder="Nom du produit"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <select
            className="w-full p-3 rounded-xl bg-black border border-white/10 text-white"
            style={{ color: "#fff", WebkitTextFillColor: "#fff" }}
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
            className="w-full p-3 rounded-xl bg-black border border-white/10 text-white placeholder:text-slate-400"
            style={{ color: "#fff", WebkitTextFillColor: "#fff", caretColor: "#fff" }}
            placeholder={`Nombre de ${type}(s) acheté(s)`}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          {type !== "Pièce" && (
            <input
              type="number"
              className="w-full p-3 rounded-xl bg-black border border-white/10 text-white placeholder:text-slate-400"
              style={{ color: "#fff", WebkitTextFillColor: "#fff", caretColor: "#fff" }}
              placeholder={`Combien de pièces dans un(e) ${type} ?`}
              value={piecesPerUnit}
              onChange={(e) => setPiecesPerUnit(e.target.value)}
            />
          )}

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              className="p-3 rounded-xl bg-black border border-white/10 text-white placeholder:text-slate-400"
              style={{ color: "#fff", WebkitTextFillColor: "#fff", caretColor: "#fff" }}
              placeholder="Prix d'Achat TOTAL"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
            />

            <input
              type="number"
              className="p-3 rounded-xl bg-black border border-white/10 text-white placeholder:text-slate-400"
              style={{ color: "#fff", WebkitTextFillColor: "#fff", caretColor: "#fff" }}
              placeholder="Prix de Vente"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
            />
          </div>

          <select
            className="w-full p-3 rounded-xl bg-black border border-white/10 text-white"
            style={{ color: "#fff", WebkitTextFillColor: "#fff" }}
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
            {loading ? "..." : "Ajouter le produit"}
          </button>
        </div>
      </div>
    </main>
  );
}