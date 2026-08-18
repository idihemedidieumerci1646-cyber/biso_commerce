"use client";

/* ======================================================================
   BISO-COMMERCE — PAGE RAPPORT
   ----------------------------------------------------------------------
   Version complète professionnelle
   - Pas de Top 5 produits
   - Filtre par produit
   - Filtre par période Du / Au
   - Suppression d'une vente
   - 5 dernières ventes affichées
   - Bouton "Voir toutes les ventes"
   - PDF professionnel
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
  Wallet,
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

  return number
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
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

const isFC = (currency: string) =>
  String(currency || "").toUpperCase() === "FC";

const isUSD = (currency: string) => {
  const value = String(currency || "").toUpperCase();

  return value === "$" || value === "USD";
};

/*
  Nettoyage pour les zones qui utilisent la police standard
  Helvetica de jsPDF.
*/
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

const variation = (
  current: number,
  previous: number
) => {
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

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [productQuery, setProductQuery] = useState("");

  const [showAll, setShowAll] = useState(false);

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

      setStartDate("");
      setEndDate("");
      setProductQuery("");
      setShowAll(false);

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

  /* ==================================================
     RÉSUMÉ
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

    setFilteredSales(
      applyProductQuery(result)
    );

    setShowAll(false);
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

    if (startDate && endDate) {
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
    setNotice(null);
  };

  /* ==================================================
     TOUTES LES VENTES
  ================================================== */

  const showEverything = () => {
    const result =
      applyProductQuery(salesHistory);

    setStartDate("");
    setEndDate("");

    setFilteredSales(result);
    setShowAll(true);
    setNotice(null);
  };

  /* ==================================================
     RÉINITIALISER
  ================================================== */

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setProductQuery("");

    setFilteredSales(
      salesHistory
    );

    setShowAll(false);
    setNotice(null);
  };

  /* ==================================================
     SUPPRIMER UNE VENTE
  ================================================== */
