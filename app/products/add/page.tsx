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

  // nombre de pièces dans un carton / boîte / sachet
  const [piecesPerUnit, setPiecesPerUnit] = useState("1");

  const [buyPrice, setBuyPrice] = useState("");

  const [sellPrice, setSellPrice] = useState("");

  const [currency, setCurrency] = useState("FC");

  const [loading, setLoading] = useState(false);

  // GUIDE
  const [showGuide, setShowGuide] = useState(false);

  // Calcul automatique aperçu bénéfice

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

  const saveProduct = async () => {
    if (
      !name ||
      !quantity ||
      !buyPrice ||
      !sellPrice
    ) {
      alert(
        "Veuillez remplir tous les champs obligatoires"
      );

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
        alert(
          "Utilisateur non connecté"
        );

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
        alert(
          "Utilisateur introuvable"
        );

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

    const result =
      await supabase
        .from("products")
        .insert(productData);

    if (result.error) {
      alert(result.error.message);

      setLoading(false);

      return;
    }

    alert(
      "Produit ajouté avec succès ✅"
    );

    setName("");

    setQuantity("");

    setBuyPrice("");

    setSellPrice("");

    setPiecesPerUnit("1");

    setLoading(false);
  };

  return (
    <div className="min-h-screen px-4 py-6 text-white">
      <div className="mx-auto max-w-4xl">

        {/* ====================================================== */}
        {/* HEADER */}
        {/* ====================================================== */}

        <div className="mb-6">

          <div className="mb-2 flex items-center gap-3">

            <PackagePlus
              className="text-orange-400"
              size={30}
            />

            <h1 className="text-2xl font-black">
              Nouveau produit
            </h1>

          </div>

          <p className="text-sm leading-6 text-slate-400">
            Ajoutez un produit, contrôlez votre stock
            et connaissez votre bénéfice avec
            BISO-COMMERCE.
          </p>

        </div>


        {/* ====================================================== */}
        {/* GUIDE PRINCIPAL */}
        {/* ====================================================== */}

        <div className="mb-6 rounded-3xl border border-orange-500/20 bg-orange-500/5 p-5">

          <div className="flex items-start justify-between gap-4">

            <div>

              <div className="mb-2 flex items-center gap-2">

                <Info
                  size={20}
                  className="text-orange-400"
                />

                <h2 className="font-black">
                  Guide pour débuter
                </h2>

              </div>

              <p className="text-sm leading-6 text-slate-400">

                Vous utilisez BISO-COMMERCE pour la
                première fois ?

                Pas de problème.

                Ce guide vous explique étape par étape
                quoi écrire dans chaque case et quoi
                faire après avoir ajouté votre produit.

              </p>

            </div>

            <button
              onClick={() =>
                setShowGuide(!showGuide)
              }
              className="shrink-0 rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-black"
            >
              {showGuide
                ? "Fermer"
                : "Voir le guide"}
            </button>

          </div>


          {showGuide && (

            <div className="mt-6 space-y-6">

              {/* ================================================== */}
              {/* INTRODUCTION */}
              {/* ================================================== */}

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                <h3 className="mb-3 text-lg font-black">
                  👋 Bienvenue dans l'ajout de produit
                </h3>

                <p className="text-sm leading-7 text-slate-300">

                  Cette page sert à enregistrer les produits
                  que vous avez dans votre commerce.

                  <br />
                  <br />

                  Par exemple, vous pouvez ajouter :

                  <br />

                  🥤 Des boissons

                  <br />

                  🧼 Du savon

                  <br />

                  💊 Des médicaments

                  <br />

                  🍚 Du riz

                  <br />

                  👕 Des vêtements

                  <br />

                  📱 Des téléphones

                  <br />
                  <br />

                  <strong className="text-white">
                    Vous devez simplement remplir les
                    informations demandées.
                  </strong>

                  <br />
                  <br />

                  Vous n'avez pas besoin de faire les
                  calculs vous-même.

                  <strong className="text-orange-300">
                    {" "}
                    BISO-COMMERCE calcule automatiquement
                    votre stock et votre bénéfice.
                  </strong>

                </p>

              </div>


              {/* ================================================== */}
              {/* ÉTAPE 1 */}
              {/* ================================================== */}

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-3 flex items-center gap-2">

                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 font-black text-black">
                    1
                  </span>

                  <h3 className="text-lg font-black">
                    Quel produit voulez-vous ajouter ?
                  </h3>

                </div>

                <p className="text-sm leading-7 text-slate-300">

                  Commencez par écrire le
                  <strong className="text-white">
                    {" "}nom du produit.
                  </strong>

                  <br />
                  <br />

                  Choisissez un nom clair que vous
                  pourrez facilement reconnaître
                  lorsque vous voudrez vendre le
                  produit plus tard.

                  <br />
                  <br />

                  <strong className="text-white">
                    Exemples :
                  </strong>

                  <br />

                  🥤 Coca-Cola 33cl

                  <br />

                  🧼 Savon Palmolive

                  <br />

                  💊 Paracétamol 500mg

                  <br />

                  🍚 Riz 25kg

                  <br />
                  <br />

                  💡
                  <strong className="text-orange-300">
                    {" "}Conseil :
                  </strong>

                  {" "}évitez un nom trop général.

                  <br />

                  Si vous avez plusieurs Coca-Cola,
                  écrivez par exemple :

                  <br />

                  <strong className="text-white">
                    Coca-Cola 33cl
                  </strong>

                  plutôt que simplement :

                  <strong className="text-white">
                    {" "}Coca.
                  </strong>

                </p>

              </div>


              {/* ================================================== */}
              {/* ÉTAPE 2 */}
              {/* ================================================== */}

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-3 flex items-center gap-2">

                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 font-black text-black">
                    2
                  </span>

                  <h3 className="text-lg font-black">
                    Comment achetez-vous ce produit ?
                  </h3>

                </div>

                <p className="text-sm leading-7 text-slate-300">

                  Dans
                  <strong className="text-white">
                    {" "}Type d'unité
                  </strong>,
                  indiquez comment votre produit
                  est compté ou acheté.

                  <br />
                  <br />

                  <strong className="text-orange-300">
                    🧴 Pièce
                  </strong>

                  <br />

                  Choisissez <strong>Pièce</strong>
                  lorsque le produit est compté
                  directement article par article.

                  <br />
                  <br />

                  Exemples :

                  <br />

                  • 1 téléphone

                  <br />

                  • 1 chaussure

                  <br />

                  • 1 pantalon

                  <br />

                  • 1 bouteille

                  <br />
                  <br />

                  <strong className="text-orange-300">
                    📦 Carton
                  </strong>

                  <br />

                  Choisissez Carton lorsqu'un carton
                  contient plusieurs pièces.

                  <br />
                  <br />

                  Exemple :

                  <br />

                  1 carton = 24 bouteilles.

                  <br />
                  <br />

                  <strong className="text-orange-300">
                    📦 Boîte
                  </strong>

                  <br />

                  Choisissez Boîte lorsqu'une boîte
                  contient plusieurs pièces.

                  <br />
                  <br />

                  Exemple :

                  <br />

                  1 boîte = 20 pièces.

                  <br />
                  <br />

                  <strong className="text-orange-300">
                    🛍️ Sachet
                  </strong>

                  <br />

                  Choisissez Sachet lorsqu'un sachet
                  contient plusieurs pièces.

                  <br />
                  <br />

                  💡
                  <strong className="text-orange-300">
                    {" "}Règle simple :
                  </strong>

                  <br />

                  Vous achetez directement un article
                  → <strong>Pièce</strong>

                  <br />

                  Vous achetez un carton
                  → <strong>Carton</strong>

                  <br />

                  Vous achetez une boîte
                  → <strong>Boîte</strong>

                  <br />

                  Vous achetez un sachet
                  → <strong>Sachet</strong>

                </p>

              </div>


              {/* ================================================== */}
              {/* ÉTAPE 3 */}
              {/* ================================================== */}

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-3 flex items-center gap-2">

                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 font-black text-black">
                    3
                  </span>

                  <h3 className="text-lg font-black">
                    Combien en avez-vous ?
                  </h3>

                </div>

                <p className="text-sm leading-7 text-slate-300">

                  Dans
                  <strong className="text-white">
                    {" "}Quantité disponible
                  </strong>,
                  indiquez combien d'unités vous avez
                  achetées ou combien vous avez
                  actuellement en stock.

                  <br />
                  <br />

                  <strong className="text-white">
                    Exemple avec Pièce :
                  </strong>

                  <br />

                  Vous avez 20 bouteilles.

                  <br />

                  Écrivez :

                  <strong className="text-orange-300">
                    {" "}20
                  </strong>

                  <br />
                  <br />

                  <strong className="text-white">
                    Exemple avec Carton :
                  </strong>

                  <br />

                  Vous avez acheté 5 cartons.

                  <br />

                  Écrivez :

                  <strong className="text-orange-300">
                    {" "}5
                  </strong>

                  <br />
                  <br />

                  Si chaque carton contient 24 bouteilles,
                  écrivez :

                  <strong className="text-orange-300">
                    {" "}24
                  </strong>

                  dans le nombre de pièces.

                  <br />
                  <br />

                  BISO-COMMERCE calcule automatiquement :

                  <br />
                  <br />

                  <strong className="text-white">
                    5 cartons × 24 bouteilles
                  </strong>

                  <br />

                  <strong className="text-orange-300">
                    = 120 bouteilles en stock
                  </strong>

                  <br />
                  <br />

                  ⭐ Vous n'avez donc pas besoin de
                  calculer vous-même.

                </p>

              </div>


              {/* ================================================== */}
              {/* RÈGLE IMPORTANTE */}
              {/* ================================================== */}

              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">

                <div className="mb-2 flex items-center gap-2">

                  <Sparkles
                    size={20}
                    className="text-yellow-400"
                  />

                  <h3 className="font-black">
                    ⭐ Vous n'avez rien à calculer
                  </h3>

                </div>

                <p className="text-sm leading-7 text-slate-300">

                  Si vous utilisez un carton, une boîte
                  ou un sachet contenant plusieurs pièces,
                  indiquez simplement le nombre d'unités
                  et le nombre de pièces contenues dedans.

                  <br />
                  <br />

                  Exemple :

                  <br />

                  5 cartons

                  <br />

                  24 bouteilles par carton

                  <br />
                  <br />

                  BISO-COMMERCE fait :

                  <br />

                  <strong className="text-white">
                    5 × 24 = 120
                  </strong>

                  <br />

                  Votre stock réel devient :

                  <strong className="text-orange-300">
                    {" "}120 pièces
                  </strong>

                </p>

              </div>


              {/* ================================================== */}
              {/* STOCK EXISTANT */}
              {/* ================================================== */}

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-3 flex items-center gap-2">

                  <Boxes
                    size={21}
                    className="text-orange-400"
                  />

                  <h3 className="text-lg font-black">
                    Vous avez déjà du stock ?
                  </h3>

                </div>

                <p className="text-sm leading-7 text-slate-300">

                  Si vous utilisez BISO-COMMERCE pour
                  la première fois et que vous avez déjà
                  des marchandises dans votre commerce,
                  vous pouvez commencer avec la quantité
                  que vous avez réellement en stock.

                  <br />
                  <br />

                  Exemple :

                  <br />

                  Vous avez déjà 75 bouteilles.

                  <br />

                  Choisissez :

                  <strong className="text-orange-300">
                    {" "}Pièce
                  </strong>

                  <br />

                  Puis :

                  <strong className="text-orange-300">
                    {" "}Quantité : 75
                  </strong>

                  <br />
                  <br />

                  Votre stock de départ sera :

                  <strong className="text-white">
                    {" "}75 bouteilles.
                  </strong>

                </p>

              </div>


              {/* ================================================== */}
              {/* ÉTAPE 4 */}
              {/* ================================================== */}

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-3 flex items-center gap-2">

                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 font-black text-black">
                    4
                  </span>

                  <h3 className="text-lg font-black">
                    Combien avez-vous payé et combien
                    allez-vous vendre ?
                  </h3>

                </div>

                <p className="text-sm leading-7 text-slate-300">

                  Cette partie permet à BISO-COMMERCE
                  de calculer votre bénéfice.

                  <br />
                  <br />

                  <strong className="text-white">
                    💰 Prix achat total
                  </strong>

                  <br />

                  Écrivez tout l'argent payé au fournisseur
                  pour la quantité que vous ajoutez.

                  <br />
                  <br />

                  Exemple :

                  <br />

                  5 cartons vous ont coûté :

                  <strong className="text-orange-300">
                    {" "}180 000 FC
                  </strong>

                  <br />

                  Écrivez :

                  <strong className="text-orange-300">
                    {" "}180 000
                  </strong>

                  <br />
                  <br />

                  ⚠️ N'écrivez pas ici le prix d'une seule
                  bouteille.

                  <br />
                  <br />

                  <strong className="text-white">
                    💵 Prix vente unité
                  </strong>

                  <br />

                  Écrivez le prix auquel vous voulez
                  vendre une seule pièce.

                  <br />
                  <br />

                  Exemple :

                  <br />

                  Vous voulez vendre une bouteille :

                  <strong className="text-orange-300">
                    {" "}2 000 FC
                  </strong>

                  <br />
                  <br />

                  Écrivez :

                  <strong className="text-orange-300">
                    {" "}2 000
                  </strong>

                  <br />
                  <br />

                  BISO-COMMERCE calcule ensuite
                  automatiquement votre bénéfice.

                </p>

              </div>


              {/* ================================================== */}
              {/* BÉNÉFICE */}
              {/* ================================================== */}

              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4">

                <div className="mb-3 flex items-center gap-2">

                  <TrendingUp
                    size={21}
                    className="text-green-400"
                  />

                  <h3 className="text-lg font-black">
                    📈 Votre bénéfice est calculé
                    automatiquement
                  </h3>

                </div>

                <p className="text-sm leading-7 text-slate-300">

                  Exemple :

                  <br />
                  <br />

                  Coût d'une bouteille :

                  <strong className="text-white">
                    {" "}1 500 FC
                  </strong>

                  <br />

                  Prix de vente :

                  <strong className="text-white">
                    {" "}2 000 FC
                  </strong>

                  <br />
                  <br />

                  Bénéfice :

                  <strong className="text-green-300">
                    {" "}500 FC par bouteille
                  </strong>

                  <br />
                  <br />

                  Si vous avez 120 bouteilles :

                  <br />

                  500 × 120 =

                  <strong className="text-green-300">
                    {" "}60 000 FC
                  </strong>

                  <br />
                  <br />

                  Vous verrez automatiquement ces
                  informations dans le résumé.

                </p>

              </div>


              {/* ================================================== */}
              {/* MONNAIE */}
              {/* ================================================== */}

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="mb-3 flex items-center gap-2">

                  <CircleDollarSign
                    size={21}
                    className="text-orange-400"
                  />

                  <h3 className="text-lg font-black">
                    💱 Choisissez votre monnaie
                  </h3>

                </div>

                <p className="text-sm leading-7 text-slate-300">

                  Si vos prix sont en francs congolais,
                  choisissez :

                  <br />

                  <strong className="text-orange-300">
                    🇨🇩 Franc Congolais (FC)
                  </strong>

                  <br />
                  <br />

                  Si vos prix sont en dollars,
                  choisissez :

                  <br />

                  <strong className="text-orange-300">
                    🇺🇸 Dollar ($)
                  </strong>

                  <br />
                  <br />

                  ⚠️ Vérifiez toujours la monnaie avant
                  d'ajouter le produit.

                </p>

              </div>


              {/* ================================================== */}
              {/* ÉTAPE 5 */}
              {/* ================================================== */}

              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">

                <div className="mb-3 flex items-center gap-2">

                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 font-black text-black">
                    5
                  </span>

                  <h3 className="text-lg font-black">
                    Ajouter le produit et commencer
                    à vendre
                  </h3>

                </div>

                <p className="text-sm leading-7 text-slate-300">

                  Avant de cliquer sur
                  <strong className="text-white">
                    {" "}« Ajouter le produit »
                  </strong>,
                  vérifiez tranquillement toutes les
                  informations.

                  <br />
                  <br />

                  ✅ Nom du produit

                  <br />

                  ✅ Type d'unité

                  <br />

                  ✅ Quantité

                  <br />

                  ✅ Nombre de pièces par unité si
                  nécessaire

                  <br />

                  ✅ Prix d'achat

                  <br />

                  ✅ Prix de vente

                  <br />

                  ✅ Monnaie

                  <br />
                  <br />

                  Regardez également le :

                  <strong className="text-orange-300">
                    {" "}📊 Résumé automatique
                  </strong>

                  <br />
                  <br />

                  Si tout est correct, cliquez sur :

                  <br />

                  <strong className="text-white">
                    « Ajouter le produit »
                  </strong>

                  <br />
                  <br />

                  Vous verrez ensuite :

                  <strong className="text-green-300">
                    {" "}Produit ajouté avec succès ✅
                  </strong>

                </p>

              </div>


              {/* ================================================== */}
              {/* APRÈS AJOUT */}
              {/* ================================================== */}

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">

                <div className="mb-3 flex items-center gap-2">

                  <CheckCircle
                    size={21}
                    className="text-blue-400"
                  />

                  <h3 className="text-lg font-black">
                    🛒 Après avoir ajouté le produit
                  </h3>

                </div>

                <p className="text-sm leading-7 text-slate-300">

                  Votre produit est maintenant enregistré
                  dans votre stock.

                  <br />
                  <br />

                  <strong className="text-white">
                    Vous ne devez pas ajouter à nouveau
                    le produit lorsqu'un client veut
                    l'acheter.
                  </strong>

                  <br />
                  <br />

                  Pour vendre :

                  <br />

                  👉 Retournez au
                  <strong className="text-blue-300">
                    {" "}Dashboard
                  </strong>

                  <br />

                  👉 Cherchez
                  <strong className="text-blue-300">
                    {" "}« Nouvelle vente »
                  </strong>

                  <br />

                  👉 Enregistrez ce que le client vient
                  d'acheter.

                  <br />
                  <br />

                  Exemple :

                  <br />

                  Vous avez 120 bouteilles.

                  <br />

                  Un client achète 3 bouteilles.

                  <br />
                  <br />

                  Vous allez dans :

                  <strong className="text-white">
                    {" "}Dashboard → Nouvelle vente
                  </strong>

                  <br />

                  Puis vous enregistrez :

                  <strong className="text-orange-300">
                    {" "}3 Coca-Cola
                  </strong>

                </p>

              </div>


              {/* ================================================== */}
              {/* RÈGLE DES 3 */}
              {/* ================================================== */}

              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">

                <h3 className="mb-4 text-lg font-black">
                  ⭐ Retenez seulement ces 3 choses
                </h3>

                <div className="space-y-4 text-sm leading-7 text-slate-300">

                  <div>
                    <strong className="text-white">
                      ① NOUVEAU PRODUIT
                    </strong>

                    <br />

                    Sert à enregistrer un produit et
                    votre stock de départ.

                    <br />

                    Exemple :

                    <br />

                    « J'ai 50 bouteilles. »

                  </div>


                  <div>
                    <strong className="text-white">
                      ② NOUVELLE VENTE
                    </strong>

                    <br />

                    Sert à enregistrer ce qu'un client
                    vient d'acheter.

                    <br />

                    Exemple :

                    <br />

                    « Le client achète 3 bouteilles. »

                  </div>


                  <div>
                    <strong className="text-white">
                      ③ DASHBOARD
                    </strong>

                    <br />

                    Sert à avoir une vue générale de votre
                    activité selon les informations affichées
                    par votre application.

                  </div>

                </div>

              </div>


              {/* ================================================== */}
              {/* EXEMPLE COMPLET */}
              {/* ================================================== */}

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                <h3 className="mb-4 text-lg font-black">
                  🎯 Exemple du début à la fin
                </h3>

                <p className="text-sm leading-7 text-slate-300">

                  Vous avez une boutique.

                  <br />
                  <br />

                  Vous achetez :

                  <strong className="text-white">
                    {" "}5 cartons de Coca-Cola
                  </strong>

                  <br />

                  Chaque carton contient :

                  <strong className="text-white">
                    {" "}24 bouteilles
                  </strong>

                  <br />

                  Vous payez :

                  <strong className="text-white">
                    {" "}180 000 FC
                  </strong>

                  <br />

                  Vous voulez vendre chaque bouteille :

                  <strong className="text-white">
                    {" "}2 000 FC
                  </strong>

                  <br />
                  <br />

                  Vous faites :

                  <br />
                  <br />

                  <strong className="text-orange-300">
                    Nom :
                  </strong>{" "}
                  Coca-Cola 33cl

                  <br />

                  <strong className="text-orange-300">
                    Type :
                  </strong>{" "}
                  Carton

                  <br />

                  <strong className="text-orange-300">
                    Quantité :
                  </strong>{" "}
                  5

                  <br />

                  <strong className="text-orange-300">
                    Pièces par carton :
                  </strong>{" "}
                  24

                  <br />

                  <strong className="text-orange-300">
                    Prix achat total :
                  </strong>{" "}
                  180 000

                  <br />

                  <strong className="text-orange-300">
                    Prix vente unité :
                  </strong>{" "}
                  2 000

                  <br />

                  <strong className="text-orange-300">
                    Monnaie :
                  </strong>{" "}
                  FC

                  <br />
                  <br />

                  BISO-COMMERCE calcule :

                  <br />

                  5 × 24 =

                  <strong className="text-white">
                    {" "}120 bouteilles
                  </strong>

                  <br />
                  <br />

                  Ensuite vous cliquez sur :

                  <strong className="text-orange-300">
                    {" "}Ajouter le produit
                  </strong>

                  <br />
                  <br />

                  Le produit est enregistré.

                  <br />
                  <br />

                  Un client arrive et achète 3 bouteilles.

                  <br />
                  <br />

                  Vous allez dans :

                  <strong className="text-blue-300">
                    {" "}Dashboard → Nouvelle vente
                  </strong>

                  <br />
                  <br />

                  Vous enregistrez la vente.

                  <br />
                  <br />

                  🎉 Vous venez de réaliser votre première
                  gestion de produit et de vente avec
                  BISO-COMMERCE.

                </p>

              </div>


              {/* ================================================== */}
              {/* CONSEIL FINAL */}
              {/* ================================================== */}

              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4">

                <h3 className="mb-3 text-lg font-black">
                  🎉 Félicitations !
                </h3>

                <p className="text-sm leading-7 text-slate-300">

                  Vous n'avez pas besoin d'être informaticien
                  pour utiliser BISO-COMMERCE.

                  <br />
                  <br />

                  Suivez simplement les informations affichées
                  à l'écran.

                  <br />
                  <br />

                  <strong className="text-white">
                    Ajouter le produit
                  </strong>

                  {" "}→ pour enregistrer votre stock.

                  <br />

                  <strong className="text-white">
                    Nouvelle vente
                  </strong>

                  {" "}→ lorsqu'un client achète.

                  <br />

                  <strong className="text-white">
                    Dashboard
                  </strong>

                  {" "}→ pour suivre votre activité.

                  <br />
                  <br />

                  💡 Pour votre première utilisation,
                  commencez tranquillement avec un seul
                  produit. Une fois que vous avez compris,
                  vous pourrez ajouter les autres produits
                  de votre commerce.

                </p>

              </div>


              {/* ================================================== */}
              {/* BOUTON FERMER GUIDE */}
              {/* ================================================== */}

              <button
                onClick={() =>
                  setShowGuide(false)
                }
                className="w-full rounded-2xl bg-orange-500 p-4 font-black text-black transition hover:scale-[1.02]"
              >
                Fermer le guide
              </button>

            </div>

          )}

        </div>


        {/* ====================================================== */}
        {/* FORMULAIRE */}
        {/* ====================================================== */}

        <div className="space-y-6">


          {/* ================================================== */}
          {/* NOM PRODUIT */}
          {/* ================================================== */}

          <div>

            <label
              className="mb-2 block text-xs font-bold text-slate-400"
            >
              Nom du produit
            </label>

            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Nom du produit dans votre gestion de stock"
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-300"
            />

          </div>


          {/* ================================================== */}
          {/* TYPE UNITÉ */}
          {/* ================================================== */}

          <div>

            <label
              className="mb-2 block text-xs font-bold text-slate-400"
            >
              Type d'unité
            </label>

            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value)
              }
              className="w-full rounded-xl bg-[#111827] py-4 text-white outline-none"
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


          {/* ================================================== */}
          {/* QUANTITÉ */}
          {/* ================================================== */}

          <div>

            <label
              className="mb-2 block text-xs font-bold text-slate-400"
            >
              Quantité disponible
            </label>

            <input
              type="number"
              value={quantity}
              onChange={(e) =>
                setQuantity(e.target.value)
              }
             placeholder={`Nombre de ${type}(s)`}
