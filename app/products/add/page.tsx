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

    /*
      NOUVEAU STOCK
      Exemple :
      5 cartons × 24 = 120 pièces

      STOCK EXISTANT
      Exemple :
      Il reste actuellement 50 pièces.
      On enregistre 50 pièces.

      Dans les deux cas, le stock est converti en pièces
      afin que BISO-COMMERCE puisse suivre correctement
      les ventes.
    */

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
    <div className="min-h-screen bg-[#020617] text-white">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">

        <div className="mb-6">

          <div className="mb-3 flex items-center gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-400 text-black shadow-lg">
              <PackagePlus size={24} />
            </div>

            <div>

              <h1 className="text-2xl font-black text-white sm:text-3xl">
                Nouveau produit
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                Ajoutez un produit à votre stock
              </p>

            </div>

          </div>

          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            Ajoutez facilement vos produits, calculez votre stock réel
            et connaissez automatiquement votre bénéfice.
          </p>

        </div>

        {/* ======================================================
            GUIDE PRINCIPAL
        ====================================================== */}

        <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-xl">

          <div className="flex items-center justify-between gap-4 p-4 sm:p-5">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                <Info size={22} />
              </div>

              <div className="min-w-0">

                <h2 className="font-black text-white">
                  Guide d'ajout
                </h2>

                <p className="text-xs text-slate-400">
                  Apprenez à ajouter votre stock sans vous tromper
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="shrink-0 rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-black transition hover:scale-[1.02]"
            >
              {showGuide ? "Fermer" : "Voir le guide"}
            </button>

          </div>

          {showGuide && (
            <div className="border-t border-white/10 p-4 sm:p-6">

              {/* ==================================================
                  INTRODUCTION
              ================================================== */}

              <div className="mb-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">

                <div className="flex gap-3">

                  <Sparkles
                    className="mt-0.5 shrink-0 text-orange-400"
                    size={20}
                  />

                  <div>

                    <h3 className="font-black text-white">
                      Bienvenue dans l'ajout de produit
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Ce guide vous accompagne étape par étape.
                      Vous n'avez pas besoin de connaître
                      l'informatique pour utiliser cette page.
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Avant de commencer, il faut simplement savoir
                      si le produit que vous voulez ajouter est
                      <strong className="text-white">
                        {" "}un nouveau stock que vous venez d'acheter
                      </strong>
                       ou
                      <strong className="text-white">
                        {" "}un produit que vous aviez déjà dans votre boutique.
                      </strong>
                    </p>

                  </div>

                </div>

              </div>

              {/* ==================================================
                  CHOISIR SON CAS
              ================================================== */}

              <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-4 flex items-center gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 font-black text-orange-400">
                    ?
                  </div>

                  <div>

                    <h3 className="font-black text-white">
                      Quel est votre cas ?
                    </h3>

                    <p className="text-xs text-slate-400">
                      Choisissez la situation qui correspond à votre boutique.
                    </p>

                  </div>

                </div>

                <div className="space-y-3">

                  <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">

                    <p className="font-black text-white">
                      🆕 CAS 1 — Je viens d'acheter ce stock
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Choisissez ce cas lorsque vous venez d'acheter
                      les produits auprès de votre fournisseur et
                      que vous voulez les enregistrer dans BISO-COMMERCE.
                    </p>

                    <div className="mt-3 rounded-xl bg-black/20 p-3">

                      <p className="text-xs font-bold text-orange-400">
                        Exemple
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        Vous venez d'acheter 5 cartons de boissons.
                        Chaque carton contient 24 bouteilles.
                        Vous avez payé 100 000 FC pour les 5 cartons.
                      </p>

                    </div>

                  </div>

                  <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">

                    <p className="font-black text-white">
                      📦 CAS 2 — Le produit était déjà dans ma boutique
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Choisissez ce cas lorsque vous utilisiez déjà
                      votre boutique avant BISO-COMMERCE et que le
                      produit se trouve déjà dans votre stock.
                    </p>

                    <div className="mt-3 rounded-xl bg-black/20 p-3">

                      <p className="text-xs font-bold text-green-400">
                        Exemple très important
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        Vous aviez acheté 200 bouteilles dans le passé.
                        Vous en avez déjà vendu 150.
                        Il vous reste actuellement 50 bouteilles.
                      </p>

                      <p className="mt-2 text-sm font-black text-white">
                        Dans BISO-COMMERCE, vous devez enregistrer :
                        50 bouteilles.
                      </p>

                    </div>

                  </div>

                </div>

              </div>

              {/* ==================================================
                  RÈGLE ESSENTIELLE
              ================================================== */}

              <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">

                <div className="flex gap-3">

                  <Info
                    size={21}
                    className="mt-0.5 shrink-0 text-red-400"
                  />

                  <div>

                    <h3 className="font-black text-white">
                      ⚠️ Règle très importante pour un ancien stock
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Si le produit était déjà dans votre boutique,
                      <strong className="text-white">
                        {" "}n'indiquez pas la quantité que vous aviez
                        achetée dans le passé.
                      </strong>
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Indiquez uniquement la quantité que vous possédez
                      <strong className="text-white">
                        {" "}actuellement dans votre boutique.
                      </strong>
                    </p>

                    <div className="mt-3 space-y-2 rounded-xl bg-black/20 p-3 text-sm">

                      <p className="text-red-300">
                        ❌ Vous aviez acheté : 200
                      </p>

                      <p className="text-red-300">
                        ❌ Vous avez déjà vendu : 150
                      </p>

                      <p className="font-black text-green-400">
                        ✅ Il vous reste : 50
                      </p>

                      <div className="border-t border-white/10 pt-2">

                        <p className="font-black text-white">
                          Quantité à inscrire dans BISO-COMMERCE : 50
                        </p>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

              {/* ==================================================
                  ÉTAPE 1
              ================================================== */}

              <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-3 flex items-center gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 font-black text-blue-400">
                    1
                  </div>

                  <h3 className="font-black text-white">
                    Nom du produit
                  </h3>

                </div>

                <p className="text-sm leading-6 text-slate-300">
                  Écrivez le nom qui permettra de reconnaître
                  facilement le produit dans votre stock.
                </p>

                <div className="mt-3 rounded-xl bg-white/5 p-3">

                  <p className="mb-2 text-xs font-bold text-slate-400">
                    Exemples :
                  </p>

                  <div className="space-y-1 text-sm text-slate-300">
                    <p>🥤 Coca-Cola 33cl</p>
                    <p>💊 Paracétamol 500mg</p>
                    <p>🍚 Riz 25kg</p>
                  </div>

                </div>

              </div>

              {/* ==================================================
                  ÉTAPE 2
              ================================================== */}

              <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-3 flex items-center gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 font-black text-purple-400">
                    2
                  </div>

                  <h3 className="font-black text-white">
                    Type d'unité
                  </h3>

                </div>

                <p className="text-sm leading-6 text-slate-300">
                  Choisissez comment votre produit est conditionné.
                </p>

                <div className="mt-3 space-y-2">

                  <div className="rounded-xl bg-white/5 p-3">

                    <p className="text-sm font-bold text-white">
                      🧴 Pièce
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Le produit est compté directement pièce par pièce.
                      Exemple : 20 bouteilles.
                    </p>

                  </div>

                  <div className="rounded-xl bg-white/5 p-3">

                    <p className="text-sm font-bold text-white">
                      📦 Carton
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Exemple : 1 carton contient 24 bouteilles.
                    </p>

                  </div>

                  <div className="rounded-xl bg-white/5 p-3">

                    <p className="text-sm font-bold text-white">
                      📦 Boîte
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Exemple : 1 boîte contient 100 comprimés.
                    </p>

                  </div>

                  <div className="rounded-xl bg-white/5 p-3">

                    <p className="text-sm font-bold text-white">
                      🛍️ Sachet
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Exemple : 1 sachet contient plusieurs pièces.
                    </p>

                  </div>

                </div>

              </div>

              {/* ==================================================
                  ÉTAPE 3
              ================================================== */}

              <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-3 flex items-center gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-500/15 font-black text-green-400">
                    3
                  </div>

                  <h3 className="font-black text-white">
                    Quantité
                  </h3>

                </div>

                <p className="text-sm leading-6 text-slate-300">
                  La quantité dépend de votre situation.
                </p>

                <div className="mt-4 space-y-3">

                  <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">

                    <p className="font-black text-orange-400">
                      🆕 Si c'est un nouveau stock
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Indiquez la quantité que vous venez d'acheter.
                    </p>

                    <p className="mt-2 font-black text-white">
                      Exemple : 5 cartons → Quantité = 5
                    </p>

                  </div>

                  <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4">

                    <p className="font-black text-green-400">
                      📦 Si le produit existait déjà
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Indiquez uniquement la quantité qui vous reste
                      aujourd'hui dans votre boutique.
                    </p>

                    <p className="mt-2 font-black text-white">
                      Exemple : il reste 50 bouteilles → Quantité = 50
                    </p>

                  </div>

                </div>

              </div>

              {/* ==================================================
                  FIN DU GUIDE
              ================================================== */}

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">

                <div className="flex gap-3">

                  <CheckCircle
                    size={20}
                    className="mt-0.5 shrink-0 text-blue-400"
                  />

                  <div>

                    <p className="font-black text-white">
                      Vous êtes prêt
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      Une fois le guide compris, fermez-le et remplissez
                      simplement le formulaire ci-dessous. BISO-COMMERCE
                      calculera automatiquement votre stock réel et votre
                      bénéfice potentiel.
                    </p>

                  </div>

                </div>

              </div>
              {/* ==================================================
                  BOUTON J'AI COMPRIS
              ================================================== */}

              <div className="mt-6 border-t border-white/10 pt-5">

                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="
                    w-full
                    rounded-2xl
                    bg-gradient-to-r
                    from-orange-500
                    to-yellow-400
                    px-5
                    py-4
                    text-sm
                    font-black
                    text-black
                    shadow-lg
                    transition
                    hover:scale-[1.01]
                    active:scale-[0.99]
                  "
                >
                  ✓ J'ai compris
                </button>

                <p className="mt-2 text-center text-xs text-slate-500">
                  Cliquez ici lorsque vous avez terminé de lire le guide.
                </p>

              </div>
            </div>
          )}

        </div>

        

        <div className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl sm:p-6">

          {/* ==================================================
              NOM DU PRODUIT
          ================================================== */}

          <div>

            <label className="mb-2 block text-xs font-bold text-slate-300">
              Nom du produit
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exemple : Coca-Cola 33cl"
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-500 focus:border-orange-500/50"
            />

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Donnez un nom simple qui permettra de retrouver facilement
              le produit dans votre stock.
            </p>

          </div>

          {/* ==================================================
              SITUATION DU STOCK
          ================================================== */}

          <div>

            <label className="mb-2 block text-xs font-bold text-slate-300">
              Situation du stock
            </label>

            <p className="mb-3 text-xs leading-5 text-slate-500">
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
                    ? "border-orange-500 bg-orange-500/10 shadow-lg"
                    : "border-white/10 bg-black/40 hover:border-white/20"
                }`}
              >

                <div className="flex items-start gap-3">

                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      stockMode === "nouveau"
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-white/5 text-slate-400"
                    }`}
                  >
                    🆕
                  </div>

                  <div>

                    <p className="font-black text-white">
                      Nouveau stock
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
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
                    ? "border-green-500 bg-green-500/10 shadow-lg"
                    : "border-white/10 bg-black/40 hover:border-white/20"
                }`}
              >

                <div className="flex items-start gap-3">

                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      stockMode === "existant"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-white/5 text-slate-400"
                    }`}
                  >
                    📦
                  </div>

                  <div>

                    <p className="font-black text-white">
                      Stock déjà existant
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      J'avais déjà ce produit dans ma boutique.
                    </p>

                  </div>

                </div>

              </button>

            </div>

            {/* EXPLICATION NOUVEAU STOCK */}

            {stockMode === "nouveau" && (

              <div className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">

                <div className="flex gap-3">

                  <div className="mt-0.5 shrink-0 text-xl">
                    🆕
                  </div>

                  <div>

                    <p className="text-sm font-black text-orange-400">
                      Vous venez d'acheter ce produit
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      Indiquez la quantité que vous venez d'acheter,
                      le montant total payé au fournisseur et votre prix
                      de vente par pièce.
                    </p>

                    <p className="mt-3 text-xs font-bold text-white">
                      Exemple :
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Vous achetez 5 cartons contenant chacun 24 bouteilles.
                    </p>

                    <p className="mt-2 text-sm font-black text-orange-400">
                      5 × 24 = 120 bouteilles
                    </p>

                  </div>

                </div>

              </div>

            )}

            {/* EXPLICATION STOCK EXISTANT */}

            {stockMode === "existant" && (

              <div className="mt-4 overflow-hidden rounded-2xl border border-green-500/20 bg-green-500/10">

                <div className="p-4">

                  <div className="flex gap-3">

                    <div className="mt-0.5 shrink-0 text-xl">
                      📦
                    </div>

                    <div>

                      <p className="text-sm font-black text-green-400">
                        Vous aviez déjà ce produit avant BISO-COMMERCE
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-300">
                        Aucun problème. Vous n'avez pas besoin de retrouver
                        tous vos anciens achats ni les quantités que vous
                        avez déjà vendues.
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-300">
                        Regardez simplement combien de pièces de ce produit
                        vous avez actuellement dans votre boutique et
                        indiquez cette quantité.
                      </p>

                    </div>

                  </div>

                </div>

                <div className="border-t border-green-500/20 bg-black/20 p-4">

                  <p className="text-xs font-bold uppercase tracking-wide text-green-400">
                    Exemple concret
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Vous aviez déjà acheté des bouteilles Coca-Cola avant
                    d'utiliser BISO-COMMERCE.
                  </p>

                  <div className="mt-3 space-y-2">

                    <div className="flex items-start gap-2">

                      <CheckCircle
                        size={16}
                        className="mt-0.5 shrink-0 text-green-400"
                      />

                      <p className="text-xs leading-5 text-slate-300">
                        Vous avez actuellement
                        <strong className="text-white">
                          {" "}50 bouteilles
                        </strong>
                        {" "}dans la boutique.
                      </p>

                    </div>

                    <div className="flex items-start gap-2">

                      <CheckCircle
                        size={16}
                        className="mt-0.5 shrink-0 text-green-400"
                      />

                      <p className="text-xs leading-5 text-slate-300">
                        Choisissez
                        <strong className="text-green-400">
                          {" "}« Stock déjà existant »
                        </strong>
                        .
                      </p>

                    </div>

                    <div className="flex items-start gap-2">

                      <CheckCircle
                        size={16}
                        className="mt-0.5 shrink-0 text-green-400"
                      />

                      <p className="text-xs leading-5 text-slate-300">
                        Dans quantité, écrivez simplement
                        <strong className="text-white">
                          {" "}50
                        </strong>
                        .
                      </p>

                    </div>

                  </div>

                  <div className="mt-4 rounded-xl bg-green-500/10 p-3">

                    <p className="text-xs font-bold text-green-400">
                      ✅ Résultat
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      BISO-COMMERCE commencera à suivre votre stock
                      à partir de ces 50 pièces.
                    </p>

                  </div>

                </div>

              </div>

            )}

          </div>

          {/* ==================================================
              TYPE D'UNITÉ
          ================================================== */}

          <div>

            <label className="mb-2 block text-xs font-bold text-slate-300">
              Type d'unité
            </label>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#111827] p-4 text-white outline-none focus:border-orange-500/50"
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

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Choisissez l'unité dans laquelle vous comptez votre stock.
            </p>

          </div>

          {/* ==================================================
              QUANTITÉ
          ================================================== */}

          <div>

            <label className="mb-2 block text-xs font-bold text-slate-300">
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
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-500 focus:border-orange-500/50"
            />

            {stockMode === "existant" ? (
              <p className="mt-2 text-xs leading-5 text-green-400">
                💡 Écrivez uniquement la quantité qui vous reste
                actuellement dans votre boutique.
              </p>
            ) : (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                💡 Écrivez combien d'unités vous venez d'acheter.
              </p>
            )}

          </div>

          {/* ==================================================
              NOMBRE DE PIÈCES PAR UNITÉ
          ================================================== */}

          {type !== "Pièce" && (

            <div>

              <label className="mb-2 block text-xs font-bold text-slate-300">
                Nombre de pièces dans {type}
              </label>

              <input
                type="number"
                min="1"
                value={piecesPerUnit}
                onChange={(e) => setPiecesPerUnit(e.target.value)}
                placeholder="Exemple : 24"
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-500 focus:border-orange-500/50"
              />

              <p className="mt-2 text-sm font-bold text-orange-400">
                💡 Exemple : 1 carton = 24 bouteilles → écrivez 24
              </p>

              <div className="mt-3 rounded-xl bg-white/5 p-3">

                <p className="text-xs leading-5 text-slate-400">
                  BISO-COMMERCE calculera automatiquement le nombre
                  total de pièces.
                </p>

                <p className="mt-2 text-sm font-black text-white">
                  {Number(quantity || 0)} ×{" "}
                  {Number(piecesPerUnit || 1)} ={" "}
                  {totalPieces} pièce(s)
                </p>

              </div>

            </div>

          )}
                    {/* ==================================================
              PRIX D'ACHAT TOTAL
          ================================================== */}

          <div>

            <label className="mb-2 block text-xs font-bold text-slate-300">
              Prix d'achat total
            </label>

            <input
              type="number"
              min="0"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="Exemple : 100000"
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-500 focus:border-orange-500/50"
            />

            <p className="mt-2 text-xs leading-5 text-slate-500">
              {stockMode === "existant"
                ? "Indiquez la valeur d'achat correspondant au stock que vous avez actuellement."
                : "Indiquez le montant total payé au fournisseur pour cet achat."}
            </p>

            <div className="mt-3 rounded-xl bg-yellow-500/10 p-3">

              <p className="text-xs font-bold text-yellow-400">
                💡 Exemple
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-300">
                Si vous avez payé 100 000 FC pour votre stock,
                écrivez simplement :
              </p>

              <p className="mt-2 text-sm font-black text-white">
                100000
              </p>

            </div>

          </div>

          {/* ==================================================
              PRIX DE VENTE
          ================================================== */}

          <div>

            <label className="mb-2 block text-xs font-bold text-slate-300">
              Prix de vente par pièce
            </label>

            <input
              type="number"
              min="0"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              placeholder="Exemple : 2000"
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-500 focus:border-orange-500/50"
            />

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Il s'agit du prix auquel vous comptez vendre une seule
              pièce au client.
            </p>

          </div>

          {/* ==================================================
              MONNAIE
          ================================================== */}

          <div>

            <label className="mb-2 block text-xs font-bold text-slate-300">
              Monnaie
            </label>

            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#111827] p-4 text-white outline-none focus:border-orange-500/50"
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

          <div className="overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-yellow-500/5">

            <div className="border-b border-white/10 p-4">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">

                  <TrendingUp size={20} />

                </div>

                <div>

                  <h2 className="font-black text-white">
                    Résumé automatique
                  </h2>

                  <p className="text-xs text-slate-400">
                    BISO-COMMERCE calcule automatiquement vos résultats
                  </p>

                </div>

              </div>

            </div>

            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">

              {/* STOCK RÉEL */}

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400">

                  <Boxes size={16} />

                  Stock réel

                </div>

                <p className="text-xl font-black text-white">
                  {totalPieces}
                </p>

                <p className="text-xs text-slate-500">
                  pièce(s) disponibles
                </p>

              </div>

              {/* COÛT PAR PIÈCE */}

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400">

                  <CircleDollarSign size={16} />

                  Coût par pièce

                </div>

                <p className="text-xl font-black text-white">
                  {Math.round(pricePerPiece)} {currency}
                </p>

                <p className="text-xs text-slate-500">
                  coût réel d'une pièce
                </p>

              </div>

              {/* BÉNÉFICE PAR PIÈCE */}

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400">

                  <TrendingUp size={16} />

                  Bénéfice par pièce

                </div>

                <p
                  className={`text-xl font-black ${
                    profitPerPiece >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {Math.round(profitPerPiece)} {currency}
                </p>

                <p className="text-xs text-slate-500">
                  gain estimé sur une pièce
                </p>

              </div>

              {/* BÉNÉFICE TOTAL */}

              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4">

                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400">

                  <Sparkles size={16} />

                  Bénéfice potentiel total

                </div>

                <p
                  className={`text-xl font-black ${
                    totalProfit >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {Math.round(totalProfit)} {currency}
                </p>

                <p className="text-xs text-slate-500">
                  si tout le stock est vendu
                </p>

              </div>

            </div>

            {/* ==================================================
                RAPPEL POUR L'UTILISATEUR
            ================================================== */}

            <div className="mx-4 mb-4 rounded-2xl border border-white/10 bg-black/20 p-4">

              <div className="flex gap-3">

                <CheckCircle
                  size={20}
                  className="mt-0.5 shrink-0 text-green-400"
                />

                <div>

                  <p className="text-sm font-bold text-white">
                    Avant d'ajouter le produit
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Vérifiez le nom, la situation du stock, la quantité,
                    le prix d'achat, le prix de vente et la monnaie.
                  </p>

                  {stockMode === "existant" && (

                    <p className="mt-2 text-xs font-bold leading-5 text-green-400">
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
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 p-4 font-black text-black shadow-xl transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
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

          {/* ======================================================
              PETIT RAPPEL
          ====================================================== */}

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

            <div className="flex items-start gap-3">

              <Info
                size={18}
                className="mt-0.5 shrink-0 text-orange-400"
              />

              <div>

                <p className="text-sm font-bold text-white">
                  Un doute avant de confirmer ?
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Vérifiez simplement que la quantité correspond bien
                  au stock que vous avez réellement dans votre boutique.
                  Une fois le produit ajouté, BISO-COMMERCE pourra suivre
                  les ventes et mettre à jour votre stock.
                </p>

              </div>

            </div>

          </div>

          <p className="pb-2 text-center text-xs text-slate-500">
            Vérifiez les informations avant de confirmer l'ajout.
          </p>

        </div>

      </div>

    </div>
  );
}