const deleteSale = async (saleId: string) => {
  const confirmed = window.confirm(
    "Voulez-vous vraiment supprimer cette vente ? Cette action est irréversible."
  );

  if (!confirmed) return;

  try {
    const userId =
      typeof window !== "undefined"
        ? localStorage.getItem("user_id")
        : null;

    if (!userId) {
      setNotice({
        type: "error",
        message: "Utilisateur non connecté.",
      });

      return;
    }

    const { data, error } = await supabase
      .from("sales")
      .delete()
      .eq("id", saleId)
      .eq("user_id", userId)
      .select("id");

    if (error) {
      console.error(
        "Erreur suppression vente :",
        error
      );

      setNotice({
        type: "error",
        message:
          "La vente n'a pas pu être supprimée de la base de données.",
      });

      return;
    }

    if (!data || data.length === 0) {
      setNotice({
        type: "error",
        message:
          "La vente n'a pas été supprimée dans la base de données.",
      });

      return;
    }

    setSalesHistory((current) =>
      current.filter(
        (sale) => sale.id !== saleId
      )
    );

    setFilteredSales((current) =>
      current.filter(
        (sale) => sale.id !== saleId
      )
    );

    setNotice({
      type: "success",
      message:
        "Vente supprimée définitivement.",
    });

  } catch (error) {
    console.error(
      "Erreur générale suppression :",
      error
    );

    setNotice({
      type: "error",
      message:
        "Une erreur est survenue lors de la suppression.",
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
        PAGE_STEP
      );

  /* ==================================================
     LABEL PÉRIODE
  ================================================== */

  const periodLabel =
    startDate && endDate
      ? `Du ${prettyDate(
          startDate
        )} au ${prettyDate(
          endDate
        )}`
      : "Toutes les ventes";

  /* ==================================================
     DONNÉES EXPORT PDF
  ================================================== */

  const getExportData = (): Sale[] => {
    let data = salesHistory;

    if (startDate && endDate) {
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
    startDate && endDate
      ? `Rapport-BISO-COMMERCE-${startDate}-${endDate}`
      : productQuery
      ? `Rapport-BISO-COMMERCE-${productQuery
          .trim()
          .replace(
            /[^a-zA-Z0-9-_]/g,
            "-"
          )}`
      : "Rapport-BISO-COMMERCE-complet";

  /* ==================================================
     PDF PROFESSIONNEL
  ================================================== */

  const downloadPDF = () => {
    const data =
      getExportData();

    if (!data.length) {
      setNotice({
        type: "info",
        message:
          startDate && endDate
            ? `Aucune vente du ${prettyDate(
                startDate
              )} au ${prettyDate(
                endDate
              )}.`
            : productQuery
            ? `Aucune vente pour le produit « ${productQuery} ».`
            : "Aucune vente trouvée.",
      });
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      putOnlyUsedFonts: true,
      compress: true,
    });

    /* ==================================================
       PALETTE PDF
    ================================================== */

    const ORANGE: [
      number,
      number,
      number
    ] = [234, 88, 12];

    const DARK: [
      number,
      number,
      number
    ] = [15, 23, 42];

    const DARKER: [
      number,
      number,
      number
    ] = [10, 15, 28];

    const GREEN: [
      number,
      number,
      number
    ] = [22, 163, 74];

    const BLUE: [
      number,
      number,
      number
    ] = [37, 99, 235];

    const GREY: [
      number,
      number,
      number
    ] = [100, 116, 139];

    const LIGHT: [
      number,
      number,
      number
    ] = [248, 250, 252];

    const BORDER: [
      number,
      number,
      number
    ] = [226, 232, 240];

    const WHITE: [
      number,
      number,
      number
    ] = [255, 255, 255];

    /* ==================================================
       DATE GÉNÉRATION
    ================================================== */

    const generatedAt =
      new Date().toLocaleString(
        "fr-FR",
        {
          dateStyle: "long",
          timeStyle: "short",
        }
      );

    /* ==================================================
       CALCULS
    ================================================== */

    let totalFc = 0;
    let totalUsd = 0;
    let profitFc = 0;
    let profitUsd = 0;
    let totalQuantity = 0;

    data.forEach((sale) => {
      const amount = Number(
        sale.total_sale || 0
      );

      const profit = Number(
        sale.profit || 0
      );

      totalQuantity += Number(
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

    const margeFc =
      totalFc > 0
        ? (profitFc / totalFc) * 100
        : 0;

    const margeUsd =
      totalUsd > 0
        ? (profitUsd / totalUsd) * 100
        : 0;

    const periodeTexte =
      startDate && endDate
        ? `Du ${prettyDate(
            startDate
          )} au ${prettyDate(
            endDate
          )}`
        : productQuery
        ? `Produit : ${productQuery}`
        : "Toutes les ventes";

    /* ==================================================
       FONCTIONS PDF
    ================================================== */

    const addPageHeader = (
      title: string,
      subtitle?: string
    ) => {
      doc.setFillColor(
        DARKER[0],
        DARKER[1],
        DARKER[2]
      );

      doc.rect(
        0,
        0,
        210,
        28,
        "F"
      );

      doc.setTextColor(
        WHITE[0],
        WHITE[1],
        WHITE[2]
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(17);

      doc.text(
        "BISO-COMMERCE",
        15,
        12
      );

      doc.setFontSize(9);
      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.text(
        "GESTION COMMERCIALE",
        15,
        19
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(14);

      doc.text(
        cleanPDF(title),
        195,
        12,
        {
          align: "right",
        }
      );

      if (subtitle) {
        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8);

        doc.text(
          cleanPDF(subtitle),
          195,
          19,
          {
            align: "right",
          }
        );
      }
    };

    const addFooter = () => {
      const pageCount =
        doc.getNumberOfPages();

      for (
        let page = 1;
        page <= pageCount;
        page++
      ) {
        doc.setPage(page);

        const height =
          doc.internal.pageSize
            .height;

        doc.setDrawColor(
          BORDER[0],
          BORDER[1],
          BORDER[2]
        );

        doc.line(
          15,
          height - 15,
          195,
          height - 15
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(7);

        doc.setTextColor(
          GREY[0],
          GREY[1],
          GREY[2]
        );

        doc.text(
          "https://bisocommerce.vercel.app ",
          15,
          height - 9
        );

        doc.text(
          `Page ${page} / ${pageCount}`,
          195,
          height - 9,
          {
            align: "right",
          }
        );
      }
    };

    const addSectionTitle = (
      title: string,
      y: number
    ) => {
      doc.setFillColor(
        ORANGE[0],
        ORANGE[1],
        ORANGE[2]
      );

      doc.roundedRect(
        15,
        y - 5,
        3,
        9,
        1,
        1,
        "F"
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(13);

      doc.setTextColor(
        DARK[0],
        DARK[1],
        DARK[2]
      );

      doc.text(
        cleanPDF(title),
        22,
        y + 2
      );
    };

    /* ==================================================
       PAGE 1 — COUVERTURE / RÉSUMÉ
    ================================================== */

    doc.setFillColor(
      DARKER[0],
      DARKER[1],
      DARKER[2]
    );

    doc.rect(
      0,
      0,
      210,
      42,
      "F"
    );

    doc.setTextColor(
      WHITE[0],
      WHITE[1],
      WHITE[2]
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(25);

    doc.text(
      "BISO-COMMERCE",
      20,
      19
    );

    doc.setFontSize(10);

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      "RAPPORT COMMERCIAL",
      20,
      27
    );

    doc.setFontSize(8);

    doc.text(
      cleanPDF(
        `Genere le ${generatedAt}`
      ),
      20,
      34
    );

    doc.setFillColor(
      ORANGE[0],
      ORANGE[1],
      ORANGE[2]
    );

    doc.roundedRect(
      145,
      12,
      45,
      18,
      4,
      4,
      "F"
    );

    doc.setTextColor(
      WHITE[0],
      WHITE[1],
      WHITE[2]
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(9);

    doc.text(
      cleanPDF(periodeTexte),
      167.5,
      23,
      {
        align: "center",
        maxWidth: 38,
      }
    );

    /* ---------- INTRO ---------- */

    doc.setTextColor(
      DARK[0],
      DARK[1],
      DARK[2]
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(16);

    doc.text(
      "Synthese financiere",
      15,
      57
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.setTextColor(
      GREY[0],
      GREY[1],
      GREY[2]
    );

    doc.text(
      cleanPDF(
        "Vue generale de l'activite commerciale pour la periode selectionnee."
      ),
      15,
      64
    );

    /* ==================================================
       CARTES FINANCIÈRES
    ================================================== */

    const cards = [
      {
        x: 15,
        title: "VENTES FC",
        value: `${formatMoney(
          totalFc
        )} FC`,
        color: ORANGE,
      },
      {
        x: 108,
        title: "VENTES USD",
        value: `${formatMoney(
          totalUsd
        )} $`,
        color: BLUE,
      },
      {
        x: 15,
        y: 95,
        title: "BENEFICE FC",
        value: `${formatMoney(
          profitFc
        )} FC`,
        color: GREEN,
      },
      {
        x: 108,
        y: 95,
        title: "BENEFICE USD",
        value: `${formatMoney(
          profitUsd
        )} $`,
        color: GREEN,
      },
    ];

    cards.forEach(
      (card, index) => {
        const y =
          card.y ||
          (index < 2 ? 72 : 95);

        doc.setFillColor(
          LIGHT[0],
          LIGHT[1],
          LIGHT[2]
        );

        doc.setDrawColor(
          BORDER[0],
          BORDER[1],
          BORDER[2]
        );

        doc.roundedRect(
          card.x,
          y,
          87,
          18,
          3,
          3,
          "FD"
        );

        doc.setFillColor(
          card.color[0],
          card.color[1],
          card.color[2]
        );

        doc.roundedRect(
          card.x,
          y,
          3,
          18,
          1.5,
          1.5,
          "F"
        );

        doc.setTextColor(
          GREY[0],
          GREY[1],
          GREY[2]
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(7);

        doc.text(
          card.title,
          card.x + 8,
          y + 6
        );

        doc.setTextColor(
          DARK[0],
          DARK[1],
          DARK[2]
        );

        doc.setFontSize(11);

        doc.text(
          cleanPDF(card.value),
          card.x + 8,
          y + 13
        );
      }
    );

    /* ==================================================
       INDICATEURS
    ================================================== */

    addSectionTitle(
      "Indicateurs principaux",
      127
    );

    autoTable(doc, {
      startY: 135,

      head: [
        [
          "Indicateur",
          "Valeur",
          "Indication",
        ],
      ],

      body: [
        [
          "Nombre de ventes",
          String(data.length),
          "Transactions",
        ],
        [
          "Quantite vendue",
          String(totalQuantity),
          "Articles",
        ],
        [
          "Panier moyen FC",
          `${formatMoney(
            data.length
              ? totalFc / data.length
              : 0
          )} FC`,
          "Moyenne",
        ],
        [
          "Panier moyen USD",
          `${formatMoney(
            data.length
              ? totalUsd / data.length
              : 0
          )} $`,
          "Moyenne",
        ],
        [
          "Marge FC",
          `${margeFc.toFixed(
            1
          )} %`,
          "Rentabilite",
        ],
        [
          "Marge USD",
          `${margeUsd.toFixed(
            1
          )} %`,
          "Rentabilite",
        ],
      ],

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 4,
        textColor: DARK,
        lineColor: BORDER,
        lineWidth: 0.2,
      },

      headStyles: {
        fillColor: DARK,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 8,
      },

      alternateRowStyles: {
        fillColor: LIGHT,
      },

      margin: {
        left: 15,
        right: 15,
      },
    });

    /* ==================================================
       PAGE 2 — SUIVI JOURNALIER
    ================================================== */

    doc.addPage();

    addPageHeader(
      "Suivi journalier",
      periodeTexte
    );

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

    const dayRows =
      Object.keys(perDay)
        .sort((a, b) =>
          a < b ? 1 : -1
        )
        .map((day) => [
          prettyDate(day),
          String(
            perDay[day].quantity
          ),
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

    addSectionTitle(
      "Performance par jour",
      40
    );

    if (dayRows.length > 0) {
      autoTable(doc, {
        startY: 48,

        head: [
          [
            "Date",
            "Qte",
            "Ventes FC",
            "Ventes USD",
            "Benefice FC",
            "Benefice USD",
          ],
        ],

        body: dayRows,

        theme: "grid",

        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 3.5,
          textColor: DARK,
          lineColor: BORDER,
          lineWidth: 0.2,
        },

        headStyles: {
          fillColor: ORANGE,
          fontStyle: "bold",
          textColor: WHITE,
          fontSize: 8,
        },

        alternateRowStyles: {
          fillColor: LIGHT,
        },

        columnStyles: {
          0: {
            cellWidth: 27,
          },
          1: {
            halign: "center",
            cellWidth: 18,
          },
          2: {
            halign: "right",
          },
          3: {
            halign: "right",
          },
          4: {
            halign: "right",
          },
          5: {
            halign: "right",
          },
        },

        margin: {
          left: 12,
          right: 12,
        },
      });
    } else {
      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(10);

      doc.setTextColor(
        GREY[0],
        GREY[1],
        GREY[2]
      );

      doc.text(
        "Aucune donnee disponible pour cette periode.",
        15,
        52
      );
    }

    /* ==================================================
       PAGE 3 — DÉTAIL DES VENTES
    ================================================== */

    doc.addPage();

    addPageHeader(
      "Detail des ventes",
      `${data.length} transaction${
        data.length > 1 ? "s" : ""
      }`
    );

    addSectionTitle(
      "Liste des transactions",
      40
    );

    const salesRows = data.map(
      (sale) => {
        const saleDate =
          new Date(
            sale.created_at
          ).toLocaleDateString(
            "fr-FR"
          );

        return [
          saleDate,
          cleanPDF(
            sale.product_name ||
              "Produit inconnu"
          ),
          `x${Number(
            sale.quantity || 0
          )}`,
          `${formatMoney(
            Number(
              sale.total_sale || 0
            )
          )} ${cleanPDF(
            sale.currency || ""
          )}`,
          `${formatMoney(
            Number(
              sale.profit || 0
            )
          )} ${cleanPDF(
            sale.currency || ""
          )}`,
        ];
      }
    );

    if (salesRows.length > 0) {
      autoTable(doc, {
        startY: 48,

        head: [
          [
            "Date",
            "Produit",
            "Qte",
            "Vente",
            "Benefice",
          ],
        ],

        body: salesRows,

        theme: "grid",

        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 3,
          textColor: DARK,
          lineColor: BORDER,
          lineWidth: 0.2,
          overflow: "linebreak",
        },

        headStyles: {
          fillColor: DARK,
          textColor: WHITE,
          fontStyle: "bold",
          fontSize: 8,
        },

        alternateRowStyles: {
          fillColor: LIGHT,
        },

        columnStyles: {
          0: {
            cellWidth: 24,
          },
          1: {
            cellWidth: 68,
          },
          2: {
            cellWidth: 16,
            halign: "center",
          },
          3: {
            halign: "right",
          },
          4: {
            halign: "right",
          },
        },

        margin: {
          left: 12,
          right: 12,
        },
      });
    } else {
      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(10);

      doc.setTextColor(
        GREY[0],
        GREY[1],
        GREY[2]
      );

      doc.text(
        "Aucune vente a afficher.",
        15,
        52
      );
    }

    /* ==================================================
       PAGE 4 — ANALYSE COMMERCIALE
    ================================================== */

    doc.addPage();

    addPageHeader(
      "Analyse commerciale",
      periodeTexte
    );

    addSectionTitle(
      "Analyse de l'activite",
      42
    );

    const analyseRows = [
      [
        "Quantite totale vendue",
        String(totalQuantity),
        "articles",
      ],
      [
        "Nombre total de ventes",
        String(data.length),
        "transactions",
      ],
      [
        "Total ventes FC",
        `${formatMoney(
          totalFc
        )} FC`,
        "chiffre d'affaires",
      ],
      [
        "Total ventes USD",
        `${formatMoney(
          totalUsd
        )} $`,
        "chiffre d'affaires",
      ],
      [
        "Benefice total FC",
        `${formatMoney(
          profitFc
        )} FC`,
        "benefice",
      ],
      [
        "Benefice total USD",
        `${formatMoney(
          profitUsd
        )} $`,
        "benefice",
      ],
      [
        "Marge FC",
        `${margeFc.toFixed(
          1
        )} %`,
        "rentabilite",
      ],
      [
        "Marge USD",
        `${margeUsd.toFixed(
          1
        )} %`,
        "rentabilite",
      ],
    ];

    autoTable(doc, {
      startY: 50,

      head: [
        [
          "Indicateur",
          "Resultat",
          "Type",
        ],
      ],

      body: analyseRows,

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 4.5,
        textColor: DARK,
        lineColor: BORDER,
        lineWidth: 0.2,
      },

      headStyles: {
        fillColor: ORANGE,
        textColor: WHITE,
        fontStyle: "bold",
      },

      alternateRowStyles: {
        fillColor: LIGHT,
      },

      columnStyles: {
        1: {
          fontStyle: "bold",
          halign: "right",
        },
        2: {
          textColor: GREY,
        },
      },

      margin: {
        left: 15,
        right: 15,
      },
    });

    /* ==================================================
       BLOC INTERPRÉTATION
    ================================================== */

    const interpretationY =
      (doc as any).lastAutoTable?.finalY
        ? (doc as any).lastAutoTable
            .finalY + 15
        : 155;

    addSectionTitle(
      "Lecture du rapport",
      interpretationY
    );

    const observations: string[] = [];

    if (data.length === 0) {
      observations.push(
        "Aucune vente n'a ete enregistree pour la selection actuelle."
      );
    } else {
      observations.push(
        `L'activite comprend ${data.length} transaction${
          data.length > 1 ? "s" : ""
        } pour une quantite totale de ${totalQuantity} article${
          totalQuantity > 1 ? "s" : ""
        }.`
      );

      if (totalFc > 0) {
        observations.push(
          `Le chiffre d'affaires en FC s'eleve a ${formatMoney(
            totalFc
          )} FC, avec un benefice de ${formatMoney(
            profitFc
          )} FC.`
        );
      }

      if (totalUsd > 0) {
        observations.push(
          `Le chiffre d'affaires en USD s'eleve a ${formatMoney(
            totalUsd
          )} $, avec un benefice de ${formatMoney(
            profitUsd
          )} $.`
        );
      }

      if (
        totalFc > 0 &&
        totalUsd > 0
      ) {
        observations.push(
          `Les marges calculees sont de ${margeFc.toFixed(
            1
          )} % en FC et ${margeUsd.toFixed(
            1
          )} % en USD.`
        );
      }
    }

    let observationY =
      interpretationY + 12;

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.setTextColor(
      DARK[0],
      DARK[1],
      DARK[2]
    );

    observations.forEach(
      (text) => {
        const lines =
          doc.splitTextToSize(
            cleanPDF(text),
            170
          );

        doc.text(
          lines,
          20,
          observationY
        );

        observationY +=
          lines.length * 5 + 5;
      }
    );

    /* ==================================================
       SIGNATURE / IDENTIFICATION
    ================================================== */

    const signatureY = Math.min(
      observationY + 8,
      255
    );

    doc.setDrawColor(
      BORDER[0],
      BORDER[1],
      BORDER[2]
    );

    doc.line(
      20,
      signatureY,
      190,
      signatureY
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(8);

    doc.setTextColor(
      DARK[0],
      DARK[1],
      DARK[2]
    );

    doc.text(
      "BISO-COMMERCE",
      20,
      signatureY + 8
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setTextColor(
      GREY[0],
      GREY[1],
      GREY[2]
    );

    doc.text(
      "Rapport genere automatiquement par la plateforme.",
      20,
      signatureY + 14
    );

    /* ==================================================
       PIED DE PAGE SUR TOUTES LES PAGES
    ================================================== */

    addFooter();

    /* ==================================================
       SAUVEGARDE
    ================================================== */

    doc.save(
      `${exportFileBase}.pdf`
    );
  };

  /* ======================================================
     JSX
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
                  setShowGuide(!showGuide)
                }
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-orange-400/20 bg-orange-500/10 px-4 py-3 text-sm font-black text-orange-300 transition hover:bg-orange-500/20 sm:flex-none"
              >
                <Sparkles size={17} />
                Guide
              </button>

            </div>

          </div>

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

          </div>

          {showGuide && (
            <div className="mt-5 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4">

              <div className="space-y-3 text-sm leading-6 text-slate-300">

                <p>
                  Tapez le nom d'un produit
                  pour retrouver toutes ses
                  ventes.
                </p>

                <p>
                  Utilisez « Du » et « Au »
                  pour rechercher les ventes
                  d'une période.
                </p>

                <p>
                  « Créer le PDF » génère un
                  rapport avec
                  résumé, suivi journalier,
                  détail des ventes et analyse.
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
            icon="📊"
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
            icon="📆"
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
                Filtrez par produit ou par période.
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

          <div className="mt-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">

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

        {(startDate ||
          endDate ||
          productQuery) && (
          <section className="w-full min-w-0 overflow-hidden rounded-2xl border border-orange-400/20 bg-orange-500/10 p-4">

            <div className="flex min-w-0 items-start gap-3">

              <div className="mt-0.5 shrink-0 text-orange-400">
                <Search size={18} />
              </div>

              <div className="min-w-0">

                <p className="break-words text-sm font-black text-orange-300">

                  {productQuery
                    ? `Résultat pour « ${productQuery} »`
                    : startDate &&
                      endDate
                    ? `Résultat du ${prettyDate(
                        startDate
                      )} au ${prettyDate(
                        endDate
                      )}`
                    : "Sélection incomplète"}

                </p>

                <p className="mt-1 text-xs text-slate-400">

                  {filteredSales.length} vente
                  {filteredSales.length >
                  1
                    ? "s"
                    : ""} trouvée
                  {filteredSales.length >
                  1
                    ? "s"
                    : ""}

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
                  Les 5 dernières ventes sont affichées.
                </p>

              </div>

            </div>

          </div>

          {/* CHARGEMENT */}

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

            <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-10 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-slate-500">
                <Package size={25} />
              </div>

              <p className="mt-4 font-black text-white">

                {productQuery
                  ? "Aucun produit ne correspond à cette recherche."
                  : startDate &&
                    endDate
                  ? "Aucune vente dans cette période."
                  : "Aucune vente disponible."}

              </p>

              <p className="mt-2 text-xs text-slate-500">
                Essayez un autre produit ou une autre période.
              </p>

            </div>

          ) : (

            <>

              <div className="w-full min-w-0 space-y-3">

                {displayedSales.map(
                  (sale) => (

                    <article
                      key={sale.id}
                      className="w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-3 transition hover:border-white/20 hover:bg-black/30 sm:p-4"
                    >

                      <div className="flex min-w-0 flex-col gap-4">

                        <div className="flex min-w-0 items-start justify-between gap-3">

                          <div className="flex min-w-0 items-center gap-3">

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
                                ).toLocaleString(
                                  "fr-FR"
                                )}
                              </p>

                            </div>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              deleteSale(
                                sale.id
                              )
                            }
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-400/20 bg-red-500/10 text-red-400 transition hover:bg-red-500/20 hover:text-red-300 active:scale-95"
                            title="Supprimer cette vente"
                            aria-label="Supprimer cette vente"
                          >
                            <Trash2
                              size={16}
                            />
                          </button>

                        </div>

                        <div className="grid w-full min-w-0 grid-cols-3 gap-3 sm:gap-4">

                          <div className="min-w-0 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3 sm:px-4 sm:py-3.5">

                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-[11px]">
                              Quantité
                            </p>

                            <p className="mt-1.5 truncate text-sm font-black text-white sm:text-base">
                              x{sale.quantity}
                            </p>

                          </div>

                          <div className="min-w-0 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3 sm:px-4 sm:py-3.5">

                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-[11px]">
                              Vente
                            </p>

                            <p className="mt-1.5 truncate text-sm font-black text-orange-400 sm:text-base">
                              {formatMoney(
                                Number(
                                  sale.total_sale ||
                                    0
                                )
                              )}{" "}
                              {sale.currency}
                            </p>

                          </div>

                          <div className="min-w-0 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3 sm:px-4 sm:py-3.5">

                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-[11px]">
                              Bénéfice
                            </p>

                            <p className="mt-1.5 truncate text-sm font-black text-green-400 sm:text-base">
                              {formatMoney(
                                Number(
                                  sale.profit ||
                                    0
                                )
                              )}{" "}
                              {sale.currency}
                            </p>

                          </div>

                        </div>

                      </div>

                    </article>

                  )
                )}

              </div>

              {filteredSales.length >
                PAGE_STEP && (
                <div className="mt-6 border-t border-white/10 pt-5">

                  <button
                    type="button"
                    onClick={() => {
                      if (showAll) {
                        setShowAll(false);
                      } else {
                        showEverything();
                      }
                    }}
                    className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-black text-black shadow-lg shadow-orange-500/10 transition hover:bg-orange-400 active:scale-[0.98]"
                  >

                    <ShoppingCart
                      size={17}
                    />

                    {showAll
                      ? "Afficher seulement les 5 dernières ventes"
                      : `Voir toutes les ventes (${filteredSales.length})`}

                  </button>

                </div>
              )}

            </>

          )}

        </section>

        {/* ================== RETOUR EN HAUT ================== */}

        {showTopButton && (
          <button
            type="button"
            onClick={
              scrollToTop
            }
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

  const positive =
    (trend || 0) >= 0;

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl backdrop-blur-xl sm:p-6">

      <div className="flex items-start justify-between gap-3">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-2xl">
          {icon}
        </div>

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

            {Math.abs(
              trend as number
            ).toFixed(0)}
            % {trendLabel}

          </span>
        )}

      </div>

      <h3 className="mt-4 truncate font-black text-white">
        {title}
      </h3>

      <p className="mt-3 break-words text-base font-black leading-6 text-orange-400 sm:text-xl">
        {value}
      </p>

      <p className="mt-2 break-words text-xs leading-5 text-slate-400">
        {subtitle}
      </p>

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
        dense
          ? "p-2.5"
          : "p-3 sm:p-4"
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