className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-300"
/>

          </div>


          {/* ================================================== */}
          {/* PIECES PAR UNITÉ */}
          {/* ================================================== */}

  





{type !== "Pièce" && (


        <div>

          <label
            className="mb-2 block text-xs font-bold text-slate-400"
          >
            Nombre de pièces dans {type}
          </label>

          <input
            type="number"
            value={piecesPerUnit}
            onChange={(e) =>
              setPiecesPerUnit(
                e.target.value
              )
            }
            placeholder="Exemple : 24"
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none"
          />

          <p className="mt-2 text-xs text-slate-500">
            Exemple : 1 carton de boissons =
            24 bouteilles
          </p>

        </div>

      )}

          {/* ================================================== */}
          {/* PRIX ACHAT */}
          {/* ================================================== */}

          <div>

            <label
              className="mb-2 block text-xs text-slate-400"
            >
              Prix achat total
            </label>

            <input
              type="number"
              value={buyPrice}
              onChange={(e) =>
                setBuyPrice(e.target.value)
              }
              placeholder="Ex: 100000"
className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-300"
/>

            <p className="mt-2 text-xs text-slate-500">
              Indiquez le montant total payé au
              fournisseur pour cette quantité.
            </p>

          </div>


          {/* ================================================== */}
          {/* PRIX VENTE */}
          {/* ================================================== */}

          <div>

            <label
              className="mb-2 block text-xs text-slate-400"
            >
              Prix vente unité
            </label>

            <input
              type="number"
              value={sellPrice}
              onChange={(e) =>
                setSellPrice(e.target.value)
              }
              placeholder="Ex: 2000"
