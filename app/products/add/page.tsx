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
  Layers,
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

  // GUIDE
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

    const totalStock =
      Number(quantity) * nPieces;

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

    alert("Produit ajouté avec succès ✅");

    setName("");
    setQuantity("");
    setBuyPrice("");
    setSellPrice("");
    setPiecesPerUnit("1");

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
                  Comprenez chaque étape avant d'ajouter
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

              {/* INTRODUCTION DU GUIDE */}

              <div className="mb-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">

                <div className="flex gap-3">

                  <Sparkles
                    className="mt-0.5 shrink-0 text-orange-400"
                    size={20}
                  />

                  <div>

                    <h3 className="font-black text-white">
                      Comment ça fonctionne ?
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      C'est très simple. Remplissez les informations
                      de votre produit une par une. BISO-COMMERCE
                      calculera automatiquement votre stock réel,
                      votre coût par pièce et votre bénéfice potentiel.
                    </p>

                  </div>

                </div>

              </div>


              {/* ==================================================
                  ÉTAPE 1 — NOM DU PRODUIT
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
                  Écrivez le nom qui permettra de reconnaître facilement
                  votre produit dans votre stock.
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
                  ÉTAPE 2 — TYPE D'UNITÉ
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
                  Choisissez la manière dont vous achetez ou stockez
                  votre produit.
                </p>

                <div className="mt-3 space-y-2">

                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-sm font-bold text-white">
                      📦 Pièce
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Un seul article. Exemple : 1 téléphone.
                    </p>
                  </div>


                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-sm font-bold text-white">
                      📦 Carton
                    </p>

                    <p className="mt-2 text-sm font-bold text-orange-400">
  💡 Exemple : 1 carton = 24 bouteilles → écrivez 24
</p>
                  </div>


                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-sm font-bold text-white">
                      📦 Boîte
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Une boîte qui contient plusieurs articles.
                      Exemple : 1 boîte = 100 comprimés.
                    </p>
                  </div>


                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-sm font-bold text-white">
                      🛍️ Sachet
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Un sachet contenant plusieurs petites pièces.
                    </p>
                  </div>

                </div>

              </div>


              {/* ==================================================
                  ÉTAPE 3 — QUANTITÉ
              ================================================== */}

              <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-3 flex items-center gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-500/15 font-black text-green-400">
                    3
                  </div>

                  <h3 className="font-black text-white">
                    Quantité achetée
                  </h3>

                </div>

                <p className="text-sm leading-6 text-slate-300">
                  Indiquez combien d'unités vous avez achetées
                  chez votre fournisseur.
                </p>

                <div className="mt-3 rounded-xl bg-green-500/10 p-4">

                  <p className="text-xs font-bold uppercase tracking-wide text-green-400">
                    Exemple
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Vous achetez :
                  </p>

                  <p className="mt-1 text-base font-black text-white">
                    📦 5 cartons de boissons
                  </p>

                  <p className="mt-3 text-sm text-slate-300">
                    Dans le champ quantité, écrivez :
                  </p>

                  <p className="mt-1 text-base font-black text-white">
                    Quantité = 5
                  </p>

                </div>

              </div>


              {/* ==================================================
                  ÉTAPE 4 — NOMBRE DE PIÈCES
              ================================================== */}

              <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-3 flex items-center gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 font-black text-cyan-400">
                    4
                  </div>

                  <h3 className="font-black text-white">
                    Nombre de pièces dans l'unité
                  </h3>

                </div>

                <p className="text-sm leading-6 text-slate-300">
                  Cette information est nécessaire uniquement lorsque
                  vous choisissez un carton, une boîte ou un sachet.
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Indiquez combien de petites pièces se trouvent
                  dans une seule unité.
                </p>

                <div className="mt-4 space-y-2">

                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-sm font-bold text-white">
                      📦 Carton de boissons
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      1 carton = 24 bouteilles
                    </p>

                    <p className="mt-1 text-sm font-black text-cyan-400">
                      Écrire : 24
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-sm font-bold text-white">
                      💊 Boîte de médicaments
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      1 boîte = 100 comprimés
                    </p>

                    <p className="mt-1 text-sm font-black text-cyan-400">
                      Écrire : 100
                    </p>
                  </div>

                </div>

                <div className="mt-4 rounded-xl bg-cyan-500/10 p-4">

                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-400">
                    Calcul automatique
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Si vous avez 5 cartons et que chaque carton contient
                    24 bouteilles :
                  </p>

                  <p className="mt-2 text-base font-black text-white">
                    5 × 24 = 120 bouteilles
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    BISO-COMMERCE transforme automatiquement votre achat
                    en stock réel.
                  </p>

                </div>

              </div>


              {/* ==================================================
                  ÉTAPE 5 — PRIX D'ACHAT
              ================================================== */}

              <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-3 flex items-center gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-500/15 font-black text-yellow-400">
                    5
                  </div>

                  <h3 className="font-black text-white">
                    Prix d'achat total
                  </h3>

                </div>

                <p className="text-sm leading-6 text-slate-300">
                  Écrivez le montant total que vous avez payé
                  au fournisseur.
                </p>

                <div className="mt-4 rounded-xl bg-yellow-500/10 p-4">

                  <p className="text-xs font-bold uppercase tracking-wide text-yellow-400">
                    Exemple
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Vous achetez 5 cartons pour :
                  </p>

                  <p className="mt-1 text-lg font-black text-white">
                    100 000 FC
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Vous devez donc écrire 100000 dans le champ
                    « Prix d'achat total ».
                  </p>

                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  BISO-COMMERCE divisera automatiquement ce montant
                  par le nombre total de pièces pour calculer le coût
                  réel d'une pièce.
                </p>

              </div>


              {/* ==================================================
                  ÉTAPE 6 — PRIX DE VENTE
              ================================================== */}

              <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-3 flex items-center gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 font-black text-orange-400">
                    6
                  </div>

                  <h3 className="font-black text-white">
                    Prix de vente par pièce
                  </h3>

                </div>

                <p className="text-sm leading-6 text-slate-300">
                  Indiquez maintenant le prix auquel vous allez vendre
                  une seule pièce à votre client.
                </p>

                <div className="mt-4 rounded-xl bg-orange-500/10 p-4">

                  <p className="text-xs font-bold uppercase tracking-wide text-orange-400">
                    Exemple
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Une bouteille vous coûte 1 500 FC et vous souhaitez
                    la vendre à :
                  </p>

                  <p className="mt-1 text-lg font-black text-white">
                    2 000 FC
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    Prix de vente ={" "}
                    <strong className="text-white">
                      2 000 FC
                    </strong>
                  </p>

                </div>

              </div>


              {/* ==================================================
                  BÉNÉFICE AUTOMATIQUE
              ================================================== */}

              <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">

                <div className="mb-3 flex items-center gap-3">

                  <TrendingUp
                    size={22}
                    className="shrink-0 text-green-400"
                  />

                  <h3 className="font-black text-white">
                    Votre bénéfice est calculé automatiquement
                  </h3>

                </div>

                <p className="text-sm leading-6 text-slate-300">
                  Une fois les prix remplis, BISO-COMMERCE calcule
                  automatiquement plusieurs informations importantes.
                </p>

                <div className="mt-4 space-y-2">

                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle
                      size={17}
                      className="mt-0.5 shrink-0 text-green-400"
                    />
                    <span>
                      Le coût réel d'une pièce
                    </span>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle
                      size={17}
                      className="mt-0.5 shrink-0 text-green-400"
                    />
                    <span>
                      Le bénéfice réalisé sur une pièce
                    </span>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle
                      size={17}
                      className="mt-0.5 shrink-0 text-green-400"
                    />
                    <span>
                      Le bénéfice potentiel sur tout votre stock
                    </span>
                  </div>

                </div>


                {/* EXEMPLE BÉNÉFICE */}

                <div className="mt-5 rounded-2xl bg-black/20 p-4">

                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-green-400">
                    Exemple simple
                  </p>

                  <div className="space-y-2 text-sm">

                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">
                        Coût d'une bouteille
                      </span>

                      <strong className="text-white">
                        1 500 FC
                      </strong>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">
                        Prix de vente
                      </span>

                      <strong className="text-white">
                        2 000 FC
                      </strong>
                    </div>

                    <div className="my-2 border-t border-white/10" />

                    <div className="flex justify-between gap-4">
                      <span className="font-bold text-white">
                        Bénéfice par bouteille
                      </span>

                      <strong className="text-green-400">
                        500 FC
                      </strong>
                    </div>

                  </div>

                  <div className="mt-4 rounded-xl bg-green-500/10 p-3">

                    <p className="text-xs text-slate-400">
                      Si vous avez 100 bouteilles :
                    </p>

                    <p className="mt-1 text-base font-black text-white">
                      500 × 100 = 50 000 FC
                    </p>

                    <p className="mt-1 text-xs text-green-400">
                      Bénéfice potentiel total
                    </p>

                  </div>

                </div>

              </div>


              {/* ==================================================
                  BOUTON FERMER LE GUIDE
              ================================================== */}

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="
                  mt-6
                  w-full
                  rounded-2xl
                  bg-orange-500
                  p-4
                  font-black
                  text-black
                  shadow-lg
                  transition
                  hover:scale-[1.02]
                "
              >
                J'ai compris — Fermer le guide
              </button>

            </div>
          )}

        </div>


        {/* ======================================================
            FORMULAIRE
        ====================================================== */}

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
              className="
                w-full
                rounded-2xl
                border
                border-white/10
                bg-black/40
                p-4
                text-white
                outline-none
                placeholder:text-slate-500
                focus:border-orange-500/50
              "
            />

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
              className="
                w-full
                rounded-2xl
                border
                border-white/10
                bg-[#111827]
                p-4
                text-white
                outline-none
                focus:border-orange-500/50
              "
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


          {/* ==================================================
              QUANTITÉ
          ================================================== */}

          <div>

            <label className="mb-2 block text-xs font-bold text-slate-300">
              Quantité achetée
            </label>

            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`Nombre de ${type}(s)`}
              className="
                w-full
                rounded-2xl
                border
                border-white/10
                bg-black/40
                p-4
                text-white
                outline-none
                placeholder:text-slate-500
                focus:border-orange-500/50
              "
            />

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
                className="
                  w-full
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/40
                  p-4
                  text-white
                  outline-none
                  placeholder:text-slate-500
                  focus:border-orange-500/50
                "
              />

              <p className="mt-2 text-sm font-bold text-orange-400">
  💡 Exemple : 1 carton = 24 bouteilles → écrivez 24
