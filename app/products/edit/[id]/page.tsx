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
  PackagePlus,
  Calculator,
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

        setName(loadedProduct.name || "");

        const loadedType = loadedProduct.unit || "Pièce";
        setType(loadedType);

        setCurrency(loadedProduct.currency || "FC");

        setSellPrice(
          String(Number(loadedProduct.selling_price || 0))
        );

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

        const currentStock = Number(
          loadedProduct.stock || 0
        );

        const currentUnitCost = Number(
          loadedProduct.purchase_price || 0
        );

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
  // COÛT PAR PIÈCE
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
  // NOUVEAU STOCK
  // ==========================================================

  const newStockAfterRestock = useMemo(() => {
    return currentStock + restockPieces;
  }, [
    currentStock,
    restockPieces,
  ]);

  // ==========================================================
  // COÛT NOUVEL ARRIVAGE
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
  // COÛT MOYEN
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
      alert("Veuillez entrer le nom du produit.");
      return;
    }

    if (quantity === "") {
      alert("Veuillez entrer la quantité.");
      return;
    }

    if (Number(quantity) < 0) {
      alert("La quantité ne peut pas être négative.");
      return;
    }

    const nPieces =
      type !== "Pièce"
        ? Number(piecesPerUnit || 0)
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
      alert("Utilisateur non connecté.");
      return;
    }

    setLoading(true);

    try {
      let unitCost = 0;

      if (totalPieces > 0) {
        unitCost =
          Number(buyPrice || 0) /
          totalPieces;
      } else {
        unitCost = Number(
          product.purchase_price || 0
        );
      }

      const updatedData = {
        name: name.trim(),
        unit: type,
        stock: totalPieces,
        purchase_price: unitCost,
        selling_price:
          Number(sellPrice || 0),
        currency,
        pieces_per_unit: nPieces,
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
      alert("Utilisateur non connecté.");
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

      const oldStockValue =
        oldStock *
        oldUnitCost;

      const incomingStockValue =
        restockPieces *
        incomingUnitCost;

      const totalStockValue =
        oldStockValue +
        incomingStockValue;

      const averageCost =
        newStockAfterRestock > 0
          ? totalStockValue /
            newStockAfterRestock
          : 0;

      const updatedData = {
        stock:
          newStockAfterRestock,

        purchase_price:
          averageCost,

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
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
        <div className="flex w-full max-w-sm items-center justify-center gap-3 rounded-[24px] bg-white px-5 py-5 text-sm font-semibold text-slate-600 shadow-sm">
          <Loader2
            size={21}
            className="shrink-0 animate-spin text-indigo-600"
          />
          <span>Chargement du produit...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
        <div className="w-full max-w-md rounded-[26px] bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <AlertTriangle size={28} />
          </div>

          <p className="mt-4 text-xl font-black text-slate-900">
            Produit introuvable
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Le produit demandé n'existe pas ou
            n'est plus disponible.
          </p>

          <button
            onClick={() =>
              router.push("/products")
            }
            className="mt-6 w-full rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
          >
            Retour aux produits
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f7fb] text-slate-900">

      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-5 lg:px-8">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="mb-5">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 sm:h-12 sm:w-12">
                <Package size={22} />
              </div>

              <div className="min-w-0">
                <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  Gestion du produit
                </h1>

                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  Modifier ou ajouter du stock
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/products")
              }
              disabled={
                loading ||
                loadingRestock
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto sm:px-5"
            >
              Retour aux produits
            </button>

          </div>

        </div>

        {/* ======================================================
            PRODUIT ACTUEL
        ====================================================== */}

        <div className="mb-5 rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm sm:mb-6 sm:rounded-[26px] sm:p-6">

          <div className="flex items-start gap-3 sm:gap-5">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 sm:h-14 sm:w-14">
              <Package size={24} />
            </div>

            <div className="min-w-0 flex-1">

              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-xs">
                Produit sélectionné
              </p>

              <h2 className="mt-0.5 truncate text-lg font-black text-slate-900 sm:text-xl">
                {product.name ||
                  "Produit sans nom"}
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-4 sm:gap-3">

                <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
                  <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                    Unité
                  </p>

                  <p className="mt-1 truncate text-sm font-black text-slate-900 sm:text-base">
                    {product.unit || "Pièce"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
                  <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                    Stock réel
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-900 sm:text-base">
                    {currentStock}
                  </p>

                  <p className="text-[10px] text-slate-400 sm:text-[11px]">
                    pièces
                  </p>
                </div>

                <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
                  <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                    Coût / pièce
                  </p>

                  <p className="mt-1 truncate text-sm font-black text-slate-900 sm:text-base">
                    {Math.round(
                      Number(
                        product.purchase_price ||
                          0
                      )
                    )}{" "}
                    {product.currency}
                  </p>
                </div>

                <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
                  <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                    Vente / pièce
                  </p>

                  <p className="mt-1 truncate text-sm font-black text-slate-900 sm:text-base">
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

        <div className="mb-5 rounded-[24px] border border-slate-100 bg-white shadow-sm sm:mb-6 sm:rounded-[26px]">

          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Info size={19} />
              </div>

              <div className="min-w-0">
                <h2 className="truncate font-black text-slate-900">
                  Guide de gestion du stock
                </h2>

                <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                  Comprendre les deux opérations
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowGuide(!showGuide)
              }
              className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-black text-white shadow-sm transition hover:bg-indigo-700 sm:w-auto"
            >
              {showGuide
                ? "Fermer le guide"
                : "Voir le guide"}
            </button>

          </div>

          {showGuide && (
            <div className="border-t border-slate-100 p-4 sm:p-6">

              <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5">

                  <div className="flex gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                      <Pencil size={18} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900">
                        Modifier le produit
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                        Utilisez cette option pour
                        corriger le nom, l'unité, les
                        prix ou remplacer volontairement
                        la quantité du stock.
                      </p>

                      <p className="mt-2 text-xs font-bold text-indigo-600">
                        La quantité devient le nouveau
                        stock.
                      </p>
                    </div>

                  </div>

                </div>

                <div className="rounded-2xl border border-green-100 bg-green-50/60 p-4 sm:p-5">

                  <div className="flex gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600">
                      <RefreshCcw size={18} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900">
                        Réapprovisionner
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                        Utilisez cette option lorsque
                        vous recevez une nouvelle
                        marchandise.
                      </p>

                      <p className="mt-2 text-xs font-bold text-green-600">
                        La nouvelle quantité est ajoutée
                        au stock existant.
                      </p>
                    </div>

                  </div>

                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5">

                  <div className="flex gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                      <Boxes size={18} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900">
                        Exemple avec des cartons
                      </h3>

                      <div className="mt-3 space-y-2 text-xs text-slate-600 sm:text-sm">

                        <p>
                          Stock actuel :
                          <strong className="text-slate-900">
                            {" "}5 cartons
                          </strong>
                        </p>

                        <p>
                          1 carton =
                          <strong className="text-slate-900">
                            {" "}24 pièces
                          </strong>
                        </p>

                        <p>
                          Nouvel arrivage :
                          <strong className="text-slate-900">
                            {" "}10 cartons
                          </strong>
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-white p-3">

                          <span className="font-black text-slate-900">
                            5 cartons
                          </span>

                          <Plus
                            size={14}
                            className="text-green-600"
                          />

                          <span className="font-black text-slate-900">
                            10 cartons
                          </span>

                          <ArrowRight
                            size={14}
                            className="text-indigo-600"
                          />

                          <span className="font-black text-green-600">
                            15 cartons
                          </span>

                        </div>

                        <p>
                          Stock réel :
                          <strong className="text-green-600">
                            {" "}15 × 24 = 360 pièces
                          </strong>
                        </p>

                      </div>
                    </div>

                  </div>

                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5">

                  <div className="flex gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                      <CircleDollarSign size={18} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900">
                        Prix du nouvel arrivage
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                        Indiquez le prix total payé pour
                        la nouvelle marchandise.
                        L'application calcule automatiquement
                        le coût moyen du stock.
                      </p>
                    </div>

                  </div>

                </div>

              </div>

              <div className="mt-3 rounded-2xl border border-green-100 bg-green-50 p-4 sm:mt-4">

                <div className="flex gap-3">

                  <CheckCircle
                    size={19}
                    className="mt-0.5 shrink-0 text-green-600"
                  />

                  <div>
                    <p className="font-black text-slate-900">
                      Produit sans stock
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                      Un produit peut avoir un stock de
                      0. Vous pourrez ensuite le
                      réapprovisionner normalement.
                    </p>
                  </div>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowGuide(false)
                }
                className="mt-4 w-full rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
              >
                ✓ J'ai compris
              </button>

            </div>
          )}

        </div>

        {/* ======================================================
            CHOIX DU MODE
        ====================================================== */}

        <div className="mb-5 rounded-[24px] border border-slate-100 bg-white p-2.5 shadow-sm sm:mb-6 sm:rounded-[26px] sm:p-3">

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">

            <button
              type="button"
              onClick={() =>
                setMode("edit")
              }
              className={`min-w-0 rounded-2xl border p-3 text-left transition sm:p-4 ${
                mode === "edit"
                  ? "border-indigo-200 bg-indigo-50"
                  : "border-transparent bg-slate-50 hover:bg-slate-100"
              }`}
            >

              <div className="flex items-center gap-2.5 sm:gap-3">

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    mode === "edit"
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-white text-slate-500"
                  }`}
                >
                  <Pencil size={18} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900 sm:text-base">
                    Modifier
                  </p>

                  <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
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
              className={`min-w-0 rounded-2xl border p-3 text-left transition sm:p-4 ${
                mode === "restock"
                  ? "border-green-200 bg-green-50"
                  : "border-transparent bg-slate-50 hover:bg-slate-100"
              }`}
            >

              <div className="flex items-center gap-2.5 sm:gap-3">

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    mode === "restock"
                      ? "bg-green-100 text-green-600"
                      : "bg-white text-slate-500"
                  }`}
                >
                  <RefreshCcw size={18} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900 sm:text-base">
                    Réapprovisionner
                  </p>

                  <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
                    Ajouter du stock
                  </p>
                </div>

              </div>

            </button>

          </div>

        </div>

        {/* ======================================================
            MODE MODIFICATION
        ====================================================== */}

        {mode === "edit" && (
          <div className="space-y-5 sm:space-y-6">

            <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm sm:rounded-[26px] sm:p-6">

              <div className="mb-5 flex items-center gap-3 sm:mb-6">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 sm:h-11 sm:w-11">
                  <Pencil size={19} />
                </div>

                <div>
                  <h2 className="font-black text-slate-900">
                    Informations du produit
                  </h2>

                  <p className="text-[11px] text-slate-500 sm:text-xs">
                    Modifiez les informations nécessaires
                  </p>
                </div>

              </div>

              <div className="space-y-4 sm:space-y-5">

                {/* NOM */}

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    Nom du produit
                  </label>

                  <input
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    placeholder="Exemple : Coca-Cola 33cl"
                    className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 sm:text-sm"
                  />
                </div>

                {/* TYPE */}

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    Type d'unité
                  </label>

                  <select
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value)
                    }
                    className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 sm:text-sm"
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
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    Nouvelle quantité en stock
                  </label>

                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(e.target.value)
                    }
                    placeholder={
                      type === "Pièce"
                        ? "Exemple : 50"
                        : `Nombre de ${type}(s)`
                    }
                    className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 sm:text-sm"
                  />

                  <p className="mt-2 text-[11px] leading-5 text-slate-400 sm:text-xs">
                    Cette quantité remplacera le stock
                    actuel. Pour ajouter une livraison,
                    utilisez plutôt{" "}
                    <strong className="text-green-600">
                      Réapprovisionner
                    </strong>
                    .
                  </p>
                </div>

                {/* PIÈCES */}

                {type !== "Pièce" && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5 sm:p-4">

                    <label className="mb-2 block text-xs font-bold text-slate-600">
                      Nombre de pièces dans {type}
                    </label>

                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={piecesPerUnit}
                      onChange={(e) =>
                        setPiecesPerUnit(
                          e.target.value
                        )
                      }
                      placeholder="Exemple : 24"
                      className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 sm:text-sm"
                    />

                    <div className="mt-3 flex items-start gap-3 rounded-2xl bg-white p-3.5 sm:p-4">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Calculator size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-400 sm:text-xs">
                          Nouveau stock réel
                        </p>

                        <p className="mt-1 break-words text-sm font-black text-indigo-600 sm:text-base">
                          {Number(quantity || 0)}
                          {" × "}
                          {Number(
                            piecesPerUnit || 1
                          )}
                          {" = "}
                          {totalPieces} pièce(s)
                        </p>
                      </div>

                    </div>

                  </div>
                )}

                {/* ACHAT */}

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
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
                    placeholder="Exemple : 100000"
                    className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 sm:text-sm"
                  />

                  <p className="mt-2 text-[11px] text-slate-400 sm:text-xs">
                    Montant total correspondant à la
                    nouvelle quantité.
                  </p>
                </div>

                {/* VENTE */}

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
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
                    placeholder="Exemple : 2000"
                    className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 sm:text-sm"
                  />
                </div>

                {/* MONNAIE */}

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    Monnaie
                  </label>

                  <select
                    value={currency}
                    onChange={(e) =>
                      setCurrency(e.target.value)
                    }
                    className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 sm:text-sm"
                  >
                    <option value="FC">
                      Franc congolais (FC)
                    </option>

                    <option value="USD">
                      Dollar américain (USD)
                    </option>
                  </select>
                </div>

              </div>

            </div>

            {/* ==================================================
                STATISTIQUES
            ================================================== */}

            <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm sm:rounded-[26px] sm:p-6">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 sm:h-11 sm:w-11">
                  <TrendingUp size={19} />
                </div>

                <div>
                  <h2 className="font-black text-slate-900">
                    Nouveau résumé
                  </h2>

                  <p className="text-[11px] text-slate-500 sm:text-xs">
                    Résultat après modification
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3">

                {/* STOCK */}

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 sm:p-4">

                  <div className="flex items-center gap-2.5 sm:gap-3">

                    <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm sm:flex">
                      <Boxes size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                        Stock réel
                      </p>

                      <p className="text-lg font-black text-slate-900 sm:text-xl">
                        {totalPieces}
                      </p>

                      <p className="text-[10px] text-slate-400 sm:text-[11px]">
                        pièce(s)
                      </p>
                    </div>

                  </div>

                </div>

                {/* COÛT */}

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 sm:p-4">

                  <div className="flex items-center gap-2.5 sm:gap-3">

                    <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm sm:flex">
                      <CircleDollarSign size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                        Coût / pièce
                      </p>

                      <p className="truncate text-lg font-black text-slate-900 sm:text-xl">
                        {Math.round(
                          pricePerPiece
                        )}{" "}
                        {currency}
                      </p>
                    </div>

                  </div>

                </div>

                {/* BÉNÉFICE */}

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 sm:p-4">

                  <div className="flex items-center gap-2.5 sm:gap-3">

                    <div
                      className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex ${
                        profitPerPiece >= 0
                          ? "bg-green-50 text-green-600"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <TrendingUp size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                        Bénéfice / pièce
                      </p>

                      <p
                        className={`truncate text-lg font-black sm:text-xl ${
                          profitPerPiece >= 0
                            ? "text-green-600"
                            : "text-slate-600"
                        }`}
                      >
                        {Math.round(
                          profitPerPiece
                        )}{" "}
                        {currency}
                      </p>
                    </div>

                  </div>

                </div>

                {/* BÉNÉFICE TOTAL */}

                <div className="rounded-2xl border border-green-100 bg-green-50 p-3.5 sm:p-4">

                  <div className="flex items-center gap-2.5 sm:gap-3">

                    <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-green-600 shadow-sm sm:flex">
                      <Sparkles size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-500 sm:text-xs">
                        Bénéfice potentiel
                      </p>

                      <p
                        className={`truncate text-lg font-black sm:text-xl ${
                          totalProfit >= 0
                            ? "text-green-600"
                            : "text-slate-600"
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

              </div>

            </div>

            {/* ENREGISTRER */}

            <button
              type="button"
              onClick={updateProduct}
              disabled={loading}
              className="flex min-h-[54px] w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-4 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[56px]"
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
                  <Pencil size={19} />
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
          <div className="space-y-5 sm:space-y-6">

            {/* INTRO */}

            <div className="rounded-[24px] border border-green-100 bg-white p-4 shadow-sm sm:rounded-[26px] sm:p-6">

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-600 sm:h-11 sm:w-11">
                  <PackagePlus size={20} />
                </div>

                <div className="min-w-0">
                  <h2 className="font-black text-slate-900">
                    Réapprovisionner le stock
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                    La quantité indiquée sera{" "}
                    <strong className="text-green-600">
                      ajoutée
                    </strong>{" "}
                    au stock actuel.
                  </p>
                </div>

              </div>

            </div>

            {/* FORMULAIRE */}

            <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm sm:rounded-[26px] sm:p-6">

              <div className="space-y-4 sm:space-y-5">

                {/* STOCK ACTUEL */}

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 sm:p-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                      <Boxes size={19} />
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 sm:text-xs">
                        Stock actuellement disponible
                      </p>

                      <p className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                        {currentStock}
                      </p>

                      <p className="text-[11px] text-slate-400 sm:text-xs">
                        pièce(s) réelles
                      </p>
                    </div>

                  </div>

                </div>

                {/* QUANTITÉ */}

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    Quantité reçue
                  </label>

                  <input
                    type="number"
                    min="1"
                    inputMode="decimal"
                    value={restockQuantity}
                    onChange={(e) =>
                      setRestockQuantity(
                        e.target.value
                      )
                    }
                    placeholder={
                      product.unit === "Pièce"
                        ? "Exemple : 50"
                        : `Nombre de ${product.unit || "unités"} reçus`
                    }
                    className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-50 sm:text-sm"
                  />
                </div>

                {/* PIÈCES PAR UNITÉ */}

                {product.unit !== "Pièce" && (
                  <div className="rounded-2xl border border-green-100 bg-green-50/50 p-3.5 sm:p-4">

                    <label className="mb-2 block text-xs font-bold text-slate-600">
                      Nombre de pièces dans{" "}
                      {product.unit}
                    </label>

                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={
                        restockPiecesPerUnit
                      }
                      onChange={(e) =>
                        setRestockPiecesPerUnit(
                          e.target.value
                        )
                      }
                      placeholder="Exemple : 24"
                      className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition focus:border-green-400 focus:ring-4 focus:ring-green-50 sm:text-sm"
                    />

                    <div className="mt-3 flex items-start gap-3 rounded-2xl bg-white p-3.5 sm:p-4">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                        <Calculator size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-400 sm:text-xs">
                          Nouvelle marchandise
                        </p>

                        <p className="mt-1 break-words text-sm font-black text-green-600 sm:text-base">
                          {Number(
                            restockQuantity || 0
                          )}
                          {" × "}
                          {Number(
                            restockPiecesPerUnit ||
                              1
                          )}
                          {" = "}
                          {restockPieces} pièce(s)
                        </p>
                      </div>

                    </div>

                  </div>
                )}

                {/* PRIX */}

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    Prix d'achat total du nouvel arrivage
                  </label>

                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={restockBuyPrice}
                    onChange={(e) =>
                      setRestockBuyPrice(
                        e.target.value
                      )
                    }
                    placeholder="Exemple : 240000"
                    className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-50 sm:text-sm"
                  />

                  <p className="mt-2 text-[11px] leading-5 text-slate-400 sm:text-xs">
                    Indiquez le montant total payé
                    pour cette nouvelle marchandise.
                  </p>
                </div>

              </div>

            </div>

            {/* ==================================================
                APERÇU
            ================================================== */}

            <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm sm:rounded-[26px] sm:p-6">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-600 sm:h-11 sm:w-11">
                  <RefreshCcw size={19} />
                </div>

                <div className="min-w-0">
                  <h2 className="font-black text-slate-900">
                    Aperçu du réapprovisionnement
                  </h2>

                  <p className="text-[11px] text-slate-500 sm:text-xs">
                    Voici ce qui sera enregistré
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3">

                {/* ANCIEN */}

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">

                  <p className="text-[10px] font-bold text-slate-400 sm:text-xs">
                    Stock actuel
                  </p>

                  <p className="mt-1.5 text-lg font-black text-slate-900 sm:mt-2 sm:text-2xl">
                    {currentStock}
                  </p>

                  <p className="text-[10px] text-slate-400 sm:text-xs">
                    pièces
                  </p>

                </div>

                {/* AJOUT */}

                <div className="rounded-2xl border border-green-100 bg-green-50 p-3 sm:p-4">

                  <p className="text-[10px] font-bold text-slate-400 sm:text-xs">
                    Nouvel arrivage
                  </p>

                  <p className="mt-1.5 text-lg font-black text-green-600 sm:mt-2 sm:text-2xl">
                    +{restockPieces}
                  </p>

                  <p className="text-[10px] text-slate-400 sm:text-xs">
                    pièces
                  </p>

                </div>

                {/* TOTAL */}

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3 sm:p-4">

                  <p className="text-[10px] font-bold text-slate-400 sm:text-xs">
                    Nouveau stock
                  </p>

                  <p className="mt-1.5 text-lg font-black text-indigo-600 sm:mt-2 sm:text-2xl">
                    {newStockAfterRestock}
                  </p>

                  <p className="text-[10px] text-slate-400 sm:text-xs">
                    pièces
                  </p>

                </div>

              </div>

              {/* COÛTS */}

              <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:grid-cols-2">

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 sm:p-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm sm:h-10 sm:w-10">
                      <CircleDollarSign size={17} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                        Coût ancien
                      </p>

                      <p className="mt-1 truncate text-lg font-black text-slate-900 sm:text-xl">
                        {Math.round(
                          Number(
                            product.purchase_price ||
                              0
                          )
                        )}{" "}
                        {product.currency}
                      </p>
                    </div>

                  </div>

                </div>

                <div className="rounded-2xl border border-green-100 bg-green-50 p-3.5 sm:p-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-green-600 shadow-sm sm:h-10 sm:w-10">
                      <TrendingUp size={17} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-500 sm:text-xs">
                        Nouveau coût moyen
                      </p>

                      <p className="mt-1 truncate text-lg font-black text-green-600 sm:text-xl">
                        {Math.round(
                          newAverageCost
                        )}{" "}
                        {product.currency}
                      </p>
                    </div>

                  </div>

                </div>

              </div>

              {/* EXPLICATION */}

              <div className="mt-3 rounded-2xl border border-green-100 bg-green-50 p-3.5 sm:mt-4 sm:p-4">

                <div className="flex gap-3">

                  <CheckCircle
                    size={19}
                    className="mt-0.5 shrink-0 text-green-600"
                  />

                  <div className="min-w-0">

                    <p className="text-sm font-black text-slate-900">
                      Rien ne sera perdu
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-xs">
                      Le stock actuel de{" "}
                      <strong className="text-slate-900">
                        {currentStock}
                      </strong>{" "}
                      pièce(s) sera conservé.
                      Les{" "}
                      <strong className="text-green-600">
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
              disabled={loadingRestock}
              className="flex min-h-[54px] w-full items-center justify-center gap-3 rounded-2xl bg-green-600 px-4 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[56px]"
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
                  <RefreshCcw size={19} />

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
          className="mt-5 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:mt-6"
        >
          Annuler
        </button>

        {/* ======================================================
            PETIT PIED
        ====================================================== */}

        <div className="px-2 py-5 text-center sm:py-6">
          <p className="text-[10px] leading-5 text-slate-400 sm:text-xs">
            BISO-COMMERCE • Gestion professionnelle
            du stock
          </p>
        </div>

      </div>
    </div>
  );
}