className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-300"
/>

            <p className="mt-2 text-xs text-slate-500">
              Prix auquel vous voulez vendre une
              seule pièce au client.
            </p>

          </div>


          {/* ================================================== */}
          {/* MONNAIE */}
          {/* ================================================== */}

          <div>

            <label
              className="mb-2 block text-xs text-slate-400"
            >
              Monnaie
            </label>

            <select
              value={currency}
              onChange={(e) =>
                setCurrency(e.target.value)
              }
              className="w-full rounded-2xl border border-white/10 bg-[#111827] p-4 text-white outline-none"
            >

              <option value="FC">
                Franc Congolais (FC)
              </option>

              <option value="$">
                Dollar ($)
              </option>

            </select>

          </div>


          {/* ================================================== */}
          {/* RESUME AUTOMATIQUE */}
          {/* ================================================== */}

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">

            <div className="mb-5 flex items-center gap-2">

              <TrendingUp
                size={21}
                className="text-orange-400"
              />

              <h2 className="font-black">
                📊 Résumé automatique
              </h2>

            </div>


            <div className="grid gap-4 sm:grid-cols-2">


              {/* STOCK */}
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                <p className="text-xs font-bold text-slate-300">
                  Stock réel
                </p>

                <p className="mt-2 text-3xl font-black text-white">
  {totalPieces}
