"use client";

/* ======================================================================
   BISO-COMMERCE — PAGE RAPPORT
   ----------------------------------------------------------------------
   Version complète corrigée
   ====================================================================== */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  Download,
  Search,
  Sparkles,
  Trash2,
  ArrowUp,
  CalendarDays,
  X,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  FileSpreadsheet,
  Wallet,
  Trophy,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

/* ======================================================
   TYPES
   ====================================================== */

type Sale = {
  id: string;
  product_name: string;
  quantity: number;
  total_sale: number;
  profit: number;
  currency: string;
  created_at: string;
};

type DayReport = {
  fc: number;
  usd: number;
  profitFc: number;
  profitUsd: number;
  quantity: number;
};

type ProductStat = {
  name: string;
  quantity: number;
  montantFc: number;
  montantUsd: number;
  profitFc: number;
  profitUsd: number;
};

type Notice = {
  type: "info" | "error" | "success";
  message: string;
} | null;

const EMPTY_DAY: DayReport = {
  fc: 0,
  usd: 0,
  profitFc: 0,
  profitUsd: 0,
  quantity: 0,
};

const PAGE_STEP = 5;

/* ======================================================
   OUTILS
   ====================================================== */

const formatMoney = (value: number) => {
  const number = Math.round(Number(value || 0));

  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const getLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const prettyDate = (value: string) => {
  if (!value) return "";

  const [y, m, d] = value.split("-");

  return `${d}/${m}/${y}`;
};

const isFC = (currency: string) => currency === "FC";

const isUSD = (currency: string) =>
  currency === "$" || currency === "USD";

/* Nettoyage des caractères non gérés par la police PDF standard. */
const cleanPDF = (text: string) =>
  String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const calculateDayReport = (
  sales: Sale[],
  targetDate: string
): DayReport => {
  let fc = 0;
  let usd = 0;
  let profitFc = 0;
  let profitUsd = 0;
  let quantity = 0;

  sales.forEach((sale) => {
    const saleDate = sale.created_at.split("T")[0];

    if (saleDate !== targetDate) return;

    const amount = Number(sale.total_sale || 0);
    const profit = Number(sale.profit || 0);

    quantity += Number(sale.quantity || 0);

    if (isFC(sale.currency)) {
      fc += amount;
      profitFc += profit;
    } else if (isUSD(sale.currency)) {
      usd += amount;
      profitUsd += profit;
    }
  });

  return {
    fc,
    usd,
    profitFc,
    profitUsd,
    quantity,
  };
};

/* Agrégation par produit. */
const buildProductStats = (sales: Sale[]): ProductStat[] => {
  const map: Record<string, ProductStat> = {};

  sales.forEach((sale) => {
    const name = sale.product_name?.trim() || "Produit inconnu";

    if (!map[name]) {
      map[name] = {
        name,
        quantity: 0,
        montantFc: 0,
        montantUsd: 0,
        profitFc: 0,
        profitUsd: 0,
      };
    }

    const amount = Number(sale.total_sale || 0);
    const profit = Number(sale.profit || 0);

    map[name].quantity += Number(sale.quantity || 0);

    if (isFC(sale.currency)) {
      map[name].montantFc += amount;
      map[name].profitFc += profit;
    }

    if (isUSD(sale.currency)) {
      map[name].montantUsd += amount;
      map[name].profitUsd += profit;
    }
  });

  return Object.values(map).sort(
    (a, b) => b.quantity - a.quantity
  );
};

/* Variation protégée contre la division par zéro. */
const variation = (current: number, previous: number) => {
  if (!previous) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
};

/* ======================================================
   PAGE
   ====================================================== */

export default function ReportsPage() {
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [productQuery, setProductQuery] = useState("");

  const [showAll, setShowAll] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  const [showGuide, setShowGuide] = useState(false);
  const [showTopButton, setShowTopButton] = useState(false);

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);

  /* ==================================================
     CHARGEMENT DES VENTES
     ================================================== */

  const loadReports = useCallback(async () => {
    setLoading(true);

    try {
      const userId =
        typeof window !== "undefined"
          ? localStorage.getItem("user_id")
          : null;

      if (!userId) {
        setNotice({
          type: "error",
          message:
            "Utilisateur non connecté. Reconnectez-vous pour voir vos rapports.",
        });

        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Erreur chargement ventes :",
          error
        );

        setNotice({
          type: "error",
          message:
            "Impossible de charger les ventes. Vérifiez votre connexion.",
        });

        setLoading(false);
        return;
      }

      const list = (data || []) as Sale[];

      setSalesHistory(list);
      setFilteredSales(list);

      setSelectedDate("");
      setStartDate("");
      setEndDate("");
      setProductQuery("");

      setShowAll(false);
      setVisibleCount(PAGE_STEP);

      setNotice(null);
    } catch (error) {
      console.error(
        "Erreur générale :",
        error
      );

      setNotice({
        type: "error",
        message:
          "Une erreur est survenue pendant le chargement du rapport.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  /* ==================================================
     BOUTON RETOUR EN HAUT
     ================================================== */

  useEffect(() => {
    const handleScroll = () => {
      setShowTopButton(window.scrollY > 500);
    };

    window.addEventListener(
      "scroll",
      handleScroll,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* ==================================================
     RAPPORTS JOURNALIERS
     ================================================== */

  const {
    today,
    yesterday,
    beforeYesterday,
  } = useMemo(() => {
    if (salesHistory.length === 0) {
      return {
        today: EMPTY_DAY,
        yesterday: EMPTY_DAY,
        beforeYesterday: EMPTY_DAY,
      };
    }

    const now = new Date();

    const d1 = new Date(now);
    d1.setDate(d1.getDate() - 1);

    const d2 = new Date(now);
    d2.setDate(d2.getDate() - 2);

    return {
      today: calculateDayReport(
        salesHistory,
        getLocalDate(now)
      ),
      yesterday: calculateDayReport(
        salesHistory,
        getLocalDate(d1)
      ),
      beforeYesterday: calculateDayReport(
        salesHistory,
        getLocalDate(d2)
      ),
    };
  }, [salesHistory]);

  const bestProduct = useMemo(() => {
    const stats = buildProductStats(
      salesHistory
    );

    return stats[0]?.name || "Aucun";
  }, [salesHistory]);

  /* ==================================================
     RÉSUMÉ DE LA SÉLECTION
     ================================================== */

  const summary = useMemo(() => {
    let totalFc = 0;
    let totalUsd = 0;
    let profitFc = 0;
    let profitUsd = 0;
    let quantity = 0;

    filteredSales.forEach((sale) => {
      const amount = Number(
        sale.total_sale || 0
      );

      const profit = Number(
        sale.profit || 0
      );

      quantity += Number(
        sale.quantity || 0
      );

      if (isFC(sale.currency)) {
        totalFc += amount;
        profitFc += profit;
      }

      if (isUSD(sale.currency)) {
        totalUsd += amount;
        profitUsd += profit;
      }
    });

    const count = filteredSales.length;

    return {
      count,
      quantity,
      totalFc,
      totalUsd,
      profitFc,
      profitUsd,
      averageFc: count
        ? totalFc / count
        : 0,
      averageUsd: count
        ? totalUsd / count
        : 0,
      marginFc: totalFc
        ? (profitFc / totalFc) * 100
        : 0,
      marginUsd: totalUsd
        ? (profitUsd / totalUsd) * 100
        : 0,
    };
  }, [filteredSales]);

  const topProducts = useMemo(
    () =>
      buildProductStats(
        filteredSales
      ).slice(0, 5),
    [filteredSales]
  );

  const dayVariationFc = useMemo(
    () =>
      variation(
        today.fc,
        yesterday.fc
      ),
    [today.fc, yesterday.fc]
  );

  const dayVariationUsd = useMemo(
    () =>
      variation(
        today.usd,
        yesterday.usd
      ),
    [today.usd, yesterday.usd]
  );

  /* ==================================================
     FILTRE PRODUIT
     ================================================== */

  const applyProductQuery = useCallback(
    (list: Sale[]) => {
      const query =
        productQuery.trim().toLowerCase();

      if (!query) return list;

      return list.filter((sale) =>
        (sale.product_name || "")
          .toLowerCase()
          .includes(query)
      );
    },
    [productQuery]
  );

  /* ==================================================
     FILTRE PAR DATE
     ================================================== */

  const filterByDate = () => {
    if (!selectedDate) {
      setNotice({
        type: "info",
        message:
          "Choisissez d'abord une date.",
      });

      return;
    }

    const result = salesHistory.filter(
      (sale) =>
        sale.created_at.split("T")[0] ===
        selectedDate
    );

    setStartDate("");
    setEndDate("");

    setFilteredSales(
      applyProductQuery(result)
    );

    setShowAll(false);
    setVisibleCount(PAGE_STEP);

    setNotice(null);
  };

  /* ==================================================
     FILTRE PAR PÉRIODE
     ================================================== */

  const filterByPeriod = () => {
    if (!startDate || !endDate) {
      setNotice({
        type: "info",
        message:
          "Choisissez la date de début et la date de fin.",
      });

      return;
    }

    if (startDate > endDate) {
      setNotice({
        type: "info",
        message:
          "La date de début doit être avant la date de fin.",
      });

      return;
    }

    const result = salesHistory.filter(
      (sale) => {
        const saleDate =
          sale.created_at.split("T")[0];

        return (
          saleDate >= startDate &&
          saleDate <= endDate
        );
      }
    );

    setSelectedDate("");

    setFilteredSales(
      applyProductQuery(result)
    );

    setShowAll(false);
    setVisibleCount(PAGE_STEP);

    setNotice(null);
  };

  /* ==================================================
     RECHERCHE PRODUIT
     ================================================== */

  const searchProduct = (
    value: string
  ) => {
    setProductQuery(value);

    let base = salesHistory;

    if (selectedDate) {
      base = base.filter(
        (sale) =>
          sale.created_at.split("T")[0] ===
          selectedDate
      );
    } else if (
      startDate &&
      endDate
    ) {
      base = base.filter(
        (sale) => {
          const saleDate =
            sale.created_at.split("T")[0];

          return (
            saleDate >= startDate &&
            saleDate <= endDate
          );
        }
      );
    }

    const query =
      value.trim().toLowerCase();

    const result = query
      ? base.filter((sale) =>
          (sale.product_name || "")
            .toLowerCase()
            .includes(query)
        )
      : base;

    setFilteredSales(result);
    setShowAll(false);
    setVisibleCount(PAGE_STEP);

    setNotice(null);
  };

  /* ==================================================
     TOUTES LES VENTES
     ================================================== */

  const showEverything = () => {
    /*
      Correction :
      On conserve la recherche produit si elle existe.
    */

    const result =
      applyProductQuery(salesHistory);

    setSelectedDate("");
    setStartDate("");
    setEndDate("");

    setFilteredSales(result);

    setShowAll(true);
    setVisibleCount(result.length);

    setNotice(null);
  };

  /* ==================================================
     RÉINITIALISER
     ================================================== */

  const resetFilters = () => {
    setSelectedDate("");
    setStartDate("");
    setEndDate("");
    setProductQuery("");

    setFilteredSales(
      salesHistory
    );

    setShowAll(false);
    setVisibleCount(PAGE_STEP);

    setNotice(null);
  };
  const deleteSale = async (saleId: string) => {
  const confirmed = window.confirm(
    "Voulez-vous vraiment supprimer cette vente ? Cette action est irréversible."
  );

  if (!confirmed) return;

  try {
    const { error } = await supabase
      .from("sales")
      .delete()
      .eq("id", saleId);

    if (error) {
      console.error("Erreur suppression vente :", error);

      setNotice({
        type: "error",
        message: "Impossible de supprimer cette vente.",
      });

      return;
    }

    // Supprime immédiatement la vente de l'affichage
    setSalesHistory((current) =>
      current.filter((sale) => sale.id !== saleId)
    );

    setFilteredSales((current) =>
      current.filter((sale) => sale.id !== saleId)
    );

    setNotice({
      type: "success",
      message: "Vente supprimée avec succès.",
    });
  } catch (error) {
    console.error("Erreur générale suppression :", error);

    setNotice({
      type: "error",
      message: "Une erreur est survenue lors de la suppression.",
    });
  }
};

  /* ==================================================
     VENTES AFFICHÉES
     ================================================== */

  const displayedSales = showAll
    ? filteredSales
    : filteredSales.slice(
        0,
        visibleCount
      );

  /* ==================================================
     LABEL DE PÉRIODE
     ================================================== */

  const periodLabel = selectedDate
    ? `Date : ${prettyDate(
        selectedDate
      )}`
    : startDate && endDate
    ? `Du ${prettyDate(
        startDate
      )} au ${prettyDate(endDate)}`
    : "Toutes les ventes";

  /* ==================================================
     DONNÉES EXPORT
     ================================================== */

  const getExportData = (): Sale[] => {
    /*
      Important :
      l'export utilise exactement les filtres
      de date/période + recherche produit.
    */

    let data = salesHistory;

    if (selectedDate) {
      data = data.filter(
        (sale) =>
          sale.created_at.split("T")[0] ===
          selectedDate
      );
    }

    if (
      startDate &&
      endDate
    ) {
      data = data.filter(
        (sale) => {
          const saleDate =
            sale.created_at.split("T")[0];

          return (
            saleDate >= startDate &&
            saleDate <= endDate
          );
        }
      );
    }

    return applyProductQuery(data);
  };

  const exportFileBase =
    selectedDate
      ? `Rapport-BISO-COMMERCE-${selectedDate}`
      : startDate && endDate
      ? `Rapport-BISO-COMMERCE-${startDate}-${endDate}`
      : productQuery
      ? `Rapport-BISO-COMMERCE-${productQuery
          .trim()
          .replace(/[^a-zA-Z0-9-_]/g, "-")}`
      : "Rapport-BISO-COMMERCE-complet";

  /* ==================================================
     EXPORT CSV
     ================================================== */

  const downloadCSV = () => {
    const data = getExportData();

    if (!data.length) {
      const message = selectedDate
        ? `Aucune vente à la date ${prettyDate(
            selectedDate
          )}.`
        : startDate && endDate
        ? `Aucune vente du ${prettyDate(
            startDate
          )} au ${prettyDate(
            endDate
          )}.`
        : productQuery
        ? `Aucune vente pour le produit « ${productQuery} ».`
        : "Aucune vente à exporter.";

      setNotice({
        type: "info",
        message,
      });

      return;
    }

    const header = [
      "Date",
      "Produit",
      "Quantite",
      "Montant",
      "Benefice",
      "Devise",
    ];

    const lines = data.map(
      (sale) =>
        [
          `"${new Date(
            sale.created_at
          ).toLocaleString("fr-FR")}"`,
          `"${(
            sale.product_name || ""
          ).replace(/"/g, '""')}"`,
          sale.quantity,
          Math.round(
            Number(
              sale.total_sale || 0
            )
          ),
          Math.round(
            Number(
              sale.profit || 0
            )
          ),
          `"${sale.currency || ""}"`,
        ].join(";")
    );

    const csv =
      "\uFEFF" +
      [
        header.join(";"),
        ...lines,
      ].join("\n");

    const blob = new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download = `${exportFileBase}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    setNotice({
      type: "success",
      message:
        "Fichier Excel (CSV) téléchargé avec succès.",
    });
  };

  /* ==================================================
     CRÉATION DU PDF
     ================================================== */

  const downloadPDF = () => {
    const data = getExportData();

    const noSalesMessage =
      data.length === 0
        ? selectedDate
          ? `Aucune vente à la date ${prettyDate(
              selectedDate
            )}.`
          : startDate && endDate
          ? `Aucune vente du ${prettyDate(
              startDate
            )} au ${prettyDate(
              endDate
            )}.`
          : productQuery
          ? `Aucune vente pour le produit « ${productQuery} ».`
          : "Aucune vente trouvée."
        : null;

    if (!data.length) {
      setNotice({
        type: "info",
        message: noSalesMessage || "Aucune vente trouvée.",
      });
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      putOnlyUsedFonts: true,
      compress: true,
    });

    const ORANGE: [
      number,
      number,
      number
    ] = [234, 88, 12];

    const DARK: [
      number,
      number,
      number
    ] = [17, 24, 39];

    const GREY: [
      number,
      number,
      number
    ] = [110, 110, 110];

    doc.setFont(
      "helvetica",
      "normal"
    );

    /* ---------- CALCULS ---------- */

    let totalFc = 0;
    let totalUsd = 0;
    let profitFc = 0;
    let profitUsd = 0;
    let totalQuantity = 0;

    data.forEach((sale) => {
      const montant = Number(
        sale.total_sale || 0
      );

      const benefice = Number(
        sale.profit || 0
      );

      totalQuantity += Number(
        sale.quantity || 0
      );

      if (isFC(sale.currency)) {
        totalFc += montant;
        profitFc += benefice;
      }

      if (isUSD(sale.currency)) {
        totalUsd += montant;
        profitUsd += benefice;
      }
    });

    const produits =
      buildProductStats(data);

    const meilleurProduit =
      produits[0]?.name || "Aucun";

    const margeFc =
      totalFc > 0
        ? (profitFc / totalFc) * 100
        : 0;

    const margeUsd =
      totalUsd > 0
        ? (profitUsd / totalUsd) * 100
        : 0;

    const periodeTexte =
      selectedDate
        ? `Date : ${prettyDate(
            selectedDate
          )}`
        : startDate && endDate
        ? `Du ${prettyDate(
            startDate
          )} au ${prettyDate(endDate)}`
        : productQuery
        ? `Produit : ${productQuery}`
        : "Toutes les ventes";

    const dateCreation =
      new Date().toLocaleString(
        "fr-FR"
      );

    /* ---------- PAGE DE GARDE ---------- */

    doc.setFillColor(...DARK);
    doc.rect(
      0,
      0,
      210,
      78,
      "F"
    );

    doc.setFillColor(...ORANGE);
    doc.rect(
      0,
      78,
      210,
      3,
      "F"
    );

    doc.setTextColor(
      255,
      255,
      255
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(26);

    doc.text(
      "BISO-COMMERCE",
      20,
      38
    );

    doc.setFontSize(15);

    doc.setTextColor(
      255,
      190,
      130
    );

    doc.text(
      "Rapport officiel des ventes",
      20,
      52
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(10);

    doc.setTextColor(
      220,
      220,
      220
    );

    doc.text(
      cleanPDF(
        "Analyse professionnelle de l'activite commerciale"
      ),
      20,
      63
    );

    doc.setTextColor(
      35,
      35,
      35
    );

    autoTable(doc, {
      startY: 95,

      head: [
        [
          "Informations du rapport",
          "",
        ],
      ],

      body: [
        [
          "Periode",
          cleanPDF(
            periodeTexte
          ),
        ],
        [
          "Date de generation",
          cleanPDF(
            dateCreation
          ),
        ],
        [
          "Nombre de ventes",
          String(
            data.length
          ),
        ],
        [
          "Quantite vendue",
          String(
            totalQuantity
          ),
        ],
        [
          "Produits differents",
          String(
            produits.length
          ),
        ],
        [
          "Produit le plus vendu",
          cleanPDF(
            meilleurProduit
          ),
        ],
      ],

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 11,
        cellPadding: 5,
        textColor: [
          35,
          35,
          35,
        ],
      },

      headStyles: {
        fillColor: ORANGE,
        fontStyle: "bold",
        textColor: [
          255,
          255,
          255,
        ],
      },

      alternateRowStyles: {
        fillColor: [
          248,
          248,
          248,
        ],
      },

      columnStyles: {
        0: {
          fontStyle: "bold",
          cellWidth: 70,
        },
      },

      margin: {
        left: 20,
        right: 20,
      },
    });

    /* ---------- RÉSUMÉ FINANCIER ---------- */

    doc.addPage();

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(20);

    doc.text(
      "Resume financier",
      20,
      30
    );

    autoTable(doc, {
      startY: 42,

      head: [
        [
          "Categorie",
          "Montant",
          "Part",
        ],
      ],

      body: [
        [
          "Ventes FC",
          `${formatMoney(
            totalFc
          )} FC`,
          "-",
        ],
        [
          "Ventes USD",
          `${formatMoney(
            totalUsd
          )} $`,
          "-",
        ],
        [
          "Benefice FC",
          `${formatMoney(
            profitFc
          )} FC`,
          `${margeFc.toFixed(
            1
          )} %`,
        ],
        [
          "Benefice USD",
          `${formatMoney(
            profitUsd
          )} $`,
          `${margeUsd.toFixed(
            1
          )} %`,
        ],
        [
          "Panier moyen FC",
          `${formatMoney(
            data.length
              ? totalFc /
                  data.length
              : 0
          )} FC`,
          "-",
        ],
        [
          "Panier moyen USD",
          `${formatMoney(
            data.length
              ? totalUsd /
                  data.length
              : 0
          )} $`,
          "-",
        ],
      ],

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 11,
        cellPadding: 5,
        textColor: [
          35,
          35,
          35,
        ],
      },

      headStyles: {
        fillColor: ORANGE,
        fontStyle: "bold",
        textColor: [
          255,
          255,
          255,
        ],
      },

      alternateRowStyles: {
        fillColor: [
          248,
          248,
          248,
        ],
      },

      margin: {
        left: 20,
        right: 20,
      },
    });

    /* ---------- DÉTAIL DES PRODUITS ---------- */

    doc.addPage();

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(20);

    doc.text(
      "Detail des produits",
      20,
      30
    );

    const rows =
      produits.map(
        (product) => {
          let ventes = "";
          let benefice = "";

          if (
            product.montantFc >
            0
          ) {
            ventes += `${formatMoney(
              product.montantFc
            )} FC`;

            benefice += `${formatMoney(
              product.profitFc
            )} FC`;
          }

          if (
            product.montantUsd >
            0
          ) {
            if (ventes)
              ventes += " / ";

            if (benefice)
              benefice +=
                " / ";

            ventes += `${formatMoney(
              product.montantUsd
            )} $`;

            benefice += `${formatMoney(
              product.profitUsd
            )} $`;
          }

          return [
            cleanPDF(
              product.name
            ),
            product.quantity,
            ventes || "0",
            benefice || "0",
          ];
        }
      );

    autoTable(doc, {
      startY: 42,

      head: [
        [
          "Produit",
          "Quantite",
          "Ventes",
          "Benefice",
        ],
      ],

      body: rows,

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 4,
        textColor: [
          35,
          35,
          35,
        ],
      },

      headStyles: {
        fillColor: ORANGE,
        fontStyle: "bold",
        textColor: [
          255,
          255,
          255,
        ],
      },

      alternateRowStyles: {
        fillColor: [
          248,
          248,
          248,
        ],
      },

      columnStyles: {
        0: {
          cellWidth: 65,
        },

        1: {
          cellWidth: 25,
          halign: "center",
        },

        2: {
          cellWidth: 45,
        },

        3: {
          cellWidth: 45,
        },
      },

      margin: {
        left: 10,
        right: 10,
      },
    });

    /* ---------- SUIVI JOURNALIER ---------- */

    const perDay: Record<
      string,
      DayReport
    > = {};

    data.forEach((sale) => {
      const day =
        sale.created_at.split(
          "T"
        )[0];

      if (!perDay[day]) {
        perDay[day] = {
          ...EMPTY_DAY,
        };
      }

      const amount = Number(
        sale.total_sale || 0
      );

      const profit = Number(
        sale.profit || 0
      );

      perDay[day].quantity +=
        Number(
          sale.quantity || 0
        );

      if (isFC(sale.currency)) {
        perDay[day].fc += amount;
        perDay[day].profitFc +=
          profit;
      }

      if (isUSD(sale.currency)) {
        perDay[day].usd += amount;
        perDay[day].profitUsd +=
          profit;
      }
    });

    const dayRows = Object.keys(
      perDay
    )
      .sort((a, b) =>
        a < b ? 1 : -1
      )
      .map((day) => [
        prettyDate(day),
        perDay[day].quantity,
        `${formatMoney(
          perDay[day].fc
        )} FC`,
        `${formatMoney(
          perDay[day].usd
        )} $`,
        `${formatMoney(
          perDay[day].profitFc
        )} FC`,
        `${formatMoney(
          perDay[day].profitUsd
        )} $`,
      ]);

    doc.addPage();

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(20);

    doc.text(
      "Suivi journalier",
      20,
      30
    );

    autoTable(doc, {
      startY: 42,

      head: [
        [
          "Date",
          "Qte",
          "Ventes FC",
          "Ventes USD",
          "Ben. FC",
          "Ben. USD",
        ],
      ],

      body: dayRows,

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 3.5,
        textColor: [
          35,
          35,
          35,
        ],
      },

      headStyles: {
        fillColor: ORANGE,
        fontStyle: "bold",
        textColor: [
          255,
          255,
          255,
        ],
      },

      alternateRowStyles: {
        fillColor: [
          248,
          248,
          248,
        ],
      },

      margin: {
        left: 12,
        right: 12,
      },
    });

    /* ---------- ANALYSE COMMERCIALE ---------- */

    doc.addPage();

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(20);

    doc.text(
      "Analyse commerciale",
      20,
      30
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(12);

    const analyse = [
      `Produit le plus vendu : ${cleanPDF(
        meilleurProduit
      )}`,

      `Quantite totale vendue : ${totalQuantity}`,

      `Nombre total de ventes : ${data.length}`,

      `Total ventes FC : ${formatMoney(
        totalFc
      )} FC`,

      `Total ventes USD : ${formatMoney(
        totalUsd
      )} $`,

      `Benefice total FC : ${formatMoney(
        profitFc
      )} FC`,

      `Benefice total USD : ${formatMoney(
        profitUsd
      )} $`,

      `Marge FC : ${margeFc.toFixed(
        1
      )} %`,

      `Marge USD : ${margeUsd.toFixed(
        1
      )} %`,
    ];

    let y = 50;

    analyse.forEach(
      (line) => {
        doc.text(
          cleanPDF(line),
          20,
          y
        );

        y += 11;
      }
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(13);

    doc.text(
      "Conclusion",
      20,
      y + 8
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(10);

    const conclusion =
      "Ce rapport permet au responsable du commerce de suivre les ventes, " +
      "les quantites vendues, les benefices generes et la marge realisee " +
      "pendant la periode choisie. Il peut etre archive ou presente comme " +
      "document officiel de gestion.";

    doc.text(
      doc.splitTextToSize(
        cleanPDF(
          conclusion
        ),
        170
      ),
      20,
      y + 19
    );

    /* ---------- PIED DE PAGE ---------- */

    const totalPages =
      doc.getNumberOfPages();

    for (
      let page = 1;
      page <= totalPages;
      page++
    ) {
      doc.setPage(page);

      doc.setDrawColor(
        225,
        225,
        225
      );

      doc.line(
        20,
        281,
        190,
        281
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(8);

      doc.setTextColor(
        ...GREY
      );

      doc.text(
        "BISO-COMMERCE",
        20,
        287
      );

      doc.text(
        cleanPDF(
          periodeTexte
        ),
        78,
        287
      );

      doc.text(
        `Page ${page} / ${totalPages}`,
        165,
        287
      );
    }

    /* ---------- MESSAGE SI AUCUNE VENTE ---------- */

    if (noSalesMessage) {
      doc.setPage(
        doc.getNumberOfPages()
      );

      const pageHeight =
        doc.internal.pageSize.getHeight();

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(11);

      doc.setTextColor(
        180,
        60,
        60
      );

      doc.text(
        cleanPDF(
          noSalesMessage
        ),
        20,
        pageHeight - 20
      );
    }

    doc.save(
      `${exportFileBase}.pdf`
    );

    if (data.length) {
      setNotice({
        type: "success",
        message:
          "Rapport PDF généré avec succès.",
      });
    }
  };

  /* ======================================================
     JSX — PARTIE 1
     ====================================================== */

  return (
    <main
      className="
        mx-auto
        w-full
        min-w-0
        max-w-7xl
        overflow-x-hidden
        px-3
        py-4
        sm:px-5
        sm:py-6
        lg:px-6
      "
    >
      <div className="w-full min-w-0 space-y-6">

        {/* ================== HEADER ================== */}

        <section className="w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl backdrop-blur-xl sm:p-6">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
                <BarChart3 size={24} />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Rapport
                </h1>

                <p className="mt-1 break-words text-sm text-slate-400">
                  Analyse complète de votre activité commerciale
                </p>
              </div>
            </div>

            <div className="flex w-full shrink-0 gap-2 sm:w-auto">
              <button
                type="button"
                onClick={loadReports}
                disabled={loading}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/5 disabled:opacity-50 sm:flex-none"
              >
                <RefreshCw
                  size={16}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />
                Actualiser
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowGuide(
                    !showGuide
                  )
                }
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-orange-400/20 bg-orange-500/10 px-4 py-3 text-sm font-black text-orange-300 transition hover:bg-orange-500/20 sm:flex-none"
              >
                <Sparkles size={17} />
                Guide
              </button>
            </div>
          </div>

          {/* Bandeau période active */}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-bold text-slate-300">
              {periodLabel}
            </span>

            <span className="rounded-lg border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-bold text-slate-300">
              {summary.count} vente
              {summary.count > 1
                ? "s"
                : ""}
            </span>

            <span className="rounded-lg border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-bold text-slate-300">
              Meilleur produit :{" "}
              {bestProduct}
            </span>
          </div>

          {showGuide && (
            <div className="mt-5 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="space-y-3 text-sm leading-6 text-slate-300">
                <p>
                  <span className="mr-2">
                    📅
                  </span>
                  Choisissez une date pour
                  afficher uniquement les ventes
                  de cette journée.
                </p>

                <p>
                  <span className="mr-2">
                    📆
                  </span>
                  Utilisez « Du » et « Au »
                  pour rechercher les ventes
                  d'une période.
                </p>

                <p>
                  <span className="mr-2">
                    🔎
                  </span>
                  Tapez le nom d'un produit pour
                  retrouver toutes ses ventes.
                </p>

                <p>
                  <span className="mr-2">
                    📄
                  </span>
                  « Créer le PDF » génère un
                  rapport officiel ; « Excel »
                  exporte les données brutes.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowGuide(false)
                }
                className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-black transition hover:bg-orange-400"
              >
                Fermer le guide
              </button>
            </div>
          )}
        </section>

        {/* ================== MESSAGE ================== */}

        {notice && (
          <div
            className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-sm ${
              notice.type ===
              "error"
                ? "border-red-400/20 bg-red-500/10 text-red-300"
                : notice.type ===
                  "success"
                ? "border-green-400/20 bg-green-500/10 text-green-300"
                : "border-orange-400/20 bg-orange-500/10 text-orange-300"
            }`}
            role="status"
          >
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p className="min-w-0 break-words font-bold">
              {notice.message}
            </p>

            <button
              type="button"
              onClick={() =>
                setNotice(null)
              }
              className="ml-auto shrink-0 opacity-70 transition hover:opacity-100"
              aria-label="Fermer le message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ================== STATISTIQUES ================== */}

        <section className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
          <ReportCard
            icon="🔥"
            title="Aujourd'hui"
            value={`${formatMoney(
              today.fc
            )} FC | ${formatMoney(
              today.usd
            )} $`}
            subtitle={`Bénéfice : ${formatMoney(
              today.profitFc
            )} FC | ${formatMoney(
              today.profitUsd
            )} $`}
            trend={
              dayVariationFc ||
              dayVariationUsd
            }
            trendLabel="vs hier"
            extra={`${today.quantity} article${
              today.quantity > 1
                ? "s"
                : ""
            } vendu${
              today.quantity > 1
                ? "s"
                : ""
            }`}
          />

          <ReportCard
            icon="📅"
            title="Hier"
            value={`${formatMoney(
              yesterday.fc
            )} FC | ${formatMoney(
              yesterday.usd
            )} $`}
            subtitle={`Bénéfice : ${formatMoney(
              yesterday.profitFc
            )} FC | ${formatMoney(
              yesterday.profitUsd
            )} $`}
            extra={`${yesterday.quantity} article${
              yesterday.quantity > 1
                ? "s"
                : ""
            }`}
          />

          <ReportCard
            icon="📈"
            title="Avant-hier"
            value={`${formatMoney(
              beforeYesterday.fc
            )} FC | ${formatMoney(
              beforeYesterday.usd
            )} $`}
            subtitle={`Bénéfice : ${formatMoney(
              beforeYesterday.profitFc
            )} FC | ${formatMoney(
              beforeYesterday.profitUsd
            )} $`}
            extra={`${beforeYesterday.quantity} article${
              beforeYesterday.quantity > 1
                ? "s"
                : ""
            }`}
          />
        </section>

        {/* ================== RÉSUMÉ ================== */}

        <section className="w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl sm:p-6">
          <div className="mb-5 flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400">
              <Wallet size={19} />
            </div>

            <div className="min-w-0">
              <h2 className="text-xl font-black text-white">
                Résumé de la sélection
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {periodLabel}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniStat
              label="Ventes FC"
              value={`${formatMoney(
                summary.totalFc
              )} FC`}
              tone="orange"
            />

            <MiniStat
              label="Ventes USD"
              value={`${formatMoney(
                summary.totalUsd
              )} $`}
              tone="orange"
            />

            <MiniStat
              label="Bénéfice FC"
              value={`${formatMoney(
                summary.profitFc
              )} FC`}
              tone="green"
              hint={`Marge ${summary.marginFc.toFixed(
                1
              )} %`}
            />

            <MiniStat
              label="Bénéfice USD"
              value={`${formatMoney(
                summary.profitUsd
              )} $`}
              tone="green"
              hint={`Marge ${summary.marginUsd.toFixed(
                1
              )} %`}
            />

            <MiniStat
              label="Nombre de ventes"
              value={String(
                summary.count
              )}
              tone="blue"
            />

            <MiniStat
              label="Quantité vendue"
              value={String(
                summary.quantity
              )}
              tone="blue"
            />

            <MiniStat
              label="Panier moyen FC"
              value={`${formatMoney(
                summary.averageFc
              )} FC`}
              tone="slate"
            />

            <MiniStat
              label="Panier moyen USD"
              value={`${formatMoney(
                summary.averageUsd
              )} $`}
              tone="slate"
            />
          </div>
        </section>

        {/* ================== TOP PRODUITS ================== */}

        {topProducts.length >
          0 && (
          <section className="w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl sm:p-6">
            <div className="mb-5 flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Trophy size={19} />
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-black text-white">
                  Top 5 des produits
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Classement par quantité vendue
                  sur la sélection.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {topProducts.map(
                (
                  product,
                  index
                ) => (
                  <div
                    key={
                      product.name
                    }
                    className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-sm font-black text-orange-300">
                        {index + 1}
                      </span>

                      <p className="min-w-0 break-words font-black text-white">
                        {product.name}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:w-[380px] sm:gap-3">
                      <MiniStat
                        label="Quantité"
                        value={`x${product.quantity}`}
                        tone="slate"
                        dense
                      />

                      <MiniStat
                        label="Ventes"
                        value={
                          product.montantFc >
                          0
                            ? `${formatMoney(
                                product.montantFc
                              )} FC`
                            : `${formatMoney(
                                product.montantUsd
                              )} $`
                        }
                        tone="orange"
                        dense
                      />

                      <MiniStat
                        label="Bénéfice"
                        value={
                          product.montantFc >
                          0
                            ? `${formatMoney(
                                product.profitFc
                              )} FC`
                            : `${formatMoney(
                                product.profitUsd
                              )} $`
                        }
                        tone="green"
                        dense
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {/* ================== RECHERCHE ================== */}

        <section className="w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl sm:p-6">
          <div className="mb-6 flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <Search size={19} />
            </div>

            <div className="min-w-0">
              <h2 className="text-xl font-black text-white">
                Rechercher les ventes
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Filtrez par produit, par date
                ou par période.
              </p>
            </div>
          </div>

          {/* PRODUIT */}

          <div className="mb-6 min-w-0">
            <label
              htmlFor="product-search"
              className="mb-2 block text-sm font-bold text-slate-300"
            >
              Rechercher un produit
            </label>

            <div className="relative min-w-0">
              <Package
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-green-400"
              />

              <input
                id="product-search"
                type="text"
                value={productQuery}
                onChange={(e) =>
                  searchProduct(
                    e.target.value
                  )
                }
                placeholder="Ex : Savon, Riz, Huile..."
                className="block min-h-[48px] w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-[#111827] p-3 pl-10 text-[16px] text-white outline-none transition placeholder:text-slate-600 focus:border-green-400 focus:ring-1 focus:ring-green-400"
              />
            </div>
          </div>

          {/* UNE DATE */}

          <div className="mb-6 min-w-0">
            <label
              htmlFor="single-date"
              className="mb-2 block text-sm font-bold text-slate-300"
            >
              Rechercher une date
            </label>

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1 overflow-hidden">
                <CalendarDays
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-orange-400"
                />

                <input
                  id="single-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) =>
                    setSelectedDate(
                      e.target.value
                    )
                  }
                  className="block min-h-[48px] w-full min-w-0 max-w-full appearance-none rounded-xl border border-white/10 bg-[#111827] p-3 pl-10 text-[16px] text-white outline-none transition focus:border-orange-400 focus:ring-1 focus:ring-orange-400 [color-scheme:dark]"
                />
              </div>

              <button
                type="button"
                onClick={
                  filterByDate
                }
                className="inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-black text-white transition hover:bg-blue-400 active:scale-[0.98] sm:w-auto"
              >
                <Search size={17} />
                Chercher
              </button>
            </div>
          </div>

          {/* SÉPARATEUR */}

          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />

            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              ou
            </span>

            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* PÉRIODE */}

          <div className="min-w-0">
            <span className="mb-3 block text-sm font-bold text-slate-300">
              Rechercher une période
            </span>

            <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
              <div className="min-w-0">
                <label
                  htmlFor="start-date"
                  className="mb-2 block text-xs font-bold text-slate-500"
                >
                  Du
                </label>

                <div className="relative min-w-0">
                  <CalendarDays
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-purple-400"
                  />

                  <input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) =>
                      setStartDate(
                        e.target.value
                      )
                    }
                    className="block min-h-[48px] w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-[#111827] p-3 pl-10 text-[16px] text-white outline-none transition focus:border-purple-400 focus:ring-1 focus:ring-purple-400 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="end-date"
                  className="mb-2 block text-xs font-bold text-slate-500"
                >
                  Au
                </label>

                <div className="relative min-w-0">
                  <CalendarDays
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-purple-400"
                  />

                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) =>
                      setEndDate(
                        e.target.value
                      )
                    }
                    className="block min-h-[48px] w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-[#111827] p-3 pl-10 text-[16px] text-white outline-none transition focus:border-purple-400 focus:ring-1 focus:ring-purple-400 [color-scheme:dark]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={
                  filterByPeriod
                }
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-purple-500 px-5 py-3 font-black text-white transition hover:bg-purple-400 active:scale-[0.98] md:w-auto"
              >
                <CalendarDays size={17} />
                Voir la période
              </button>
            </div>
          </div>

          {/* ACTIONS */}

          <div className="mt-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={
                showEverything
              }
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400"
            >
              <ShoppingCart size={17} />
              Toutes les ventes
            </button>

            <button
              type="button"
              onClick={
                resetFilters
              }
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 px-5 py-3 font-bold text-slate-300 transition hover:bg-white/5"
            >
              <X size={17} />
              Réinitialiser
            </button>

            <button
              type="button"
              onClick={
                downloadCSV
              }
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-green-400/20 bg-green-500/10 px-5 py-3 font-black text-green-300 transition hover:bg-green-500/20"
            >
              <FileSpreadsheet size={17} />
              Excel (CSV)
            </button>

            <button
              type="button"
              onClick={
                downloadPDF
              }
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-400 px-5 py-3 font-black text-black shadow-lg shadow-orange-500/10 transition hover:brightness-110"
            >
              <Download size={17} />
              Créer le PDF
            </button>
          </div>
        </section>
                {/* ================== RÉSULTAT ================== */}

        {(selectedDate || startDate || endDate || productQuery) && (
          <section className="w-full min-w-0 overflow-hidden rounded-2xl border border-orange-400/20 bg-orange-500/10 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 shrink-0 text-orange-400">
                <Search size={18} />
              </div>

              <div className="min-w-0">
                <p className="break-words text-sm font-black text-orange-300">
                  {productQuery
                    ? `Résultat pour « ${productQuery} »`
                    : selectedDate
                    ? `Résultat pour le ${prettyDate(selectedDate)}`
                    : startDate && endDate
                    ? `Résultat du ${prettyDate(startDate)} au ${prettyDate(endDate)}`
                    : "Sélection incomplète"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {filteredSales.length} vente
                  {filteredSales.length > 1 ? "s" : ""} trouvée
                  {filteredSales.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ================== HISTORIQUE ================== */}

        <section className="w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl sm:p-6">
          <div className="mb-5 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
                <TrendingUp size={19} />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-xl font-black text-white">
                  Historique des ventes
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Consultez les ventes enregistrées.
                </p>
              </div>
            </div>

            {filteredSales.length > PAGE_STEP && (
              <button
                type="button"
                onClick={() => {
                  setShowAll(!showAll);
                  setVisibleCount(PAGE_STEP);
                }}
                className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-black transition hover:bg-orange-400 sm:w-auto"
              >
                {showAll
                  ? "Afficher seulement 5"
                  : "Voir toutes les ventes"}
              </button>
            )}
          </div>

          {/* ================== CHARGEMENT ================== */}

          {loading ? (
            <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-12 text-center">
              <Loader2
                size={26}
                className="animate-spin text-orange-400"
              />

              <p className="mt-4 text-sm font-bold text-slate-400">
                Chargement de vos ventes...
              </p>
            </div>
          ) : displayedSales.length === 0 ? (
            /* ================== AUCUN RÉSULTAT ================== */

            <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-slate-500">
                <Package size={25} />
              </div>

              <p className="mt-4 font-black text-white">
                {productQuery
                  ? "Aucun produit ne correspond à cette recherche."
                  : selectedDate
                  ? "Aucune vente à cette date."
                  : startDate && endDate
                  ? "Aucune vente dans cette période."
                  : "Aucune vente disponible."}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Essayez un autre produit, une autre date ou une autre
                période.
              </p>
            </div>
          ) : (
            <>
              {/* ================== LISTE DES VENTES ================== */}

              <div className="w-full min-w-0 space-y-3">
                {displayedSales.map((sale) => (
                  <article
                    key={sale.id}
                    className="w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-white/20 hover:bg-black/30"
                  >
                    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      
                      {/* PRODUIT */}

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                            <Package size={18} />
                          </div>

                          <div className="min-w-0">
                            <p className="break-words font-black text-white">
                              {sale.product_name}
                            </p>

                            <p className="mt-1 break-words text-xs text-slate-500">
                              {new Date(
                                sale.created_at
                              ).toLocaleString("fr-FR")}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* STATISTIQUES DE LA VENTE */}

                     <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:w-auto lg:min-w-[560px] lg:gap-5">
                        
                        {/* QUANTITÉ */}

                        <div className="min-w-0 overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] p-2.5 sm:p-3">
                          <p className="text-[11px] text-slate-500">
                            Quantité
                          </p>

                          <p className="mt-1 truncate font-black text-white">
                            x{sale.quantity}
                          </p>
                        </div>

                        {/* VENTE */}

                        <div className="min-w-0 overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] p-2.5 sm:p-3">
                          <p className="text-[11px] text-slate-500">
                            Vente
                          </p>

                          <p className="mt-1 truncate text-sm font-black text-orange-400">
                            {formatMoney(
                              Number(sale.total_sale || 0)
                            )}{" "}
                            {sale.currency}
                          </p>
                        </div>
                        
                        

                        {/* BÉNÉFICE */}

                        <div className="min-w-0 overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] p-2.5 sm:p-3">
                          <p className="text-[11px] text-slate-500">
                            Bénéfice
                          </p>

                          <p className="mt-1 truncate text-sm font-black text-green-400">
                            {formatMoney(
                              Number(sale.profit || 0)
                            )}{" "}
                            {sale.currency}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              

              {/* ================== CHARGER PLUS ================== */}

              {!showAll &&
                filteredSales.length > displayedSales.length && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount(
                        visibleCount + PAGE_STEP
                      )
                    }
                    className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 px-5 py-3 font-bold text-slate-300 transition hover:bg-white/5"
                  >
                    Charger 5 ventes de plus (
                    {filteredSales.length -
                      displayedSales.length}{" "}
                    restantes)
                  </button>
                )}
            </>
          )}
        </section>

        {/* ================== RETOUR EN HAUT ================== */}

        {showTopButton && (
          <button
            type="button"
            onClick={scrollToTop}
            className="fixed bottom-5 right-5 z-[9999] flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-black shadow-2xl transition hover:bg-orange-400 active:scale-95 sm:bottom-6 sm:right-6"
            title="Retour en haut"
            aria-label="Retour en haut"
          >
            <ArrowUp size={21} />
          </button>
        )}
      </div>
    </main>
  );
}

/* ======================================================
   COMPOSANT CARTE RAPPORT
   ====================================================== */

function ReportCard({
  icon,
  title,
  value,
  subtitle,
  extra,
  trend,
  trendLabel,
}: {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  extra?: string;
  trend?: number;
  trendLabel?: string;
}) {
  const hasTrend =
    typeof trend === "number" &&
    Number.isFinite(trend);

  const positive = (trend || 0) >= 0;

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl backdrop-blur-xl sm:p-6">
      
      <div className="flex items-start justify-between gap-3">
        
        {/* ICÔNE */}

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-2xl">
          {icon}
        </div>

        {/* VARIATION */}

        {hasTrend && (
          <span
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-black ${
              positive
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {positive ? (
              <TrendingUp size={13} />
            ) : (
              <TrendingDown size={13} />
            )}

            {Math.abs(trend as number).toFixed(0)}%{" "}
            {trendLabel}
          </span>
        )}
      </div>

      {/* TITRE */}

      <h3 className="mt-4 truncate font-black text-white">
        {title}
      </h3>

      {/* VALEUR */}

      <p className="mt-3 break-words text-base font-black leading-6 text-orange-400 sm:text-xl">
        {value}
      </p>

      {/* SOUS-TITRE */}

      <p className="mt-2 break-words text-xs leading-5 text-slate-400">
        {subtitle}
      </p>

      {/* EXTRA */}

      {extra && (
        <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {extra}
        </p>
      )}
    </div>
  );
}

/* ======================================================
   COMPOSANT MINI STATISTIQUE
   ====================================================== */

function MiniStat({
  label,
  value,
  hint,
  tone = "slate",
  dense = false,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "orange" | "green" | "blue" | "slate";
  dense?: boolean;
}) {
  const toneClass =
    tone === "orange"
      ? "text-orange-400"
      : tone === "green"
      ? "text-green-400"
      : tone === "blue"
      ? "text-blue-400"
      : "text-white";

  return (
    <div
      className={`min-w-0 overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] ${
        dense ? "p-2.5" : "p-3 sm:p-4"
      }`}
    >
      <p className="text-[11px] text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 truncate font-black ${toneClass} ${
          dense
            ? "text-sm"
            : "text-sm sm:text-base"
        }`}
      >
        {value}
      </p>

      {hint && (
        <p className="mt-1 truncate text-[10px] text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}
