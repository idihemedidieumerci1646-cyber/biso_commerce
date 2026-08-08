"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  Download,
  Search,
  Sparkles,
  ArrowUp,
  CalendarDays,
  X,
  BarChart3,
  TrendingUp,
  Package,
  ShoppingCart,
} from "lucide-react";

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

export default function ReportsPage() {
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [showAll, setShowAll] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showTopButton, setShowTopButton] = useState(false);

  const [today, setToday] = useState<DayReport>({
    fc: 0,
    usd: 0,
    profitFc: 0,
    profitUsd: 0,
    quantity: 0,
  });

  const [yesterday, setYesterday] = useState<DayReport>({
    fc: 0,
    usd: 0,
    profitFc: 0,
    profitUsd: 0,
    quantity: 0,
  });

  const [beforeYesterday, setBeforeYesterday] =
    useState<DayReport>({
      fc: 0,
      usd: 0,
      profitFc: 0,
      profitUsd: 0,
      quantity: 0,
    });

  const [bestProduct, setBestProduct] =
    useState("Aucun");

  // ======================================================
  // CHARGEMENT INITIAL
  // ======================================================

  useEffect(() => {
    loadReports();
  }, []);

  // ======================================================
  // BOUTON RETOUR EN HAUT
  // ======================================================

  useEffect(() => {
    const handleScroll = () => {
      setShowTopButton(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

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

  // ======================================================
  // FORMAT ARGENT
  // ======================================================

  const formatMoney = (value: number) => {
  const number = Math.round(Number(value || 0));

  return number
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

  // ======================================================
  // FORMAT DATE
  // ======================================================

  const getLocalDate = (date: Date) => {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // ======================================================
  // NETTOYAGE PDF
  // ======================================================

  const cleanPDF = (text: string) => {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

  // ======================================================
  // CALCUL D'UNE JOURNÉE
  // ======================================================

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
      const saleDate =
        sale.created_at.split("T")[0];

      if (saleDate !== targetDate) {
        return;
      }

      const amount = Number(
        sale.total_sale || 0
      );

      const profit = Number(
        sale.profit || 0
      );

      quantity += Number(
        sale.quantity || 0
      );

      if (sale.currency === "FC") {
        fc += amount;
        profitFc += profit;
      } else if (
        sale.currency === "$" ||
        sale.currency === "USD"
      ) {
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

  // ======================================================
  // CHARGEMENT DES VENTES
  // ======================================================

  const loadReports = async () => {
    try {
      const userId =
        localStorage.getItem("user_id");

      if (!userId) {
        console.log(
          "Utilisateur non connecté."
        );
        return;
      }

      const { data, error } =
        await supabase
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
        return;
      }

      const list =
        (data || []) as Sale[];

      setSalesHistory(list);
      setFilteredSales(list);

      // ==================================================
      // CALCUL DES DATES
      // ==================================================

      const now = new Date();

      const todayDate =
        getLocalDate(now);

      const yesterdayDate =
        new Date(now);

      yesterdayDate.setDate(
        yesterdayDate.getDate() - 1
      );

      const yesterdayString =
        getLocalDate(
          yesterdayDate
        );

      const beforeYesterdayDate =
        new Date(now);

      beforeYesterdayDate.setDate(
        beforeYesterdayDate.getDate() - 2
      );

      const beforeYesterdayString =
        getLocalDate(
          beforeYesterdayDate
        );

      // ==================================================
      // RAPPORTS JOURNALIERS
      // ==================================================

      setToday(
        calculateDayReport(
          list,
          todayDate
        )
      );

      setYesterday(
        calculateDayReport(
          list,
          yesterdayString
        )
      );

      setBeforeYesterday(
        calculateDayReport(
          list,
          beforeYesterdayString
        )
      );

      // ==================================================
      // PRODUIT LE PLUS VENDU
      // ==================================================

      const products: Record<
        string,
        number
      > = {};

      list.forEach((sale) => {
        const name =
          sale.product_name?.trim();

        if (!name) {
          return;
        }

        if (!products[name]) {
          products[name] = 0;
        }

        products[name] += Number(
          sale.quantity || 0
        );
      });

      let best = "Aucun";
      let max = 0;

      Object.keys(products).forEach(
        (name) => {
          if (products[name] > max) {
            max = products[name];
            best = name;
          }
        }
      );

      setBestProduct(best);
    } catch (error) {
      console.error(
        "Erreur générale :",
        error
      );
    }
  };

  // ======================================================
  // RECHERCHE D'UNE DATE
  // ======================================================

  const filterByDate = () => {
    if (!selectedDate) {
      alert("Choisissez une date.");
      return;
    }

    const result =
      salesHistory.filter((sale) => {
        return (
          sale.created_at.split("T")[0] ===
          selectedDate
        );
      });

    setFilteredSales(result);
    setShowAll(false);
  };

  // ======================================================
  // RECHERCHE ENTRE DEUX DATES
  // ======================================================

  const filterByPeriod = () => {
    if (!startDate || !endDate) {
      alert(
        "Choisissez la date de début et la date de fin."
      );
      return;
    }

    if (startDate > endDate) {
      alert(
        "La date de début doit être avant la date de fin."
      );
      return;
    }

    const result =
      salesHistory.filter((sale) => {
        const saleDate =
          sale.created_at.split("T")[0];

        return (
          saleDate >= startDate &&
          saleDate <= endDate
        );
      });

    setFilteredSales(result);
    setShowAll(false);
  };

  // ======================================================
  // AFFICHER TOUTES LES VENTES
  // ======================================================

  const showEverything = () => {
    setFilteredSales(salesHistory);
    setShowAll(true);
  };

  // ======================================================
  // RÉINITIALISER
  // ======================================================

  const resetFilters = () => {
    setSelectedDate("");
    setStartDate("");
    setEndDate("");

    setFilteredSales(salesHistory);
    setShowAll(false);
  };

  // ======================================================
  // VENTES AFFICHÉES
  // ======================================================

  const displayedSales = showAll
    ? filteredSales
    : filteredSales.slice(0, 5);

  // ======================================================
  // CRÉATION DU PDF
  // ======================================================

  const downloadPDF = () => {
    let data: Sale[] = [];

    // --------------------------------------------------
    // VENTE D'UNE SEULE DATE
    // --------------------------------------------------

    if (selectedDate) {
      data = salesHistory.filter(
        (sale) =>
          sale.created_at.split("T")[0] ===
          selectedDate
      );
    }

    // --------------------------------------------------
    // VENTES D'UNE PÉRIODE
    // --------------------------------------------------

    else if (startDate && endDate) {
      data = salesHistory.filter((sale) => {
        const saleDate =
          sale.created_at.split("T")[0];

        return (
          saleDate >= startDate &&
          saleDate <= endDate
        );
      });
    }

    // --------------------------------------------------
    // TOUTES LES VENTES
    // --------------------------------------------------

    else {
      data = salesHistory;
    }

    // --------------------------------------------------
    // AUCUNE VENTE
    // --------------------------------------------------

    if (data.length === 0) {
      if (selectedDate) {
        alert(
          `Aucune vente à la date ${selectedDate}.`
        );
      } else if (startDate && endDate) {
        alert(
          `Aucune vente du ${startDate} au ${endDate}.`
        );
      } else {
        alert("Aucune vente trouvée.");
      }

      return;
    }

    // ==================================================
    // DOCUMENT PDF
    // ==================================================

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      putOnlyUsedFonts: true,
      compress: true,
    });

    doc.setFont("helvetica", "normal");

    // ==================================================
    // CALCULS
    // ==================================================

    let totalFc = 0;
    let totalUsd = 0;

    let profitFc = 0;
    let profitUsd = 0;

    let totalQuantity = 0;

    const produits: Record<
      string,
      {
        quantity: number;
        montantFc: number;
        montantUsd: number;
        profitFc: number;
        profitUsd: number;
      }
    > = {};

    data.forEach((sale) => {
      const montant = Number(
        sale.total_sale || 0
      );

      const benefice = Number(
        sale.profit || 0
      );

      const quantity = Number(
        sale.quantity || 0
      );

      totalQuantity += quantity;

      const isFC =
        sale.currency === "FC";

      const isUSD =
        sale.currency === "$" ||
        sale.currency === "USD";

      if (isFC) {
        totalFc += montant;
        profitFc += benefice;
      }

      if (isUSD) {
        totalUsd += montant;
        profitUsd += benefice;
      }

      const productName =
        sale.product_name?.trim() ||
        "Produit inconnu";

      if (!produits[productName]) {
        produits[productName] = {
          quantity: 0,
          montantFc: 0,
          montantUsd: 0,
          profitFc: 0,
          profitUsd: 0,
        };
      }

      produits[productName].quantity +=
        quantity;

      if (isFC) {
        produits[productName].montantFc +=
          montant;

        produits[productName].profitFc +=
          benefice;
      }

      if (isUSD) {
        produits[productName].montantUsd +=
          montant;

        produits[productName].profitUsd +=
          benefice;
      }
    });

    // ==================================================
    // PRODUIT LE PLUS VENDU SELON LA SÉLECTION
    // ==================================================

    let meilleurProduit = "Aucun";
    let maxQuantite = 0;

    Object.keys(produits).forEach(
      (name) => {
        if (
          produits[name].quantity >
          maxQuantite
        ) {
          maxQuantite =
            produits[name].quantity;

          meilleurProduit = name;
        }
      }
    );

    // ==================================================
    // PÉRIODE DU RAPPORT
    // ==================================================

    let periodeTexte =
      "Toutes les ventes";

    if (selectedDate) {
      periodeTexte =
        `Date : ${selectedDate}`;
    } else if (
      startDate &&
      endDate
    ) {
      periodeTexte =
        `Du ${startDate} au ${endDate}`;
    }

    // ==================================================
    // DATE DE CRÉATION
    // ==================================================

    const dateCreation =
      new Date().toLocaleString(
        "fr-FR"
      );

    // ==================================================
    // PAGE DE GARDE
    // ==================================================

    doc.setFont("helvetica", "bold");
    doc.setFontSize(25);

    doc.text(
      "BISO-COMMERCE",
      20,
      35
    );

    doc.setFontSize(18);

    doc.text(
      "Rapport des ventes",
      20,
      49
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    doc.text(
      cleanPDF(
        "Analyse professionnelle de l'activite commerciale"
      ),
      20,
      61
    );

    doc.setDrawColor(
      220,
      220,
      220
    );

    doc.line(
      20,
      70,
      190,
      70
    );

    // --------------------------------------------------
    // INFORMATIONS DU RAPPORT
    // --------------------------------------------------

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(12);

    doc.text(
      "Periode du rapport",
      20,
      90
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      cleanPDF(periodeTexte),
      20,
      99
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.text(
      "Date de generation",
      20,
      116
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      cleanPDF(dateCreation),
      20,
      125
    );

    // --------------------------------------------------
    // RÉSUMÉ
    // --------------------------------------------------

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(12);

    doc.text(
      "Resume",
      20,
      145
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(11);

    doc.text(
      cleanPDF(
        `Nombre de ventes : ${data.length}`
      ),
      20,
      155
    );

    doc.text(
      cleanPDF(
        `Quantite vendue : ${totalQuantity}`
      ),
      20,
      164
    );

    doc.text(
      cleanPDF(
        `Produit le plus vendu : ${meilleurProduit}`
      ),
      20,
      173
    );

    // ==================================================
    // RÉSUMÉ FINANCIER
    // ==================================================

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
      startY: 45,

      head: [
        [
          "Categorie",
          "Montant",
        ],
      ],

      body: [
        [
          "Ventes FC",
          `${formatMoney(totalFc)} FC`,
        ],
        [
          "Ventes USD",
          `${formatMoney(totalUsd)} $`,
        ],
        [
          "Benefice FC",
          `${formatMoney(profitFc)} FC`,
        ],
        [
          "Benefice USD",
          `${formatMoney(profitUsd)} $`,
        ],
      ],

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 11,
        cellPadding: 5,
        textColor: [35, 35, 35],
      },

      headStyles: {
        fontStyle: "bold",
        textColor: [255, 255, 255],
      },

      alternateRowStyles: {
        fillColor: [248, 248, 248],
      },

      margin: {
        left: 20,
        right: 20,
      },
    });

    // ==================================================
    // DÉTAIL DES PRODUITS
    // ==================================================

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

    const rows = Object.keys(
      produits
    ).map((name) => {
      const product =
        produits[name];

      let ventes = "";
      let benefice = "";

      if (product.montantFc > 0) {
        ventes +=
          `${formatMoney(
            product.montantFc
          )} FC`;

        benefice +=
          `${formatMoney(
            product.profitFc
          )} FC`;
      }

      if (product.montantUsd > 0) {
        if (ventes) {
          ventes += " / ";
        }

        if (benefice) {
          benefice += " / ";
        }

        ventes +=
          `${formatMoney(
            product.montantUsd
          )} $`;

        benefice +=
          `${formatMoney(
            product.profitUsd
          )} $`;
      }

      return [
        cleanPDF(name),
        product.quantity,
        ventes || "0",
        benefice || "0",
      ];
    });

    autoTable(doc, {
      startY: 45,

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
        textColor: [35, 35, 35],
      },

      headStyles: {
        fontStyle: "bold",
        textColor: [255, 255, 255],
      },

      alternateRowStyles: {
        fillColor: [248, 248, 248],
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

    // ==================================================
    // ANALYSE COMMERCIALE
    // ==================================================

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

    doc.text(
      cleanPDF(
        `Produit le plus vendu : ${meilleurProduit}`
      ),
      20,
      55
    );

    doc.text(
      cleanPDF(
        `Quantite totale vendue : ${totalQuantity}`
      ),
      20,
      68
    );

    doc.text(
      cleanPDF(
        `Nombre total de ventes : ${data.length}`
      ),
      20,
      81
    );

    doc.text(
      `Total ventes FC : ${formatMoney(
        totalFc
      )} FC`,
      20,
      98
    );

    doc.text(
      `Total ventes USD : ${formatMoney(
        totalUsd
      )} $`,
      20,
      111
    );

    doc.text(
      `Benefice total FC : ${formatMoney(
        profitFc
      )} FC`,
      20,
      124
    );

    doc.text(
      `Benefice total USD : ${formatMoney(
        profitUsd
      )} $`,
      20,
      137
    );

    // --------------------------------------------------
    // CONCLUSION
    // --------------------------------------------------

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(13);

    doc.text(
      "Conclusion",
      20,
      160
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(10);

    const conclusion =
      "Ce rapport permet au responsable du commerce " +
      "de suivre les ventes, les quantites vendues " +
      "et les benefices generes pendant la periode choisie.";

    const conclusionLines =
      doc.splitTextToSize(
        cleanPDF(conclusion),
        170
      );

    doc.text(
      conclusionLines,
      20,
      171
    );

    // ==================================================
    // PIED DE PAGE
    // ==================================================

    const totalPages =
      doc.getNumberOfPages();

    for (
      let page = 1;
      page <= totalPages;
      page++
    ) {
      doc.setPage(page);

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(8);

      doc.setTextColor(
        120,
        120,
        120
      );

      doc.text(
        "BISO-COMMERCE",
        20,
        287
      );

      doc.text(
        `Page ${page} / ${totalPages}`,
        165,
        287
      );
    }

    // ==================================================
    // TÉLÉCHARGEMENT
    // ==================================================

    const fileName =
      selectedDate
        ? `Rapport-BISO-COMMERCE-${selectedDate}.pdf`
        : startDate && endDate
        ? `Rapport-BISO-COMMERCE-${startDate}-${endDate}.pdf`
        : "Rapport-BISO-COMMERCE-complet.pdf";

    doc.save(fileName);
  };

  // ======================================================
  // JSX
  // ======================================================

  return (
    <main className="min-h-screen space-y-6 pb-24">
      {/* ==================================================
          HEADER
      ================================================== */}

      <section
        className="
          rounded-3xl
          border border-white/10
          bg-white/[0.04]
          p-5
          shadow-xl
          backdrop-blur-xl
          sm:p-6
        "
      >
        <div
          className="
            flex
            flex-col
            gap-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-orange-500/10
                  text-orange-400
                "
              >
                <BarChart3 size={24} />
              </div>

              <div>
                <h1
                  className="
                    text-2xl
                    font-black
                    tracking-tight
                    text-white
                    sm:text-3xl
                  "
                >
                  Rapport
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  Analyse complète de votre activité commerciale
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowGuide(!showGuide)
            }
            className="
              inline-flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-orange-400/20
              bg-orange-500/10
              px-4
              py-3
              text-sm
              font-black
              text-orange-300
              transition
              hover:bg-orange-500/20
              sm:w-auto
            "
          >
            <Sparkles size={17} />
            Guide
          </button>
        </div>

        {showGuide && (
          <div
            className="
              mt-5
              rounded-2xl
              border
              border-white/10
              bg-black/20
              p-4
            "
          >
            <div className="space-y-3 text-sm leading-6 text-slate-300">
              <p>
                <span className="mr-2">📅</span>
                Choisissez une date pour afficher
                uniquement les ventes de cette journée.
              </p>

              <p>
                <span className="mr-2">📆</span>
                Utilisez « Du » et « Au » pour rechercher
                les ventes d'une période.
              </p>

              <p>
                <span className="mr-2">📄</span>
                Le bouton « Créer PDF » génère un rapport
                professionnel selon votre sélection.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowGuide(false)
              }
              className="
                mt-4
                w-full
                rounded-xl
                bg-orange-500
                px-4
                py-3
                font-black
                text-black
                transition
                hover:bg-orange-400
              "
            >
              Fermer le guide
            </button>
          </div>
        )}
      </section>

      {/* ==================================================
          STATISTIQUES
      ================================================== */}

      <section
        className="
          grid
          grid-cols-1
          gap-4
          md:grid-cols-3
        "
      >
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
        />
      </section>

      {/* ==================================================
          RECHERCHE
      ================================================== */}

      <section
        className="
          rounded-3xl
          border
          border-white/10
          bg-white/[0.04]
          p-5
          shadow-xl
          sm:p-6
        "
      >
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-blue-500/10
                text-blue-400
              "
            >
              <Search size={19} />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                Rechercher les ventes
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Filtrez vos ventes par date ou par période.
              </p>
            </div>
          </div>
        </div>

        {/* UNE DATE */}

        <div className="mb-6">
          <label
            className="
              mb-2
              block
              text-sm
              font-bold
              text-slate-300
            "
          >
            Rechercher une date
          </label>

          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-center
            "
          >
            <div
              className="
                relative
                min-w-0
                flex-1
                overflow-hidden
              "
            >
              <CalendarDays
                size={18}
                className="
                  pointer-events-none
                  absolute
                  left-3
                  top-1/2
                  z-10
                  -translate-y-1/2
                  text-orange-400
                "
              />

              <input
                type="date"
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(
                    e.target.value
                  )
                }
                className="
                  block
                  min-h-[48px]
                  w-full
                  min-w-0
                  max-w-full
                  appearance-none
                  rounded-xl
                  border
                  border-white/10
                  bg-[#111827]
                  p-3
                  pl-10
                  text-[16px]
                  text-white
                  outline-none
                  transition
                  focus:border-orange-400
                  focus:ring-1
                  focus:ring-orange-400
                  [color-scheme:dark]
                "
              />
            </div>

            <button
              type="button"
              onClick={filterByDate}
              className="
                inline-flex
                min-h-[48px]
                w-full
                shrink-0
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-blue-500
                px-5
                py-3
                font-black
                text-white
                transition
                hover:bg-blue-400
                active:scale-[0.98]
                sm:w-auto
              "
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

        <div>
          <label
            className="
              mb-3
              block
              text-sm
              font-bold
              text-slate-300
            "
          >
            Rechercher une période
          </label>

          <div
            className="
              grid
              grid-cols-1
              gap-3
              md:grid-cols-[1fr_1fr_auto]
              md:items-end
            "
          >
            <div className="min-w-0">
              <label
                className="
                  mb-2
                  block
                  text-xs
                  font-bold
                  text-slate-500
                "
              >
                Du
              </label>

              <div className="relative min-w-0">
                <CalendarDays
                  size={17}
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-purple-400
                  "
                />

                <input
                  type="date"
                  value={startDate}
                  onChange={(e) =>
                    setStartDate(
                      e.target.value
                    )
                  }
                  className="
                    block
                    min-h-[48px]
                    w-full
                    min-w-0
                    rounded-xl
                    border
                    border-white/10
                    bg-[#111827]
                    p-3
                    pl-10
                    text-[16px]
                    text-white
                    outline-none
                    transition
                    focus:border-purple-400
                    focus:ring-1
                    focus:ring-purple-400
                    [color-scheme:dark]
                  "
                />
              </div>
            </div>

            <div className="min-w-0">
              <label
                className="
                  mb-2
                  block
                  text-xs
                  font-bold
                  text-slate-500
                "
              >
                Au
              </label>

              <div className="relative min-w-0">
                <CalendarDays
                  size={17}
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-purple-400
                  "
                />

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) =>
                    setEndDate(
                      e.target.value
                    )
                  }
                  className="
                    block
                    min-h-[48px]
                    w-full
                    min-w-0
                    rounded-xl
                    border
                    border-white/10
                    bg-[#111827]
                    p-3
                    pl-10
                    text-[16px]
                    text-white
                    outline-none
                    transition
                    focus:border-purple-400
                    focus:ring-1
                    focus:ring-purple-400
                    [color-scheme:dark]
                  "
                />
              </div>
            </div>

            <button
              type="button"
              onClick={filterByPeriod}
              className="
                inline-flex
                min-h-[48px]
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-purple-500
                px-5
                py-3
                font-black
                text-white
                transition
                hover:bg-purple-400
                active:scale-[0.98]
              "
            >
              <CalendarDays size={17} />
              Voir la période
            </button>
          </div>
        </div>

        {/* ACTIONS */}

        <div
          className="
            mt-6
            grid
            grid-cols-1
            gap-3
            sm:grid-cols-2
            lg:grid-cols-3
          "
        >
          <button
            type="button"
            onClick={showEverything}
            className="
              inline-flex
              min-h-[48px]
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-orange-500
              px-5
              py-3
              font-black
              text-black
              transition
              hover:bg-orange-400
            "
          >
            <ShoppingCart size={17} />
            Toutes les ventes
          </button>

          <button
            type="button"
            onClick={resetFilters}
            className="
              inline-flex
              min-h-[48px]
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-white/10
              bg-black/30
              px-5
              py-3
              font-bold
              text-slate-300
              transition
              hover:bg-white/5
            "
          >
            <X size={17} />
            Réinitialiser
          </button>

          <button
            type="button"
            onClick={downloadPDF}
            className="
              inline-flex
              min-h-[48px]
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-gradient-to-r
              from-orange-500
              to-yellow-400
              px-5
              py-3
              font-black
              text-black
              shadow-lg
              shadow-orange-500/10
              transition
              hover:brightness-110
            "
          >
            <Download size={17} />
            Créer le PDF
          </button>
        </div>
      </section>

      {/* ==================================================
          RÉSULTAT DE LA RECHERCHE
      ================================================== */}

      {(selectedDate ||
        startDate ||
        endDate) && (
        <section
          className="
            rounded-2xl
            border
            border-orange-400/20
            bg-orange-500/10
            p-4
          "
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-orange-400">
              <Search size={18} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-black text-orange-300">
                {selectedDate
                  ? `Résultat pour le ${selectedDate}`
                  : startDate && endDate
                  ? `Résultat du ${startDate} au ${endDate}`
                  : "Sélection incomplète"}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {filteredSales.length} vente
                {filteredSales.length > 1
                  ? "s"
                  : ""}{" "}
                trouvée
                {filteredSales.length > 1
                  ? "s"
                  : ""}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ==================================================
          HISTORIQUE
      ================================================== */}

      <section
        className="
          rounded-3xl
          border
          border-white/10
          bg-white/[0.04]
          p-5
          shadow-xl
          sm:p-6
        "
      >
        <div
          className="
            mb-5
            flex
            flex-col
            gap-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-green-500/10
                text-green-400
              "
            >
              <TrendingUp size={19} />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                Historique des ventes
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Consultez les ventes enregistrées.
              </p>
            </div>
          </div>

          {filteredSales.length > 5 && (
            <button
              type="button"
              onClick={() =>
                setShowAll(!showAll)
              }
              className="
                inline-flex
                items-center
                justify-center
                rounded-xl
                bg-orange-500
                px-4
                py-2.5
                text-sm
                font-black
                text-black
                transition
                hover:bg-orange-400
              "
            >
              {showAll
                ? "Afficher seulement 5"
                : "Voir toutes les ventes"}
            </button>
          )}
        </div>

        {displayedSales.length === 0 ? (
          <div
            className="
              rounded-2xl
              border
              border-white/10
              bg-black/20
              p-10
              text-center
            "
          >
            <div
              className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                bg-white/5
                text-slate-500
              "
            >
              <Package size={25} />
            </div>

            <p className="mt-4 font-black text-white">
              {selectedDate
                ? "Aucune vente à cette date."
                : startDate && endDate
                ? "Aucune vente dans cette période."
                : "Aucune vente disponible."}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Essayez une autre date ou une autre période.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedSales.map(
              (sale) => (
                <div
                  key={sale.id}
                  className="
                    rounded-2xl
                    border
                    border-white/10
                    bg-black/20
                    p-4
                    transition
                    hover:border-white/20
                    hover:bg-black/30
                  "
                >
                  <div
                    className="
                      flex
                      flex-col
                      gap-4
                      lg:flex-row
                      lg:items-center
                      lg:justify-between
                    "
                  >
                    <div
                      className="
                        min-w-0
                        flex-1
                      "
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-orange-500/10
                            text-orange-400
                          "
                        >
                          <Package size={18} />
                        </div>

                        <div className="min-w-0">
                          <p
                            className="
                              break-words
                              font-black
                              text-white
                            "
                          >
                            {sale.product_name}
                          </p>

                          <p
                            className="
                              mt-1
                              break-words
                              text-xs
                              text-slate-500
                            "
                          >
                            {new Date(
                              sale.created_at
                            ).toLocaleString(
                              "fr-FR"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className="
                        grid
                        grid-cols-3
                        gap-3
                        sm:gap-5
                        lg:min-w-[420px]
                      "
                    >
                      <div
                        className="
                          rounded-xl
                          border
                          border-white/5
                          bg-white/[0.03]
                          p-3
                        "
                      >
                        <p className="text-[11px] text-slate-500">
                          Quantité
                        </p>

                        <p className="mt-1 font-black text-white">
                          x{sale.quantity}
                        </p>
                      </div>

                      <div
                        className="
                          rounded-xl
                          border
                          border-white/5
                          bg-white/[0.03]
                          p-3
                        "
                      >
                        <p className="text-[11px] text-slate-500">
                          Vente
                        </p>

                        <p
                          className="
                            mt-1
                            whitespace-nowrap
                            text-sm
                            font-black
                            text-orange-400
                          "
                        >
                          {formatMoney(
                            sale.total_sale
                          )}{" "}
                          {sale.currency}
                        </p>
                      </div>

                      <div
                        className="
                          rounded-xl
                          border
                          border-white/5
                          bg-white/[0.03]
                          p-3
                        "
                      >
                        <p className="text-[11px] text-slate-500">
                          Bénéfice
                        </p>

                        <p
                          className="
                            mt-1
                            whitespace-nowrap
                            text-sm
                            font-black
                            text-green-400
                          "
                        >
                          {formatMoney(
                            sale.profit
                          )}{" "}
                          {sale.currency}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* ==================================================
          RETOUR EN HAUT
      ================================================== */}

      {showTopButton && (
        <button
          type="button"
          onClick={scrollToTop}
          className="
            fixed
            bottom-5
            right-5
            z-[9999]
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-full
            bg-orange-500
            text-black
            shadow-2xl
            transition
            hover:bg-orange-400
            active:scale-95
            sm:bottom-6
            sm:right-6
          "
          title="Retour en haut"
          aria-label="Retour en haut"
        >
          <ArrowUp size={21} />
        </button>
      )}
    </main>
  );
}

// ======================================================
// COMPOSANT CARTE RAPPORT
// ======================================================

function ReportCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div
      className="
        rounded-3xl
        border
        border-white/10
        bg-white/[0.04]
        p-5
        shadow-xl
      "
    >
      <div
        className="
          flex
          h-12
          w-12
          items-center
          justify-center
          rounded-2xl
          bg-orange-500/10
          text-2xl
        "
      >
        {icon}
      </div>

      <h3
        className="
          mt-4
          font-black
          text-white
        "
      >
        {title}
      </h3>

      <p
        className="
          mt-3
          break-words
          text-lg
          font-black
          text-orange-400
          sm:text-xl
        "
      >
        {value}
      </p>

      <p
        className="
          mt-2
          text-xs
          leading-5
          text-slate-400
        "
      >
        {subtitle}
      </p>
    </div>
  );
}