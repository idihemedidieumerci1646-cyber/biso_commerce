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
  X,
  WifiOff,
  AlertTriangle,
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

  // POPUP CONNEXION
  const [showOfflinePopup, setShowOfflinePopup] = useState(false);

  // POPUP SUCCÈS
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // ==========================================================
  // CALCUL AUTOMATIQUE
  // ==========================================================

  const safeQuantity = Math.max(
    0,
    Number(quantity || 0)
  );

  const safePiecesPerUnit = Math.max(
    1,
    Number(piecesPerUnit || 1)
  );

  const safeBuyPrice = Math.max(
    0,
    Number(buyPrice || 0)
  );

  const safeSellPrice = Math.max(
    0,
    Number(sellPrice || 0)
  );

  const totalPieces =
    type !== "Pièce"
      ? safeQuantity * safePiecesPerUnit
      : safeQuantity;

  const pricePerPiece =
    totalPieces > 0
      ? safeBuyPrice / totalPieces
      : 0;

  const profitPerPiece =
    safeSellPrice - pricePerPiece;

  const totalProfit =
    profitPerPiece * totalPieces;

  // ==========================================================
  // CONTRÔLE INTERNET
  // ==========================================================

  const requireInternet = () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setShowOfflinePopup(true);
      return false;
    }

    return true;
  };

  // ==========================================================
  // ENREGISTRER LE PRODUIT
  // ==========================================================

  const saveProduct = async () => {
    if (loading) return;

    // Connexion obligatoire pour cette page
    if (!requireInternet()) return;

    const cleanName = name.trim();

    // Vérification du nom
    if (!cleanName) {
      alert("Veuillez entrer le nom du produit.");
      return;
    }

    // Vérification quantité
    if (
      !quantity ||
      safeQuantity <= 0 ||
      !Number.isFinite(safeQuantity)
    ) {
      alert("Veuillez entrer une quantité valide.");
      return;
    }

    // Vérification pièces par unité
    if (
      type !== "Pièce" &&
      (
        !piecesPerUnit ||
        safePiecesPerUnit <= 0 ||
        !Number.isFinite(safePiecesPerUnit)
      )
    ) {
      alert(
        `Veuillez entrer un nombre de pièces valide dans ${type}.`
      );
      return;
    }

    // Vérification prix d'achat
    if (
      !buyPrice ||
      safeBuyPrice < 0 ||
      !Number.isFinite(safeBuyPrice)
    ) {
      alert("Veuillez entrer un prix d'achat valide.");
      return;
    }

    // Vérification prix de vente
    if (
      !sellPrice ||
      safeSellPrice < 0 ||
      !Number.isFinite(safeSellPrice)
    ) {
      alert("Veuillez entrer un prix de vente valide.");
      return;
    }

    // Vérification stock réel
    if (!Number.isFinite(totalPieces) || totalPieces <= 0) {
      alert("La quantité totale du stock est invalide.");
      return;
    }

    // Avertissement bénéfice négatif
    if (profitPerPiece < 0) {
      const continueAnyway = confirm(
        `Attention : le prix de vente est inférieur au coût réel d'une pièce.\n\n` +
        `Vous risquez de vendre à perte.\n\n` +
        `Voulez-vous quand même ajouter ce produit ?`
      );

      if (!continueAnyway) return;
    }

    let userId: string | null =
      localStorage.getItem("user_id");

    // ========================================================
    // RÉCUPÉRATION DE L'UTILISATEUR
    // ========================================================

    if (!userId) {
      const phone =
        localStorage.getItem("phone");

      if (!phone) {
        alert("Utilisateur non connecté.");
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
        alert("Utilisateur introuvable.");
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

    // ========================================================
    // VÉRIFICATION INTERNET AVANT ENREGISTREMENT
    // ========================================================

    if (!requireInternet()) return;

    setLoading(true);

    try {
      const nPieces =
        type !== "Pièce"
          ? Number(piecesPerUnit || 1)
          : 1;

      const totalStock =
        Number(quantity) * nPieces;

      const unitCost =
        Number(buyPrice) / totalStock;

      const productData = {
        id: crypto.randomUUID(),
        user_id: userId,
        name: cleanName,
        unit: type,
        stock: totalStock,
        initial_stock: totalStock,
        purchase_price: unitCost,
        selling_price: Number(sellPrice),
        currency,
        created_at: new Date().toISOString(),
      };

      // Dernière vérification avant Supabase
      if (
        typeof navigator !== "undefined" &&
        !navigator.onLine
      ) {
        setLoading(false);
        setShowOfflinePopup(true);
        return;
      }

      const result = await supabase
        .from("products")
        .insert(productData);

      if (result.error) {
        // Si la connexion a disparu
        if (
          typeof navigator !== "undefined" &&
          !navigator.onLine
        ) {
          setShowOfflinePopup(true);
        } else {
          alert(
            result.error.message ||
            "Impossible d'ajouter le produit."
          );
        }

        setLoading(false);
        return;
      }

      // ======================================================
      // SUCCÈS
      // ======================================================

      setName("");
      setQuantity("");
      setBuyPrice("");
      setSellPrice("");
      setPiecesPerUnit("1");
      setType("Pièce");
      setCurrency("FC");

      setShowSuccessPopup(true);

    } catch (error) {
      console.error(error);

      if (
        typeof navigator !== "undefined" &&
        !navigator.onLine
      ) {
        setShowOfflinePopup(true);
      } else {
        alert(
          "Une erreur est survenue. Veuillez réessayer."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        min-h-screen
        overflow-x-hidden
        bg-[#020617]
        text-white
      "
    >

      {/* ======================================================
          LUMIÈRE DE FOND
      ====================================================== */}

      <div
        className="
          pointer-events-none
          fixed
          inset-0
          bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.14),transparent_38%)]
        "
      />

      {/* ======================================================
          CONTENU
      ====================================================== */}

      <div
        className="
          relative
          mx-auto
          w-full
          max-w-3xl
          px-3
          py-5
          sm:px-6
          sm:py-7
        "
      >

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="mb-6">

          <div
            className="
              mb-3
              flex
              items-center
              gap-3
            "
          >

            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-gradient-to-br
                from-orange-500
                to-yellow-400
                text-black
                shadow-lg
                sm:h-12
                sm:w-12
              "
            >
              <PackagePlus
                size={23}
              />
            </div>

            <div className="min-w-0">

              <h1
                className="
                  text-xl
                  font-black
                  leading-tight
                  text-white
                  sm:text-3xl
                "
              >
                Nouveau produit
              </h1>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-400
                  sm:text-sm
                "
              >
                Ajoutez un produit à votre stock
              </p>

            </div>

          </div>

          <p
            className="
              max-w-2xl
              text-xs
              leading-5
              text-slate-300
              sm:text-sm
              sm:leading-6
            "
          >
            Ajoutez vos produits, calculez le stock réel
            et estimez automatiquement votre bénéfice.
          </p>

        </div>

        {/* ======================================================
            GUIDE PRINCIPAL
        ====================================================== */}

        <div
          className="
            mb-6
            overflow-hidden
            rounded-3xl
            border
            border-white/10
            bg-white/[0.04]
            shadow-xl
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
              gap-3
              p-4
              sm:p-5
            "
          >

            <div
              className="
                flex
                min-w-0
                items-center
                gap-3
              "
            >

              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-orange-500/15
                  text-orange-400
                  sm:h-11
                  sm:w-11
                "
              >
                <Info size={21} />
              </div>

              <div className="min-w-0">

                <h2
                  className="
                    text-sm
                    font-black
                    text-white
                    sm:text-base
                  "
                >
                  Guide d'ajout
                </h2>

                <p
                  className="
                    mt-0.5
                    text-[11px]
                    text-slate-400
                    sm:text-xs
                  "
                >
                  Comprenez chaque étape
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowGuide(!showGuide)
              }
              className="
                min-h-[44px]
                shrink-0
                rounded-xl
                bg-orange-500
                px-3
                py-2
                text-[11px]
                font-black
                text-black
                transition
                active:scale-95
                sm:px-4
                sm:text-xs
              "
            >
              {showGuide
                ? "Fermer"
                : "Voir le guide"}
            </button>

          </div>

          {showGuide && (
            <div
              className="
                border-t
                border-white/10
                p-3
                sm:p-6
              "
            >

              {/* INTRODUCTION */}

              <div
                className="
                  mb-5
                  rounded-2xl
                  border
                  border-orange-500/20
                  bg-orange-500/10
                  p-4
                "
              >

                <div className="flex gap-3">

                  <Sparkles
                    className="
                      mt-0.5
                      shrink-0
                      text-orange-400
                    "
                    size={20}
                  />

                  <div className="min-w-0">

                    <h3
                      className="
                        text-sm
                        font-black
                        text-white
                        sm:text-base
                      "
                    >
                      Comment ça fonctionne ?
                    </h3>

                    <p
                      className="
                        mt-1
                        text-xs
                        leading-5
                        text-slate-300
                        sm:text-sm
                        sm:leading-6
                      "
                    >
                      Remplissez les informations du produit.
                      BISO-COMMERCE calcule automatiquement
                      le stock réel, le coût par pièce et
                      le bénéfice potentiel.
                    </p>

                  </div>

                </div>

              </div>

              {/* ÉTAPE 1 */}

              <div
                className="
                  mb-4
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/20
                  p-4
                "
              >

                <div
                  className="
                    mb-2
                    flex
                    items-center
                    gap-3
                  "
                >

                  <div
                    className="
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-blue-500/15
                      text-sm
                      font-black
                      text-blue-400
                    "
                  >
                    1
                  </div>

                  <h3
                    className="
                      text-sm
                      font-black
                      text-white
                      sm:text-base
                    "
                  >
                    Nom du produit
                  </h3>

                </div>

                <p
                  className="
                    text-xs
                    leading-5
                    text-slate-300
                    sm:text-sm
                    sm:leading-6
                  "
                >
                  Écrivez un nom facile à reconnaître.
                  Exemple : Coca-Cola 33cl, Paracétamol
                  500mg ou Riz 25kg.
                </p>

              </div>

              {/* ÉTAPE 2 */}

              <div
                className="
                  mb-4
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/20
                  p-4
                "
              >

                <div
                  className="
                    mb-2
                    flex
                    items-center
                    gap-3
                  "
                >

                  <div
                    className="
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-purple-500/15
                      text-sm
                      font-black
                      text-purple-400
                    "
                  >
                    2
                  </div>

                  <h3
                    className="
                      text-sm
                      font-black
                      text-white
                      sm:text-base
                    "
                  >
                    Type d'unité
                  </h3>

                </div>

                <p
                  className="
                    text-xs
                    leading-5
                    text-slate-300
                    sm:text-sm
                  "
                >
                  Choisissez Pièce, Carton, Boîte ou Sachet.
                </p>

                <div
                  className="
                    mt-3
                    grid
                    grid-cols-2
                    gap-2
                  "
                >

                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs font-bold text-white">
                      📦 Pièce
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs font-bold text-white">
                      📦 Carton
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs font-bold text-white">
                      📦 Boîte
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs font-bold text-white">
                      🛍️ Sachet
                    </p>
                  </div>

                </div>

              </div>

              {/* ÉTAPE 3 */}

              <div
                className="
                  mb-4
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/20
                  p-4
                "
              >

                <div
                  className="
                    mb-2
                    flex
                    items-center
                    gap-3
                  "
                >

                  <div
                    className="
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-green-500/15
                      text-sm
                      font-black
                      text-green-400
                    "
                  >
                    3
                  </div>

                  <h3
                    className="
                      text-sm
                      font-black
                      text-white
                      sm:text-base
                    "
                  >
                    Quantité achetée
                  </h3>

                </div>

                <p
                  className="
                    text-xs
                    leading-5
                    text-slate-300
                    sm:text-sm
                  "
                >
                  Indiquez combien d'unités vous avez
                  achetées chez votre fournisseur.
                </p>

                <div
                  className="
                    mt-3
                    rounded-xl
                    bg-green-500/10
                    p-3
                  "
                >
                  <p className="text-xs text-slate-400">
                    Exemple :
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-black
                      text-white
                    "
                  >
                    5 cartons
                  </p>
                </div>

              </div>

              {/* ÉTAPE 4 */}

              <div
                className="
                  mb-4
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/20
                  p-4
                "
              >

                <div
                  className="
                    mb-2
                    flex
                    items-center
                    gap-3
                  "
                >

                  <div
                    className="
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-cyan-500/15
                      text-sm
                      font-black
                      text-cyan-400
                    "
                  >
                    4
                  </div>

                  <h3
                    className="
                      text-sm
                      font-black
                      text-white
                      sm:text-base
                    "
                  >
                    Pièces par unité
                  </h3>

                </div>

                <p
                  className="
                    text-xs
                    leading-5
                    text-slate-300
                    sm:text-sm
                  "
                >
                  Pour un carton, une boîte ou un sachet,
                  indiquez le nombre de pièces qu'il contient.
                </p>

                <div
                  className="
                    mt-3
                    rounded-xl
                    bg-cyan-500/10
                    p-3
                  "
                >
                  <p className="text-xs text-slate-400">
                    Exemple :
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-black
                      text-cyan-400
                    "
                  >
                    1 carton = 24 bouteilles
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Écrivez : 24
                  </p>
                </div>

              </div>

              {/* ÉTAPE 5 */}

              <div
                className="
                  mb-4
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/20
                  p-4
                "
              >

                <div
                  className="
                    mb-2
                    flex
                    items-center
                    gap-3
                  "
                >

                  <div
                    className="
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-yellow-500/15
                      text-sm
                      font-black
                      text-yellow-400
                    "
                  >
                    5
                  </div>

                  <h3
                    className="
                      text-sm
                      font-black
                      text-white
                      sm:text-base
                    "
                  >
                    Prix d'achat total
                  </h3>

                </div>

                <p
                  className="
                    text-xs
                    leading-5
                    text-slate-300
                    sm:text-sm
                  "
                >
                  Entrez le montant total payé au fournisseur.
                </p>

                <div
                  className="
                    mt-3
                    rounded-xl
                    bg-yellow-500/10
                    p-3
                  "
                >
                  <p className="text-xs text-slate-400">
                    Exemple :
                  </p>

                  <p
                    className="
                      mt-1
                      text-base
                      font-black
                      text-white
                    "
                  >
                    100 000 FC
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Écrivez : 100000
                  </p>
                </div>

              </div>

              {/* ÉTAPE 6 */}

              <div
                className="
                  mb-4
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/20
                  p-4
                "
              >

                <div
                  className="
                    mb-2
                    flex
                    items-center
                    gap-3
                  "
                >

                  <div
                    className="
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-orange-500/15
                      text-sm
                      font-black
                      text-orange-400
                    "
                  >
                    6
                  </div>

                  <h3
                    className="
                      text-sm
                      font-black
                      text-white
                      sm:text-base
                    "
                  >
                    Prix de vente
                  </h3>

                </div>

                <p
                  className="
                    text-xs
                    leading-5
                    text-slate-300
                    sm:text-sm
                  "
                >
                  Indiquez le prix auquel vous vendrez
                  une seule pièce.
                </p>

                <div
                  className="
                    mt-3
                    rounded-xl
                    bg-orange-500/10
                    p-3
                  "
                >
                  <p className="text-xs text-slate-400">
                    Exemple :
                  </p>

                  <p
                    className="
                      mt-1
                      text-base
                      font-black
                      text-white
                    "
                  >
                    2 000 FC / pièce
                  </p>
                </div>

              </div>

              {/* BÉNÉFICE */}

              <div
                className="
                  rounded-2xl
                  border
                  border-green-500/20
                  bg-green-500/10
                  p-4
                "
              >

                <div
                  className="
                    mb-2
                    flex
                    items-center
                    gap-3
                  "
                >

                  <TrendingUp
                    size={21}
                    className="shrink-0 text-green-400"
                  />

                  <h3
                    className="
                      text-sm
                      font-black
                      text-white
                      sm:text-base
                    "
                  >
                    Bénéfice automatique
                  </h3>

                </div>

                <p
                  className="
                    text-xs
                    leading-5
                    text-slate-300
                    sm:text-sm
                  "
                >
                  Le système calcule le coût réel,
                  le bénéfice par pièce et le bénéfice
                  potentiel de tout le stock.
                </p>

              </div>

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="
                  mt-5
                  flex
                  min-h-[48px]
                  w-full
                  items-center
                  justify-center
                  rounded-2xl
                  bg-orange-500
                  px-4
                  py-3
                  text-sm
                  font-black
                  text-black
                  transition
                  active:scale-[0.98]
                "
              >
                Fermer le guide
              </button>

            </div>
          )}

        </div>

        {/* ======================================================
            FORMULAIRE
        ====================================================== */}

        <div
          className="
            space-y-4
            rounded-3xl
            border
            border-white/10
            bg-white/[0.04]
            p-3
            shadow-xl
            sm:space-y-5
            sm:p-6
          "
        >

          {/* NOM */}

          <div>

            <label
              className="
                mb-2
                block
                text-xs
                font-bold
                text-slate-300
              "
            >
              Nom du produit
            </label>

            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Ex : Coca-Cola 33cl"
              autoComplete="off"
              className="
                min-h-[50px]
                w-full
                rounded-2xl
                border
                border-white/10
                bg-black/40
                px-4
                py-3
                text-sm
                text-white
                outline-none
                placeholder:text-slate-500
                focus:border-orange-500/50
                focus:ring-2
                focus:ring-orange-500/10
              "
            />

          </div>

          {/* TYPE */}

          <div>

            <label
              className="
                mb-2
                block
                text-xs
                font-bold
                text-slate-300
              "
            >
              Type d'unité
            </label>

            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value)
              }
              className="
                min-h-[50px]
                w-full
                rounded-2xl
                border
                border-white/10
                bg-[#111827]
                px-4
                py-3
                text-sm
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

          {/* QUANTITÉ */}

          <div>

            <label
              className="
                mb-2
                block
                text-xs
                font-bold
                text-slate-300
              "
            >
              Quantité achetée
            </label>

            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={quantity}
              onChange={(e) =>
                setQuantity(e.target.value)
              }
              placeholder={`Nombre de ${type}(s)`}
              className="
                min-h-[50px]
                w-full
                rounded-2xl
                border
                border-white/10
                bg-black/40
                px-4
                py-3
                text-sm
                text-white
                outline-none
                placeholder:text-slate-500
                focus:border-orange-500/50
                focus:ring-2
                focus:ring-orange-500/10
              "
            />

          </div>

          {/* PIÈCES PAR UNITÉ */}

          {type !== "Pièce" && (
            <div>

              <label
                className="
                  mb-2
                  block
                  text-xs
                  font-bold
                  text-slate-300
                "
              >
                Pièces dans {type}
              </label>

              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={piecesPerUnit}
                onChange={(e) =>
                  setPiecesPerUnit(e.target.value)
                }
                placeholder="Ex : 24"
                className="
                  min-h-[50px]
                  w-full
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/40
                  px-4
                  py-3
                  text-sm
                  text-white
                  outline-none
                  placeholder:text-slate-500
                  focus:border-orange-500/50
                  focus:ring-2
                  focus:ring-orange-500/10
                "
              />

              <p
                className="
                  mt-2
                  text-xs
                  font-bold
                  leading-5
                  text-orange-400
                "
              >
                💡 1 {type.toLowerCase()} = 24 pièces →
                écrivez 24
              </p>

            </div>
          )}

          {/* PRIX ACHAT */}

          <div>

            <label
              className="
                mb-2
                block
                text-xs
                font-bold
                text-slate-300
              "
            >
              Prix d'achat total
            </label>

            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={buyPrice}
              onChange={(e) =>
                setBuyPrice(e.target.value)
              }
              placeholder="Ex : 100000"
              className="
                min-h-[50px]
                w-full
                rounded-2xl
                border
                border-white/10
                bg-black/40
                px-4
                py-3
                text-sm
                text-white
                outline-none
                placeholder:text-slate-500
                focus:border-orange-500/50
                focus:ring-2
                focus:ring-orange-500/10
              "
            />

            <p
              className="
                mt-2
                text-xs
                font-bold
                leading-5
                text-orange-400
              "
            >
              💡 Montant total payé au fournisseur.
            </p>

          </div>

          {/* PRIX VENTE */}

          <div>

            <label
              className="
                mb-2
                block
                text-xs
                font-bold
                text-slate-300
              "
            >
              Prix de vente par pièce
            </label>

            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={sellPrice}
              onChange={(e) =>
                setSellPrice(e.target.value)
              }
              placeholder="Ex : 2000"
              className="
                min-h-[50px]
                w-full
                rounded-2xl
                border
                border-white/10
                bg-black/40
                px-4
                py-3
                text-sm
                text-white
                outline-none
                placeholder:text-slate-500
                focus:border-orange-500/50
                focus:ring-2
                focus:ring-orange-500/10
              "
            />

            <p
              className="
                mt-2
                text-xs
                font-bold
                leading-5
                text-orange-400
              "
            >
              💡 Prix auquel vous vendrez 1 pièce.
            </p>

          </div>

          {/* MONNAIE */}

          <div>

            <label
              className="
                mb-2
                block
                text-xs
                font-bold
                text-slate-300
              "
            >
              Monnaie
            </label>

            <select
              value={currency}
              onChange={(e) =>
                setCurrency(e.target.value)
              }
              className="
                min-h-[50px]
                w-full
                rounded-2xl
                border
                border-white/10
                bg-[#111827]
                px-4
                py-3
                text-sm
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

          <div
            className="
              overflow-hidden
              rounded-3xl
              border
              border-orange-500/20
              bg-gradient-to-br
              from-orange-500/10
              to-yellow-500/5
            "
          >

            <div
              className="
                border-b
                border-white/10
                p-4
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >

                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-orange-500/15
                    text-orange-400
                  "
                >
                  <TrendingUp size={20} />
                </div>

                <div className="min-w-0">

                  <h2
                    className="
                      text-sm
                      font-black
                      text-white
                      sm:text-base
                    "
                  >
                    Résumé automatique
                  </h2>

                  <p
                    className="
                      text-[11px]
                      text-slate-400
                      sm:text-xs
                    "
                  >
                    Résultats calculés automatiquement
                  </p>

                </div>

              </div>

            </div>

            <div
              className="
                grid
                grid-cols-2
                gap-2
                p-3
                sm:gap-3
                sm:p-4
              "
            >

              {/* STOCK */}

              <div
                className="
                  min-w-0
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/20
                  p-3
                  sm:p-4
                "
              >

                <div
                  className="
                    mb-2
                    flex
                    items-center
                    gap-1.5
                    text-[10px]
                    font-bold
                    text-slate-400
                    sm:text-xs
                  "
                >
                  <Boxes size={15} />
                  Stock réel
                </div>

                <p
                  className="
                    break-words
                    text-lg
                    font-black
                    text-white
                    sm:text-xl
                  "
                >
                  {totalPieces.toLocaleString()}
                </p>

                <p
                  className="
                    text-[10px]
                    text-slate-500
                    sm:text-xs
                  "
                >
                  pièce(s)
                </p>

              </div>

              {/* COÛT */}

              <div
                className="
                  min-w-0
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/20
                  p-3
                  sm:p-4
                "
              >

                <div
                  className="
                    mb-2
                    flex
                    items-center
                    gap-1.5
                    text-[10px]
                    font-bold
                    text-slate-400
                    sm:text-xs
                  "
                >
                  <CircleDollarSign size={15} />
                  Coût / pièce
                </div>

                <p
                  className="
                    break-words
                    text-base
                    font-black
                    text-white
                    sm:text-xl
                  "
                >
                  {Math.round(pricePerPiece).toLocaleString()}{" "}
                  {currency}
                </p>

              </div>

              {/* BÉNÉFICE PIÈCE */}

              <div
                className="
                  min-w-0
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/20
                  p-3
                  sm:p-4
                "
              >

                <div
                  className="
                    mb-2
                    flex
                    items-center
                    gap-1.5
                    text-[10px]
                    font-bold
                    text-slate-400
                    sm:text-xs
                  "
                >
                  <TrendingUp size={15} />
                  Bénéfice / pièce
                </div>

                <p
                  className={`
                    break-words
                    text-base
                    font-black
                    sm:text-xl
                    ${
                      profitPerPiece >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  `}
                >
                  {Math.round(
                    profitPerPiece
                  ).toLocaleString()}{" "}
                  {currency}
                </p>

                {profitPerPiece < 0 && (
                  <p
                    className="
                      mt-1
                      text-[10px]
                      font-bold
                      text-red-400
                    "
                  >
                    Vente à perte
                  </p>
                )}

              </div>

              {/* BÉNÉFICE TOTAL */}

              <div
                className="
                  min-w-0
                  rounded-2xl
                  border
                  border-green-500/20
                  bg-green-500/5
                  p-3
                  sm:p-4
                "
              >

                <div
                  className="
                    mb-2
                    flex
                    items-center
                    gap-1.5
                    text-[10px]
                    font-bold
                    text-slate-400
                    sm:text-xs
                  "
                >
                  <Sparkles size={15} />
                  Bénéfice total
                </div>

                <p
                  className={`
                    break-words
                    text-base
                    font-black
                    sm:text-xl
                    ${
                      totalProfit >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  `}
                >
                  {Math.round(
                    totalProfit
                  ).toLocaleString()}{" "}
                  {currency}
                </p>

                <p
                  className="
                    mt-1
                    text-[10px]
                    text-slate-500
                  "
                >
                  stock vendu
                </p>

              </div>

            </div>

            {/* VÉRIFICATION */}

            <div
              className="
                mx-3
                mb-3
                rounded-2xl
                border
                border-white/10
                bg-black/20
                p-3
                sm:mx-4
                sm:mb-4
                sm:p-4
              "
            >

              <div className="flex gap-3">

                {profitPerPiece >= 0 ? (
                  <CheckCircle
                    size={19}
                    className="
                      mt-0.5
                      shrink-0
                      text-green-400
                    "
                  />
                ) : (
                  <AlertTriangle
                    size={19}
                    className="
                      mt-0.5
                      shrink-0
                      text-red-400
                    "
                  />
                )}

                <div className="min-w-0">

                  <p
                    className="
                      text-xs
                      font-bold
                      text-white
                      sm:text-sm
                    "
                  >
                    Vérification
                  </p>

                  {profitPerPiece >= 0 ? (
                    <p
                      className="
                        mt-1
                        text-[11px]
                        leading-5
                        text-slate-400
                        sm:text-xs
                      "
                    >
                      Votre prix de vente couvre le coût
                      calculé de la pièce.
                    </p>
                  ) : (
                    <p
                      className="
                        mt-1
                        text-[11px]
                        leading-5
                        text-red-300
                        sm:text-xs
                      "
                    >
                      Attention : votre prix de vente est
                      inférieur au coût réel de la pièce.
                    </p>
                  )}

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
              min-h-[52px]
              w-full
              items-center
              justify-center
              gap-3
              rounded-2xl
              bg-gradient-to-r
              from-orange-500
              to-yellow-400
              px-4
              py-3
              text-sm
              font-black
              text-black
              shadow-xl
              transition
              active:scale-[0.98]
              hover:brightness-110
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

          <p
            className="
              pb-1
              text-center
              text-[10px]
              leading-4
              text-slate-500
              sm:text-xs
            "
          >
            Vérifiez les informations avant de confirmer.
          </p>

        </div>

      </div>

      {/* ======================================================
          POPUP — PAS DE CONNEXION
      ====================================================== */}

      {showOfflinePopup && (
        <div
          className="
            fixed
            inset-0
            z-[9999]
            flex
            items-center
            justify-center
            bg-black/75
            px-4
            backdrop-blur-md
          "
          role="dialog"
          aria-modal="true"
        >

          <div
            className="
              w-full
              max-w-sm
              overflow-hidden
              rounded-[2rem]
              border
              border-orange-400/20
              bg-[#0b1220]
              p-5
              shadow-[0_25px_80px_rgba(0,0,0,0.7)]
            "
          >

            <div className="flex justify-center">

              <div
                className="
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  bg-orange-500/15
                  ring-1
                  ring-orange-400/20
                "
              >
                <WifiOff
                  size={29}
                  className="text-orange-400"
                />
              </div>

            </div>

            <div className="mt-5 text-center">

              <h2
                className="
                  text-lg
                  font-black
                  leading-tight
                  text-white
                "
              >
                Connexion Internet requise
              </h2>

              <p
                className="
                  mx-auto
                  mt-3
                  max-w-xs
                  text-sm
                  leading-6
                  text-slate-400
                "
              >
                Cher client, cette requête nécessite
                une connexion Internet.
              </p>

              <p
                className="
                  mt-2
                  text-xs
                  leading-5
                  text-slate-500
                "
              >
                Connectez-vous à Internet puis
                réessayez.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowOfflinePopup(false)
              }
              className="
                mt-6
                flex
                min-h-[48px]
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-gradient-to-r
                from-orange-500
                to-yellow-400
                px-4
                py-3
                text-sm
                font-black
                text-black
                shadow-lg
                transition
                active:scale-[0.98]
              "
            >
              <X size={17} />
              J'ai compris
            </button>

          </div>

        </div>
      )}

      {/* ======================================================
          POPUP — PRODUIT AJOUTÉ
      ====================================================== */}

      {showSuccessPopup && (
        <div
          className="
            fixed
            inset-0
            z-[9999]
            flex
            items-center
            justify-center
            bg-black/75
            px-4
            backdrop-blur-md
          "
          role="dialog"
          aria-modal="true"
        >

          <div
            className="
              w-full
              max-w-sm
              rounded-[2rem]
              border
              border-green-400/20
              bg-[#0b1220]
              p-5
              text-center
              shadow-[0_25px_80px_rgba(0,0,0,0.7)]
            "
          >

            <div className="flex justify-center">

              <div
                className="
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  bg-green-500/15
                  ring-1
                  ring-green-400/20
                "
              >
                <CheckCircle
                  size={32}
                  className="text-green-400"
                />
              </div>

            </div>

            <h2
              className="
                mt-5
                text-lg
                font-black
                text-white
              "
            >
              Produit ajouté avec succès
            </h2>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-slate-400
              "
            >
              Votre produit a été enregistré
              correctement dans votre stock.
            </p>

            <div
             
            >

            

            </div>

            <button
              type="button"
              onClick={() =>
                setShowSuccessPopup(false)
              }
              className="
                mt-5
                flex
                min-h-[48px]
                w-full
                items-center
                justify-center
                rounded-2xl
                bg-green-500
                px-4
                py-3
                text-sm
                font-black
                text-black
                transition
                active:scale-[0.98]
              "
            >
              Continuer
            </button>

          </div>

        </div>
      )}

    </div>
  );
}