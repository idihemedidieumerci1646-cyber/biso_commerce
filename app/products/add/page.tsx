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
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:py-8">

        <div className="mb-7">

          <div className="mb-4 flex items-center gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <PackagePlus size={24} />
            </div>

            <div>

              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Nouveau produit
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Ajoutez un produit à votre stock
              </p>

            </div>

          </div>

          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Ajoutez facilement vos produits, calculez votre stock réel
            et connaissez automatiquement votre bénéfice.
          </p>

        </div>

        {/* ======================================================
            GUIDE PRINCIPAL
        ====================================================== */}

        <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between gap-4 p-4 sm:p-5">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Info size={22} />
              </div>

              <div className="min-w-0">

                <h2 className="font-black text-slate-900">
                  Guide d'ajout
                </h2>

                <p className="text-xs text-slate-500">
                  Apprenez à ajouter votre stock sans vous tromper
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-indigo-700"
            >
              {showGuide ? "Fermer" : "Voir le guide"}
            </button>

          </div>

          {showGuide && (
            <div className="border-t border-slate-100 p-4 sm:p-6">

              {/* INTRODUCTION */}

              <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">

                <div className="flex gap-3">

                  <Sparkles
                    className="mt-0.5 shrink-0 text-indigo-600"
                    size={20}
                  />

                  <div>

                    <h3 className="font-black text-slate-900">
                      Bienvenue dans l'ajout de produit
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Ce guide vous accompagne étape par étape.
                      Vous n'avez pas besoin de connaître
                      l'informatique pour utiliser cette page.
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Avant de commencer, il faut simplement savoir
                      si le produit que vous voulez ajouter est
                      <strong className="text-slate-900">
                        {" "}un nouveau stock que vous venez d'acheter
                      </strong>
                      {" "}ou
                      <strong className="text-slate-900">
                        {" "}un produit que vous aviez déjà dans votre boutique.
                      </strong>
                    </p>

                  </div>

                </div>

              </div>

              {/* CHOISIR SON CAS */}

              <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                <div className="mb-4 flex items-center gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 font-black text-indigo-600">
                    ?
                  </div>

                  <div>

                    <h3 className="font-black text-slate-900">
                      Quel est votre cas ?
                    </h3>

                    <p className="text-xs text-slate-500">
                      Choisissez la situation qui correspond à votre boutique.
                    </p>

                  </div>

                </div>

                <div className="space-y-3">

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">

                    <p className="font-black text-slate-900">
                      🆕 CAS 1 — Je viens d'acheter ce stock
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Choisissez ce cas lorsque vous venez d'acheter
                      les produits auprès de votre fournisseur et
                      que vous voulez les enregistrer dans BISO-COMMERCE.
                    </p>

                    <div className="mt-3 rounded-xl bg-white p-3">

                      <p className="text-xs font-bold text-indigo-600">
                        Exemple
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Vous venez d'acheter 5 cartons de boissons.
                        Chaque carton contient 24 bouteilles.
                        Vous avez payé 100 000 FC pour les 5 cartons.
                      </p>

                    </div>

                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">

                    <p className="font-black text-slate-900">
                      📦 CAS 2 — Le produit était déjà dans ma boutique
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Choisissez ce cas lorsque vous utilisiez déjà
                      votre boutique avant BISO-COMMERCE et que le
                      produit se trouve déjà dans votre stock.
                    </p>

                    <div className="mt-3 rounded-xl bg-white p-3">

                      <p className="text-xs font-bold text-emerald-600">
                        Exemple très important
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Vous aviez acheté 200 bouteilles dans le passé.
                        Vous en avez déjà vendu 150.
                        Il vous reste actuellement 50 bouteilles.
                      </p>

                      <p className="mt-2 text-sm font-black text-slate-900">
                        Dans BISO-COMMERCE, vous devez enregistrer :
                        50 bouteilles.
                      </p>

                    </div>

                  </div>

                </div>

              </div>

              {/* RÈGLE ESSENTIELLE */}

              <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4">

                <div className="flex gap-3">

                  <Info
                    size={21}
                    className="mt-0.5 shrink-0 text-red-600"
                  />

                  <div>

                    <h3 className="font-black text-slate-900">
                      ⚠️ Règle très importante pour un ancien stock
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Si le produit était déjà dans votre boutique,
                      <strong className="text-slate-900">
                        {" "}n'indiquez pas la quantité que vous aviez
                        achetée dans le passé.
                      </strong>
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Indiquez uniquement la quantité que vous possédez
                      <strong className="text-slate-900">
                        {" "}actuellement dans votre boutique.
                      </strong>
                    </p>

                    <div className="mt-3 space-y-2 rounded-xl bg-white p-3 text-sm">

                      <p className="text-red-600">
                        ❌ Vous aviez acheté : 200
                      </p>

                      <p className="text-red-600">
                        ❌ Vous avez déjà vendu : 150
                      </p>

                      <p className="font-black text-emerald-600">
                        ✅ Il vous reste : 50
                      </p>

                      <div className="border-t border-slate-100 pt-2">

                        <p className="font-black text-slate-900">
                          Quantité à inscrire dans BISO-COMMERCE : 50
                        </p>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

              {/* ÉTAPE 1 */}

              <GuideStep
                number="1"
                color="indigo"
                title="Nom du produit"
              >
                <p className="text-sm leading-6 text-slate-600">
                  Écrivez le nom qui permettra de reconnaître
                  facilement le produit dans votre stock.
                </p>

                <div className="mt-3 rounded-xl bg-slate-50 p-3">

                  <p className="mb-2 text-xs font-bold text-slate-500">
                    Exemples :
                  </p>

                  <div className="space-y-1 text-sm text-slate-600">
                    <p>🥤 Coca-Cola 33cl</p>
                    <p>💊 Paracétamol 500mg</p>
                    <p>🍚 Riz 25kg</p>
                  </div>

                </div>
              </GuideStep>

              {/* ÉTAPE 2 */}

              <GuideStep
                number="2"
                color="purple"
                title="Type d'unité"
              >
                <p className="text-sm leading-6 text-slate-600">
                  Choisissez comment votre produit est conditionné.
                </p>

                <div className="mt-3 space-y-2">

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-bold text-slate-900">
                      🧴 Pièce
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Le produit est compté directement pièce par pièce.
                      Exemple : 20 bouteilles.
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-bold text-slate-900">
                      📦 Carton
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Exemple : 1 carton contient 24 bouteilles.
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-bold text-slate-900">
                      📦 Boîte
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Exemple : 1 boîte contient 100 comprimés.
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-bold text-slate-900">
                      🛍️ Sachet
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Exemple : 1 sachet contient plusieurs pièces.
                    </p>
                  </div>

                </div>
              </GuideStep>

              {/* ÉTAPE 3 */}

              <GuideStep
                number="3"
                color="emerald"
                title="Quantité"
              >
                <p className="text-sm leading-6 text-slate-600">
                  La quantité dépend de votre situation.
                </p>

                <div className="mt-4 space-y-3">

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                    <p className="font-black text-indigo-600">
                      🆕 Si c'est un nouveau stock
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Indiquez la quantité que vous venez d'acheter.
                    </p>

                    <p className="mt-2 font-black text-slate-900">
                      Exemple : 5 cartons → Quantité = 5
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="font-black text-emerald-600">
                      📦 Si le produit existait déjà
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Indiquez uniquement la quantité qui vous reste
                      aujourd'hui dans votre boutique.
                    </p>

                    <p className="mt-2 font-black text-slate-900">
                      Exemple : il reste 50 bouteilles → Quantité = 50
                    </p>
                  </div>

                </div>
              </GuideStep>

              {/* FIN DU GUIDE */}

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">

                <div className="flex gap-3">

                  <CheckCircle
                    size={20}
                    className="mt-0.5 shrink-0 text-blue-600"
                  />

                  <div>

                    <p className="font-black text-slate-900">
                      Vous êtes prêt
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Une fois le guide compris, fermez-le et remplissez
                      simplement le formulaire ci-dessous. BISO-COMMERCE
                      calculera automatiquement votre stock réel et votre
                      bénéfice potentiel.
                    </p>

                  </div>

                </div>

              </div>

              {/* BOUTON J'AI COMPRIS */}

              <div className="mt-6 border-t border-slate-100 pt-5">

                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="w-full rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.99]"
                >
                  ✓ J'ai compris
                </button>

                <p className="mt-2 text-center text-xs text-slate-400">
                  Cliquez ici lorsque vous avez terminé de lire le guide.
                </p>

              </div>

            </div>
          )}

        </div>

        {/* ======================================================
            FORMULAIRE PRINCIPAL
        ====================================================== */}

        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">

          {/* NOM DU PRODUIT */}

          <div>

            <label className="mb-2 block text-xs font-bold text-slate-700">
              Nom du produit
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exemple : Coca-Cola 33cl"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            />

            <p className="mt-2 text-xs leading-5 text-slate-400">
              Donnez un nom simple qui permettra de retrouver facilement
              le produit dans votre stock.
            </p>

          </div>

          {/* SITUATION DU STOCK */}

          <div>

            <label className="mb-2 block text-xs font-bold text-slate-700">
              Situation du stock
            </label>

            <p className="mb-3 text-xs leading-5 text-slate-400">
              Cette question permet à BISO-COMMERCE de comprendre si vous
              venez d'acheter le produit ou si vous l'aviez déjà dans votre
              boutique avant d'utiliser l'application.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              {/* NOUVEAU STOCK */}

              <button
                type="button"
                onClick={() => setStockMode("nouveau")}
                className={`rounded-2xl border p-4 text-left transition ${
                  stockMode === "nouveau"
                    ? "border-indigo-500 bg-indigo-50 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                }`}
              >

                <div className="flex items-start gap-3">

                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      stockMode === "nouveau"
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-white text-slate-400"
                    }`}
                  >
                    🆕
                  </div>

                  <div>

                    <p className="font-black text-slate-900">
                      Nouveau stock
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Je viens d'acheter ce produit.
                    </p>

                  </div>

                </div>

              </button>

              {/* STOCK EXISTANT */}

              <button
                type="button"
                onClick={() => setStockMode("existant")}
                className={`rounded-2xl border p-4 text-left transition ${
                  stockMode === "existant"
                    ? "border-emerald-500 bg-emerald-50 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                }`}
              >

                <div className="flex items-start gap-3">

                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      stockMode === "existant"
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-white text-slate-400"
                    }`}
                  >
                    📦
                  </div>

                  <div>

                    <p className="font-black text-slate-900">
                      Stock déjà existant
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      J'avais déjà ce produit dans ma boutique.
                    </p>

                  </div>

                </div>

              </button>

            </div>

            {/* EXPLICATION NOUVEAU STOCK */}

            {stockMode === "nouveau" && (

              <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">

                <div className="flex gap-3">

                  <div className="mt-0.5 shrink-0 text-xl">
                    🆕
                  </div>

                  <div>

                    <p className="text-sm font-black text-indigo-600">
                      Vous venez d'acheter ce produit
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Indiquez la quantité que vous venez d'acheter,
                      le montant total payé au fournisseur et votre prix
                      de vente par pièce.
                    </p>

                    <p className="mt-3 text-xs font-bold text-slate-900">
                      Exemple :
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Vous achetez 5 cartons contenant chacun 24 bouteilles.
                    </p>

                    <p className="mt-2 text-sm font-black text-indigo-600">
                      5 × 24 = 120 bouteilles
                    </p>

                  </div>

                </div>

              </div>

            )}

            {/* EXPLICATION STOCK EXISTANT */}

            {stockMode === "existant" && (

              <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50">

                <div className="p-4">

                  <div className="flex gap-3">

                    <div className="mt-0.5 shrink-0 text-xl">
                      📦
                    </div>

                    <div>

                      <p className="text-sm font-black text-emerald-600">
                        Vous aviez déjà ce produit avant BISO-COMMERCE
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        Aucun problème. Vous n'avez pas besoin de retrouver
                        tous vos anciens achats ni les quantités que vous
                        avez déjà vendues.
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        Regardez simplement combien de pièces de ce produit
                        vous avez actuellement dans votre boutique et
                        indiquez cette quantité.
                      </p>

                    </div>

                  </div>

                </div>

                <div className="border-t border-emerald-100 bg-white/70 p-4">

                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                    Exemple concret
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Vous aviez déjà acheté des bouteilles Coca-Cola avant
                    d'utiliser BISO-COMMERCE.
                  </p>

                  <div className="mt-3 space-y-2">

                    <div className="flex items-start gap-2">

                      <CheckCircle
                        size={16}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />

                      <p className="text-xs leading-5 text-slate-600">
                        Vous avez actuellement
                        <strong className="text-slate-900">
                          {" "}50 bouteilles
                        </strong>
                        {" "}dans la boutique.
                      </p>

                    </div>

                    <div className="flex items-start gap-2">

                      <CheckCircle
                        size={16}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />

                      <p className="text-xs leading-5 text-slate-600">
                        Choisissez
                        <strong className="text-emerald-600">
                          {" "}« Stock déjà existant »
                        </strong>
                        .
                      </p>

                    </div>

                    <div className="flex items-start gap-2">

                      <CheckCircle
                        size={16}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />

                      <p className="text-xs leading-5 text-slate-600">
                        Dans quantité, écrivez simplement
                        <strong className="text-slate-900">
                          {" "}50
                        </strong>
                        .
                      </p>

                    </div>

                  </div>

                  <div className="mt-4 rounded-xl bg-emerald-50 p-3">

                    <p className="text-xs font-bold text-emerald-600">
                      ✅ Résultat
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      BISO-COMMERCE commencera à suivre votre stock
                      à partir de ces 50 pièces.
                    </p>

                  </div>

                </div>

              </div>

            )}

          </div>

          {/* TYPE D'UNITÉ */}

          <div>

            <label className="mb-2 block text-xs font-bold text-slate-700">
              Type d'unité
            </label>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
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

            <p className="mt-2 text-xs leading-5 text-slate-400">
              Choisissez l'unité dans laquelle vous comptez votre stock.
            </p>

          </div>

          {/* QUANTITÉ */}

          <div>

            <label className="mb-2 block text-xs font-bold text-slate-700">
              {stockMode === "existant"
                ? "Quantité actuellement disponible"
                : "Quantité achetée"}
            </label>

            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={
                type === "Pièce"
                  ? "Exemple : 50"
                  : `Nombre de ${type}(s)`
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            />

            {stockMode === "existant" ? (
              <p className="mt-2 text-xs leading-5 text-emerald-600">
                💡 Écrivez uniquement la quantité qui vous reste
                actuellement dans votre boutique.
              </p>
            ) : (
              <p className="mt-2 text-xs leading-5 text-slate-400">
                💡 Écrivez combien d'unités vous venez d'acheter.
              </p>
            )}

          </div>

          {/* NOMBRE DE PIÈCES PAR UNITÉ */}

          {type !== "Pièce" && (

            <div>

              <label className="mb-2 block text-xs font-bold text-slate-700">
                Nombre de pièces dans {type}
              </label>

              <input
                type="number"
                min="1"
                value={piecesPerUnit}
                onChange={(e) => setPiecesPerUnit(e.target.value)}
                placeholder="Exemple : 24"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />

              <p className="mt-2 text-sm font-bold text-indigo-600">
                💡 Exemple : 1 carton = 24 bouteilles → écrivez 24
              </p>

              <div className="mt-3 rounded-xl bg-slate-50 p-3">

                <p className="text-xs leading-5 text-slate-500">
                  BISO-COMMERCE calculera automatiquement le nombre
                  total de pièces.
                </p>

                <p className="mt-2 text-sm font-black text-slate-900">
                  {Number(quantity || 0)} ×{" "}
                  {Number(piecesPerUnit || 1)} ={" "}
                  {totalPieces} pièce(s)
                </p>

              </div>

            </div>

          )}

          {/* PRIX D'ACHAT TOTAL */}

          <div>

            <label className="mb-2 block text-xs font-bold text-slate-700">
              Prix d'achat total
            </label>

            <input
              type="number"
              min="0"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="Exemple : 100000"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            />

            <p className="mt-2 text-xs leading-5 text-slate-400">
              {stockMode === "existant"
                ? "Indiquez la valeur d'achat correspondant au stock que vous avez actuellement."
                : "Indiquez le montant total payé au fournisseur pour cet achat."}
            </p>

            <div className="mt-3 rounded-xl bg-amber-50 p-3">

              <p className="text-xs font-bold text-amber-600">
                💡 Exemple
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                Si vous avez payé 100 000 FC pour votre stock,
                écrivez simplement :
              </p>

              <p className="mt-2 text-sm font-black text-slate-900">
                100000
              </p>

            </div>

          </div>

          {/* PRIX DE VENTE */}

          <div>

            <label className="mb-2 block text-xs font-bold text-slate-700">
              Prix de vente par pièce
            </label>

            <input
              type="number"
              min="0"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              placeholder="Exemple : 2000"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            />

            <p className="mt-2 text-xs leading-5 text-slate-400">
              Il s'agit du prix auquel vous comptez vendre une seule
              pièce au client.
            </p>

          </div>

          {/* MONNAIE */}

          <div>

            <label className="mb-2 block text-xs font-bold text-slate-700">
              Monnaie
            </label>

            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            >

              <option value="FC">
                Franc congolais (FC)
              </option>

              <option value="USD">
                Dollar américain (USD)
              </option>

            </select>

          </div>

          {/* ======================================================
              RÉSUMÉ AUTOMATIQUE
          ====================================================== */}

          <div className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-slate-50">

            <div className="border-b border-slate-200 p-4">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <TrendingUp size={20} />
                </div>

                <div>

                  <h2 className="font-black text-slate-900">
                    Résumé automatique
                  </h2>

                  <p className="text-xs text-slate-500">
                    BISO-COMMERCE calcule automatiquement vos résultats
                  </p>

                </div>

              </div>

            </div>

            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">

              {/* STOCK RÉEL */}

              <SummaryCard
                icon={<Boxes size={16} />}
                title="Stock réel"
              >
                <p className="text-xl font-black text-slate-900">
                  {totalPieces}
                </p>

                <p className="text-xs text-slate-500">
                  pièce(s) disponibles
                </p>
              </SummaryCard>

              {/* COÛT PAR PIÈCE */}

              <SummaryCard
                icon={<CircleDollarSign size={16} />}
                title="Coût par pièce"
              >
                <p className="text-xl font-black text-slate-900">
                  {Math.round(pricePerPiece)} {currency}
                </p>

                <p className="text-xs text-slate-500">
                  coût réel d'une pièce
                </p>
              </SummaryCard>

              {/* BÉNÉFICE PAR PIÈCE */}

              <SummaryCard
                icon={<TrendingUp size={16} />}
                title="Bénéfice par pièce"
              >
                <p
                  className={`text-xl font-black ${
                    profitPerPiece >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {Math.round(profitPerPiece)} {currency}
                </p>

                <p className="text-xs text-slate-500">
                  gain estimé sur une pièce
                </p>
              </SummaryCard>

              {/* BÉNÉFICE TOTAL */}

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">

                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">

                  <Sparkles size={16} />

                  Bénéfice potentiel total

                </div>

                <p
                  className={`text-xl font-black ${
                    totalProfit >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {Math.round(totalProfit)} {currency}
                </p>

                <p className="text-xs text-slate-500">
                  si tout le stock est vendu
                </p>

              </div>

            </div>

            {/* RAPPEL */}

            <div className="mx-4 mb-4 rounded-2xl border border-slate-200 bg-white p-4">

              <div className="flex gap-3">

                <CheckCircle
                  size={20}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <div>

                  <p className="text-sm font-bold text-slate-900">
                    Avant d'ajouter le produit
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Vérifiez le nom, la situation du stock, la quantité,
                    le prix d'achat, le prix de vente et la monnaie.
                  </p>

                  {stockMode === "existant" && (

                    <p className="mt-2 text-xs font-bold leading-5 text-emerald-600">
                      📦 Vous avez choisi « Stock déjà existant » :
                      la quantité indiquée doit correspondre à ce que
                      vous avez actuellement dans votre boutique.
                    </p>

                  )}

                </div>

              </div>

            </div>

          </div>

          {/* ======================================================
              BOUTON AJOUTER LE PRODUIT
          ====================================================== */}

          <button
            type="button"
            onClick={saveProduct}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 p-4 font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >

            {loading ? (
              <>
                <Loader2
                  size={20}
                  className="animate-spin"
                />

                Ajout du produit...
              </>
            ) : (
              <>
                <PackagePlus size={20} />

                Ajouter le produit
              </>
            )}

          </button>

          {/* PETIT RAPPEL */}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

            <div className="flex items-start gap-3">

              <Info
                size={18}
                className="mt-0.5 shrink-0 text-indigo-600"
              />

              <div>

                <p className="text-sm font-bold text-slate-900">
                  Un doute avant de confirmer ?
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Vérifiez simplement que la quantité correspond bien
                  au stock que vous avez réellement dans votre boutique.
                  Une fois le produit ajouté, BISO-COMMERCE pourra suivre
                  les ventes et mettre à jour votre stock.
                </p>

              </div>

            </div>

          </div>

          <p className="pb-2 text-center text-xs text-slate-400">
            Vérifiez les informations avant de confirmer l'ajout.
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
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">

      <div className="mb-3 flex items-center gap-3">

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black ${colorClass}`}
        >
          {number}
        </div>

        <h3 className="font-black text-slate-900">
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4">

      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">

        {icon}

        {title}

      </div>

      {children}

    </div>
  );
}