</p>

                <p className="text-xs text-slate-500">
                  pièces
                </p>

              </div>


              {/* COUT */}
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                <p className="text-xs font-bold text-slate-500">
                  Coût par pièce
                </p>

                <p className="mt-2 text-3xl font-black text-white">
  {totalPieces}
</p>

                <p className="text-xs text-slate-500">
                  {currency}
                </p>

              </div>


              {/* BENEFICE */}
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                <p className="text-xs font-bold text-slate-500">
                  Bénéfice par pièce
                </p>

                <p className="mt-2 text-3xl font-black text-white">
  {totalPieces}
</p>

                <p className="text-xs text-slate-500">
                  {currency}
                </p>

              </div>


              {/* BENEFICE TOTAL */}
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">

                <p className="text-xs font-bold text-slate-500">
                  Bénéfice potentiel total
                </p>

                <p className="mt-2 text-2xl font-black text-white">
  {Math.round(pricePerPiece)}
</p>

                <p className="text-xs text-slate-500">
                  {currency}
                </p>

              </div>

            </div>


            <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">

              <div className="flex items-start gap-3">

                <Sparkles
                  size={20}
                  className="mt-0.5 shrink-0 text-yellow-400"
                />

                <div>

                  <p className="font-black">
                    📌 Vérification avant ajout
                  </p>

                  <p className="mt-1 text-xs leading-6 text-slate-400">

                    Vérifiez le nom, la quantité,
                    le prix d'achat, le prix de vente
                    et la monnaie avant d'ajouter
                    le produit.

                  </p>

                </div>

              </div>

            </div>

          </div>


          {/* ================================================== */}
          {/* BOUTON AJOUT */}
          {/* ================================================== */}

          <button
            onClick={saveProduct}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 p-4 font-black text-black shadow-xl transition hover:scale-[1.02] disabled:opacity-50"
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


          {/* ================================================== */}
          {/* PETIT RAPPEL */}
          {/* ================================================== */}

          <div className="pb-8 text-center">

            <p className="text-xs leading-6 text-slate-500">

              Après avoir ajouté votre produit,
              retournez au Dashboard puis utilisez
              <strong className="text-slate-300">
                {" "}« Nouvelle vente »
              </strong>
              lorsqu'un client achète.

            </p>

          </div>

        </div>

      </div>
    </div>
  );
}