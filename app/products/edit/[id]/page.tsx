"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import {
  Package,
  Loader2,
  CheckCircle,
  Info,
  Sparkles,
  Boxes,
  CircleDollarSign,
  TrendingUp,
  AlertTriangle,
  RefreshCcw,
  Pencil,
  Plus,
  ArrowRight,
} from "lucide-react";

type Product = {
  id: string;
  user_id: string;
  name: string | null;
  unit: string | null;
  stock: number;
  initial_stock?: number | null;
  purchase_price: number;
  selling_price: number;
  currency: string;
  pieces_per_unit?: number | null;
  created_at?: string;
};

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();

  const productId = String(params.id);

  const [loadingProduct, setLoadingProduct] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingRestock, setLoadingRestock] = useState(false);

  const [product, setProduct] = useState<Product | null>(null);

  // ==========================================================
  // MODE
  // ==========================================================

  const [mode, setMode] = useState<"edit" | "restock">("edit");

  // ==========================================================
  // FORMULAIRE MODIFICATION
  // ==========================================================

  const [name, setName] = useState("");
  const [type, setType] = useState("Pièce");
  const [quantity, setQuantity] = useState("");
  const [piecesPerUnit, setPiecesPerUnit] = useState("1");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [currency, setCurrency] = useState("FC");

  // ==========================================================
  // FORMULAIRE RÉAPPROVISIONNEMENT
  // ==========================================================

  const [restockQuantity, setRestockQuantity] = useState("");
  const [restockPiecesPerUnit, setRestockPiecesPerUnit] =
    useState("1");
  const [restockBuyPrice, setRestockBuyPrice] = useState("");

  const [showGuide, setShowGuide] = useState(false);

  // ==========================================================
  // CHARGER LE PRODUIT
  // ==========================================================

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoadingProduct(true);

        const userId = localStorage.getItem("user_id");

        if (!userId) {
          alert("Utilisateur non connecté.");
          router.push("/products");
          return;
        }

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .eq("user_id", userId)
          .single();

        if (error || !data) {
          console.error(error);
          alert("Produit introuvable.");
          router.push("/products");
          return;
        }

        const loadedProduct = data as Product;

        setProduct(loadedProduct);

        // ====================================================
        // INFORMATIONS GÉNÉRALES
        // ====================================================

        setName(loadedProduct.name || "");

        const loadedType = loadedProduct.unit || "Pièce";
        setType(loadedType);

        setCurrency(loadedProduct.currency || "FC");

        setSellPrice(
          String(Number(loadedProduct.selling_price || 0))
        );

        // ====================================================
        // PIÈCES PAR UNITÉ
        // ====================================================

        const savedPiecesPerUnit = Number(
          loadedProduct.pieces_per_unit || 1
        );

        setPiecesPerUnit(
          String(
            savedPiecesPerUnit > 0
              ? savedPiecesPerUnit
              : 1
          )
        );

        setRestockPiecesPerUnit(
          String(
            savedPiecesPerUnit > 0
              ? savedPiecesPerUnit
              : 1
          )
        );

        // ====================================================
        // STOCK RÉEL
        // ====================================================

        const currentStock = Number(
          loadedProduct.stock || 0
        );

        const currentUnitCost = Number(
          loadedProduct.purchase_price || 0
        );

        // ====================================================
        // QUANTITÉ AFFICHÉE
        // ====================================================

        if (loadedType === "Pièce") {
          setQuantity(String(currentStock));
        } else {
          const displayedQuantity =
            savedPiecesPerUnit > 0
              ? currentStock / savedPiecesPerUnit
              : currentStock;

          setQuantity(
            String(
              Number(
                displayedQuantity.toFixed(2)
              )
            )
          );
        }

        // ====================================================
        // PRIX D'ACHAT TOTAL
        // ====================================================

        const currentTotalPurchase =
          currentUnitCost * currentStock;

        setBuyPrice(
          String(
            Number(
              currentTotalPurchase.toFixed(2)
            )
          )
        );
      } catch (error) {
        console.error(error);

        alert(
          "Une erreur est survenue lors du chargement du produit."
        );

        router.push("/products");
      } finally {
        setLoadingProduct(false);
      }
    };

    if (productId) {
      loadProduct();
    }
  }, [productId, router]);

  // ==========================================================
  // STOCK TOTAL APRÈS MODIFICATION
  // ==========================================================

  const totalPieces = useMemo(() => {
    const q = Number(quantity || 0);

    if (type === "Pièce") {
      return q;
    }

    const pieces = Number(
      piecesPerUnit || 1
    );

    return q * pieces;
  }, [quantity, piecesPerUnit, type]);

  // ==========================================================
  // COÛT PAR PIÈCE APRÈS MODIFICATION
  // ==========================================================

  const pricePerPiece = useMemo(() => {
    const total = Number(buyPrice || 0);

    if (totalPieces <= 0) {
      return 0;
    }

    return total / totalPieces;
  }, [buyPrice, totalPieces]);

  // ==========================================================
  // BÉNÉFICE PAR PIÈCE
  // ==========================================================

  const profitPerPiece = useMemo(() => {
    return (
      Number(sellPrice || 0) -
      pricePerPiece
    );
  }, [sellPrice, pricePerPiece]);

  // ==========================================================
  // BÉNÉFICE TOTAL
  // ==========================================================

  const totalProfit = useMemo(() => {
    return profitPerPiece * totalPieces;
  }, [profitPerPiece, totalPieces]);

  // ==========================================================
  // STOCK ACTUEL
  // ==========================================================

  const currentStock = Number(
    product?.stock || 0
  );

  // ==========================================================
  // RÉAPPROVISIONNEMENT
  // ==========================================================

  const restockPieces = useMemo(() => {
    const q = Number(restockQuantity || 0);

    if (product?.unit === "Pièce") {
      return q;
    }

    // CORRECTION :
    // On utilise maintenant la valeur saisie
    // par l'utilisateur dans le champ
    // "Nombre de pièces dans l'unité".
    const pieces = Number(
      restockPiecesPerUnit || 1
    );

    return q * pieces;
  }, [
    restockQuantity,
    restockPiecesPerUnit,
    product,
  ]);

  // ==========================================================
  // NOUVEAU STOCK APRÈS RÉAPPROVISIONNEMENT
  // ==========================================================

  const newStockAfterRestock = useMemo(() => {
    return (
      currentStock +
      restockPieces
    );
  }, [
    currentStock,
    restockPieces,
  ]);

  // ==========================================================
  // PRIX D'ACHAT DU NOUVEL ARRIVAGE
  // ==========================================================

  const restockUnitCost = useMemo(() => {
    const total = Number(
      restockBuyPrice || 0
    );

    if (restockPieces <= 0) {
      return 0;
    }

    return total / restockPieces;
  }, [
    restockBuyPrice,
    restockPieces,
  ]);

  // ==========================================================
  // COÛT MOYEN APRÈS RÉAPPROVISIONNEMENT
  // ==========================================================

  const newAverageCost = useMemo(() => {
    const oldCost = Number(
      product?.purchase_price || 0
    );

    const oldValue =
      currentStock * oldCost;

    const newValue =
      restockPieces *
      restockUnitCost;

    if (newStockAfterRestock <= 0) {
      return 0;
    }

    return (
      (oldValue + newValue) /
      newStockAfterRestock
    );
  }, [
    product,
    currentStock,
    restockPieces,
    restockUnitCost,
    newStockAfterRestock,
  ]);

  // ==========================================================
  // MODIFIER LE PRODUIT
  // ==========================================================

  const updateProduct = async () => {
    if (!product) {
      return;
    }

    if (!name.trim()) {
      alert(
        "Veuillez entrer le nom du produit."
      );
      return;
    }

    if (quantity === "") {
      alert(
        "Veuillez entrer la quantité."
      );
      return;
    }

    if (Number(quantity) < 0) {
      alert(
        "La quantité ne peut pas être négative."
      );
      return;
    }

    const nPieces =
      type !== "Pièce"
        ? Number(
            piecesPerUnit || 0
          )
        : 1;

    if (nPieces <= 0) {
      alert(
        "Le nombre de pièces dans l'unité doit être supérieur à 0."
      );
      return;
    }

    if (Number(buyPrice || 0) < 0) {
      alert(
        "Le prix d'achat ne peut pas être négatif."
      );
      return;
    }

    if (Number(sellPrice || 0) < 0) {
      alert(
        "Le prix de vente ne peut pas être négatif."
      );
      return;
    }

    if (totalPieces < 0) {
      alert(
        "Le stock réel ne peut pas être négatif."
      );
      return;
    }

    const confirmed = confirm(
      "Voulez-vous vraiment modifier ce produit ?\n\n" +
        "Cette opération remplacera le stock actuel par la nouvelle quantité indiquée."
    );

    if (!confirmed) {
      return;
    }

    const userId =
      localStorage.getItem("user_id");

    if (!userId) {
      alert(
        "Utilisateur non connecté."
      );
      return;
    }

    setLoading(true);

    try {
      // ======================================================
      // PRIX D'ACHAT PAR PIÈCE
      // ======================================================

      let unitCost = 0;

      if (totalPieces > 0) {
        unitCost =
          Number(buyPrice || 0) /
          totalPieces;
      } else {
        /*
         * Si le produit est volontairement
         * enregistré avec 0 stock, on conserve
         * l'ancien coût d'achat.
         */
        unitCost = Number(
          product.purchase_price || 0
        );
      }

      // ======================================================
      // DONNÉES
      // ======================================================

      const updatedData = {
        name: name.trim(),
        unit: type,
        stock: totalPieces,
        purchase_price: unitCost,
        selling_price:
          Number(sellPrice || 0),
        currency,
        pieces_per_unit:
          nPieces,
      };

      const { error } =
        await supabase
          .from("products")
          .update(updatedData)
          .eq("id", productId)
          .eq("user_id", userId);

      if (error) {
        console.error(error);

        alert(
          "Erreur lors de la modification : " +
            error.message
        );

        return;
      }

      alert(
        "Produit modifié avec succès ✅"
      );

      router.push("/products");
      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        "Une erreur est survenue pendant la modification."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // RÉAPPROVISIONNER
  // ==========================================================

  const restockProduct = async () => {
    if (!product) {
      return;
    }

    if (
      restockQuantity === "" ||
      Number(restockQuantity) <= 0
    ) {
      alert(
        "Veuillez entrer une quantité à ajouter supérieure à 0."
      );
      return;
    }

    // ======================================================
    // CORRECTION :
    // Vérification du nombre de pièces par unité
    // ======================================================

    if (
      product.unit !== "Pièce" &&
      Number(restockPiecesPerUnit || 0) <= 0
    ) {
      alert(
        `Le nombre de pièces dans ${product.unit || "l'unité"} doit être supérieur à 0.`
      );
      return;
    }

    if (Number(restockBuyPrice || 0) < 0) {
      alert(
        "Le prix d'achat du nouvel arrivage ne peut pas être négatif."
      );
      return;
    }

    if (restockPieces <= 0) {
      alert(
        "La quantité reçue doit être supérieure à 0."
      );
      return;
    }

    const confirmed = confirm(
      "Voulez-vous vraiment réapprovisionner ce produit ?\n\n" +
        `Stock actuel : ${currentStock} pièce(s)\n` +
        `Nouvel arrivage : ${restockPieces} pièce(s)\n` +
        `Nouveau stock : ${newStockAfterRestock} pièce(s)\n\n` +
        "L'ancien stock ne sera pas remplacé. La nouvelle quantité sera ajoutée."
    );

    if (!confirmed) {
      return;
    }

    const userId =
      localStorage.getItem("user_id");

    if (!userId) {
      alert(
        "Utilisateur non connecté."
      );
      return;
    }

    setLoadingRestock(true);

    try {
      const oldStock =
        Number(product.stock || 0);

      const oldUnitCost =
        Number(
          product.purchase_price || 0
        );

      const incomingTotal =
        Number(
          restockBuyPrice || 0
        );

      const incomingUnitCost =
        restockPieces > 0
          ? incomingTotal /
            restockPieces
          : 0;

      // ======================================================
      // VALEUR ANCIEN STOCK
      // ======================================================

      const oldStockValue =
        oldStock *
        oldUnitCost;

      // ======================================================
      // VALEUR NOUVEL ARRIVAGE
      // ======================================================

      const incomingStockValue =
        restockPieces *
        incomingUnitCost;

      // ======================================================
      // NOUVELLE VALEUR TOTALE
      // ======================================================

      const totalStockValue =
        oldStockValue +
        incomingStockValue;

      // ======================================================
      // COÛT MOYEN
      // ======================================================

      const averageCost =
        newStockAfterRestock > 0
          ? totalStockValue /
            newStockAfterRestock
          : 0;

      // ======================================================
      // MISE À JOUR
      // ======================================================

      const updatedData = {
        stock:
          newStockAfterRestock,

        purchase_price:
          averageCost,

        /*
         * CORRECTION :
         * Pour une unité composée, on conserve
         * le nombre de pièces réellement saisi
         * pour le nouvel arrivage.
         */
        pieces_per_unit:
          product.unit !== "Pièce"
            ? Number(
                restockPiecesPerUnit || 1
              )
            : 1,
      };

      const { error } =
        await supabase
          .from("products")
          .update(updatedData)
          .eq("id", productId)
          .eq("user_id", userId);

      if (error) {
        console.error(error);

        alert(
          "Erreur lors du réapprovisionnement : " +
            error.message
        );

        return;
      }

      alert(
        "Réapprovisionnement effectué avec succès ✅\n\n" +
          `Ancien stock : ${oldStock} pièce(s)\n` +
          `Ajout : ${restockPieces} pièce(s)\n` +
          `Nouveau stock : ${newStockAfterRestock} pièce(s)`
      );

      router.push("/products");
      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        "Une erreur est survenue pendant le réapprovisionnement."
      );
    } finally {
      setLoadingRestock(false);
    }
  };

  // ==========================================================
  // CHARGEMENT
  // ==========================================================

  if (loadingProduct) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2
            size={22}
            className="animate-spin"
          />

          Chargement du produit...
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
        <div className="text-center">
          <AlertTriangle
            className="mx-auto mb-3 text-red-400"
            size={35}
          />

          <p className="font-bold">
            Produit introuvable
          </p>

          <button
            onClick={() =>
              router.push("/products")
            }
            className="mt-4 rounded-2xl bg-orange-500 px-5 py-3 font-black text-black"
          >
            Retour aux produits
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">

      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="mb-6">

          <div className="mb-3 flex items-center gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-400 text-black shadow-lg">

              <Package size={24} />

            </div>

            <div>

              <h1 className="text-2xl font-black text-white sm:text-3xl">
                Gestion du produit
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                Modifiez ou réapprovisionnez votre produit
              </p>

            </div>

          </div>

          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            Ici, vous pouvez soit corriger les
            informations du produit, soit ajouter
            une nouvelle quantité à votre stock
            existant.
          </p>

        </div>

        {/* ======================================================
            PRODUIT ACTUEL
        ====================================================== */}

        <div className="mb-6 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-4">

          <div className="flex items-start gap-3">

            <Info
              size={20}
              className="mt-0.5 shrink-0 text-blue-400"
            />

            <div className="min-w-0">

              <p className="font-black text-white">
                Produit actuellement sélectionné
              </p>

              <p className="mt-1 text-sm text-slate-300">
                {product.name ||
                  "Produit sans nom"}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">

                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-[11px] text-slate-500">
                    Unité
                  </p>
                  <p className="mt-1 font-black text-white">
                    {product.unit ||
                      "Pièce"}
                  </p>
                </div>

                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-[11px] text-slate-500">
                    Stock
                  </p>
                  <p className="mt-1 font-black text-white">
                    {currentStock}
                  </p>
                </div>

                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-[11px] text-slate-500">
                    Coût/pièce
                  </p>
                  <p className="mt-1 font-black text-white">
                    {Math.round(
                      Number(
                        product.purchase_price ||
                          0
                      )
                    )}{" "}
                    {product.currency}
                  </p>
                </div>

                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-[11px] text-slate-500">
                    Vente/pièce
                  </p>
                  <p className="mt-1 font-black text-white">
                    {Math.round(
                      Number(
                        product.selling_price ||
                          0
                      )
                    )}{" "}
                    {product.currency}
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* ======================================================
            GUIDE
        ====================================================== */}

        <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-xl">

          <div className="flex items-center justify-between gap-4 p-4 sm:p-5">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">

                <Info size={22} />

              </div>

              <div>

                <h2 className="font-black text-white">
                  Guide de gestion du stock
                </h2>

                <p className="text-xs text-slate-400">
                  Comprendre Modifier et Réapprovisionner
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowGuide(!showGuide)
              }
              className="shrink-0 rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-black transition hover:scale-[1.02]"
            >
              {showGuide
                ? "Fermer"
                : "Voir le guide"}
            </button>

          </div>

          {showGuide && (
            <div className="border-t border-white/10 p-4 sm:p-6">

              <div className="space-y-5">

                {/* INTRO */}

                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">

                  <div className="flex gap-3">

                    <Sparkles
                      className="mt-0.5 shrink-0 text-orange-400"
                      size={20}
                    />

                    <div>

                      <h3 className="font-black text-white">
                        Deux opérations différentes
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        BISO-COMMERCE distingue la
                        modification d'un produit et
                        le réapprovisionnement.
                        Cela évite de remplacer
                        accidentellement votre ancien
                        stock.
                      </p>

                    </div>

                  </div>

                </div>

                {/* MODIFIER */}

                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">

                  <div className="flex gap-3">

                    <Pencil
                      className="mt-0.5 shrink-0 text-blue-400"
                      size={21}
                    />

                    <div>

                      <h3 className="font-black text-white">
                        1. Modifier le produit
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Utilisez <strong className="text-white">
                          Modifier
                        </strong>{" "}
                        lorsque vous voulez corriger
                        les informations du produit.
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Par exemple : changer le nom,
                        l'unité, le prix de vente ou
                        remplacer volontairement la
                        quantité de stock.
                      </p>

                      <p className="mt-2 text-sm font-bold text-blue-300">
                        Attention : la quantité saisie
                        dans Modifier devient le nouveau
                        stock.
                      </p>

                    </div>

                  </div>

                </div>

                {/* RÉAPPROVISIONNER */}

                <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">

                  <div className="flex gap-3">

                    <RefreshCcw
                      className="mt-0.5 shrink-0 text-green-400"
                      size={21}
                    />

                    <div>

                      <h3 className="font-black text-white">
                        2. Réapprovisionner
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Utilisez{" "}
                        <strong className="text-white">
                          Réapprovisionner
                        </strong>{" "}
                        lorsque vous recevez une
                        nouvelle quantité d'un produit.
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Le nouveau stock est{" "}
                        <strong className="text-green-400">
                          ajouté
                        </strong>{" "}
                        à l'ancien stock. Il ne le
                        remplace pas.
                      </p>

                    </div>

                  </div>

                </div>

                {/* EXEMPLE */}

                <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">

                  <div className="flex gap-3">

                    <Boxes
                      className="mt-0.5 shrink-0 text-purple-400"
                      size={21}
                    />

                    <div>

                      <h3 className="font-black text-white">
                        Exemple avec des cartons
                      </h3>

                      <div className="mt-3 space-y-2 text-sm text-slate-300">

                        <p>
                          Stock actuel :
                          <strong className="text-white">
                            {" "}5 cartons
                          </strong>
                        </p>

                        <p>
                          1 carton =
                          <strong className="text-white">
                            {" "}24 pièces
                          </strong>
                        </p>

                        <p>
                          Nouvel arrivage :
                          <strong className="text-white">
                            {" "}10 cartons
                          </strong>
                        </p>

                        <div className="my-3 flex items-center gap-2 rounded-xl bg-black/20 p-3">

                          <span className="font-black text-white">
                            5 cartons
                          </span>

                          <Plus
                            size={18}
                            className="text-green-400"
                          />

                          <span className="font-black text-white">
                            10 cartons
                          </span>

                          <ArrowRight
                            size={18}
                            className="text-orange-400"
                          />

                          <span className="font-black text-green-400">
                            15 cartons
                          </span>

                        </div>

                        <p>
                          Stock réel :
                          <strong className="text-green-400">
                            {" "}15 × 24 = 360 pièces
                          </strong>
                        </p>

                      </div>

                    </div>

                  </div>

                </div>

                {/* PRIX */}

                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">

                  <div className="flex gap-3">

                    <CircleDollarSign
                      className="mt-0.5 shrink-0 text-yellow-400"
                      size={21}
                    />

                    <div>

                      <h3 className="font-black text-white">
                        Prix d'achat du nouvel arrivage
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Lors d'un réapprovisionnement,
                        indiquez le prix total payé pour
                        la nouvelle quantité reçue.
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Si le nouveau prix est différent
                        de l'ancien, BISO-COMMERCE calcule
                        automatiquement un coût moyen du
                        stock.
                      </p>

                    </div>

                  </div>

                </div>

                {/* ZERO STOCK */}

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                  <div className="flex gap-3">

                    <CheckCircle
                      size={20}
                      className="mt-0.5 shrink-0 text-green-400"
                    />

                    <div>

                      <h3 className="font-black text-white">
                        Produit sans stock
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        Un produit peut être enregistré
                        avec un stock de{" "}
                        <strong className="text-white">
                          0
                        </strong>
                        . Il pourra ensuite être
                        réapprovisionné lorsqu'une nouvelle
                        marchandise arrive.
                      </p>

                    </div>

                  </div>

                </div>

                {/* CONSEIL */}

                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">

                  <div className="flex gap-3">

                    <AlertTriangle
                      size={20}
                      className="mt-0.5 shrink-0 text-orange-400"
                    />

                    <div>

                      <p className="font-black text-white">
                        Conseil important
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        Vous avez déjà du stock et vous
                        recevez une nouvelle marchandise ?
                        Utilisez{" "}
                        <strong className="text-orange-400">
                          Réapprovisionner
                        </strong>
                        , pas Modifier.
                      </p>

                    </div>

                  </div>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowGuide(false)
                }
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 px-5 py-4 text-sm font-black text-black shadow-lg"
              >
                ✓ J'ai compris
              </button>

            </div>
          )}

        </div>

        {/* ======================================================
            CHOIX DU MODE
        ====================================================== */}

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">

          <button
            type="button"
            onClick={() =>
              setMode("edit")
            }
            className={`rounded-2xl border p-4 text-left transition ${
              mode === "edit"
                ? "border-blue-500/50 bg-blue-500/10"
                : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
            }`}
          >

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <Pencil size={19} />
              </div>

              <div>

                <p className="font-black text-white">
                  Modifier
                </p>

                <p className="text-xs text-slate-400">
                  Corriger le produit
                </p>

              </div>

            </div>

          </button>

          <button
            type="button"
            onClick={() =>
              setMode("restock")
            }
            className={`rounded-2xl border p-4 text-left transition ${
              mode === "restock"
                ? "border-green-500/50 bg-green-500/10"
                : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
            }`}
          >

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/15 text-green-400">
                <RefreshCcw size={19} />
              </div>

              <div>

                <p className="font-black text-white">
                  Réapprovisionner
                </p>

                <p className="text-xs text-slate-400">
                  Ajouter du stock
                </p>

              </div>

            </div>

          </button>

        </div>

        {/* ======================================================
            MODE MODIFICATION
        ====================================================== */}

        {mode === "edit" && (

          <div className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl sm:p-6">

            {/* NOM */}

            <div>

              <label className="mb-2 block text-xs font-bold text-slate-300">
                Nom du produit
              </label>

              <input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Exemple : Coca-Cola 33cl"
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-500 focus:border-orange-500/50"
              />

            </div>

            {/* TYPE */}

            <div>

              <label className="mb-2 block text-xs font-bold text-slate-300">
                Type d'unité
              </label>

              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value)
                }
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

            </div>

            {/* QUANTITÉ */}

            <div>

              <label className="mb-2 block text-xs font-bold text-slate-300">
                Nouvelle quantité en stock
              </label>

              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) =>
                  setQuantity(e.target.value)
                }
                placeholder={
                  type === "Pièce"
                    ? "Exemple : 50"
                    : `Nombre de ${type}(s)`
                }
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-500 focus:border-orange-500/50"
              />

              <p className="mt-2 text-xs text-slate-500">
                Cette quantité remplacera le stock
                actuel. Pour ajouter une nouvelle
                livraison, utilisez plutôt
                <strong className="text-green-400">
                  {" "}Réapprovisionner
                </strong>.
              </p>

            </div>

            {/* PIÈCES */}

            {type !== "Pièce" && (

              <div>

                <label className="mb-2 block text-xs font-bold text-slate-300">
                  Nombre de pièces dans {type}
                </label>

                <input
                  type="number"
                  min="1"
                  value={piecesPerUnit}
                  onChange={(e) =>
                    setPiecesPerUnit(
                      e.target.value
                    )
                  }
                  placeholder="Exemple : 24"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-500 focus:border-orange-500/50"
                />

                <div className="mt-3 rounded-xl bg-white/5 p-3">

                  <p className="text-xs text-slate-400">
                    Nouveau stock réel :
                  </p>

                  <p className="mt-2 text-lg font-black text-orange-400">
                    {Number(
                      quantity || 0
                    )}
                    {" × "}
                    {Number(
                      piecesPerUnit || 1
                    )}
                    {" = "}
                    {totalPieces}
                    {" pièce(s)"}
                  </p>

                </div>

              </div>

            )}

            {/* ACHAT */}

            <div>

              <label className="mb-2 block text-xs font-bold text-slate-300">
                Prix d'achat total
              </label>

              <input
                type="number"
                min="0"
                value={buyPrice}
                onChange={(e) =>
                  setBuyPrice(
                    e.target.value
                  )
                }
                placeholder="Exemple : 100000"
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-500 focus:border-orange-500/50"
              />

              <p className="mt-2 text-xs text-slate-500">
                Montant total correspondant à la
                nouvelle quantité.
              </p>

            </div>

            {/* VENTE */}

            <div>

              <label className="mb-2 block text-xs font-bold text-slate-300">
                Prix de vente par pièce
              </label>

              <input
                type="number"
                min="0"
                value={sellPrice}
                onChange={(e) =>
                  setSellPrice(
                    e.target.value
                  )
                }
                placeholder="Exemple : 2000"
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-500 focus:border-orange-500/50"
              />

            </div>

            {/* MONNAIE */}

            <div>

              <label className="mb-2 block text-xs font-bold text-slate-300">
                Monnaie
              </label>

              <select
                value={currency}
                onChange={(e) =>
                  setCurrency(
                    e.target.value
                  )
                }
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

            {/* RÉSUMÉ */}

            <div className="overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-yellow-500/5">

              <div className="border-b border-white/10 p-4">

                <div className="flex items-center gap-3">

                  <TrendingUp
                    size={20}
                    className="text-orange-400"
                  />

                  <div>

                    <h2 className="font-black text-white">
                      Nouveau résumé
                    </h2>

                    <p className="text-xs text-slate-400">
                      Résultat après modification
                    </p>

                  </div>

                </div>

              </div>

              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Boxes size={16} />
                    Stock réel
                  </div>

                  <p className="text-xl font-black text-white">
                    {totalPieces}
                  </p>

                  <p className="text-xs text-slate-500">
                    pièce(s)
                  </p>

                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400">
                    <CircleDollarSign size={16} />
                    Coût par pièce
                  </div>

                  <p className="text-xl font-black text-white">
                    {Math.round(
                      pricePerPiece
                    )}{" "}
                    {currency}
                  </p>

                </div>

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
                    {Math.round(
                      profitPerPiece
                    )}{" "}
                    {currency}
                  </p>

                </div>

                <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4">

                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Sparkles size={16} />
                    Bénéfice potentiel
                  </div>

                  <p
                    className={`text-xl font-black ${
                      totalProfit >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {Math.round(
                      totalProfit
                    )}{" "}
                    {currency}
                  </p>

                </div>

              </div>

            </div>

            {/* BOUTON */}

            <button
              type="button"
              onClick={updateProduct}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 p-4 font-black text-black shadow-xl transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            >

              {loading ? (
                <>
                  <Loader2
                    size={20}
                    className="animate-spin"
                  />
                  Modification en cours...
                </>
              ) : (
                <>
                  <Pencil size={20} />
                  Enregistrer les modifications
                </>
              )}

            </button>

          </div>
        )}

        {/* ======================================================
            MODE RÉAPPROVISIONNEMENT
        ====================================================== */}

        {mode === "restock" && (

          <div className="space-y-5 rounded-3xl border border-green-500/20 bg-green-500/[0.04] p-4 shadow-xl sm:p-6">

            {/* TITRE */}

            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">

              <div className="flex gap-3">

                <RefreshCcw
                  size={22}
                  className="mt-0.5 shrink-0 text-green-400"
                />

                <div>

                  <h2 className="font-black text-white">
                    Réapprovisionner le stock
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    La quantité indiquée ici sera
                    <strong className="text-green-400">
                      {" "}ajoutée
                    </strong>{" "}
                    au stock actuel.
                  </p>

                </div>

              </div>

            </div>

            {/* STOCK ACTUEL */}

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

              <p className="text-xs font-bold text-slate-400">
                Stock actuellement disponible
              </p>

              <p className="mt-2 text-3xl font-black text-white">
                {currentStock}
              </p>

              <p className="text-xs text-slate-500">
                pièce(s) réelles
              </p>

            </div>

            {/* QUANTITÉ REÇUE */}

            <div>

              <label className="mb-2 block text-xs font-bold text-slate-300">
                Quantité reçue
              </label>

              <input
                type="number"
                min="1"
                value={restockQuantity}
                onChange={(e) =>
                  setRestockQuantity(
                    e.target.value
                  )
                }
                placeholder={
                  product.unit ===
                  "Pièce"
                    ? "Exemple : 50"
                    : `Nombre de ${product.unit || "unités"} reçus`
                }
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-500 focus:border-green-500/50"
              />

            </div>

            {/* PIÈCES PAR UNITÉ */}

            {product.unit !==
              "Pièce" && (

              <div>

                <label className="mb-2 block text-xs font-bold text-slate-300">
                  Nombre de pièces dans{" "}
                  {product.unit}
                </label>

                {/* CORRECTION :
                    le champ est maintenant réellement modifiable */}
                <input
                  type="number"
                  min="1"
                  value={
                    restockPiecesPerUnit
                  }
                  onChange={(e) =>
                    setRestockPiecesPerUnit(
                      e.target.value
                    )
                  }
                  placeholder="Exemple : 24"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-500 focus:border-green-500/50"
                />

                <div className="mt-3 rounded-xl bg-green-500/10 p-3">

                  <p className="text-xs text-slate-400">
                    Nouvelle marchandise en
                    pièces :
                  </p>

                  <p className="mt-2 text-lg font-black text-green-400">
                    {Number(
                      restockQuantity ||
                        0
                    )}
                    {" × "}
                    {Number(
                      restockPiecesPerUnit ||
                        1
                    )}
                    {" = "}
                    {restockPieces}
                    {" pièce(s)"}
                  </p>

                </div>

              </div>

            )}

            {/* PRIX NOUVEL ARRIVAGE */}

            <div>

              <label className="mb-2 block text-xs font-bold text-slate-300">
                Prix d'achat total du nouvel arrivage
              </label>

              <input
                type="number"
                min="0"
                value={restockBuyPrice}
                onChange={(e) =>
                  setRestockBuyPrice(
                    e.target.value
                  )
                }
                placeholder="Exemple : 240000"
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-slate-500 focus:border-green-500/50"
              />

              <p className="mt-2 text-xs text-slate-500">
                Indiquez ce que vous avez payé
                pour cette nouvelle marchandise.
              </p>

            </div>

            {/* APERÇU */}

            <div className="overflow-hidden rounded-3xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/5">

              <div className="border-b border-white/10 p-4">

                <div className="flex items-center gap-3">

                  <Boxes
                    size={20}
                    className="text-green-400"
                  />

                  <div>

                    <h2 className="font-black text-white">
                      Aperçu du réapprovisionnement
                    </h2>

                    <p className="text-xs text-slate-400">
                      Voici ce qui sera enregistré
                    </p>

                  </div>

                </div>

              </div>

              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">

                {/* ANCIEN */}

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                  <p className="text-xs font-bold text-slate-500">
                    Stock actuel
                  </p>

                  <p className="mt-2 text-2xl font-black text-white">
                    {currentStock}
                  </p>

                  <p className="text-xs text-slate-500">
                    pièces
                  </p>

                </div>

                {/* AJOUT */}

                <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">

                  <p className="text-xs font-bold text-slate-500">
                    Nouvel arrivage
                  </p>

                  <p className="mt-2 text-2xl font-black text-green-400">
                    +{restockPieces}
                  </p>

                  <p className="text-xs text-slate-500">
                    pièces
                  </p>

                </div>

                {/* TOTAL */}

                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">

                  <p className="text-xs font-bold text-slate-500">
                    Nouveau stock
                  </p>

                  <p className="mt-2 text-2xl font-black text-orange-400">
                    {newStockAfterRestock}
                  </p>

                  <p className="text-xs text-slate-500">
                    pièces
                  </p>

                </div>

              </div>

              {/* COÛT */}

              <div className="mx-4 mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400">

                    <CircleDollarSign
                      size={16}
                    />

                    Coût ancien
                  </div>

                  <p className="text-xl font-black text-white">
                    {Math.round(
                      Number(
                        product.purchase_price ||
                          0
                      )
                    )}{" "}
                    {product.currency}
                  </p>

                </div>

                <div className="rounded-2xl border border-green-500/20 bg-black/20 p-4">

                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400">

                    <TrendingUp
                      size={16}
                    />

                    Nouveau coût moyen
                  </div>

                  <p className="text-xl font-black text-green-400">
                    {Math.round(
                      newAverageCost
                    )}{" "}
                    {product.currency}
                  </p>

                </div>

              </div>

              {/* EXPLICATION */}

              <div className="mx-4 mb-4 rounded-2xl border border-white/10 bg-black/20 p-4">

                <div className="flex gap-3">

                  <CheckCircle
                    size={20}
                    className="mt-0.5 shrink-0 text-green-400"
                  />

                  <div>

                    <p className="text-sm font-bold text-white">
                      Rien ne sera perdu
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Le stock actuel de{" "}
                      <strong className="text-white">
                        {currentStock}
                      </strong>{" "}
                      pièce(s) sera conservé.
                      Les{" "}
                      <strong className="text-green-400">
                        {restockPieces}
                      </strong>{" "}
                      nouvelles pièces seront
                      ajoutées.
                    </p>

                  </div>

                </div>

              </div>

            </div>

            {/* BOUTON */}

            <button
              type="button"
              onClick={restockProduct}
              disabled={
                loadingRestock
              }
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-400 p-4 font-black text-black shadow-xl transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            >

              {loadingRestock ? (
                <>
                  <Loader2
                    size={20}
                    className="animate-spin"
                  />

                  Réapprovisionnement en cours...
                </>
              ) : (
                <>
                  <RefreshCcw size={20} />

                  Ajouter au stock
                </>
              )}

            </button>

          </div>
        )}

        {/* ======================================================
            ANNULER
        ====================================================== */}

        <button
          type="button"
          onClick={() =>
            router.push("/products")
          }
          disabled={
            loading ||
            loadingRestock
          }
          className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
        >
          Annuler
        </button>

      </div>

    </div>
  );
}