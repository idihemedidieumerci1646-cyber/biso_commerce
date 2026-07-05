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
  const [piecesPerUnit, setPiecesPerUnit] = useState("");
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

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

    if (error || !data) {
      alert("Erreur chargement produit");
      setLoading(false);
      return;
    }

    setName(data.name || "");
    setStock(String(data.stock ?? 0));
    setPurchasePrice(String(data.purchase_price ?? 0));
    setSellingPrice(String(data.selling_price ?? 0));
    setUnit(data.unit || "Pièce");
    setCurrency(data.currency || "FC");
    setPiecesPerUnit(String(data.pieces_per_unit ?? 1));
    setLoading(false);
  };

  const updateProduct = async () => {
    // Calcul identique à la page Ajout pour garder la cohérence
    const nPieces = (unit !== "Pièce" && piecesPerUnit) ? Number(piecesPerUnit) : 1;
    // Si vous modifiez le stock, le système considère la nouvelle valeur totale en pièces
    
    const { error } = await supabase
      .from("products")
      .update({
        name,
        stock: Number(stock),
        purchase_price: Number(purchasePrice),
        selling_price: Number(sellingPrice),
        unit,
        currency,
        pieces_per_unit: nPieces,
      })
      .eq("id", id);

    if (error) {
      alert("Erreur update: " + error.message);
      return;
    }

    alert("Produit modifié avec succès ✅");
    router.push("/products");
  };

  if (loading) return <main className="min-h-screen bg-black flex items-center justify-center text-white">Chargement...</main>;

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">✏️ Modifier le produit</h1>
          <button onClick={() => setShowGuide(!showGuide)} className="text-xs bg-green-600 px-3 py-1 rounded-full font-bold">
            {showGuide ? "Fermer l'aide" : "Comment modifier ?"}
          </button>
        </div>

        {/* GUIDE INTELLIGENT */}
        {showGuide && (
          <div className="bg-slate-800 p-5 rounded-2xl mb-6 text-sm border border-green-500/30">
            <h3 className="font-bold text-green-400 mb-2">Guide de modification :</h3>
            <ul className="list-decimal pl-4 space-y-2 text-slate-300">
              <li><b>Stock :</b> Le nombre total de pièces en stock.</li>
              <li><b>Pièces par unité :</b> Si vous avez changé la composition d'un carton, mettez cette valeur à jour ici.</li>
              <li>Le système recalculera vos prix et stocks automatiquement.</li>
            </ul>
          </div>
        )}

        <div className="bg-slate-900 p-4 rounded-2xl space-y-4">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 rounded-xl bg-black border border-white/10" placeholder="Nom du produit" />
          
          <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full p-3 rounded-xl bg-black border border-white/10" placeholder="Stock total (en pièces)" />

          {unit !== "Pièce" && (
            <input type="number" value={piecesPerUnit} onChange={(e) => setPiecesPerUnit(e.target.value)} className="w-full p-3 rounded-xl bg-black border border-white/10" placeholder="Combien de pièces dans une unité ?" />
          )}

          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="p-3 rounded-xl bg-black border border-white/10" placeholder="Prix achat" />
            <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="p-3 rounded-xl bg-black border border-white/10" placeholder="Prix vente" />
          </div>

          <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full p-3 rounded-xl bg-black border border-white/10">
            <option>Pièce</option><option>Carton</option><option>Boîte</option><option>Sachet</option><option>Kg</option>
          </select>

          <button onClick={updateProduct} className="w-full bg-green-600 p-3 rounded-xl font-bold">
            💾 Enregistrer les modifications
          </button>
        </div>
      </div>
    </main>
  );
}