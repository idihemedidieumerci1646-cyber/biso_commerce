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
            
          </button>
        </div>

        {/* GUIDE DE L'UTILISATEUR */}
       {/* GUIDE COMPLET */}
        <div className="bg-slate-900 border border-green-500/50 p-6 rounded-2xl mb-6">
          <h3 className="font-bold text-green-400 mb-4 text-xl">💡 Guide simple pour bien vendre</h3>
          
          <div className="space-y-6 text-sm text-slate-300">
            {/* ÉTAPE 1 */}
            <div>
              <p className="font-bold text-white mb-2">1. Si tu achètes des cartons/boîtes :</p>
              <div className="bg-black p-2 rounded-lg border border-slate-500">
                <p>Ex: 1 carton qui contient 100 médicaments acheté à 20 000 FC.</p>
                <ul className="text-green-400 mt-1">
                  <li>• Quantité : <b>1</b></li>
                  <li>• Nombre de pièces dedans : <b>100</b></li>
                  <li>• Prix d'achat TOTAL : <b>20 000</b></li>
                </ul>
              </div>
            </div>

            {/* ÉTAPE 2 */}
            <div>
              <p className="font-bold text-white mb-2">2. Si tu achètes à la pièce :</p>
              <div className="bg-black p-3 rounded-lg border border-slate-700">
                <p>Ex: 10 stylos achetés à 500 FC au total.</p>
                <ul className="text-green-400 mt-1">
                  <li>• Quantité : <b>10</b></li>
                  <li>• Prix d'achat TOTAL : <b>500</b></li>
                </ul>
              </div>
            </div>

            {/* ÉTAPE 3 */}
            <div>
              <p className="font-bold text-white mb-2">3. Le Prix de Vente :</p>
              <p>Mets ici le prix auquel tu vends <b>une seule unité</b> (ex: 250 FC pour un seul médicament).</p>
            </div>
            
            <p className="text-xs text-slate-500 italic">Le système est magique : il prend ton prix total, le divise, et calcule tout seul ton bénéfice !</p>
          </div>
        </div>

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