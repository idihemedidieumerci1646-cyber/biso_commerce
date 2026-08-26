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
  WifiOff,
  X,
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

type ConfirmAction = "edit" | "restock" | null;

const formatMoney = (value: number) => {
  const number = Math.round(Number(value || 0));

  return number
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();

  const productId = String(params.id);

  const [loadingProduct, setLoadingProduct] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingRestock, setLoadingRestock] = useState(false);

  const [product, setProduct] = useState<Product | null>(null);

  const [showConnectionModal, setShowConnectionModal] =
    useState(false);

  const [confirmAction, setConfirmAction] =
    useState<ConfirmAction>(null);

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
  // CONNEXION
  // ==========================================================

  const requireConnection = () => {
    if (
      typeof navigator !== "undefined" &&
      !navigator.onLine
    ) {
      setShowConnectionModal(true);
      return false;
    }

    return true;
  };

  // ==========================================================
  // INITIALISER LES FORMULAIRES AVEC LE PRODUIT
  // ==========================================================

  const fillProductForm = (loadedProduct: Product) => {
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

    const safePiecesPerUnit =
      savedPiecesPerUnit > 0
        ? savedPiecesPerUnit
        : 1;

    setPiecesPerUnit(
      String(safePiecesPerUnit)
    );

    setRestockPiecesPerUnit(
      String(safePiecesPerUnit)
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
        safePiecesPerUnit > 0
          ? currentStock / safePiecesPerUnit
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
  };

  // ==========================================================
  // CHARGER LE PRODUIT
  // ==========================================================

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoadingProduct(true);

        const userId = localStorage.getItem("user_id");

        if (!userId) {
          setLoadingProduct(false);
          return;
        }

        const cacheKey =
          `biso-product-edit-${userId}-${productId}`;

        // ====================================================
        // HORS CONNEXION : UTILISER LE PRODUIT EN CACHE
        // ====================================================

        if (!navigator.onLine) {
          const cachedProduct =
            localStorage.getItem(cacheKey);

          if (cachedProduct) {
            try {
              const parsedProduct =
                JSON.parse(cachedProduct) as Product;

              fillProductForm(parsedProduct);
              setLoadingProduct(false);
              return;
            } catch (cacheError) {
              console.error(
                "Erreur lecture cache produit :",
                cacheError
              );
            }
          }

          setLoadingProduct(false);
          return;
        }

        // ====================================================
        // EN LIGNE : CHARGEMENT SUPABASE
        // ====================================================

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .eq("user_id", userId)
          .single();

        if (error || !data) {
          console.error(error);

          // Tenter le cache si Supabase ne répond pas
          const cachedProduct =
            localStorage.getItem(cacheKey);

          if (cachedProduct) {
            try {
              const parsedProduct =
                JSON.parse(cachedProduct) as Product;

              fillProductForm(parsedProduct);
              setLoadingProduct(false);
              return;
            } catch (cacheError) {
              console.error(
                "Erreur lecture cache produit :",
                cacheError
              );
            }
          }

          alert("Produit introuvable.");
          router.push("/products");
          return;
        }

        const loadedProduct = data as Product;

        // Sauvegarde locale pour consultation hors connexion
        localStorage.setItem(
          cacheKey,
          JSON.stringify(loadedProduct)
        );

        fillProductForm(loadedProduct);
      } catch (error) {
        console.error(error);

        const userId =
          localStorage.getItem("user_id");

        const cacheKey =
          `biso-product-edit-${userId}-${productId}`;

        const cachedProduct =
          localStorage.getItem(cacheKey);

        if (cachedProduct) {
          try {
            const parsedProduct =
              JSON.parse(cachedProduct) as Product;

            fillProductForm(parsedProduct);
            return;
          } catch (cacheError) {
            console.error(
              "Erreur lecture cache produit :",
              cacheError
            );
          }
        }

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
  // ACTUALISATION AUTOMATIQUE AU RETOUR D'INTERNET
  // ==========================================================

  useEffect(() => {
    const handleOnline = async () => {
      try {
        const userId =
          localStorage.getItem("user_id");

        if (!userId || !productId) return;

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .eq("user_id", userId)
          .single();

        if (error || !data) return;

        const loadedProduct = data as Product;

        localStorage.setItem(
          `biso-product-edit-${userId}-${productId}`,
          JSON.stringify(loadedProduct)
        );

        fillProductForm(loadedProduct);
      } catch (error) {
        console.error(
          "Erreur actualisation produit :",
          error
        );
      }
    };

    window.addEventListener(
      "online",
      handleOnline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );
    };
  }, [productId]);

  // ==========================================================
  // STOCK TOTAL MODIFICATION
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
  // COÛT DU NOUVEL ARRIVAGE
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
  // NOUVEAU COÛT MOYEN
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
  // OUVRIR CONFIRMATION MODIFICATION
  // ==========================================================

  const updateProduct = async () => {
    if (!requireConnection()) {
      return;
    }

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

    if (!requireConnection()) {
      return;
    }

    setConfirmAction("edit");
  };

  // ==========================================================
  // EXÉCUTER MODIFICATION APRÈS CONFIRMATION
  // ==========================================================

  const confirmUpdateProduct = async () => {
    if (!product) {
      setConfirmAction(null);
      return;
    }

    if (!requireConnection()) {
      setConfirmAction(null);
      return;
    }

    const userId =
      localStorage.getItem("user_id");

    if (!userId) {
      setConfirmAction(null);

      alert(
        "Utilisateur non connecté."
      );

      return;
    }

    setConfirmAction(null);
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
        pieces_per_unit:
          nPiecesForUpdate(type, piecesPerUnit),
      };

      const { data, error } =
        await supabase
          .from("products")
          .update(updatedData)
          .eq("id", productId)
          .eq("user_id", userId)
          .select("*")
          .single();

      if (error || !data) {
        console.error(error);

        alert(
          "Erreur lors de la modification : " +
            (error?.message ||
              "Modification impossible.")
        );

        return;
      }

      const updatedProduct =
        data as Product;

      // Mise à jour du cache local
      localStorage.setItem(
        `biso-product-edit-${userId}-${productId}`,
        JSON.stringify(updatedProduct)
      );

      setProduct(updatedProduct);

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
  // RÉAPPROVISIONNER : OUVRIR CONFIRMATION
  // ==========================================================

  const restockProduct = async () => {
    if (!requireConnection()) {
      return;
    }

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

    if (!requireConnection()) {
      return;
    }

    setConfirmAction("restock");
  };

  // ==========================================================
  // EXÉCUTER RÉAPPROVISIONNEMENT
  // ==========================================================

  const confirmRestockProduct = async () => {
    if (!product) {
      setConfirmAction(null);
      return;
    }

    if (!requireConnection()) {
      setConfirmAction(null);
      return;
    }

    const userId =
      localStorage.getItem("user_id");

    if (!userId) {
      setConfirmAction(null);

      alert(
        "Utilisateur non connecté."
      );

      return;
    }

    setConfirmAction(null);
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

      const { data, error } =
        await supabase
          .from("products")
          .update(updatedData)
          .eq("id", productId)
          .eq("user_id", userId)
          .select("*")
          .single();

      if (error || !data) {
        console.error(error);

        alert(
          "Erreur lors du réapprovisionnement : " +
            (error?.message ||
              "Réapprovisionnement impossible.")
        );

        return;
      }

      const updatedProduct =
        data as Product;

      localStorage.setItem(
        `biso-product-edit-${userId}-${productId}`,
        JSON.stringify(updatedProduct)
      );

      setProduct(updatedProduct);

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
      <div className="flex min-h-screen items-center justify-center bg-[#020617] px-4 text-white">
        <div className="flex items-center gap-3 text-sm text-slate-400">
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
      <div className="flex min-h-screen items-center justify-center bg-[#020617] px-4 text-white">
        <div className="text-center">
          <AlertTriangle
            className="mx-auto mb-3 text-red-400"
            size={35}
          />

          <p className="font-bold">
            Produit introuvable
          </p>

          <button
            type="button"
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
    <>
      <main className="min-h-screen w-full overflow-x-hidden bg-[#020617] text-white">
        <div className="mx-auto w-full max-w-3xl px-3 py-4 pb-24 sm:px-5 sm:py-6">

          {/* ======================================================
              HEADER
          ====================================================== */}

          <header className="mb-5">
            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-400 text-black shadow-lg">
                <Package size={22} />
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-black sm:text-3xl">
                  Gestion du produit
                </h1>

                <p className="mt-1 truncate text-xs text-slate-400 sm:text-sm">
                  Modifiez ou ajoutez du stock
                </p>
              </div>

            </div>
          </header>

          {/* ======================================================
              PRODUIT ACTUEL
          ====================================================== */}

          <section className="mb-4 overflow-hidden rounded-3xl border border-blue-500/20 bg-blue-500/10 p-4">

            <div className="flex min-w-0 items-start gap-3">

              <Info
                size={19}
                className="mt-0.5 shrink-0 text-blue-400"
              />

              <div className="min-w-0 flex-1">

                <p className="text-xs font-bold uppercase tracking-wide text-blue-300">
                  Produit
                </p>

                <p className="mt-1 break-words text-base font-black text-white">
                  {product.name ||
                    "Produit sans nom"}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">

                  <InfoMini
                    label="Unité"
                    value={
                      product.unit ||
                      "Pièce"
                    }
                  />

                  <InfoMini
                    label="Stock"
                    value={`${formatMoney(
                      currentStock
                    )} pièces`}
                  />

                  <InfoMini
                    label="Achat"
                    value={`${formatMoney(
                      Number(
                        product.purchase_price ||
                          0
                      )
                    )} ${
                      product.currency
                    }`}
                  />

                  <InfoMini
                    label="Vente"
                    value={`${formatMoney(
                      Number(
                        product.selling_price ||
                          0
                      )
                    )} ${
                      product.currency
                    }`}
                  />

                </div>

              </div>

            </div>

          </section>

          {/* ======================================================
              GUIDE COMPACT
          ====================================================== */}

          <section className="mb-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">

            <div className="flex min-w-0 items-center justify-between gap-3 p-4">

              <div className="flex min-w-0 items-center gap-2">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                  <Sparkles size={18} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">
                    Guide
                  </p>

                  <p className="truncate text-[11px] text-slate-500">
                    Modifier ou réapprovisionner
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowGuide(!showGuide)
                }
                className="shrink-0 rounded-xl bg-orange-500 px-3 py-2 text-[11px] font-black text-black"
              >
                {showGuide
                  ? "Fermer"
                  : "Voir"}
              </button>

            </div>

            {showGuide && (
              <div className="border-t border-white/10 p-4">

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">

                  <GuideBox
                    title="Modifier"
                    text="Remplace le stock actuel par la quantité indiquée."
                    tone="blue"
                  />

                  <GuideBox
                    title="Réapprovisionner"
                    text="Ajoute la nouvelle marchandise au stock existant."
                    tone="green"
                  />

                </div>

              </div>
            )}

          </section>

          {/* ======================================================
              CHOIX MODE
          ====================================================== */}

          <div className="mb-4 grid grid-cols-2 gap-2">

            <button
              type="button"
              onClick={() =>
                setMode("edit")
              }
              className={`rounded-2xl border p-3 text-left transition sm:p-4 ${
                mode === "edit"
                  ? "border-blue-500/40 bg-blue-500/10"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Pencil size={17} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black">
                    Modifier
                  </p>

                  <p className="hidden text-[11px] text-slate-500 sm:block">
                    Corriger
                  </p>
                </div>

              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setMode("restock")
              }
              className={`rounded-2xl border p-3 text-left transition sm:p-4 ${
                mode === "restock"
                  ? "border-green-500/40 bg-green-500/10"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
                  <RefreshCcw size={17} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black">
                    Réapprovisionner
                  </p>

                  <p className="hidden text-[11px] text-slate-500 sm:block">
                    Ajouter
                  </p>
                </div>

              </div>
            </button>

          </div>

          {/* ======================================================
              MODE MODIFICATION
          ====================================================== */}

          {mode === "edit" && (
            <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-xl">

              <div className="border-b border-white/10 p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <Pencil
                    size={18}
                    className="text-blue-400"
                  />

                  <div>
                    <h2 className="text-base font-black sm:text-lg">
                      Modifier le produit
                    </h2>

                    <p className="text-[11px] text-slate-500">
                      Vérifiez les changements
                      avant de confirmer
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-5">

                <FieldBlock label="Nom du produit">
                  <input
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    placeholder="Exemple : Coca-Cola 33cl"
                    className={inputStyle}
                  />
                </FieldBlock>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                  <FieldBlock label="Type d'unité">
                    <select
                      value={type}
                      onChange={(e) =>
                        setType(e.target.value)
                      }
                      className={selectStyle}
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
                  </FieldBlock>

                  <FieldBlock label="Quantité en stock">
                    <input
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(e.target.value)
                      }
                      placeholder={
                        type === "Pièce"
                          ? "50"
                          : `Nombre de ${type}(s)`
                      }
                      className={inputStyle}
                    />
                  </FieldBlock>

                </div>

                {type !== "Pièce" && (
                  <FieldBlock
                    label={`Pièces dans ${type}`}
                  >
                    <input
                      type="number"
                      min="1"
                      value={piecesPerUnit}
                      onChange={(e) =>
                        setPiecesPerUnit(
                          e.target.value
                        )
                      }
                      placeholder="24"
                      className={inputStyle}
                    />

                    <p className="mt-2 rounded-xl bg-blue-500/5 p-3 text-xs text-slate-400">
                      Stock réel :
                      <strong className="ml-1 text-blue-400">
                        {Number(
                          quantity || 0
                        )} ×{" "}
                        {Number(
                          piecesPerUnit || 1
                        )} ={" "}
                        {formatMoney(
                          totalPieces
                        )} pièces
                      </strong>
                    </p>
                  </FieldBlock>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                  <FieldBlock label="Prix d'achat total">
                    <input
                      type="number"
                      min="0"
                      value={buyPrice}
                      onChange={(e) =>
                        setBuyPrice(
                          e.target.value
                        )
                      }
                      placeholder="100000"
                      className={inputStyle}
                    />
                  </FieldBlock>

                  <FieldBlock label="Prix de vente / pièce">
                    <input
                      type="number"
                      min="0"
                      value={sellPrice}
                      onChange={(e) =>
                        setSellPrice(
                          e.target.value
                        )
                      }
                      placeholder="2000"
                      className={inputStyle}
                    />
                  </FieldBlock>

                </div>

                <FieldBlock label="Monnaie">
                  <select
                    value={currency}
                    onChange={(e) =>
                      setCurrency(
                        e.target.value
                      )
                    }
                    className={selectStyle}
                  >
                    <option value="FC">
                      Franc congolais (FC)
                    </option>

                    <option value="USD">
                      Dollar américain (USD)
                    </option>
                  </select>
                </FieldBlock>

                {/* RÉSUMÉ COMPLET */}

                <section className="overflow-hidden rounded-3xl border border-orange-500/20 bg-orange-500/5">

                  <div className="border-b border-white/10 p-4">

                    <div className="flex items-center gap-2">
                      <TrendingUp
                        size={19}
                        className="text-orange-400"
                      />

                      <div>
                        <h3 className="text-sm font-black">
                          Résumé complet
                        </h3>

                        <p className="text-[11px] text-slate-500">
                          Résultats après modification
                        </p>
                      </div>
                    </div>

                  </div>

                  <div className="grid grid-cols-2 gap-2.5 p-3 sm:gap-3 sm:p-4">

                    <DetailCard
                      icon={
                        <Boxes
                          size={17}
                          className="text-blue-400"
                        />
                      }
                      label="Stock réel"
                      value={`${formatMoney(
                        totalPieces
                      )} pièces`}
                    />

                    <DetailCard
                      icon={
                        <CircleDollarSign
                          size={17}
                          className="text-orange-400"
                        />
                      }
                      label="Coût / pièce"
                      value={`${formatMoney(
                        pricePerPiece
                      )} ${currency}`}
                    />

                    <DetailCard
                      icon={
                        <TrendingUp
                          size={17}
                          className={
                            profitPerPiece >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        />
                      }
                      label="Bénéfice / pièce"
                      value={`${formatMoney(
                        profitPerPiece
                      )} ${currency}`}
                      valueClass={
                        profitPerPiece >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    />

                    <DetailCard
                      icon={
                        <Sparkles
                          size={17}
                          className={
                            totalProfit >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        />
                      }
                      label="Bénéfice total"
                      value={`${formatMoney(
                        totalProfit
                      )} ${currency}`}
                      valueClass={
                        totalProfit >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    />

                    <DetailCard
                      label="Achat total"
                      value={`${formatMoney(
                        Number(
                          buyPrice || 0
                        )
                      )} ${currency}`}
                    />

                    <DetailCard
                      label="Vente / pièce"
                      value={`${formatMoney(
                        Number(
                          sellPrice || 0
                        )
                      )} ${currency}`}
                    />

                  </div>

                  <div className="mx-3 mb-3 rounded-2xl border border-white/10 bg-black/20 p-3 sm:mx-4 sm:mb-4">

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">

                      <div className="min-w-0">
                        <p className="text-slate-500">
                          Stock actuel
                        </p>

                        <p className="mt-0.5 truncate font-black text-white">
                          {formatMoney(
                            currentStock
                          )}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-slate-500">
                          Nouveau stock
                        </p>

                        <p className="mt-0.5 truncate font-black text-orange-400">
                          {formatMoney(
                            totalPieces
                          )}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-slate-500">
                          Prix achat / pièce
                        </p>

                        <p className="mt-0.5 truncate font-black text-white">
                          {formatMoney(
                            pricePerPiece
                          )}{" "}
                          {currency}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-slate-500">
                          Marge / pièce
                        </p>

                        <p
                          className={`mt-0.5 truncate font-black ${
                            profitPerPiece >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {formatMoney(
                            profitPerPiece
                          )}{" "}
                          {currency}
                        </p>
                      </div>

                    </div>

                  </div>

                </section>

                <button
                  type="button"
                  onClick={updateProduct}
                  disabled={loading}
                  className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 px-4 py-4 text-sm font-black text-black shadow-xl transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={19}
                        className="animate-spin"
                      />
                      Modification...
                    </>
                  ) : (
                    <>
                      <Pencil size={19} />
                      Enregistrer
                    </>
                  )}
                </button>

              </div>

            </section>
          )}

          {/* ======================================================
              MODE RÉAPPROVISIONNEMENT
          ====================================================== */}

          {mode === "restock" && (
            <section className="overflow-hidden rounded-3xl border border-green-500/20 bg-green-500/[0.04] shadow-xl">

              <div className="border-b border-white/10 p-4 sm:p-5">

                <div className="flex items-center gap-2">

                  <RefreshCcw
                    size={19}
                    className="text-green-400"
                  />

                  <div>
                    <h2 className="text-sm font-black sm:text-lg">
                      Réapprovisionner
                    </h2>

                    <p className="text-[11px] text-slate-500">
                      Ajouter de la marchandise au stock
                    </p>
                  </div>

                </div>

              </div>

              <div className="space-y-4 p-4 sm:p-5">

                <div className="grid grid-cols-2 gap-2">

                  <DetailCard
                    label="Stock actuel"
                    value={`${formatMoney(
                      currentStock
                    )} pièces`}
                  />

                  <DetailCard
                    label="Nouveau stock"
                    value={`${formatMoney(
                      newStockAfterRestock
                    )} pièces`}
                    valueClass="text-green-400"
                  />

                </div>

                <FieldBlock label="Quantité reçue">

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
                      product.unit === "Pièce"
                        ? "Exemple : 50"
                        : `Nombre de ${
                            product.unit ||
                            "unités"
                          }`
                    }
                    className={inputStyle}
                  />

                </FieldBlock>

                {product.unit !== "Pièce" && (
                  <FieldBlock
                    label={`Pièces dans ${product.unit}`}
                  >

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
                      className={inputStyle}
                    />

                    <div className="mt-2 rounded-xl bg-green-500/5 p-3 text-xs">

                      <p className="text-slate-500">
                        Calcul de l'arrivage
                      </p>

                      <p className="mt-1 font-black text-green-400">
                        {Number(
                          restockQuantity ||
                            0
                        )}{" "}
                        ×{" "}
                        {Number(
                          restockPiecesPerUnit ||
                            1
                        )}{" "}
                        ={" "}
                        {formatMoney(
                          restockPieces
                        )}{" "}
                        pièces
                      </p>

                    </div>

                  </FieldBlock>
                )}

                <FieldBlock label="Prix total du nouvel arrivage">

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
                    className={inputStyle}
                  />

                </FieldBlock>

                {/* RÉSUMÉ */}

                <section className="overflow-hidden rounded-3xl border border-green-500/20 bg-green-500/5">

                  <div className="border-b border-white/10 p-4">

                    <div className="flex items-center gap-2">

                      <Boxes
                        size={19}
                        className="text-green-400"
                      />

                      <div>
                        <h3 className="text-sm font-black">
                          Résumé du stock
                        </h3>

                        <p className="text-[11px] text-slate-500">
                          Voici ce qui sera enregistré
                        </p>
                      </div>

                    </div>

                  </div>

                  <div className="grid grid-cols-2 gap-2.5 p-3 sm:gap-3 sm:p-4">

                    <DetailCard
                      label="Ancien stock"
                      value={`${formatMoney(
                        currentStock
                      )} pièces`}
                    />

                    <DetailCard
                      label="Ajout"
                      value={`+${formatMoney(
                        restockPieces
                      )} pièces`}
                      valueClass="text-green-400"
                    />

                    <DetailCard
                      label="Nouveau stock"
                      value={`${formatMoney(
                        newStockAfterRestock
                      )} pièces`}
                      valueClass="text-orange-400"
                    />

                    <DetailCard
                      label="Coût ancien"
                      value={`${formatMoney(
                        Number(
                          product.purchase_price ||
                            0
                        )
                      )} ${
                        product.currency
                      }`}
                    />

                    <DetailCard
                      label="Coût nouvel arrivage"
                      value={`${formatMoney(
                        restockUnitCost
                      )} ${
                        product.currency
                      }`}
                    />

                    <DetailCard
                      icon={
                        <TrendingUp
                          size={17}
                          className="text-green-400"
                        />
                      }
                      label="Nouveau coût moyen"
                      value={`${formatMoney(
                        newAverageCost
                      )} ${
                        product.currency
                      }`}
                      valueClass="text-green-400"
                    />

                  </div>

                  <div className="mx-3 mb-3 rounded-2xl border border-green-500/10 bg-black/20 p-3 sm:mx-4 sm:mb-4">

                    <div className="flex items-start gap-2">

                      <CheckCircle
                        size={17}
                        className="mt-0.5 shrink-0 text-green-400"
                      />

                      <div className="min-w-0">

                        <p className="text-xs font-black text-white">
                          Stock conservé
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-slate-400">
                          Le stock de{" "}
                          <strong className="text-white">
                            {formatMoney(
                              currentStock
                            )}
                          </strong>{" "}
                          pièces reste présent.
                          Les{" "}
                          <strong className="text-green-400">
                            {formatMoney(
                              restockPieces
                            )}
                          </strong>{" "}
                          nouvelles pièces sont
                          ajoutées.
                        </p>

                      </div>

                    </div>

                  </div>

                </section>

                <button
                  type="button"
                  onClick={restockProduct}
                  disabled={loadingRestock}
                  className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-400 px-4 py-4 text-sm font-black text-black shadow-xl transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingRestock ? (
                    <>
                      <Loader2
                        size={19}
                        className="animate-spin"
                      />
                      Réapprovisionnement...
                    </>
                  ) : (
                    <>
                      <RefreshCcw size={19} />
                      Ajouter au stock
                    </>
                  )}
                </button>

              </div>

            </section>
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
            className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-sm font-bold text-slate-400 transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            Annuler
          </button>

        </div>
      </main>

      {/* ==========================================================
          POPUP CONNEXION
      ========================================================== */}

      {showConnectionModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() =>
            setShowConnectionModal(false)
          }
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#0f172a] shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

            <button
              type="button"
              onClick={() =>
                setShowConnectionModal(false)
              }
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>

            <div className="p-6 text-center sm:p-7">

              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                <WifiOff size={30} />
              </div>

              <h2 className="text-xl font-black text-white">
                Connexion requise
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Cette opération nécessite une
                connexion Internet pour enregistrer
                les changements dans votre compte.
              </p>

              <div className="mt-5 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-left">

                <div className="flex gap-3">

                  <Info
                    size={18}
                    className="mt-0.5 shrink-0 text-blue-400"
                  />

                  <p className="text-xs leading-5 text-slate-300">
                    Reconnectez votre téléphone à
                    Internet puis réessayez.
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowConnectionModal(false)
                }
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-5 py-4 text-sm font-black text-white shadow-lg transition active:scale-[0.99]"
              >
                J'ai compris
              </button>

            </div>

          </div>
        </div>
      )}

      {/* ==========================================================
          POPUP CONFIRMATION
      ========================================================== */}

      {confirmAction && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() =>
            setConfirmAction(null)
          }
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#0f172a] shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div
              className={`h-1 w-full ${
                confirmAction === "edit"
                  ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                  : "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-400"
              }`}
            />

            <button
              type="button"
              onClick={() =>
                setConfirmAction(null)
              }
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>

            <div className="p-6 sm:p-7">

              <div
                className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl ${
                  confirmAction === "edit"
                    ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"
                    : "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                }`}
              >
                {confirmAction === "edit" ? (
                  <Pencil size={29} />
                ) : (
                  <RefreshCcw size={29} />
                )}
              </div>

              <h2 className="text-center text-xl font-black text-white">
                {confirmAction === "edit"
                  ? "Modifier ce produit ?"
                  : "Réapprovisionner ce produit ?"}
              </h2>

              {confirmAction === "edit" ? (
                <div className="mt-4 space-y-3">

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs text-slate-500">
                      Produit
                    </p>

                    <p className="mt-1 break-words text-sm font-black text-white">
                      {name ||
                        "Produit sans nom"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] text-slate-500">
                        Stock actuel
                      </p>

                      <p className="mt-1 text-sm font-black text-white">
                        {formatMoney(
                          currentStock
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3">
                      <p className="text-[11px] text-slate-500">
                        Nouveau stock
                      </p>

                      <p className="mt-1 text-sm font-black text-blue-300">
                        {formatMoney(
                          totalPieces
                        )}
                      </p>
                    </div>

                  </div>

                  <p className="text-center text-xs leading-5 text-slate-400">
                    Le stock actuel sera remplacé
                    par la nouvelle quantité.
                  </p>

                </div>
              ) : (
                <div className="mt-4 space-y-3">

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs text-slate-500">
                      Produit
                    </p>

                    <p className="mt-1 break-words text-sm font-black text-white">
                      {product.name ||
                        "Produit sans nom"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] text-slate-500">
                        Stock actuel
                      </p>

                      <p className="mt-1 text-sm font-black text-white">
                        {formatMoney(
                          currentStock
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-3">
                      <p className="text-[11px] text-slate-500">
                        Ajout
                      </p>

                      <p className="mt-1 text-sm font-black text-green-400">
                        +{formatMoney(
                          restockPieces
                        )}
                      </p>
                    </div>

                  </div>

                  <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3 text-center">

                    <p className="text-[11px] text-slate-500">
                      Nouveau stock
                    </p>

                    <p className="mt-1 text-lg font-black text-orange-400">
                      {formatMoney(
                        newStockAfterRestock
                      )}{" "}
                      pièces
                    </p>

                  </div>

                  <p className="text-center text-xs leading-5 text-slate-400">
                    Le stock actuel sera conservé et
                    les nouvelles pièces seront ajoutées.
                  </p>

                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setConfirmAction(null)
                  }
                  className="min-h-[50px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.08]"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={
                    confirmAction === "edit"
                      ? confirmUpdateProduct
                      : confirmRestockProduct
                  }
                  className={`min-h-[50px] rounded-2xl px-4 py-3 text-sm font-black text-black shadow-lg transition active:scale-[0.98] ${
                    confirmAction === "edit"
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                      : "bg-gradient-to-r from-green-500 to-emerald-400"
                  }`}
                >
                  {confirmAction === "edit"
                    ? "Modifier"
                    : "Ajouter au stock"}
                </button>

              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ======================================================
   UTILITAIRE
====================================================== */

function nPiecesForUpdate(
  type: string,
  piecesPerUnit: string
) {
  return type !== "Pièce"
    ? Number(
        piecesPerUnit || 1
      )
    : 1;
}

/* ======================================================
   PETITES INFORMATIONS PRODUIT
====================================================== */

function InfoMini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-black/20 p-2.5">
      <p className="truncate text-[10px] text-slate-500">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-white">
        {value}
      </p>
    </div>
  );
}

/* ======================================================
   BLOC CHAMP
====================================================== */

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-xs font-bold text-slate-300">
        {label}
      </label>

      {children}
    </div>
  );
}

/* ======================================================
   CARTE DÉTAIL
====================================================== */

function DetailCard({
  icon,
  label,
  value,
  valueClass = "text-white",
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-3">

      <div className="flex min-w-0 items-center gap-1.5">

        {icon && (
          <span className="shrink-0">
            {icon}
          </span>
        )}

        <p className="truncate text-[10px] font-bold text-slate-500 sm:text-[11px]">
          {label}
        </p>

      </div>

      <p
        className={`mt-1.5 break-words text-sm font-black ${valueClass} sm:text-base`}
      >
        {value}
      </p>

    </div>
  );
}

/* ======================================================
   GUIDE
====================================================== */

function GuideBox({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "blue" | "green";
}) {
  const classes =
    tone === "blue"
      ? "border-blue-500/20 bg-blue-500/5"
      : "border-green-500/20 bg-green-500/5";

  const titleClass =
    tone === "blue"
      ? "text-blue-300"
      : "text-green-300";

  return (
    <div
      className={`rounded-2xl border p-3 ${classes}`}
    >
      <p
        className={`text-xs font-black ${titleClass}`}
      >
        {title}
      </p>

      <p className="mt-1 text-[11px] leading-5 text-slate-400">
        {text}
      </p>
    </div>
  );
}

/* ======================================================
   STYLES
====================================================== */

const inputStyle = `
  block
  min-h-[50px]
  w-full
  min-w-0
  rounded-2xl
  border
  border-white/10
  bg-black/30
  px-4
  py-3
  text-sm
  text-white
  outline-none
  placeholder:text-slate-500
  focus:border-orange-400/50
  focus:ring-1
  focus:ring-orange-400/20
  transition
`;

const selectStyle = `
  block
  min-h-[50px]
  w-full
  min-w-0
  rounded-2xl
  border
  border-white/10
  bg-[#111827]
  px-4
  py-3
  text-sm
  text-white
  outline-none
  focus:border-orange-400/50
  focus:ring-1
  focus:ring-orange-400/20
  transition
`;