</p>

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
              className="
                w-full
                rounded-2xl
                border
                border-white/10
                bg-black/40
                p-4
                text-white
                outline-none
                placeholder:text-slate-500
                focus:border-orange-500/50
              "
            />

            <p className="mt-2 text-sm font-bold text-orange-400">
  💡 Exemple : 5 cartons coûtent 100 000 FC → écrivez 100000
</p>

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
              className="
                w-full
                rounded-2xl
                border
                border-white/10
                bg-black/40
                p-4
                text-white
                outline-none
                placeholder:text-slate-500
                focus:border-orange-500/50
              "
            />

            <p className="mt-2 text-sm font-bold text-orange-400">
  💡 Exemple : 1 bouteille vendue à 2 000 FC → écrivez 2000
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
              className="
                w-full
                rounded-2xl
                border
                border-white/10
                bg-[#111827]
                p-4
                text-white
                outline-none
                focus:border-orange-500/50
              "
            >

              <option value="FC">
                Franc Congolais (FC)
              </option>

              <option value="$">
                Dollar ($)
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
                VÉRIFICATION
            ================================================== */}

            <div className="mx-4 mb-4 rounded-2xl border border-white/10 bg-black/20 p-4">

              <div className="flex gap-3">

                <CheckCircle
                  size={20}
                  className="mt-0.5 shrink-0 text-green-400"
                />

                <div>

                  <p className="text-sm font-bold text-white">
                    Vérification avant ajout
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Vérifiez le nom, la quantité, le prix d'achat,
                    le prix de vente et la monnaie avant d'ajouter
                    définitivement le produit.
                  </p>

                </div>

              </div>

            </div>

          </div>


          {/* ======================================================
              BOUTON AJOUTER
          ====================================================== */}

          <button
            type="button"
            onClick={saveProduct}
            disabled={loading}
            className="
              flex
              w-full
              items-center
              justify-center
              gap-3
              rounded-2xl
              bg-gradient-to-r
              from-orange-500
              to-yellow-400
              p-4
              font-black
              text-black
              shadow-xl
              transition
              hover:scale-[1.02]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
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


          <p className="pb-2 text-center text-xs text-slate-500">
            Vérifiez les informations avant de confirmer l'ajout.
          </p>

        </div>

      </div>

    </div>
  );
}
