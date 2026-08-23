"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  PackagePlus,
  Loader2,
  CheckCircle,
  Info,
  Sparkles,
  Boxes,
  CircleDollarSign,
  TrendingUp,
} from "lucide-react";

export default function AddProductPage() {
  const [name, setName] = useState("");
  const [type, setType] = useState("Pièce");
  const [quantity, setQuantity] = useState("");

  // Nombre de pièces dans un carton / boîte / sachet
  const [piecesPerUnit, setPiecesPerUnit] = useState("1");

  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [currency, setCurrency] = useState("FC");

  const [loading, setLoading] = useState(false);

  // Situation du stock
  const [stockMode, setStockMode] = useState<
    "nouveau" | "existant"
  >("nouveau");

  // Affichage du guide
  const [showGuide, setShowGuide] = useState(false);

  // ==========================================================
  // CALCUL AUTOMATIQUE
  // ==========================================================

  const totalPieces =
    type !== "Pièce"
      ? Number(quantity || 0) * Number(piecesPerUnit || 1)
      : Number(quantity || 0);

  const pricePerPiece =
    totalPieces > 0
      ? Number(buyPrice || 0) / totalPieces
      : 0;

  const profitPerPiece =
    Number(sellPrice || 0) - pricePerPiece;

  const totalProfit =
    profitPerPiece * totalPieces;

  // ==========================================================
  // ENREGISTRER LE PRODUIT
  // ==========================================================

  const saveProduct = async () => {
    if (!name || !quantity || !buyPrice || !sellPrice) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const nPieces =
      type !== "Pièce"
        ? Number(piecesPerUnit || 1)
        : 1;

    if (Number(quantity) <= 0) {
      alert("La quantité doit être supérieure à 0");
      return;
    }

    if (nPieces <= 0) {
      alert(
        "Le nombre de pièces dans l'unité doit être supérieur à 0"
      );
      return;
    }

    if (Number(buyPrice) < 0 || Number(sellPrice) < 0) {
      alert("Les prix ne peuvent pas être négatifs");
      return;
    }

    const totalStock =
      Number(quantity) * nPieces;

    if (totalStock <= 0) {
      alert("Le stock doit être supérieur à 0");
      return;
    }

    const unitCost =
      Number(buyPrice) / totalStock;

    let userId: string | null =
      localStorage.getItem("user_id");

    if (!userId) {
      const phone =
        localStorage.getItem("phone");

      if (!phone) {
        alert("Utilisateur non connecté");
        return;
      }

      const {
        data: user,
        error: userError,
      } = await supabase
        .from("users")
        .select("id")
        .eq("phone", phone)
        .single();

      if (userError || !user) {
        alert("Utilisateur introuvable");
        return;
      }

      userId = user.id;

      if (userId) {
        localStorage.setItem(
          "user_id",
          userId
        );
      }
    }

    setLoading(true);

    const productData = {
      id: crypto.randomUUID(),
      user_id: userId,
      name,
      unit: type,
      stock: totalStock,
      initial_stock: totalStock,
      purchase_price: unitCost,
      selling_price: Number(sellPrice),
      currency,
      created_at: new Date().toISOString(),
    };

    const result = await supabase
      .from("products")
      .insert(productData);

    if (result.error) {
      alert(result.error.message);
      setLoading(false);
      return;
    }

    if (stockMode === "existant") {
      alert(
        `Produit existant ajouté avec succès ✅\n\nStock enregistré : ${totalStock} pièce(s).`
      );
    } else {
      alert("Produit ajouté avec succès ✅");
    }

    setName("");
    setQuantity("");
    setBuyPrice("");
    setSellPrice("");
    setPiecesPerUnit("1");
    setStockMode("nouveau");

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">

      {/* ======================================================
          CONTENEUR PRINCIPAL
      ====================================================== */}

      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-5 sm:py-6">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="mb-4">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <PackagePlus size={21} />
            </div>

            <div className="min-w-0">

              <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Nouveau produit
              </h1>

              <p className="mt-0.5 text-xs text-slate-500">
                Ajoutez un produit à votre stock
              </p>

            </div>

          </div>

        </div>

        {/* ====================================================
            GUIDE
        ==================================================== */}

        <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between gap-2 p-3">

            <div className="flex min-w-0 items-center gap-2">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Info size={19} />
              </div>

              <div className="min-w-0">

                <h2 className="text-sm font-black text-slate-900">
                  Guide d'ajout
                </h2>

                <p className="truncate text-[11px] text-slate-500">
                  Comment ajouter votre stock
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="shrink-0 rounded-xl bg-indigo-600 px-3 py-2 text-[11px] font-black text-white transition active:scale-95"
            >
              {showGuide ? "Fermer" : "Voir le guide"}
            </button>

          </div>

          {showGuide && (

            <div className="border-t border-slate-100 p-3">

              {/* INTRODUCTION */}

              <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3">

                <div className="flex gap-2.5">

                  <Sparkles
                    className="mt-0.5 shrink-0 text-indigo-600"
                    size={18}
                  />

                  <div>

                    <h3 className="text-sm font-black text-slate-900">
                      Bienvenue
                    </h3>

                    <p className="mt-1.5 text-xs leading-5 text-slate-600">
                      Ce guide vous explique simplement comment
                      ajouter un produit et enregistrer correctement
                      votre stock.
                    </p>

                  </div>

                </div>

              </div>

              {/* SITUATION */}

              <GuideStep
                number="1"
                color="indigo"
                title="Choisissez votre situation"
              >

                <div className="space-y-2">

                  <div className="rounded-xl bg-indigo-50 p-3">

                    <p className="text-sm font-black text-slate-900">
                      🆕 Nouveau stock
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Vous venez d'acheter le produit auprès
                      de votre fournisseur.
                    </p>

                    <div className="mt-2 rounded-lg bg-white p-2.5">

                      <p className="text-[11px] font-bold text-indigo-600">
                        Exemple
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        5 cartons × 24 bouteilles = 120 bouteilles.
                      </p>

                    </div>

                  </div>

                  <div className="rounded-xl bg-emerald-50 p-3">

                    <p className="text-sm font-black text-slate-900">
                      📦 Stock déjà existant
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Le produit était déjà dans votre boutique
                      avant BISO-COMMERCE.
                    </p>

                    <div className="mt-2 rounded-lg bg-white p-2.5">

                      <p className="text-[11px] font-bold text-emerald-600">
                        Exemple
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Vous avez actuellement 50 bouteilles.
                        Vous devez inscrire 50.
                      </p>

                    </div>

                  </div>

                </div>

              </GuideStep>

              {/* NOM */}

              <GuideStep
                number="2"
                color="purple"
                title="Nom du produit"
              >

                <p className="text-xs leading-5 text-slate-600">
                  Écrivez un nom facile à reconnaître.
                </p>

                <div className="mt-2 rounded-xl bg-slate-50 p-3">

                  <p className="text-xs text-slate-600">
                    🥤 Coca-Cola 33cl
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    💊 Paracétamol 500mg
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    🍚 Riz 25kg
                  </p>

                </div>

              </GuideStep>

              {/* UNITÉ */}

              <GuideStep
                number="3"
                color="indigo"
                title="Type d'unité"
              >

                <div className="space-y-2">

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-900">
                      🧴 Pièce
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      Exemple : 20 bouteilles.
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-900">
                      📦 Carton
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      Exemple : 1 carton = 24 bouteilles.
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-900">
                      📦 Boîte
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      Exemple : 1 boîte = 100 comprimés.
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-900">
                      🛍️ Sachet
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      Exemple : 1 sachet contient plusieurs pièces.
                    </p>
                  </div>

                </div>

              </GuideStep>

              {/* QUANTITÉ */}

              <GuideStep
                number="4"
                color="emerald"
                title="Quantité"
              >

                <div className="space-y-2">

                  <div className="rounded-xl bg-indigo-50 p-3">

                    <p className="text-xs font-black text-indigo-600">
                      🆕 Nouveau stock
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Écrivez la quantité que vous venez d'acheter.
                    </p>

                    <p className="mt-1.5 text-xs font-black text-slate-900">
                      Exemple : 5 cartons → quantité = 5
                    </p>

                  </div>

                  <div className="rounded-xl bg-emerald-50 p-3">

                    <p className="text-xs font-black text-emerald-600">
                      📦 Stock existant
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Écrivez uniquement ce qu'il vous reste
                      aujourd'hui.
                    </p>

                    <p className="mt-1.5 text-xs font-black text-slate-900">
                      Exemple : 50 bouteilles → quantité = 50
                    </p>

                  </div>

                </div>

              </GuideStep>

              {/* PRIX */}

              <GuideStep
                number="5"
                color="purple"
                title="Prix"
              >

                <p className="text-xs leading-5 text-slate-600">
                  Indiquez le montant total payé pour le stock
                  et le prix auquel vous vendrez une pièce.
                </p>

                <div className="mt-2 rounded-xl bg-slate-50 p-3">

                  <p className="text-xs text-slate-600">
                    Achat total : <strong>100000 FC</strong>
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Vente / pièce : <strong>2000 FC</strong>
                  </p>

                </div>

              </GuideStep>

              {/* RAPPEL */}

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">

                <div className="flex gap-2.5">

                  <CheckCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />

                  <div>

                    <p className="text-sm font-black text-slate-900">
                      Vous êtes prêt
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Remplissez simplement le formulaire.
                      BISO-COMMERCE calculera automatiquement
                      votre stock et votre bénéfice.
                    </p>

                  </div>

                </div>

              </div>

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-3 text-xs font-black text-white active:scale-[0.99]"
              >
                ✓ J'ai compris
              </button>

            </div>

          )}

        </div>

        {/* ====================================================
            FORMULAIRE
        ==================================================== */}

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">

          {/* NOM DU PRODUIT */}

          <div>

            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Nom du produit
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exemple : Coca-Cola 33cl"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            />

            <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
              Utilisez un nom simple pour retrouver facilement
              le produit.
            </p>

          </div>

          {/* ==================================================
              SITUATION DU STOCK
          ================================================== */}

          <div>

            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Situation du stock
            </label>

            <div className="grid grid-cols-2 gap-2">

              {/* NOUVEAU */}

              <button
                type="button"
                onClick={() => setStockMode("nouveau")}
                className={`rounded-xl border p-3 text-left transition active:scale-[0.99] ${
                  stockMode === "nouveau"
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >

                <div className="flex items-start gap-2">

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      stockMode === "nouveau"
                        ? "bg-indigo-100"
                        : "bg-white"
                    }`}
                  >
                    🆕
                  </div>

                  <div className="min-w-0">

                    <p className="text-xs font-black text-slate-900">
                      Nouveau
                    </p>

                    <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                      Je viens de l'acheter
                    </p>

                  </div>

                </div>

              </button>

              {/* EXISTANT */}

              <button
                type="button"
                onClick={() => setStockMode("existant")}
                className={`rounded-xl border p-3 text-left transition active:scale-[0.99] ${
                  stockMode === "existant"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >

                <div className="flex items-start gap-2">

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      stockMode === "existant"
                        ? "bg-emerald-100"
                        : "bg-white"
                    }`}
                  >
                    📦
                  </div>

                  <div className="min-w-0">

                    <p className="text-xs font-black text-slate-900">
                      Existant
                    </p>

                    <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                      Je l'avais déjà
                    </p>

                  </div>

                </div>

              </button>

            </div>

            {/* EXPLICATION NOUVEAU */}

            {stockMode === "nouveau" && (

              <div className="mt-2.5 rounded-xl border border-indigo-100 bg-indigo-50 p-3">

                <div className="flex gap-2">

                  <span className="text-lg">
                    🆕
                  </span>

                  <div>

                    <p className="text-xs font-black text-indigo-600">
                      Vous venez d'acheter ce produit
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-slate-600">
                      Indiquez la quantité achetée, le prix d'achat
                      total et votre prix de vente par pièce.
                    </p>

                    <p className="mt-2 text-[11px] font-black text-slate-900">
                      Exemple : 5 cartons × 24 = 120 bouteilles
                    </p>

                  </div>

                </div>

              </div>

            )}

            {/* EXPLICATION EXISTANT */}

            {stockMode === "existant" && (

              <div className="mt-2.5 overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50">

                <div className="p-3">

                  <div className="flex gap-2">

                    <span className="text-lg">
                      📦
                    </span>

                    <div>

                      <p className="text-xs font-black text-emerald-600">
                        Produit déjà présent
                      </p>

                      <p className="mt-1 text-[11px] leading-4 text-slate-600">
                        Indiquez uniquement la quantité que vous
                        avez actuellement dans votre boutique.
                      </p>

                    </div>

                  </div>

                </div>

                <div className="border-t border-emerald-100 bg-white/70 p-3">

                  <p className="text-[11px] font-bold text-emerald-600">
                    Exemple
                  </p>

                  <p className="mt-1 text-[11px] leading-4 text-slate-600">
                    Vous aviez 200 bouteilles et vous en avez
                    vendu 150.
                  </p>

                  <p className="mt-1.5 text-xs font-black text-slate-900">
                    Il reste 50 → inscrivez 50.
                  </p>

                </div>

              </div>

            )}

          </div>

          {/* ==================================================
              TYPE + QUANTITÉ
          ================================================== */}

          <div className="grid grid-cols-2 gap-2">

            {/* TYPE */}

            <div>

              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Type d'unité
              </label>

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              >

                <option value="Pièce">
                  Pièce
                </option>

                <option value="Carton">
                  Carton
                </option>

                <option value="Boîte">
                  Boîte
                </option>

                <option value="Sachet">
                  Sachet
                </option>

              </select>

            </div>

            {/* QUANTITÉ */}

            <div>

              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                {stockMode === "existant"
                  ? "Stock actuel"
                  : "Quantité"}
              </label>

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Exemple : 50"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />

            </div>

          </div>

          {stockMode === "existant" ? (

            <p className="text-[11px] leading-4 text-emerald-600">
              💡 Indiquez uniquement ce qu'il vous reste
              actuellement.
            </p>

          ) : (

            <p className="text-[11px] leading-4 text-slate-400">
              💡 Indiquez combien d'unités vous venez d'acheter.
            </p>

          )}

          {/* ==================================================
              PIÈCES PAR UNITÉ
          ================================================== */}

          {type !== "Pièce" && (

            <div>

              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Pièces dans 1 {type.toLowerCase()}
              </label>

              <input
                type="number"
                min="1"
                value={piecesPerUnit}
                onChange={(e) => setPiecesPerUnit(e.target.value)}
                placeholder="Exemple : 24"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />

              <div className="mt-2 rounded-xl bg-indigo-50 p-2.5">

                <p className="text-[11px] font-bold text-indigo-600">
                  Calcul automatique
                </p>

                <p className="mt-1 text-xs font-black text-slate-900">
                  {Number(quantity || 0)} ×{" "}
                  {Number(piecesPerUnit || 1)} ={" "}
                  {totalPieces} pièce(s)
                </p>

              </div>

            </div>

          )}

          {/* ==================================================
              PRIX
          ================================================== */}

          <div className="grid grid-cols-2 gap-2">

            {/* ACHAT */}

            <div>

              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Achat total
              </label>

              <input
                type="number"
                min="0"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                placeholder="100000"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />

            </div>

            {/* VENTE */}

            <div>

              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Vente / pièce
              </label>

              <input
                type="number"
                min="0"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="2000"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />

            </div>

          </div>

          <p className="text-[11px] leading-4 text-slate-400">
            💡 Achat total = montant payé au fournisseur.
            Vente / pièce = prix auquel vous vendrez une pièce.
          </p>

          {/* ==================================================
              MONNAIE
          ================================================== */}

          <div>

            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Monnaie
            </label>

            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            >

              <option value="FC">
                Franc congolais (FC)
              </option>

              <option value="USD">
                Dollar américain (USD)
              </option>

            </select>

          </div>

          {/* ==================================================
              RÉSUMÉ AUTOMATIQUE
          ================================================== */}

          <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/50">

            <div className="border-b border-indigo-100 p-3">

              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <TrendingUp size={18} />
                </div>

                <div>

                  <h2 className="text-sm font-black text-slate-900">
                    Résumé automatique
                  </h2>

                  <p className="text-[11px] text-slate-500">
                    Calculé automatiquement
                  </p>

                </div>

              </div>

            </div>

            <div className="grid grid-cols-2 gap-2 p-3">

              {/* STOCK */}

              <SummaryCard
                icon={<Boxes size={15} />}
                title="Stock réel"
              >

                <p className="text-lg font-black text-slate-900">
                  {totalPieces}
                </p>

                <p className="text-[11px] text-slate-500">
                  pièce(s)
                </p>

              </SummaryCard>

              {/* COÛT */}

              <SummaryCard
                icon={<CircleDollarSign size={15} />}
                title="Coût / pièce"
              >

                <p className="text-lg font-black text-slate-900">
                  {Math.round(pricePerPiece)} {currency}
                </p>

              </SummaryCard>

              {/* BÉNÉFICE */}

              <SummaryCard
                icon={<TrendingUp size={15} />}
                title="Bénéfice / pièce"
              >

                <p
                  className={`text-lg font-black ${
                    profitPerPiece >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {Math.round(profitPerPiece)} {currency}
                </p>

              </SummaryCard>

              {/* TOTAL */}

              <SummaryCard
                icon={<Sparkles size={15} />}
                title="Bénéfice total"
              >

                <p
                  className={`text-lg font-black ${
                    totalProfit >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {Math.round(totalProfit)} {currency}
                </p>

                <p className="text-[10px] text-slate-500">
                  si tout est vendu
                </p>

              </SummaryCard>

            </div>

            {/* RAPPEL */}

            <div className="mx-3 mb-3 rounded-xl border border-slate-200 bg-white p-3">

              <div className="flex gap-2.5">

                <CheckCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <div>

                  <p className="text-xs font-bold text-slate-900">
                    Avant de confirmer
                  </p>

                  <p className="mt-1 text-[11px] leading-4 text-slate-500">
                    Vérifiez le nom, le stock, la quantité,
                    les prix et la monnaie.
                  </p>

                  {stockMode === "existant" && (

                    <p className="mt-1.5 text-[11px] font-bold leading-4 text-emerald-600">
                      📦 Stock existant : la quantité doit être
                      celle que vous avez actuellement.
                    </p>

                  )}

                </div>

              </div>

            </div>

          </div>

          {/* ==================================================
              BOUTON AJOUTER
          ================================================== */}

          <button
            type="button"
            onClick={saveProduct}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >

            {loading ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />

                Ajout du produit...
              </>
            ) : (
              <>
                <PackagePlus size={18} />

                Ajouter le produit
              </>
            )}

          </button>

          {/* ==================================================
              PETIT RAPPEL
          ================================================== */}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">

            <div className="flex items-start gap-2.5">

              <Info
                size={17}
                className="mt-0.5 shrink-0 text-indigo-600"
              />

              <div>

                <p className="text-xs font-bold text-slate-900">
                  Un doute ?
                </p>

                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Vérifiez que la quantité correspond bien au
                  stock réellement présent dans votre boutique.
                </p>

              </div>

            </div>

          </div>

          <p className="pb-1 text-center text-[10px] text-slate-400">
            Vérifiez les informations avant de confirmer.
          </p>

        </div>

      </div>

    </div>
  );
}

/* ============================================================
   COMPOSANT GUIDE
============================================================ */

function GuideStep({
  number,
  color,
  title,
  children,
}: {
  number: string;
  color: "indigo" | "purple" | "emerald";
  title: string;
  children: React.ReactNode;
}) {
  const colorClass = {
    indigo: "bg-indigo-50 text-indigo-600",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
  }[color];

  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">

      <div className="mb-2.5 flex items-center gap-2.5">

        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${colorClass}`}
        >
          {number}
        </div>

        <h3 className="text-sm font-black text-slate-900">
          {title}
        </h3>

      </div>

      {children}

    </div>
  );
}

/* ============================================================
   COMPOSANT CARTE DU RÉSUMÉ
============================================================ */

function SummaryCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">

      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-500">

        {icon}

        {title}

      </div>

      {children}

    </div>
  );
}